import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const countryMap: Record<string, { code: string; currency: string }> = {
  "benin": { code: "BJ", currency: "XOF" }, "bj": { code: "BJ", currency: "XOF" },
  "burkina faso": { code: "BF", currency: "XOF" }, "bf": { code: "BF", currency: "XOF" },
  "cote d'ivoire": { code: "CI", currency: "XOF" }, "côte d'ivoire": { code: "CI", currency: "XOF" }, "côte d’ivoire": { code: "CI", currency: "XOF" }, "ci": { code: "CI", currency: "XOF" },
  "guinee-bissau": { code: "GW", currency: "XOF" }, "guinée-bissau": { code: "GW", currency: "XOF" }, "gw": { code: "GW", currency: "XOF" },
  "mali": { code: "ML", currency: "XOF" }, "ml": { code: "ML", currency: "XOF" },
  "niger": { code: "NE", currency: "XOF" }, "ne": { code: "NE", currency: "XOF" },
  "senegal": { code: "SN", currency: "XOF" }, "sénégal": { code: "SN", currency: "XOF" }, "sn": { code: "SN", currency: "XOF" },
  "togo": { code: "TG", currency: "XOF" }, "tg": { code: "TG", currency: "XOF" },
  "cameroun": { code: "CM", currency: "XAF" }, "cameroon": { code: "CM", currency: "XAF" }, "cm": { code: "CM", currency: "XAF" },
  "centrafrique": { code: "CF", currency: "XAF" }, "république centrafricaine": { code: "CF", currency: "XAF" }, "republique centrafricaine": { code: "CF", currency: "XAF" }, "cf": { code: "CF", currency: "XAF" },
  "congo": { code: "CG", currency: "XAF" }, "république du congo": { code: "CG", currency: "XAF" }, "republique du congo": { code: "CG", currency: "XAF" }, "cg": { code: "CG", currency: "XAF" },
  "gabon": { code: "GA", currency: "XAF" }, "ga": { code: "GA", currency: "XAF" },
  "tchad": { code: "TD", currency: "XAF" }, "chad": { code: "TD", currency: "XAF" }, "td": { code: "TD", currency: "XAF" },
  "guinee equatoriale": { code: "GQ", currency: "XAF" }, "guinée équatoriale": { code: "GQ", currency: "XAF" }, "gq": { code: "GQ", currency: "XAF" },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!url || !anon || !service || !authHeader) return json(401, { error: "Session vendeur requise." });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) return json(401, { error: "Session invalide. Reconnectez-vous." });

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json();
    const shopId = String(body.shopId || "").trim();
    const planSlug = String(body.planSlug || "").trim().toLowerCase();
    const action = String(body.action || "methods");
    if (!shopId || !["starter", "pro", "premium"].includes(planSlug)) return json(400, { error: "Boutique ou formule invalide." });

    const { data: shop, error: shopError } = await admin.from("shops").select("id,owner,data").eq("id", shopId).maybeSingle();
    if (shopError || !shop || shop.owner !== userData.user.id) return json(403, { error: "Cette boutique ne vous appartient pas." });

    const rawCountry = String(shop.data?.country || "").trim().toLowerCase();
    const country = countryMap[rawCountry];
    const shopCurrency = String(shop.data?.currency || "").toUpperCase();
    if (!country || country.currency !== shopCurrency) return json(400, { error: "Le paiement manuel n'est pas encore configuré pour le pays ou la devise de cette boutique." });

    const { data: plan, error: planError } = await admin.from("subscription_plans")
      .select("id,slug,country_code,currency,amount,is_active")
      .eq("slug", planSlug).eq("country_code", country.code).eq("currency", country.currency).eq("is_active", true).maybeSingle();
    if (planError || !plan) return json(400, { error: "Cette formule n'est pas encore disponible dans votre pays." });

    const { data: methods, error: methodsError } = await admin.from("subscription_manual_payment_methods")
      .select("id,country_code,currency,method_code,display_name,account_name,account_reference,instructions")
      .eq("country_code", country.code).eq("currency", country.currency).eq("is_active", true)
      .order("display_name", { ascending: true });
    if (methodsError) return json(500, { error: "Impossible de charger les moyens de paiement." });

    if (action === "methods") return json(200, { countryCode: country.code, currency: country.currency, plan: { id: plan.id, slug: plan.slug, amount: plan.amount }, methods: methods || [] });

    if (action !== "submit") return json(400, { error: "Action invalide." });
    const methodCode = String(body.paymentMethod || "");
    const method = (methods || []).find((m) => m.method_code === methodCode);
    const reference = String(body.payerReference || "").trim();
    const payerPhone = String(body.payerPhone || "").trim();
    if (!method) return json(400, { error: "Choisissez un moyen de paiement actuellement disponible." });
    if (reference.length < 3 || reference.length > 120) return json(400, { error: "Saisissez une référence de transfert valide." });

    const { data: pending } = await admin.from("subscription_payments")
      .select("id").eq("shop_id", shopId).eq("provider", "manual_transfer").eq("status", "pending").maybeSingle();
    if (pending) return json(409, { error: "Une demande d'abonnement est déjà en attente pour cette boutique. Contactez l'administrateur si vous devez la corriger." });

    const { data: payment, error: insertError } = await admin.from("subscription_payments").insert({
      shop_id: shopId,
      plan_id: plan.id,
      provider: "manual_transfer",
      provider_reference: null,
      idempotency_key: crypto.randomUUID(),
      amount: plan.amount,
      currency: plan.currency,
      status: "pending",
      payment_method: methodCode,
      payer_phone: payerPhone || null,
      payer_reference: reference,
    }).select("id,amount,currency,status,created_at").single();

    if (insertError) {
      if (insertError.code === "23505") return json(409, { error: "Cette référence de transfert a déjà été utilisée. Vérifiez la référence saisie." });
      console.error("manual subscription insert", insertError);
      return json(500, { error: "Impossible d'enregistrer la demande de paiement." });
    }

    return json(200, { payment, message: "Demande enregistrée. Votre abonnement sera activé après vérification du transfert par l'administrateur." });
  } catch (error) {
    console.error("create-manual-subscription-payment", error);
    return json(500, { error: "Erreur interne lors de la préparation du paiement." });
  }
});
