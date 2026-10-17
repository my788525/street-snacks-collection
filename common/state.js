/* 巷口小吃合集 · 公共引擎 state.js */
/* 巷口蛋烘糕 · state.js · 自动拆分自 index.html，请在此文件内继续维护 */

/* ---------- 数值平衡常量（§16.7） ---------- */
const BAL={
  startMoney:60, newbieDays:3, newbieFlow:1.2, newbiePat:1.35,
  rentInflateEvery:10, rentInflate:.10,
  comfortAfter:2, comfortFlow:1.2,
  crisisMoney:10, crisisDays:3, legacyMoney:30, bailDef:80,
  batterPerFlour:4, cakeBase:.5, repTarget:.62, repK:6, repDamp:.3,
  dayLen:150, gasRate:[0,.5,1,1.5], gasCanCap:200, spoilAt:24, staleAt:12, discountFrom:4, discountRate:.025, discountFloor:.5, batterSpoil:95,
};
const LV_XP=[0,80,220,450,800,1300,2000,3000,4300,6000,8200,11000,15000];

/* ---------- 运行时 ---------- */
const G={
  screen:'title', running:false, last:0, raf:0,
  fire:1, wells:[], serve:[], queue:[], nextArrive:1.5,
  gasUsed:0, day:null, event:null, eventCd:8, watch:[], bulk:null, bulkLeft:0, bulkScore:0,
  news:[], newsIdx:0, newsTimer:null, picked:-1, pickMode:null,
  lostDays:0, crisisDays:0, bloggerDone:0, mood:{}, catFed:false, shakeT:0,
  combo:0, tastings:0, limitLeft:{},
  fever:false, feverLeft:0, referNext:null, bringFriend:null,
};

/* ---------- 存档 ---------- */
const SAVE_KEY='dhg_save_v1';
function newGame(name,shop,legacy,diff){
  S={
    ver:1, shopName:shop, playerName:name, diff:diff||'std',
    day:1, money:(DIFFS[diff||'std']||DIFFS.std).money+(legacy?BAL.legacyMoney:0), rep:60, xp:0, lv:1,
    premises:0, license:false,
    inv:{}, flour:6, egg:10, gas:3, batter:0, batterBatches:[], batterQ:1, ferm:'std',
    known:{}, signatures:[], darks:[], banned:[], legacyHint: legacy&&legacy.hint?legacy.hint:null,
    buffs:[], adTier:0, budget:0, base:2.5,
    mile:[], ach:[], seenFill:[], seenCust:{}, limits:{}, tasting:false, codexTab:'馅料',
    skillPts:0, skills:{heat:0,speed:0,hype:0,bargain:0},
    spoil:{}, rotten:[], helper:0, waimai:false, dayType:'normal', spot:'metro', change:20,
    clues:0, earlyUnlock:[], pairSeen:[], month:null, endings:[], preheat:0,
    chainBulk:false, chainFair:false, health:false, prebook:null, inspectWarned:false,
    weather:'cloudy', tomorrow:'cloudy', wind:'plain',
    priceMul:{}, renameCd:0, rentMul:1,
    streak:0, lastLogin:null, affinity:{}, buzz:60, custMem:{},
    stats:{sold:0, earn:0, best:0, perfect:0, left:0, dark:0, fine:0, days:0, bloggerWin:0, bulkWin:0, catFed:0, maxCombo:0, monthWin:0, tastings:0, feverCount:0, maxFeverCombo:0, referrals:0, affMax:0, loyalCount:0, friendBrings:0},
    ach:[], seenNews:[], pendingNews:[], seed:(Math.random()*1e9)|0, deaths: (legacy?legacy.deaths||0:0),
  };
  GAME.fillings.filter(f=>!f.lv||f.lv<=1).forEach(f=>S.inv[f.id]=4);
  RNG=mulberry32(S.seed);
  if(typeof checkSignIn==='function')checkSignIn();
}
function freshDayRec(){ return {sold:0,rev:0,cost:0,waste:0,qSum:0,qN:0,left:0,tips:0,prep:0,fines:0,gas:0,sigSales:0,darkSales:0,wages:0,friendBrings:0}; }
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const d=localStorage.getItem(SAVE_KEY); if(!d)return null; const o=JSON.parse(d); if(o&&o.ver===1)return o; }catch(e){} return null; }
function hasSave(){ return !!load(); }

/* ---------- 日期辅助（真实日历，用于签到 / 节日） ---------- */
function todayStr(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function dateStrOffset(days){ const d=new Date(Date.now()+days*86400000); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function yesterdayStr(){ return dateStrOffset(-1); }

/* ---------- UI  helpers ---------- */
function show(id){
  $$('.screen').forEach(s=>s.classList.remove('on'));
  const el=$('#scr-'+id); if(el)el.classList.add('on');
  G.screen=id; hudUpdate();
}
function toast(msg,type){
  const d=document.createElement('div'); d.className='toast '+(type||''); d.textContent=msg;
  $('#toastLayer').appendChild(d);
  setTimeout(()=>{d.style.transition='opacity .3s';d.style.opacity='0';setTimeout(()=>d.remove(),320)},1900);
}
function jump(el,txt,color){
  if(!el)return;
  const r=el.getBoundingClientRect(),a=$('#app').getBoundingClientRect();
  const j=document.createElement('div'); j.className='jump'; j.textContent=txt; j.style.color=color||'var(--leaf-d)';
  j.style.left=(r.left-a.left+r.width/2-20)+'px'; j.style.top=(r.top-a.top)+'px';
  $('#app').appendChild(j); setTimeout(()=>j.remove(),900);
}
function shake(){ const a=$('#app'); a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); }
function hitstop(){ const f=$('#flash'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
function modal(html,opts){
  const box=$('#modalBox'); box.innerHTML=html;
  $('#modalLayer').classList.add('on');
  const close=()=>$('#modalLayer').classList.remove('on');
  box.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{SFX.click();close()});
  if(opts&&opts.onMount)opts.onMount(box,close);
  return close;
}
function hudUpdate(){
  const m=money(S.money), r='口碑 '+Math.round(S.rep);
  $('#hudDay')&&($('#hudDay').textContent='第 '+S.day+' 天');
  $('#hudMoney')&&($('#hudMoney').textContent=m);
  $('#hudRep')&&($('#hudRep').textContent=r);
  $('#hudDayS')&&($('#hudDayS').textContent='第 '+S.day+' 天');
  $('#hudMoneyS')&&($('#hudMoneyS').textContent=m);
  $('#hudRepS')&&($('#hudRepS').textContent=r);
  $('#hudQueue')&&($('#hudQueue').textContent='排队 '+G.queue.length+'/'+GAME.premises[S.premises].cap);
  $('#hudDayE')&&($('#hudDayE').textContent='第 '+S.day+' 天');
  $('#hudMoneyE')&&($('#hudMoneyE').textContent=m);
  $('#hudRepE')&&($('#hudRepE').textContent=r);
  $('#hudDayC')&&($('#hudDayC').textContent='第 '+S.day+' 天');
  $('#hudMoneyC')&&($('#hudMoneyC').textContent=m);
  if(typeof renderComboBadge==='function')renderComboBadge();
}
function xpLv(xp){ let l=1; while(l<LV_XP.length&&xp>=LV_XP[l])l++; return l; }
function addXp(n){
  S.xp+=n; const l=xpLv(S.xp);
  if(l>S.lv){
    S.lv=l; S.skillPts=(S.skillPts||0)+1; SFX.fanfare();
    const nf=GAME.fillings.filter(f=>f.lv===l);
    let html=`<div class="h1 center">🎉 升级 Lv${l}</div><div class="center mut tiny" style="margin:6px 0">手艺精进，新原料上架</div>`;
    if(nf.length)html+=`<div class="row wrap" style="justify-content:center;margin:10px 0">`+nf.map(f=>`<span class="pill">${f.ic} ${f.n}</span>`).join('')+`</div>`;
    html+=`<button class="btn big" data-close style="width:100%">接手新人生</button>`;
    modal(html);
  }
}
function unlockedFillings(){
  return GAME.fillings.filter(f=>{
    if(S.earlyUnlock&&S.earlyUnlock.includes(f.id))return true;
    if(f.fest)return festOn(f.fest);
    return !f.lv||f.lv<=S.lv;
  });
}
