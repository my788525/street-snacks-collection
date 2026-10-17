/* 巷口小吃合集 · 公共引擎 service.js */
/* 巷口蛋烘糕 · service.js · 营业页：铁锅、火候、排队、加馅出锅、随机事件 */

const FCOLOR={sugar:'#ffffff',brownsugar:'#8B4A1F',sesame:'#6b5b48',peanut:'#c8956c',cream:'#fff6df',strawberry:'#e9607e',salad:'#f2e3b0',ham:'#e08a6a',potato:'#e8d29a',yacai:'#9a6b3f',zacai:'#a8b06a',rousong:'#c98a5a',choco:'#4a2c1e',cheese:'#f5c95c',jiangdou:'#7a9a5a',lurou:'#8b4a2f',oreo:'#3a3a3a',latiao:'#d95d5d',matcha:'#7fa05a',guwei:'#b0894a',durian:'#e8d88a'};
const WINDOW_LO=70, WINDOW_HI=300, SERVE_LO=240, SERVE_HI=430, BURN_AT=460;
const FIRE_RATE=[0,-4,3,8,15];

function startService(){
  if(S.batter<=0){ toast('没'+V('batter')+'了，先'+V('fermDone')+'！','bad'); SFX.fail(); return; }
  const ad=GAME.ads[S.adTier];
  if(S.adTier>0&&S.budget<ad.cost*1.2){ toast('预算 '+money(S.budget)+' 撑不起「'+ad.n+'」，广告打了水漂','bad'); S.adTier=0; }
  if(S.adTier>0){ const c=GAME.ads[S.adTier].cost; S.money-=c; G.day.prep+=c; }
  show('service');
  initService();
}
function initService(){
  G.wells=Array.from({length:7},()=>({st:'empty',heat:0,fills:[],foldHeat:0,smoke:[],bub:0,shock:0,pourT:1,bubbles:[],drops:[],steam:[],wob:0,foldT:1,spark:null}));
  G.serve=[null,null,null];
  G.queue=[]; G.fire=2; G.dayT=0; G.gasUsed=0; G.picked=-1;
  G.eventCd=Math.round(ri(16,26)*diffOf().evt); G.watch=[]; G.watchMode=false; G.bulk=null; G.arrivalAcc=0; G.nextArrive=1.2;
  G.gasOut=false; G.batchNo=0; G.combo=0; G.tastings=0; startLimits(); initPrebook();
  if(!G.day)G.day=freshDayRec();
  G.godUsed=false; G.godT=0; G.hypeT=0; G.onlineT=18; G.online=null; G.preheatT=6; G.preheatV=S.preheat||(S.day<=BAL.newbieDays?50:0); G.helperT=8; G.frames=0; G.fpsT=0;
  renderFire(); renderQueue(); renderServe(); renderFillTray(); renderDayChip();
  if(!$('#btnYell')){
    const y=document.createElement('button'); y.id='btnYell'; y.className='btn ghost tiny'; y.textContent='📣 吆喝';
    y.style.cssText='position:absolute;top:6px;right:62px;z-index:5;min-height:32px;padding:2px 10px';
    y.onclick=yell; $('#panWrap').appendChild(y);
    const g=document.createElement('button'); g.id='btnGod'; g.className='btn ghost tiny'; g.textContent='🙏 拜锅神';
    g.style.cssText='position:absolute;top:6px;right:122px;z-index:5;min-height:32px;padding:2px 10px';
    g.onclick=prayGod; $('#panWrap').appendChild(g);
  }
  wakeLockOn();
  setTimeout(chainTick,3000);
  if(S.day<=1)setTimeout(()=>toast('🚔 城管队今日团建，街道一片祥和','good'),2600);
  const loyalN=(S.custMem?Object.values(S.custMem).filter(m=>m.loyal).length:0);
  if(loyalN>0&&S.day>1)setTimeout(()=>toast('🏠 '+loyalN+' 位老主顾今天又来捧场了——街坊生意，得靠回头客','good'),2400);
  if(!$('#btnCloseShop')){
    const b=document.createElement('button'); b.id='btnCloseShop'; b.className='btn ghost tiny';
    b.textContent='收摊'; b.style.cssText='position:absolute;top:6px;right:10px;z-index:5;min-height:32px;padding:2px 10px';
    b.onclick=()=>{SFX.click();endService()};
    $('#panWrap').appendChild(b);
  }
  SFX.sizzleOn(); SFX.sizzleSet(1);
  G.running=true; G.last=performance.now();
  cancelAnimationFrame(G.raf); G.raf=requestAnimationFrame(serviceLoop);
}
function renderDayChip(){
  let chip=$('#dayChip');
  if(!chip){
    chip=document.createElement('div'); chip.id='dayChip';
    chip.style.cssText='position:absolute;top:8px;left:10px;z-index:5;font-size:11px;background:rgba(255,253,247,.9);border:1.5px solid var(--ink);border-radius:99px;padding:2px 10px';
    $('#panWrap').appendChild(chip);
  }
  const W=GAME.weathers.find(w=>w.id===S.weather);
  let t=W.ic+' '+W.n+' · 🌪️'+GAME.winds.find(w=>w.id===S.wind).n;
  if(G.bulk)t+=' · 🏢团购 '+G.bulk.left+'/'+G.bulk.need;
  if(G.online)t+=' · 🛵外卖';
  if(G.combo>=2)t+=' · 🔥连击x'+G.combo;
  if(S.buzz>=75)t+=' · 🔥人气旺';
  else if((S.buzz==null?60:S.buzz)<=30)t+=' · ❄冷清';
  if(G.gasOut)t+=' · ⚠断气';
  chip.textContent=t;
}
function dayLenTotal(){ return (S.day<=2?200:BAL.dayLen)*(diffOf().dayLen||1); }
/* 营业页常驻状态条：今日倒计时 + 燃气瓶数与当前瓶消耗%（解决“不知道燃气消耗情况”） */
function renderStoveStatus(){
  let p=$('#stoveStatus');
  if(!p){
    p=document.createElement('div'); p.id='stoveStatus';
    p.style.cssText='position:absolute;top:8px;right:10px;z-index:5;font-size:11px;background:rgba(255,253,247,.92);border:1.5px solid var(--ink);border-radius:12px;padding:5px 8px;min-width:124px;box-shadow:0 2px 0 rgba(61,44,30,.18)';
    $('#panWrap').appendChild(p);
  }
  const total=dayLenTotal(), remain=Math.max(0,total-G.dayT);
  const mm=Math.floor(remain/60), ss=Math.floor(remain%60);
  const tstr=(mm>0?mm+'分':'')+ss+'秒';
  const tpct=clamp(remain/total*100,0,100);
  const rem=Math.max(0,S.gas*BAL.gasCanCap-G.gasUsed);
  const cansLeft=clamp(S.gas-Math.floor(G.gasUsed/BAL.gasCanCap),0,S.gas);
  const curUsed=clamp((G.gasUsed%BAL.gasCanCap)/BAL.gasCanCap*100,0,100);
  const tcol=remain<total*.2?'var(--rouge-d)':'var(--caramel)';
  const gcol=G.gasOut?'var(--rouge)':(rem<BAL.gasCanCap?'var(--yolk-d)':'var(--leaf)');
  // 低气提醒：剩最后一瓶且已用掉 65% 起 → 脉动；断气 → 强红抖 + 震动
  const low=!G.gasOut && rem<BAL.gasCanCap*0.35;
  if(G.gasOut){ p.classList.add('out'); p.classList.remove('low'); }
  else if(low){ p.classList.add('low'); p.classList.remove('out'); }
  else { p.classList.remove('low','out'); }
  if((G.gasOut||low)&&!p.dataset.warned){
    p.dataset.warned='1';
    if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(G.gasOut?[200,80,200]:120);
  }
  if(!G.gasOut&&!low)p.dataset.warned='';
  p.innerHTML=
    '<div style="display:flex;justify-content:space-between;font-weight:700;line-height:1.2"><span>⏱ 今日</span><span>'+tstr+'</span></div>'+
    '<div class="meter"><i style="width:'+tpct+'%;background:'+tcol+'"></i></div>'+
    '<div style="display:flex;justify-content:space-between;font-weight:700;margin-top:4px;line-height:1.2"><span>🛢 燃气 ×'+cansLeft+'</span>'+
      '<span style="'+(G.gasOut?'color:var(--rouge-d)':'')+'">'+(G.gasOut?'断气':('已用'+Math.round(curUsed)+'%'))+'</span></div>'+
    '<div class="meter"><i style="width:'+(100-curUsed)+'%;background:'+gcol+'"></i></div>';
}
const FIRE_NAMES=['关火','文火','中火','武火'];
function setFire(f){
  f=clamp(f|0,0,3);
  if(G.gasOut&&f>1){ toast('燃气不足，只剩文火…','bad'); SFX.fail(); return; }
  if(f!==G.fire)SFX.knobTick();
  G.fire=f; renderKnob(); SFX.sizzleSet(f);
}
function renderKnob(){
  const rot=[-90,0,90,180][G.fire]||0;
  const face=$('#knobFace'); if(face)face.style.setProperty('--rot',rot+'deg');
  const val=$('#knobVal'); if(val)val.innerHTML=FIRE_NAMES[G.fire]+'<small>'+['−4','+3','+8','+15'][G.fire]+'/s</small>';
  $$('#fireRow .fireBtn').forEach(b=>{
    const f=+b.dataset.f;
    b.classList.toggle('on',f===G.fire);
    b.style.opacity=(G.gasOut&&f>1)?.35:'';
    b.onclick=()=>setFire(f);
  });
}
function renderFire(){ renderKnob(); }

/* ---------- 顾客 ---------- */
function arrivalInterval(){
  const ad=S.adTier?GAME.ads[S.adTier]:null;
  let eff=0;
  if(ad&&S.budget>=ad.cost*1.2)eff=ad.flow*Math.min(1,S.budget/(ad.cost*2.5));
  let rate=8*(S.fxToday.flow||1)*(0.7+S.rep/150)*(1+eff)*(1+S.signatures.length*.06)*skillHype()*spotFlow()*(diffOf().arrival||1);
  if(G.hypeT>0)rate*=1.35;
  if(S.buffs.some(b=>b.flow))rate*=1.3;
  if(S.renameCd>0)rate*=.82;
  if(S.buffs.some(b=>b.id==='rival'))rate*=.75;
  rate*=(0.85+(S.buzz==null?60:S.buzz)/300);   // 口碑热度：人多越聚人（社会认同）
  return Math.max(1.6,60/Math.max(1.5,rate));
}
function makeOrder(type){
  let pool=unlockedFillings();
  if(S.dayType==='safe'){ const sp=pool.filter(f=>f.tags.includes('基础')||type.like.some(t=>f.tags.includes(t))); if(sp.length)pool=sp; }
  const w=pool.map(f=>{
    let s=1;
    if(G.windTags.some(t=>f.tags.includes(t)))s+=1.2;
    if(type.like.some(t=>f.tags.includes(t)))s+=1;
    if(f.cold&&S.fxToday.cold)s+=.8;
    if(type.id==='student'&&f.tags.includes('争议'))s+=1.2;
    return s;
  });
  const wpick2=list=>{let t=0;const ww=list.map((_,i)=>w[i]);ww.forEach(x=>t+=x);let r=rnd()*t;for(let i=0;i<list.length;i++){r-=ww[i];if(r<=0)return list[i]}return list[0]};
  const n=type.id==='worker'?1:(chance(.5)?1:2)+(type.id==='tourist'&&chance(.4)?1:0);
  const fills=[];for(let i=0;i<Math.min(3,n);i++){const f=wpick2(pool);if(f&&!fills.includes(f.id))fills.push(f.id)}
  const done=chance(.6)?'std':(chance(.5)?'rare':'old');
  const hidden=chance(.25)?pick(['hot','warm','neat']):null;
  // 60% 概率只点有库存的（店主推荐），40% 可能点到缺货——触发缺货告知
  if(chance(.6)){
    const inStock=pool.filter(f=>(S.inv[f.id]||0)>0);
    if(inStock.length===pool.length||inStock.length)pool=inStock;
  }
  return {fills,done,hidden};
}
function tryArrive(){
  if(G.queue.length>=GAME.premises[S.premises].cap){
    if(chance(.3)){ lostCustomer('队伍太长，看看就走'); }
    return;
  }
  let type, referred=false, broughtBy=null, fromName=null;
  if(G.bringFriend && chance(.5)){              // 顾客记忆传播链：朋友/熟人介绍来的新客
    const pool=GAME.customers.filter(c=>c.special!=='blogger'&&c.special!=='regular');
    if(pool.length){ type=pick(pool); broughtBy=G.bringFriend.from; fromName=G.bringFriend.fromName; G.bringFriend=null;
      G.day.friendBrings=(G.day.friendBrings||0)+1; S.stats.friendBrings=(S.stats.friendBrings||0)+1; }
  }
  if(!type && G.referNext && chance(.5)){       // 社会工程学：被安利来的新客
    const pool=GAME.customers.filter(c=>c.special!=='blogger'&&c.special!=='regular');
    if(pool.length){ type=pick(pool); referred=true; G.referNext=null; }
  }
  if(!type){
    const pool=GAME.customers.filter(c=>c.special!=='blogger'&&c.special!=='regular');
    const w=pool.map(c=>1+aff(c.id)/100);     // 好感越高的客群越常来（回头客）
    type=wPick(pool,w);
    const regC=GAME.customers.find(c=>c.id==='regular'); if(regC&&chance(.22))type=regC;
    const blogC=GAME.customers.find(c=>c.id==='blogger'); if(blogC&&chance(.08))type=blogC;
  }
  const psych=psychPrice();
  // “随便”概率按客群细分：大爷/街坊最随性，游客最挑，博主从不随便
  const WHATEVER_P={uncle:.42, regular:.3, worker:.18, student:.14, tourist:.1};
  const whatever=(type.special!=='blogger')&&chance(WHATEVER_P[type.id]??.15);
  const order=whatever?{fills:[],done:'std',whatever:true}:makeOrder(type);
  const price=cakePrice(order.fills);
  if(!whatever){
    if(price>psych*1.5&&chance(.55)){ lostCustomer('“'+money(price)+'？抢劫哦！”'); return; }
    if(price>psych*1.3&&chance(.22)){ lostCustomer('“啧，吃不起吃不起。”'); return; }
  }
  const c={
    type, order:order, whatever, referred, broughtBy, fromName,
    pat:(skillPat(type.pat*(S.day<=BAL.newbieDays?BAL.newbiePat:1))*(S.helper>=2?1.1:1)*(1+(S.fxToday.pat||0)/100)*(S.premises>=3?1.3:1)*(S.fxToday.hunger?.9:1)*(0.9+(S.buzz==null?60:S.buzz)/500)),
    wait:0, el:null, barEl:null, said:false,
    hello:(type.order&&type.order.length)?pick(type.order):'',
  };
  if(whatever){ /* 随便：不挑口味，出餐优先级最低、满意度波动更大 */ }
  else if(type.special==='regular'&&S.mood&&S.mood.fav)c.order={fills:[...S.mood.fav],done:'std'};
  else { const m=custMem(type.id); if(m.loyal&&m.fav&&m.fav.length){ c.order={fills:[...m.fav],done:'std'}; c.usual=true; } }  // 老主顾点老规矩
  if(referred||broughtBy)S.affinity[type.id]=Math.max(aff(type.id),60);
  c.max=c.pat;
  c.umb=(S.weather==='rain'||S.weather==='storm')&&chance(.5);
  c.short=!!(c.order&&c.order.fills.some(id=>(S.inv[id]||0)<=0));
  G.queue.push(c); renderQueue(); hudUpdate();
  if(type.special==='blogger'){
    c.vip=true; c.pat=150; c.max=150; c.wantsFresh=false;
    toast('🎥 探店博主来了！他点了 '+c.order.fills.map(f=>F(f).n).join('+')+' —— 优先做他的，接待好了一飞冲天','gold');
  }
}
function lostCustomer(line){
  S.stats.left++; G.day.left++; buzzBump(-1.5);
  toast(line,'bad');
}
/* 缺货告知：现实中店主的处理——告知换一个 / 承认没有让他走 / 嘴硬端替代品 */
function shortModal(c){
  const miss=c.order.fills.filter(id=>(S.inv[id]||0)<=0).map(id=>F(id).n);
  modal('<div class="h2">🈲 「'+miss.join('、')+'」卖完了</div>'+
    '<div class="tiny mut" style="margin:6px 0">'+c.type.ic+c.type.n+'点的馅料没库存了。现实中店主会告知客人换一个——或者嘴硬说“有”，端出一份将就的。</div>'+
    '<div class="row" style="flex-direction:column;gap:8px;margin-top:8px">'+
    '<button class="btn leaf" id="shSwap" style="width:100%">🗣️ 告知没了，请换一个（耐心 −8 秒）</button>'+
    '<button class="btn ghost" id="shAdmit" style="width:100%">😅 承认没有，客人走人（口碑 −0.5）</button>'+
    '<button class="btn sky" id="shClose" style="width:100%">不管，端个替代品试试（满意度打折）</button></div>',
    {onMount:(box,close)=>{
      box.querySelector('#shSwap').onclick=()=>{
        close();
        const stock=unlockedFillings().filter(f=>(S.inv[f.id]||0)>0);
        if(!stock.length){ toast('库存全空，想换也没得换…','bad'); return; }
        const n=c.order.fills.length, fills=[];
        for(let i=0;i<n;i++){ const f=pick(stock); if(!fills.includes(f.id))fills.push(f.id); }
        c.order.fills=fills.length?fills:[stock[0].id];
        c.short=false; c.pat=Math.max(15,c.pat-8); c.max=Math.max(15,c.max-8);
        renderQueue(); SFX.ding();
        toast('🗣️ “没得那个了，换这个嘛？”——客人想了想，同意了','good');
      };
      box.querySelector('#shAdmit').onclick=()=>{
        close();
        const idx=G.queue.indexOf(c);
        if(idx>=0){ if(c.el){c.el.classList.add('leaving');setTimeout(()=>c.el.remove(),380);} G.queue.splice(idx,1); }
        G.day.left++; S.stats.left++; S.rep=clamp(S.rep-.5,0,100);
        SFX.fail(); toast('“啧，早说嘛。”——客人转身走了','bad');
        setTimeout(renderQueue,120);
      };
      box.querySelector('#shClose').onclick=()=>{ close(); toast('（客人还在等。用现有馅料交差可以，满意度打折）','bad'); };
    }});
}
function renderQueue(){
  const z=$('#queueZone'); z.innerHTML='';
  G.queue.forEach((c,i)=>{
    const d=document.createElement('div'); d.className='cust'+(c.short?' short':'')+(c.vip?' vip':'');
    let icons=c.whatever?'🙆':(c.order?c.order.fills.map(f=>F(f).ic).join(''):(c.type.special==='blogger'?'🎥':'❔'));
    if(c.type.special==='blogger')icons='🎥'+icons;
    if(c.order&&c.order.hidden)icons+={hot:'🔥',warm:'🍵',neat:'📦'}[c.order.hidden];
    if(c.umb)icons='☂️'+icons;
    if(c.short)icons='🈲'+icons;
    if(c.wantsFresh)icons='🆕'+icons;
    if(c.broughtBy)icons='🤝'+icons;
    else if(c.referred)icons='📣'+icons;
    else if(aff(c.type.id)>=LOYAL_AT)icons='❤️'+icons;
    const orderHtml=c.whatever?'🙆 随便':(c.order?c.order.fills.map(f=>{
      const miss=(S.inv[f]||0)<=0;
      return '<span style="'+(miss?'color:var(--rouge-d);text-decoration:line-through':'')+'">'+F(f).n+'</span>';
    }).join('+')+(c.order.done!=='std'?'·'+GAME.doneness.find(x=>x.id===c.order.done).n:'')+(c.wantsFresh?'·<b style="color:var(--caramel)">要现做</b>':'')+(c.short?'·缺货':'')+(c.order.hidden?'·'+({hot:'烫嘴',warm:'温热',neat:'别洒'})[c.order.hidden]:''):'观察中…');
    d.innerHTML=`<div class="custBubble">${icons}</div>
      <div class="custFace"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
      <div class="custName">${c.type.ic}${c.type.n}</div>
      <div class="custSay">${c.hello||''}</div>
      <div class="custOrder">${orderHtml}</div>
      <div class="custPat"><div class="bar"><i style="width:100%;background:var(--leaf)"></i></div></div>`;
    c.el=d; c.barEl=d.querySelector('.bar>i'); c.faceEl=d.querySelector('.custFace');
    if(c.short)d.onclick=()=>shortModal(c);
    z.appendChild(d);
  });
  // 团购卡
  if(G.bulk){
    const d=document.createElement('div'); d.className='cust'; d.id='bulkCard';
    d.innerHTML=`<div class="custBubble">🏢 团购</div>
      <div class="custFace" style="background:#DCE9F7"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
      <div class="custName">公司下午茶</div>
      <div class="custOrder">还差 ${G.bulk.left} 个 · ${Math.ceil(G.bulk.t)}s</div>
      <div class="custPat"><div class="bar"><i style="width:${G.bulk.left/G.bulk.need*100}%"></i></div></div>`;
    d.onclick=()=>serveBulk();
    z.insertBefore(d,z.firstChild);
  }
  if(G.online){
    const d=document.createElement('div'); d.className='cust'; d.id='onlineCard';
    d.innerHTML=`<div class="custBubble">🛵 外卖</div>
      <div class="custFace" style="background:#DCE9F7"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
      <div class="custName">外卖订单</div>
      <div class="custOrder">${G.online.fills.map(f=>F(f).n).join('+')} · ${Math.ceil(G.online.t)}s</div>
      <div class="custPat"><div class="bar"><i style="width:${G.online.t/80*100}%"></i></div></div>`;
    d.onclick=serveOnline;
    z.appendChild(d);
  }
  if(G.prebook){
    const d=document.createElement('div'); d.className='cust'; d.id='prebookCard';
    d.innerHTML=`<div class="custBubble">📒 预订</div>
      <div class="custFace" style="background:#F2E8D5"><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div></div>
      <div class="custName">熟客预订</div>
      <div class="custOrder">${G.prebook.fills.map(f=>F(f).n).join('+')} · 还差 ${G.prebook.left} 个</div>
      <div class="custPat"><div class="bar"><i style="width:${(G.prebook.n-G.prebook.left)/G.prebook.n*100}%"></i></div></div>`;
    d.onclick=servePrebook;
    z.appendChild(d);
  }
  hudUpdate();
}
function updateQueueDom(){
  G.queue.forEach(c=>{
    if(!c.barEl)return;
    const p=Math.max(0,1-c.wait/c.max);
    c.barEl.style.width=(p*100)+'%';
    c.barEl.style.background=p>.5?'var(--leaf)':(p>.25?'var(--yolk-d)':'var(--rouge)');
    if(p<.3&&!c.said){ c.said=true; if(c.faceEl)c.faceEl.classList.add('angry'); }
  });
  if(G.bulk){
    const bc=$('#bulkCard');
    if(bc){ bc.querySelector('.custOrder').textContent='还差 '+G.bulk.left+' 个 · '+Math.ceil(G.bulk.t)+'s';
      bc.querySelector('.bar>i').style.width=(G.bulk.left/G.bulk.need*100)+'%'; }
  }
}

/* ---------- 出餐台 ---------- */
function renderServe(){
  const r=$('#serveRow'); r.innerHTML='';
  G.serve.forEach((s,i)=>{
    const d=document.createElement('div');
    d.className='serveSlot'+(s?' filled':'')+(s&&s.q>=.9?' perfect':'')+(s&&s.q<.7?' wonky':'');
    if(s){
      d.innerHTML=`<span>${s.fills.map(f=>F(f).ic).join('')}</span>
        <span class="q">${s.q>=.9?' perfect':''}${(s.q*100|0)}</span>
        ${s.q>=.9?'<span class="star">⭐</span>':''}
        <span class="priceTag"></span>
        <span class="coolBar"><i></i></span>
        <button class="trashBtn" title="丢掉这个餐">🗑</button>`;
      d.onclick=()=>serveFromTray(i);
      const tb=d.querySelector('.trashBtn');
      if(tb)tb.onclick=e=>{e.stopPropagation();discardServe(i)};
    }else d.textContent='+';
    r.appendChild(d);
  });
}
const TRASH_LINES=['含泪倒进垃圾桶','又一位烈士诞生','“可惜了，狗都不吃”','默默倒掉，心在滴血','将成为今日年度垃圾','泔水桶的声音，是心碎的声音'];
function discardServe(i){
  const s=G.serve[i]; if(!s)return;
  const waste=BAL.cakeBase+s.fills.reduce((a,id)=>a+F(id).c,0);
  G.day.waste++; G.day.cost+=waste;
  G.serve[i]=null; renderServe();
  SFX.fail();
  toast('🗑 '+pick(TRASH_LINES)+'（损耗 '+money(waste)+'）','bad');
}
function renderFillTray(){
  const t=$('#fillTray');
  t.innerHTML='<div class="tiny mut" style="padding:8px">馅料在备货时采购；点能加料的锅会<b>弹出选料窗</b>，放好馅后，'+GAME.flow.fold+'——绿圈内完美，圈外越远越歪。做好自动上'+GAME.flow.tray+'：烫嘴 🔥 晾 2–5 秒客人才端走；临期会降价，但挑剔的客人不要临期（🆕 要现做）；24 秒放黑变质只能 🗑 丢掉</div>';
  let fl=$('#fillFloat');
  if(G.picked<0){ if(fl)fl.remove(); return; }
  const w=G.wells[G.picked];
  if(!fl){
    fl=document.createElement('div'); fl.id='fillFloat';
    fl.innerHTML='<div class="ffCard"><div id="ffTitle" class="h2" style="text-align:center"></div><div id="ffBtns"></div><button class="btn leaf" id="ffOk" style="width:100%;min-height:44px">选好了</button></div>';
    $('#app').appendChild(fl);
    // 点空白处 = 取消（已选的馅保留在锅里，与旧版一致）
    fl.addEventListener('click',e=>{
      if(e.target!==fl)return;
      SFX.click(); G.picked=-1; renderFillTray(); drawPan();
    });
  }
  fl.style.display='flex';
  $('#ffTitle').textContent='🥣 选馅（已选 '+w.fills.length+'/3）';
  const btns=$('#ffBtns'); btns.innerHTML='';
  unlockedFillings().forEach(f=>{
    const on=w.fills.includes(f.id);
    const stock=(S.inv[f.id]||0)+(on?1:0);
    const b=document.createElement('button');
    b.className='fillBtn'+(on?' used':'');
    b.disabled=!on&&stock<=0;
    b.innerHTML=f.ic+'<span>'+f.n+'</span><small>'+stock+'</small>';
    b.onclick=()=>{
      SFX.pop();
      const idx=w.fills.indexOf(f.id);
      if(idx>=0){ w.fills.splice(idx,1); S.inv[f.id]=(S.inv[f.id]||0)+1; }
      else{
        if(w.fills.length>=3){ toast('一'+V('unit')+'最多 3 种馅，做人不能太贪','bad'); return; }
        if((S.inv[f.id]||0)<=0){ toast(f.n+'没库存了，明天进货','bad'); return; }
        w.fills.push(f.id); S.inv[f.id]=(S.inv[f.id]||0)-1;
      }
      renderFillTray(); drawPan(); save();
    };
    btns.appendChild(b);
  });
  $('#ffOk').onclick=()=>{
    SFX.click(); G.picked=-1; renderFillTray(); drawPan();
    if(w.fills.length>0)toast('选好了～火候到了就'+GAME.flow.fold,'gold');
  };
}

/* ---------- 锅的操作 ---------- */
function wellR(){
  const cv=$('#panCanvas'); if(!cv)return 40;
  const W=cv.clientWidth||300,H=cv.clientHeight||184;
  return Math.min(W/9.2,H*.25);
}
function wellTap(i,hit){
  const w=G.wells[i];
  SFX.click();
  if(w.st==='empty'){
    if(S.batter<=0){ toast(V('batter')+'没了！收摊吧','bad'); SFX.fail(); return; }
    S.batter--; w.st='batter'; w.heat=0; w.fills=[]; w.bub=0; w.foldOff=0; w.lateFill=false;
    w.pourT=0; w.drops=[]; w.bubbles=[]; w.steam=[];
    const R2=wellR();
    for(let k=0;k<6;k++)w.drops.push({a:rnd()*7,d:R2*.55,sp:50+rnd()*50,life:1});
    SFX.pop();
  }else if(w.st==='batter'){
    if(w.fills.length>0&&w.heat>=SERVE_LO){
      foldAt(i,hit);
    }else if(w.heat>=WINDOW_LO){
      G.picked=i; renderFillTray(); drawPan();
      if(w.heat>WINDOW_HI&&w.fills.length===0){ w.lateFill=true; toast('馅加得有点晚，口感微扣','bad'); }
    }else{
      toast('再等等，蜂窝眼还没起来','bad');
    }
  }else if(w.st==='fold'){
    serveFromWell(i);
  }else if(w.st==='burn'){
    w.st='empty'; w.heat=0; w.fills=[]; w.smoke=[]; w.foldOff=0;
    toast('倒掉…又浪费一个','bad'); G.day.waste++;
    SFX.pop();
  }
}
function foldPenalty(off){
  if(off==null||off<.35)return 1;
  if(off<.6)return .93;
  if(off<.8)return .82;
  return .7;
}
function foldAt(i,hit){
  const w=G.wells[i];
  const R=wellR();
  const off=clamp((hit&&hit.dist!=null?hit.dist:R)/R,0,1.2);
  w.foldOff=off; w.foldHeat=w.heat; w.st='fold'; w.foldT=0;
  G.picked=-1; renderFillTray(); drawPan();
  if(off<.35){ SFX.ding(); w.spark={t:0}; vibrate(25); toast('对折漂亮！','good'); }
  else if(off<.6){ toast('折歪了一点点，凑合','bad'); }
  else if(off<.8){ SFX.fail(); toast('折歪了…顾客看在火的份上忍了','bad'); }
  else { SFX.fail(); shake(); vibrate(40); toast('这形状属于行为艺术','bad'); }
  // 现实中做好就放上台，客人自取
  serveFromWell(i);
}
function serveFromWell(i){
  const w=G.wells[i];
  const slot=G.serve.findIndex(s=>!s);
  if(slot<0){ toast('取餐台满了！先等客人拿，或点 🗑 丢掉','bad'); return; }
  G.serve[slot]={fills:w.fills,q:clamp(heatQuality(w.foldHeat)*foldPenalty(w.foldOff)*(w.lateFill?.97:1),0,1.15),foldHeat:w.foldHeat,foldOff:w.foldOff,lateFill:w.lateFill,landedAt:Date.now(),takeDelay:ri(2000,5000)};
  w.st='empty'; w.heat=0; w.fills=[]; w.smoke=[];
  renderServe(); SFX.pop();
}
/* 自动取餐：做好放上台，匹配的客人自己拿（等久了的会将就） */
/* 临期判定与客人接受度 */
function isStale(s){
  return s&&(s.landedAt||0)>0&&(Date.now()-(s.landedAt||Date.now()))/1000>BAL.discountFrom;
}
function staleRefused(c){
  const p=clamp(1-(c.wait||0)/Math.max(1,c.max||1),0,1); // 耐心剩余比例
  let chance=.02+.15*p*p;
  if(c.type.id==='uncle')chance*=.5;    // 大爷大妈最爱打折
  if(c.type.id==='tourist')chance*=1.3; // 游客讲究一点
  if(aff(c.type.id)>=LOYAL_AT)chance*=.4; // 老主顾不挑临期
  return rnd()<chance;
}
function findTaker(s){
  const stale=isStale(s);
  // 探店博主优先：重要人物，优先制餐
  for(let i=0;i<G.queue.length;i++){
    const c=G.queue[i]; if(!c.order||c.type.special!=='blogger')continue;
    if(c.order.fills.length===s.fills.length&&c.order.fills.every(f=>s.fills.includes(f))&&!(stale&&c.wantsFresh))return i;
  }
  // 明确口味的顾客（无明确需求者最后兜底）
  for(let i=0;i<G.queue.length;i++){
    const c=G.queue[i]; if(!c.order||c.whatever)continue;
    if(c.order.fills.length===s.fills.length&&c.order.fills.every(f=>s.fills.includes(f))){
      if(stale&&c.wantsFresh)continue;
      return i;
    }
  }
  let bestI=-1,bestV=0;
  for(let i=0;i<G.queue.length;i++){
    const c=G.queue[i]; if(!c.order||c.whatever)continue;
    if(c.wait<c.max*.35)continue;
    if(stale&&c.wantsFresh)continue;
    const inter=c.order.fills.filter(f=>s.fills.includes(f)).length;
    if(inter>bestV){bestV=inter;bestI=i}
  }
  if(bestI>=0)return bestI;
  for(let i=0;i<G.queue.length;i++){ if(!G.queue[i].order)return i; }
  // 最后才轮到“随便”的客人（任何明确口味优先）
  for(let i=0;i<G.queue.length;i++){ if(G.queue[i].whatever)return i; }
  return -1;
}
function canTake(s){
  if(s.spoiled)return false;
  const key=comboKey(s.fills);
  if(S.banned.includes(key))return false;
  if(S.signatures.includes(key)){
    const lim=S.limits[key]||0;
    if(lim&&(G.limitLeft[key]==null?lim:G.limitLeft[key])<=0)return false;
  }
  if(findTaker(s)>=0)return true;
  if(G.bulk&&s.q>=.5)return true;
  if(G.prebook&&s.fills.length===G.prebook.fills.length&&G.prebook.fills.every(f=>s.fills.includes(f)))return true;
  if(G.online&&s.fills.length===G.online.fills.length&&G.online.fills.every(f=>s.fills.includes(f)))return true;
  return false;
}
function autoDeliver(){
  const now=Date.now();
  for(let si=0;si<G.serve.length;si++){
    const s=G.serve[si]; if(!s)continue;
    // 烫嘴 + 拿取过程：晾 2–5 秒客人才端走
    if(now-(s.landedAt||0)<(s.takeDelay||2500))continue;
    if(canTake(s)){ serveFromTray(si); return; }
  }
}
/* 临期定价：放得越久越便宜，24 秒变黑必须丢 */
function currentPrice(s){
  const age=(Date.now()-(s.landedAt||Date.now()))/1000;
  const d=age>BAL.discountFrom?Math.max(BAL.discountFloor,1-(age-BAL.discountFrom)*BAL.discountRate):1;
  return Math.max(1,Math.round(cakePrice(s.fills)*d*2)/2);
}
function updateServeDom(){
  const row=$('#serveRow'); if(!row)return;
  const now=Date.now();
  G.serve.forEach((s,i)=>{
    const el=row.children[i]; if(!el||!s)return;
    const age=(now-(s.landedAt||now))/1000;
    const p=Math.min(1,(age*1000)/Math.max(1,s.takeDelay||2500));
    const bar=el.querySelector('.coolBar>i');
    if(bar)bar.style.width=(p*100)+'%';
    el.classList.toggle('ready',p>=1&&!s.spoiled);
    el.classList.toggle('hot',p<1);
    el.classList.toggle('stale',age>BAL.staleAt&&!s.spoiled);
    if(age>BAL.spoilAt&&!s.spoiled){
      s.spoiled=true; SFX.fail();
      toast('🪦 一份'+V('good')+'放黑了（变质），只能手动丢掉','bad');
    }
    el.classList.toggle('spoiled',!!s.spoiled);
    const tag=el.querySelector('.priceTag');
    if(tag){
      const full=cakePrice(s.fills), cur=currentPrice(s);
      tag.textContent=s.spoiled?'变质':(cur<full?('¥'+cur+' 临期'):('¥'+full));
    }
  });
}
function heatQuality(h){
  return clamp(1-Math.abs(h-310)/220,0,1);
}
function burnWell(i){
  const w=G.wells[i];
  if(w.st==='burn')return;
  w.st='burn'; w.smoke=[];
  G.day.waste++; G.day.cost+=BAL.cakeBase;
  SFX.fail(); shake(); vibrate(40); toast('🔥 糊球了…','bad');
  if(G.picked===i){G.picked=-1;renderFillTray()}
}

/* ---------- 交付与满意度 ---------- */
function comboKey(fills){ return [...fills].sort().join('+'); }
function sharesWind(fills){ return fills.some(id=>F(id).tags.some(t=>G.windTags.includes(t))); }
function serveFromTray(si){
  const s=G.serve[si]; if(!s)return;
  if(G.bulk&&s.q>=.5){ serveBulk(si); return; }
  if(G.prebook&&s.fills.length===G.prebook.fills.length&&G.prebook.fills.every(f=>s.fills.includes(f))){ servePrebook(); return; }
  if(G.online&&s.fills.length===G.online.fills.length&&G.online.fills.every(f=>s.fills.includes(f))){ serveOnline(); return; }
  const lkey=comboKey(s.fills);
  if(S.banned.includes(lkey)){ toast('这个组合上次吃出阴影，没人敢点','bad'); SFX.fail(); return; }
  if(S.signatures.includes(lkey)&&!limitCheck(lkey))return;
  const target=findTaker(s);
  if(target<0){ toast('排队里没人点这个…再等等，或点 🗑 丢掉','bad'); return; }
  const c=G.queue[target];
  // 临期拒绝：小概率客人不要打折糕，且必须另做一份
  if(isStale(s)&&c.order&&staleRefused(c)){
    c.wantsFresh=true;
    if(c.faceEl)c.faceEl.classList.add('angry');
    floatEmoji(c.el,'🙅');
    toast('“临期的不要，我要现做的！”——'+c.type.n+'要求单独做一份','bad');
    SFX.fail(); renderQueue();
    return;
  }
  const slotEl=$('#serveRow')?$('#serveRow').children[si]:null;
  if(slotEl&&c.el&&typeof flyCake==='function')flyCake(slotEl,c.el);
  const res=serveCustomer(c,s);
  G.serve[si]=null; renderServe(); hudUpdate();
  if(c.type.special==='blogger')bloggerVerdict(res.sat);
}
function serveCustomer(c,cake){
  const d=GAME.doneness.find(x=>x.id===(c.order?c.order.done:'std'));
  const dist=Math.abs(cake.foldHeat-d.target);
  const heatScore=clamp(1-dist/(skillTol(d.tol*diffOf().tol)*2.4),0,1);
  const want=c.whatever?[]:(c.order?c.order.fills:[]);
  let fillScore=1;
  if(want.length){
    const inter=want.filter(f=>cake.fills.includes(f)).length;
    fillScore=inter/want.length*(cake.fills.length===want.length?1:.85);
  }
  const portion=cake.fills.length===want.length?1:(cake.fills.length>want.length?1.04:Math.max(.4,cake.fills.length/Math.max(1,want.length)));
  const key=comboKey(cake.fills);
  const info=S.known[key]||{r:'normal'};
  let comboMod=0;
  if(info.r==='sig')comboMod=.1;
  if(info.r==='dark')comboMod=-.18;
  if(sharesWind(cake.fills))comboMod+=.06;
  comboMod+=pairMod(cake.fills);
  let q=clamp((heatScore*.42+fillScore*.28+portion*.14+S.batterQ*.06+comboMod+.08)*foldPenalty(cake.foldOff)*(cake.lateFill?.97:1),0,1.15);
  if((G.godT||0)>0)q=clamp(q+.06,0,1.15);
  if(c.order&&c.order.hidden){
    if(c.order.hidden==='hot'){ const ok=cake.foldHeat>380; q=clamp(q*(ok?1.04:.93),0,1.15); if(!ok&&chance(.35))toast('“我要烫嘴的，这个是温的…”','bad'); }
    else if(c.order.hidden==='warm'){ const ok=cake.foldHeat>=250&&cake.foldHeat<=360; q=clamp(q*(ok?1.03:.94),0,1.15); }
    else if(c.order.hidden==='neat'){ const ok=(cake.foldOff||0)<.35; q=clamp(q*(ok?1.03:.9),0,1.15); if(!ok&&chance(.35))toast('“说了带路别洒…算了。”','bad'); }
  }
  pairSeenTick(cake.fills);
  // 放久了会凉（现实：蛋烘糕趁热才好吃）
  const age=(Date.now()-(cake.landedAt||Date.now()))/1000;
  const cool=Math.min(.08,Math.max(0,age-4)*.015);
  let cooled=false;
  if(cool>0){ q=clamp(q*(1-cool),0,1.15); cooled=true; }
  const speed=clamp(1-c.wait/(c.max*1.35),0,1);
  const price0=currentPrice(cake)*(c.type.id==='mystery'?1.6:1);
  const deal=tastingDeal(comboKey(cake.fills),price0);
  const price=deal.price;
  const psych=psychPrice();
  const priceScore=clamp(1-(price-psych)/psych*1.4*(1.1-(S.buzz==null?60:S.buzz)/300),0,1);
  const sat0=clamp(q*.45+speed*.3+priceScore*.25+(GAME.premises[S.premises].sat+5)/100,0,1);
  let sat=sat0;
  // “随便”顾客：满意度波动更大——吃美了更开心，翻车了更记仇（增益/减益均放大）
  if(c.whatever)sat=clamp(0.5+(sat-0.5)*1.3,0,1.15);
  // —— 顾客好感度 + 社会工程学 ——
  const _aid=c.type.id, _inf=affInfluence(c.type);
  // 老主顾“给面子”：好感够高时兜底满意度，偶发失误也网开一面
  if(aff(_aid)>=LOYAL_AT) sat=Math.max(sat,0.55);
  // 好感度增减：满意 +、不满 −
  if(sat>0.8) affBump(_aid,(sat-.6)*8);
  else if(sat<0.55) affBump(_aid,-(0.6-sat)*10);
  // 口碑热度：满意度加权社会影响力，好则爆红、差则避雷
  buzzBump((sat-0.5)*4*_inf*0.5);
  // 安利链：高影响力顾客满意 → 下一位可能是被安利来的新客
  if(sat>0.8 && _inf>=2) G.referNext={inf:_inf};
  // 记账
  const perfect=q>=.9&&dist<d.tol/2;
  S.money+=price; S.stats.sold++; S.stats.earn+=price;
  G.day.sold++; G.day.rev+=price; G.day.qSum+=q; G.day.qN++;
  if(perfect){ S.stats.perfect++; G.day.tips+=1; }
  let tip=0;
  if(perfect&&chance(tipChance()*(1+aff(_aid)/300))){ tip=Math.round(ri(1,2)*feverMult()*(1+aff(_aid)/200)); S.money+=tip; G.day.tips+=tip; SFX.coin(); }
  S.rep=clamp(S.rep+(sat-BAL.repTarget)*BAL.repK*deal.repMul*diffOf().rep*(c.type.special==='blogger'?3:1),0,100);
  addXp(Math.round(6+q*14+(perfect?6:0)));
  comboBump(perfect);
  cake.fills.forEach(id=>{ if(!S.seenFill.includes(id))S.seenFill.push(id); });
  S.seenCust[c.type.id]=(S.seenCust[c.type.id]||0)+1;
  checkMilestones(); checkAch();
  registerSale(key,q,sat,c);
  const badFill=cake.fills.find(id=>S.rotten.includes(id));
  if(badFill){
    const fine=Math.min(S.money,100);
    S.money-=fine; G.day.fines+=fine; S.stats.fine+=fine;
    S.rep=clamp(S.rep-10,0,100);
    toast('☣️ 食物中毒！'+F(badFill).n+'是变的…罚款 '+money(fine),'bad'); SFX.fail(); shake();
  }
  if(cake.foldHeat<200&&chance(.6))rawDispute(price);
  if(price%1!==0&&S.day<5&&S.premises<2&&(S.change||0)<5){
    S.money-=(price-Math.floor(price)); S.rep=clamp(S.rep-.2,0,100);
    toast('💵 没零钱找零，被迫抹零','bad');
  }
  // 反馈
  const face=c.el?c.el.querySelector('.custFace'):null;
  if(sat>.8){
    SFX.ding(); if(perfect){hitstop();SFX.fanfare();vibrate(25);}
    coinFly(c.el);
    floatEmoji(c.el,perfect?'😍':'🙂');
    if(face)face.querySelector('.mouth').style.borderColor='var(--leaf-d)';
    jump(c.el,perfect?'完美 +'+money(price+tip):'+'+money(price+tip),perfect?'var(--caramel)':'var(--leaf-d)');
    if(c.type.happy.length&&chance(.6))toast(pick(c.type.happy),'good');
  }else if(sat>.55){
    SFX.coin(); coinFly(c.el);
    jump(c.el,'+'+money(price+tip),'var(--ink2)');
  }else{
    SFX.fail(); if(face)face.classList.add('angry');
    floatEmoji(c.el,'💢');
    jump(c.el,'−口碑','var(--rouge-d)');
    if(c.type.sad.length&&chance(.7))toast(pick(c.type.sad),'bad');
    if(c.short&&chance(.5))toast('“将就吃嘛…虽然没有那个。”','bad');
    if(cooled&&chance(.4))toast('“'+V('piece')+'都凉了，将就吃。”','bad');
    if(cake.foldOff>=.6&&chance(.5))toast('“形状有点随缘，味道倒还行。”','bad');
  }
  // 顾客记忆传播链：记住这位客人（累计 visit、记老规矩、达阈值升级老主顾）
  const _mem=rememberCustomer(_aid,cake.fills,sat);
  if(_mem==='newLoyal'){ toast('🤝 '+(custMem(_aid).nick||c.type.n)+' 成了你的老主顾！以后常来','gold'); SFX.ding(); }
  // 老主顾的“老规矩”：记住了还做对了，额外好感 + 暖心反馈
  if(c.usual && sat>0.8){
    affBump(_aid,4);
    if(sat>0.9)toast('😊 '+(custMem(_aid).nick||c.type.n)+'：还是老样子，你记性真好','good');
  }
  // 熟客记忆（regular 专用，向后兼容）
  if(c.type.special==='regular'&&sat>.8){ S.mood={fav:[...cake.fills]}; S.rep=clamp(S.rep+.5,0,100); }
  // 传播链：满意的忠实 / 高影响力顾客，会带朋友来（下一位可能是他介绍的）
  if(sat>0.8 && (isLoyal(_aid) || _inf>=2)) G.bringFriend={from:_aid, fromName:c.type.n};
  // 安利来的新客：满意则继续帮你安利，不满意则口口相传反噬
  if(c.referred){
    if(sat>0.8){ S.stats.referrals=(S.stats.referrals||0)+1; buzzBump(6); toast('📣 朋友推荐来的客人满意而归，又帮你安利了一圈！','gold'); }
    else if(sat<0.5){ buzzBump(-3); toast('📣 安利来的客人没吃好，街坊都知道了…','bad'); }
  }
  // 朋友介绍来的新客：吃美了，说下次还带朋友（传播链续命已在上面 bringFriend 处理）
  if(c.broughtBy && sat>0.8){ toast('🤝 '+c.type.n+'（'+(c.fromName||'朋友')+' 介绍来的）吃美了，说下次还带朋友','good'); }
  // 大爷砍价
  if(c.type.id==='uncle'&&chance(.3))bargainModal(price);
  // 移除顾客
  const idx=G.queue.indexOf(c);
  if(idx>=0){
    if(c.el){ c.el.classList.add('leaving'); setTimeout(()=>c.el.remove(),380); }
    G.queue.splice(idx,1);
  }
  setTimeout(renderQueue,120);
  return {q,sat,price,tip};
}
function serveBulk(si){
  if(!G.bulk)return;
  let idx=si!==undefined?si:G.serve.findIndex(s=>s&&s.q>=.5);
  if(idx<0){ toast('团购要的是能吃的'+V('piece')+'，将个烂就','bad'); return; }
  const s=G.serve[idx]; if(!s)return;
  const price=Math.max(.5,currentPrice(s)*.9);
  S.money+=price; G.day.sold++; G.day.rev+=price; G.day.qSum+=s.q; G.day.qN++;
  addXp(8); G.bulk.left--;
  jump($('#bulkCard'),'+'+money(price),'var(--leaf-d)');
  G.serve[idx]=null; renderServe();
  SFX.coin();
  if(G.bulk.left<=0){
    const clutch=G.bulk.t<=5;
    const bonus=Math.round(G.bulk.need*2*(clutch?1.5:1));
    S.money+=bonus; S.rep=clamp(S.rep+2,0,100); addXp(40);
    S.stats.bulkWin=(S.stats.bulkWin||0)+1;
    toast('🏢 团购完成！奖金 '+money(bonus)+(clutch?'（压哨交付，加价 50%！）':''),'gold'); SFX.fanfare();
    G.bulk=null; S.chainFair=true; checkAch();
  }
  renderQueue(); renderDayChip();
}
function registerSale(key,q,sat,c){
  let info=S.known[key];
  if(!info){
    const r=rnd();
    const posP=S.dayType==='taste'?.4:.25, darkP=S.dayType==='taste'?.08:.15;
    info={r:r<posP?'pos':(r<posP+darkP?'dark':'normal'),sales:0,bad:0};
    S.known[key]=info;
    if(info.r==='pos')toast('这个组合…好像有点东西？','gold');
    if(info.r==='dark')toast('客人眉头一皱，感觉不太对','bad');
  }
  info.sales++; G.day.sigSales=info.r==='sig'?G.day.sigSales+1:G.day.sigSales;
  if(info.r==='dark')G.day.darkSales++;
  if(info.r==='pos'&&info.sales>=5&&!S.signatures.includes(key))confirmSignature(key);
  if(info.r==='dark'){
    if(q<.55){ info.bad++; if(info.bad>=2&&!S.darks.includes(key))confirmDark(key); }
    else info.bad=Math.max(0,info.bad-1);
  }
  if(info.r==='sig'&&sat>.85)S.rep=clamp(S.rep+.3,0,100);
}
function confirmSignature(key){
  const names=key.split('+').map(id=>F(id).n);
  modal(`<div class="h1 center">🌟 招牌验证成功！</div>
    <div class="center" style="margin:8px 0">${names.map(n=>'<span class="pill">'+n+'</span>').join(' + ')}</div>
    <div class="tiny mut center">卖了 5 个还有回头客——这就是天赋。给它起个名，售价 +30%，还能带动其他单品。</div>
    <div class="field" style="margin-top:10px"><label>招牌名</label><input id="sigName" maxlength="10" value="${esc(names.join(''))}传奇"></div>
    <button class="btn big leaf" id="sigOk" style="width:100%;margin-top:10px">挂牌！</button>`,
    {onMount:(box,close)=>{
      box.querySelector('#sigOk').onclick=()=>{
        S.signatures.push(key); S.known[key].r='sig'; S.known[key].name=box.querySelector('#sigName').value.trim()||'镇店之宝';
        S.rep=clamp(S.rep+3,0,100); addXp(60);
        SFX.fanfare(); toast('招牌菜「'+S.known[key].name+'」挂牌','gold'); close(); save();
      };
    }});
}
function confirmDark(key){
  const names=key.split('+').map(id=>F(id).n);
  modal(`<div class="h1 center">💀 黑暗料理坐实</div>
    <div class="center" style="margin:8px 0">${names.map(n=>'<span class="pill rouge">'+n+'</span>').join(' + ')}</div>
    <div class="tiny mut center">“呃…老板你确定这个能吃？”——综合口碑 −6。可以下架止损，也可以头铁继续卖（行为艺术）。</div>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" id="dkKeep">头铁继续卖</button>
    <button class="btn rouge grow" id="dkBan">下架止损</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#dkBan').onclick=()=>{ if(!S.banned.includes(key))S.banned.push(key); toast('已下架，及时止损','good'); SFX.ding(); close(); save(); };
      box.querySelector('#dkKeep').onclick=()=>{ toast('行为艺术家…尊重','bad'); SFX.fail(); close(); save(); };
    }});
  S.darks.push(key); S.known[key].r='dark'; S.rep=clamp(S.rep-6,0,100); addXp(25); S.stats.dark++;
}

/* ---------- 随机事件 ---------- */
/* 城管出现权重曲线：第一天绝对不来，前三天极少，一周后正常；铺面无城管 */
function cgWeight(){
  if(S.day<=1)return 0;
  let w= S.day<=3?.3 : (S.day<=6?.6:1);
  w*= S.premises===0?1.2:(S.premises===1?1:0);
  w+= (GAME.spots[S.spot]||{}).cg||0;          // 选址直接影响城管风险（城管门口为负）
  w*= 1+(S.fxToday.cg||0);
  return Math.max(0,w)*(diffOf().cg||1);
}
function triggerEvent(){
  G.eventCd=ri(20,34);
  const pool=GAME.events.filter(e=>{
    if(e.id==='chengguan')return cgWeight()>0;
    if(e.id==='inspect')return S.day>BAL.newbieDays;
    if(e.id==='gasout')return !G.gasOut && (S.gas*BAL.gasCanCap - G.gasUsed) < BAL.gasCanCap;
    if(e.id==='blogger')return !G.queue.some(x=>x.type.special==='blogger');
    if(e.id==='bulk')return !G.bulk&&S.day>BAL.newbieDays&&!diffOf().noBulk;
    return true;
  });
  const cgW=cgWeight();
  const wp=pool.map(e=>e.w*(e.id==='chengguan'?cgW:1));
  let t=0; wp.forEach(x=>t+=x); let r=rnd()*t, ev=pool[0];
  for(let i=0;i<pool.length;i++){ r-=wp[i]; if(r<=0){ev=pool[i];break} }
  if(ev.id==='inspect'){ eventInspect(); return; }
  if(ev.id==='heirloom'){ eventHeirloom(); return; }
  if(ev.id==='chengguan')eventChengguan();
  else if(ev.id==='blogger')eventBlogger();
  else if(ev.id==='bulk')eventBulk();
  else if(ev.id==='gasout')eventGasOut();
  else if(ev.id==='queuejump')eventQueueJump();
  else if(ev.id==='cat')eventCat();
  else if(ev.id==='rival')eventRival();
  else if(ev.id==='mystery')eventMystery();
  else if(ev.id==='priceup'){ S.fxToday.price=(S.fxToday.price||1)*1.1; toast('📈 食材突然涨价，明天备货贵一截','bad'); }
  // 广告翻车
  if(S.adTier>=2&&S.rep<70&&chance(.12+ (S.fxToday.adrisk||0)))eventAdScandal();
}
function eventChengguan(){
  SFX.warn();
  const fineMul=(S.day<=BAL.newbieDays?.5:1)*diffOf().fine;
  let left=10;
  const close=modal(`<div class="h2">🚨 城管还有 <b id="cgT">10</b> 秒到达战场</div>
    <div class="tiny mut" style="margin:6px 0">“同志，摆摊的这边走一趟？”——选一个！</div>
    <div class="row" style="flex-direction:column;gap:8px;margin-top:8px">
      <button class="btn leaf" id="cgRun" style="width:100%">🏃 收摊跑（损失 30% 存货，50% 被罚 ¥50）</button>
      <button class="btn rouge" id="cgFight" style="width:100%">😤 硬刚（罚 ¥200，口碑 −10）</button>
      <button class="btn sky" id="cgCard" style="width:100%;${(S.license||S.premises>=2)?'':'display:none'}">🪪 出示摊位证（正规军，没事）</button>
    </div>`,
    {onMount:(box,close2)=>{
      const done=fn=>{ clearInterval(timer); close2(); fn(); };
      box.querySelector('#cgRun').onclick=()=>done(()=>{
        let loss=0;
        unlockedFillings().forEach(f=>{ const l=Math.ceil((S.inv[f.id]||0)*.3); S.inv[f.id]-=l; loss+=l; });
        S.batter=Math.ceil(S.batter*.7);
        if(chance(.5)){ S.money=Math.max(0,S.money-50*fineMul); G.day.fines+=50*fineMul; S.stats.fine+=50*fineMul; toast('被逮到！罚款 '+money(50*fineMul),'bad'); }
        else toast('跑掉了，损失一批货…','bad');
        SFX.fail();
      });
      box.querySelector('#cgFight').onclick=()=>done(()=>{
        S.money=Math.max(0,S.money-200*fineMul); G.day.fines+=200*fineMul; S.stats.fine+=200*fineMul;
        S.rep=clamp(S.rep-10,0,100); SFX.fail(); shake(); toast('“我说这是规定就是规定。” −'+money(200*fineMul)+' −口碑','bad');
      });
      box.querySelector('#cgCard').onclick=()=>done(()=>{ toast('证件一亮，城管大哥点头微笑','good'); SFX.ding(); });
      const timer=setInterval(()=>{
        left--; const t=box.querySelector('#cgT'); if(t)t.textContent=left;
        if(left<=0){ clearInterval(timer); close2();
          S.money=Math.max(0,S.money-50*fineMul); G.day.fines+=50*fineMul; S.stats.fine+=50*fineMul;
          toast('犹豫就会败北…被罚 '+money(50*fineMul),'bad'); SFX.fail();
        }
      },1000);
    }});
}
function makeBlogger(){
  const type=GAME.customers.find(x=>x.special==='blogger');
  const order=makeOrder(type);
  return {type, order, pat:150, max:150, wait:0, el:null, vip:true, wantsFresh:false};
}
function eventBlogger(){
  const c=makeBlogger();
  G.queue.unshift(c); renderQueue();
  toast('🎥 探店博主来了！点了 '+c.order.fills.map(f=>F(f).n).join('+')+' —— 优先做他的，接待好了一飞冲天','gold'); SFX.warn();
}
function bloggerVerdict(sat){
  if(sat>=.8){
    S.stats.bloggerWin=(S.stats.bloggerWin||0)+1;
    S.buffs.push({id:'hot',name:'探店爆红',ic:'🔥',days:3,flow:true});
    S.rep=clamp(S.rep+10,0,100); addXp(80);
    S.chainBulk=true; buzzBump(12);
    SFX.fanfare(); toast('🔥 博主满意！发了视频，爆红 3 天，客流大涨','gold');
  }else{
    S.rep=clamp(S.rep-10,0,100); addXp(20);
    S.buffs.push({id:'avoid',name:'避雷视频',ic:'📹',days:3}); buzzBump(-10);
    SFX.fail(); toast('📹 博主不满意，发了避雷视频…“家人们，真的避雷”（客流受影响 3 天）','bad');
  }
}
function eventBulk(){
  const need=ri(6,10);
  G.bulk={need,left:need,t:130,priceMul:.9};
  toast('🏢 公司团购 '+need+' 个！限时 130 秒（多格并行是唯一解法）','gold'); SFX.warn();
  renderQueue(); renderDayChip();
}
function eventGasOut(){
  G.gasOut=true; G.fire=Math.min(G.fire,1);
  renderFire(); renderDayChip();
  toast('⛽ 燃气罐见底了，只剩文火','bad'); SFX.fail();
  setTimeout(()=>{ if(G.running){G.gasOut=false;renderFire();renderDayChip();toast('燃气缓过来了一点','good')} },40000);
}
function eventQueueJump(){
  const names=['纹身大哥','着急的外卖小哥','吼得最大声的阿姨'];
  modal(`<div class="h2">😤 有人插队</div>
    <div class="tiny mut" style="margin:6px 0">${pick(names)} 径直走到最前面，后面的客人开始翻白眼。</div>
    <div class="row" style="margin-top:10px"><button class="btn leaf grow" id="qjKick">讲道理，请排队</button>
    <button class="btn ghost grow" id="qjLet">算了，多一事不如少一事</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#qjKick').onclick=()=>{ close(); if(chance(.75)){ S.rep=clamp(S.rep+1,0,100); toast('群众纷纷叫好，口碑 +1','good'); SFX.ding(); } else { S.rep=clamp(S.rep-2,0,100); toast('吵起来了…围观群众拍视频','bad'); SFX.fail(); } };
      box.querySelector('#qjLet').onclick=()=>{ close(); G.queue.forEach(c=>c.pat*=.92); toast('后面的客人耐心 −8%','bad'); };
    }});
}
function eventCat(){
  modal(`<div class="h2">🐱 流浪猫跳上了摊位</div>
    <div class="tiny mut" style="margin:6px 0">它盯着你的锅，眼神笃定。撸猫还是做${V('good')}？</div>
    <div class="row" style="margin-top:10px"><button class="btn leaf grow" id="catFeed">喂它一口（−¥2）</button>
    <button class="btn ghost grow" id="catNo">专心做${V('good')}</button></div>`,
    {onMount:(box,close)=>{
      box.querySelector('#catFeed').onclick=()=>{ close();         S.money=Math.max(0,S.money-2); G.day.prep+=2;
        S.stats.catFed=(S.stats.catFed||0)+1;
        S.buffs.push({id:'cat',name:'招财猫',ic:'🐱',days:2,perfect:.15});
        toast('🐱 猫猫认证！接下来 2 天完美出锅率提升','gold'); SFX.ding(); };
      box.querySelector('#catNo').onclick=()=>{ close(); toast('猫猫失望地走了','bad'); };
    }});
}
function eventRival(){
  S.buffs.push({id:'rival',name:'隔壁新竞品',ic:'🏪',days:3});
  toast('🏪 隔壁开了家新摊，客流被分走几天','bad'); SFX.fail();
}
function eventMystery(){
  const c={type:{id:'mystery',n:'神秘顾客',ic:'🕵️',pat:120,pmul:1.6,like:[],happy:['“老板看着办”？有点意思。”'],sad:['“就这？”']},order:null,pat:120,wait:0,max:120,el:null};
  G.queue.push(c); renderQueue();
  toast('🕵️ 神秘顾客：“老板你看着办，做得好双倍价钱”','gold'); SFX.warn();
}
function eventAdScandal(){
  const fine=Math.min(S.money,50);
  S.money-=fine; G.day.fines+=fine; S.stats.fine+=fine;
  S.rep=clamp(S.rep-5,0,100);
  SFX.fail(); shake();
  toast('📰 “全成都最好吃”被立案调查！罚款 '+money(fine)+'，打假虽迟但到','bad');
}

/* ---------- 主循环 ---------- */
function serviceLoop(now){
  if(!G.running)return;
  const dt=Math.min(.05,(now-G.last)/1000); G.last=now;
  G.dayT+=dt;
  // 燃气
  G.gasUsed+=[0,.5,1,2][G.fire]*dt*(S.fxToday.gas||1);
  if(S.gas*200-G.gasUsed<0&&!G.gasOut&&G.fire>1){ G.gasOut=true; renderFire(); renderDayChip(); toast('⛽ 燃气耗尽！','bad'); SFX.fail(); }
  // 升温
  const rate=(FIRE_RATE[G.fire]+(G.preheatT>0?(G.preheatV||0)/25:0))*(S.fxToday.heat||1);
  for(let i=0;i<G.wells.length;i++){
    const w=G.wells[i];
    if(w.pourT!=null&&w.pourT<1)w.pourT=Math.min(1,w.pourT+dt*2.6);
    if(w.foldT!=null&&w.foldT<1)w.foldT=Math.min(1,w.foldT+dt*4);
    if(w.st==='batter'){
      w.heat+=rate*dt;
      if(w.heat>BURN_AT+(diffOf().burn||0))burnWell(i);
      else if(w.heat>380&&chance(dt*(G.lowPerf?1:3)))w.smoke.push({x:0,y:0,vy:-20-Math.random()*20,life:1});
      if(w.heat>WINDOW_LO&&w.heat<WINDOW_HI&&!G.lowPerf&&chance(dt*5)){
        (w.bubbles=w.bubbles||[]).push({a:rnd()*7,r:rnd(),ph:rnd()*7,life:1});
        if(w.bubbles.length>7)w.bubbles.shift();
      }
      if(w.heat>150&&chance(dt*(G.lowPerf?.6:1.6)))(w.steam=w.steam||[]).push({x:(rnd()-.5)*wellR()*.5,y:0,vy:-16-rnd()*14,life:1});
    }
    if(w.bubbles){ w.bubbles.forEach(b=>b.life-=dt*.45); w.bubbles=w.bubbles.filter(b=>b.life>0); }
    if(w.drops){ w.drops.forEach(d=>{d.d+=d.sp*dt;d.life-=dt*1.6}); w.drops=w.drops.filter(d=>d.life>0); }
    if(w.steam){ w.steam.forEach(s=>{s.life-=dt*.7;s.y+=s.vy*dt}); w.steam=w.steam.filter(s=>s.life>0); }
    if(w.smoke.length){ w.smoke.forEach(s=>{s.life-=dt*.8;s.y+=s.vy*dt}); w.smoke=w.smoke.filter(s=>s.life>0); }
  }
  // 到店
  G.arrivalAcc+=dt;
  if(G.arrivalAcc>=arrivalInterval()){ G.arrivalAcc=0; tryArrive(); }
  helperTick(dt); onlineTick(dt); fpsTick(dt); autoDeliver();
  if(G.hypeT>0)G.hypeT-=dt;
  if(G.godT>0)G.godT-=dt;
  if(G.preheatT>0)G.preheatT-=dt;
  // 耐心
  for(let i=G.queue.length-1;i>=0;i--){
    const c=G.queue[i];
    c.wait+=dt;
    if(c.wait>=c.max){
      if(c.type.special==='blogger'){ bloggerVerdict(0); toast('🎥 博主等太久，失望地走了…','bad'); }
      G.queue.splice(i,1);
      if(c.el){ c.el.classList.add('leaving'); setTimeout(()=>c.el.remove(),380); }
      G.day.left++; S.stats.left++; S.rep=clamp(S.rep-1.2,0,100);
      if(c.type.special!=='blogger')toast((c.type.sad.length?pick(c.type.sad):'等太久，走了'),'bad');
      SFX.fail();
    }
  }
  // 团购计时
  if(G.bulk){
    G.bulk.t-=dt;
    if(G.bulk.t<=0){
      const pen=Math.min(S.money,30);
      S.money-=pen; G.day.fines+=pen;
      toast('🏢 团购超时！违约金 '+money(pen),'bad'); SFX.fail();
      G.bulk=null; renderQueue(); renderDayChip();
    }
  }
  // 事件
  G.eventCd-=dt;
  if(G.eventCd<=0)triggerEvent();
  // 日终
  if(G.dayT>=(S.day<=2?200:BAL.dayLen)*(diffOf().dayLen||1)){ endService(); return; }
  drawPan(); updateQueueDom(); updateServeDom(); renderStoveStatus(); hudUpdate();
  G.raf=requestAnimationFrame(serviceLoop);
}

/* ---------- 画锅 ---------- */
let panCtx=null,panDpr=1;
function drawPan(){
  const cv=$('#panCanvas'); if(!cv)return;
  const W=cv.clientWidth,H=cv.clientHeight;
  if(!panCtx)panCtx=cv.getContext('2d');
  if(cv.width!==W*panDpr||cv.height!==H*panDpr){ cv.width=W*panDpr; cv.height=H*panDpr; }
  const ctx=panCtx;
  ctx.setTransform(panDpr,0,0,panDpr,0,0);
  ctx.clearRect(0,0,W,H);
  // 炉火光芒（随火档跳动）
  const fireH=[0,.12,.26,.45][G.fire]||0;
  if(fireH>0){
    const flick=.88+Math.sin(Date.now()/70)*.07+Math.sin(Date.now()/37)*.05;
    const g=ctx.createRadialGradient(W/2,H+8,8,W/2,H+8,W*.8);
    g.addColorStop(0,'rgba(255,140,40,'+(.32*fireH*flick)+')');
    g.addColorStop(1,'rgba(255,140,40,0)');
    ctx.fillStyle=g; ctx.fillRect(0,H-W*.55,W,H);
  }
  const R=Math.min(W/9.2,H*.25);
  const pos=[];
  for(let c=0;c<4;c++)pos.push({x:(c+.5)*W/4,y:H*.31});
  for(let c=0;c<3;c++)pos.push({x:(c+.5)*W/3+W/6,y:H*.74});
  G.wells.forEach((w,i)=>{
    const p=pos[i]; if(!p)return;
    // 容器造型（按小吃切换）
    const vessel=GAME.vessel||'wells';
    if(vessel==='flat'){
      const s=R*1.72;
      ctx.fillStyle='#4a4038';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(p.x-s/2,p.y-s/2,s,s,R*.28);ctx.fill()}else{ctx.fillRect(p.x-s/2,p.y-s/2,s,s)}
      ctx.fillStyle='#2e2822';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(p.x-s*.42,p.y-s*.42,s*.84,s*.84,R*.22);ctx.fill()}else{ctx.fillRect(p.x-s*.42,p.y-s*.42,s*.84,s*.84)}
    }else if(vessel==='fryer'){
      ctx.beginPath(); ctx.arc(p.x,p.y,R,0,7); ctx.fillStyle='#3a332c'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.86,0,7); ctx.fillStyle='#241f1a'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.78,0,7); ctx.strokeStyle='rgba(245,185,66,.22)'; ctx.lineWidth=2; ctx.stroke();
    }else if(vessel==='pot'){
      ctx.beginPath(); ctx.arc(p.x,p.y,R,0,7); ctx.fillStyle='#4a4038'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.86,0,7); ctx.fillStyle='#332b22'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.72,0,7); ctx.fillStyle='rgba(205,150,75,.16)'; ctx.fill();
    }else if(vessel==='bowl'){
      ctx.beginPath(); ctx.arc(p.x,p.y,R,0,7); ctx.fillStyle='#8FB6C9'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.86,0,7); ctx.fillStyle='#EAF4F8'; ctx.fill();
    }else{
      ctx.beginPath(); ctx.arc(p.x,p.y,R,0,7); ctx.fillStyle='#4a4038'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.86,0,7); ctx.fillStyle='#2e2822'; ctx.fill();
    }
    if(w.st==='empty'){
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.7,0,7);
      ctx.fillStyle='rgba(255,255,255,.06)'; ctx.fill();
      ctx.font=(R*.6)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillText('+',p.x,p.y);
    }else{
      ctx.save();
      const pour=w.pourT==null?1:w.pourT, ease=1-Math.pow(1-pour,3);
      const wob=w.heat>100?Math.sin(Date.now()/95+i)*.02:0;
      const foldS=w.foldT<1?(1-.38*Math.sin(w.foldT*Math.PI)):1;
      ctx.translate(p.x,p.y);
      ctx.scale((0.3+0.7*ease)*foldS+wob, 0.3+0.7*ease);
      ctx.translate(-p.x,-p.y);
      // 糕体（冷食走冷色系）
      const h=Math.min(1,w.heat/BURN_AT);
      const light=86-52*h, sat=70+20*h;
      ctx.beginPath(); ctx.arc(p.x,p.y,R*.78,0,7);
      ctx.fillStyle='hsl('+(GAME.cool?200:44)+','+sat+'%,'+light+'%)'; ctx.fill();
      ctx.strokeStyle='rgba(74,44,20,.35)'; ctx.lineWidth=2; ctx.stroke();
      // 高光
      ctx.beginPath(); ctx.ellipse(p.x-R*.24,p.y-R*.3,R*.22,R*.11,-.6,0,7);
      ctx.fillStyle='rgba(255,255,255,'+(.28-.2*h)+')'; ctx.fill();
      // 蜂窝眼气泡（呼吸 + 破裂）
      if(w.heat>WINDOW_LO&&w.heat<WINDOW_HI){
        const bs=(w.bubbles&&w.bubbles.length)?w.bubbles:[{a:i*.9,r:.3,ph:0,life:.8},{a:2.1,r:.6,ph:2,life:.8},{a:4.2,r:.45,ph:4,life:.8}];
        bs.forEach(b=>{
          const rr=R*(.12+.18*b.r);
          ctx.beginPath(); ctx.arc(p.x+Math.cos(b.a)*rr,p.y+Math.sin(b.a)*rr,R*.055*(.65+.35*Math.sin(Date.now()/130+b.ph)),0,7);
          ctx.fillStyle='rgba(120,70,20,'+(.55*b.life)+')'; ctx.fill();
        });
      }
      // 油花飞溅
      (w.drops||[]).forEach(d=>{
        ctx.beginPath(); ctx.arc(p.x+Math.cos(d.a)*d.d,p.y+Math.sin(d.a)*d.d,2.6,0,7);
        ctx.fillStyle='rgba(245,215,150,'+Math.max(0,d.life)+')'; ctx.fill();
      });
      // 馅料
      w.fills.forEach((f,fi)=>{
        ctx.beginPath(); ctx.arc(p.x+(fi-(w.fills.length-1)/2)*R*.34,p.y,R*.17,0,7);
        ctx.fillStyle=FCOLOR[f]||'#ccc'; ctx.fill();
        ctx.strokeStyle='rgba(74,44,20,.4)'; ctx.lineWidth=1.5; ctx.stroke();
      });
      // 对折外观：准头决定歪不歪
      if(w.st==='fold'){
        const off=w.foldOff||0;
        const tilt=(off-.18)*1.0, shift=R*off*.30;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(tilt);
        // 折叠过去的那半月（越歪越偏色）
        ctx.beginPath();
        ctx.arc(shift*.5, R*.14, R*.78, 0.12*Math.PI, 0.88*Math.PI);
        ctx.fillStyle='hsla(38, 62%, '+(74-20*Math.min(1,off))+'%, .92)';
        ctx.fill();
        // 折缝：完美是利落弧线，歪了是狼狈弯线
        ctx.beginPath();
        ctx.moveTo(-R*.78, R*.12+shift*.2);
        ctx.quadraticCurveTo(0, R*.12+R*.16*Math.min(1,off), R*.78, R*.12-shift*.2);
        ctx.strokeStyle=off<.35?'rgba(200,140,40,.95)':'rgba(120,70,20,.8)';
        ctx.lineWidth=off<.35?2.5:4; ctx.stroke();
        // 完美：金色描边 + 油亮高光
        if(off<.35){
          ctx.beginPath(); ctx.arc(0,0,R*.82,-0.12*Math.PI,1.12*Math.PI);
          ctx.strokeStyle='rgba(245,185,66,.95)'; ctx.lineWidth=2.5; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(-R*.18,-R*.28,R*.26,R*.12,-.5,0,7);
          ctx.fillStyle='rgba(255,255,255,.4)'; ctx.fill();
        }
        ctx.restore();
        // 露馅：折歪了才看得见
        if(off>.55&&w.fills.length){
          const f=w.fills[0];
          ctx.beginPath();
          ctx.arc(p.x+R*.52*Math.sign(off-.55||1), p.y-R*.1, R*.13,0,7);
          ctx.fillStyle=FCOLOR[f]||'#ccc'; ctx.fill();
          ctx.strokeStyle='rgba(74,44,20,.5)'; ctx.lineWidth=1.5; ctx.stroke();
        }
      }
      // 对折叠准星：绿圈=完美区，红圈=容忍边界
      if(w.st==='batter'&&w.fills.length&&w.heat>=SERVE_LO){
        ctx.beginPath(); ctx.arc(p.x,p.y,R*.35,0,7);
        ctx.strokeStyle='rgba(107,158,90,'+(.6+.3*Math.sin(Date.now()/200))+')'; ctx.lineWidth=2.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(p.x,p.y,R*.7,0,7);
        ctx.strokeStyle='rgba(217,93,93,.5)'; ctx.lineWidth=1.5; ctx.setLineDash([2,4]); ctx.stroke(); ctx.setLineDash([]);
      }
      // 火候直觉：显示实时温度
      if(w.st==='batter'&&(S.skills.heat||0)>0){
        ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(255,255,255,.9)';
        ctx.fillText(Math.round(w.heat)+'°',p.x,p.y+R*.52);
      }
      if(w.st==='burn'){
        ctx.beginPath(); ctx.arc(p.x,p.y,R*.78,0,7);
        ctx.fillStyle='#2a1c10'; ctx.fill();
        ctx.font=(R*.7)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('💀',p.x,p.y);
      }
      ctx.restore();
    }
    // 蒸汽
    (w.steam||[]).forEach(s=>{
      ctx.beginPath(); ctx.arc(p.x+s.x,p.y-R*.8+s.y,9*s.life,0,7);
      ctx.fillStyle='rgba(200,195,185,'+(.2*s.life)+')'; ctx.fill();
    });
    // 完美星芒
    if(w.spark){
      w.spark.t=(w.spark.t||0)+.045;
      const st=w.spark.t;
      if(st<1){
        for(let k=0;k<8;k++){
          const a=k/8*Math.PI*2+st*2, rr=R*(.3+st*.95);
          ctx.beginPath(); ctx.arc(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr,3*(1-st)+1,0,7);
          ctx.fillStyle='rgba(245,185,66,'+(1-st)+')'; ctx.fill();
        }
      }else w.spark=null;
    }
    // 锅圈热度光
    if(w.st!=='empty'&&G.fire>0){
      ctx.beginPath(); ctx.arc(p.x,p.y,R*1.02,0,7);
      ctx.strokeStyle='rgba(255,120,50,'+((.1+.05*G.fire)*(w.heat/460+.3))+')'; ctx.lineWidth=3; ctx.stroke();
    }
    // 选中圈
    if(G.picked===i){
      ctx.beginPath(); ctx.arc(p.x,p.y,R+4,0,7);
      ctx.strokeStyle='#D89A2B'; ctx.lineWidth=3; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
    }
    // 烟
    w.smoke.forEach(s=>{
      ctx.beginPath(); ctx.arc(p.x+s.x,p.y-R*.8+s.y,8*s.life,0,7);
      ctx.fillStyle='rgba(120,110,100,'+(.28*s.life)+')'; ctx.fill();
    });
  });
  if(S.weather==='rain'||S.weather==='storm'){
    const heavy=S.weather==='storm';
    ctx.strokeStyle='rgba(127,176,214,.45)'; ctx.lineWidth=1.5;
    const n=heavy?42:24;
    for(let i=0;i<n;i++){
      const rx=(i*97+Date.now()/3)%W, ry=(i*53+Date.now()/(heavy?2.2:4))%H;
      ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-4,ry+12); ctx.stroke();
    }
  }
}
// canvas 点击
(function(){
  const bind=()=>{
    const cv=$('#panCanvas'); if(!cv)return;
    cv.addEventListener('pointerdown',e=>{
      const r=cv.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const W=r.width,H=r.height,R=Math.min(W/9.2,H*.25);
      const pos=[];
      for(let c=0;c<4;c++)pos.push({x:(c+.5)*W/4,y:H*.31});
      for(let c=0;c<3;c++)pos.push({x:(c+.5)*W/3+W/6,y:H*.74});
      for(let i=0;i<pos.length;i++){
        const dx=x-pos[i].x,dy=y-pos[i].y;
        if(dx*dx+dy*dy<(R*1.15)*(R*1.15)){ wellTap(i,{dx,dy,dist:Math.sqrt(dx*dx+dy*dy)}); return; }
      }
    });
  };
  if(document.readyState!=='loading')bind(); else document.addEventListener('DOMContentLoaded',bind);
})();

/* 容错网：营业循环内任何未捕获异常都不允许让游戏假死 */
window.addEventListener('error',function(){
  if(G.screen==='service'&&G.running){
    G.errN=(G.errN||0)+1;
    if(G.errN<=5){ cancelAnimationFrame(G.raf); G.raf=requestAnimationFrame(serviceLoop); }
    else if(!G.errShown){ G.errShown=true; toast('游戏遇到问题，请刷新页面重进','bad'); }
  }
});

/* 旋钮拖转：四档位 = 关火(西)/文火(北)/中火(东)/武火(南) */
(function(){
  const bind=()=>{
    const k=$('#knob'); if(!k)return;
    let dragging=false;
    const angleFrom=e=>{
      const r=k.getBoundingClientRect();
      return Math.atan2(e.clientY-(r.top+r.height/2), e.clientX-(r.left+r.width/2))*180/Math.PI;
    };
    const snap=a=>{
      const dets=[180,270,0,90]; let best=0,bd=999;
      dets.forEach((d,i)=>{
        const diff=Math.abs(((a-d+540)%360)-180), dd=180-diff;
        if(dd<bd){bd=dd;best=i}
      });
      return best;
    };
    k.addEventListener('pointerdown',e=>{ dragging=true; try{k.setPointerCapture(e.pointerId)}catch(err){} });
    k.addEventListener('pointermove',e=>{ if(!dragging)return; const f=snap(angleFrom(e)); if(f!==G.fire)setFire(f); });
    k.addEventListener('pointerup',()=>{dragging=false});
    k.addEventListener('pointercancel',()=>{dragging=false});
  };
  if(document.readyState!=='loading')bind(); else document.addEventListener('DOMContentLoaded',bind);
})();

/* ---------- 收摊 ---------- */
function endService(){
  G.running=false; cancelAnimationFrame(G.raf); SFX.sizzleOff(); wakeLockOff();
  G.day.wages=helperWages();
  settlePrebook();
  // 未出锅的折算损耗
  G.wells.forEach(w=>{ if(w.st==='batter'||w.st==='fold'){ G.day.waste++; G.day.cost+=BAL.cakeBase; } });
  // 燃气结算
  const gasPrice=priceOf(GAME.baseItems.find(b=>b.id==='gas'));
  const cans=G.gasUsed/BAL.gasCanCap;
  G.day.gas=cans*gasPrice;
  // 营销预算残余说明（已花）
  // 连败保护
  const net=G.day.rev-G.day.cost-G.day.gas-rentOf()-G.day.prep-G.day.fines-G.day.wages;
  G.day.net=net;
  if(net<0){ G.lostDays++; } else G.lostDays=0;
  if(G.lostDays>=BAL.comfortAfter){
    S.buffs.push({id:'comfort',name:'安慰券',ic:'🎫',days:1,flow:true});
    G.lostDays=0;
    toast('🎫 连续亏两天，系统送安慰券：明日客流 +20%（生活不易，猫猫叹气）','gold');
  }
  // 倒闭危机
  if(S.money<BAL.crisisMoney)G.crisisDays++; else G.crisisDays=0;
  checkMilestones(); checkAch(); save();
  renderSettle();
  show('settle');
}
