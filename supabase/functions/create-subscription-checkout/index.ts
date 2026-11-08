import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://boutique-ti-i-eight.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
]);

function cors(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : "https://boutique-ti-i-eight.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée." }, 405, origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY");
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY");
    const tokenKey = Deno.env.get("PAYDUNYA_TOKEN");
    const callbackUrl = Deno.env.get("PAYDUNYA_CALLBACK_URL");
    if (!supabaseUrl || !anonKey || !serviceKey || !masterKey || !privateKey || !tokenKey || !callbackUrl) {
      return reply({ error: "Configuration serveur incomplète." }, 500, origin);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Connexion requise." }, 401, origin);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return reply({ error: "Session invalide." }, 401, origin);

    const body = await req.json().catch(() => ({}));
    const shopId = String(body.shopId || "").trim();
    const planSlug = String(body.planSlug || "");
    if (!shopId || shopId.length > 128 || !["starter", "pro", "premium"].includes(planSlug)) {
      return reply({ error: "Boutique ou formule invalide." }, 400, origin);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: shop, error: shopError } = await admin
      .from("shops")
      .select("id,owner,data,suspended")
      .eq("id", shopId)
      .eq("owner", authData.user.id)
      .maybeSingle();

    if (shopError || !shop || shop.suspended) {
      return reply({ error: "Boutique introuvable, suspendue ou accès refusé." }, 404, origin);
    }

    const shopData = (shop.data && typeof shop.data === "object") ? shop.data : {};
    const country = String(shopData.country || "").trim().toLowerCase();
    const countryCode = ["sn", "senegal", "sénégal"].includes(country) ? "SN" :
      /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : "";
    const currency = String(shopData.currency || "").trim().toUpperCase();
    if (countryCode !== "SN" || currency !== "XOF") {
      return reply({ error: "Les paiements d'abonnement ne sont pas encore activés pour ce pays." }, 409, origin);
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id,slug,country_code,currency,amount")
      .eq("slug", planSlug)
      .eq("country_code", countryCode)
      .eq("currency", currency)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan || Number(plan.amount) <= 0) {
      return reply({ error: "Cette formule n'est pas disponible dans votre pays." }, 409, origin);
    }

    const paymentId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const { error: insertError } = await admin.from("subscription_payments").insert({
      id: paymentId,
      shop_id: shop.id,
      plan_id: plan.id,
      provider: "paydunya",
      idempotency_key: idempotencyKey,
      amount: plan.amount,
      currency: plan.currency,
      status: "pending",
    });
    if (insertError) return reply({ error: "Impossible de préparer le paiement." }, 500, origin);

    const invoicePayload = {
      invoice: {
        total_amount: Number(plan.amount),
        description: `Abonnement ${plan.slug} Boutique ti i - boutique ${shop.id}`,
      },
      store: { name: "Boutique ti i" },
      custom_data: { payment_id: paymentId, shop_id: shop.id, plan: plan.slug },
      actions: {
        callback_url: callbackUrl,
        return_url: "https://boutique-ti-i-eight.vercel.app/?subscription=return",
        cancel_url: "https://boutique-ti-i-eight.vercel.app/?subscription=cancelled",
      },
    };

    const response = await fetch("https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": masterKey,
        "PAYDUNYA-PRIVATE-KEY": privateKey,
        "PAYDUNYA-TOKEN": tokenKey,
      },
      body: JSON.stringify(invoicePayload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.response_code !== "00" || !result.token || !result.response_text) {
      await admin.from("subscription_payments").update({ status: "failed" }).eq("id", paymentId);
      return reply({ error: "PayDunya n'a pas pu créer la page de paiement.", details: result.response_text || result.message || null }, 502, origin);
    }

    const { error: updateError } = await admin.from("subscription_payments")
      .update({ provider_reference: String(result.token), checkout_url: String(result.response_text) })
      .eq("id", paymentId);
    if (updateError) return reply({ error: "Le lien de paiement n'a pas pu être enregistré." }, 500, origin);

    return reply({ checkoutUrl: result.response_text, paymentId }, 200, origin);
  } catch (_error) {
    return reply({ error: "Une erreur serveur est survenue." }, 500, origin);
  }
});
