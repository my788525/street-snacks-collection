/* 巷口小吃合集 · 公共引擎 prep.js */
/* 巷口蛋烘糕 · prep.js · 自动拆分自 index.html，请在此文件内继续维护 */

/* ---------- 备货页 ---------- */
function renderPrep(){
  const W=GAME.weathers.find(w=>w.id===S.weather), WI=GAME.winds.find(w=>w.id===S.wind);
  const pm=GAME.premises[S.premises], nx=GAME.premises[S.premises+1];
  const psych=psychPrice(), cap=pm.pmax+2;
  let h='';
  h+=`<div class="card taped">
    <div class="row"><span style="font-size:30px">${pm.ic}</span>
      <div class="grow"><div class="h2">${esc(S.shopName)}</div>
      <div class="tiny mut">${esc(S.playerName)} · ${pm.n} · 日租 ${money(rentOf())}${S.rentMul>1?' <s style="color:var(--rouge-d)">通胀了</s>':''}</div></div>
      <button class="btn ghost tiny" id="pCodex">📖 图鉴</button>
      <button class="btn ghost tiny" id="pRename">换招牌</button></div>
    <div class="divider"></div>
    <div class="row wrap" style="gap:6px">
      <span class="pill sky">${W.ic} ${W.n} · ${W.desc}</span>
      <span class="pill">🌪️ ${WI.n}</span>
      ${festToday()?`<span class="pill" style="background:var(--yolk)">🎏 ${esc(festToday().name)}：限定馅料上架！</span>`:''}
      ${S.dayType==='taste'?'<span class="pill leaf">😋 尝鲜日：新组合更易出惊喜</span>':S.dayType==='safe'?'<span class="pill sky">🧣 保守日：顾客只点经典款</span>':''}
      ${S.renameCd>0?`<span class="pill rouge">换牌震荡：老客户回流中（${S.renameCd} 天）</span>`:''}
      ${S.buffs.map(b=>`<span class="pill leaf">${b.ic} ${b.name}（${b.days}天）</span>`).join('')}
    </div>
    <div class="tiny mut" style="margin-top:8px">今日心理价位 ≈ <b style="color:var(--caramel)">${fmt(psych)}</b> · 超过 1.3 倍会有客人扭头就走</div>
  </div>`;
  const DLT=dayLenTotal();
  h+=`<div class="tiny mut" style="margin-top:4px">⏱ 今日营业约 <b style="color:var(--caramel)">${fmt(Math.round(DLT))} 秒</b>（${Math.round(DLT/60*10)/10} 分钟）· 出摊后右上角有倒计时</div>`;
  // 发酵
  h+=`<div class="h2" style="margin:14px 0 8px">🫙 ${V('prepName')}</div><div class="prepGrid">`;
  GAME.ferms.forEach(f=>{
    h+=`<div class="opt ${S.ferm===f.id?'sel':''}" data-f="${f.id}">
      <div class="t">${f.n}</div><div class="d">${f.d}</div>
      <div class="tiny" style="margin-top:4px;color:var(--caramel)">${V('batter')} +${f.batter} 份 · 质量 ×${f.q} · 🌾需 ${fermFlourNeed(f)}${f.cost?' · '+V('yeast')+' ¥'+f.cost:''}</div></div>`;
  });
  h+=`</div><div class="tiny mut" style="margin-top:6px">当前${V('batter')}库存：<b>${S.batter}</b> 份${S.batterBatches&&S.batterBatches.length?`（${S.batterBatches.length} 批）`:''}（1 份 = 1 ${V('unit')}）。可重复选${V('fermWay')}方式<b>分批和面</b>，但出摊后约 <b>${Math.round(batterSpoilSec())}</b> 秒没卖完的批次会<b>发酸倒掉</b>——带多了浪费，带少了不够卖，自己拿捏。</div>`;
  // 市场
  h+=`<div class="h2" style="margin:14px 0 4px">🧺 菜市场进货</div><div class="card">`;
  const rows=[...GAME.baseItems.map(b=>({...b,qty:S[b.id]||0,isBase:true})),
              ...unlockedFillings().map(f=>({...f,qty:S.inv[f.id]||0}))];
  rows.forEach(it=>{
    const p=priceOf(it), old=it.c;
    const dir=p>old*1.08?'priceUp':(p<old*.92?'priceDown':'');
    h+=`<div class="mktRow">
      <div class="mktIcon">${it.ic}</div>
      <div class="mktName"><div class="n">${it.n}${it.cold?(S.rotten&&S.rotten.includes(it.id)?' <span class="pill rouge" style="font-size:10px">已变质⚠</span>':' <span class="pill sky" style="font-size:10px">冷藏·剩'+((S.spoil&&S.spoil[it.id])||0)+'天</span>'):''}${it.fest?' <span class="pill" style="font-size:10px">节日限定</span>':''}${it.lv?' <span class="pill" style="font-size:10px">Lv'+it.lv+'</span>':''}</div>
      <div class="p">${fmt(p)}/份 <s>${fmt(old)}</s> <span class="${dir}">${dir==='priceUp'?'↑':dir==='priceDown'?'↓':''}</span> · 库存 <b id="qty_${it.id}">${it.qty}</b></div></div>
      <div class="stepper">${S.rotten&&S.rotten.includes(it.id)?`<button data-rot="${it.id}">🗑</button>`:''}<button data-buy="${it.id}">+</button></div></div>`;
  });
  h+=`</div><div class="tiny mut" style="margin-top:4px">今日进货已花：<b id="prepSpent">${fmt(G.day?G.day.prep:0)}</b>（买${V('flour')}只进货，去「和面」才变成${V('batter')}：1 ${V('flour')}→${BAL.batterPerFlour} ${V('batter')}）</div>`;
  // 定价
  const ex1=cakePrice([pick(unlockedFillings()).id]);
  h+=`<div class="h2" style="margin:14px 0 8px">🏷️ 定价</div><div class="card">
    <div class="row"><div class="grow"><div class="t">手工底价</div><div class="tiny mut">馅料按成本 ×1.5 另加，单${V('unit')}上限约 ${fmt(cap)}</div></div>
    <div class="stepper"><button id="pMinus">−</button><div class="v" id="pVal">${fmt(S.base)}</div><button id="pPlus">+</button></div></div>
    <div class="divider"></div>
    <div class="tiny mut">参考：单馅${V('piece')} ≈ ${fmt(S.base+0.7)} · 双馅${V('piece')} ≈ ${fmt(S.base+1.4)} · 心理价位 ${fmt(psych)}${S.base+1.4>psych*1.3?' <b style="color:var(--rouge-d)">⚠ 偏贵，小心没人买</b>':''}</div>
  </div>`;
  // 营销
  h+=`<div class="h2" style="margin:14px 0 8px">📣 今日营销（讽刺向，量力而行）</div><div class="card">
    <div class="row"><div class="grow"><div class="t">营销预算</div><div class="tiny mut">计入今日成本；预算不够广告会打水漂</div></div>
    <input type="range" id="pBudget" min="0" max="200" step="10" value="${S.budget}" style="flex:1;accent-color:var(--caramel)">
    <b id="budVal">${money(S.budget)}</b></div>
    <div class="divider"></div>
    <div class="prepGrid">`;
  GAME.ads.forEach((a,i)=>{
    const risk=S.rep<70&&a.risk;
    h+=`<div class="opt ${S.adTier===i?'sel':''}" data-a="${i}">
      <div class="t">${a.n}${a.cost?' · '+money(a.cost)+'/天':''}</div>
      <div class="d">${a.line}</div>
      <div class="tiny" style="margin-top:4px;color:${risk?'var(--rouge-d)':'var(--leaf-d)'}">客流 +${Math.round(a.flow*100)}%${risk?' · ⚠ 口碑不足，小心被打假':''}</div></div>`;
  });
  h+=`<div class="row" style="margin-top:10px"><div class="grow"><div class="t">🤤 试吃价（新组合半价）</div><div class="tiny mut">每日前 3 个没见过的组合半价招募试吃，翻车不伤口碑——排雷专用</div></div>
  <button class="btn ${S.tasting?'leaf':'ghost'}" id="pTaste" style="min-height:38px">${S.tasting?'开':'关'}</button></div>`;
  h+=`</div></div>`;
  // 升级
  h+=`<div class="h2" style="margin:14px 0 8px">🏗️ 场地</div><div class="card">`;
  h+=`<div class="row"><span style="font-size:26px">${pm.ic}</span><div class="grow"><div class="t">${pm.n}</div>
    <div class="tiny mut">排队上限 ${pm.cap} 人 · 满意度 ${pm.sat>0?'+':''}${pm.sat} · 可定价 ≤ ${fmt(pm.pmax)} · 城管风险 ${pm.cg}</div></div></div>`;
  if(nx){
    const afford=S.money>=nx.up;
    h+=`<div class="divider"></div><div class="row"><div class="grow"><div class="t">升级：${nx.ic} ${nx.n}</div>
      <div class="tiny mut">排队 ${nx.cap} 人 · 满意度 +${nx.sat} · 定价 ≤ ${fmt(nx.pmax)} · 城管 ${nx.cg} · 日租 ${money(nx.rent*S.rentMul*diffOf().rent)}</div></div>
      <button class="btn ${afford?'leaf':'ghost'}" id="pUp" ${afford?'':'disabled'}>${money(nx.up)}</button></div>
      ${!afford?`<div class="tiny mut" style="margin-top:4px">还差 ${money(nx.up-S.money)}，别急，攒钱也是经营</div>`:''}`;
  }else{
    h+=`<div class="divider"></div><div class="tiny mut">已是最高场地。接下来，追求镇店之宝和全图鉴吧。</div>`;
  }
  h+=`</div>`;
  if(S.signatures.length){
    h+=`<div class="h2" style="margin:14px 0 8px">🏷️ 招牌管理（饥饿营销）</div><div class="card">`;
    S.signatures.forEach(k=>{
      const lim=S.limits[k]||0;
      h+=`<div class="mktRow"><div class="mktIcon">🏆</div><div class="mktName"><div class="n">${esc(S.known[k].name||k)}</div><div class="p">${k.split('+').map(id=>F(id).n).join('+')} · 售罄可攒口碑</div></div>
      <div class="stepper"><button data-lim="${k}" data-v="-5">−</button><div class="v">${lim===0?'不限':lim}</div><button data-lim="${k}" data-v="5">+</button></div></div>`;
    });
    h+=`<div class="tiny mut" style="margin-top:6px">限量制造稀缺：挂牌售罄时没买到的顾客明天更早来（口碑 +0.4）。0 = 不限量。</div></div>`;
  }
  h+=extraPrepCards();
  h+=extraPrepCards3();
  // 库存总览
  const stock=GAME.baseItems.map(b=>b.n+' '+(S[b.id]||0)).join(' · ')+' · '+V('batter')+' '+(S.batter||0);
  h+=`<div class="deskNote" style="margin:12px 0">📋 库存：${stock}<br>今日天气 ${W.ic}${W.n} · 明日预告 ${GAME.weathers.find(w=>w.id===S.tomorrow).ic}${GAME.weathers.find(w=>w.id===S.tomorrow).n}</div>`;
  $('#prepBody').innerHTML=h;
  if(typeof staggerIn==='function')staggerIn($('#prepBody'));
  bindPrep();
}
/* 市场购买 1 份（含「库存 0 点 + 变 NaN」修复：未知/空值一律按 0 起步） */
function buyOne(id){
  const it=[...GAME.baseItems,...GAME.fillings].find(x=>x.id===id);
  if(!it)return;
  const p=priceOf(it);
  if(S.money<p){SFX.fail();toast('钱不够，先去挣','bad');return}
  S.money-=p; G.day.prep+=p;
  if(it.base){ S[id]=(S[id]||0)+1; }
  else S.inv[id]=(S.inv[id]||0)+1;
  if(it.cold)S.spoil[id]=2;
  SFX.coin();
  const q=$('#qty_'+id); if(q)q.textContent=it.base?S[id]:S.inv[id];
  $('#prepSpent')&&($('#prepSpent').textContent=fmt(G.day.prep));
  hudUpdate(); save();
}
function fermMake(f){
  const need=fermFlourNeed(f);
  if((S.flour||0)<need){toast('面粉不够，先去菜市场买🌾','bad');SFX.fail();return false}
  if(f.cost&&S.money<f.cost){toast('连'+V('yeast')+'都买不起了…','bad');return false}
  S.flour-=need; S.ferm=f.id;
  const prev=(S.batter||0);
  addBatter(f.batter,f.q);
  if(f.cost){S.money-=f.cost;G.day.prep+=f.cost}
  SFX.pop(); toast(V('batter')+'又和了 +'+(S.batter-prev)+' 份（耗🌾'+need+'·共 '+S.batter+' 份·可继续分批）','good');
  return true;
}
function bindPrep(){
  $$('#prepBody [data-f]').forEach(el=>el.onclick=()=>{
    SFX.click();
    const f=GAME.ferms.find(x=>x.id===el.dataset.f);
    if(fermMake(f)){ renderPrep(); hudUpdate(); save(); }
  });
  $$('#prepBody [data-buy]').forEach(b=>b.onclick=()=>{ buyOne(b.dataset.buy); });
  const vm=()=>{$('#pVal').textContent=fmt(S.base)};
  $('#pMinus').onclick=()=>{SFX.click();S.base=Math.max(1,S.base-.5);vm();renderPrep();save()};
  $('#pPlus').onclick=()=>{SFX.click();S.base=Math.min(8,S.base+.5);vm();renderPrep();save()};
  $('#pBudget').oninput=e=>{S.budget=+e.target.value;$('#budVal').textContent=money(S.budget);save()};
  $$('#prepBody [data-a]').forEach(el=>el.onclick=()=>{SFX.click();S.adTier=+el.dataset.a;renderPrep();save()});
  $('#pRename').onclick=renameShop;
  $('#pCodex').onclick=()=>{SFX.click();openCodex()};
  const pt=$('#pTaste'); if(pt)pt.onclick=()=>{SFX.click();S.tasting=!S.tasting;renderPrep();save()};
  $$('#prepBody [data-lim]').forEach(b=>b.onclick=()=>{const k=b.dataset.lim;S.limits[k]=Math.max(0,(S.limits[k]||0)+(+b.dataset.v));SFX.click();renderPrep();save()});
  bindExtraPrep(); bindExtraPrep3();
  $$('#prepBody [data-rot]').forEach(b=>b.onclick=()=>{ const id=b.dataset.rot; S.inv[id]=0; S.rotten=S.rotten.filter(x=>x!==id); SFX.pop(); toast('已丢弃变质的'+F(id).n,'good'); renderPrep(); save(); });
  const up=$('#pUp'); if(up)up.onclick=upgradePremises;
}
function renameShop(){
  modal(`<div class="h2">🔨 换块新招牌</div>
    <div class="tiny mut" style="margin:6px 0 10px">装修费 ¥30。老客户会懵一阵：接下来 2 天熟客变少、心理价位 −5%。</div>
    <div class="field"><label>新店名</label><input id="renameInp" maxlength="12" value="${esc(S.shopName)}"></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" data-close>再想想</button>
    <button class="btn leaf grow" id="renameOk">花 ¥30 换名</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#renameOk').onclick=()=>{
        const v=box.querySelector('#renameInp').value.trim();
        if(!v){toast('名字不能空着','bad');return}
        if(S.money<30){SFX.fail();toast('装修费不够','bad');return}
        S.money-=30; G.day.prep+=30; S.shopName=v; S.renameCd=2; S.rep=clamp(S.rep-1,0,100);
        SFX.ding(); toast('“'+v+'” 的新招牌挂上了','gold'); close(); renderPrep(); hudUpdate(); save();
      };
    }});
}
function upgradePremises(){
  const nx=GAME.premises[S.premises+1]; if(!nx||S.money<nx.up)return;
  modal(`<div class="h2">${nx.ic} 升级：${nx.n}</div>
    <div class="tiny mut" style="margin:6px 0 10px">转让费 + 装修一次性 ${money(nx.up)}，退租只退押金——重决策，想清楚。</div>
    <div class="deskNote">排队上限 ${GAME.premises[S.premises].cap} → <b>${nx.cap}</b> 人<br>满意度修正 ${GAME.premises[S.premises].sat} → <b>+${nx.sat}</b><br>可定价上限 ${fmt(GAME.premises[S.premises].pmax)} → <b>${fmt(nx.pmax)}</b><br>城管风险 ${GAME.premises[S.premises].cg} → <b>${nx.cg}</b><br>日租 ${money(GAME.premises[S.premises].rent)} → <b>${money(nx.rent*S.rentMul)}</b>/天</div>
    <div class="field" style="margin-top:10px"><label>换个店名？（老客户会懵 2 天）</label><input id="upRename" maxlength="12" value="${esc(S.shopName)}"></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" data-close>再攒攒</button>
    <button class="btn leaf grow" id="upOk">签约 ${money(nx.up)}</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#upOk').onclick=()=>{
        S.money-=nx.up; S.premises++; S.rep=clamp(S.rep+3,0,100);
        saveMeta({everUpgraded:true});
        const v=box.querySelector('#upRename').value.trim();
        if(v&&v!==S.shopName){S.shopName=v;S.renameCd=2;toast('换牌震荡：老客户回流中 2 天','bad')}
        SFX.fanfare(); toast('场地升级：'+nx.name_zh||nx.n,'gold');
        close(); renderPrep(); hudUpdate(); save();
      };
    }});
}
