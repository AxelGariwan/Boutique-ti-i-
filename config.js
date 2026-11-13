// Configuration Supabase. La clé "publishable" est faite pour être publique :
// la sécurité repose sur les règles (RLS) de la base, pas sur le secret de cette clé.
// Ne mettez JAMAIS ici la clé "service_role" ou "secret".
window.SB_URL = "https://rsabamyxihhxyjvmlxav.supabase.co";
window.SB_KEY = "sb_publishable_r188ItWJrWmhLTrLvR91Ig_8nQjRvAH";

// Mettre true UNIQUEMENT quand Twilio (canal WhatsApp) est configuré dans Supabase.
// Tant que c'est false, seul l'email est proposé.
window.WA_AUTH = false;