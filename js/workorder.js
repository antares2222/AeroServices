// ── Work Order : règles par compagnie, construction des feuilles A4 et impression ──
// Une feuille par vol. Compagnie + tâches viennent de PARAMS (modifiables dans Paramètres).

const WO_SERVICES=['A WASH','WET WHEELS','BELLY WASH','GEAR WASH TECH','GEAR WASH COMM','FULL WET WASH','HORSE STALL','HORSE STALL BUILD','OFFICE CLEANING','APU WASH','FLAPS WASH','WINDSHIELD WASH','CARGO DECK CL','CARGO HOLDS CL','INTERIOR DEEP','FULL TRANSIT SERVICE','TRANSIT SERVICE','WATER SERVICE','LAVATORY SERVICE','DISINFECTION','LAUNDRY','CATERING','PRODUCT DELIVERY','PMR','HANDLING','PUSH BACK','HEADSET','TOWING','RENTING','CREW BUS','SPECIAL REQUEST','VIDANGE TOILETTE'];
const WO_MANUAL_TASKS={cleaning:'TRANSIT SERVICE',toilet:'LAVATORY SERVICE',water:'WATER SERVICE'};

function woNormReg(r){return (r||'').toUpperCase().replace(/[\s-]/g,'');}
// B744 / B748 … = B747
function woNormType(t){const u=(t||'').toUpperCase().trim();return /^B74\d$/.test(u)?'B747':u;}
function woPrefixMatch(flight,p){
  const fl=(flight||'').toUpperCase(),pp=(p||'').toUpperCase();
  return !!pp&&fl.startsWith(pp)&&(fl.length===pp.length||/\d/.test(fl[pp.length]));
}
// Compagnie reconnue dans la flotte (immatriculation ou préfixe de vol)
function woFleetCompany(f){
  const reg=woNormReg(f.reg);
  for(const c of PARAMS.wo_companies||[]){
    if(reg&&(c.regs||[]).some(r=>woNormReg(r)===reg))return c.name;
  }
  for(const c of PARAMS.wo_companies||[]){
    if((c.prefixes||[]).some(p=>woPrefixMatch(f.flight,p)))return c.name;
  }
  return '';
}
// Compagnie par handler (paramètre de facturation) : WFS, CHH→LACHS, SWP, FEDEX→ASL…
function woHandlerCompany(f){
  const m=PARAMS.wo_handler_company||{};
  return m[hAbbr(f.handler)]||m[(f.handler||'').toUpperCase()]||'';
}
function woCateringCompany(f){
  const m=PARAMS.wo_catering_company||{};
  for(const p of Object.keys(m))if(woPrefixMatch(f.flight,p))return m[p];
  return PARAMS.wo_catering_default||"TRAVEL'IN";
}
// Tâches issues des règles (sans handling ni choix manuel)
function woRuleTasks(company,acType){
  const r=(PARAMS.wo_tasks||{})[company];
  if(!r)return[];
  const t=woNormType(acType);
  const byType=r.types&&Object.keys(r.types).find(k=>woNormType(k)===t);
  return (byType?r.types[byType]:r.def)||[];
}
function woCompanyOf(f){return woFleetCompany(f)||woHandlerCompany(f);}
// Un vol est « reconnu » quand les règles donnent des tâches : plus besoin du choix manuel
function woRecognized(f){return woRuleTasks(woCompanyOf(f),f.acType).length>0;}

// mode : 'catering' | 'ops' (arrivée sélectionnée / FedEx) | 'handling'
function woResolve(f,mode){
  if(mode==='catering')return{company:woCateringCompany(f),tasks:['CATERING']};
  const company=woCompanyOf(f);
  if(mode==='handling'){
    const r=(PARAMS.wo_tasks||{})[company];
    return{company,tasks:r&&r.handling&&r.handling.length?r.handling.slice():['HANDLING']};
  }
  const tasks=woRuleTasks(company,f.acType);
  if(tasks.length)return{company,tasks:tasks.slice()};
  // Non reconnu : choix manuel fait dans la liste Opération
  const t=f.tasks||{};
  return{company,tasks:Object.keys(WO_MANUAL_TASKS).filter(k=>t[k]).map(k=>WO_MANUAL_TASKS[k])};
}

// ── Dates : date d'arrivée de l'avion ──
function woDateForTime(hhmm){
  const base=document.getElementById('sDate').value;
  if(!base)return '';
  const[y,m,d]=base.split('-').map(Number);
  const h=parseInt((hhmm||'').split(':')[0],10);
  const dt=new Date(y,m-1,d+((S.shift==='NIGHT'&&h<12)?1:0));
  return ymd(dt);
}
function woItemDate(f){return f.date||woDateForTime(f.eta);}
// Départ : date d'arrivée du même avion si connue (même registration), sinon date du vol
function woArrivalDate(f){
  const own=woItemDate(f);
  if(f.type!=='dep'||!f.reg)return own;
  const dk=own+' '+(f.eta||'');
  let best='';
  (S.allArr||[]).forEach(a=>{
    if(a.reg!==f.reg)return;
    const k=woItemDate(a)+' '+(a.eta||'');
    if(k<=dk&&k>best)best=k;
  });
  return best?best.split(' ')[0]:own;
}

// ── Listes à imprimer ──
function woListCatering(){
  return OPS.catering.filter(f=>f.selected).sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta))
    .map(f=>({f,r:woResolve(f,'catering')}));
}
// Opération : arrivées sélectionnées + vols en handling choisis dans le crew-bus
function woListOps(){
  const out=[],seen=new Set();
  const hand=[...S.arr,...S.dep].filter(f=>f.wfsMode==='handling');
  const handIds=new Set(hand.map(f=>f._id));
  OPS.operations.filter(f=>f.selected).sort((a,b)=>chronoKey(a.time)-chronoKey(b.time)).forEach(f=>{
    seen.add(f._id);
    out.push({f,r:woResolve(f,handIds.has(f._id)?'handling':'ops')});
  });
  hand.filter(f=>!seen.has(f._id)).sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta))
    .forEach(f=>out.push({f,r:woResolve(f,'handling')}));
  return out;
}
function woListFedex(){
  return (S.fedex||[]).slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta))
    .map(f=>({f,r:woResolve(f,'ops')}));
}
function woCounts(){return{cat:woListCatering().length,ops:woListOps().length,fedex:woListFedex().length};}
function updateWoButtons(){
  if(typeof woListOps!=='function')return;
  const c=woCounts();
  [['woCatBtn','cat'],['woOpsBtn','ops'],['woFedexBtn','fedex']].forEach(([id,k])=>{
    const b=document.getElementById(id);if(b)b.textContent='🖨 WORK ORDERS ('+c[k]+')';
  });
}

// ── Construction des pages ──
function woPageHtml(v){
  const set=new Set(v.tasks);
  const sel=n=>set.has(n)?' wo-sel':'';
  return `<div class="wo-page">
  <div class="wo-logo"><img src="${WO_LOGO}" alt="Aero Services"></div>
  <div class="wo-title">WORK PERFORMED</div>
  <div class="wo-sheet">
    <div class="wo-row wo-h14">
      <div class="wo-cell wo-s1">AEROSERVICES</div>
      <div class="wo-cell wo-s2">BRU</div>
      <div class="wo-cell wo-s2 wo-lgg"><span>LGG</span></div>
      <div class="wo-cell wo-s4 wo-date" data-field="date"><i>${v.dd}</i>/<i>${v.mm}</i>/<i>${v.yy}</i></div>
    </div>
    <div class="wo-row wo-h115">
      <div class="wo-cell wo-s1">AS TEAM :</div>
      <div class="wo-cell wo-field wo-s1" data-field="team1"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team2"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team3"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team4"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team5"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team6"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team7"></div>
      <div class="wo-cell wo-field wo-s1" data-field="team8"></div>
    </div>
    <div class="wo-row wo-h115">
      <div class="wo-cell wo-s1">COMPANY :</div>
      <div class="wo-cell wo-field wo-s3" data-field="company">${esc(v.company)}</div>
      <div class="wo-cell wo-s2">AIRCRAFT TYPE :</div>
      <div class="wo-cell wo-field wo-s3" data-field="aircraft_type">${esc(v.acType)}</div>
    </div>
    <div class="wo-row wo-h115">
      <div class="wo-cell wo-s1">REGISTRATION :</div>
      <div class="wo-cell wo-field wo-s3" data-field="registration">${esc(v.reg)}</div>
      <div class="wo-cell wo-s2">FLIGHT NUMBER :</div>
      <div class="wo-cell wo-field wo-s3" data-field="flight_number">${esc(v.flight)}</div>
    </div>
    <div class="wo-row wo-hs1">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('A WASH')}" data-service="A WASH">A WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('WET WHEELS')}" data-service="WET WHEELS">WET WHEELS</div>
      <div class="wo-cell wo-svc wo-sv${sel('BELLY WASH')}" data-service="BELLY WASH">BELLY WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('GEAR WASH TECH')}" data-service="GEAR WASH TECH">GEAR WASH TECH</div>
      <div class="wo-cell wo-svc wo-sv${sel('GEAR WASH COMM')}" data-service="GEAR WASH COMM">GEAR WASH COMM</div>
    </div>
    <div class="wo-row wo-hs2">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('FULL WET WASH')}" data-service="FULL WET WASH">FULL WET WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('HORSE STALL')}" data-service="HORSE STALL">HORSE STALL</div>
      <div class="wo-cell wo-svc wo-sv${sel('HORSE STALL BUILD')}" data-service="HORSE STALL BUILD">HORSE STALL BUILD</div>
      <div class="wo-cell wo-svc wo-sv${sel('HORSE STALL')}" data-service="HORSE STALL">HORSE STALL</div>
      <div class="wo-cell wo-svc wo-sv${sel('OFFICE CLEANING')}" data-service="OFFICE CLEANING">OFFICE CLEANING</div>
    </div>
    <div class="wo-row wo-hs3">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('APU WASH')}" data-service="APU WASH">APU WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('FLAPS WASH')}" data-service="FLAPS WASH">FLAPS WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('WINDSHIELD WASH')}" data-service="WINDSHIELD WASH">WINDSHIELD WASH</div>
      <div class="wo-cell wo-svc wo-sv${sel('CARGO DECK CL')}" data-service="CARGO DECK CL">CARGO DECK CL</div>
      <div class="wo-cell wo-svc wo-sv${sel('CARGO HOLDS CL')}" data-service="CARGO HOLDS CL">CARGO HOLDS CL</div>
    </div>
    <div class="wo-row wo-hs4">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('INTERIOR DEEP')}" data-service="INTERIOR DEEP">INTERIOR DEEP</div>
      <div class="wo-cell wo-svc wo-sv${sel('FULL TRANSIT SERVICE')}" data-service="FULL TRANSIT SERVICE">FULL TRANSIT SERVICE</div>
      <div class="wo-cell wo-svc wo-sv${sel('TRANSIT SERVICE')}" data-service="TRANSIT SERVICE">TRANSIT SERVICE</div>
      <div class="wo-cell wo-svc wo-sv${sel('WATER SERVICE')}" data-service="WATER SERVICE">WATER SERVICE</div>
      <div class="wo-cell wo-svc wo-sv${sel('LAVATORY SERVICE')}" data-service="LAVATORY SERVICE">LAVATORY SERVICE</div>
    </div>
    <div class="wo-row wo-hs5">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('DISINFECTION')}" data-service="DISINFECTION">DISINFECTION</div>
      <div class="wo-cell wo-svc wo-sv${sel('LAUNDRY')}" data-service="LAUNDRY">LAUNDRY</div>
      <div class="wo-cell wo-svc wo-sv${sel('CATERING')}" data-service="CATERING">CATERING</div>
      <div class="wo-cell wo-svc wo-sv${sel('PRODUCT DELIVERY')}" data-service="PRODUCT DELIVERY">PRODUCT DELIVERY</div>
      <div class="wo-cell wo-svc wo-sv${sel('PMR')}" data-service="PMR">PMR</div>
    </div>
    <div class="wo-row wo-hs6">
      <div class="wo-cell wo-svc wo-sv wo-first${sel('HANDLING')}" data-service="HANDLING">HANDLING</div>
      <div class="wo-cell wo-svc wo-sv${sel('PUSH BACK')}" data-service="PUSH BACK">PUSH BACK</div>
      <div class="wo-cell wo-svc wo-sv${sel('HEADSET')}" data-service="HEADSET">HEADSET</div>
      <div class="wo-cell wo-svc wo-sv${sel('TOWING')}" data-service="TOWING">TOWING</div>
      <div class="wo-cell wo-svc wo-sv${sel('RENTING')}" data-service="RENTING">RENTING</div>
    </div>
    <div class="wo-row wo-h10">
      <div class="wo-cell wo-svc wo-s1${sel('MAN HOUR')}" data-service="MAN HOUR">MAN HOUR</div>
      <div class="wo-cell wo-svc wo-s2${sel('CREW BUS')}" data-service="CREW BUS">CREW BUS</div>
      <div class="wo-cell wo-svc wo-s3${sel('SPECIAL REQUEST')}" data-service="SPECIAL REQUEST">SPECIAL REQUEST</div>
      <div class="wo-cell wo-svc wo-s3${sel('VIDANGE TOILETTE')}" data-service="VIDANGE TOILETTE">VIDANGE TOILETTE</div>
    </div>
    <div class="wo-row wo-h105">
      <div class="wo-cell wo-s1">WORK START TIME</div>
      <div class="wo-cell wo-field wo-s3" data-field="work_start_time"></div>
      <div class="wo-cell wo-s2">WORK END TIME</div>
      <div class="wo-cell wo-field wo-s3" data-field="work_end_time"></div>
    </div>
    <div class="wo-row wo-h8">
      <div class="wo-cell wo-field wo-s9" data-field="band"></div>
    </div>
    <div class="wo-row wo-h235">
      <div class="wo-cell wo-s3">COMMENT / EXPLANATION</div>
      <div class="wo-cell wo-field wo-top wo-s6" style="grid-column:span 6" data-field="comment"></div>
    </div>
    <div class="wo-row wo-h21">
      <div class="wo-cell wo-s3">SPECIAL REQUEST &nbsp;/ COMMENT</div>
      <div class="wo-cell wo-field wo-top" style="grid-column:span 6" data-field="special_request"></div>
    </div>
    <div class="wo-row wo-h15">
      <div class="wo-cell wo-s3">TEAM LEADER'S SIGNATURE</div>
      <div class="wo-cell wo-field" style="grid-column:span 6" data-field="team_leader_signature"></div>
    </div>
    <div class="wo-accept">
      <div class="wo-cell" style="grid-column:1; grid-row:1 / span 3">ACCEPTED BY</div>
      <div class="wo-cell" style="grid-column:2 / span 2; grid-row:1">NAME</div>
      <div class="wo-cell wo-field" style="grid-column:4 / span 3; grid-row:1" data-field="accepted_name"></div>
      <div class="wo-cell" style="grid-column:2 / span 2; grid-row:2">SIGNATURE</div>
      <div class="wo-cell wo-field" style="grid-column:4 / span 3; grid-row:2" data-field="accepted_signature"></div>
      <div class="wo-cell" style="grid-column:2 / span 2; grid-row:3">TIME</div>
      <div class="wo-cell wo-field" style="grid-column:4 / span 3; grid-row:3" data-field="accepted_time"></div>
      <div class="wo-cell" style="grid-column:7 / span 3; grid-row:1">REMARKS</div>
      <div class="wo-cell wo-field wo-top" style="grid-column:7 / span 3; grid-row:2 / span 2" data-field="remarks"></div>
    </div>
  </div>
</div>`;
}
function woBuildPage(item){
  const f=item.f,r=item.r;
  const iso=woArrivalDate(f);
  const m=(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return woPageHtml({
    dd:m?m[3]:'',mm:m?m[2]:'',yy:m?m[1].slice(2):'',
    reg:f.reg||'',flight:f.flight||'',acType:f.acType||'',
    company:r.company||'',tasks:r.tasks||[]
  });
}

function printWorkOrders(kind){
  const list=kind==='cat'?woListCatering():kind==='fedex'?woListFedex():woListOps();
  if(!list.length){alert('Aucun vol à imprimer pour ce Work Order.');return;}
  const box=document.getElementById('sheetWO');
  box.innerHTML=list.map(it=>'<div class="wo-wrap">'+woBuildPage(it)+'</div>').join('');
  const sheet=document.getElementById('sheet'),ops=document.getElementById('sheetOps');
  ops.classList.remove('do-print');
  sheet.classList.add('no-print');
  box.classList.add('do-print');
  let cleaned=false;
  const cleanup=()=>{
    if(cleaned)return;cleaned=true;
    sheet.classList.remove('no-print');box.classList.remove('do-print');
    window.onafterprint=null;
  };
  window.onafterprint=cleanup;
  setTimeout(()=>{window.print();setTimeout(cleanup,4000);},300);
}
