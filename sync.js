// ── Synchronisation FIDS : fusionne les nouvelles données avec l'état en cours ──
// Clé d'identité d'un vol = _k ('arr:NUM' / 'dep:NUM'), stable même si le n° est édité.

function snapshotState(){
  return {arr:S.arr.slice(),dep:S.dep.slice(),excluded:S.excluded.slice(),allArr:S.allArr.slice(),
          allDep:S.allDep.slice(),fedex:S.fedex.slice(),cat:OPS.catering.slice(),ops:OPS.operations.slice()};
}
function indexByK(list){
  const m=new Map();
  (list||[]).forEach(f=>{if(f._k&&!m.has(f._k))m.set(f._k,f);});
  return m;
}
// Reprend l'identité et les champs édités par l'utilisateur depuis l'ancien vol
function applyOld(n,o){
  if(!o)return n;
  n._id=o._id;
  if(o._ed){
    n._ed={...o._ed};
    Object.keys(o._ed).forEach(k=>{n[k]=o[k];});
    if(o._ed.eta)n.time=n.type==='dep'?pickup(n.eta):n.eta;
  }
  if(n.type==='dep'&&o.hsMode!==undefined)n.hsMode=o.hsMode;
  return n;
}
function carryOver(old,nw){
  const oSel=indexByK([...old.arr,...old.dep]);
  const oExc=indexByK(old.excluded);
  const oAll=indexByK([...old.allArr,...old.allDep]);
  const oFx=indexByK(old.fedex);
  const find=n=>oAll.get(n._k)||oSel.get(n._k)||oExc.get(n._k);
  nw.allArrivals.forEach(n=>applyOld(n,find(n)));
  nw.allDepartures.forEach(n=>applyOld(n,find(n)));
  nw.fedexArr.forEach(n=>applyOld(n,oFx.get(n._k)));
  const arr=[],dep=[],exc=[];
  const put=(n,sel)=>{if(sel)(n.type==='dep'?dep:arr).push(n);else exc.push(n);};
  [...nw.arrivals,...nw.departures].forEach(n=>{
    const wasSel=oSel.get(n._k),wasExc=oExc.get(n._k);
    applyOld(n,wasSel||wasExc);
    if(wasExc&&!wasSel){put(n,false);return;}      // retiré par l'utilisateur
    if(wasSel&&wasSel.wfsMode!==undefined)n.wfsMode=wasSel.wfsMode;
    put(n,true);
  });
  nw.excluded.forEach(n=>{
    const wasSel=oSel.get(n._k);
    applyOld(n,wasSel||oExc.get(n._k));
    if(wasSel){n.wfsMode=wasSel.wfsMode;put(n,true);}  // ajouté par l'utilisateur
    else put(n,false);
  });
  [...old.arr,...old.dep].filter(x=>x.manual).forEach(x=>put(x,true));
  nw.arrivals=arr;nw.departures=dep;nw.excluded=exc;
}
