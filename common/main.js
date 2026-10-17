/* 巷口小吃合集 · 公共引擎 main.js */
/* 巷口蛋烘糕 · main.js · 启动、标题页、全局绑定 */

function setVH(){
  const vv=window.visualViewport;
  const h=(vv&&vv.height)||window.innerHeight||document.documentElement.clientHeight||0;
  if(h>0)document.documentElement.style.setProperty('--vh',h+'px');
}
window.addEventListener('resize',setVH);
window.addEventListener('orientationchange',()=>setTimeout(setVH,250));
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',setVH);
  window.visualViewport.addEventListener('scroll',setVH);
}
setVH();

function bindSoundButtons(){
  const ids=['#btnSound','#btnSoundS','#btnSoundE'];
  ids.forEach(sel=>{
    const b=$(sel); if(!b)return;
    b.onclick=()=>{
      SFX.init(); SFX.resume();
      SFX.muted=!SFX.muted;
      if(SFX.master)SFX.master.gain.value=SFX.muted?0:.5;
      ids.forEach(s=>{ const x=$(s); if(x)x.textContent=SFX.muted?'🔇':'🔊'; });
      if(!SFX.muted)SFX.click();
    };
  });
}
function continueDay(){
  const s=load(); if(!s){ toast('存档读取失败，重新开摊吧','bad'); return; }
  S=s; RNG=mulberry32(S.seed);
  G.day=freshDayRec(); G.combo=0;
  G.windTags=GAME.winds.find(w=>w.id===S.wind).tags;
  G.news=(S.pendingNews||[]).map(t=>GAME.news.find(n=>n.t===t)).filter(Boolean);
  if(!G.news.length)buildNews();
  G.newsIdx=0;
  renderPrep(); startNewsLoop(); show('prep'); hudUpdate();
  toast('欢迎回来，'+S.playerName,'good');
}
function bindDiffUI(){
  const descs={chill:DIFFS.chill.desc,std:DIFFS.std.desc,hard:DIFFS.hard.desc,crazy:DIFFS.crazy.desc};
  const render=()=>{
    $$('.diffBtn').forEach(b=>{
      const d=b.dataset.d, un=diffUnlocked(d);
      b.disabled=!un;
      b.innerHTML=(un?'':'🔒 ')+b.dataset.label;
      const sel=(G.pendingDiff===d&&un);
      b.classList.toggle('ghost',!sel);
      b.style.opacity=un?'1':'.5';
    });
    $('#diffDesc').textContent=descs[G.pendingDiff]||'';
  };
  $$('.diffBtn').forEach(b=>b.onclick=()=>{
    const d=b.dataset.d;
    if(!diffUnlocked(d)){ toast(diffLockHint(d),'bad'); SFX.fail(); return; }
    SFX.click(); G.pendingDiff=d; render();
  });
  G.pendingDiff='chill';
  render();
}
function boot(){
  bindSoundButtons(); bindDiffUI(); loadVConsoleIfDebug();
  if(hasSave()){ const b=$('#btnContinue'); if(b)b.style.display=''; }
  $('#btnStart').onclick=()=>{
    SFX.init(); SFX.resume(); SFX.click();
    const name=$('#inpName').value.trim()||'张师';
    const shop=$('#inpShop').value.trim()||V('defaultShop');
    newGame(name,shop,null,G.pendingDiff||'std'); startDay(true); show('prep');
    toast('开摊大吉！先'+V('fermDone')+'、进货、定价','gold');
  };
  $('#btnContinue').onclick=()=>{ SFX.init(); SFX.resume(); SFX.click(); continueDay(); };
  $('#btnOpen').onclick=startService;
  $('#btnNextDay').onclick=()=>{ SFX.click(); startDay(false); show('prep'); };
  $('#btnBackPrep').onclick=()=>{ SFX.click(); show('prep'); };
  document.addEventListener('pointerdown',function once(){ SFX.init(); SFX.resume(); document.removeEventListener('pointerdown',once); },{once:true});
  // 画布分辨率
  const fixDpr=()=>{ panDpr=Math.min(2,window.devicePixelRatio||1); const cv=$('#panCanvas'); if(cv){cv.width=cv.width||0;} };
  window.addEventListener('resize',fixDpr); fixDpr();
}
if(document.readyState!=='loading')boot(); else document.addEventListener('DOMContentLoaded',boot);
