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
      if(!SFX.muted){ SFX.click(); if(SFX.bgmOn)SFX.bgmStop(); }
    };
  });
}
/* BGM 开关（🎵）：进营业屏自动开，🎶 按钮变「关/开」切换；程序化轻快 loop，FEVER 时自动加料 */
function initBgmBtn(){
  const ids=['#btnBgm','#btnBgmS','#btnBgmE'];
  ids.forEach(sel=>{
    const b=$(sel); if(!b)return;
    b.onclick=()=>{
      SFX.init(); SFX.resume();
      if(SFX.muted){ toast('先开音效再开 BGM 哦','bad'); return; }
      SFX.bgm();   // 开→关 / 关→开 切换
      const on=SFX.bgmOn;
      ids.forEach(s=>{ const x=$(s); if(x){ x.textContent=on?'🎵':'🎶'; x.title=on?'BGM 开关（点一下关）':'BGM 开关（点一下开）'; } });
      SFX.click();
    };
  });
}
function continueDay(){
  const s=load(); if(!s){ toast('存档读取失败，重新开摊吧','bad'); return; }
  S=s; RNG=mulberry32(S.seed);
  if(typeof checkSignIn==='function')checkSignIn();
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
    const dd=$('#diffDesc'); if(dd)dd.textContent=descs[G.pendingDiff]||'';
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
  bindSoundButtons(); initBgmBtn(); bindDiffUI(); loadVConsoleIfDebug();
  if(hasSave()){ const b=$('#btnContinue'); if(b)b.style.display=''; }
  const bS=$('#btnStart'); if(bS)bS.onclick=()=>{
    SFX.init(); SFX.resume(); SFX.click();
    const name=$('#inpName').value.trim()||'张师';
    const shop=$('#inpShop').value.trim()||V('defaultShop');
    newGame(name,shop,null,G.pendingDiff||'std'); startDay(true); show('prep');
    toast('开摊大吉！先'+V('fermDone')+'、进货、定价','gold');
  };
  const bC=$('#btnContinue'); if(bC)bC.onclick=()=>{ SFX.init(); SFX.resume(); SFX.click(); continueDay(); };
  const bN=$('#btnNextDay'); if(bN)bN.onclick=()=>{ SFX.click(); startDay(false); show('prep'); };
  const bP=$('#btnBackPrep'); if(bP)bP.onclick=()=>{ SFX.click(); show('prep'); };
  // AudioContext 必须在用户手势内创建/恢复（Chrome 自动播放策略）；无手势时只挂监听，不主动 new
  const unlockAudio=()=>{
    SFX.init(); SFX.resume();
    document.removeEventListener('pointerdown',unlockAudio);
    document.removeEventListener('keydown',unlockAudio);
  };
  document.addEventListener('pointerdown',unlockAudio,{once:true});
  document.addEventListener('keydown',unlockAudio,{once:true});
  // 画布分辨率
  const fixDpr=()=>{ panDpr=Math.min(2,window.devicePixelRatio||1); const cv=$('#panCanvas'); if(cv){cv.width=cv.width||0;} };
  window.addEventListener('resize',fixDpr); fixDpr();
}
if(document.readyState!=='loading')boot(); else document.addEventListener('DOMContentLoaded',boot);
