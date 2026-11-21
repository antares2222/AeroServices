// ── Démarrage : shift actuel, synchro automatique, navigation par jour ──
function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}

// Shift en cours (heure locale). Après minuit, le shift NIGHT appartient à la veille.
function currentShift(){
  const now=new Date(),h=now.getHours(),date=new Date(now);
  let shift;
  if(h>=6&&h<14)shift='EARLY';
  else if(h>=14&&h<22)shift='LATE';
  else{shift='NIGHT';if(h<6)date.setDate(date.getDate()-1);}
  return{shift,date:ymd(date)};
}
function setShiftUI(shift){
  S.shift=shift;
  document.querySelectorAll('.sbtn[id=bE],.sbtn[id=bL],.sbtn[id=bN]').forEach(b=>b.classList.remove('sel'));
  document.getElementById({EARLY:'bE',LATE:'bL',NIGHT:'bN'}[shift]).classList.add('sel');
}
// Changement de date : on repart de zéro sur le nouveau jour
function onDateChange(){
  if(!document.getElementById('sDate').value)return;
  clearAllData();
  loadFromFids();
}
function shiftDay(delta){
  const el=document.getElementById('sDate');
  const[y,m,d]=el.value.split('-').map(Number);
  el.value=ymd(new Date(y,m-1,d+delta));
  onDateChange();
}

(function init(){
  const cur=currentShift();
  document.getElementById('sDate').value=cur.date;
  setShiftUI(cur.shift);
  pullParams().finally(()=>loadFromFids());          // paramètres partagés d'abord, puis affichage du shift actuel
  setInterval(()=>{                                 // synchro silencieuse chaque minute
    if(document.hidden)return;
    const a=document.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'))return; // ne pas écraser une saisie en cours
    if(!document.getElementById('settingsOverlay').classList.contains('open'))pullParams(); // paramètres partagés (effet à la synchro suivante)
    loadFromFids({merge:true,silent:true});
  },60000);
})();
