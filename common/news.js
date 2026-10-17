/* 巷口小吃合集 · 公共引擎 news.js */
/* 巷口蛋烘糕 · news.js · 自动拆分自 index.html，请在此文件内继续维护 */

/* ---------- 新闻滚动引擎 ---------- */
function buildNews(){
  const arr=[];
  const pool=GAME.news.filter(n=>!S.seenNews.includes(n.t));
  for(let i=0;i<3;i++){
    const src=(pool.length&&i<2)?pool:GAME.news;
    const n=pick(src); arr.push(n); S.seenNews.push(n.t);
    if(S.seenNews.length>24)S.seenNews.shift();
  }
  G.news=arr; G.newsIdx=0;
}
function newsFxChips(fx){
  const out=[];
  if(fx.flow)out.push((fx.flow>0?'客流 +':'客流 ')+Math.round(fx.flow*100)+'%');
  if(fx.price)out.push('进价 +'+Math.round(fx.price*100)+'%');
  if(fx.gas)out.push('燃气 +'+Math.round(fx.gas*100)+'%');
  if(fx.cg)out.push('城管关注 ↑');
  if(fx.hunger)out.push('限量风潮 ↑');
  if(fx.adrisk)out.push('广告审查 ↑');
  if(fx.rep)out.push('口碑 '+(fx.rep>0?'+':'')+fx.rep);
  if(fx.studentFlow)out.push('学生流 '+(fx.studentFlow>0?'+':'')+Math.round(fx.studentFlow*100)+'%');
  if(fx.cat)out.push('猫猫出没 ↑');
  return out;
}
function newsTick(){
  if(!G.news.length)return;
  const n=G.news[G.newsIdx%G.news.length]; G.newsIdx++;
  const track=$('#newsTrack'),clip=$('#newsClip');
  track.innerHTML='📰 '+n.t;
  const w=clip.clientWidth||300;
  const dur=Math.max(9, n.t.length*.32);
  track.style.transition='none'; track.style.transform='translateX('+w+'px)';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    track.style.transition='transform '+dur+'s linear';
    track.style.transform='translateX(-'+(track.scrollWidth+10)+'px)';
  }));
  $('#newsFx').innerHTML=newsFxChips(n.fx||{}).map(t=>'<span class="fxchip">'+t+'</span>').join('');
  if(G.newsIdx%G.news.length===0)setTimeout(buildNews,9000);
}
function startNewsLoop(){
  if(G.newsTimer)clearInterval(G.newsTimer);
  buildNews(); newsTick();
  G.newsTimer=setInterval(newsTick,12000);
}
