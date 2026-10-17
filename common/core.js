/* 巷口小吃合集 · 公共引擎 core.js */
/* 巷口蛋烘糕 · core.js · 工具函数 + Web Audio 程序化音效引擎 */
"use strict";
/* ---------- 游戏配置接入（profile 驱动） ---------- */
const GAME=window.GAME_PROFILE||{};
/* ---------- 本地化词表：默认蛋烘糕，profile.vocab 按小吃覆盖 ---------- */
const V=(function(){
  const DEF={
    good:'蛋烘糕', piece:'糕', unit:'个',
    batter:'面糊', flour:'面粉', yeast:'泡打粉',
    prepName:'和面发酵', fermWay:'发酵', fermDone:'和面',
    cookSign:'等蜂窝眼起来',
    defaultShop:'巷口蛋烘糕',
    competitor:'隔壁老王蛋烘糕', rival2:'巷尾李家糕铺',
  };
  return k=>(GAME.vocab&&GAME.vocab[k])||DEF[k];
})();
const F=id=>GAME.fillings.find(f=>f.id===id);
if(!GAME.weathers)GAME.weathers=[
 {id:'sunny',n:'晴天',ic:'☀️',flow:1.3,desc:'太阳当空照，客流滚滚来'},
 {id:'cloudy',n:'多云',ic:'⛅',flow:1.0,desc:'不好不坏，像你的工资'},
 {id:'rain',n:'小雨',ic:'🌧️',flow:.6,pat:-15,heat:-30,desc:'火苗有点蔫，耐心也有点蔫'},
 {id:'hot',n:'高温',ic:'🥵',flow:.7,cold:1,desc:'冷饮的春天，热食的寒冬'},
 {id:'cold',n:'严寒',ic:'🧣',flow:.8,warm:1,desc:'手僵，但人心是暖的'},
 {id:'storm',n:'暴雨',ic:'⛈️',flow:.15,desc:'建议请假，老天爷也请假了'},
];
if(!GAME.winds)GAME.winds=[
 {id:'crisp',n:'今天流行嘎嘣脆',tags:['脆']},
 {id:'gooey',n:'今天流行爆浆拉丝',tags:['拉丝','冰']},
 {id:'spicy',n:'今天人人无辣不欢',tags:['辣']},
 {id:'retro',n:'今天怀旧风上头',tags:['怀旧','基础']},
 {id:'net',n:'今天网红体质当道',tags:['网红','甜宠']},
 {id:'meat',n:'今天肉食者胜',tags:['肉','豪华']},
 {id:'plain',n:'今天大家想吃点普通的',tags:['基础']},
];
if(!GAME.events)GAME.events=[
 {id:'chengguan',n:'城管巡逻',w:20},{id:'blogger',n:'博主探店',w:16},{id:'bulk',n:'公司团购',w:12},
 {id:'gasout',n:'燃气不足',w:8},{id:'queuejump',n:'有人插队',w:10},{id:'cat',n:'流浪猫',w:8},
 {id:'rival',n:'竞品开业',w:6},{id:'mystery',n:'神秘顾客',w:6},{id:'priceup',n:'食材涨价',w:8},
 {id:'inspect',n:'食品抽检',w:10},{id:'heirloom',n:'祖传残页',w:4},
];
if(!GAME.ads)GAME.ads=[
 {id:'honest',n:'朴实吆喝',cost:0,flow:.05,risk:0,line:'“好吃不贵，正宗老味道！”'},
 {id:'hype',n:'夸张广告',cost:20,flow:.18,risk:.12,line:'“全城最好吃！不好吃你打我！”'},
 {id:'hunger',n:'饥饿营销',cost:40,flow:.28,risk:.18,pat:-10,line:'“每日限量！卖完不补！懂的都懂！”'},
 {id:'nonsense',n:'离谱吹牛',cost:80,flow:.45,risk:.3,line:'“米其林三星主厨亲手打造，吃一口升仙！”'},
];
/* 主题注入：每游戏的强调色/纸色/标题 emoji */
(function(){
  try{
    const t=GAME.theme||{}, r=document.documentElement;
    if(t.accent)r.style.setProperty('--caramel',t.accent);
    if(t.accent2)r.style.setProperty('--yolk',t.accent2);
    if(t.paper)r.style.setProperty('--paper',t.paper);
    const a=document.getElementById('titleArt'); if(a)a.textContent=GAME.emoji||'🫓';
    const tn=document.querySelector('.titleName'); if(tn)tn.innerHTML='巷口<em>'+V('good')+'</em>';
    const ts=document.getElementById('titleSub'); if(ts)ts.textContent=(GAME.city||'')+'街头模拟经营 · '+(GAME.slogan||'');
    const nt=document.getElementById('newsTag'); if(nt)nt.textContent=(GAME.city||'')+'快讯';
    const nk=document.getElementById('newsTrack'); if(nk)nk.textContent='欢迎来到'+(GAME.city||'')+'街头，'+GAME.name+'与新闻更配哦…';
    if(GAME.name)document.title=GAME.name+' · '+(GAME.city||'')+'街头模拟经营';
    const shop=document.getElementById('inpShop'); if(shop)shop.placeholder='比如：巷口王记'+(GAME.flow&&GAME.flow.shop||'小摊');
  }catch(e){}
})();

/* ---------- 工具 ---------- */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let RNG=Math.random;
const rnd=()=>RNG();
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[Math.floor(rnd()*a.length)];
const chance=p=>rnd()<p;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=v=>'¥'+ (Math.round(v*10)/10).toFixed(v%1===0?0:1);
const money=v=>'¥'+Math.round(v);
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

/* ---------- 音效引擎（Web Audio 程序化合成） ---------- */
const SFX={
  ctx:null,master:null,muted:false,sizz:null,sizzGain:null,sizzFilter:null,
  init(){
    if(this.ctx)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
      this.ctx=new AC();
      this.master=this.ctx.createGain(); this.master.gain.value=.5; this.master.connect(this.ctx.destination);
    }catch(e){}
  },
  resume(){ if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); },
  tone(f,d,type='sine',v=.25,slide=0){
    if(!this.ctx||this.muted)return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+d+.02);
  },
  noise(d,v=.2,freq=1200,q=1){
    if(!this.ctx||this.muted)return;
    const t=this.ctx.currentTime,len=Math.max(1,(d*this.ctx.sampleRate)|0);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),ch=buf.getChannelData(0);
    for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
    const src=this.ctx.createBufferSource();src.buffer=buf;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    const g=this.ctx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
    src.connect(f);f.connect(g);g.connect(this.master);src.start(t);
  },
  click(){this.tone(660,.06,'square',.14)},
  knobTick(){this.tone(1400,.03,'square',.1);this.noise(.05,.12,2600,3)},
  coin(){this.tone(880,.09,'square',.2);setTimeout(()=>this.tone(1320,.14,'square',.2),70)},
  ding(){this.tone(1046,.35,'sine',.3);setTimeout(()=>this.tone(1568,.4,'sine',.2),90)},
  pop(){this.tone(300,.1,'sine',.25,260)},
  fail(){this.tone(220,.4,'sawtooth',.25,-140);this.noise(.25,.18,500,1)},
  fanfare(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.3,'triangle',.28),i*110))},
  warn(){[0,1,2].forEach(i=>setTimeout(()=>this.tone(440,.12,'square',.2),i*180))},
  sizzleOn(){
    if(!this.ctx||this.muted||this.sizz)return;
    const t=this.ctx.currentTime,len=this.ctx.sampleRate*2,buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),ch=buf.getChannelData(0);
    for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=.8;
    const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);
    src.connect(f);f.connect(g);g.connect(this.master);src.start(t);
    this.sizz=src;this.sizzGain=g;this.sizzFilter=f;
  },
  sizzleSet(level){
    if(!this.sizz||!this.ctx)return;
    const t=this.ctx.currentTime;
    this.sizzGain.gain.setTargetAtTime(level===0?0:[.05,.09,.14,.2][level],t,.15);
    this.sizzFilter.frequency.setTargetAtTime([600,900,1400,2200][level],t,.2);
  },
  sizzleOff(){ if(this.sizz){try{this.sizz.stop()}catch(e){} this.sizz=null;this.sizzGain=null;this.sizzFilter=null;} }
};
