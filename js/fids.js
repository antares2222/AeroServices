// ── FIDS API (via fonction Netlify — pas de CORS) ─────────────────────
const FIDS_ARR_URL='/.netlify/functions/fids?type=arrivals';
const FIDS_DEP_URL='/.netlify/functions/fids?type=departures';

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
  if(el){el.innerHTML=msg;el.style.color=color||'#6b7280';}
}

async function loadFromFids(){
  const btn=document.getElementById('fidsLoadBtn');
  try{
    if(btn){btn.disabled=true;btn.textContent='⏳ CONNEXION AU FIDS...';}
    setFidsStatus('Chargement en cours...','#e8b84b');

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
        fedexArr.push({_id:newId(),flight,reg,eta,stand,acType});
      }
      const obj={_id:newId(),flight,reg,eta,time:eta,handler,stand,type:'arr',origin,fromFids:true};
      // Liste complète, indépendante des règles crew-bus — utilisée par Catering/Opération/Headset
      allArrivals.push({...obj});
      if(shouldInclude(flight,handler)){
        obj.wfsMode=handler==='WFS'?'handling':null;
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
      const hsDefault=(PARAMS.headset_default||[]).some(p=>flight.startsWith(p));
      const obj={_id:newId(),flight,reg,eta,time:pickupHHMM,handler,stand,type:'dep',dest,fromFids:true,hsMode:hsDefault?true:undefined};
      // Liste complète, indépendante des règles crew-bus — utilisée par Catering/Opération/Headset
      allDepartures.push({...obj});
      if(shouldInclude(flight,handler)){
        obj.wfsMode=handler==='WFS'?'handling':null;
        departures.push(obj);
      } else if(canPropose(handler)){
        excluded.push(obj);
      }
    }

    S.arr=arrivals; S.dep=departures; S.excluded=excluded; S.fedex=fedexArr;
    S.allArr=allArrivals; S.allDep=allDepartures;
    const total=arrivals.length+departures.length;
    if(!total){
      setFidsStatus(`⚠ Aucun vol trouvé pour le ${dateStr} — shift ${S.shift}`,'#f59e0b');
      return;
    }

    setFidsStatus(`✓ FIDS — ${arrivals.length} ARR · ${departures.length} DEP · ${dateStr} · shift ${S.shift}`,'#4be8a0');
    renderTimeline();
    renderPreview();
    buildOps();
    setTimeout(()=>{
      const tl=document.getElementById('tlSection');
      if(tl)tl.scrollIntoView({behavior:'smooth',block:'start'});
    },100);

  }catch(e){
    console.error('FIDS load error:',e);
    const isCors=e.message&&(e.message.includes('Failed to fetch')||e.message.includes('NetworkError')||e.message.includes('CORS'));
    if(isCors){
      setFidsStatus('❌ Connexion réseau impossible — réessaie','#ef4444');
    } else {
      setFidsStatus('❌ '+( e.message||'Erreur connexion FIDS'),'#ef4444');
    }
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🔄 CHARGER DEPUIS FIDS LGG';}
  }
}

