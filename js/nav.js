// ── NAV MOBILE : scroll vers section + suivi de l'onglet actif ──────
function navScrollTo(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('#mobileNav .mnav-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
}
(function initMobileNavObserver(){
  const ids=['s0','tlSection','s2','s3'];
  const setup=()=>{
    const targets=ids.map(id=>document.getElementById(id)).filter(Boolean);
    if(!targets.length)return;
    const obs=new IntersectionObserver((entries)=>{
      // Choisit la section la plus proche du haut de l'écran parmi celles visibles
      let best=null,bestTop=Infinity;
      entries.forEach(e=>{
        if(e.isIntersecting){
          const top=Math.abs(e.boundingClientRect.top);
          if(top<bestTop){bestTop=top;best=e.target.id;}
        }
      });
      if(best){
        document.querySelectorAll('#mobileNav .mnav-btn').forEach(b=>{
          b.classList.toggle('active',b.dataset.nav===best);
        });
      }
    },{rootMargin:'-40% 0px -50% 0px',threshold:0});
    targets.forEach(t=>obs.observe(t));
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
