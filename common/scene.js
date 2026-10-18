/* ============================================================================
 * 发展国 · Phaser 像素场景层（Kairosoft 游戏发展国 视觉语言还原）
 * ----------------------------------------------------------------------------
 * 用 Phaser 3 替换原 Canvas 手画引擎：办公室场景 + 角色精灵 + 时间轴条 +
 * 开发进度条 + 跳跃彩屑粒子 + 震动。4 款游戏共用，按 profile.office.tier 切背景。
 *
 * 对外接口与旧版完全一致，ui.js / boot.js 零改动：
 *   scene.bind(id)                 初始化 Phaser（id 是父容器 DOM）
 *   scene.update(opts)             注入 tier/phase/progress/showBar
 *   scene.pulse()                  负反馈震动
 *   scene.doJump()                 角色跳跃 + 彩屑（发行庆祝）
 *   scene.animateProgressTo(t, ms) 开发进度条 0→100% 平滑爬升
 *
 * 贴图：assets/*.png（char_stand_X / char_walk_X_Y / office_1..4 / desk / plant）
 * Phaser 引擎：lib/phaser.min.js（本地离线引入，不走 CDN）
 * ==========================================================================*/
const scene = (function(){
  'use strict';

  /* ---------- 场景元数据（按办公室档位 1-4，越豪华越亮） ---------- */
  const OFFICE = [
    { name:'车库',     sky:'#2a3550', skyHi:'#3d4d6e', wall:'#5a4a3a', floor:'#4a3a2a', floorHi:'#5a4838', desk:1, char:1, lamp:1, plant:0, art:0, sign:'车库' },
    { name:'小办',     sky:'#3a4a66', skyHi:'#4d6288', wall:'#6a5a48', floor:'#584838', floorHi:'#6a5845', desk:2, char:2, lamp:1, plant:1, art:0, sign:'小办' },
    { name:'大办',     sky:'#4a5e80', skyHi:'#6480a8', wall:'#7a6a55', floor:'#685845', floorHi:'#7a6850', desk:3, char:4, lamp:2, plant:2, art:1, sign:'大办' },
    { name:'旗舰总部', sky:'#5a6e98', skyHi:'#7d98c8', wall:'#9a8a6a', floor:'#8a7858', floorHi:'#9a8a68', desk:4, char:5, lamp:3, plant:3, art:2, sign:'总部' },
  ];
  const PHASE_NAME = { greenlight:'立项', develop:'开发', ship:'发行', perform:'结算', bankrupt:'破产' };
  const PHASE_FILL = { greenlight:.3, develop:.55, ship:.8, perform:.6, bankrupt:0 };

  /* ---------- 贴图名清单（与 assets/ 对齐） ---------- */
  const SPRITE_NAMES = [
    ...[0,1,2,3,4].map(i=>`char_stand_${i}`),
    ...[0,1,2,3,4].flatMap(i=>[0,1,2,3].map(f=>`char_walk_${i}_${f}`)),
    'office_1','office_2','office_3','office_4',
    'desk','plant',
  ];

  let PHASER_OK = (typeof window!=='undefined' && !!window.Phaser);
  let game=null, sceneRef=null, started=false;

  // 尺寸：Phaser 逻辑宽 640，高 300（放大+丰富像素办公室，让画面成视觉主体）
  const LOGIC_W = 640, LOGIC_H = 300;
  const S = {};   // 场景对象引用（角色、背景、进度、时间轴、粒子、震屏组）

  /* ---------- 初始化 Phaser ---------- */
  let TycoonPreload=null, TycoonScene=null;   // 惰性构建（Phaser 可用时才 class extends）
  function _build(){
    if(TycoonScene) return;   // 只构建一次
    class _Preload extends Phaser.Scene {
      constructor(){ super({ key:'pre' }); }
      preload(){
        const base = '../../assets/';
        SPRITE_NAMES.forEach(n=> this.load.image(n, base + n + '.png'));
      }
      create(){ this.scene.start('tycoon'); }
    }
    class _Main extends Phaser.Scene {
      constructor(){ super({ key:'tycoon' }); }
      create(){
        sceneRef = this;
        // 状态
        this.tier = 1; this.phase = 'greenlight'; this.progress = 0; this.showBar = false;

        // 1x1 白像素纹理兜底（贴图缺失时用，避免引用无效键）
        this.textures.addCanvas('solid', ()=>{
          const cv=document.createElement('canvas'); cv.width=1; cv.height=1;
          const g=cv.getContext('2d'); g.fillStyle='#ffffff'; g.fillRect(0,0,1,1);
          return cv;
        });
        // 彩色纹理（供 rect/tint 用）
        this._mkColoredTex('tile_cyan',0x3a80a8);
        this._mkColoredTex('tile_gold',0xF5B942);
        this._mkColoredTex('tile_red',0xD95D5D);
        this._mkColoredTex('tile_green',0x6B9E5A);
        this._mkColoredTex('tile_gray',0x555566);

        const meta=()=>OFFICE[this.tier-1]||OFFICE[0];

        // ============ 背景：像素办公室横截面（4 档叠放淡入淡出） ============
        this.bgGroup=[];
        for(let t=1;t<=4;t++) this.bgGroup.push(this._drawOfficeBg(t));

        // 角色（最多 5 个，按档位 1/2/4/5 显示，坐在桌前）
        this.chars=[];
        for(let i=0;i<5;i++){
          const key=`char_stand_${i}`;
          const c={
            sprite:this.add.image(0,0, this.textures.exists(key)?key:'solid').setOrigin(0.5,1).setAlpha(0),
            x:40, yOff:0, vy:0, walkFrame:0, colorIdx:i, typewake:0,
          };
          this.chars.push(c);
        }

        // 彩屑粒子（跳跃庆祝）
        const confettiKey=this.textures.exists('char_stand_0')?'char_stand_0':'solid';
        this.confetti=this.add.particles({
          texture:confettiKey, emitting:false, lifespan:900,
          speedX:{min:-70,max:70}, speedY:{min:-150,max:-60}, gravity:200,
          scale:{start:.18,end:.04},
          tint:[0xF5B942,0xD95D5D,0x6B9E5A,0x7FB0D6,0xC97B2D,0xF5A0A0],
        });

        // 顶部阶段徽章条（像素风）
        this.barBg=this.add.rectangle(0,0,LOGIC_W,18,0x101018,.9).setOrigin(0,0);
        this.barFill=this.add.rectangle(0,0,LOGIC_W*.3,18,0xF5B942,.25).setOrigin(0,0);
        this.barText=this.add.text(8,4,'📋 立项',{fontFamily:'monospace',fontSize:'11px',color:'#ffd98a',fontStyle:'bold'}).setOrigin(0,0);

        // 底部开发进度条（像素风）
        this.progBarBg=this.add.rectangle(LOGIC_W/2,LOGIC_H-16,LOGIC_W-40,12,0x101018,.85).setOrigin(.5);
        this.progBarFill=this.add.rectangle(2,LOGIC_H-16,0,12,0x6B9E5A).setOrigin(0,.5);
        this.progLabel=this.add.text(14,LOGIC_H-26,'开发进度',{fontFamily:'monospace',fontSize:'10px',color:'#b8e8a0'});
        this.progPct=this.add.text(LOGIC_W-14,LOGIC_H-16,'0%',{fontFamily:'monospace',fontSize:'10px',color:'#fff',fontStyle:'bold'}).setOrigin(1,.5);
        this.progGroup=this.add.group();
        this.progGroup.add([this.progBarBg,this.progBarFill,this.progLabel,this.progPct]);
        this.progGroup.setVisible(false);

        // 震屏
        this.shakeCam=this.cameras.main;

        // 处理缓存的 update
        if(S.pending){ this.applyUpdate(S.pending); S.pending=null; }
      }

      // 生成彩色 1x1 纹理
      _mkColoredTex(name,color){
        if(this.textures.exists(name)) return;
        const hex=color.toString(16).padStart(6,'0');
        const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
        this.textures.addCanvas(name, ()=>{
          const cv=document.createElement('canvas'); cv.width=1; cv.height=1;
          const ctx=cv.getContext('2d'); ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(0,0,1,1);
          return cv;
        });
      }

      // 画一档办公室背景（返回 image 组，叠放淡入淡出）
      _drawOfficeBg(tier){
        const m=OFFICE[tier-1];
        const W=LOGIC_W, H=LOGIC_H;
        const floorY=Math.floor(H*0.62);        // 地板线
        const deskY=floorY-8;                     // 桌子顶
        // 用一张透明画布，手绘
        const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
        const g=cv.getContext('2d');

        // 天空（窗外）
        const sky=g.createLinearGradient(0,0,0,floorY);
        sky.addColorStop(0,m.skyHi); sky.addColorStop(1,m.sky);
        g.fillStyle=sky; g.fillRect(0,0,W,floorY);
        // 星星/月亮点缀
        g.fillStyle='rgba(255,255,255,.5)';
        for(let i=0;i<12;i++){ g.fillRect((i*53+7)%W, (i*31+13)%Math.floor(floorY*0.5), 1,1); }
        // 月亮
        g.fillStyle='rgba(255,230,180,.85)';
        g.beginPath(); g.arc(W-70,34,16,0,Math.PI*2); g.fill();
        g.fillStyle=m.skyHi; g.beginPath(); g.arc(W-64,30,15,0,Math.PI*2); g.fill();

        // 墙面（下半到地板线）
        g.fillStyle=m.wall;
        g.fillRect(0,Math.floor(floorY*0.45),W,floorY-Math.floor(floorY*0.45));

        // 地板（条纹）
        for(let y=floorY;y<H;y+=2){ g.fillStyle=(y%4<2)?m.floor:m.floorHi; g.fillRect(0,y,W,2); }

        // 窗户（3 扇，随档位变多）
        const wins=2+Math.floor(tier/2);
        const ww=70, wh=Math.floor(floorY*0.42), wy=Math.floor(floorY*0.08);
        for(let i=0;i<wins;i++){
          const x=40+i*( (W-80)/(wins) );
          g.fillStyle='#1a1a24'; g.fillRect(x-3,wy-3,ww+6,wh+6);
          g.fillStyle='#0f1822'; g.fillRect(x,wy,ww,wh);
          g.strokeStyle='#4a6070'; g.lineWidth=1; g.strokeRect(x,wy,ww,wh);
          g.beginPath(); g.moveTo(x+ww/2,wy); g.lineTo(x+ww/2,wy+wh); g.moveTo(x,wy+wh/2); g.lineTo(x+ww,wy+wh/2); g.stroke();
        }

        // 吊灯（档位越高越多）
        for(let i=0;i<m.lamp;i++){
          const lx=W*0.2+i*(W*0.6/Math.max(1,m.lamp-1||1));
          g.fillStyle='#333'; g.fillRect(lx-1,0,2,floorY*0.42);
          g.fillStyle='#ffd98a'; g.beginPath(); g.arc(lx,floorY*0.42,7,0,Math.PI*2); g.fill();
          g.fillStyle='rgba(255,217,138,.15)'; g.beginPath(); g.arc(lx,floorY*0.42+26,30,0,Math.PI*2); g.fill();
        }

        // 挂画（档位越高越多）
        for(let i=0;i<m.art;i++){
          const ax=W*0.35+i*(W*0.14);
          g.fillStyle='#2a2a3a'; g.fillRect(ax,Math.floor(floorY*0.12),34,24);
          g.fillStyle=i%2? '#7fb0d6':'#f5a0a0'; g.fillRect(ax+4,Math.floor(floorY*0.12)+4,26,16);
        }

        // 公司招牌（左侧）
        g.fillStyle='#101018'; g.fillRect(6,Math.floor(H*0.14),64,26);
        g.fillStyle='#F5B942'; g.font='bold 15px monospace'; g.textAlign='center';
        g.fillText(m.sign,38,Math.floor(H*0.14)+18);

        // 长桌 + 电脑（档位越高桌子越多）
        for(let i=0;i<m.desk;i++){
          const dx=80+i*(W-160)/Math.max(1,m.desk-1||1);
          const dw=90, dh=10;
          g.fillStyle='#3a2a1a'; g.fillRect(dx,deskY,dw,4);          // 桌面
          g.fillStyle='#2a1e10'; g.fillRect(dx+6,deskY+4,6,dh); g.fillRect(dx+dw-12,deskY+4,6,dh); // 桌腿
          // 电脑（屏幕+支架）
          g.fillStyle='#1a1a2a'; g.fillRect(dx+dw/2-12,deskY-22,24,20);
          g.fillStyle='#3a80a8'; g.fillRect(dx+dw/2-9,deskY-19,18,14);
          g.fillStyle='#5a5a6a'; g.fillRect(dx+dw/2-4,deskY-4,8,4);  // 键盘
        }

        // 盆栽（档位越高越多）
        for(let i=0;i<m.plant;i++){
          const px=W-40-i*40;
          g.fillStyle='#8a4a2a'; g.fillRect(px-6,floorY-14,12,10);
          g.fillStyle='#4a8a3a'; g.beginPath(); g.arc(px,floorY-18,9,0,Math.PI*2); g.fill();
          g.fillStyle='#6aaa5a'; g.beginPath(); g.arc(px-3,floorY-20,4,0,Math.PI*2); g.fill();
        }

        // 转成 Phaser 纹理
        const key='office_' + tier;
        this.textures.addCanvas(key, ()=>cv);
        return this.add.image(0,0,key).setOrigin(0,0).setAlpha(0);
      }

      applyUpdate(o){
        this.tier=o.tier||1; this.phase=o.phase||'greenlight';
        if(o.progress!==undefined) this.progress=o.progress;
        if(o.showBar!==undefined) this.showBar=o.showBar;
        if(this.phase==='develop') this.showBar=true;
        this.layoutScene();
      }

      layoutScene(){
        this.bgGroup.forEach((b,i)=>{ const on=(i+1)===this.tier;
          this.tweens.add({targets:b,alpha:on?1:0,duration:250,ease:'Linear'}); });
        const meta=OFFICE[this.tier-1]||OFFICE[0];
        const floorY=Math.floor(LOGIC_H*0.62);
        // 角色站在地板线上（桌前，略低一点显得在桌后）
        const charY=floorY+6;
        this.chars.forEach((c,i)=>{
          const show=i<meta.char; c.sprite.setVisible(show);
          if(show){ c.x=80+i*(LOGIC_W-160)/Math.max(1,meta.char-1||1);
            c.sprite.setPosition(c.x, charY); c.yOff=0; c.vy=0; this.setCharTexture(c,'stand'); }
        });
        const fillPct=PHASE_FILL[this.phase]||.3;
        this.barFill.width=(LOGIC_W)*fillPct;
        const icon={greenlight:'📋',develop:'💻',ship:'🚀',perform:'📈',bankrupt:'💸'}[this.phase]||'📋';
        this.barText.setText(icon+' '+(PHASE_NAME[this.phase]||this.phase)+' · '+meta.name);
        this.progGroup.setVisible(this.showBar);
        if(this.showBar) this.refreshProgress();
      }

      setCharTexture(c,mode,frame){
        const key=mode==='stand'?`char_stand_${c.colorIdx}`:`char_walk_${c.colorIdx}_${(frame%4)}`;
        if(this.textures.exists(key)) c.sprite.setTexture(key);
      }

      refreshProgress(){
        const p=Phaser.Math.Clamp(this.progress,0,1);
        const fullW=LOGIC_W-40;
        this.progBarFill.width=fullW*p;
        this.progBarFill.setPosition(20, LOGIC_H-16);
        this.progPct.setText(Math.round(p*100)+'%');
        this.progPct.setPosition(LOGIC_W-14, LOGIC_H-16);
      }

      animateProgressTo(target,ms){
        target=target||1; this.showBar=true; this.progGroup.setVisible(true);
        this.tweens.add({ targets:this, progress:target, duration:ms||1800, ease:'Sine.easeInOut',
          onUpdate:()=>this.refreshProgress(),
          onComplete:()=>{ this.progress=target; this.refreshProgress(); } });
        this.chars.forEach(c=>c.anim=true);
      }

      jumpAll(){
        const meta=OFFICE[this.tier-1]||OFFICE[0];
        const floorY=Math.floor(LOGIC_H*0.62);
        const charY=floorY+6;
        this.chars.forEach((c,i)=>{
          if(i>=meta.char)return;
          setTimeout(()=>{
            c.vy=-8-Math.random()*2.5; c.yOff=0;
            this.confetti.setPosition(c.x, charY-4);
            this.confetti.explode(14);
          }, i*60);
        });
      }

      shake(){ this.shakeCam.shake(160,.008,false); }

      update(time,dt){
        if(!this.chars) return;
        const meta=OFFICE[this.tier-1]||OFFICE[0];
        const floorY=Math.floor(LOGIC_H*0.62);
        const charY=floorY+6;
        this.chars.forEach((c,i)=>{
          if(i>=meta.char)return;
          if(c.vy!==0||c.yOff!==0){
            c.yOff+=c.vy; c.vy+=.65;
            if(c.yOff>0){ c.yOff=0; c.vy=0; }
            c.sprite.y=charY-c.yOff;
          } else if(c.sprite.y!==charY){ c.sprite.y=charY; }
          if((this.phase==='develop'||this.phase==='perform')&&Math.random()<.5){
            c.walkFrame=(c.walkFrame+1)%4;
            this.setCharTexture(c,'walk',c.walkFrame);
          }
        });
        if(this.showBar) this.refreshProgress();
      }
    }
    TycoonPreload=_Preload; TycoonScene=_Main;
  }

  /* ---------- 初始化 Phaser ---------- */
  function bind(parent){
    if(!PHASER_OK){ // 加载不到 Phaser：静默降级为占位色块，不阻塞其余玩法
      const el=document.getElementById(parent||'scene');
      if(el){ el.style.background='linear-gradient(180deg,#2a3550,#4a3a2a)'; }
      console.warn('[tycoon] Phaser 未加载，场景降级为占位');
      return false;
    }
    const parentEl=document.getElementById(parent||'scene');
    if(!parentEl) return false;
    _build();   // 惰性构建场景类（此时 Phaser 已确认可用）
    // 容器已由 CSS 锁定 640x300 比例，Phaser Scale.FIT 会据此把 640x300 逻辑画布等比缩放进容器
    const config = {
      type: Phaser.AUTO,
      parent: parent,
      width: LOGIC_W, height: LOGIC_H,
      pixelArt: true,
      backgroundColor: OFFICE[0].sky,
      scene: [TycoonPreload, TycoonScene],
      banner: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    };
    game = new Phaser.Game(config);
    game.events.once(Phaser.Core.Events.READY, ()=>{ started=true; });
    return true;
  }

  /* ---------- 外部状态注入 ---------- */
  function update(opts){
    if(!started){ S.pending = opts; return; }   // 尚未 READY，缓存
    const o = opts || {};
    if(sceneRef) sceneRef.set('tier', o.tier||1),
                 sceneRef.set('phase', o.phase||'greenlight');
    if(o.progress!==undefined){
      if(sceneRef) sceneRef.set('progress', o.progress);
    }
    if(sceneRef){
      sceneRef.set('showBar', o.showBar || false);
      if(o.phase==='develop') sceneRef.set('showBar', true);
    }
    S.pending = null;
  }
  function pulse(){
    if(!started || !sceneRef) return;
    sceneRef.shake();
  }
  function doJump(){
    if(!started || !sceneRef) return;
    sceneRef.jumpAll();
  }
  function animateProgressTo(target, durationMs){
    if(!started || !sceneRef){
      if(S.pending){ S.pending.showBar = true; }
      return;
    }
    sceneRef.set('showBar', true);
    sceneRef.animateProgressTo(target||1, durationMs||1800);
  }

  const scene = { bind, update, pulse, doJump, animateProgressTo };

  // 浏览器：window 不存在时挂到全局（node 无头 vm 测试用）；
  // 浏览器：window 存在时暴露为 window.scene（与旧 Canvas 版一致的命名空间）
  const g = (typeof window!=='undefined') ? window : (typeof globalThis!=='undefined'?globalThis:null);
  if(g) g.scene = scene;

  return scene;
})();
