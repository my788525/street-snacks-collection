/* 巷口小吃合集 · 公共引擎 juice.js */
/* 巷口蛋烘糕 · juice.js · 动效增强层（DOM/CSS 侧） */

/* 金币飞入 HUD */
function coinFly(fromEl){
  const app=$('#app'); if(!app)return;
  const target=$('#hudMoneyS')||$('#hudMoney');
  if(!fromEl||!target)return;
  const a=app.getBoundingClientRect(), r=fromEl.getBoundingClientRect(), t=target.getBoundingClientRect();
  const c=document.createElement('div');
  const sx=r.left-a.left+r.width/2-9, sy=r.top-a.top;
  c.style.cssText='position:absolute;left:'+sx+'px;top:'+sy+'px;width:18px;height:18px;border-radius:50%;z-index:96;pointer-events:none;'+
    'background:radial-gradient(circle at 35% 30%,#FFE9A8,#F5B942);border:2px solid var(--ink);'+
    'transition:transform .5s cubic-bezier(.3,0,.2,1),opacity .5s';
  app.appendChild(c);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    c.style.transform='translate('+(t.left-a.left+t.width/2-sx-9)+'px,'+(t.top-a.top-sy)+'px) scale(.55)';
    c.style.opacity='0';
  }));
  setTimeout(()=>c.remove(),560);
  hudPop();
}
function hudPop(){
  const el=$('#hudMoneyS')||$('#hudMoney'); if(!el)return;
  el.style.transition='transform .12s'; el.style.transform='scale(1.2)';
  setTimeout(()=>{el.style.transform=''},150);
}
/* 顾客表情飘字 */
function floatEmoji(el,emoji){
  if(!el)return;
  const app=$('#app'); if(!app)return;
  const a=app.getBoundingClientRect(), r=el.getBoundingClientRect();
  const d=document.createElement('div');
  d.textContent=emoji;
  d.style.cssText='position:absolute;left:'+(r.left-a.left+r.width/2-14)+'px;top:'+(r.top-a.top-4)+'px;'+
    'font-size:22px;z-index:96;pointer-events:none;animation:floatUp 1.1s ease-out forwards';
  app.appendChild(d); setTimeout(()=>d.remove(),1150);
}
/* 连击弹跳 */
function comboPop(){
  const chip=$('#dayChip'); if(!chip)return;
  chip.style.transition='transform .12s'; chip.style.transform='scale(1.15)';
  setTimeout(()=>{chip.style.transform=''},140);
}
/* 收款金额弹出（金色描边，比 jump 更「爽」：更大字号 + 描边 + 弧线上升） */
function moneyPop(el,amount,tip){
  if(!el)return;
  const app=$('#app'); if(!app)return;
  const a=app.getBoundingClientRect(), r=el.getBoundingClientRect();
  const d=document.createElement('div');
  d.textContent=(tip>0?'+':'+')+money(amount)+((tip>0)?' 💰':'');
  d.style.cssText='position:absolute;left:'+(r.left-a.left+r.width/2-26)+'px;top:'+(r.top-a.top-6)+'px;'+
    'font-size:'+(tip>0?20:16)+'px;font-weight:800;color:#F5B942;z-index:97;pointer-events:none;'+
    '-webkit-text-stroke:1px rgba(93,58,10,.85);text-shadow:0 2px 0 rgba(93,58,10,.4);'+
    'animation:moneyPop .85s cubic-bezier(.2,.7,.3,1) forwards';
  app.appendChild(d); setTimeout(()=>d.remove(),900);
}
/* 连击里程碑：金色大字横幅 + 金币雨 + 3 连振（combo≥5 触发，每 5 档一次） */
function comboMilestone(n){
  const app=$('#app'); if(!app)return;
  const b=document.createElement('div'); b.id='comboMilestone';
  b.textContent='🔥 连击 ×'+n+'！';
  app.appendChild(b);
  setTimeout(()=>b.remove(),1300);
  if(n>=50){ coinRain(18); SFX.fanfare(); }
  else if(SFX&&typeof SFX.comboTick==='function')SFX.comboTick(n);
  else if(typeof SFX!=='undefined'&&SFX.coin)SFX.coin();
  vibrate([30,30,30]);
}
/* 金币雨（FEVER 爆发） */
function coinRain(n){
  const app=$('#app'); if(!app)return;
  const layer=$('#toastLayer')||app;
  for(let i=0;i<(n||10);i++){
    const c=document.createElement('div');
    c.textContent='🪙';
    c.style.cssText='position:absolute;top:-20px;left:'+(Math.random()*92)+'%;font-size:18px;z-index:97;pointer-events:none;animation:coinRain 1s ease-in '+(Math.random()*.5)+'s forwards';
    layer.appendChild(c); setTimeout(()=>c.remove(),1600);
  }
}
/* 结算页彩带雨（net>0 撒金带，net<0 灰色碎屑「自哀」模式） */
function confettiRain(n,mode){
  const app=$('#app'); if(!app)return;
  const layer=$('#toastLayer')||app;
  const palette=mode==='sad'?['#9a9a9a','#7d7d7d','#b5b5b5']:['#F5B942','#E87A4F','#7FB069','#4D8BC4','#D77BA6','#fff'];
  for(let i=0;i<(n||20);i++){
    const c=document.createElement('div');
    const w=6+Math.random()*8, h=10+Math.random()*8;
    c.style.cssText='position:absolute;top:-24px;left:'+(Math.random()*94)+'%;width:'+w+'px;height:'+h+'px;z-index:97;pointer-events:none;'+
      'background:'+palette[(Math.random()*palette.length)|0]+';border-radius:'+(Math.random()>.5?'2px':'50%')+';'+
      'animation:confettiFall '+(1.4+Math.random()*1.2)+'s ease-in '+(Math.random()*.6)+'s forwards';
    layer.appendChild(c); setTimeout(()=>c.remove(),3400);
  }
}
/* FEVER 金闪 */
function feverFlash(){
  const f=$('#flash'); if(!f)return;
  f.classList.remove('fever'); void f.offsetWidth; f.classList.add('fever');
}
/* FEVER 横幅 */
function showFeverBanner(){
  const app=$('#app'); if(!app)return;
  let b=$('#feverBanner');
  if(!b){ b=document.createElement('div'); b.id='feverBanner'; b.textContent='🔥 FEVER！连击翻倍'; app.appendChild(b); }
  if(b.style.display==='block')return;              // 已显示，不重复动画
  b.style.display='block'; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
}
function hideFeverBanner(){ const b=$('#feverBanner'); if(b)b.style.display='none'; }
/* 成品飞向客人 */
function flyCake(fromEl,toEl){
  const app=$('#app'); if(!app||!fromEl||!toEl)return;
  const a=app.getBoundingClientRect(), r=fromEl.getBoundingClientRect(), t=toEl.getBoundingClientRect();
  const d=document.createElement('div');
  d.textContent=(window.GAME_PROFILE&&window.GAME_PROFILE.emoji)||'🫓';
  d.style.cssText='position:absolute;left:'+(r.left-a.left+r.width/2-14)+'px;top:'+(r.top-a.top)+'px;font-size:24px;z-index:96;pointer-events:none;transition:transform .38s cubic-bezier(.3,0,.2,1),opacity .38s';
  app.appendChild(d);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    d.style.transform='translate('+(t.left-a.left+t.width/2-(r.left-a.left+r.width/2))+'px,'+(t.top-a.top-(r.top-a.top))+'px) scale(.75)';
    d.style.opacity='.15';
  }));
  setTimeout(()=>d.remove(),420);
}
/* 结算数字滚动 */
function countUp(el,to,dur){
  if(!el)return;
  const from=0, t0=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=(to>=0?'+':'')+money(Math.round(from+(to-from)*e));
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* 备货页卡片依次入场 */
function staggerIn(scope){
  if(!scope)return;
  [...scope.children].forEach((ch,i)=>{
    ch.style.animation='none'; void ch.offsetWidth;
    ch.style.animation='staggerIn .32s ease-out '+(i*.04)+'s both';
  });
}
/* 触觉反馈（移动端） */
function vibrate(ms){ if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
/* 按钮涟漪 */
function ripple(btn,e){
  if(!btn)return;
  const r=btn.getBoundingClientRect(), d=document.createElement('span');
  const size=Math.max(r.width,r.height);
  d.style.cssText='position:absolute;left:'+((e.clientX||r.left+r.width/2)-r.left-size/2)+'px;top:'+((e.clientY||r.top+r.height/2)-r.top-size/2)+'px;'+
    'width:'+size+'px;height:'+size+'px;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none;animation:rippleOut .45s ease-out forwards';
  if(getComputedStyle(btn).position==='static')btn.style.position='relative';
  btn.style.overflow='hidden';
  btn.appendChild(d); setTimeout(()=>d.remove(),480);
}
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest?e.target.closest('.btn'):null;
  if(b)ripple(b,e);
},true);
