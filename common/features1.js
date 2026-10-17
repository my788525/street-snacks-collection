/* 巷口小吃合集 · 公共引擎 features1.js */
/* 巷口蛋烘糕 · features1.js · P0：连击 / 里程碑 / 图鉴 / 招牌限量 / 试吃价 / 新手引导（含成就框架） */

/* ---------- 连击 Combo + Fever 爆发 ---------- */
const FEVER_AT=8, FEVER_SERVES=10;
function comboBump(perfect){
  if(perfect){
    G.combo=(G.combo||0)+1;
    SFX.comboTick(G.combo);                       // 每连击升调音（爽感递增）
    if(G.combo>(S.stats.maxCombo||0))S.stats.maxCombo=G.combo;
    if(!G.fever && G.combo>=FEVER_AT){ startFever(); }
    if(G.fever){
      G.feverLeft=(G.feverLeft||0)-1;
      S.money=(S.money||0)+ri(2,5);                 // 爆发期每单额外金币
      if(G.feverLeft<=0) endFever();
    }
    if(G.combo%5===0){ toast('🔥 连击 x'+G.combo+'！小费概率提升','gold'); if(typeof comboMilestone==='function')comboMilestone(G.combo); else SFX.coin(); if(typeof comboPop==='function')comboPop(); addXp(G.combo*2); checkAch(); }
  }else{
    G.combo=0;
    if(G.fever) endFever();
  }
  if(typeof renderComboBadge==='function')renderComboBadge();
}
function feverActive(){ return !!G.fever; }
function feverMult(){ return G.fever?1.6:1; }
function startFever(){
  if(G.fever)return;
  G.fever=true; G.feverLeft=FEVER_SERVES;
  S.stats.feverCount=(S.stats.feverCount||0)+1;
  if(G.combo>(S.stats.maxFeverCombo||0))S.stats.maxFeverCombo=G.combo;
  toast('🔥🔥 FEVER TIME！手别抖，连击翻倍金币雨！','gold');
  SFX.fanfare(); feverFlash(); if(typeof coinRain==='function')coinRain(14); showFeverBanner();
  checkAch();
}
function endFever(){
  if(!G.fever)return;
  G.fever=false;
  toast('✨ FEVER 结束！这波连击爽不爽？','good');
  hideFeverBanner();
}
function tipChance(){ return .35+Math.min(G.combo||0,10)*.03; }

/* ---------- 连击徽章（动态注入，跨游戏通用） ---------- */
function renderComboBadge(){
  const app=$('#app'); if(!app)return;
  let b=$('#comboBadge');
  if(!b){ b=document.createElement('div'); b.id='comboBadge'; app.appendChild(b); }
  const showIt=(G.combo>=2 && G.screen==='service');
  if(showIt){
    b.style.display='flex';
    b.innerHTML='<span class="cbNum">'+(G.fever?'🔥'+G.combo:G.combo)+'</span><span class="cbLbl">'+(G.fever?'FEVER':'连击')+'</span>';
    b.classList.toggle('fever',!!G.fever);
    b.classList.remove('beat'); void b.offsetWidth; b.classList.add('beat');
  }else{
    b.style.display='none'; b.classList.remove('fever');
  }
  if(G.fever && G.screen==='service'){ if(typeof showFeverBanner==='function')showFeverBanner(); }
  else{ if(typeof hideFeverBanner==='function')hideFeverBanner(); }
}

/* ---------- 里程碑 ---------- */
const MILESTONES=[
 {id:'m100',n:'第一笔巨款',d:'持有资金达到 ¥100',chk:()=>S.money>=100},
 {id:'day300',n:'日入三百',d:'单日营收 ≥¥300',chk:()=>(G.day&&G.day.rev>=300)},
 {id:'day500',n:'日入五百',d:'单日营收 ≥¥500',chk:()=>(G.day&&G.day.rev>=500)},
 {id:'sig1',n:'招牌诞生',d:'验证第一道招牌菜',chk:()=>S.signatures.length>=1},
 {id:'dark1',n:'黑暗料理家',d:'坐实第一道黑暗料理',chk:()=>S.darks.length>=1},
 {id:'lv5',n:'手艺小成',d:'达到 Lv5',chk:()=>S.lv>=5},
 {id:'sold100',n:'百'+V('unit')+'斩',d:'累计卖出 100 '+V('unit'),chk:()=>S.stats.sold>=100},
 {id:'up1',n:'扩大经营',d:'完成第一次场地升级',chk:()=>S.premises>=1},
 {id:'rep90',n:'巷口传奇',d:'口碑达到 90',chk:()=>S.rep>=90},
];
function checkMilestones(){
  MILESTONES.forEach(m=>{
    if(S.mile.includes(m.id))return;
    try{ if(m.chk()){ S.mile.push(m.id); celebrate(m); } }catch(e){}
  });
}
function celebrate(m){
  SFX.fanfare();
  const layer=$('#toastLayer');
  for(let i=0;i<20;i++){
    const c=document.createElement('div');
    c.style.cssText='position:absolute;top:70px;left:'+(8+Math.random()*84)+'%;width:8px;height:12px;border-radius:2px;z-index:99;pointer-events:none;animation:confetti 1.3s ease-in forwards;background:'+pick(['#F5B942','#D95D5D','#6B9E5A','#7FB0D6','#C97B2D']);
    c.style.animationDelay=(Math.random()*.35)+'s';
    layer.appendChild(c); setTimeout(()=>c.remove(),1800);
  }
  modal('<div class="h1 center">🎉 里程碑达成</div><div class="center h2" style="color:var(--caramel);margin:8px 0">'+m.n+'</div><div class="center tiny mut">'+m.d+'</div><button class="btn big" data-close style="width:100%;margin-top:12px">爽！</button>');
}

/* ---------- 成就 ---------- */
const ACHIEVEMENTS=[
 {id:'a1',n:'开张大喜',d:'卖出第一个'+V('piece'),chk:()=>S.stats.sold>=1},
 {id:'a2',n:'百'+V('unit')+'斩',d:'累计卖出 100 '+V('unit'),chk:()=>S.stats.sold>=100},
 {id:'a3',n:'完美主义',d:'累计 20 次完美出锅',chk:()=>S.stats.perfect>=20},
 {id:'a4',n:'招牌三条',d:'同时拥有 3 道招牌',chk:()=>S.signatures.length>=3},
 {id:'a5',n:'零浪费的一天',d:'单日零糊零流失还有成交',chk:()=>G.day&&G.day.waste===0&&G.day.left===0&&G.day.sold>0},
 {id:'a6',n:'十日长红',d:'经营满 10 天',chk:()=>S.day>=10},
 {id:'a7',n:'小富翁',d:'持有资金 ≥¥1000',chk:()=>S.money>=1000},
 {id:'a8',n:'博主认证',d:'探店爆红一次',chk:()=>(S.stats.bloggerWin||0)>=1},
 {id:'a9',n:'团购达人',d:'完成 3 次团购',chk:()=>(S.stats.bulkWin||0)>=3},
 {id:'a10',n:'猫猫的朋友',d:'喂过流浪猫',chk:()=>(S.stats.catFed||0)>=1},
 {id:'a11',n:'正规军',d:'办下摊位证',chk:()=>!!S.license},
 {id:'a12',n:'旗舰店主',d:'升到 T4 场地',chk:()=>S.premises>=4},
 {id:'a13',n:'连击大师',d:'达成 10 连击',chk:()=>(S.stats.maxCombo||0)>=10},
 {id:'a14',n:'美食榜冠军',d:'月度美食榜第一',chk:()=>(S.stats.monthWin||0)>=1},
 {id:'a15',n:'餐饮冥灯',d:'第一次破产结业',chk:()=>(S.deaths||0)>=1},
 {id:'a16',n:'试吃勇士赞助商',d:'发起 3 次试吃价',chk:()=>(S.stats.tastings||0)>=3},
 {id:'a17',n:'雨神关照',d:'暴雨天出摊还赚了',chk:()=>S.weather==='storm'&&G.day&&G.day.net>0},
 {id:'a18',n:'手感爆棚',d:'触发一次 FEVER 连击爆发',chk:()=>(S.stats.feverCount||0)>=1},
 {id:'a19',n:'街坊熟人',d:'某类顾客好感度达到 90',chk:()=>Object.values(S.affinity||{}).some(v=>v>=90)},
 {id:'a20',n:'街口红人',d:'口碑热度达到 95',chk:()=>S.buzz!=null&&S.buzz>=95},
 {id:'a21',n:'安利大师',d:'靠老客安利拉来 5 位新客',chk:()=>(S.stats.referrals||0)>=5},
 {id:'a22',n:'街坊一家人',d:'攒下 3 位老主顾',chk:()=>(S.stats.loyalCount||0)>=3},
 {id:'a23',n:'人传人',d:'靠顾客带朋友拉来 8 位新客',chk:()=>(S.stats.friendBrings||0)>=8},
];
function checkAch(){
  ACHIEVEMENTS.forEach(a=>{
    if(S.ach.includes(a.id))return;
    try{ if(a.chk()){ S.ach.push(a.id); toast('🏆 成就解锁：'+a.n,'gold'); SFX.ding(); } }catch(e){}
  });
}

/* ---------- 图鉴 ---------- */
function openCodex(){ S.codexTab=S.codexTab||'馅料'; renderCodex(); show('codex'); }
function renderCodex(){
  const tabs=['馅料','组合','顾客','成就'];
  let h='<div class="row wrap" style="gap:6px;margin-bottom:10px">';
  tabs.forEach(t=>{ h+='<button class="btn '+(S.codexTab===t?'':'ghost')+'" data-tab="'+t+'" style="min-height:36px;padding:2px 14px;font-size:13px">'+t+'</button>'; });
  h+='</div>';
  if(S.codexTab==='馅料'){
    h+='<div class="tiny mut" style="margin-bottom:8px">卖出过即点亮。未解锁的原料随等级开放。</div>';
    GAME.fillings.forEach(f=>{
      const unlocked=!f.lv||f.lv<=S.lv, seen=S.seenFill.includes(f.id);
      if(f.fest && !festOn(f.fest)){
        const ft=GAME.festivals.find(x=>x.fid===f.fest);
        h+='<div class="card" style="margin-bottom:8px;opacity:.6"><div class="row"><div class="mktIcon">🎏</div><div class="grow"><div class="mktName"><div class="n">'+f.n+'</div><div class="p">'+(ft?ft.name:'节日')+' · 到节日才上架</div></div></div></div></div>';
      }else if(!unlocked){
        h+='<div class="card" style="margin-bottom:8px;opacity:.55"><div class="row"><div class="mktIcon">❔</div><div class="grow"><div class="mktName"><div class="n">???</div><div class="p">Lv'+f.lv+' 解锁</div></div></div></div></div>';
      }else if(seen){
        h+='<div class="card" style="margin-bottom:8px"><div class="row"><div class="mktIcon">'+f.ic+'</div><div class="grow"><div class="mktName"><div class="n">'+f.n+' <span class="pill">'+f.t+'</span></div><div class="p">成本 '+fmt(f.c)+(f.cold?' · 冷藏易变质':'')+' · '+f.tags.join('/')+'</div></div></div></div></div>';
      }else{
        h+='<div class="card" style="margin-bottom:8px;opacity:.75"><div class="row"><div class="mktIcon">'+f.ic+'</div><div class="grow"><div class="mktName"><div class="n" style="color:var(--ink2)">'+f.n+'</div><div class="p">还没卖过，进个货试试</div></div></div></div></div>';
      }
    });
  }else if(S.codexTab==='组合'){
    const keys=Object.keys(S.known);
    h+='<div class="tiny mut" style="margin-bottom:8px">组合结果是隐藏的，卖出来才知道。已发现 '+keys.length+' 种。</div>';
    if(!keys.length)h+='<div class="deskNote">一种都没发现。自由搭配是财富密码（也可能是黑暗密码）。</div>';
    keys.forEach(k=>{
      const info=S.known[k], names=k.split('+').map(id=>F(id).n).join(' + ');
      const cls=info.r==='sig'?'leaf':(info.r==='dark'?'rouge':'');
      const label=info.r==='sig'?('🏆 招牌'+(info.name?' · '+esc(info.name):'')):(info.r==='dark'?'💀 黑暗料理':'普通');
      h+='<div class="card" style="margin-bottom:8px"><div class="row"><div class="grow"><div class="mktName"><div class="n">'+esc(names)+'</div><div class="p">售出 '+info.sales+' 个'+(S.banned.includes(k)?' · 已下架':'')+'</div></div></div><span class="pill '+cls+'">'+label+'</span></div></div>';
    });
  }else if(S.codexTab==='顾客'){
    h+='<div class="tiny mut" style="margin-bottom:8px">接待过的顾客类型、好感度与记忆（满格 = 老主顾；🤝 表示他会带朋友来）。</div>';
    GAME.customers.forEach(c=>{
      const n=S.seenCust[c.id]||0, a=aff(c.id), filled=Math.round(a/25), hearts='❤️'.repeat(filled)+'🤍'.repeat(4-filled);
      const m=(S.custMem&&S.custMem[c.id])||{};
      let extra='';
      if(m.loyal)extra+=' · 🤝会带朋友';
      if(m.fav&&m.fav.length)extra+=' · 老规矩：'+m.fav.map(id=>F(id).n).join('+');
      const v=m.visits||n;
      h+='<div class="card" style="margin-bottom:8px"><div class="row"><div class="mktIcon">'+c.ic+'</div><div class="grow"><div class="mktName"><div class="n">'+c.n+(m.nick?' <span class="pill leaf">'+m.nick+'</span>':'')+'</div><div class="p">'+(n?('累计 '+v+' 次 · 好感 '+Math.round(a)+(a>=LOYAL_AT?' · 老主顾':'')+extra):'还没见过')+'</div></div></div>'+(n?'<div style="font-size:15px;letter-spacing:2px">'+hearts+'</div>':'')+(c.desc?'<div class="tiny mut" style="margin-top:3px">'+c.desc+'</div>':'')+'</div></div>';
    });
    if((S.stats.friendBrings||0)>0)h+='<div class="deskNote" style="margin-top:6px">🤝 累计靠老客带朋友拉来新客 '+S.stats.friendBrings+' 位——口碑是传出来的。</div>';
  }else{
    h+='<div class="tiny mut" style="margin-bottom:8px">已解锁 '+S.ach.length+' / '+ACHIEVEMENTS.length+'</div>';
    ACHIEVEMENTS.forEach(a=>{
      const done=S.ach.includes(a.id);
      h+='<div class="card" style="margin-bottom:8px;'+(done?'':'opacity:.55')+'"><div class="row"><div class="mktIcon">'+(done?'🏆':'🔒')+'</div><div class="grow"><div class="mktName"><div class="n">'+a.n+'</div><div class="p">'+a.d+'</div></div></div></div></div>';
    });
    h+='<div class="deskNote" style="margin-top:8px">里程碑：'+S.mile.map(m=>MILESTONES.find(x=>x.id===m).n).join('、')+'</div>';
  }
  $('#codexBody').innerHTML=h;
  $$('#codexBody [data-tab]').forEach(b=>b.onclick=()=>{ SFX.click(); S.codexTab=b.dataset.tab; renderCodex(); save(); });
}

/* ---------- 招牌限量 ---------- */
function startLimits(){ G.limitLeft=Object.assign({},S.limits||{}); }
function limitCheck(key){
  const lim=(S.limits&&S.limits[key])||0;
  if(!lim)return true;
  const left=G.limitLeft[key]==null?lim:G.limitLeft[key];
  if(left<=0){ toast('🏷️ 今日招牌售罄，明天请早','bad'); SFX.fail(); return false; }
  G.limitLeft[key]=left-1;
  if(left-1===0){ toast('🏷️ 招牌售罄挂牌！没买到的顾客说明天来排队','gold'); S.rep=clamp(S.rep+.4,0,100); SFX.ding(); }
  return true;
}

/* ---------- 试吃价 ---------- */
function tastingDeal(key,price){
  if(!S.tasting)return {price,repMul:1,first:false};
  if((G.tastings||0)>=3)return {price,repMul:1,first:false};
  if(S.known[key])return {price,repMul:1,first:false};
  G.tastings=(G.tastings||0)+1;
  S.stats.tastings=(S.stats.tastings||0)+1;
  toast('🤤 试吃价！半价招募勇士，翻车了也不伤口碑','gold');
  return {price:price*.5,repMul:.4,first:true};
}

/* ---------- 每日签到 / 连续天数（用户粘性） ---------- */
function checkSignIn(){
  if(!S||!S.ver)return;
  const t=todayStr();
  if(S.lastLogin===t)return;                       // 今天已签到
  if(S.lastLogin===yesterdayStr()) S.streak=(S.streak||0)+1;   // 连续
  else S.streak=1;                                  // 断签重置
  S.lastLogin=t;
  const rewards=[
    {d:1,m:20},{d:2,m:25},{d:3,m:35},{d:4,m:40},{d:5,m:50},{d:6,m:60},{d:7,m:100}
  ];
  const r=rewards[Math.min(S.streak,7)-1]||rewards[6];
  S.money=(S.money||0)+r.m;
  let gift='';
  if(S.streak%7===0){                               // 每满 7 天送一道限定馅料
    const pool=GAME.fillings.filter(f=>f.lv&&f.lv>=4&&!S.earlyUnlock.includes(f.id));
    if(pool.length){ const g=pick(pool); S.earlyUnlock.push(g.id); gift='🎁 幸运馅料解锁：'+g.ic+' '+g.n+'（已提前解锁）'; }
  }
  save();
  const dots=[0,1,2,3,4,5,6].map(i=>{
    const day=S.streak-i; const on=day>0;
    return '<span class="sigDot '+(on?'on':'')+'">'+(on?(day%7===0?'★':'●'):'○')+'</span>';
  }).reverse().join('');
  const html='<div class="h1 center">📅 连续签到 '+S.streak+' 天</div>'+
    '<div class="center" style="margin:8px 0 4px">'+dots+'</div>'+
    '<div class="center h2" style="color:var(--caramel)">今日奖励 +'+money(r.m)+'</div>'+
    (gift?'<div class="center tiny mut" style="margin-top:6px">'+gift+'</div>':'')+
    '<div class="center tiny mut" style="margin-top:6px">'+(S.streak%7===0?'🎉 七日一轮，明天继续有礼！':'连续签到越久，奖励越厚')+'</div>'+
    '<button class="btn big" data-close style="width:100%;margin-top:12px">收下，开摊！</button>';
  modal(html);
  SFX.coin();
}
