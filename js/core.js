// Vide toutes les listes (crew-bus, Catering, Opération, Headset, FedEx, timeline)
function clearAllData(){
  S.arr=[];S.dep=[];S.excluded=[];S.fedex=[];S.allArr=[];S.allDep=[];
  OPS.catering=[];OPS.operations=[];
  setFidsStatus('','#9aa0a6');
  document.getElementById('tlSection').style.display='none';
  renderPreview();
  renderFedexTable();
  renderOps();
}
function selShift(s,el){
  const changed=S.shift!==s;
  S.shift=s;
  document.querySelectorAll('.sbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  // Changer de shift quand un autre est déjà chargé : on repart de zéro
  if(changed){clearAllData();loadFromFids();}
}

// ── Édition inline (n° de vol, registration, heure) — synchronisée partout ──
let _uid=0;
function newId(){return 'f'+(++_uid);}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function edInp(f,field,ph,w,cls){
  return `<input type="text" class="ed ${cls||''}" value="${esc(f[field])}" placeholder="${ph}" style="width:${w}px" onchange="editFlight('${f._id}','${field}',this.value)">`;
}
function editFlight(id,field,val){
  val=(val||'').trim();
  if(field==='eta'){
    const m=val.match(/^(\d{1,2})[:hH.]?(\d{2})$/);
    if(m&&+m[1]<=23&&+m[2]<=59)val=m[1].padStart(2,'0')+':'+m[2];   // normalise si valide, sinon garde tel quel
  } else if(field==='flight'||field==='reg'||field==='stand'){
    val=val.toUpperCase();
  }
  [S.arr,S.dep,S.excluded,S.allArr,S.allDep,S.fedex,OPS.catering,OPS.operations].forEach(l=>(l||[]).forEach(f=>{
    if(f._id!==id)return;
    f._ed=f._ed||{};f._ed[field]=true;
    if(field==='eta'){f.eta=val;f.time=f.type==='dep'?pickup(val):val;}
    else f[field]=val;
  }));
  refreshAll();
}
function refreshAll(){
  renderPreview();renderOps();
  const tl=document.getElementById('tlSection');
  if(tl&&tl.style.display!=='none'&&typeof renderTimeline==='function')renderTimeline();
}

// Handler AERO (Aero Services) : toujours crew-bus + handling + headset + opération
function isAero(handler){return /^AERO/.test((handler||'').toUpperCase().trim());}
// Vol sur lequel on peut activer le bouton « Handling aero »
function canHandling(f){return f.manual||f.handler.toUpperCase()==='WFS'||isAero(f.handler);}

function shouldInclude(flight,raw){
  if(!raw)return false;
  const r=raw.toUpperCase().trim();
  if(isAero(r))return true;
  if(r==='CHALLENGE'||r==='WFS')return true;
  if(r==='SWISSPORT'&&(PARAMS.swissport_cb||[]).some(p=>flight.toUpperCase().startsWith(p)))return true;
  if(r==='AVIAPARTNER'&&(PARAMS.avia_cb||[]).some(p=>flight.toUpperCase().startsWith(p)))return true;
  return false;
}
// Vols qu'on peut proposer (pas FedEx/Aviapartner, mais pas encore inclus)
function canPropose(raw){
  if(!raw)return false;
  const r=raw.toUpperCase().trim();
  if(r==='FEDEX'||r==='AVIAPARTNER')return false;
  return true;
}

function pickup(t){if(!/^\d{1,2}:\d{2}$/.test(t||''))return '';const[h,m]=t.split(':').map(Number);let x=h*60+m-75;if(x<0)x+=1440;return String(Math.floor(x/60)%24).padStart(2,'0')+':'+String(x%60).padStart(2,'0');}


// Affichage compact : SWISSPORT → SWP, CHALLENGE → CHH
function hAbbr(h){
  const u=(h||'').toUpperCase().trim();
  return u==='SWISSPORT'?'SWP':u==='CHALLENGE'?'CHH':u;
}
// « stand · handler » dans une seule étiquette (même taille/typo/couleur)
function flightMeta(f){
  const t=[f.stand,hAbbr(f.handler)].filter(Boolean).map(esc).join(' · ');
  return t?'<span class="fi-meta">'+t+'</span>':'';
}

// Nettoyage après impression : ne JAMAIS le faire sur un timer ni sur onafterprint (iOS les déclenche
// avant la fin de l'aperçu → la feuille crew-bus réapparaît). On attend le prochain toucher/clic.
function armPrintCleanup(fn){
  let done=false;
  const run=()=>{if(done)return;done=true;document.removeEventListener('pointerdown',h,true);fn();};
  const h=()=>setTimeout(run,300);
  setTimeout(()=>document.addEventListener('pointerdown',h,true),1500);
}

