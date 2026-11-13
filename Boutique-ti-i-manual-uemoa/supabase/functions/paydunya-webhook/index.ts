import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha512(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY");
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY");
    const tokenKey = Deno.env.get("PAYDUNYA_TOKEN");
    if (!supabaseUrl || !serviceKey || !masterKey || !privateKey || !tokenKey) {
      return new Response("Server configuration error", { status: 500 });
    }

    const form = await req.formData();
    const rawData = form.get("data");
    let data: Record<string, unknown>;
    if (typeof rawData === "string") {
      data = JSON.parse(rawData);
    } else {
      data = {
        hash: form.get("data[hash]") || form.get("data.hash"),
        status: form.get("data[status]") || form.get("data.status"),
        invoice: {
          token: form.get("data[invoice][token]") || form.get("data.invoice.token"),
          total_amount: form.get("data[invoice][total_amount]") || form.get("data.invoice.total_amount"),
        },
      };
    }

    const receivedHash = String(data.hash || "").toLowerCase();
    const expectedHash = await sha512(masterKey);
    if (!safeEqual(receivedHash, expectedHash)) {
      return new Response("Invalid PayDunya signature", { status: 401 });
    }

    const invoiceData = data.invoice && typeof data.invoice === "object"
      ? data.invoice as Record<string, unknown> : {};
    const token = String(invoiceData.token || data.token || "");
    if (!token) return new Response("Missing invoice token", { status: 400 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: payment, error: paymentError } = await admin
      .from("subscription_payments")
      .select("id,amount,currency,status,provider_reference")
      .eq("provider", "paydunya")
      .eq("provider_reference", token)
      .maybeSingle();

    if (paymentError || !payment) return new Response("Unknown payment", { status: 404 });
    if (payment.status === "paid") return new Response("OK", { status: 200 });

    const confirmResponse = await fetch(
      `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": masterKey,
          "PAYDUNYA-PRIVATE-KEY": privateKey,
          "PAYDUNYA-TOKEN": tokenKey,
        },
      },
    );
    const confirmed = await confirmResponse.json().catch(() => ({}));
    const invoice = confirmed.invoice || confirmed.data?.invoice || {};
    const status = String(confirmed.status || confirmed.data?.status || "").toLowerCase();
    const amount = Number(invoice.total_amount ?? confirmed.data?.invoice?.total_amount);
    const confirmedToken = String(invoice.token || confirmed.data?.invoice?.token || "");
    const confirmHash = String(confirmed.hash || confirmed.data?.hash || "").toLowerCase();

    if (!confirmResponse.ok || confirmed.response_code !== "00" ||
        !safeEqual(confirmHash, expectedHash) ||
        confirmedToken !== token || String(confirmed.mode || "").toLowerCase() !== "test" ||
        !Number.isFinite(amount) || amount !== Number(payment.amount)) {
      return new Response("Payment not confirmed or details mismatch", { status: 409 });
    }

    // A provider-confirmed cancellation/failure is recorded, never activated.
    if (status === "cancelled" || status === "failed") {
      const { error: failedUpdateError } = await admin
        .from("subscription_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", payment.id)
        .eq("status", "pending");
      if (failedUpdateError) {
        console.error("Payment failure status update failed:", failedUpdateError.message);
        return new Response("Could not record payment failure", { status: 500 });
      }
      return new Response("Payment not completed", { status: 200 });
    }

    if (status !== "completed") {
      return new Response("Payment is not completed", { status: 409 });
    }

    const { error: activationError } = await admin.rpc("confirm_vendor_subscription_payment", {
      p_payment_id: payment.id,
      p_provider_reference: token,
    });
    if (activationError) {
      console.error("Subscription activation failed:", activationError.message);
      return new Response("Activation failed", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("PayDunya webhook error:", error);
    return new Response("Invalid notification", { status: 400 });
  }
});
