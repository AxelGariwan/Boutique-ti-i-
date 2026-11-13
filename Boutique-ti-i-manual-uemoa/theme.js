/* Gestion du thème clair/sombre — Boutique ti i */
(function(){
  var KEY="bti-theme";
  function valid(v){return v==="dark"||v==="light"}
  function apply(theme){
    var next=valid(theme)?theme:"light";
    document.documentElement.setAttribute("data-theme",next);
    document.documentElement.style.colorScheme=next;
    var buttons=document.querySelectorAll("[data-bti-theme-toggle]");
    var dark=next==="dark";
    buttons.forEach(function(button){
      button.innerHTML=dark
        ? '<span aria-hidden="true">☀</span><span>Mode clair</span>'
        : '<span aria-hidden="true">☾</span><span>Mode sombre</span>';
      button.setAttribute("aria-label",dark?"Activer le thème clair":"Activer le thème sombre");
      button.setAttribute("aria-pressed",String(dark));
      button.title=dark?"Passer au thème clair":"Passer au thème sombre";
    });
  }
  function mount(){
    var saved=null;
    try{saved=localStorage.getItem(KEY)}catch(e){}
    apply(valid(saved)?saved:"light");

    // Le sélecteur est volontairement limité à son emplacement dédié
    // dans Mon compte : il ne doit jamais déplacer la navigation ou les actions.
    var slots=document.querySelectorAll("[data-bti-theme-slot]");
    slots.forEach(function(slot){
      if(slot.querySelector("[data-bti-theme-toggle]"))return;
      var button=document.createElement("button");
      button.type="button";
      button.className="bti-theme-toggle";
      button.setAttribute("data-bti-theme-toggle","");
      button.addEventListener("click",function(){
        var next=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
        apply(next);
        try{localStorage.setItem(KEY,next)}catch(e){}
      });
      slot.appendChild(button);
    });
    apply(document.documentElement.getAttribute("data-theme"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
