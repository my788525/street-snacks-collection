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
