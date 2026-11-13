import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://api.capayglobal.com/v1";

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  const left = new TextEncoder().encode(a.toLowerCase());
  const right = new TextEncoder().encode(b.toLowerCase());
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseAmount(value: unknown): number | null {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("CAPAY_API_KEY");
    const webhookSecret = Deno.env.get("CAPAY_WEBHOOK_SECRET");
    if (!supabaseUrl || !serviceKey || !apiKey || !apiKey.startsWith("sk_test_") || !webhookSecret) {
      return new Response("Server configuration error", { status: 500 });
    }

    // Capay signs: HMAC-SHA256(secret, timestamp + "." + exact raw body).
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("X-Capay-Signature") || "";
    const timestampMatch = signatureHeader.match(/(?:^|,)\s*t=(\d+)/);
    const signatures = [...signatureHeader.matchAll(/(?:^|,)\s*v1=([a-f0-9]{64})/gi)].map((match) => match[1]);
    const timestamp = timestampMatch ? Number(timestampMatch[1]) : NaN;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || signatures.length === 0) {
      return new Response("Invalid or expired Capay signature", { status: 401 });
    }

    const expected = await hmacSha256Hex(webhookSecret, `${timestamp}.${rawBody}`);
    if (!signatures.some((signature) => safeEqualHex(signature, expected))) {
      return new Response("Invalid Capay signature", { status: 401 });
    }

    const eventId = req.headers.get("X-Capay-Event-Id") || "";
    const eventType = req.headers.get("X-Capay-Event-Type") || "";
    if (!eventId) return new Response("Missing event id", { status: 400 });

    const payload = JSON.parse(rawBody);
    if (payload.id !== eventId || payload.type !== eventType || !payload.data || typeof payload.data !== "object") {
      return new Response("Invalid event envelope", { status: 400 });
    }

    const collection = payload.data as Record<string, unknown>;
    const collectionId = String(collection.id || "");
    const status = String(collection.status || "").toLowerCase();
    const terminal = ["completed", "failed", "cancelled", "expired"].includes(status);
    if (!collectionId) return new Response("Missing collection id", { status: 400 });
    // Capay also emits pending/processing events. They are informational and must not
    // trigger retries or regress a terminal payment state.
    if (!terminal) return new Response("Non-terminal event ignored", { status: 200 });
    if (!["collection.completed", "collection.failed", "collection.cancelled", "collection.expired"].includes(eventType)) {
      return new Response("Unsupported terminal event", { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: payment, error: paymentError } = await admin.from("subscription_payments")
      .select("id,amount,currency,status,provider_reference")
      .eq("provider", "capay_global").eq("provider_reference", collectionId).maybeSingle();
    if (paymentError || !payment) return new Response("Unknown collection", { status: 404 });
    if (payment.status === "paid") return new Response("OK", { status: 200 });

    // Confirm against Capay's API, not the notification alone.
    const confirmResponse = await fetch(`${API_BASE}/collections/${encodeURIComponent(collectionId)}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    const envelope = await confirmResponse.json().catch(() => ({}));
    const confirmed = envelope.data && typeof envelope.data === "object" ? envelope.data : {};
    const expectedEventType = status === "completed" ? "collection.completed" :
      status === "failed" ? "collection.failed" :
      status === "cancelled" ? "collection.cancelled" : "collection.expired";

    if (!confirmResponse.ok || envelope.status !== "success" ||
        String(confirmed.id || "") !== collectionId ||
        String(confirmed.merchant_reference || "") !== payment.id ||
        Number(confirmed.amount) !== Number(payment.amount) ||
        Number(collection.amount) !== Number(payment.amount) ||
        String(confirmed.currency || "").toUpperCase() !== String(payment.currency).toUpperCase() ||
        String(collection.currency || "").toUpperCase() !== String(payment.currency).toUpperCase() ||
        confirmed.livemode !== false || collection.livemode !== false ||
        confirmed.status !== status || eventType !== expectedEventType) {
      return new Response("Capay collection verification failed", { status: 409 });
    }

    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
    const payloadHash = Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error: insertError } = await admin.from("payment_webhook_events").insert({
      provider: "capay_global", event_id: eventId, payload_sha256: payloadHash,
      processing_status: "received",
    });

    if (insertError) {
      const { data: existing } = await admin.from("payment_webhook_events")
        .select("processing_status").eq("provider", "capay_global").eq("event_id", eventId).maybeSingle();
      if (existing?.processing_status === "processed") return new Response("OK", { status: 200 });
      if (!existing) return new Response("Could not register event", { status: 500 });
      const { error: retryError } = await admin.from("payment_webhook_events")
        .update({ processing_status: "received", payload_sha256: payloadHash })
        .eq("provider", "capay_global").eq("event_id", eventId).eq("processing_status", "failed");
      if (retryError) return new Response("Could not retry event", { status: 500 });
    }

    if (status === "completed") {
      const { error: activationError } = await admin.rpc("confirm_vendor_subscription_payment", {
        p_payment_id: payment.id, p_provider_reference: collectionId,
      });
      if (activationError) {
        console.error("Capay subscription activation failed:", activationError.message);
        await admin.from("payment_webhook_events").update({ processing_status: "failed" })
          .eq("provider", "capay_global").eq("event_id", eventId);
        return new Response("Activation failed", { status: 500 });
      }
    } else {
      const { error: failedError } = await admin.from("subscription_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", payment.id).eq("status", "pending");
      if (failedError) {
        await admin.from("payment_webhook_events").update({ processing_status: "failed" })
          .eq("provider", "capay_global").eq("event_id", eventId);
        return new Response("Could not record failure", { status: 500 });
      }
    }

    const { error: doneError } = await admin.from("payment_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "capay_global").eq("event_id", eventId);
    if (doneError) return new Response("Could not finalize event", { status: 500 });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Capay webhook error:", error);
    return new Response("Invalid notification", { status: 400 });
  }
});
