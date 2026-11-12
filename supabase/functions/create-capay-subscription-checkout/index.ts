import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://api.capayglobal.com/v1";
const WEBHOOK_URL = "https://rsabamyxihhxyjvmlxav.supabase.co/functions/v1/capay-global-webhook";
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

function normalizePhone(value: unknown): string {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return `+${digits}`;
}

function countryCode(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "sénégal": "SN", "senegal": "SN", "cameroun": "CM", "cameroon": "CM",
    "gabon": "GA", "congo": "CG", "république du congo": "CG",
    "republique du congo": "CG", "rdc": "CD", "rd congo": "CD",
    "république démocratique du congo": "CD",
    "republique democratique du congo": "CD", "tchad": "TD",
    "centrafrique": "CF", "république centrafricaine": "CF",
    "republique centrafricaine": "CF", "côte d'ivoire": "CI",
    "cote d'ivoire": "CI", "mali": "ML", "burkina faso": "BF",
    "bénin": "BJ", "benin": "BJ", "togo": "TG", "niger": "NE",
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
    const apiKey = Deno.env.get("CAPAY_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey || !apiKey.startsWith("sk_test_")) {
      return reply({ error: "Configuration Capay Global sandbox incomplète." }, 500, origin);
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
    const msisdn = normalizePhone(body.customerPhone);
    if (!shopId || shopId.length > 128 ||
        !["starter", "pro", "premium"].includes(planSlug) || !msisdn) {
      return reply({ error: "Boutique, formule ou numéro de paiement invalide." }, 400, origin);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: shop, error: shopError } = await admin
      .from("shops").select("id,owner,data,suspended")
      .eq("id", shopId).eq("owner", authData.user.id).maybeSingle();
    if (shopError || !shop || shop.suspended) {
      return reply({ error: "Boutique introuvable, suspendue ou accès refusé." }, 403, origin);
    }

    const shopData = shop.data && typeof shop.data === "object" ? shop.data : {};
    const country = countryCode(shopData.country);
    const currency = String(shopData.currency || "").trim().toUpperCase();
    if (country !== "CM" || currency !== "XAF") {
      return reply({ error: "Le sandbox Capay Global est actuellement autorisé uniquement pour le Cameroun en XAF." }, 409, origin);
    }
    if (!country || !currency) return reply({ error: "Pays ou devise non configuré." }, 409, origin);

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id,slug,country_code,currency,amount")
      .eq("slug", planSlug).eq("country_code", country)
      .eq("currency", currency).eq("is_active", true).maybeSingle();

    if (planError || !plan || Number(plan.amount) <= 0) {
      return reply({ error: "Aucun tarif Capay Global n'est configuré pour ce pays et cette devise." }, 409, origin);
    }

    const paymentId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const { error: insertError } = await admin.from("subscription_payments").insert({
      id: paymentId,
      shop_id: shop.id,
      plan_id: plan.id,
      provider: "capay_global",
      idempotency_key: idempotencyKey,
      amount: plan.amount,
      currency: plan.currency,
      status: "pending",
    });
    if (insertError) {
      console.error("Capay payment row creation failed:", insertError.message);
      return reply({ error: "Impossible de préparer le paiement." }, 500, origin);
    }

    const response = await fetch(`${API_BASE}/collections`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Idempotency-Key": idempotencyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(plan.amount),
        currency: plan.currency,
        country,
        method: "mobile_money",
        msisdn,
        merchant_reference: paymentId,
        customer: { name: String(body.customerName || "").slice(0, 100) || undefined },
        metadata: { payment_id: paymentId, shop_id: shop.id, plan_slug: plan.slug },
      }),
    });
    const envelope = await response.json().catch(() => ({}));
    const collection = envelope.data && typeof envelope.data === "object" ? envelope.data : {};
    const collectionId = String(collection.id || "");
    const status = String(collection.status || "").toLowerCase();
    const hostedUrl = collection.hosted_url ? String(collection.hosted_url) : null;

    if (!response.ok || envelope.status !== "success" || !collectionId ||
        !["initiated", "pending", "processing"].includes(status) ||
        collection.livemode !== false ||
        Number(collection.amount) !== Number(plan.amount) ||
        String(collection.currency || "").toUpperCase() !== currency ||
        String(collection.merchant_reference || "") !== paymentId) {
      await admin.from("subscription_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", paymentId).eq("status", "pending");
      console.error("Capay collection creation rejected:", response.status, envelope.error?.code || "invalid response");
      return reply({ error: "Capay Global n'a pas pu créer le paiement sandbox." }, 502, origin);
    }

    const { error: updateError } = await admin.from("subscription_payments")
      .update({ provider_reference: collectionId, checkout_url: hostedUrl, updated_at: new Date().toISOString() })
      .eq("id", paymentId).eq("status", "pending");
    if (updateError) {
      console.error("Capay collection persistence failed:", updateError.message);
      return reply({ error: "Le paiement a été créé mais sa référence n'a pas pu être enregistrée." }, 500, origin);
    }

    return reply({
      paymentId,
      provider: "capay_global",
      checkoutUrl: hostedUrl,
      paymentStatus: status,
      authModel: String(collection.auth_model || "STK_PROMPT"),
    }, 200, origin);
  } catch (error) {
    console.error("Capay checkout error:", error);
    return reply({ error: "Une erreur serveur est survenue." }, 500, origin);
  }
});
