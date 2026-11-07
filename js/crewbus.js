// ── Ajouter un vol exclu ─────────────────────────────────────────
function addFromExcluded(flight){
  const idx=S.excluded.findIndex(f=>f.flight===flight);
  if(idx===-1)return;
  const f=S.excluded.splice(idx,1)[0];
  f.wfsMode=f.handler.toUpperCase()==='WFS'?'handling':null;
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
function editField(flight,field,val){
  [...S.arr,...S.dep].forEach(f=>{if(f.flight===flight)f[field]=val.toUpperCase().trim();});
}

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
function setWfs(flight,mode){[...S.arr,...S.dep].forEach(f=>{if(f.flight===flight)f.wfsMode=mode;});renderPreview();}

// ── Ajout manuel ─────────────────────────────────────────────────
function setManType(t){
  manType=t;
  document.getElementById('manTypeA').className='tbtn'+(t==='arr'?' sel-a':'');
  document.getElementById('manTypeD').className='tbtn'+(t==='dep'?' sel-d':'');
}
function setManHandler(h){
  manHandler=h;
  ['WFS','CHAL','SWP'].forEach(id=>document.getElementById('h'+id).classList.remove('sel-hand'));
  const map={WFS:'hWFS',CHALLENGE:'hCHAL',SWISSPORT:'hSWP'};
  if(map[h])document.getElementById(map[h]).classList.add('sel-hand');
}
function addManual(){
  const flight=document.getElementById('manFlight').value.toUpperCase().trim();
  const timeRaw=document.getElementById('manTime').value.trim();
  const reg=document.getElementById('manReg').value.toUpperCase().trim();
  const stand=document.getElementById('manStand').value.trim();
  if(!flight){alert('Numéro de vol obligatoire.');return;}
  if(!timeRaw||!/^\d{1,2}:\d{2}$/.test(timeRaw)){alert('Heure invalide (format HH:MM).');return;}
  if([...S.arr,...S.dep].some(f=>f.flight===flight)){alert('Ce vol est déjà dans la liste.');return;}
  const eta=timeRaw;
  const time=manType==='dep'?pickup(eta):eta;
  const wfsMode=manHandler==='WFS'?'handling':null;
  const obj={flight,reg,eta,time,handler:manHandler,stand,type:manType,wfsMode,manual:true};
  if(manType==='dep')S.dep.push(obj);else S.arr.push(obj);
  // Reset form
  document.getElementById('manFlight').value='';
  document.getElementById('manTime').value='';
  document.getElementById('manReg').value='';
  document.getElementById('manStand').value='';
  manHandler='';
  ['hWFS','hCHAL','hSWP'].forEach(id=>document.getElementById(id).classList.remove('sel-hand'));
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
      const isWfs=f.handler.toUpperCase()==='WFS';
      hArr+=`<div class="fi a">
        <div class="fi-top">
          <div class="fi-t">${f.time}</div>
          <div class="fi-b">
            <div class="fi-f">${f.flight}${f.manual?' <span style="font-size:9px;color:#e8b84b">✋</span>':''}</div>
            <div class="fi-r">
              <input type="text" value="${f.reg||''}" placeholder="Registration" onchange="editField('${f.flight}','reg',this.value)" style="width:90px;font-size:11px;padding:3px 6px;margin-right:4px;display:inline-block">
              <input type="text" value="${f.stand||''}" placeholder="Stand" onchange="editField('${f.flight}','stand',this.value)" style="width:60px;font-size:11px;padding:3px 6px;display:inline-block">
              <span style="color:#6b7280;font-size:10px;margin-left:4px">${f.handler}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <div class="fi-bx a">ARR</div>
            <button class="rm-btn" onclick="removeVol('${f.flight}')">✕</button>
          </div>
        </div>
        ${isWfs?`<div class="wfs-toggle"><button class="wfs-btn ${f.wfsMode==='renting'?'sel-rent':''}" onclick="setWfs('${f.flight}','renting')">🚙 Renting</button><button class="wfs-btn ${f.wfsMode==='handling'?'sel-hand':''}" onclick="setWfs('${f.flight}','handling')">✈️ Handling</button></div>`:''}
      </div>`;
    });
  }
  if(!hArr)hArr=`<div style="color:#6b7280;text-align:center;padding:20px;font-size:13px">Aucune arrivée</div>`;
  document.getElementById('prevArr').innerHTML=hArr;

  // Départs
  const sortedDep=S.dep.slice().sort((a,b)=>chronoKey(a.time)-chronoKey(b.time));
  if(sortedDep.length){
    hDep+=`<div class="grp d">✈ DÉPARTS — pick up = ETD-1h15 (${sortedDep.length})</div>`;
    sortedDep.forEach(f=>{
      const isWfs=f.handler.toUpperCase()==='WFS';
      const isSwp=f.handler.toUpperCase()==='SWISSPORT';
      const showHs=isWfs||isSwp;
      hDep+=`<div class="fi d">
        <div class="fi-top">
          <div class="fi-t">${f.time}<div class="fi-etd">ETD ${f.eta}</div></div>
          <div class="fi-b">
            <div class="fi-f">${f.flight}${f.manual?' <span style="font-size:9px;color:#e8b84b">✋</span>':''}</div>
            <div class="fi-r">
              <input type="text" value="${f.reg||''}" placeholder="Registration" onchange="editField('${f.flight}','reg',this.value)" style="width:90px;font-size:11px;padding:3px 6px;margin-right:4px;display:inline-block">
              <input type="text" value="${f.stand||''}" placeholder="Stand" onchange="editField('${f.flight}','stand',this.value)" style="width:60px;font-size:11px;padding:3px 6px;display:inline-block">
              <span style="color:#6b7280;font-size:10px;margin-left:4px">${f.handler}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <div class="fi-bx d">DEP</div>
            <button class="rm-btn" onclick="removeVol('${f.flight}')">✕</button>
          </div>
        </div>
        ${isWfs?`<div class="wfs-toggle"><button class="wfs-btn ${f.wfsMode==='renting'?'sel-rent':''}" onclick="setWfs('${f.flight}','renting')">🚙 Renting</button><button class="wfs-btn ${f.wfsMode==='handling'?'sel-hand':''}" onclick="setWfs('${f.flight}','handling')">✈️ Handling</button></div>`:''}
      </div>`;
    });
  }
  if(!hDep)hDep=`<div style="color:#6b7280;text-align:center;padding:20px;font-size:13px">Aucun départ</div>`;
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
    hsHtml+=`<div class="fi" style="border-left:3px solid #4be8a0;background:rgba(75,232,160,.06);margin-bottom:5px">
      <div class="fi-top">
        <div class="fi-t" style="font-size:18px;color:#e8b84b">${f.eta}<div class="fi-etd">ETD</div></div>
        <div class="fi-b">
          <div class="fi-f" style="font-size:12px">${f.flight}</div>
          <div class="fi-r">${f.reg||'—'} · ${f.handler||'—'}${f.stand?' · Stand '+f.stand:''}</div>
        </div>
        <button class="rm-btn" onclick="setHs('${f.flight}',false)">✕</button>
      </div>
    </div>`;
  });
  if(!hsHtml)hsHtml=`<div style="color:#6b7280;font-size:12px;text-align:center;padding:10px">Aucun vol sélectionné</div>`;
  document.getElementById('hsList').innerHTML=hsHtml;

  // Panneau complet + AJOUTER/SUPPRIMER (tous les DEP dispo, avec bouton toggle)
  let hsAllHtml='';
  if(allDepForHs.length===0){
    hsAllHtml=`<div style="color:#6b7280;font-size:12px;text-align:center;padding:10px">Aucun vol DEP disponible</div>`;
  } else {
    allDepForHs.forEach(f=>{
      const sel=f.hsMode===true;
      hsAllHtml+=`<div class="fi" style="border-left:3px solid ${sel?'#4be8a0':'#2a2d36'};background:${sel?'rgba(75,232,160,.06)':'#111318'};margin-bottom:5px">
        <div class="fi-top">
          <div class="fi-t" style="font-size:18px;color:#e8b84b">${f.eta}<div class="fi-etd">ETD</div></div>
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
      <td class="col-note"></td>
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
      <td class="col-note"></td>
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
  const handlingFlights=[...S.arr,...S.dep].filter(f=>f.handler.toUpperCase()==='WFS'&&f.wfsMode==='handling');
  const handlingMap={};
  handlingFlights.forEach(f=>{const key=f.reg||f.flight;if(!handlingMap[key])handlingMap[key]={reg:f.reg,arr:null,dep:null,flights:[]};handlingMap[key].flights.push(f);if(f.type==='arr')handlingMap[key].arr=f;else handlingMap[key].dep=f;});
  const handlingGroups=Object.values(handlingMap);
  let bottomRows='';
  for(let i=0;i<4;i++){
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

