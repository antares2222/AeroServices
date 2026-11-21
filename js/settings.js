const SETTINGS_PASSWORD='azerty1234';
async function openSettings(){
  if(sessionStorage.getItem('crewbus_settings_unlocked')!=='1'){
    const pwd=prompt('🔒 Mot de passe requis pour accéder aux paramètres :');
    if(pwd===null)return; // annulé
    // Le serveur (Worker) fait foi ; si injoignable ou non configuré, repli sur le mot de passe local
    let ok=null;
    const url=cloudUrl('auth=1');
    if(url){
      try{
        const r=await fetch(url,{headers:{'X-Settings-Password':pwd},cache:'no-store'});
        if(r.status===200)ok=true;else if(r.status===401)ok=false;
      }catch(e){}
    }
    if(ok===null)ok=(pwd===SETTINGS_PASSWORD);
    if(!ok){alert('❌ Mot de passe incorrect.');return;}
    sessionStorage.setItem('crewbus_settings_unlocked','1');
    if(ok===true&&url)sessionStorage.setItem('crewbus_settings_pwd',pwd);
  }
  if(_remoteEmpty&&sessionStorage.getItem('crewbus_settings_pwd'))pushParams(); // première mise en ligne des paramètres
  cloudStatusIdle();
  renderSettings();
  // Refléter le décalage UTC actuellement sélectionné
  document.getElementById('utc1Btn').classList.toggle('sel',PARAMS.utcOffset===1);
  document.getElementById('utc2Btn').classList.toggle('sel',PARAMS.utcOffset!==1);
  document.getElementById('settingsOverlay').classList.add('open');
}
function setUtcOffset(n,el){
  PARAMS.utcOffset=n;
  document.querySelectorAll('#utc1Btn,#utc2Btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  saveParamsToStorage(PARAMS); // sauvegarde immédiate
}
function closeSettings(){
  document.getElementById('settingsOverlay').classList.remove('open');
}
function saveSettings(){
  saveParamsToStorage(PARAMS);
  closeSettings();
  // Notification
  const btn=document.querySelector('.settings-save');
  btn.textContent='✓ SAUVEGARDÉ !';
  setTimeout(()=>btn.textContent='✓ SAUVEGARDER',1500);
}

function renderSettings(){
  const keys={
    'cb-swp-list':'swissport_cb','cb-avia-list':'avia_cb',
    'cat-list':'catering',
    'ops-wfs-ex-list':'wfs_ops_exclude','ops-chal-list':'challenge_ops',
    'ops-swp-list':'swissport_ops','ops-avia-list':'avia_ops',
    'fedex-ac-list':'fedex_ac_types',
    'hs-default-list':'headset_default'
  };
  for(const [elId,key] of Object.entries(keys)){
    const el=document.getElementById(elId);
    if(!el)continue;
    const list=PARAMS[key]||[];
    el.innerHTML=list.length
      ? list.map(p=>`<span class="prefix-tag">${p}<button onclick="removePrefix('${key}','${p}')">✕</button></span>`).join('')
      : `<span style="color:#9aa0a6;font-size:11px;font-family:var(--f-m)">Aucun</span>`;
  }
  if(typeof renderWoSettings==='function')renderWoSettings();
}

function addPrefix(inputId, key){
  const input=document.getElementById(inputId+'-input');
  if(!input)return;
  const val=input.value.toUpperCase().trim();
  if(!val)return;
  if(!PARAMS[key])PARAMS[key]=[];
  if(!PARAMS[key].includes(val))PARAMS[key].push(val);
  input.value='';
  renderSettings();
  saveParamsToStorage(PARAMS); // sauvegarde immédiate, pas besoin d'attendre le clic SAUVEGARDER
}

function removePrefix(key, val){
  if(!PARAMS[key])return;
  PARAMS[key]=PARAMS[key].filter(p=>p!==val);
  renderSettings();
  saveParamsToStorage(PARAMS); // sauvegarde immédiate
}

