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
}

let PARAMS = loadParams();

