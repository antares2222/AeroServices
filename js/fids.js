// ── FIDS API (via Cloudflare Worker — pas de CORS) ───────────────────
// Colle ici l'adresse de ton Worker (sans / final), ex : 'https://fids.moncompte.workers.dev'
const FIDS_PROXY='https://fids.robingraceffa.workers.dev';
const FIDS_ARR_URL=FIDS_PROXY?FIDS_PROXY+'/?type=arrivals':'/.netlify/functions/fids?type=arrivals';
const FIDS_DEP_URL=FIDS_PROXY?FIDS_PROXY+'/?type=departures':'/.netlify/functions/fids?type=departures';

function pad2(n){return String(n).padStart(2,'0');}
function hhmmFromDate(dt){return dt?pad2(dt.getHours())+':'+pad2(dt.getMinutes()):null;}

// Parse une string ISO UTC du FIDS ("2026-06-29T14:35:00") et applique le décalage UTC+1/+2
// configuré dans les paramètres pour obtenir l'heure locale belge.
function fidsIsoToLocalDate(isoStr){
  if(!isoStr)return null;
  const m=isoStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(!m)return null;
  const offset=(PARAMS&&PARAMS.utcOffset)||2;
  // On construit la date avec les valeurs UTC littérales, puis on ajoute le décalage en heures.
  const dt=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],0);
  dt.setHours(dt.getHours()+offset);
  return dt;
}

// Construit la fenêtre datetime [start,end) réelle du shift, ancrée sur la date sélectionnée dans l'app.
function shiftDateWindow(dateStr,shift){
  const[y,mo,d]=dateStr.split('-').map(Number);
  let start,end;
  if(shift==='EARLY'){
    start=new Date(y,mo-1,d,6,0,0);
    end=new Date(y,mo-1,d,14,0,0);
  }else if(shift==='LATE'){
    start=new Date(y,mo-1,d,14,0,0);
    end=new Date(y,mo-1,d,22,0,0);
  }else{ // NIGHT : 22h ce jour-là -> 06h le lendemain
    start=new Date(y,mo-1,d,22,0,0);
    end=new Date(y,mo-1,d+1,6,0,0);
  }
  return{start,end};
}

function inDateWindow(dt,win){
  if(!dt)return false;
  return dt>=win.start&&dt<win.end;
}

function setFidsStatus(msg,color){
  const el=document.getElementById('fidsStatus');
  if(el){el.innerHTML=msg;el.style.color=color||'#9aa0a6';}
}

// opts : {merge:true} = synchro (garde sélections, éditions, vols manuels) ;
//        {silent:true} = synchro automatique (pas de message de chargement, ni d'erreur bloquante) ;
//        {scroll:true} = défile vers la timeline après affichage
let _fidsLoading=false;
async function loadFromFids(opts){
  opts=opts||{};
  if(_fidsLoading)return;
  _fidsLoading=true;
  const btn=document.getElementById('fidsLoadBtn');
  const sbtn=document.getElementById('fidsSyncBtn');
  const hadData=(S.allArr.length+S.allDep.length)>0;
  try{
    if(!opts.silent){
      if(btn){btn.disabled=true;if(!opts.merge)btn.textContent='⏳ CHARGEMENT...';}
      if(sbtn){sbtn.disabled=true;if(opts.merge)sbtn.textContent='⏳ ...';}
      setFidsStatus('Chargement en cours...','#8ab4f8');
    }

    const [arrRes,depRes]=await Promise.all([
      fetch(FIDS_ARR_URL),
      fetch(FIDS_DEP_URL)
    ]);
    if(!arrRes.ok||!depRes.ok) throw new Error('Erreur serveur FIDS ('+arrRes.status+')');
    const [arrData,depData]=await Promise.all([arrRes.json(),depRes.json()]);

    const dateStr=document.getElementById('sDate').value;
    const arrWin=shiftDateWindow(dateStr,S.shift);
    const depWin=shiftDateWindow(dateStr,S.shift);

    const arrivals=[],departures=[],excluded=[],fedexArr=[],allArrivals=[],allDepartures=[],seen=new Set();

    // ── Arrivées ──
    for(const f of arrData){
      // Heure : priorité aTx (réel) sinon eTx (estimé) sinon sTx (planifié)
      const isoChosen=f.aTx||f.eTx||f.sTx;
      const dt=fidsIsoToLocalDate(isoChosen);
      if(!dt)continue;
      if(!inDateWindow(dt,arrWin))continue;
      const eta=hhmmFromDate(dt);
      const flight=(f.flightNumber||f.flightPax||'').toUpperCase().trim();
      if(!flight)continue;
      const key=flight+'_arr_'+isoChosen;
      if(seen.has(key))continue;
      seen.add(key);
      const handler=(f.handler||'').toUpperCase().trim();
      const reg=(f.aircraftRegistration||'').toUpperCase().trim();
      const stand=(f.stand||'').trim();
      const origin=(f.origin||'').toUpperCase();
      const acType=(f.aircraftType||'').toUpperCase().trim();
      // Tableau FedEx à part : uniquement les types d'avion configurés (par défaut B737/B738)
      if(handler==='FEDEX'&&(PARAMS.fedex_ac_types||[]).includes(acType)){
        fedexArr.push({_id:newId(),_k:'fx:'+flight,flight,reg,eta,stand,acType,handler,type:'arr',date:ymd(dt)});
      }
      const obj={_id:newId(),_k:'arr:'+flight,flight,reg,eta,time:eta,handler,stand,type:'arr',origin,acType,date:ymd(dt),fromFids:true};
      // Liste complète, indépendante des règles crew-bus — utilisée par Catering/Opération/Headset
      allArrivals.push({...obj});
      if(shouldInclude(flight,handler)){
        obj.wfsMode=isAero(handler)?'handling':null;
        arrivals.push(obj);
      } else if(canPropose(handler)){
        excluded.push(obj);
      }
    }

    // ── Départs ──
    for(const f of depData){
      const isoChosen=f.eTx||f.sTx;
      const etdDt=fidsIsoToLocalDate(isoChosen);
      if(!etdDt)continue;
      // pickup = ETD - 1h15, calculé sur l'objet Date complet (gère le passage de minuit)
      const pickupDt=new Date(etdDt.getTime()-75*60000);
      if(!inDateWindow(pickupDt,depWin))continue;
      const eta=hhmmFromDate(etdDt);
      const flight=(f.flightNumber||f.flightPax||'').toUpperCase().trim();
      if(!flight)continue;
      const key=flight+'_dep_'+isoChosen;
      if(seen.has(key))continue;
      seen.add(key);
      const handler=(f.handler||'').toUpperCase().trim();
      const reg=(f.aircraftRegistration||'').toUpperCase().trim();
      const stand=(f.stand||'').trim();
      const dest=(f.destination||'').toUpperCase();
      const pickupHHMM=pickupDt.toTimeString().slice(0,5);
      // Sélection HS par défaut : vols dont le n° correspond à un préfixe configuré dans les paramètres
      const hsDefault=isAero(handler)||(PARAMS.headset_default||[]).some(p=>flight.startsWith(p));
      const obj={_id:newId(),_k:'dep:'+flight,flight,reg,eta,time:pickupHHMM,handler,stand,type:'dep',dest,acType:(f.aircraftType||'').toUpperCase().trim(),date:ymd(etdDt),fromFids:true,hsMode:hsDefault?true:undefined};
      // Liste complète, indépendante des règles crew-bus — utilisée par Catering/Opération/Headset
      allDepartures.push({...obj});
      if(shouldInclude(flight,handler)){
        obj.wfsMode=isAero(handler)?'handling':null;
        departures.push(obj);
      } else if(canPropose(handler)){
        excluded.push(obj);
      }
    }

    const nw={arrivals,departures,excluded,fedexArr,allArrivals,allDepartures};
    const prev=opts.merge?snapshotState():null;
    if(prev)carryOver(prev,nw);
    S.arr=nw.arrivals; S.dep=nw.departures; S.excluded=nw.excluded; S.fedex=nw.fedexArr;
    S.allArr=nw.allArrivals; S.allDep=nw.allDepartures;
    const total=S.arr.length+S.dep.length;
    if(!total&&!(prev&&(S.excluded.length||S.allArr.length||S.allDep.length))){
      setFidsStatus(`⚠ Aucun vol trouvé pour le ${dateStr} — shift ${S.shift}`,'#fdd663');
      return;
    }

    const now=new Date();
    setFidsStatus(`✓ FIDS — ${S.arr.length} ARR · ${S.dep.length} DEP · ${dateStr} · shift ${S.shift} · synchro ${pad2(now.getHours())}:${pad2(now.getMinutes())}`,'#81c995');
    renderTimeline();
    renderPreview();
    buildOps(prev);
    if(opts.scroll){
      setTimeout(()=>{
        const tl=document.getElementById('tlSection');
        if(tl)tl.scrollIntoView({behavior:'smooth',block:'start'});
      },100);
    }

  }catch(e){
    console.error('FIDS load error:',e);
    if(opts.silent&&hadData){
      const n=new Date();
      setFidsStatus(`⚠ Synchro impossible (${pad2(n.getHours())}:${pad2(n.getMinutes())}) — données conservées`,'#fdd663');
      return;
    }
    const isCors=e.message&&(e.message.includes('Failed to fetch')||e.message.includes('NetworkError')||e.message.includes('CORS'));
    if(isCors){
      setFidsStatus('❌ Connexion réseau impossible — réessaie','#f28b82');
    } else {
      setFidsStatus('❌ '+( e.message||'Erreur connexion FIDS'),'#f28b82');
    }
  }finally{
    _fidsLoading=false;
    if(btn){btn.disabled=false;btn.textContent='📡 AFFICHER';}
    if(sbtn){sbtn.disabled=false;sbtn.textContent='🔄 SYNCHR';}
  }
}

