/* 巷口小吃合集 · 公共引擎 features2.js */
/* 巷口蛋烘糕 · features2.js · P1：难度模式 / 办证 / 技能点 / 分享卡片 / 抹零议价 */

const DIFFS={
 chill:{n:'佛系',desc:'慢慢来，火候和人情都要慢慢烘。客流稀疏、耐心加倍、火候更宽容、无限时压力',pat:2,evt:1.8,rep:.8,rent:.6,money:100,arrival:.72,cg:.3,fine:.5,tol:1.15,burn:60,dayLen:1.35,noBulk:true},
 std:{n:'标准',desc:'不好不坏，像你的工资',pat:1,evt:1,rep:1,rent:1,money:60,tol:1,burn:0,dayLen:1,fine:1},
 hard:{n:'硬核',desc:'启动金仅 ¥40，城管更勤，口碑更脆——真·街头求生',pat:.8,evt:.75,rep:1.2,rent:1.15,money:40,tol:.9,burn:0,dayLen:1,fine:1.3},
 crazy:{n:'疯狂',desc:'全成都最疯的摊：客流爆炸、耐心归零、罚款翻倍、碳化更快——地狱难度',pat:.6,evt:.6,rep:1.4,rent:1.3,money:30,arrival:1.35,cg:1.6,fine:1.5,tol:.85,burn:-40,dayLen:.85},
};

/* ---------- 难度解锁门禁（元进度，独立存档） ---------- */
const META_KEY='dhg_unlocks_v1';
function metaGet(){ try{ return JSON.parse(localStorage.getItem(META_KEY))||{}; }catch(e){ return {}; } }
function saveMeta(patch){ const m=metaGet(); Object.assign(m,patch); try{ localStorage.setItem(META_KEY,JSON.stringify(m)); }catch(e){} }
function diffUnlocked(d){
  const m=metaGet();
  if(d==='hard')return !!m.everUpgraded;
  if(d==='crazy')return !!m.hardDone;
  return true;
}
function diffLockHint(d){
  if(d==='hard')return '🔒 硬核二周目解锁：先完成一次场地升级（推车 → 定点摊）';
  if(d==='crazy')return '🔒 疯狂模式：完整打完一局硬核才配得上';
  return '未解锁';
}
function diffOf(){ return DIFFS[S.diff]||DIFFS.std; }
function rentOf(){ return GAME.premises[S.premises].rent*S.rentMul*diffOf().rent; }

/* ---------- 技能点 ---------- */
function skillTol(t){ return t*(1+.06*(S.skills.heat||0)); }
function skillPat(p){ return p*(1+.08*(S.skills.speed||0)); }
function skillHype(){ return 1+.06*(S.skills.hype||0); }
function skillBargain(){ return 1-.03*(S.skills.bargain||0); }
const SKILLS=[
 {k:'heat',n:'火候直觉',ic:'🌡️',d:'每级出锅容差 +6%；满级后锅上显示实时温度'},
 {k:'speed',n:'手速',ic:'⚡',d:'每级顾客耐心 +8%（做得快不如等得久）'},
 {k:'hype',n:'叫卖',ic:'📣',d:'每级到店客流 +6%'},
 {k:'bargain',n:'砍价',ic:'🤝',d:'每级进货价 −3%，砍价更硬气'},
];
function extraPrepCards(){
  let h='';
  if(!S.license){
    h+=`<div class="h2" style="margin:14px 0 8px">🪪 合规经营</div><div class="card">
      <div class="row"><div class="grow"><div class="t">办摊位证 · ¥300 一次性</div><div class="tiny mut">正规军：城管巡查可直接出示免罚；抽检也更有底气</div></div>
      <button class="btn ${S.money>=300?'leaf':'ghost'}" id="pLicense" ${S.money>=300?'':'disabled'}>办证</button></div></div>`;
  }else{
    h+=`<div class="h2" style="margin:14px 0 8px">🪪 合规经营</div><div class="card"><span class="pill leaf">✅ 已持证经营 · 城管免罚</span></div>`;
  }
  h+=`<div class="h2" style="margin:14px 0 8px">⭐ 技能点（剩余 <b id="skPts">${S.skillPts||0}</b>）</div><div class="card">`;
  SKILLS.forEach(s=>{
    const lv=S.skills[s.k]||0;
    h+=`<div class="mktRow"><div class="mktIcon">${s.ic}</div><div class="mktName"><div class="n">${s.n} <span class="pill">Lv${lv}</span></div><div class="p">${s.d}</div></div>
    <div class="stepper"><button data-sk="${s.k}" ${(S.skillPts||0)>0?'':'disabled'}>+</button></div></div>`;
  });
  h+=`<div class="tiny mut" style="margin-top:6px">每升 1 级获得 1 点。等级来自售卖与完美出锅的经验。</div></div>`;
  return h;
}
function bindExtraPrep(){
  const lb=$('#pLicense');
  if(lb)lb.onclick=()=>{
    if(S.money<300||S.license)return;
    S.money-=300; S.license=true; SFX.fanfare();
    toast('🪪 证件到手！城管面前挺直了腰板','gold'); checkAch(); renderPrep(); hudUpdate(); save();
  };
  $$('#prepBody [data-sk]').forEach(b=>b.onclick=()=>{
    if((S.skillPts||0)<=0)return;
    const k=b.dataset.sk;
    S.skills[k]=(S.skills[k]||0)+1; S.skillPts--;
    SFX.ding(); toast(SKILLS.find(s=>s.k===k).n+' 升到 Lv'+S.skills[k],'good');
    renderPrep(); save();
  });
}

/* ---------- 分享卡片 ---------- */
function shareCard(){
  const cv=document.createElement('canvas'); cv.width=600; cv.height=780;
  const x=cv.getContext('2d');
  x.fillStyle='#FBF6EC'; x.fillRect(0,0,600,780);
  x.strokeStyle='#3D2C1E'; x.lineWidth=6; x.strokeRect(18,18,564,744);
  x.textAlign='center'; x.fillStyle='#3D2C1E';
  x.font='700 46px sans-serif'; x.fillText(V('defaultShop'),300,104);
  x.font='30px sans-serif'; x.fillText(S.shopName,300,152);
  x.font='22px sans-serif'; x.fillStyle='#756554';
  x.fillText(S.playerName+' · 第 '+S.day+' 天 · '+diffOf().n+'模式',300,188);
  x.fillStyle='#C97B2D'; x.font='700 34px sans-serif';
  x.fillText('今日营收 '+money(G.day?G.day.rev:0),300,248);
  x.fillStyle='#3D2C1E'; x.font='24px sans-serif';
  x.fillText('卖出 '+(G.day?G.day.sold:0)+' 个 · 口碑 '+Math.round(S.rep),300,290);
  x.fillText('完美 '+(G.day?Math.round(G.day.qN?G.day.qSum/G.day.qN*100:0):0)+' 分 · 城管罚款 '+money(S.stats.fine),300,326);
  if(S.signatures.length){
    x.fillStyle='#4E7A4E'; x.font='700 26px sans-serif';
    x.fillText('🏆 '+S.signatures.map(k=>S.known[k].name||comboNames(k)).join(' / '),300,380);
  }
  x.fillStyle='#756554'; x.font='26px sans-serif';
  x.fillText('称号：'+endingTitle(),300,436);
  for(let i=0;i<26;i++){
    x.fillStyle=pick(['#F5B942','#D95D5D','#6B9E5A','#7FB0D6','#C97B2D']);
    x.fillRect(40+Math.random()*520,470+Math.random()*60,9,13);
  }
  x.fillStyle='#B4A48E'; x.font='20px sans-serif';
  x.fillText('—— 成都街头 · 火候是门玄学 ——',300,600);
  x.fillText('背配方不能保证赢，就像背单词不能保证涨薪',300,636);
  const url=cv.toDataURL('image/png');
  modal('<div class="h2 center">📤 分享卡片</div><img src="'+url+'" style="width:100%;border-radius:12px;margin:8px 0;border:2px solid var(--ink)"><div class="tiny mut center">长按保存图片，或右键另存为——发朋友圈配文：今天又没亏</div><button class="btn big" data-close style="width:100%">爽</button>');
}

/* ---------- 抹零议价 ---------- */
function bargainModal(price){
  modal('<div class="h2">🧓 砍价现场</div><div class="tiny mut" style="margin:6px 0">“老板，抹个零嘛，五块！”——这单 '+money(price)+'</div>'+
    '<div class="row"><button class="btn leaf grow" id="bgOk">抹零 −¥0.5（口碑 +）</button><button class="btn ghost grow" id="bgNo">规规矩矩（口碑 −）</button></div>',
    {onMount:(box,close)=>{
      box.querySelector('#bgOk').onclick=()=>{ S.money=Math.max(0,S.money-.5); S.rep=clamp(S.rep+.8,0,100); toast('“老板耿直！下次还来”','good'); SFX.coin(); close(); };
      box.querySelector('#bgNo').onclick=()=>{
        S.rep=clamp(S.rep-.5,0,100);
        if(chance(Math.max(.05,.25-(S.skills.bargain||0)*.05)))toast('“啧，下次不来了…”','bad');
        else toast('“行行行，花钱买平安”','bad');
        close();
      };
    }});
}
