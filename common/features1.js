/* 巷口小吃合集 · 公共引擎 features1.js */
/* 巷口蛋烘糕 · features1.js · P0：连击 / 里程碑 / 图鉴 / 招牌限量 / 试吃价 / 新手引导（含成就框架） */

/* ---------- 连击 Combo ---------- */
function comboBump(perfect){
  if(perfect){
    G.combo=(G.combo||0)+1;
    if(G.combo>(S.stats.maxCombo||0))S.stats.maxCombo=G.combo;
    if(G.combo%5===0){ toast('🔥 连击 x'+G.combo+'！小费概率提升','gold'); SFX.coin(); if(typeof comboPop==='function')comboPop(); addXp(G.combo*2); checkAch(); }
  }else G.combo=0;
}
function tipChance(){ return .35+Math.min(G.combo||0,10)*.03; }

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
      if(!unlocked){
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
    h+='<div class="tiny mut" style="margin-bottom:8px">接待过的顾客类型。</div>';
    GAME.customers.forEach(c=>{
      const n=S.seenCust[c.id]||0;
      h+='<div class="card" style="margin-bottom:8px"><div class="row"><div class="mktIcon">'+c.ic+'</div><div class="grow"><div class="mktName"><div class="n">'+c.n+'</div><div class="p">'+(n?'接待 '+n+' 次':'还没见过')+'</div></div></div></div></div>';
    });
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

/* ---------- 新手引导 ---------- */
const TUT=[
 {t:'① '+V('prepName'),d:'三种方式：快速（'+V('yeast')+'，快但口感−1）/ 标准 / 慢工出细活（质量+10%）。'+V('batter')+'是今天的产能上限。'},
 {t:'② 进货定价',d:'菜市场买'+V('flour')+'、鸡蛋和馅料，价格每天波动；定价别超过心理价位 1.3 倍，否则客人扭头就走。营销预算量力而行。'},
 {t:'③ 出摊三板斧',d:'点空锅'+GAME.flow.pour+' → '+V('cookSign')+'加馅 → 火候到了'+GAME.flow.fold+'（准头决定外形）。做好会自动放上'+GAME.flow.tray+'，对口味的客人自己拿——不用你送！'},
];
function tutStart(){
  if(S.tut>=TUT.length)return;
  const t=TUT[S.tut];
  modal('<div class="h1 center">🎓 '+t.t+'</div><div class="center" style="margin:10px 0;font-size:14px">'+t.d+'</div><div class="row"><button class="btn ghost grow" id="tutSkip">跳过教学</button><button class="btn grow" id="tutNext">'+(S.tut<TUT.length-1?'下一步':'开摊！')+'</button></div>',
    {onMount:(box,close)=>{
      box.querySelector('#tutSkip').onclick=()=>{ S.tut=TUT.length; close(); save(); };
      box.querySelector('#tutNext').onclick=()=>{ S.tut++; close(); if(S.tut<TUT.length)tutStart(); save(); };
    }});
}
