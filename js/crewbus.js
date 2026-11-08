// ── Ajouter un vol exclu ─────────────────────────────────────────
function addFromExcluded(flight){
  const idx=S.excluded.findIndex(f=>f.flight===flight);
  if(idx===-1)return;
  const f=S.excluded.splice(idx,1)[0];
  f.wfsMode=isAero(f.handler)?'handling':null;
  if(f.type==='dep')S.dep.push(f);else S.arr.push(f);
  renderPreview();
}

// ── Supprimer un vol sélectionné ─────────────────────────────────
function removeVol(flight){
  const fi=S.arr.findIndex(f=>f.flight===flight);
  const fd=S.dep.findIndex(f=>f.flight===flight);
  if(fi!==-1){const f=S.arr.splice(fi,1)[0];S.excluded.push(f);}
  if(fd!==-1){const f=S.dep.splice(fd,1)[0];S.excluded.push(f);}
  renderPreview();
}

// ── Éditer registration / stand ──────────────────────────────────
// ── WFS mode ─────────────────────────────────────────────────────
function toggleCollapse(panelId,chevId){
  const p=document.getElementById(panelId);
  const c=document.getElementById(chevId);
  const open=p.style.display==='none';
  p.style.display=open?'block':'none';
  c.style.transform=open?'rotate(180deg)':'rotate(0deg)';
}

function setHs(flight,val){
  [...S.arr,...S.dep,...S.excluded,...(S.allArr||[]),...(S.allDep||[])].forEach(f=>{
    if(f.flight===flight) f.hsMode=val;
  });
  renderPreview();
}
// Bouton « Handling aero » : bascule le vol en handling sur la feuille crew-bus
function toggleHandling(flight,type){
  [...S.arr,...S.dep].forEach(f=>{if(f.flight===flight&&f.type===type)f.wfsMode=f.wfsMode==='handling'?null:'handling';});
  renderPreview();
}

// ── Ajout manuel compact (ARR ou DEP) — même affichage que Opération ──
function addManual(type){
  const p=type==='dep'?'manD':'manA';
  const timeEl=document.getElementById(p+'Time'),regEl=document.getElementById(p+'Reg'),
        fltEl=document.getElementById(p+'Flight'),hdEl=document.getElementById(p+'Hand');
  const flight=fltEl.value.toUpperCase().trim();
  const eta=timeEl.value.trim();
  const reg=regEl.value.toUpperCase().trim();
  if(!flight||!/^\d{1,2}:\d{2}$/.test(eta)){alert('Renseigne au minimum le numéro de vol et une heure valide (HH:MM).');return;}
  const list=type==='dep'?S.dep:S.arr;
  if(list.some(f=>f.flight===flight)){alert('Ce vol est déjà dans la liste.');return;}
  const time=type==='dep'?pickup(eta):eta;
  list.push({_id:newId(),_k:type+':'+flight,flight,reg,eta,time,handler:'',stand:'',type,wfsMode:hdEl.checked?'handling':null,manual:true});
  timeEl.value='';regEl.value='';fltEl.value='';hdEl.checked=false;
  renderPreview();
}

// ── Render preview ────────────────────────────────────────────────
function renderPreview(){
  document.getElementById('cA').textContent=S.arr.length;
  document.getElementById('cD').textContent=S.dep.length;
  let hArr='',hDep='';

  // Arrivées
  const sortedArr=S.arr.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  if(sortedArr.length){
    hArr+=`<div class="grp a">✈ ARRIVÉES (${sortedArr.length})</div>`;
    sortedArr.forEach(f=>{
      hArr+=`<div class="fi a">
        <div class="fi-top">
          <div class="fi-t">${edInp(f,'eta','HH:MM',64,'ed-t')}</div>
          <div class="fi-b">
            <div class="fi-f">${edInp(f,'flight','Vol',96,'ed-f')}${f.manual?' <span style="font-size:9px;color:#ab71ff">✋</span>':''}</div>
            <div class="fi-r">
              <input type="text" value="${f.reg||''}" placeholder="Registration" onchange="editFlight('${f._id}','reg',this.value)" style="width:90px;font-size:11px;padding:3px 6px;margin-right:4px;display:inline-block">
              <input type="text" value="${f.stand||''}" placeholder="Stand" onchange="editFlight('${f._id}','stand',this.value)" style="width:60px;font-size:11px;padding:3px 6px;display:inline-block">
              <span style="color:#a1a0ad;font-size:10px;margin-left:4px">${f.handler}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <div class="fi-bx a">ARR</div>
            <button class="rm-btn" onclick="removeVol('${f.flight}')">✕</button>
          </div>
        </div>
        ${canHandling(f)?`<div class="wfs-toggle"><button class="wfs-btn ${f.wfsMode==='handling'?'sel-hand':''}" onclick="toggleHandling('${f.flight}','${f.type}')">✈️ Handling aero</button></div>`:''}
      </div>`;
    });
  }
  if(!hArr)hArr=`<div style="color:#a1a0ad;text-align:center;padding:20px;font-size:13px">Aucune arrivée</div>`;
  document.getElementById('prevArr').innerHTML=hArr;

  // Départs
  const sortedDep=S.dep.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  if(sortedDep.length){
    hDep+=`<div class="grp d">✈ DÉPARTS — pick up = ETD-1h15 (${sortedDep.length})</div>`;
    sortedDep.forEach(f=>{
      const isSwp=f.handler.toUpperCase()==='SWISSPORT';
      const showHs=f.handler.toUpperCase()==='WFS'||isSwp;
      hDep+=`<div class="fi d">
        <div class="fi-top">
          <div class="fi-t">${f.time}<div class="fi-etd">ETD ${edInp(f,'eta','HH:MM',56,'ed-t ed-s')}</div></div>
          <div class="fi-b">
            <div class="fi-f">${edInp(f,'flight','Vol',96,'ed-f')}${f.manual?' <span style="font-size:9px;color:#ab71ff">✋</span>':''}</div>
            <div class="fi-r">
              <input type="text" value="${f.reg||''}" placeholder="Registration" onchange="editFlight('${f._id}','reg',this.value)" style="width:90px;font-size:11px;padding:3px 6px;margin-right:4px;display:inline-block">
              <input type="text" value="${f.stand||''}" placeholder="Stand" onchange="editFlight('${f._id}','stand',this.value)" style="width:60px;font-size:11px;padding:3px 6px;display:inline-block">
              <span style="color:#a1a0ad;font-size:10px;margin-left:4px">${f.handler}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <div class="fi-bx d">DEP</div>
            <button class="rm-btn" onclick="removeVol('${f.flight}')">✕</button>
          </div>
        </div>
        ${canHandling(f)?`<div class="wfs-toggle"><button class="wfs-btn ${f.wfsMode==='handling'?'sel-hand':''}" onclick="toggleHandling('${f.flight}','${f.type}')">✈️ Handling aero</button></div>`:''}
      </div>`;
    });
  }
  if(!hDep)hDep=`<div style="color:#a1a0ad;text-align:center;padding:20px;font-size:13px">Aucun départ</div>`;
  document.getElementById('prevDep').innerHTML=hDep;

  // Vols exclus proposables
  const excCard=document.getElementById('cardExcluded');
  document.getElementById('cEx').textContent=S.excluded.length;
  if(S.excluded.length>0){
    excCard.style.display='block';
    let ex='';
    S.excluded.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time)).forEach(f=>{
      const badge=f.type==='arr'?'<span class="fi-bx a" style="font-size:9px">ARR</span>':'<span class="fi-bx d" style="font-size:9px">DEP</span>';
      ex+=`<div class="fi ex">
        <div class="fi-top">
          <div class="fi-t" style="font-size:17px">${f.time}</div>
          <div class="fi-b">
            <div class="fi-f" style="font-size:12px">${f.flight}</div>
            <div class="fi-r">${f.reg||'—'} · ${f.handler||'—'}${f.stand?' · '+f.stand:''}</div>
          </div>
          ${badge}
          <button class="add-btn" onclick="addFromExcluded('${f.flight}')">+ AJOUTER</button>
        </div>
      </div>`;
    });
    document.getElementById('prevEx').innerHTML=ex;
  } else {
    excCard.style.display='none';
  }

  // ── Liste Headset : TOUS les DEP dans la fenêtre horaire, tous handlers confondus ──
  // Indépendant des règles de filtrage crew-bus (S.dep/S.excluded)
  const allDepForHs=(S.allDep||[]).slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  const hsSelected=allDepForHs.filter(f=>f.hsMode===true);
  document.getElementById('cHs').textContent=hsSelected.length;

  // Liste persistante des vols cochés (toujours visible)
  let hsHtml='';
  hsSelected.forEach(f=>{
    hsHtml+=`<div class="fi" style="border-left:3px solid #54ffbd;background:rgba(84,255,189,.06);margin-bottom:5px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:18px;color:#ab71ff">${f.eta}<div class="fi-etd">ETD</div></div>
        <div class="fi-b">
          <div class="fi-f" style="font-size:12px">${f.flight}</div>
          <div class="fi-r">${f.reg||'—'} · ${f.handler||'—'}${f.stand?' · Stand '+f.stand:''}</div>
        </div>
        <button class="rm-btn" onclick="setHs('${f.flight}',false)">✕</button>
      </div>
    </div>`;
  });
  if(!hsHtml)hsHtml=`<div style="color:#a1a0ad;font-size:12px;text-align:center;padding:10px">Aucun vol sélectionné</div>`;
  document.getElementById('hsList').innerHTML=hsHtml;

  // Panneau complet + AJOUTER/SUPPRIMER (tous les DEP dispo, avec bouton toggle)
  let hsAllHtml='';
  if(allDepForHs.length===0){
    hsAllHtml=`<div style="color:#a1a0ad;font-size:12px;text-align:center;padding:10px">Aucun vol DEP disponible</div>`;
  } else {
    allDepForHs.forEach(f=>{
      const sel=f.hsMode===true;
      hsAllHtml+=`<div class="fi" style="border-left:3px solid ${sel?'#54ffbd':'#42414d'};background:${sel?'rgba(84,255,189,.06)':'#23222a'};margin-bottom:5px">
        <div class="fi-top">
          <div class="fi-t" style="font-size:18px;color:#ab71ff">${f.eta}<div class="fi-etd">ETD</div></div>
          <div class="fi-b">
            <div class="fi-f" style="font-size:12px">${f.flight}</div>
            <div class="fi-r">${f.reg||'—'} · ${f.handler||'—'}${f.stand?' · Stand '+f.stand:''}</div>
          </div>
          <button class="wfs-btn ${sel?'sel-hand':''}" onclick="setHs('${f.flight}',${sel?'false':'true'})" style="white-space:nowrap">
            🎧 ${sel?'Retiré ✓':'Ajouter'}
          </button>
        </div>
      </div>`;
    });
  }
  document.getElementById('hsAllList').innerHTML=hsAllHtml;
}

// ── Generate PDF ──────────────────────────────────────────────────
function genPDF(){
  // Sécurité : s'assure que la feuille OPS n'est pas restée affichée (bug iOS Safari)
  document.getElementById('sheet').classList.remove('no-print');
  document.getElementById('sheetOps').classList.remove('do-print');
  const dateVal=document.getElementById('sDate').value;
  const dl=dateVal?dateVal.split('-').reverse().join('/'):'—';
  document.getElementById('sh-date').textContent='Crew bus service   '+dl+'   '+S.shift;
  document.getElementById('sh-shift').innerHTML='';
  let rows='';
  const sortedArrPdf=S.arr.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  const sortedDepPdf=S.dep.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  sortedArrPdf.forEach(f=>{
    rows+=`<tr>
      <td class="col-reg font-lg">${f.reg||''}</td>
      <td class="col-flt font-lg">${f.flight}</td>
      <td class="col-arr"><span class="badge-arr">ARR</span></td>
      <td class="col-pup">Pick up</td>
      <td class="col-time font-lg">${f.time}</td>
      <td class="col-note">${isAero(f.handler)?'HANDLING AERO ARR':''}</td>
      <td class="col-stand">${f.stand||''}</td>
    </tr>`;
  });
  // Ligne vide de séparation entre arrivées et départs
  if(S.arr.length&&S.dep.length){rows+=`<tr class="per"><td></td><td></td><td class="col-arr">ARR</td><td class="col-pup">Pick up</td><td></td><td></td><td></td></tr>`;}
  sortedDepPdf.forEach(f=>{
    rows+=`<tr>
      <td class="col-reg font-lg">${f.reg||''}</td>
      <td class="col-flt font-lg">${f.flight}</td>
      <td class="col-arr">ARR</td>
      <td class="col-pup"><span class="badge-pup">Pick up</span></td>
      <td class="col-time font-lg">${f.time}</td>
      <td class="col-note">${isAero(f.handler)?'HANDLING AERO DEP':''}</td>
      <td class="col-stand">${f.stand||''}</td>
    </tr>`;
  });
  const sep=(S.arr.length&&S.dep.length)?1:0;
  const dataRows=S.arr.length+S.dep.length+sep;
  // 19 lignes minimum, s'étend si plus de vols
  const totalFit=Math.max(19,dataRows);
  const emptyCount=Math.max(0,totalFit-dataRows);
  for(let i=0;i<emptyCount;i++){rows+=`<tr class="per"><td></td><td></td><td class="col-arr">ARR</td><td class="col-pup">Pick up</td><td></td><td></td><td></td></tr>`;}
  document.getElementById('sh-rows').innerHTML=rows;
  // Vols HS : tous DEP avec hsMode=true (tous handlers confondus, indépendant du crew-bus)
  const allDepForHs=(S.allDep||[]).slice().sort((a,b)=>chronoKey(a.eta)-chronoKey(b.eta));
  const hsFlights=allDepForHs.filter(f=>f.hsMode===true);
  const rentingFlights=[...S.arr,...S.dep].filter(f=>f.handler.toUpperCase()==='WFS'&&f.wfsMode==='renting');
  // Dédupliquer renting : une seule entrée par registration ET par numéro de vol
  const rentingSeen=new Set();
  const rentingDedup=rentingFlights.filter(f=>{
    const keyReg=f.reg?'reg:'+f.reg:'';
    const keyFlt='flt:'+f.flight;
    if(keyReg&&rentingSeen.has(keyReg))return false;
    if(rentingSeen.has(keyFlt))return false;
    if(keyReg)rentingSeen.add(keyReg);
    rentingSeen.add(keyFlt);
    return true;
  });
  const handlingFlights=[...S.arr,...S.dep].filter(f=>f.wfsMode==='handling');
  const handlingMap={};
  handlingFlights.forEach(f=>{const key=f.reg||f.flight;if(!handlingMap[key])handlingMap[key]={reg:f.reg,arr:null,dep:null,flights:[]};handlingMap[key].flights.push(f);if(f.type==='arr')handlingMap[key].arr=f;else handlingMap[key].dep=f;});
  const handlingGroups=Object.values(handlingMap);
  let bottomRows='';
  const nBottom=Math.max(4,hsFlights.length,handlingGroups.length,rentingDedup.length);
  for(let i=0;i<nBottom;i++){
    const hs=hsFlights[i]||null;
    const h=handlingGroups[i]||null;
    const r=rentingDedup[i]||null;
    const hReg=h?h.flights[0].reg||'':'';
    const hFlt=h?(h.arr?h.arr.flight:(h.dep?h.dep.flight:'')):'';
    const hArr=h&&h.arr?h.arr.eta:'';
    const hDep=h&&h.dep?h.dep.eta:'';
    const rentReg=r?r.reg||r.flight:'';
    const hsReg=hs?hs.reg||'':'';
    const hsFlt=hs?hs.flight:'';
    const hsDep=hs?hs.eta:'';
    bottomRows+=`<tr>
      <td>${hsReg}</td><td>${hsFlt}</td><td style="border-right:4pt solid black">${hsDep}</td>
      <td>${hReg}</td><td>${hFlt}</td>
      <td>${hArr}</td>
      <td style="border-right:4pt solid black">${hDep}</td>
      <td>${rentReg}</td>
    </tr>`;
  }
  document.getElementById('sh-bottom-rows').innerHTML=bottomRows;
  setTimeout(()=>window.print(),50);
}

