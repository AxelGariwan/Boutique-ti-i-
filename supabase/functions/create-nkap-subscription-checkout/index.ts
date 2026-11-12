import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://pay.ltcgroup.site/api/v1";
const WEBHOOK_URL = "https://rsabamyxihhxyjvmlxav.supabase.co/functions/v1/nkap-pay-webhook";
const APP_URL = "https://boutique-ti-i-eight.vercel.app";

const allowedOrigins = new Set([
  APP_URL,
  "http://localhost:3000",
  "http://127.0.0.1:5500",
]);

function cors(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : APP_URL;
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

function countryCode(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "sénégal": "SN", "senegal": "SN",
    "cameroun": "CM", "cameroon": "CM",
    "gabon": "GA", "congo": "CG", "république du congo": "CG",
    "republique du congo": "CG", "rdc": "CD", "rd congo": "CD",
    "république démocratique du congo": "CD",
    "republique democratique du congo": "CD",
    "tchad": "TD", "centrafrique": "CF",
    "république centrafricaine": "CF",
    "republique centrafricaine": "CF",
    "côte d'ivoire": "CI", "cote d'ivoire": "CI",
    "mali": "ML", "burkina faso": "BF", "bénin": "BJ", "benin": "BJ",
    "togo": "TG", "niger": "NE",
  };
  if (aliases[raw]) return aliases[raw];
  return /^[a-z]{2}$/i.test(raw) ? raw.toUpperCase() : "";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée." }, 405, origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("NKAP_API_KEY");
    const apiSecret = Deno.env.get("NKAP_API_SECRET");
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey || !apiSecret || !apiKey.startsWith("ltcpay_test_")) {
      return reply({ error: "Configuration Nkap Pay incomplète côté serveur." }, 500, origin);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return reply({ error: "Connexion requise." }, 401, origin);
    }

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
      return reply({ error: "Boutique introuvable, suspendue ou accès refusé." }, 403, origin);
    }

    const shopData = shop.data && typeof shop.data === "object" ? shop.data : {};
    const country = countryCode(shopData.country);
    const currency = String(shopData.currency || "").trim().toUpperCase();
    if (!country || !currency) {
      return reply({ error: "Pays ou devise de la boutique non configuré." }, 409, origin);
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id,slug,country_code,currency,amount")
      .eq("slug", planSlug)
      .eq("country_code", country)
      .eq("currency", currency)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan || Number(plan.amount) < 100 || Number(plan.amount) > 5000000) {
      return reply({ error: "Aucun tarif Nkap Pay valide n'est configuré pour ce pays et cette devise." }, 409, origin);
    }

    // The amount and currency come exclusively from the server-side plan record.
    const paymentId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const { error: insertError } = await admin.from("subscription_payments").insert({
      id: paymentId,
      shop_id: shop.id,
      plan_id: plan.id,
      provider: "nkap_pay",
      idempotency_key: idempotencyKey,
      amount: plan.amount,
      currency: plan.currency,
      status: "pending",
    });
    if (insertError) {
      console.error("Nkap payment row creation failed:", insertError.message);
      return reply({ error: "Impossible de préparer le paiement." }, 500, origin);
    }

    const response = await fetch(`${API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
      },
      body: JSON.stringify({
        amount: Number(plan.amount),
        currency: plan.currency,
        country,
        payment_method: "MOBILE_MONEY",
        merchant_reference: paymentId,
        description: `Abonnement ${plan.slug} Boutique ti i`,
        callback_url: WEBHOOK_URL,
        return_url: `${APP_URL}/?subscription=return&payment_id=${encodeURIComponent(paymentId)}`,
        metadata: { payment_id: paymentId, shop_id: shop.id, plan_slug: plan.slug },
      }),
    });

    const result = await response.json().catch(() => ({}));
    const reference = String(result.reference || result.data?.reference || "");
    const paymentUrl = String(result.payment_url || result.data?.payment_url || "");
    const providerStatus = String(result.status || result.data?.status || "").toUpperCase();

    if (!response.ok || !reference || !paymentUrl ||
        !["PENDING", "PROCESSING"].includes(providerStatus)) {
      await admin.from("subscription_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", paymentId)
        .eq("status", "pending");
      console.error("Nkap payment creation rejected:", response.status, result.detail || result.message || "invalid response");
      return reply({ error: "Nkap Pay n'a pas pu créer la page de paiement." }, 502, origin);
    }

    const { error: updateError } = await admin.from("subscription_payments")
      .update({ provider_reference: reference, checkout_url: paymentUrl, updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("status", "pending");

    if (updateError) {
      console.error("Nkap reference persistence failed:", updateError.message);
      return reply({ error: "Le paiement a été créé mais sa référence n'a pas pu être enregistrée. Contactez le support avant de réessayer." }, 500, origin);
    }

    return reply({ checkoutUrl: paymentUrl, paymentId, provider: "nkap_pay" }, 200, origin);
  } catch (error) {
    console.error("Nkap checkout error:", error);
    return reply({ error: "Une erreur serveur est survenue." }, 500, origin);
  }
});
