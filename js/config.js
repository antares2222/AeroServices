const S={shift:'NIGHT',arr:[],dep:[],excluded:[],fedex:[],allArr:[],allDep:[]};
let manType='arr', manHandler='';

// ── PARAMÈTRES (localStorage) ─────────────────────────────────────
const DEFAULT_PARAMS = {
  utcOffset:      2, // UTC+1 (hiver) ou UTC+2 (été) — Belgique
  swissport_cb:   ['TAY'],
  avia_cb:        ['ABB'],
  catering:       ['ETH','QTR','LHA'],
  wfs_ops_exclude:['SVA'],
  challenge_ops:  ['AAE','CHG','ABD','ICL'],
  swissport_ops:  ['GTI','TAY','YZR','LHA'],
  avia_ops:       ['ABB'],
  fedex_ac_types: ['B737','B738'],
  headset_default:[],
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

