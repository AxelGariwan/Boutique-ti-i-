import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const authHeader = req.headers.get("Authorization");
    if (!url || !anon || !authHeader) return json(401, { error: "Connexion administrateur requise." });

    const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: authError } = await client.auth.getUser();
    if (authError || !userData.user) return json(401, { error: "Session invalide." });

    const body = await req.json();
    const paymentId = String(body.paymentId || "");
    const decision = String(body.decision || "");
    const note = String(body.note || "").slice(0, 1000);
    if (!paymentId || !["approve", "reject"].includes(decision)) return json(400, { error: "Demande ou décision invalide." });

    const { error } = await client.rpc("admin_review_manual_subscription_payment", {
      p_payment_id: paymentId,
      p_decision: decision,
      p_note: note || null,
    });
    if (error) {
      console.error("admin review rpc", error);
      return json(400, { error: error.message || "Impossible de traiter cette demande." });
    }
    return json(200, { success: true, message: decision === "approve" ? "Paiement validé et abonnement activé." : "Demande refusée." });
  } catch (error) {
    console.error("admin-review-manual-subscription-payment", error);
    return json(500, { error: "Erreur interne lors du traitement." });
  }
});
