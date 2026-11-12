import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://pay.ltcgroup.site/api/v1";

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  const left = new TextEncoder().encode(a.toLowerCase());
  const right = new TextEncoder().encode(b.toLowerCase());
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    const apiKey = Deno.env.get("NKAP_API_KEY");
    const apiSecret = Deno.env.get("NKAP_API_SECRET");
    const webhookSecret = Deno.env.get("NKAP_WEBHOOK_SECRET");
    if (!supabaseUrl || !serviceKey || !apiKey || !apiSecret || !webhookSecret) {
      return new Response("Server configuration error", { status: 500 });
    }

    // Verify the exact raw body before parsing JSON.
    const rawBody = await req.text();
    const receivedSignature = req.headers.get("X-LtcPay-Signature") || "";
    const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
    if (!safeEqualHex(receivedSignature, expectedSignature)) {
      return new Response("Invalid Nkap signature", { status: 401 });
    }

    const eventHeader = req.headers.get("X-LtcPay-Event") || "";
    const deliveryId = req.headers.get("X-LtcPay-Delivery-Id") || "";
    if (!deliveryId || eventHeader !== "payment.status_changed") {
      return new Response("Invalid event headers", { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== "payment.status_changed" || !payload.data || typeof payload.data !== "object") {
      return new Response("Unsupported event", { status: 400 });
    }

    const event = payload.data as Record<string, unknown>;
    const reference = String(event.reference || "");
    const eventStatus = String(event.status || "").toUpperCase();
    const eventAmount = parseAmount(event.amount);
    const eventCurrency = String(event.currency || "").toUpperCase();
    if (!reference || !["COMPLETED", "FAILED", "CANCELLED"].includes(eventStatus)) {
      return new Response("Unsupported payment state", { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: payment, error: paymentError } = await admin
      .from("subscription_payments")
      .select("id,amount,currency,status,provider_reference")
      .eq("provider", "nkap_pay")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (paymentError || !payment) return new Response("Unknown payment", { status: 404 });
    if (payment.status === "paid") return new Response("OK", { status: 200 });

    // A webhook is only a notification. Re-query Nkap Pay before changing our database.
    const confirmResponse = await fetch(`${API_BASE}/payments/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Content-Type": "application/json",
      },
    });
    const confirmBody = await confirmResponse.json().catch(() => ({}));
    const confirmed = confirmBody.data && typeof confirmBody.data === "object"
      ? confirmBody.data : confirmBody;
    const confirmedStatus = String(confirmed.status || "").toUpperCase();
    const confirmedReference = String(confirmed.reference || "");
    const confirmedAmount = parseAmount(confirmed.amount);
    const confirmedCurrency = String(confirmed.currency || "").toUpperCase();
    const merchantReference = String(confirmed.merchant_reference || "");

    if (!confirmResponse.ok || confirmedReference !== reference ||
        (merchantReference && merchantReference !== payment.id) ||
        confirmedAmount !== Number(payment.amount) ||
        eventAmount !== Number(payment.amount) ||
        confirmedCurrency !== String(payment.currency).toUpperCase() ||
        eventCurrency !== String(payment.currency).toUpperCase() ||
        confirmedStatus !== eventStatus) {
      console.error("Nkap verification mismatch", {
        referenceMatches: confirmedReference === reference,
        merchantReferenceMatches: !merchantReference || merchantReference === payment.id,
        amountMatches: confirmedAmount === Number(payment.amount) && eventAmount === Number(payment.amount),
        currencyMatches: confirmedCurrency === String(payment.currency).toUpperCase() && eventCurrency === String(payment.currency).toUpperCase(),
        statusMatches: confirmedStatus === eventStatus,
      });
      return new Response("Nkap payment verification failed", { status: 409 });
    }

    const payloadHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
    const payloadHash = Array.from(new Uint8Array(payloadHashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const { error: eventInsertError } = await admin.from("payment_webhook_events").insert({
      provider: "nkap_pay",
      event_id: deliveryId,
      payload_sha256: payloadHash,
      processing_status: "received",
    });

    if (eventInsertError) {
      const { data: existing } = await admin.from("payment_webhook_events")
        .select("processing_status")
        .eq("provider", "nkap_pay")
        .eq("event_id", deliveryId)
        .maybeSingle();
      if (existing?.processing_status === "processed") return new Response("OK", { status: 200 });
      if (!existing) return new Response("Could not register webhook event", { status: 500 });
      // A previous attempt failed after recording the event; permit a safe retry.
      const { error: retryError } = await admin.from("payment_webhook_events")
        .update({ processing_status: "received", payload_sha256: payloadHash })
        .eq("provider", "nkap_pay")
        .eq("event_id", deliveryId)
        .eq("processing_status", "failed");
      if (retryError) return new Response("Could not retry webhook event", { status: 500 });
    }

    if (eventStatus === "FAILED" || eventStatus === "CANCELLED") {
      const { error: updateError } = await admin.from("subscription_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", payment.id)
        .eq("status", "pending");
      if (updateError) {
        await admin.from("payment_webhook_events").update({ processing_status: "failed" })
          .eq("provider", "nkap_pay").eq("event_id", deliveryId);
        return new Response("Could not record payment failure", { status: 500 });
      }
    } else {
      const { error: activationError } = await admin.rpc("confirm_vendor_subscription_payment", {
        p_payment_id: payment.id,
        p_provider_reference: reference,
      });
      if (activationError) {
        console.error("Nkap subscription activation failed:", activationError.message);
        await admin.from("payment_webhook_events").update({ processing_status: "failed" })
          .eq("provider", "nkap_pay").eq("event_id", deliveryId);
        return new Response("Activation failed", { status: 500 });
      }
    }

    const { error: processedError } = await admin.from("payment_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "nkap_pay")
      .eq("event_id", deliveryId);
    if (processedError) return new Response("Could not finalize webhook event", { status: 500 });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Nkap webhook error:", error);
    return new Response("Invalid notification", { status: 400 });
  }
});
