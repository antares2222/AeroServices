function selShift(s,el){S.shift=s;document.querySelectorAll('.sbtn').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');}
function reset(){
  S.arr=[];S.dep=[];S.excluded=[];S.fedex=[];S.allArr=[];S.allDep=[];
  OPS.catering=[];OPS.operations=[];
  setFidsStatus('','#6b7280');
  document.getElementById('tlSection').style.display='none';
  renderPreview();
  renderFedexTable();
  renderOps();
  document.getElementById('s0').scrollIntoView({behavior:'smooth',block:'start'});
}

function shouldInclude(flight,raw){
  if(!raw)return false;
  const r=raw.toUpperCase().trim();
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

function pickup(t){const[h,m]=t.split(':').map(Number);let x=h*60+m-75;if(x<0)x+=1440;return String(Math.floor(x/60)%24).padStart(2,'0')+':'+String(x%60).padStart(2,'0');}

