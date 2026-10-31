// ============================================================
// INFORMATIONS LÉGALES : À COMPLÉTER AVANT DE PUBLIER
// Ces informations sont affichées dans les pages légales
// (mentions légales, confidentialité, CGU, remboursement).
// Tant qu'un champ obligatoire est vide, un avertissement rouge
// s'affiche en haut des pages légales.
// ============================================================
window.LEGAL = {
  nom: "Axel Gariwan",
  forme: "Entrepreneur individuel",
  adresse: "Dakar, Sénégal",
  email: "boutiquetii@gmail.com",
  telephone: "+221 71 062 06 85 ",
  directeur: "Axel Gariwan",
  ninea: "En cours d'immatriculation",
  rccm: "En cours d'immatriculation",
  cdp: "En cours"
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
