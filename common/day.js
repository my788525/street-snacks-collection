/* 巷口小吃合集 · 公共引擎 day.js */
/* 巷口蛋烘糕 · day.js · 自动拆分自 index.html，请在此文件内继续维护 */

/* ---------- 每日开局 ---------- */
function wpick(list,wf){ let t=0;const w=list.map(wf);w.forEach(x=>t+=x);let r=rnd()*t;for(let i=0;i<list.length;i++){r-=w[i];if(r<=0)return list[i]}return list[list.length-1] }
function rollWeather(){
  const W={sunny:.26,cloudy:.3,rain:.14,hot:.12,cold:.12,storm:.06};
  if(S.day<=BAL.newbieDays&&chance(.75))return pick(['sunny','cloudy','cloudy']);
  return wpick(GAME.weathers,w=>W[w.id]||.1).id;
}
function startDay(first){
  if(!first)S.day++;
  S.stats.days=S.day;
  S.weather=rollWeather();
  S.tomorrow=rollWeather();
  S.wind=pick(GAME.winds).id;
  S.priceMul={}; [...GAME.fillings,...GAME.baseItems].forEach(it=>S.priceMul[it.id]=.85+rnd()*.4);
  // 天气基础修正
  const W=GAME.weathers.find(w=>w.id===S.weather);
  S.fxWeather={flow:W.flow*(S.day<=BAL.newbieDays?BAL.newbieFlow:1), price:1, gas:1, cg:0, heat: W.heat? .7:1, cold:!!W.cold, pat: W.pat||0};
  // 风向
  const WI=GAME.winds.find(w=>w.id===S.wind); G.windTags=WI.tags;
  // 每日类型（尝鲜日/保守日）
  S.dayType=rnd()<.25?'taste':(rnd()<.72?'normal':'safe');
  // 食材变质
  spoilDecay();
  // 预热重置
  S.preheat=0;
  // 月度结算
  if(S.day>1&&S.day%30===0)setTimeout(monthEnd,600);
  if(S.day%30===1)monthStart();
  // buffs 衰减
  S.buffs=S.buffs.filter(b=>--b.days>0);
  if(S.renameCd>0)S.renameCd--;
  if(S.day%BAL.rentInflateEvery===0&&S.day>0)S.rentMul=1+BAL.rentInflate*Math.floor(S.day/BAL.rentInflateEvery);
  // 新闻
  buildNews(); applyNewsFx(); S.pendingNews=G.news.map(n=>n.t);
  // 日记录
  G.day=freshDayRec();
  S.batter=0;
  save(); renderPrep(); startNewsLoop(); show('prep');
  if(first&&S.tut<TUT.length)setTimeout(tutStart,450);
}
function applyNewsFx(){
  const fx=G.news.reduce((a,n)=>{const f=n.fx||{};for(const k in f)a[k]=(a[k]||0)+f[k];return a;},{});
  const base=S.fxWeather||{flow:1,price:1,gas:1,cg:0};
  S.fxToday={
    flow:base.flow*(1+(fx.flow||0))*(S.buffs.some(b=>b.id==='comfort')?BAL.comfortFlow:1)*(S.buffs.some(b=>b.id==='avoid')?.7:1),
    price:base.price*(1+(fx.price||0)),
    gas:base.gas*(1+(fx.gas||0)),
    cg:base.cg+(fx.cg||0),
    heat:base.heat||1, cold:base.cold,
    pat:base.pat,
    rep:(fx.rep||0),
    hunger:(fx.hunger||0),
    adrisk:(fx.adrisk||0),
    cat:(fx.cat||0),
    studentFlow:(1+(fx.studentFlow||0)),
  };
  if(S.fxToday.rep){ S.rep=clamp(S.rep+S.fxToday.rep,0,100); }
}
function priceOf(it){ return Math.round(it.c*(S.priceMul[it.id]||1)*(S.fxToday?S.fxToday.price:1)*skillBargain()*100)/100; }
function psychPrice(){
  const pm=GAME.premises[S.premises];
  let p=(3+pm.pmax*.5)*(.82+S.rep/240);
  if(S.fxToday&&S.fxToday.cold)p*=1.05;
  if(S.fxToday&&S.fxToday.hunger)p*=1.08;
  p*=1+S.signatures.length*.02;
  if(S.renameCd>0)p*=.95;
  return Math.max(2.5, Math.round(p*2)/2);
}
function cakePrice(fills){
  let p=S.base; fills.forEach(id=>p+=F(id).c*1.5);
  return Math.max(2, Math.round(p*2)/2);
}
