const S={shift:'NIGHT',arr:[],dep:[],excluded:[],fedex:[],allArr:[],allDep:[]};

// ── PARAMÈTRES (localStorage) ─────────────────────────────────────
const DEFAULT_PARAMS = {
  utcOffset:      1, // UTC+1 (défaut) ou UTC+2 (été) — Belgique
  swissport_cb:   ['TAY'],
  avia_cb:        ['ABB'],
  catering:       ['ETH','QTR','LHA'],
  wfs_ops_exclude:['SVA'],
  challenge_ops:  ['AAE','CHG','ABD','ICL'],
  swissport_ops:  ['GTI','TAY','YZR','LHA'],
  avia_ops:       ['ABB'],
  fedex_ac_types: ['B737','B738'],
  headset_default:[],
  // ── Work Order ──
  wo_companies:[
    {name:'ANA',regs:['TFAMU','TFAKG','TFAMM','9HAKA'],prefixes:[]},
    {name:'MAGMA',regs:['TFAMN','TFAMP','9HFLM'],prefixes:[]},
    {name:'AIR CHINA',regs:[],prefixes:['CAO']},
    {name:'ATLAS',regs:[],prefixes:['GTI']},
    {name:'ABB',regs:[],prefixes:['CB']},
    {name:'CHALLENGE AIR CARGO',regs:['9HCAH','9HCAC','9HCAY','9HCAZ'],prefixes:[]},
    {name:'CAL',regs:['4XICK','4XIAB'],prefixes:[]},
    {name:'ACE',regs:['OELRI','OOACE','OOACF'],prefixes:[]},
    {name:'ASL',regs:[],prefixes:['TAY']},
  ],
  // def = tâches par défaut · handling = tâches si « Handling » coché (vide = HANDLING seul) · types = exceptions par type d'avion
  wo_tasks:{
    'ANA':{def:['FULL TRANSIT SERVICE','DISINFECTION','LAUNDRY'],handling:['HANDLING','DISINFECTION','LAUNDRY'],types:{}},
    'MAGMA':{def:['FULL TRANSIT SERVICE','DISINFECTION','LAUNDRY'],handling:['HANDLING','DISINFECTION','LAUNDRY'],types:{}},
    'ATLAS':{def:['FULL TRANSIT SERVICE','LAUNDRY'],handling:[],types:{}},
    'ASL':{def:[],handling:[],types:{'B747':['FULL TRANSIT SERVICE'],'B738':['FULL TRANSIT SERVICE'],'B734':['TRANSIT SERVICE','LAVATORY SERVICE']}},
    'WFS':{def:['FULL TRANSIT SERVICE'],handling:[],types:{}},
  },
  wo_handler_company:{WFS:'WFS',CHH:'LACHS',SWP:'SWP',FEDEX:'ASL'},
  wo_catering_company:{QTR:'QTR',ETH:'ETH',CB:'ABB'},
  wo_catering_default:"TRAVEL'IN",
};

function loadParams(){
  try{
    const saved=localStorage.getItem('crewbus_params');
    if(saved) return Object.assign(JSON.parse(JSON.stringify(DEFAULT_PARAMS)),JSON.parse(saved));
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_PARAMS));
}
function saveParamsToStorage(p){
  try{localStorage.setItem('crewbus_params',JSON.stringify(p));}catch(e){}
  pushParams();
}

// ── Stockage partagé (Worker Cloudflare + KV) ─────────────────────
// Le serveur est la référence : au démarrage on lit les paramètres du serveur ; chaque sauvegarde
// (session déverrouillée avec le mot de passe) les renvoie au serveur. localStorage = copie de secours.
let _pushTimer=null,_remoteEmpty=false;
function cloudUrl(q){return(typeof FIDS_PROXY!=='undefined'&&FIDS_PROXY)?FIDS_PROXY+'/?'+q:'';}
function setCloudState(state,msg){
  const el=document.getElementById('cloudStatus');
  if(el){el.textContent=msg;el.dataset.state=state;}
}
function cloudStatusIdle(){
  if(!cloudUrl('x'))return setCloudState('off','Paramètres enregistrés sur cet appareil uniquement.');
  if(sessionStorage.getItem('crewbus_settings_pwd'))return setCloudState('ok','☁ Paramètres partagés : synchronisés avec le serveur.');
  setCloudState('off','☁ Serveur non vérifié : paramètres lus du serveur, enregistrés sur cet appareil uniquement.');
}
function pushParams(){
  const url=cloudUrl('params=1'),pwd=sessionStorage.getItem('crewbus_settings_pwd');
  if(!url||!pwd)return;
  clearTimeout(_pushTimer);
  _pushTimer=setTimeout(async()=>{
    try{
      const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Settings-Password':pwd},body:JSON.stringify(PARAMS)});
      if(r.ok){_remoteEmpty=false;setCloudState('ok','☁ Enregistré sur le serveur.');}
      else setCloudState('err','☁ Échec de l\u2019enregistrement sur le serveur ('+r.status+'). Enregistré sur cet appareil.');
    }catch(e){setCloudState('err','☁ Serveur injoignable : enregistré sur cet appareil seulement.');}
  },600);
}
async function pullParams(){
  const url=cloudUrl('params=1');
  if(!url)return;
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),2500);
    const r=await fetch(url,{cache:'no-store',signal:ctl.signal});
    clearTimeout(t);
    if(!r.ok)return;
    const remote=await r.json();
    if(remote&&typeof remote==='object'){
      PARAMS=Object.assign(JSON.parse(JSON.stringify(DEFAULT_PARAMS)),remote);
      try{localStorage.setItem('crewbus_params',JSON.stringify(PARAMS));}catch(e){}
      _remoteEmpty=false;
    }else _remoteEmpty=true;   // serveur vide : on enverra les paramètres de cet appareil à l'ouverture des réglages
  }catch(e){}
}

let PARAMS = loadParams();

