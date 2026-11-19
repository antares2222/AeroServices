// ══ OPERATIONS LOGIC ════════════════════════════════════════════

// State for ops
const OPS = { catering:[], operations:[] };

// Catering prefix defaults
const CAT_DEFAULT = ['ETH','QTR','LHA'];
// Ops defaults: {handler, prefixes[]} — empty prefix = all
const OPS_DEFAULT = [
  {handler:'WFS', exclude:['SVA'], prefixes:[]},
  {handler:'CHALLENGE', prefixes:['AAE','CHG','ABD','ICL']},
  {handler:'SWISSPORT', prefixes:['GTI','TAY','YZR','LHA']},
];

function flightPrefix(flight){return flight.replace(/\d.*$/,'');}

function uplift(etd){
  if(!/^\d{1,2}:\d{2}$/.test(etd||''))return '';
  const[h,m]=etd.split(':').map(Number);
  let x=h*60+m-90;if(x<0)x+=1440;
  return String(Math.floor(x/60)%24).padStart(2,'0')+':'+String(x%60).padStart(2,'0');
}

// Window for catering: shift -1h to shift +2h
function inCateringWindow(etd){
  if(!etd||!/^\d{1,2}:\d{2}$/.test(etd))return false;
  const[h,m]=etd.split(':').map(Number),mins=h*60+m;
  let start,end;
  if(S.shift==='NIGHT'){start=21*60;end=8*60;}       // 21h-08h
  else if(S.shift==='EARLY'){start=5*60;end=16*60;}  // 05h-16h
  else{start=13*60;end=24*60;}                        // 13h-24h (LATE)
  if(start<end) return mins>=start&&mins<end;
  return mins>=start||mins<end;
}

// Window for operations: shift -35min à shift_fin -10min
// Clé de tri chronologique tenant compte du passage de minuit pour le shift NIGHT.
// Sans ça, un tri alphabétique classique ("03:55" < "22:05") regroupe les vols
// après minuit avant ceux du soir, au lieu de suivre l'ordre réel du shift.
function chronoKey(hhmm){
  if(!hhmm||!/^\d{1,2}:\d{2}$/.test(hhmm))return 0;
  const[h,m]=hhmm.split(':').map(Number);
  let mins=h*60+m;
  if(S.shift==='NIGHT'&&mins<12*60) mins+=1440; // vols après minuit passent après ceux du soir
  return mins;
}

function inOpsWindow(eta){
  if(!eta||!/^\d{1,2}:\d{2}$/.test(eta))return false;
  const[h,m]=eta.split(':').map(Number),mins=h*60+m;
  let start,end;
  if(S.shift==='NIGHT'){start=21*60+25;end=5*60+50;}    // 21h25-05h50
  else if(S.shift==='EARLY'){start=5*60+25;end=13*60+50;}// 05h25-13h50
  else{start=13*60+25;end=21*60+50;}                     // 13h25-21h50 (LATE)
  if(start<end) return mins>=start&&mins<end;
  return mins>=start||mins<end;
}

function isOpsDefault(f){
  const hw=f.handler.toUpperCase();
  const fl=f.flight.toUpperCase();
  if(isAero(hw))return true;
  if(hw==='WFS'){
    const excl=PARAMS.wfs_ops_exclude||[];
    if(excl.some(e=>fl.startsWith(e)))return false;
    return true;
  }
  if(hw==='CHALLENGE'){
    const pfx=PARAMS.challenge_ops||[];
    return pfx.length===0||pfx.some(p=>fl.startsWith(p));
  }
  if(hw==='SWISSPORT'){
    const pfx=PARAMS.swissport_ops||[];
    return pfx.length===0||pfx.some(p=>fl.startsWith(p));
  }
  if(hw==='AVIAPARTNER'){
    const pfx=PARAMS.avia_ops||[];
    return pfx.length>0&&pfx.some(p=>fl.startsWith(p));
  }
  return false;
}

function buildOps(prev){
  // Repart de zéro à chaque génération — sinon les vols des shifts précédents
  // restent accumulés indéfiniment dans OPS.catering/OPS.operations.
  OPS.catering=[];
  OPS.operations=[];

  // Catering et Opération sont indépendants des règles de filtrage crew-bus :
  // on part de TOUS les vols FIDS de la fenêtre (tous handlers confondus), pas seulement
  // ceux retenus pour le crew-bus (S.dep/S.arr/S.excluded).
  const allDepCat=(S.allDep||[]).filter(f=>inCateringWindow(f.eta));

  // Catering: default = ETH, QTR, LHA prefix
  allDepCat.forEach(f=>{
    const pfx=flightPrefix(f.flight.toUpperCase());
    const existing=OPS.catering.find(c=>c.flight===f.flight&&c.eta===f.eta);
    if(!existing){
      OPS.catering.push({...f, selected:(PARAMS.catering||[]).some(p=>f.flight.toUpperCase().startsWith(p))});
    }
  });

  // Operations: ARR flights within shift -35min window
  const allArrOps=(S.allArr||[]).filter(f=>inOpsWindow(f.eta));
  allArrOps.forEach(f=>{
    // Les FedEx (types du tableau FedEx) ont déjà leur tableau dédié : pas dans la liste à ajouter
    if((f.handler||'').toUpperCase()==='FEDEX'&&(PARAMS.fedex_ac_types||[]).includes(f.acType))return;
    const existing=OPS.operations.find(o=>o.flight===f.flight&&o.eta===f.eta);
    if(!existing){
      OPS.operations.push({...f, selected: isOpsDefault(f), tasks:{cleaning:false,toilet:false,water:false}});
    }
  });

  // Synchro : on reprend les sélections / tâches / vols manuels de l'état précédent
  if(prev){
    const pc=indexByK(prev.cat),po=indexByK(prev.ops);
    OPS.catering.forEach(n=>{const x=pc.get(n._k);if(x)n.selected=x.selected;});
    OPS.operations.forEach(n=>{const x=po.get(n._k);if(x){n.selected=x.selected;n.tasks=x.tasks;}});
    prev.cat.filter(x=>x.manual&&!OPS.catering.some(n=>n._k===x._k)).forEach(x=>OPS.catering.push(x));
    prev.ops.filter(x=>x.manual&&!OPS.operations.some(n=>n._k===x._k)).forEach(x=>OPS.operations.push(x));
  }

  renderOps();
}

// ── Ajout manuel compact — Catering (heure = ETD) ──
function addManualCatering(){
  const timeEl=document.getElementById('catAddTime');
  const regEl=document.getElementById('catAddReg');
  const flightEl=document.getElementById('catAddFlight');
  const eta=timeEl.value.trim();
  const reg=regEl.value.trim().toUpperCase();
  const flight=flightEl.value.trim().toUpperCase();
  const id=newId();
  OPS.catering.push({_id:id,_k:'m:'+id,flight,reg,eta,time:eta,handler:'',stand:'',type:'dep',manual:true,selected:true});
  timeEl.value='';regEl.value='';flightEl.value='';
  renderOps();
}

// ── Ajout manuel compact — Opération (heure = ETA) ──
function addManualOperation(){
  const timeEl=document.getElementById('opsAddTime');
  const regEl=document.getElementById('opsAddReg');
  const flightEl=document.getElementById('opsAddFlight');
  const eta=timeEl.value.trim();
  const reg=regEl.value.trim().toUpperCase();
  const flight=flightEl.value.trim().toUpperCase();
  const id=newId();
  OPS.operations.push({_id:id,_k:'m:'+id,flight,reg,eta,time:eta,handler:'',stand:'',type:'arr',manual:true,selected:true,tasks:{cleaning:false,toilet:false,water:false}});
  timeEl.value='';regEl.value='';flightEl.value='';
  renderOps();
}

function renderOps(){
  // ── Catering ──
  const selCat=OPS.catering.filter(f=>f.selected).sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  document.getElementById('cCat').textContent=selCat.length;

  let catHtml='';
  selCat.forEach(f=>{
    catHtml+=`<div class="fi d" style="margin-bottom:5px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:16px">${edInp(f,'eta','HH:MM',66,'ed-t')}</div>
        <div class="fi-b">
          <div class="fi-f">${edInp(f,'flight','Vol',96,'ed-f')}</div>
          <div class="fi-r">${edInp(f,'reg','Registration',96)}${flightMeta(f)}</div>
        </div>
        <button class="rm-btn" onclick="toggleCat('${f._id}',false)">✕</button>
      </div>
    </div>`;
  });
  if(!catHtml)catHtml=`<div style="color:#9aa0a6;font-size:12px;padding:8px">Aucun vol sélectionné</div>`;
  document.getElementById('catList').innerHTML=catHtml;

  // All dep for catering menu
  let catAllHtml='';
  OPS.catering.slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta)).forEach(f=>{
    const sel=f.selected;
    catAllHtml+=`<div class="fi" style="border-left:3px solid ${sel?'#8ab4f8':'#363940'};background:${sel?'rgba(138,180,248,.04)':'#17181c'};margin-bottom:4px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:16px;color:#8ab4f8">${edInp(f,'eta','HH:MM',66,'ed-t')}</div>
        <div class="fi-b">
          <div class="fi-f" style="font-size:12px">${edInp(f,'flight','Vol',96,'ed-f')}</div>
          <div class="fi-r">${edInp(f,'reg','Registration',96)}${flightMeta(f)}</div>
        </div>
        <button class="wfs-btn ${sel?'sel-hand':''}" onclick="toggleCat('${f._id}',${!sel})">
          ${sel?'✕ Retirer':'+ Ajouter'}
        </button>
      </div>
    </div>`;
  });
  if(!catAllHtml)catAllHtml=`<div style="color:#9aa0a6;font-size:12px;padding:8px">Aucun vol DEP disponible</div>`;
  document.getElementById('catAllList').innerHTML=catAllHtml;

  // ── Operations ──
  const selOps=OPS.operations.filter(f=>f.selected).sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  document.getElementById('cOps').textContent=selOps.length;

  let opsHtml='';
  selOps.forEach(f=>{
    const t=f.tasks||{};
    const isExtra=!isOpsDefault(f)&&!woRecognized(f);
    const wo=woResolve(f,'ops');
    opsHtml+=`<div class="fi a" style="margin-bottom:5px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:16px">${edInp(f,'eta','HH:MM',66,'ed-t')}</div>
        <div class="fi-b">
          <div class="fi-f">${edInp(f,'flight','Vol',96,'ed-f')}</div>
          <div class="fi-r">${edInp(f,'reg','Registration',96)}${flightMeta(f)}</div>
        </div>
        <button class="rm-btn" onclick="toggleOps('${f._id}',false)">✕</button>
      </div>
      ${isExtra?`<div class="wfs-toggle" style="flex-wrap:wrap;gap:4px">
        <button class="wfs-btn ${t.cleaning?'sel-hand':''}" onclick="toggleTask('${f._id}','cleaning')">🧹 Cleaning</button>
        <button class="wfs-btn ${t.toilet?'sel-hand':''}" onclick="toggleTask('${f._id}','toilet')">🚽 Toilet</button>
        <button class="wfs-btn ${t.water?'sel-hand':''}" onclick="toggleTask('${f._id}','water')">💧 Water</button>
      </div>`:(wo.tasks.length?`<div class="wo-note">WO · ${esc(wo.company||'—')} · ${wo.tasks.map(esc).join(' · ')}</div>`:'')}
    </div>`;
  });
  if(!opsHtml)opsHtml=`<div style="color:#9aa0a6;font-size:12px;padding:8px">Aucun vol sélectionné</div>`;
  document.getElementById('opsList').innerHTML=opsHtml;

  // All arr for ops menu
  let opsAllHtml='';
  OPS.operations.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time)).forEach(f=>{
    const sel=f.selected;
    opsAllHtml+=`<div class="fi" style="border-left:3px solid ${sel?'#81c995':'#363940'};background:${sel?'rgba(129,201,149,.04)':'#17181c'};margin-bottom:4px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:16px;color:#8ab4f8">${edInp(f,'eta','HH:MM',66,'ed-t')}</div>
        <div class="fi-b">
          <div class="fi-f" style="font-size:12px">${edInp(f,'flight','Vol',96,'ed-f')}</div>
          <div class="fi-r">${edInp(f,'reg','Registration',96)}${flightMeta(f)}</div>
        </div>
        <button class="wfs-btn ${sel?'sel-hand':''}" onclick="toggleOps('${f._id}',${!sel})">
          ${sel?'✕ Retirer':'+ Ajouter'}
        </button>
      </div>
    </div>`;
  });
  if(!opsAllHtml)opsAllHtml=`<div style="color:#9aa0a6;font-size:12px;padding:8px">Aucun vol ARR disponible</div>`;
  document.getElementById('opsAllList').innerHTML=opsAllHtml;

  renderFedexTable();
  updateWoButtons();
}

// ── Tableau FedEx (types d'avion configurés, ex: B737/B738) ──
function renderFedexTable(){
  const card=document.getElementById('fedexCard');
  const grid=document.getElementById('opsGrid');
  const body=document.getElementById('fedexTblBody');
  const cnt=document.getElementById('cFedex');
  const flights=(S.fedex||[]).slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  cnt.textContent=flights.length;
  if(!flights.length){
    card.style.display='none';
    grid.classList.remove('has-fedex');
    body.innerHTML='';
    return;
  }
  grid.classList.add('has-fedex');
  card.style.display='block';
  body.innerHTML=flights.map(f=>`<tr style="border-bottom:1px solid rgba(54,57,64,.5)">
    <td style="font-family:var(--f-m);font-size:11px;padding:6px">${edInp(f,'reg','Registration',90)}</td>
    <td style="font-family:var(--f-m);font-size:11px;padding:6px;font-weight:bold">${edInp(f,'flight','Vol',90)}</td>
    <td style="font-family:var(--f-m);font-size:11px;padding:6px;color:#81c995">${edInp(f,'eta','HH:MM',60)}</td>
    <td style="font-family:var(--f-m);font-size:11px;padding:6px">${f.stand||'—'}</td>
  </tr>`).join('');
  updateWoButtons();
}

function toggleCat(id,val){
  const f=OPS.catering.find(c=>c._id===id);
  if(f)f.selected=val;
  renderOps();
}
function toggleOps(id,val){
  const f=OPS.operations.find(o=>o._id===id);
  if(f)f.selected=val;
  renderOps();
}
function toggleTask(id,task){
  const f=OPS.operations.find(o=>o._id===id);
  if(!f)return;
  if(!f.tasks)f.tasks={cleaning:false,toilet:false,water:false};
  f.tasks[task]=!f.tasks[task];
  renderOps();
}
function getTaskLabel(tasks){
  if(!tasks)return'';
  const{cleaning,toilet,water}=tasks;
  if(cleaning&&toilet&&water)return'FTS';
  const list=[];
  if(cleaning)list.push('CLEANING');
  if(toilet)list.push('TOILET');
  if(water)list.push('WATER');
  return list.join(' / ');
}

function genPDFOps(){
  // Sécurité : réinitialise l'état d'affichage avant de configurer la feuille OPS
  document.getElementById('sheet').classList.remove('no-print');
  document.getElementById('sheetOps').classList.remove('do-print');
  document.getElementById('sheetWO').classList.remove('do-print');

  // Catering rows
  const selCat=OPS.catering.filter(f=>f.selected).sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  let catRows='';
  selCat.forEach(f=>{
    catRows+=`<tr>
      <td class="font-lg">${f.reg||''}</td>
      <td class="font-lg">${f.flight}</td>
      <td class="font-lg">${uplift(f.eta)}</td>
      <td class="font-lg">${f.eta}</td>
    </tr>`;
  });
  document.getElementById('shOps-cat').innerHTML=catRows;

  // Operations rows (ordre : Registration, Vol, Stand, ETA, Tâche)
  const selOps=OPS.operations.filter(f=>f.selected).sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  let opsRows='';
  selOps.forEach(f=>{
    const task=isAero(f.handler)?'HANDLING AERO ARR':(isOpsDefault(f)?'':getTaskLabel(f.tasks));
    opsRows+=`<tr>
      <td class="font-lg">${f.reg||''}</td>
      <td class="font-lg">${f.flight}</td>
      <td class="font-lg">${f.stand||''}</td>
      <td class="font-lg">${f.time}</td>
      <td style="font-size:10pt;font-weight:bold">${task}</td>
    </tr>`;
  });
  // Empty rows = nb vols + 2
  for(let i=0;i<2;i++){
    opsRows+=`<tr class="per"><td></td><td></td><td></td><td></td><td></td></tr>`;
  }
  document.getElementById('shOps-ops').innerHTML=opsRows;

  // FedEx rows — bloc affiché uniquement s'il y a des vols (Registration + ETA uniquement)
  const fedexBlock=document.getElementById('shOps-fedex-block');
  const fedexFlights=(S.fedex||[]).slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  if(fedexFlights.length){
    let fedexRows='';
    fedexFlights.forEach(f=>{
      fedexRows+=`<tr>
        <td class="font-lg">${f.reg||''}</td>
        <td class="font-lg">${f.eta}</td>
      </tr>`;
    });
    document.getElementById('shOps-fedex').innerHTML=fedexRows;
    fedexBlock.style.display='block';
  } else {
    document.getElementById('shOps-fedex').innerHTML='';
    fedexBlock.style.display='none';
  }

  if(openPrintTab('sheetOps','do-print'))return;
  // Affiche uniquement la feuille OPS — délai court pour laisser Safari iOS peindre le DOM
  document.getElementById('sheet').classList.add('no-print');
  document.getElementById('sheetOps').classList.add('do-print');

  let cleaned=false;
  const cleanup=()=>{
    if(cleaned)return;
    cleaned=true;
    document.getElementById('sheet').classList.remove('no-print');
    document.getElementById('sheetOps').classList.remove('do-print');
  };
  setTimeout(()=>{window.print();armPrintCleanup(cleanup);},300);
}

