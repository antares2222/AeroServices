// Couleurs par handler (style original)
function tlColor(hw){
  const h=(hw||'').toUpperCase();
  if(h==='WFS')return'#2563eb';
  if(h==='CHALLENGE')return'#7c3aed';
  if(h==='SWISSPORT')return'#059669';
  if(h==='AVIAPARTNER')return'#d97706';
  return'#374151';
}

// Helpers temps
function tlWin(shift){
  if(shift==='EARLY')return{ws:4*60,wd:720};
  if(shift==='LATE')return{ws:12*60,wd:720};
  return{ws:20*60,wd:720};
}
function tlPct(timeStr,ws,wd){
  const[h,m]=timeStr.split(':').map(Number);
  let mins=h*60+m;
  if(ws+wd>1440&&mins<(ws+wd)-1440)mins+=1440;
  return((mins-ws)/wd)*100;
}
function tlNorm(timeStr,ws,wd){
  const[h,m]=timeStr.split(':').map(Number);
  let mins=h*60+m;
  if(ws+wd>1440&&mins<(ws+wd)-1440)mins+=1440;
  return mins;
}
function tlLabel(mins){
  const h=Math.floor((mins%1440)/60),m=mins%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

// Construire les vols pour la timeline (même filtres que crew-bus + exclus autorisés)
function getTimelineFlights(){
  const allowed=new Set(['WFS','CHALLENGE','SWISSPORT','AVIAPARTNER']);
  const filtered=S.excluded.filter(f=>allowed.has((f.handler||'').toUpperCase()));
  return [...S.arr,...S.dep,...filtered];
}

function tlBuildSegs(flights,ws,wd){
  const byReg={};
  const noReg=[];
  for(const f of flights){
    if(!f.reg){noReg.push(f);continue;}
    if(!byReg[f.reg])byReg[f.reg]={arrs:[],deps:[]};
    if(f.type==='arr')byReg[f.reg].arrs.push(f);
    else byReg[f.reg].deps.push(f);
  }
  const segs=[];
  for(const[reg,{arrs,deps}]of Object.entries(byReg)){
    const sa=[...arrs].sort((a,b)=>tlNorm(a.eta,ws,wd)-tlNorm(b.eta,ws,wd));
    const sd=[...deps].sort((a,b)=>tlNorm(a.eta,ws,wd)-tlNorm(b.eta,ws,wd));
    const usedDep=new Set();
    for(const arr of sa){
      const aN=tlNorm(arr.eta,ws,wd);
      const di=sd.findIndex((_,i)=>!usedDep.has(i)&&tlNorm(sd[i].eta,ws,wd)>aN);
      if(di!==-1){
        usedDep.add(di);
        segs.push({reg,arrTime:arr.eta,depTime:sd[di].eta,arrFlight:arr.flight,depFlight:sd[di].flight});
      }else{
        segs.push({reg,arrTime:arr.eta,depTime:null,arrFlight:arr.flight,depFlight:null});
      }
    }
    for(let i=0;i<sd.length;i++){
      if(!usedDep.has(i))segs.push({reg,arrTime:null,depTime:sd[i].eta,arrFlight:null,depFlight:sd[i].flight});
    }
  }
  segs.sort((a,b)=>{
    const ta=a.arrTime||a.depTime||'99:99',tb=b.arrTime||b.depTime||'99:99';
    return tlNorm(ta,ws,wd)-tlNorm(tb,ws,wd);
  });
  return segs;
}

function renderTimeline(){
  if(!S.arr.length&&!S.dep.length)return;
  const flights=getTimelineFlights();
  const{ws,wd}=tlWin(S.shift);
  const segs=tlBuildSegs(flights,ws,wd);
  if(!segs.length)return;

  const sBL=(2/12)*100,sBW=(8/12)*100;

  let axisH='',gridH='';
  for(let i=0;i<=12;i+=2){
    const pct=(i/12)*100;
    axisH+=`<div class="tl-tick" style="left:${pct}%">${tlLabel(ws+i*60)}</div>`;
    gridH+=`<div class="tl-gridln" style="left:${pct}%"></div>`;
  }

  // Lookup rapide : numéro de vol → handler
  const flightHandlerMap={};
  for(const f of flights) if(f.flight&&f.handler) flightHandlerMap[f.flight]=f.handler;

  let rowsH='',rowCount=0;
  for(const seg of segs){
    // Label: reg en blanc + vols en gris
    const reg=seg.reg||'?';
    const flts=[seg.arrFlight,seg.depFlight].filter(Boolean).join('→');
    const labelHtml=`<div class="tl-reg-lbl">${reg}<span class="tl-flt-lbl">${flts}</span></div>`;

    // Couleur handler
    const col=tlColor(flightHandlerMap[seg.arrFlight]||flightHandlerMap[seg.depFlight]||'');
    let barH='';

    if(seg.arrTime&&seg.depTime){
      let l=tlPct(seg.arrTime,ws,wd),r=tlPct(seg.depTime,ws,wd);
      if(r<0||l>100)continue;
      l=Math.max(0,l);r=Math.min(100,r);
      const w=r-l;if(w<=0)continue;
      const innerLbl=w>8?`<span class="tl-bar-lbl" style="color:rgba(255,255,255,.9)">${seg.arrTime}–${seg.depTime}</span>`:'';
      barH=`<div class="tl-bar" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%;background:${col};border:1px solid rgba(255,255,255,.15)" title="${reg} au sol ${seg.arrTime}→${seg.depTime}">${innerLbl}</div>`;
    }else if(seg.arrTime){
      // Seulement arrivée → fondu vers la droite
      let l=tlPct(seg.arrTime,ws,wd);
      if(l>100)continue;l=Math.max(0,l);
      const w=Math.min(15,100-l);
      barH=`<div class="tl-bar" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%;background:linear-gradient(to right,${col} 0%,transparent 100%)" title="${reg} ARR ${seg.arrTime}"></div>`;
    }else if(seg.depTime){
      // Seulement départ → fondu vers la gauche
      let r=tlPct(seg.depTime,ws,wd);
      if(r<0)continue;r=Math.min(100,r);
      const l=Math.max(0,r-15);
      barH=`<div class="tl-bar" style="left:${l.toFixed(2)}%;width:${(r-l).toFixed(2)}%;background:linear-gradient(to left,${col} 0%,transparent 100%)" title="${reg} DEP ${seg.depTime}"></div>`;
    }
    if(!barH)continue;
    rowCount++;
    rowsH+=`<div class="tl-aircraft-row">
      ${labelHtml}
      <div class="tl-track">
        <div class="tl-shift-band" style="left:${sBL.toFixed(2)}%;width:${sBW.toFixed(2)}%"></div>
        ${gridH}${barH}
      </div>
    </div>`;
  }

  const inner=document.getElementById('tlInner');
  if(!rowCount){
    inner.innerHTML='<div style="color:#9aa0a6;font-size:11px;font-family:var(--f-m);padding:10px;text-align:center">Aucune immatriculation détectée dans le FIDS.</div>';
  }else{
    inner.innerHTML=`<div class="tl-axis-row">${axisH}</div>${rowsH}`;
  }
  document.getElementById('tlSection').style.display='block';
}

