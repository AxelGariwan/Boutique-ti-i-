// ============================================================
// INFORMATIONS LÉGALES : À COMPLÉTER AVANT DE PUBLIER
// Ces informations sont affichées dans les pages légales
// (mentions légales, confidentialité, CGU, remboursement).
// Tant qu'un champ obligatoire est vide, un avertissement rouge
// s'affiche en haut des pages légales.
// ============================================================
window.LEGAL = {
  nom: "",         // Nom et prénom (personne physique) ou raison sociale (société)
  forme: "",       // Ex : "Entrepreneur individuel", "SARL", "SUARL"…
  adresse: "",     // Adresse postale complète (rue, quartier, ville, Sénégal)
  email: "",       // Email de contact (droits RGPD/CDP, réclamations)
  telephone: "",   // Téléphone ou WhatsApp de contact
  directeur: "",   // Directeur de la publication (souvent le même nom)
  ninea: "",       // Numéro NINEA (si vous en avez un)
  rccm: "",        // Numéro RCCM (si vous en avez un)
  cdp: ""          // N° de récépissé de la déclaration à la CDP (cdp.sn), une fois obtenu
};
(function () {
  var L = window.LEGAL, required = ["nom", "forme", "adresse", "email", "telephone", "directeur"], missing = [];
  required.forEach(function (k) { if (!String(L[k] || "").trim()) missing.push(k); });
  document.querySelectorAll("[data-l]").forEach(function (el) {
    var v = String(L[el.getAttribute("data-l")] || "").trim();
    if (v) { el.textContent = v; el.classList.remove("todo"); }
  });
  document.querySelectorAll("[data-if]").forEach(function (el) {
    if (!String(L[el.getAttribute("data-if")] || "").trim()) el.hidden = true;
  });
  var w = document.getElementById("legal-warning");
  if (w && missing.length) {
    w.hidden = false;
    w.textContent = "Page non publiable en l’état : complétez les champs suivants dans le fichier legal.js → " + missing.join(", ") + ".";
  }
})();
