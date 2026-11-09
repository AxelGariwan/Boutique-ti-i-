/* Gestion du thème clair/sombre — Boutique ti i */
(function(){
  var KEY="bti-theme";
  function valid(v){return v==="dark"||v==="light"}
  function apply(theme){
    var next=valid(theme)?theme:"light";
    document.documentElement.setAttribute("data-theme",next);
    document.documentElement.style.colorScheme=next;
    var button=document.querySelector("[data-bti-theme-toggle]");
    if(button){
      var dark=next==="dark";
      button.innerHTML=dark
        ? '<span aria-hidden="true">☀</span><span>Mode clair</span>'
        : '<span aria-hidden="true">☾</span><span>Mode sombre</span>';
      button.setAttribute("aria-label",dark?"Activer le thème clair":"Activer le thème sombre");
      button.setAttribute("aria-pressed",String(dark));
      button.title=dark?"Passer au thème clair":"Passer au thème sombre";
    }
  }
  function mount(){
    var saved=null;
    try{saved=localStorage.getItem(KEY)}catch(e){}
    apply(valid(saved)?saved:"light");
    if(document.querySelector("[data-bti-theme-toggle]"))return;
    var slot=document.querySelector("[data-bti-theme-slot]");
    var target=slot||document.querySelector("header .max-w-7xl, header .wrap, .admin-top");
    if(!target) target=document.querySelector("body");
    var button=document.createElement("button");
    button.type="button";button.className="bti-theme-toggle";button.setAttribute("data-bti-theme-toggle","");
    button.addEventListener("click",function(){
      var next=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
      apply(next);
      try{localStorage.setItem(KEY,next)}catch(e){}
    });
    if(target===document.body){
      button.style.position="fixed";button.style.top="12px";button.style.right="12px";button.style.zIndex="100";
    }else{
      button.style.marginLeft=slot?"0":"auto";button.style.flexShrink="0";
    }
    target.appendChild(button);apply(document.documentElement.getAttribute("data-theme"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();