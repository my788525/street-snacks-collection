/* 巷口小吃合集 · 公共引擎 features3.js */
/* 巷口蛋烘糕 · features3.js · P2 全家桶 */

/* ---------- 节日限定（按真实日历日期，跨年可复现） ---------- */
function festOn(fid){ const f=GAME.festivals.find(x=>x.fid===fid); return !!f&&festActive(f); }
function festActive(f){
  if(!f)return false;
  const now=new Date(), ny=now.getFullYear();
  const start=new Date(ny,f.m-1,f.d,0,0,0);
  const end=new Date(ny,f.m-1,f.d+(f.span||0),23,59,59);
  return now>=start && now<=end;
}
function festToday(){ return GAME.festivals.find(f=>festActive(f))||null; }

/* ---------- 原料相性 ---------- */
function pairMod(fills){ let m=0; GAME.pairs.forEach(p=>{ if(fills.includes(p.a)&&fills.includes(p.b))m+=p.m; }); return m; }
function pairSeenTick(fills){
  GAME.pairs.forEach(p=>{
    if(fills.includes(p.a)&&fills.includes(p.b)&&!S.pairSeen.includes(p.n)){ S.pairSeen.push(p.n); }
  });
}

/* ---------- 选址与预热 ---------- */
function spotFlow(){ return (GAME.spots[S.spot]||GAME.spots.metro).flow; }
function spotPsych(){ return (GAME.spots[S.spot]||GAME.spots.metro).psych; }
function preheatClick(){
  S.preheat=(S.preheat||0)+50;
  if(S.preheat>150){ S.preheat=0; toast('🔥 预热过头！锅都烫手了，重新来','bad'); SFX.fail(); }
  else { toast('🔥 生火 +50°（当前 '+S.preheat+'°，超过 150 会翻车）','good'); SFX.pop(); }
  renderPrep(); save();
}

/* ---------- 备货扩展卡（选址/零钱/健康证/家当） ---------- */
function extraPrepCards3(){
  let h='';
  if(S.prebook&&S.prebook.day===S.day){
    h+=`<div class="h2" style="margin:14px 0 8px">📒 今日预订</div><div class="card">
      <div class="row"><div class="mktIcon">📒</div><div class="grow"><div class="mktName"><div class="n">${S.prebook.fills.map(id=>F(id).n).join('+')} × ${S.prebook.left}/${S.prebook.n}</div>
      <div class="p">已收定金 ${money(S.prebook.paid)} · 做不出来双倍退还 · 营业时点预订卡交付</div></div></div></div></div>`;
  }
  h+=`<div class="h2" style="margin:14px 0 8px">📍 今日选址</div><div class="prepGrid">`;
  Object.keys(GAME.spots).forEach(k=>{
    const s=GAME.spots[k];
    h+=`<div class="opt ${S.spot===k?'sel':''}" data-spot="${k}"><div class="t">${s.ic} ${s.n}</div><div class="d">${s.d}</div>
    <div class="tiny" style="margin-top:4px;color:var(--caramel)">客流 ×${s.flow} · 心理价 ×${s.psych}</div></div>`;
  });
  h+=`</div>
  <div class="row" style="margin-top:8px"><div class="grow"><div class="t">🔥 生火预热</div><div class="tiny mut">出摊前预热铁锅：开摊头几秒升温 +${S.preheat||0}°</div></div>
  <button class="btn ${(S.preheat||0)>=150?'ghost':''}" id="pHeat">加 +50°</button></div>`;
  h+=`<div class="h2" style="margin:14px 0 8px">💰 零钱与合规</div><div class="card">
    <div class="mktRow"><div class="mktIcon">💵</div><div class="mktName"><div class="n">零钱储备</div><div class="p">${money(S.change||0)} · 差 5 毛找不开会被迫抹零（口碑小扣）${S.day>=5||S.premises>=2?' · 已开通扫码支付，无忧':''}</div></div>
    <div class="stepper"><button data-change="10">换 ¥10</button></div></div>
    ${S.health?'<div class="mktRow"><div class="mktIcon">🩺</div><div class="mktName"><div class="n">健康证</div><div class="p">抽检时底气十足</div></div><span class="pill leaf">已办</span></div>'
      :`<div class="mktRow"><div class="mktIcon">🩺</div><div class="mktName"><div class="n">办健康证 · ¥50</div><div class="p">食品抽检必备，不然罚款 100–300</div></div><div class="stepper"><button data-health="1" ${S.money>=50?'':'disabled'}>办</button></div></div>`}
  </div>`;
  const invVal=[...GAME.fillings,...GAME.baseItems].reduce((a,it)=>a+(it.base?S[it.id]:(S.inv[it.id]||0))*priceOf(it),0);
  const premVal=[0,300,2000,6000,20000][S.premises]||0;
  h+=`<div class="h2" style="margin:14px 0 8px">🏠 家当盘点</div><div class="card">
    <div class="billRow"><span>💵 现金</span><b>${money(S.money)}</b></div>
    <div class="billRow"><span>📦 库存食材</span><b>${money(invVal)}</b></div>
    <div class="billRow"><span>${GAME.premises[S.premises].ic} 场地（${GAME.premises[S.premises].n}）</span><b>${money(premVal)}</b></div>
    <div class="divider"></div>
    <div class="billRow"><span>总家当</span><b class="repUp">${money(S.money+invVal+premVal)}</b></div>
    <div class="tiny mut" style="margin-top:6px">累计经营 ${S.day} 天 · 卖出 ${S.stats.sold} 个 · 累计营收 ${money(S.stats.earn)} · 上缴城管 ${money(S.stats.fine)}</div>
  <div class="tiny mut">🔥 口碑热度 ${Math.round(S.buzz==null?60:S.buzz)} · 📅 连续签到 ${S.streak||0} 天${S.stats.referrals?(' · 📣 安利拉新 '+S.stats.referrals):''}</div>
  </div>`;
  if(S.premises>=1){
    h+=`<div class="h2" style="margin:14px 0 8px">🧑‍🍳 雇人</div><div class="card">`;
    if(S.helper===0){
      h+=`<div class="row"><div class="grow"><div class="t">雇帮工 · ¥200 入职 + ¥80/天</div><div class="tiny mut">自动出简单单馅${V('piece')}（质量 76），你专注火候和准头</div></div>
      <button class="btn ${S.money>=200?'leaf':'ghost'}" id="pHire1" ${S.money>=200?'':'disabled'}>雇</button></div>`;
    }else if(S.helper===1){
      h+=`<div class="row"><div class="grow"><div class="t">帮工在岗 · ¥80/天</div><div class="tiny mut">手快，偶尔偷吃馅料（并没有）</div></div>
      <button class="btn ghost" id="pFire1">辞退</button></div>`;
      if(S.premises>=3)h+=`<div class="row" style="margin-top:8px"><div class="grow"><div class="t">升店长 · ¥600 转岗 + ¥200/天</div><div class="tiny mut">质量 85，全场顾客耐心 +10%</div></div><button class="btn ${S.money>=600?'leaf':'ghost'}" id="pHire2" ${S.money>=600?'':'disabled'}>升</button></div>`;
    }else{
      h+=`<div class="row"><div class="grow"><div class="t">店长在岗 · ¥200/天</div><div class="tiny mut">质量 85，全场顾客耐心 +10%</div></div>
      <button class="btn ghost" id="pFire2">辞退</button></div>`;
    }
    h+=`</div>`;
    h+=`<div class="h2" style="margin:14px 0 8px">🛵 外卖平台</div><div class="card">
      <div class="row"><div class="grow"><div class="t">上线外卖 · 抽成 20%</div><div class="tiny mut">不占排队位但占出餐台；超时差评。每单口碑 +0.3</div></div>
      <button class="btn ${S.waimai?'rouge':'leaf'}" id="pWaimai">${S.waimai?'下线':'上线'}</button></div></div>`;
  }
  return h;
}
function bindExtraPrep3(){
  $$('#prepBody [data-spot]').forEach(b=>b.onclick=()=>{ SFX.click(); S.spot=b.dataset.spot; renderPrep(); save(); });
  const hb=$('#pHeat'); if(hb)hb.onclick=preheatClick;
  $$('#prepBody [data-change]').forEach(b=>b.onclick=()=>{
    if(S.money<10){toast('没钱换零钱了','bad');return}
    S.money-=10; S.change=(S.change||0)+10; SFX.coin(); toast('换了 10 块零钱','good'); renderPrep(); save();
  });
  $$('#prepBody [data-health]').forEach(b=>b.onclick=()=>{
    if(S.money<50||S.health)return;
    S.money-=50; S.health=true; SFX.ding(); toast('🩺 健康证到手','gold'); renderPrep(); hudUpdate(); save();
  });
  const h1=$('#pHire1'); if(h1)h1.onclick=()=>{ if(S.money<200)return; S.money-=200; S.helper=1; SFX.ding(); toast('🧑‍🍳 帮工入职！日薪 ¥80','gold'); renderPrep(); save(); };
  const h2=$('#pHire2'); if(h2)h2.onclick=()=>{ if(S.money<600)return; S.money-=600; S.helper=2; SFX.fanfare(); toast('🧑‍🍳 店长升任！','gold'); renderPrep(); save(); };
  const f1=$('#pFire1'); if(f1)f1.onclick=()=>{ S.helper=0; toast('帮工被辞退了…','bad'); renderPrep(); save(); };
  const f2=$('#pFire2'); if(f2)f2.onclick=()=>{ S.helper=1; toast('店长降回帮工','bad'); renderPrep(); save(); };
  const wm=$('#pWaimai'); if(wm)wm.onclick=()=>{ S.waimai=!S.waimai; G.online=null; toast(S.waimai?'🛵 外卖上线了':'外卖下线了',S.waimai?'gold':'bad'); renderPrep(); save(); };
}

/* ---------- 变质与食物中毒 ---------- */
function spoilDecay(){
  Object.keys(S.spoil||{}).forEach(id=>{
    S.spoil[id]--;
    if(S.spoil[id]<=0){
      if((S.inv[id]||0)>0&&!S.rotten.includes(id)){ S.rotten.push(id); toast('🤢 '+F(id).n+' 变质了！卖出去会食物中毒，建议去备货页丢弃','bad'); }
      delete S.spoil[id];
    }
  });
}

/* ---------- 抽检 ---------- */
function eventInspect(){
  const rottenHas=(S.rotten||[]).some(id=>(S.inv[id]||0)>0);
  const ok=!!S.health&&!rottenHas;
  const warnOnly=!S.health&&!S.inspectWarned;
  modal(`<div class="h2">🧾 食品抽检</div>
    <div class="tiny mut" style="margin:6px 0">工作人员戴上了白手套。</div>
    <div class="deskNote">口罩手套：✅<br>健康证：${S.health?'✅':'❌ 未办理'}${warnOnly?'（首违免罚，口头警告）':''}<br>食材日期：${rottenHas?'❌ 发现变质食材':'✅'}</div>
    <div class="tiny center mut" style="margin-top:8px">${ok?'全部合规，抽检员竖了大拇指':(warnOnly?'首次违规，教育为主':rottenHas?'变质食材可是大问题':'等待处理…')}</div>
    <button class="btn big" id="inspOk" style="width:100%;margin-top:10px">接受结果</button>`,
    {onMount:(box,close)=>{
      box.querySelector('#inspOk').onclick=()=>{
        close();
        if(warnOnly){ S.inspectWarned=true; toast('🧾 首违免罚！下次记得办健康证（¥50）','good'); SFX.ding(); save(); return; }
        if(ok){ S.rep=clamp(S.rep+2,0,100); toast('🧾 抽检通过，口碑 +2','good'); SFX.ding(); }
        else{
          const fine=Math.min(S.money,ri(100,300));
          S.money-=fine; G.day.fines+=fine; S.stats.fine+=fine;
          S.rep=clamp(S.rep-3,0,100);
          toast('🧾 抽检不合格！罚款 '+money(fine),'bad'); SFX.fail(); shake();
        }
        save();
      };
    }});
}
function eventHeirloom(){
  const cands=GAME.pairs.filter(p=>!S.pairSeen.includes(p.n));
  if(!cands.length){ toast('📜 残页展开是张外卖单，晦气','bad'); return; }
  const p=pick(cands);
  S.pairSeen.push(p.n); S.clues=(S.clues||0)+1;
  SFX.ding();
  if(S.clues>=3){
    S.clues=0;
    const cand=GAME.fillings.find(f=>f.lv>=3&&f.lv<=5&&!S.earlyUnlock.includes(f.id)&&!unlockedFillings().some(u=>u.id===f.id));
    modal(`<div class="h2">📜 祖传残页集齐</div><div class="deskNote">你悟到了：${p.n}</div>
      ${cand?`<div class="tiny center" style="margin:10px 0">残页尽头还夹着一味配方——提前解锁 <b>${cand.ic}${cand.n}</b>！</div>`:'<div class="tiny center mut" style="margin:10px 0">该悟的都已经悟了</div>'}
      <button class="btn big" data-close style="width:100%">妙哉</button>`,
      {onMount:(box,close)=>{
        if(cand){ S.earlyUnlock.push(cand.id); toast('📜 提前解锁 '+cand.n,'gold'); }
      }});
  }else{
    modal(`<div class="h2">📜 祖传残页（${S.clues}/3）</div><div class="deskNote">你悟到了：${p.n}<br>集齐 3 张残页有大机缘。</div>
      <button class="btn big" data-close style="width:100%">收好</button>`);
  }
  save();
}

/* ---------- 帮工 ---------- */
function helperTick(dt){
  if(!S.helper)return;
  G.helperT=(G.helperT===undefined?8:G.helperT)-dt;
  if(G.helperT>0)return;
  G.helperT=S.helper===2?7:11;
  for(let i=0;i<G.queue.length;i++){
    const c=G.queue[i];
    if(!c.order||c.order.fills.length>1)continue;
    const si=G.serve.findIndex(s=>s&&s.q>=.5&&s.fills.length===c.order.fills.length&&c.order.fills.every(f=>s.fills.includes(f)));
    if(si<0)continue;
    const s=G.serve[si]; G.serve[si]=null; renderServe();
    const price=cakePrice(s.fills);
    S.money+=price; G.day.sold++; G.day.rev+=price;
    G.day.qSum+=S.helper===2?.85:.76; G.day.qN++;
    S.rep=clamp(S.rep+.2,0,100); addXp(5); S.stats.sold++; S.stats.earn+=price;
    jump(c.el,(S.helper===2?'店长':'帮工')+' +'+money(price),'var(--sky)'); SFX.pop();
    const idx=G.queue.indexOf(c);
    if(idx>=0){ if(c.el){c.el.classList.add('leaving');setTimeout(()=>c.el.remove(),380);} G.queue.splice(idx,1); }
    setTimeout(renderQueue,120);
    return;
  }
}
function helperWages(){ return S.helper===1?80:(S.helper===2?200:0); }

/* ---------- 外卖平台 ---------- */
function spawnOnline(){
  const pool=unlockedFillings(), n=chance(.5)?1:2, fills=[];
  for(let i=0;i<n;i++){ const f=pick(pool); if(!fills.includes(f.id))fills.push(f.id); }
  G.online={fills,t:80,no:(G.onlineN=(G.onlineN||0)+1)};
  toast('🛵 新外卖订单（'+fills.map(f=>F(f).n).join('+')+'）80 秒','gold'); SFX.warn();
  renderQueue(); renderDayChip();
}
function onlineTick(dt){
  if(!S.waimai)return;
  G.onlineT=(G.onlineT===undefined?18:G.onlineT)-dt;
  if(!G.online&&G.onlineT<=0){ G.onlineT=ri(22,32); spawnOnline(); }
  if(G.online){
    G.online.t-=dt;
    if(G.online.t<=0){ S.rep=clamp(S.rep-1,0,100); toast('🛵 外卖超时，喜提差评','bad'); G.online=null; renderQueue(); renderDayChip(); }
  }
}
function serveOnline(){
  if(!G.online)return;
  const si=G.serve.findIndex(s=>s&&s.q>=.5&&s.fills.length===G.online.fills.length&&G.online.fills.every(f=>s.fills.includes(f)));
  if(si<0){ toast(GAME.flow.tray+'没有这个外卖单的'+V('piece'),'bad'); return; }
  const s=G.serve[si]; G.serve[si]=null; renderServe();
  const price=Math.max(.5,currentPrice(s)*.8);
  S.money+=price; G.day.sold++; G.day.rev+=price; G.day.qSum+=s.q; G.day.qN++;
  S.rep=clamp(S.rep+.3,0,100); addXp(8); S.stats.sold++; S.stats.earn+=price;
  jump($('#onlineCard'),'+'+money(price)+'（抽成20%）','var(--leaf-d)'); SFX.coin();
  G.online=null; renderQueue(); renderDayChip();
}

/* ---------- 月度美食榜 ---------- */
function monthStart(){ S.month={soldBase:S.stats.sold,perfectBase:S.stats.perfect,fineBase:S.stats.fine}; }
function monthEnd(){
  const sold=S.stats.sold-(S.month?S.month.soldBase:0);
  const perfect=S.stats.perfect-(S.month?S.month.perfectBase:0);
  const fine=S.stats.fine-(S.month?S.month.fineBase:0);
  const score=Math.round(S.signatures.length*100+perfect*5+sold+S.rep*2-fine*.5);
  const rivals=[
    {n:V('competitor'),s:Math.round(600+S.day*36+rnd()*300)},
    {n:V('rival2'),s:Math.round(500+S.day*30+rnd()*260)},
    {n:'夜市新秀·蛋亲王',s:Math.round(700+S.day*40+rnd()*320)},
    {n:S.shopName,s:score},
  ];
  rivals.sort((a,b)=>b.s-a.s);
  const rank=rivals.findIndex(r=>r.n===S.shopName)+1;
  if(rank===1){ S.stats.monthWin++; S.money+=500; S.rep=clamp(S.rep+5,0,100); }
  else S.rep=clamp(S.rep+1,0,100);
  SFX.fanfare();
  modal(`<div class="h1 center">🏆 月度美食榜</div>
    <div class="tiny mut center">第 ${Math.ceil(S.day/30)} 个月 · 本月售出 ${sold} 个 · 完美 ${perfect} 次</div>
    <div class="card" style="margin:10px 0">${rivals.map((r,i)=>`<div class="billRow"><span>${['🥇','🥈','🥉','4️⃣'][i]} ${esc(r.n)}</span><b>${r.s} 分</b></div>`).join('')}</div>
    <div class="center h2" style="color:${rank===1?'var(--caramel)':'var(--ink2)'}">${rank===1?'冠军！奖金 ¥500，口碑 +5':'第 '+rank+' 名，口碑 +1'}</div>
    <button class="btn big" data-close style="width:100%;margin-top:10px">下个月继续</button>`);
  monthStart();
}

/* ---------- 多结局 ---------- */
function checkEndings(){
  const cands=[];
  if(S.premises>=4&&S.money>=20000)cands.push({id:'tycoon',n:'餐饮大亨',d:'旗舰店 + 2 万流动资金，你可以上市了'});
  if(S.rep>=95&&S.day>=15)cands.push({id:'legend',n:'巷口传奇',d:'口碑 95+，整条街认你这块招牌'});
  if(S.signatures.length>=3&&(S.stats.bloggerWin||0)>=3)cands.push({id:'star',n:'网红暴发户',d:'三道招牌 + 三次爆红，流量玩明白了'});
  const fresh=cands.filter(c=>!S.endings.includes(c.id));
  if(!fresh.length)return;
  const c=fresh[0];
  modal(`<div class="h1 center">🎬 结局达成</div>
    <div class="center h2" style="color:var(--caramel);margin:8px 0">${c.n}</div>
    <div class="tiny mut center">${c.d}</div>
    <div class="tiny mut center" style="margin-top:6px">可以见好就收拿称号，也可以贪心地继续经营。</div>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" id="endKeep">继续经营</button>
    <button class="btn leaf grow" id="endTake">见好就收</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#endKeep').onclick=()=>{ close(); toast('野心家，继续','gold'); };
      box.querySelector('#endTake').onclick=()=>{ close(); S.endings.push(c.id); victoryExit(c); };
    }});
}
function victoryExit(c){
  SFX.fanfare();
  saveMeta({runs:(metaGet().runs||0)+1, hardDone:!!(metaGet().hardDone||S.diff==='hard')});
  modal(`<div class="h1 center">🎬 大结局</div>
    <div class="center h2" style="color:var(--caramel);margin:8px 0">${c.n}</div>
    <div class="card" style="margin:10px 0">
      <div class="billRow"><span>经营天数</span><b>${S.day} 天</b></div>
      <div class="billRow"><span>卖出${V('good')}</span><b>${S.stats.sold} ${V('unit')}</b></div>
      <div class="billRow"><span>累计营收</span><b>${money(S.stats.earn)}</b></div>
      <div class="billRow"><span>招牌菜</span><b>${S.signatures.length} 道</b></div>
      <div class="billRow"><span>解锁结局</span><b>${S.endings.join('、')}</b></div>
    </div>
    <div class="deskNote">江湖路远，${V('good')}永流传。传承奖励照旧。</div>
    <button class="btn big leaf" id="winOk" style="width:100%;margin-top:10px">带着荣耀重新开摊</button>`,
    {onMount:(box,close)=>{
      box.querySelector('#winOk').onclick=()=>{
        close();
        newGame(S.playerName,S.shopName,{money:true,deaths:S.deaths||0,hint:S.signatures[0]||null},S.diff);
        startDay(true); show('prep');
        toast('传承生效：启动金 +'+money(BAL.legacyMoney),'gold');
      };
    }});
  save();
}

/* ---------- 吆喝与锅神 ---------- */
function yell(){
  if(!G.running)return;
  const now=Date.now();
  if(G.lastYell&&now-G.lastYell<8000){ toast('嗓子需要 CD…','bad'); return; }
  G.lastYell=now; G.hypeT=10;
  SFX.warn();
  setTimeout(()=>SFX.tone(720,.16,'square',.18),140);
  setTimeout(()=>SFX.tone(560,.22,'square',.18),330);
  toast(pick(GAME.yellLines),'gold');
}
function prayGod(){
  if(!G.running||G.godUsed)return;
  G.godUsed=true; SFX.warn();
  if(chance(.4)){ G.godT=30; toast('🙏 锅神显灵！30 秒内出锅质量提升','gold'); SFX.fanfare(); }
  else toast(pick(['锅神今天休假','香烧完了，将就烧','锅神表示看不懂你的操作']),'bad');
}

/* ---------- 事件连锁 ---------- */
function chainTick(){
  if(S.chainBulk){ S.chainBulk=false; eventBulk(); toast('📢 流量余温发作：大单找上门','gold'); }
  else if(S.chainFair){ S.chainFair=false;
    modal(`<div class="h2">🎪 美食节邀请函</div><div class="tiny mut" style="margin:6px 0">凭上次团购的口碑，你被邀请参加明日美食节：交 ¥100 摊位费，单日客流 ×3。</div>
      <div class="row"><button class="btn ghost grow" data-close>不去</button><button class="btn leaf grow" id="fairGo">交钱赴约</button></div>`,
      {onMount:(box,close)=>{
        box.querySelector('#fairGo').onclick=()=>{
          close();
          if(S.money<100){ toast('摊位费不够，只能婉拒','bad'); return; }
          S.money-=100; G.day.prep+=100;
          S.buffs.push({id:'fair',name:'美食节',ic:'🎪',days:1,flow:true});
          toast('🎪 明日美食节！客流大涨','gold'); SFX.fanfare();
        };
      }});
  }
}

/* ---------- 熟客预订订金 ---------- */
function offerPrebook(){
  if(S.prebook||!chance(.22))return;
  const pool=unlockedFillings(), n=ri(2,4);
  const fills=[pick(pool).id];
  if(chance(.5)){ const f=pick(pool); if(!fills.includes(f.id))fills.push(f.id); }
  const deposit=n*2;
  modal('<div class="h2">📒 熟客预订</div>'+
    '<div class="tiny mut" style="margin:6px 0">老顾客想预订明天的 '+n+' 个「'+fills.map(id=>F(id).n).join('+')+'」，先付定金 '+money(deposit)+'。明天做不出来要双倍退还。</div>'+
    '<div class="row"><button class="btn ghost grow" data-close>不接，没这个产能</button><button class="btn leaf grow" id="pbOk">接单 +'+money(deposit)+'</button></div>',
    {onMount:(box,close)=>{
      box.querySelector('#pbOk').onclick=()=>{
        close(); S.prebook={fills,n,left:n,paid:deposit,day:S.day+1};
        S.money+=deposit; SFX.coin(); toast('📒 预订成功，明天见','gold'); save();
      };
    }});
}
function initPrebook(){ G.prebook=(S.prebook&&S.prebook.day===S.day)?S.prebook:null; }
function servePrebook(){
  if(!G.prebook)return;
  const si=G.serve.findIndex(s=>s&&s.q>=.5&&s.fills.length===G.prebook.fills.length&&G.prebook.fills.every(f=>s.fills.includes(f)));
  if(si<0){ toast('出餐台没有预订的那款','bad'); return; }
  const s=G.serve[si]; G.serve[si]=null; renderServe();
  const unit=G.prebook.paid/G.prebook.n;
  const price=Math.max(.5,currentPrice(s)-unit);
  S.money+=price; G.day.sold++; G.day.rev+=price; G.day.qSum+=s.q; G.day.qN++;
  G.prebook.left--;
  jump($('#prebookCard'),'+'+money(price),'var(--leaf-d)'); SFX.coin();
  if(G.prebook.left<=0){
    S.rep=clamp(S.rep+1.5,0,100); addXp(30);
    toast('📒 预订全部交付！熟客很满意','gold'); SFX.ding();
    S.prebook=null; G.prebook=null;
  }
  renderQueue(); renderDayChip(); save();
}
function settlePrebook(){
  if(!G.prebook||G.prebook.left<=0)return;
  const penalty=G.prebook.paid*2;
  S.money=Math.max(0,S.money-penalty); G.day.fines+=penalty;
  S.rep=clamp(S.rep-2,0,100);
  toast('📒 预订没做完，双倍退还定金 '+money(penalty),'bad'); SFX.fail();
  S.prebook=null; G.prebook=null;
}
function fpsTick(dt){
  G.frames=(G.frames||0)+1; G.fpsT=(G.fpsT||0)+dt;
  if(G.fpsT>=1){
    const fps=G.frames/G.fpsT; G.frames=0; G.fpsT=0;
    G.lowFrames=fps<45?(G.lowFrames||0)+1:0;
    if(G.lowFrames>=2&&!G.lowPerf){ G.lowPerf=true; toast('检测到卡顿，已自动降低特效','bad'); }
  }
}
function wakeLockOn(){
  if(navigator.wakeLock){ navigator.wakeLock.request('screen').then(l=>{G.wakeLock=l}).catch(()=>{}); }
}
function wakeLockOff(){ if(G.wakeLock){ try{G.wakeLock.release()}catch(e){} G.wakeLock=null; } }
function loadVConsoleIfDebug(){
  if(location.search.indexOf('debug')<0)return;
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/vConsole/3.15.1/vconsole.min.js';
  s.onload=()=>{ try{ new VConsole(); }catch(e){} };
  document.head.appendChild(s);
}

/* ---------- 顾客好感度 + 社会工程学顾客 AI（第 2 阶段） ---------- */
const LOYAL_AT=75;                 // 好感度达到视为“老主顾”
function aff(id){
  if(!S.affinity)S.affinity={};
  if(S.affinity[id]==null)S.affinity[id]=50;
  return S.affinity[id];
}
function affInfluence(type){
  if(type.special==='blogger')return 4;       // 探店博主：一票顶四票
  if(type.special==='regular')return 2.2;     // 熟客：街坊传播节点
  if(type.id==='uncle')return 1.7;            // 大爷大妈：菜场情报站
  if(type.id==='tourist')return 1.4;          // 游客：爱发小红书
  if(type.id==='worker')return 1.2;           // 上班族：午休口碑
  return 1;                                   // 学生等：基础声量
}
function affBump(id,d){
  const v=clamp(aff(id)+d,0,100);
  S.affinity[id]=v;
  S.stats.affMax=Math.max(S.stats.affMax||0,v);
}
function buzzBump(d){ S.buzz=S.buzz==null?60:S.buzz; S.buzz=clamp(S.buzz+d,0,100); }
function wPick(list,weights){
  let t=0; for(const w of weights)t+=w; let r=rnd()*t;
  for(let i=0;i<list.length;i++){ r-=weights[i]; if(r<=0)return list[i]; }
  return list[list.length-1];
}

/* ---------- 顾客记忆传播链（第 3 阶段） ---------- */
const LOYAL_VISITS=5;                 // 被服务满这么多次 + 好感够高，才成“老主顾”
const CUST_SURNAMES=['王','李','张','刘','陈','杨','赵','周','吴','徐','孙','马'];
const CUST_TITLES=['叔','姨','哥','姐','师傅','婶'];
function custMem(id){
  if(!S.custMem)S.custMem={};
  if(!S.custMem[id])S.custMem[id]={fav:null,visits:0,loyal:false,lastSat:0,nick:null};
  return S.custMem[id];
}
function isLoyal(id){ return !!(S.custMem&&S.custMem[id]&&S.custMem[id].loyal); }
/* 服务完一位顾客后调用：累计 visit、记住老规矩、达阈值升级老主顾 */
function rememberCustomer(id,fills,sat){
  const m=custMem(id);
  m.visits=(m.visits||0)+1;
  m.lastSat=sat;
  if(fills&&fills.length)m.fav=[...fills];     // 记住他们常点的，作为“老规矩”
  if(!m.loyal && aff(id)>=LOYAL_AT && m.visits>=LOYAL_VISITS){
    m.loyal=true;
    if(!m.nick)m.nick=pick(CUST_SURNAMES)+pick(CUST_TITLES);
    S.stats.loyalCount=(S.stats.loyalCount||0)+1;
    return 'newLoyal';
  }
  return null;
}


/* ---------- 夹生纠纷 ---------- */
function rawDispute(price){
  modal(`<div class="h2">😾 “里面是生的！”</div>
    <div class="tiny mut" style="margin:6px 0">一位顾客举着半凝固的${V('good')}，周围安静了。</div>
    <div class="row" style="flex-direction:column;gap:8px">
      <button class="btn leaf" id="rwRefund" style="width:100%">退钱重修（−${money(price)}，口碑 −1）</button>
      <button class="btn ghost" id="rwArgue" style="width:100%">据理力争（五五开）</button>
      <button class="btn sky" id="rwPolice" style="width:100%">📞 报警处理${S.license?'（有证，加分）':''}</button>
    </div>`,
    {onMount:(box,close)=>{
      box.querySelector('#rwRefund').onclick=()=>{ close(); S.money=Math.max(0,S.money-price); S.rep=clamp(S.rep-1,0,100); toast('破财消灾','bad'); };
      box.querySelector('#rwArgue').onclick=()=>{ close();
        if(chance(.5)){ const fine=Math.min(S.money,30); S.money-=fine; G.day.fines+=fine; S.stats.fine+=fine; S.rep=clamp(S.rep-3,0,100); toast('吵输了，赔了 '+money(fine),'bad'); SFX.fail(); }
        else { S.rep=clamp(S.rep-1,0,100); toast('吵赢了，但围观群众拍了视频…','bad'); }
      };
      box.querySelector('#rwPolice').onclick=()=>{ close();
        if(S.license){ S.rep=clamp(S.rep+1,0,100); toast('证件齐全，警察叔叔支持你','good'); }
        else { const fine=Math.min(S.money,50); S.money-=fine; G.day.fines+=fine; S.stats.fine+=fine; toast('无证经营被一并处理…','bad'); SFX.fail(); }
      };
    }});
}
