// ── Paramètres Work Order : compagnies (flotte), tâches, handler → compagnie ──
let _woRuleNames=[];

function woSave(){saveParamsToStorage(PARAMS);renderSettings();updateWoButtons();renderOps();}
function woChips(list,delCall){
  return (list&&list.length)
    ? list.map((p,j)=>`<span class="prefix-tag">${esc(p)}<button onclick="${delCall(j)}">✕</button></span>`).join('')
    : '<span class="wo-none">Aucun</span>';
}
function woTaskSelect(id){
  return `<select id="${id}" class="wo-sel-add"><option value="">+ tâche…</option>${WO_SERVICES.map(s=>`<option>${s}</option>`).join('')}</select>`;
}

function renderWoSettings(){
  const el=document.getElementById('woSettings');
  if(!el)return;
  const cos=PARAMS.wo_companies||[];
  // ── A. Compagnies ──
  let h='<div class="settings-section-title">🏢 WORK ORDER — COMPAGNIES (FLOTTE)</div>';
  h+='<div class="wo-hint">Une compagnie est reconnue par l\'immatriculation de l\'avion ou par le préfixe du n° de vol.</div>';
  cos.forEach((c,i)=>{
    h+=`<div class="wo-co">
      <div class="wo-co-head"><b>${esc(c.name)}</b><button class="wo-del" onclick="woDelCompany(${i})">Supprimer</button></div>
      <div class="wo-row-lbl">Avions</div>
      <div class="prefix-list">${woChips(c.regs,j=>`woDelReg(${i},${j})`)}</div>
      <div class="prefix-add"><input type="text" id="woReg-${i}" placeholder="ex: TFAMU" maxlength="8"><button onclick="woAddReg(${i})">+ AVION</button></div>
      <div class="wo-row-lbl">Préfixes de vol</div>
      <div class="prefix-list">${woChips(c.prefixes,j=>`woDelPrefix(${i},${j})`)}</div>
      <div class="prefix-add"><input type="text" id="woPfx-${i}" placeholder="ex: CAO" maxlength="6"><button onclick="woAddPrefix(${i})">+ PRÉFIXE</button></div>
    </div>`;
  });
  h+=`<div class="prefix-add" style="margin-top:10px"><input type="text" id="woNewCo" placeholder="Nouvelle compagnie" maxlength="30"><button onclick="woAddCompany()">+ COMPAGNIE</button></div>`;

  // ── B. Tâches ──
  const names=[];
  cos.forEach(c=>{if(!names.includes(c.name))names.push(c.name);});
  Object.keys(PARAMS.wo_tasks||{}).forEach(n=>{if(!names.includes(n))names.push(n);});
  Object.values(PARAMS.wo_handler_company||{}).forEach(n=>{if(n&&!names.includes(n))names.push(n);});
  _woRuleNames=names;
  h+='<div class="settings-section-title" style="margin-top:22px">📝 WORK ORDER — TÂCHES PAR COMPAGNIE</div>';
  h+='<div class="wo-hint">Cases cochées sur la feuille. « Avec handling » = tâches quand Handling est coché dans le crew-bus (vide = HANDLING seul). Une compagnie sans tâche garde le choix manuel (Cleaning / Toilet / Water).</div>';
  names.forEach((n,i)=>{
    const r=(PARAMS.wo_tasks||{})[n]||{def:[],handling:[],types:{}};
    const types=Object.keys(r.types||{});
    h+=`<div class="wo-co">
      <div class="wo-co-head"><b>${esc(n)}</b>${PARAMS.wo_tasks&&PARAMS.wo_tasks[n]?`<button class="wo-del" onclick="woDelRule(${i})">Effacer</button>`:''}</div>
      <div class="wo-row-lbl">Tâches par défaut</div>
      <div class="prefix-list">${woChips(r.def,j=>`woDelTask(${i},'def','',${j})`)}</div>
      ${woTaskSelect('woTs-'+i+'-def')}
      <div class="wo-row-lbl">Avec handling</div>
      <div class="prefix-list">${woChips(r.handling,j=>`woDelTask(${i},'handling','',${j})`)}</div>
      ${woTaskSelect('woTs-'+i+'-handling')}
      ${types.map((t,k)=>`<div class="wo-row-lbl">Type ${esc(t)} <button class="wo-del" onclick="woDelType(${i},${k})">✕ type</button></div>
        <div class="prefix-list">${woChips(r.types[t],j=>`woDelTask(${i},'type',${k},${j})`)}</div>
        ${woTaskSelect('woTs-'+i+'-t'+k)}`).join('')}
      <div class="prefix-add"><input type="text" id="woTy-${i}" placeholder="Type d'avion (ex: B734)" maxlength="6"><button onclick="woAddType(${i})">+ TYPE</button></div>
    </div>`;
  });

  // ── C. Handler → compagnie ──
  const hm=PARAMS.wo_handler_company||{},cm=PARAMS.wo_catering_company||{};
  const pairs=(m,which)=>Object.keys(m).length?Object.keys(m).map((k,j)=>`<span class="prefix-tag">${esc(k)} → ${esc(m[k])}<button onclick="woDelMap('${which}',${j})">✕</button></span>`).join(''):'<span class="wo-none">Aucun</span>';
  h+='<div class="settings-section-title" style="margin-top:22px">🔀 WORK ORDER — HANDLER → COMPAGNIE (OPÉRATION)</div>';
  h+='<div class="wo-hint">Utilisé quand l\'avion n\'est pas dans la flotte. Handlers : WFS, CHH (Challenge), SWP (Swissport), FEDEX…</div>';
  h+=`<div class="prefix-list">${pairs(hm,'h')}</div>
    <div class="prefix-add"><input type="text" id="woHk" placeholder="Handler" maxlength="12"><input type="text" id="woHv" placeholder="Compagnie" maxlength="30"><button onclick="woAddMap('h')">+ AJOUTER</button></div>`;
  h+='<div class="settings-section-title" style="margin-top:22px">🍽 WORK ORDER — COMPAGNIE CATERING (PRÉFIXE → COMPAGNIE)</div>';
  h+=`<div class="prefix-list">${pairs(cm,'c')}</div>
    <div class="prefix-add"><input type="text" id="woCk" placeholder="Préfixe (ex: QTR)" maxlength="6"><input type="text" id="woCv" placeholder="Compagnie" maxlength="30"><button onclick="woAddMap('c')">+ AJOUTER</button></div>
    <div class="wo-row-lbl">Autres vols catering</div>
    <div class="prefix-add"><input type="text" id="woCdef" value="${esc(PARAMS.wo_catering_default||'')}" maxlength="30"><button onclick="woSetCatDef()">OK</button></div>`;
  el.innerHTML=h;
}

// ── Actions : flotte ──
function woAddCompany(){
  const v=document.getElementById('woNewCo').value.trim().toUpperCase();
  if(!v)return;
  if(!PARAMS.wo_companies.some(c=>c.name===v))PARAMS.wo_companies.push({name:v,regs:[],prefixes:[]});
  woSave();
}
function woDelCompany(i){
  const c=PARAMS.wo_companies[i];
  if(!c||!confirm('Supprimer la compagnie '+c.name+' (avions et préfixes) ?'))return;
  PARAMS.wo_companies.splice(i,1);woSave();
}
function woAddReg(i){
  const el=document.getElementById('woReg-'+i),v=woNormReg(el.value);
  if(!v)return;
  const c=PARAMS.wo_companies[i];
  if(!c.regs.includes(v))c.regs.push(v);
  woSave();
}
function woDelReg(i,j){PARAMS.wo_companies[i].regs.splice(j,1);woSave();}
function woAddPrefix(i){
  const v=document.getElementById('woPfx-'+i).value.toUpperCase().trim();
  if(!v)return;
  const c=PARAMS.wo_companies[i];
  if(!c.prefixes.includes(v))c.prefixes.push(v);
  woSave();
}
function woDelPrefix(i,j){PARAMS.wo_companies[i].prefixes.splice(j,1);woSave();}

// ── Actions : tâches ──
function woRule(i){
  const n=_woRuleNames[i];
  if(!PARAMS.wo_tasks)PARAMS.wo_tasks={};
  if(!PARAMS.wo_tasks[n])PARAMS.wo_tasks[n]={def:[],handling:[],types:{}};
  const r=PARAMS.wo_tasks[n];
  if(!r.types)r.types={};
  return r;
}
function woTaskList(i,kind,k){
  const r=woRule(i);
  if(kind==='type')return r.types[Object.keys(r.types)[k]];
  return r[kind];
}
function woAddTaskFrom(sel,i,kind,k){
  if(!sel.value)return;
  const l=woTaskList(i,kind,k);
  if(!l.includes(sel.value))l.push(sel.value);
  woSave();
}
function woDelTask(i,kind,k,j){woTaskList(i,kind,k).splice(j,1);woSave();}
function woAddType(i){
  const el=document.getElementById('woTy-'+i),v=woNormType(el.value);
  if(!v)return;
  const r=woRule(i);
  if(!r.types[v])r.types[v]=[];
  woSave();
}
function woDelType(i,k){const r=woRule(i);delete r.types[Object.keys(r.types)[k]];woSave();}
function woDelRule(i){
  if(!confirm('Effacer les tâches de '+_woRuleNames[i]+' ?'))return;
  delete PARAMS.wo_tasks[_woRuleNames[i]];woSave();
}

// ── Actions : handler / catering ──
function woAddMap(which){
  const k=document.getElementById(which==='h'?'woHk':'woCk').value.toUpperCase().trim();
  const v=document.getElementById(which==='h'?'woHv':'woCv').value.trim().toUpperCase();
  if(!k||!v)return;
  const key=which==='h'?'wo_handler_company':'wo_catering_company';
  if(!PARAMS[key])PARAMS[key]={};
  PARAMS[key][k]=v;woSave();
}
function woDelMap(which,j){
  const key=which==='h'?'wo_handler_company':'wo_catering_company';
  delete PARAMS[key][Object.keys(PARAMS[key])[j]];woSave();
}
function woSetCatDef(){
  PARAMS.wo_catering_default=document.getElementById('woCdef').value.trim().toUpperCase();
  woSave();
}

// Branche les sélecteurs de tâches (onchange) après chaque rendu
document.addEventListener('change',e=>{
  const t=e.target;
  if(!t.classList||!t.classList.contains('wo-sel-add'))return;
  const m=t.id.match(/^woTs-(\d+)-(def|handling|t(\d+))$/);
  if(!m)return;
  if(m[3]!==undefined)woAddTaskFrom(t,+m[1],'type',+m[3]);
  else woAddTaskFrom(t,+m[1],m[2],'');
});
