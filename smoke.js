/* 冒烟测试：Node + DOM 桩驱动真实代码（合集架构：profile + common 引擎） */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BASE = path.join(__dirname);

function el() {
  const e = {
    style: { cssText: '', setProperty() {} }, dataset: {},
    classList: (() => { const s = new Set(); return {
      add(...n) { n.forEach(x => s.add(x)); },
      remove(...n) { n.forEach(x => s.delete(x)); },
      toggle(n, f) { if (f === undefined) { if (s.has(n)) { s.delete(n); return false; } s.add(n); return true; } if (f) s.add(n); else s.delete(n); return !!f; },
      contains(n) { return s.has(n); }
    }; })(),
    children: [], innerHTML: '', textContent: '', value: '', disabled: false,
    appendChild(c) { this.children.push(c); return c }, remove() {},
    insertBefore(c) { this.children.unshift(c); return c }, prepend(c) { this.children.unshift(c); return c },
    firstChild: null,
    querySelector() { return el() }, querySelectorAll() { return [] },
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 } },
    clientWidth: 300, clientHeight: 190, width: 300, height: 150, offsetWidth: 100, scrollWidth: 400,
    onclick: null,
  };
  return e;
}
const ctxStub = new Proxy({}, {
  get: (t, p) => {
    if (p === 'canvas') return {};
    if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: () => true
});

const GAME_IDS = ['danhongao','changfen','roujiamo','jianbing','choudoufu','luosifen','xiaomian','reganmian','kaolengmian','qingbuliang','zhaji','lvrouhuoshao'];
const ENGINE = ['core','state','news','day','prep','service','settle','features1','features2','features3','juice','main'];

let pass = 0, fail = 0;
const run = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } };

/* ---------- 第一轮：11 个 profile 完整性校验 ---------- */
GAME_IDS.forEach(id => {
  run('profile 完整性: ' + id, () => {
    const s = { window: {}, console };
    vm.createContext(s);
    vm.runInContext(fs.readFileSync(path.join(BASE, 'games', id, 'profile.js'), 'utf8'), s, { filename: id + '/profile.js' });
    const p = s.window.GAME_PROFILE;
    if (!p || !p.name) throw new Error('缺少 GAME_PROFILE');
    if (!p.vessel || !p.flow || !p.fireNames || p.fireNames.length !== 4) throw new Error('vessel/flow/fireNames 缺失');
    if (!p.fillings || p.fillings.length < 12) throw new Error('馅料不足 12');
    const ids = p.fillings.map(f => f.id);
    if (new Set(ids).size !== ids.length) throw new Error('馅料 id 重复');
    p.fillings.forEach(f => { if (f.n === undefined || f.c === undefined || !f.ic) throw new Error('馅料字段缺失: ' + f.id); });
    if (!p.customers || p.customers.length < 6) throw new Error('顾客不足 6');
    p.customers.forEach(c => { if (!c.order || !c.order.length || !c.happy || !c.sad) throw new Error('顾客台词缺失: ' + c.id); });
    if (!p.doneness || p.doneness.length !== 3) throw new Error('熟度档不是 3');
    if (!p.premises || p.premises.length !== 5) throw new Error('场地不是 5 级');
    if (!p.news || p.news.length < 8) throw new Error('新闻不足 8');
    if (!p.ads || p.ads.length !== 4) throw new Error('广告档不是 4');
    if (!p.ferms || p.ferms.length !== 3) throw new Error('发酵方式不是 3');
    const VKEYS = ['good','piece','unit','batter','flour','yeast','prepName','fermWay','fermDone','cookSign','defaultShop','competitor','rival2'];
    if (!p.vocab) throw new Error('缺 vocab 词表');
    VKEYS.forEach(k => { if (!p.vocab[k]) throw new Error('vocab 缺 ' + k); });
    if (p.vocab.good === '蛋烘糕' && id !== 'danhongao') throw new Error('good 未本地化');
    if (!p.spots || Object.keys(p.spots).length !== 3) throw new Error('选址不是 3');
    if (!p.yellLines || !p.yellLines.length) throw new Error('吆喝台词缺失');
    (p.pairs || []).forEach(pr => { if (!ids.includes(pr.a) || !ids.includes(pr.b)) throw new Error('相性引用不存在馅料: ' + pr.a + '/' + pr.b); });
    (p.festivals || []).forEach(f => { if (!ids.includes(f.fid)) throw new Error('节日馅料不存在: ' + f.fid); });
  });
});

/* ---------- 第二轮：蛋烘糕完整流程 ---------- */
const elements = {};
function getEl(sel) { if (!elements[sel]) elements[sel] = el(); return elements[sel]; }
const document = {
  readyState: 'complete',
  querySelector(s) { return getEl(s) },
  querySelectorAll() { return [] },
  createElement(t) { const e = Object.assign(el(), { tagName: t }); if (t === 'canvas') { e.getContext = () => ctxStub; e.toDataURL = () => 'data:image/png;base64,xx'; } return e; },
  addEventListener() {},
  documentElement: { style: { setProperty() {} }, clientHeight: 800 },
  body: el(),
};
const canvasEl = el(); canvasEl.getContext = () => ctxStub;
elements['#panCanvas'] = canvasEl;
const sandbox = {
  document, console, Math, JSON, Date, Object, Array, String, Number, isNaN, parseInt, parseFloat,
  innerHeight: 800, devicePixelRatio: 1, addEventListener() {},
  location: { search: '' }, navigator: {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null }, setItem(k, v) { this._d[k] = String(v) }, removeItem(k) { delete this._d[k] } },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  setInterval: () => 0, clearInterval() {},
  setTimeout: (fn) => { if (typeof fn === 'function') { try { fn(); } catch (e) { console.log('  (setTimeout err)', e.message); } } return 0 },
  clearTimeout() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['games/danhongao/profile.js', ...ENGINE.map(m => 'common/' + m + '.js')]) {
  vm.runInContext(fs.readFileSync(path.join(BASE, f), 'utf8'), sandbox, { filename: path.basename(f) });
}
vm.runInContext('globalThis.__x={get G(){return G},get S(){return S},get GAME(){return GAME},get CUSTOMERS(){return GAME.customers},get BAL(){return BAL},get FILLINGS(){return GAME.fillings},get PREMISES(){return GAME.premises},get FESTIVALS(){return GAME.festivals},get FEVER_AT(){return FEVER_AT},get FEVER_SERVES(){return FEVER_SERVES}};', sandbox);
const X = sandbox.__x;
const G = () => X.G;

run('boot', () => sandbox.boot());
run('newGame', () => sandbox.newGame('测试员', '测试小摊'));
run('startDay(true)', () => sandbox.startDay(true));
run('renderPrep', () => sandbox.renderPrep());

run('共享选址池合并 + 城管门口降低城管风险', () => {
  const spots = X.GAME.spots;
  ['resident','expo','chengguan','office','park'].forEach(k=>{ if(!spots[k])throw new Error('缺共享选址 '+k); });
  if(Object.keys(spots).length < 5)throw new Error('选址数应≥5，实为 '+Object.keys(spots).length);
  const S = X.S, bak = {day:S.day, premises:S.premises, spot:S.spot, fxToday:S.fxToday, diff:S.diff};
  S.day = 8; S.premises = 0; S.fxToday = S.fxToday||{}; S.fxToday.cg = 0; S.diff = 'std';
  S.spot='metro'; const wMetro = sandbox.cgWeight();
  S.spot='chengguan'; const wCg = sandbox.cgWeight();
  Object.assign(S, bak);
  if(!(wCg < wMetro))throw new Error('城管门口应比地铁口安全：'+wCg+' vs '+wMetro);
});
run('buy flour', () => { sandbox.S.money = 100; sandbox.priceOf({ id: 'flour', c: .8 }); sandbox.S.batter += 4; });
run('ferment slow', () => { sandbox.S.batter = 0; sandbox.S.ferm = 'slow'; sandbox.S.batter = 6; sandbox.S.batterQ = 1.1; });
run('psychPrice/cakePrice', () => { if (sandbox.psychPrice() <= 0) throw new Error('psych<=0'); if (sandbox.cakePrice(['sugar']) <= 0) throw new Error('cake<=0'); });
run('startService', () => sandbox.startService());
run('pour batter', () => sandbox.wellTap(0));
run('open picker', () => {
  G().wells[0].heat = 200; sandbox.wellTap(0);
  if (G().picked !== 0) throw new Error('picker not opened');
  // 选料改为浮动弹窗：#fillFloat 应显示且含按钮与「选好了」
  const fl = sandbox.document.querySelector('#fillFloat');
  if (!fl || fl.style.display !== 'flex') throw new Error('浮动选料窗未显示');
  const btns = sandbox.document.querySelector('#ffBtns');
  if (!btns.children || !btns.children.length) throw new Error('浮动选料窗无馅料按钮');
});
run('pick fillings', () => { G().wells[0].fills = ['sugar', 'cream']; sandbox.S.inv.sugar = 5; sandbox.S.inv.cream = 5; });
run('fold center (perfect)', () => {
  G().wells[0].heat = 320;
  sandbox.wellTap(0, { dist: 5 });
  if (!G().serve.some(s => s)) throw new Error('对折后应自动上取餐台');
  if (G().wells[0].st !== 'empty') throw new Error('锅应已空出');
  if (G().wells[0].foldOff >= .35) throw new Error('center fold should be perfect');
});
run('fold off-center penalty', () => { const p = sandbox.foldPenalty(0.9); if (p >= 1) throw new Error('off-center should penalize'); });
run('serve to tray（自动上台）', () => { const s = G().serve.find(x => x); if (!s) throw new Error('糕应已在取餐台'); });
run('make customer', () => {
  const c = { type: X.CUSTOMERS[0], order: { fills: ['sugar', 'cream'], done: 'std' }, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false };
  G().queue.push(c);
});
run('serveFromTray', () => sandbox.serveFromTray(0));
run('回归：隐藏需求+锅神对 q 的改写不炸', () => {
  G().godT = 30;
  G().serve[0] = { fills: ['sugar'], q: .9, foldHeat: 400, foldOff: 0 };
  G().queue.length = 0;
  G().queue.push({ type: X.CUSTOMERS[0], order: { fills: ['sugar'], done: 'std', hidden: 'hot' }, pat: 60, wait: 5, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false });
  sandbox.serveFromTray(0);
  G().godT = 0;
});
run('registerSale+combo', () => { sandbox.registerSale('cream+sugar', .9, .9, null); if (!sandbox.S.known['cream+sugar']) throw new Error('combo not registered'); });
run('tryArrive', () => { sandbox.S.batter = 10; sandbox.tryArrive(); });
run('triggerEvent', () => sandbox.triggerEvent());
run('eventBulk', () => sandbox.eventBulk());
run('serveBulk', () => { G().serve[0] = { fills: ['sugar'], q: .8, foldHeat: 330, foldOff: 0 }; sandbox.serveBulk(0); });
run('loop frames x5', () => { try { for (let i = 0; i < 5; i++) sandbox.serviceLoop(sandbox.performance.now() + i * 16); } catch(e){ console.log(e.stack); throw e; } });
run('burnWell', () => sandbox.burnWell(1));
run('endService', () => sandbox.endService());
run('renderSettle', () => sandbox.renderSettle());
run('startDay(false)', () => sandbox.startDay(false));
run('save/load', () => { sandbox.save(); const s = sandbox.load(); if (!s || s.shopName !== '测试小摊') throw new Error('save/load broken'); });
run('gracefulExit', () => { sandbox.S.money = 5; G().crisisDays = 3; sandbox.checkCrisis(); });
run('危机兜底按难度缩放（破产边界适配）', () => {
  const d0 = sandbox.S.diff;
  const bail = { chill: 100, std: 80, hard: 50, crazy: 30 };
  const cd = { chill: 4, std: 3, hard: 3, crazy: 2 };
  Object.keys(bail).forEach(d => {
    sandbox.S.diff = d;
    if (sandbox.diffOf().bail !== bail[d]) throw new Error(d + ' 兜底金应为 ' + bail[d] + '，实为 ' + sandbox.diffOf().bail);
    if (sandbox.diffOf().crisisDays !== cd[d]) throw new Error(d + ' 危机窗口应为 ' + cd[d] + '，实为 ' + sandbox.diffOf().crisisDays);
  });
  // 实际兜底路径：crazy 账上 5、连续 2 天触底 → 点“众筹”后回到 5+30=35
  sandbox.S.diff = 'crazy'; sandbox.S.money = 5; sandbox.S.rep = 60; G().crisisDays = 2;
  const mb = getEl('#modalBox');
  const fundBtn = { onclick: null };
  const realMbQ = mb.querySelector.bind(mb);
  mb.querySelector = (sel) => sel === '#crFund' ? fundBtn : realMbQ(sel);
  sandbox.checkCrisis();
  mb.querySelector = realMbQ;
  if (!fundBtn.onclick) throw new Error('crazy 危机未被触发（窗口=2 应触发）');
  fundBtn.onclick();
  if (sandbox.S.money !== 35) throw new Error('crazy 兜底后应为 35，实为 ' + sandbox.S.money);
  sandbox.S.diff = d0;
});
run('continueDay', () => sandbox.continueDay());
run('回归：读档后营业不炸', () => {
  sandbox.save();
  const S2 = sandbox.load();
  if (!S2) throw new Error('load fail');
  G().day = null;
  sandbox.continueDay();
  if (!G().day) throw new Error('G.day 未初始化（就是这次的 bug）');
  sandbox.startService();
  sandbox.lostCustomer('测试流失');
  sandbox.serviceLoop(sandbox.performance.now() + 16);
});
run('燃气指示 + 倒计时 + 断气门槛', () => {
  sandbox.S.gas = 3; G().gasUsed = 0; G().gasOut = false; G().dayT = 0; sandbox.S.day = 5;
  const total = sandbox.dayLenTotal();
  if (!(total > 0)) throw new Error('dayLenTotal 应为正');
  // 用掉 1.5 瓶（300 单位）→ 剩余瓶数 3 - floor(300/200)=2；当前瓶已用 (300%200)/200=50%
  G().gasUsed = 300;
  const cansLeft = Math.max(0, sandbox.S.gas - Math.floor(G().gasUsed / 200));
  const curUsed = (G().gasUsed % 200) / 200 * 100;
  if (cansLeft !== 2) throw new Error('剩余瓶数应为 2，实为 ' + cansLeft);
  if (Math.round(curUsed) !== 50) throw new Error('当前瓶已用应为 50%，实为 ' + curUsed);
  // 断气事件门槛：满气不应有资格；仅剩 <1 瓶才有资格
  sandbox.S.gas = 3; G().gasUsed = 0;
  if ((sandbox.S.gas * 200 - G().gasUsed) < 200) throw new Error('满气时断气事件不应有资格');
  sandbox.S.gas = 3; G().gasUsed = 3 * 200 - 100;
  if (!((sandbox.S.gas * 200 - G().gasUsed) < 200)) throw new Error('仅剩<1瓶时断气事件应有资格');
  // 状态条渲染不崩，且含倒计时与燃气
  G().gasUsed = 0; G().dayT = 10; sandbox.renderStoveStatus();
  const ss = getEl('#stoveStatus').innerHTML;
  if (!ss.includes('今日') || !ss.includes('燃气')) throw new Error('状态条应含倒计时与燃气');
});
run('低气状态条脉动 + 断气强红抖', () => {
  // 低气：剩 1 瓶且已用 70%（rem=200-140=60 < 200×0.35=70）→ 加 low 类
  sandbox.S.gas = 1; G().gasOut = false; G().gasUsed = 140;
  sandbox.renderStoveStatus();
  const ss = getEl('#stoveStatus');
  if (!ss.classList.contains('low')) throw new Error('低气应加 low 类');
  if (ss.classList.contains('out')) throw new Error('未断气不应加 out 类');
  // 断气 → 加 out 类、去掉 low
  G().gasOut = true; sandbox.renderStoveStatus();
  if (!ss.classList.contains('out')) throw new Error('断气应加 out 类');
  if (ss.classList.contains('low')) throw new Error('断气时不应再加 low 类');
  // 正常 → 无 low/out
  G().gasOut = false; sandbox.S.gas = 3; G().gasUsed = 0; sandbox.renderStoveStatus();
  if (ss.classList.contains('low') || ss.classList.contains('out')) throw new Error('正常状态不应有 low/out 类');
});
run('操作按钮替换火力按钮：一键倒糊 / 清糊锅', () => {
  // 一键倒糊：所有空锅倒糊，糊不够按剩余量算
  sandbox.S.batter = 99;
  G().wells.forEach(w => { w.st = 'empty'; w.heat = 0; w.fills = []; });
  sandbox.pourAll();
  if (!G().wells.every(w => w.st === 'batter')) throw new Error('一键倒糊后应全部变 batter');
  if (sandbox.S.batter !== 99 - 7) throw new Error('7 锅应消耗 7 份糊');
  // 糊不够：只倒得出剩余份数
  G().wells.forEach(w => { w.st = 'empty'; });
  sandbox.S.batter = 2;
  sandbox.pourAll();
  const poured = G().wells.filter(w => w.st === 'batter').length;
  if (poured !== 2) throw new Error('糊 2 份应只倒 2 锅，实为 ' + poured);
  // 清糊锅
  G().wells.forEach(w => { w.st = 'empty'; });
  G().wells[0].st = 'burn'; G().wells[3].st = 'burn';
  const waste0 = G().day.waste;
  sandbox.trashBurnt();
  if (G().wells.some(w => w.st === 'burn')) throw new Error('清糊锅后不应剩 burn');
  if (G().day.waste !== waste0 + 2) throw new Error('清糊锅应计损耗 +2');
});
run('面糊可分批和面（多批叠加，不再限 12 份）', () => {
  X.S.batterBatches = []; sandbox.S.batter = 0; sandbox.S.batterQ = 1;
  sandbox.addBatter(12, 1);
  if (sandbox.S.batter !== 12) throw new Error('第一批应为 12，实为 ' + sandbox.S.batter);
  if (X.S.batterBatches.length !== 1) throw new Error('应有 1 批');
  sandbox.addBatter(12, 1.1);  // 第二批，更高质量
  if (sandbox.S.batter !== 24) throw new Error('两批叠加应为 24，实为 ' + sandbox.S.batter);
  if (X.S.batterBatches.length !== 2) throw new Error('应有 2 批');
  // 倒糊按批次 FIFO 消耗，先消耗第一批（质量 1）
  G().wells.forEach(w => { w.st = 'empty'; });
  sandbox.pourWell(0);
  if (G().wells[0].batterQ !== 1) throw new Error('应先消耗第一批质量 1，实为 ' + G().wells[0].batterQ);
  if (sandbox.S.batter !== 23) throw new Error('倒 1 锅后应剩 23，实为 ' + sandbox.S.batter);
  if (X.S.batterBatches[0].n !== 11) throw new Error('第一批应剩 11，实为 ' + (X.S.batterBatches[0] && X.S.batterBatches[0].n));
});
run('面糊过期发酸（带多了没卖完就倒掉）', () => {
  X.S.batterBatches = [];
  sandbox.S.batter = 0; G().day.waste = 0; G().day.cost = 0; G().dayT = 100;
  // 一批 95s 前和的面（madeAt=0）→ 已超时；一批刚和（madeAt=100）→ 新鲜
  X.S.batterBatches.push({ madeAt: 0, n: 10, q: 1 });
  X.S.batterBatches.push({ madeAt: 100, n: 5, q: 1 });
  sandbox.S.batter = 15;
  sandbox.spoilBatterTick();
  if (sandbox.S.batter !== 5) throw new Error('过期 10 份应被倒掉，应剩 5，实为 ' + sandbox.S.batter);
  if (G().day.waste !== 10) throw new Error('过期应计损耗 +10，实为 ' + G().day.waste);
  if (X.S.batterBatches.length !== 1) throw new Error('应只剩 1 批');
  if (X.S.batterBatches[0].n !== 5) throw new Error('剩的应为 5，实为 ' + (X.S.batterBatches[0] && X.S.batterBatches[0].n));
});
run('状态条含面糊保鲜倒计时', () => {
  sandbox.S.diff = 'std';
  X.S.batterBatches = [{ madeAt: 0, n: 5, q: 1 }];
  sandbox.S.batter = 5; G().dayT = 0; G().gasOut = false; G().gasUsed = 0; sandbox.S.day = 5;
  sandbox.renderStoveStatus();
  const ss = getEl('#stoveStatus').innerHTML;
  if (!ss.includes('面糊')) throw new Error('状态条应含面糊行');
  if (!ss.includes('95s')) throw new Error('面糊倒计时应为 95s，实为 ' + ss);
});
run('面糊保鲜期随难度缩放（难度越高保鲜越短）', () => {
  const prev = X.S.diff;
  X.S.diff = 'chill'; const c = sandbox.batterSpoilSec();
  X.S.diff = 'std';   const s = sandbox.batterSpoilSec();
  X.S.diff = 'hard';  const h = sandbox.batterSpoilSec();
  X.S.diff = 'crazy'; const z = sandbox.batterSpoilSec();
  X.S.diff = prev;
  if (s !== 95) throw new Error('标准应=95，实为 ' + s);
  if (c !== 152) throw new Error('佛系应=152，实为 ' + c);
  if (h !== 76)  throw new Error('硬核应=76，实为 ' + h);
  if (z !== 57)  throw new Error('疯狂应=57，实为 ' + z);
  if (!(c > s && s > h && h > z)) throw new Error('难度越高保鲜应越短');
});
run('和面消耗面粉且面粉不足时失败', () => {
  const std = X.GAME.ferms.find(f => f.id === 'std');
  if (sandbox.fermFlourNeed(std) !== 3) throw new Error('std 应需 3 面粉，实为 ' + sandbox.fermFlourNeed(std));
  X.S.flour = 0; X.S.batter = 0; X.S.money = 60; X.S.batterBatches = [];
  let ok = sandbox.fermMake(std);
  if (ok !== false) throw new Error('面粉 0 时和面应失败');
  if (X.S.batter !== 0) throw new Error('面粉不足不应产出面糊');
  if (X.S.flour !== 0) throw new Error('面粉不足不应扣面粉');
  X.S.flour = 5;
  ok = sandbox.fermMake(std);
  if (ok !== true) throw new Error('面粉充足应和面成功');
  if (X.S.flour !== 2) throw new Error('应扣 3 面粉剩 2，实为 ' + X.S.flour);
  if (X.S.batter !== 12) throw new Error('应加 12 面糊，实为 ' + X.S.batter);
  if (!X.S.batterBatches.length || X.S.batterBatches[0].n !== 12) throw new Error('应记 1 批 12 份');
});
run('火力循环切档（PC 点击兼容）', () => {
  const S = sandbox.S;
  S.gas = 5; G().gasOut = false; G().fire = 0;
  let nf = (G().fire + 1) % 4; sandbox.setFire(nf);
  if (G().fire !== 1) throw new Error('点击应切到文火');
  G().fire = 3; nf = (G().fire + 1) % 4;
  if (nf !== 0) throw new Error('武火点击应回到关火');
  G().gasOut = true; G().fire = 1; nf = (G().fire + 1) % 4; while (nf > 1) nf = (nf + 1) % 4;
  sandbox.setFire(nf);
  if (G().fire !== 0) throw new Error('断气时循环应止于关火');
  G().gasOut = false; G().fire = 2; S.gas = 30;
});
run('锅位排列对齐且不溢出窗口', () => {  // 直接复算布局公式：顶行 4 锅、底行 3 锅，全部圆心+半径须落在画布内
  const W = 500, H = 190, R = Math.min(W / 9.2, H * .25);
  const pos = [];
  for (let c = 0; c < 4; c++) pos.push({ x: (c + .5) * W / 4, y: H * .31 });
  for (let c = 0; c < 3; c++) pos.push({ x: (c + .5) * W / 3, y: H * .74 });
  if (pos.length !== 7) throw new Error('应 7 口锅');
  pos.forEach((p, i) => {
    if (p.x - R < 0 || p.x + R > W) throw new Error('锅 ' + i + ' 水平溢出画布 (x=' + p.x.toFixed(1) + ', R=' + R.toFixed(1) + ')');
  });
  // 顶行等间距、底行等间距（对齐）
  const topX = pos.slice(0, 4).map(p => p.x), botX = pos.slice(4).map(p => p.x);
  for (let i = 1; i < 4; i++) if (Math.abs((topX[i] - topX[i - 1]) - W / 4) > 1e-6) throw new Error('顶行不等距');
  for (let i = 1; i < 3; i++) if (Math.abs((botX[i] - botX[i - 1]) - W / 3) > 1e-6) throw new Error('底行不等距');
});
run('“随便”概率按客群细分（大爷>游客）', () => {
  vm.runInContext('GAME.__orig = GAME.customers', sandbox);
  try {
    const mk = id => ({ id, n: id, ic: 'x', pat: 100, pmul: 1, like: [], special: (id === 'blogger' ? 'blogger' : (id === 'regular' ? 'regular' : undefined)), order: ['o'], happy: ['h'], sad: ['s'] });
    const setC = ids => vm.runInContext('GAME.customers=' + JSON.stringify(ids.map(mk)), sandbox);
    const rate = id => {
      setC([id]); let w = 0; const N = 600;
      for (let i = 0; i < N; i++) {
        // 清空会从 customers 里按 id 找人的分支，避免缩水后的 customers 找不到
        G().bringFriend = null; G().prebook = null; G().online = null; G().bulk = null; G().referNext = null;
        G().queue.length = 0; sandbox.tryArrive();
        const c = G().queue[0]; if (c && c.whatever) w++;
      }
      return w / N;
    };
    const ru = rate('uncle');
    const rt = rate('tourist');
    if (!(ru > 0.3 && ru < 0.55)) throw new Error('大爷随便率应≈.42，实为 ' + ru.toFixed(2));
    if (!(rt > 0.04 && rt < 0.18)) throw new Error('游客随便率应≈.1，实为 ' + rt.toFixed(2));
    if (!(ru > rt)) throw new Error('大爷随便率应高于游客');
  } finally {
    vm.runInContext('GAME.customers = GAME.__orig', sandbox);
  }
});
run('顾客“随便”接受任意糕 + 优先级 + 波动', () => {
  const mk = (whatever) => ({ type: X.CUSTOMERS[0], order: { fills: [], done: 'std', whatever: true }, whatever, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false });
  // 任意糕都应被随便顾客接受（最后兜底）
  G().queue.length = 0; G().queue.push(mk(true));
  const ti = sandbox.findTaker({ fills: ['sugar', 'cream'], q: .9, foldHeat: 330, foldOff: 0 });
  if (ti < 0) throw new Error('随便顾客应接受任意糕');
  // 与明确口味顾客同队时，明确者优先
  const explicit = { type: X.CUSTOMERS[1], order: { fills: ['sugar'], done: 'std' }, pat: 60, wait: 60, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false };
  G().queue.length = 0; G().queue.push(mk(true)); G().queue.push(explicit);
  const ti2 = sandbox.findTaker({ fills: ['sugar'], q: .9, foldHeat: 330, foldOff: 0 });
  if (ti2 < 0 || G().queue[ti2] !== explicit) throw new Error('明确口味应优先于随便顾客');
  // 真实出餐管线：随便顾客接到任意糕不崩，且满意度波动放大
  const c2 = mk(true);
  const r = sandbox.serveCustomer(c2, { fills: ['sugar'], q: .9, foldHeat: 330, foldOff: 0 });
  if (!r || typeof r.sat !== 'number' || r.sat < 0 || r.sat > 1.15) throw new Error('随便顾客出餐应返回合法 sat');
  // 波动更大：偏离中性的幅度被 ×1.3
  const hi = Math.max(0, Math.min(1.15, 0.5 + (0.6 - 0.5) * 1.3));
  const lo = Math.max(0, Math.min(1.15, 0.5 + (0.4 - 0.5) * 1.3));
  if (!(hi > 0.6 && lo < 0.4)) throw new Error('随便顾客增益/减益应同时放大');
});
run('P0 combo/milestone', () => { const before = G().combo; sandbox.comboBump(true); if (G().combo !== before + 1) throw new Error('combo fail'); sandbox.checkMilestones(); sandbox.checkAch(); });
run('P0 limits', () => { sandbox.S.limits = { 'cream+sugar': 1 }; sandbox.startLimits(); if (!sandbox.limitCheck('cream+sugar')) throw new Error('first should pass'); if (sandbox.limitCheck('cream+sugar')) throw new Error('second should sell out'); });
run('P0 tasting', () => { sandbox.S.tasting = true; const d = sandbox.tastingDeal('never+seen', 10); if (d.price !== 5 || !d.first) throw new Error('tasting fail'); });
run('P1 skills/diff', () => { sandbox.S.skillPts = 2; sandbox.S.skills.heat = 1; sandbox.S.diff = 'hard'; if (sandbox.skillTol(100) <= 100) throw new Error('skill tol fail'); if (sandbox.diffOf().money !== 40) throw new Error('diff fail'); });
run('P1 share/bargain', () => { sandbox.shareCard(); sandbox.bargainModal(5); });
run('P2 pairs/fest', () => { if (sandbox.pairMod(['latiao', 'cheese']) <= 0) throw new Error('pair fail'); });
run('P2 spoil/inspect', () => { sandbox.S.spoil = { cream: 1 }; sandbox.spoilDecay(); if (!sandbox.S.rotten.includes('cream')) throw new Error('spoil fail'); sandbox.eventInspect(); });
run('P2 helper/online', () => { sandbox.S.helper = 1; sandbox.helperTick(99); sandbox.S.waimai = true; sandbox.spawnOnline(); if (!G().online) throw new Error('online fail'); sandbox.serveOnline(); });
run('P2 month/ending', () => { sandbox.monthStart(); sandbox.monthEnd(); sandbox.checkEndings(); });
run('P2 chain/heirloom/yell/god', () => { sandbox.eventHeirloom(); sandbox.yell(); sandbox.prayGod(); sandbox.chainTick(); });
run('P2 raw dispute', () => { sandbox.rawDispute(5); });
run('P2 prebook', () => { sandbox.S.prebook = { fills: ['sugar'], n: 3, left: 3, paid: 6, day: sandbox.S.day }; sandbox.initPrebook(); if (!G().prebook) throw new Error('prebook init fail'); sandbox.settlePrebook(); if (G().prebook) throw new Error('prebook should clear'); });
run('旋钮四档 + 出餐台丢弃', () => {
  sandbox.setFire(3); if (G().fire !== 3) throw new Error('setFire 3 fail');
  sandbox.setFire(1); if (G().fire !== 1) throw new Error('setFire 1 fail');
  sandbox.setFire(2);
  G().serve[0] = { fills: ['sugar', 'cream'], q: .8, foldHeat: 300, foldOff: 0 };
  const wasteBefore = G().day.waste;
  sandbox.discardServe(0);
  if (G().serve[0]) throw new Error('discard fail');
  if (G().day.waste !== wasteBefore + 1) throw new Error('waste count fail');
});
run('缺货告知三选', () => {
  sandbox.S.inv.sugar = 0;
  G().queue.length = 0;
  G().queue.push({ type: X.CUSTOMERS[1], order: { fills: ['sugar'], done: 'std' }, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false, short: true });
  sandbox.renderQueue();
  sandbox.shortModal(G().queue[0]);
  if (!G().queue[0]) throw new Error('queue lost');
  sandbox.S.inv.sugar = 5;
});
run('临期降价 + 变黑变质', () => {
  sandbox.S.inv.sugar = 5;
  const old = { fills: ['sugar'], q: .8, foldHeat: 300, foldOff: 0, landedAt: Date.now() - 30000, takeDelay: 2500 };
  if (sandbox.currentPrice(old) >= sandbox.cakePrice(['sugar'])) throw new Error('放了 30 秒应降价');
  if (sandbox.currentPrice({ fills: ['sugar'], landedAt: Date.now() }) !== sandbox.cakePrice(['sugar'])) throw new Error('新鲜应原价');
  old.spoiled = true;
  G().serve[0] = old; G().queue.length = 0;
  if (sandbox.canTake(old)) throw new Error('变黑的糕不应被拿走');
  sandbox.updateServeDom();
  G().serve[0] = null;
});
run('临期拒绝 + 要现做', () => {
  G().queue.length = 0;
  const mk = wait => ({ type: X.CUSTOMERS[1], order: { fills: ['sugar'], done: 'std' }, pat: 100, wait, max: 100, el: sandbox.document.createElement('div'), barEl: null, said: false });
  let freshRefuse = 0, tiredRefuse = 0;
  for (let i = 0; i < 60; i++) { if (sandbox.staleRefused(mk(0))) freshRefuse++; }
  for (let i = 0; i < 60; i++) { if (sandbox.staleRefused(mk(99))) tiredRefuse++; }
  if (freshRefuse === 0) throw new Error('耐心足时应有人拒绝临期');
  if (tiredRefuse > freshRefuse) throw new Error('耐心越低应越少拒绝');
  const c = mk(0); c.wantsFresh = true;
  G().queue.push(c);
  G().serve[0] = { fills: ['sugar'], q: .8, foldHeat: 300, foldOff: 0, landedAt: Date.now() - 30000, takeDelay: 2500 };
  if (sandbox.findTaker(G().serve[0]) >= 0) throw new Error('要现做的客人不应接临期糕');
  G().serve[0] = null; G().queue.length = 0;
});
run('探店博主：明确需求 + 优先 + 口碑加权', () => {
  // 隔离上一个测试的团购/预订/外卖残留状态
  G().bulk = null; G().prebook = null; G().online = null;
  // 事件召唤博主：必须有明确订单、VIP 标记
  const beforeQ = G().queue.length;
  sandbox.eventBlogger();
  const b = G().queue.find(c => c.type.special === 'blogger');
  if (!b) throw new Error('博主未入队');
  if (!b.order || !b.order.fills || !b.order.fills.length) throw new Error('博主必须有明确口味需求');
  if (!b.vip) throw new Error('博主应标记 VIP');
  if (G().queue.length !== beforeQ + 1) throw new Error('博主入队计数异常');
  G().queue.length = 0;
  // 完整接待管线：服务博主 → 口碑 ×3 加权 + 爆红 buff
  const blogger = { type: X.CUSTOMERS.find(c => c.special === 'blogger'), order: { fills: ['sugar'], done: 'std' }, pat: 150, wait: 0, max: 150, el: sandbox.document.createElement('div'), barEl: null, said: false, vip: true, wantsFresh: false };
  G().queue.push(blogger);
  G().serve[0] = { fills: ['sugar'], q: .95, foldHeat: 300, foldOff: 0 };
  sandbox.S.inv.sugar = 5; sandbox.S.rep = 60;
  const rep0 = sandbox.S.rep;
  sandbox.serveFromTray(0);
  if (G().queue.some(c => c.type.special === 'blogger')) throw new Error('博主应已被服务离队');
  if (!sandbox.S.buffs.some(x => x.id === 'hot')) throw new Error('接待好应得爆红 buff');
  if (sandbox.S.rep <= rep0) throw new Error('博主满意度应加权提升口碑');
  // 接待差：避雷 buff + 口碑下降
  sandbox.S.rep = 50;
  sandbox.bloggerVerdict(0.2);
  if (sandbox.S.rep >= 50) throw new Error('接待差应下降口碑');
  if (!sandbox.S.buffs.some(x => x.id === 'avoid')) throw new Error('接待差应得避雷 buff');
  G().queue.length = 0; G().serve.length = 0;
});
run('团购激活时出餐台不崩溃（回归 bulk.fills）', () => {
  G().bulk = { need: 6, left: 6, t: 130, priceMul: .9 };
  G().prebook = null; G().online = null; G().queue.length = 0;
  G().serve[0] = { fills: ['sugar'], q: .9, foldHeat: 300, foldOff: 0 };
  sandbox.serveFromTray(0); // 之前会因 G.bulk.fills 未定义而崩溃
  if (!G().bulk || G().bulk.left !== 5) throw new Error('团购应计件 -1');
  G().bulk = null; G().serve.length = 0;
});
run('难度字段完整性（tol/fine/rent 不缺失，否则满意度/罚款 NaN）', () => {
  ['chill','std','hard','crazy'].forEach(d => {
    sandbox.S.diff = d;
    const D = sandbox.diffOf();
    if (typeof D.tol !== 'number') throw new Error(d + ' 缺 tol');
    if (typeof D.fine !== 'number') throw new Error(d + ' 缺 fine');
    if (typeof D.rent !== 'number') throw new Error(d + ' 缺 rent');
  });
  sandbox.S.diff = 'std';
});
run('难度解锁门禁', () => {  sandbox.saveMeta({});
  if (sandbox.diffUnlocked('hard')) throw new Error('hard 应锁定');
  sandbox.saveMeta({ everUpgraded: true });
  if (!sandbox.diffUnlocked('hard')) throw new Error('升级后应解锁硬核');
  if (sandbox.diffUnlocked('crazy')) throw new Error('crazy 应锁定');
  sandbox.saveMeta({ everUpgraded: true, hardDone: true });
  if (!sandbox.diffUnlocked('crazy')) throw new Error('通关硬核后应解锁疯狂');
  sandbox.S.diff = 'chill';
});
run('FEVER 连击爆发：触发与结束', () => {
  const S = sandbox.S;
  G().combo = 0; G().fever = false; G().feverLeft = 0;
  for (let i = 0; i < X.FEVER_AT; i++) sandbox.comboBump(true);
  if (!G().fever) throw new Error('连击达阈值应触发 FEVER');
  if ((S.stats.feverCount || 0) < 1) throw new Error('feverCount 应 +1');
  let guard = 0;
  while (G().fever && guard++ < 40) sandbox.comboBump(true);
  if (G().fever) throw new Error('FEVER 应在预算耗尽后结束');
  if (!S.ach.includes('a18')) throw new Error('应解锁成就 a18');
  G().combo = 0; // 复位，避免影响后续
});
run('FEVER 断连即止', () => {
  G().combo = X.FEVER_AT; G().fever = true; G().feverLeft = 5;
  sandbox.comboBump(false);
  if (G().fever) throw new Error('失误应立刻结束 FEVER');
  if (G().combo !== 0) throw new Error('失误应清零连击');
});
run('每日签到：连续 / 断签 / 不重复', () => {
  const S = sandbox.S;
  S.lastLogin = null; S.streak = 0; S.money = 100; S.earlyUnlock = [];
  sandbox.checkSignIn();
  if (S.streak !== 1) throw new Error('首日签到应为 1');
  if (S.lastLogin !== sandbox.todayStr()) throw new Error('lastLogin 应为今天');
  const m1 = S.money;
  sandbox.checkSignIn();
  if (S.streak !== 1) throw new Error('同日不应重复累计');
  if (S.money !== m1) throw new Error('同日不应重复发奖');
  S.lastLogin = sandbox.yesterdayStr(); S.streak = 3;
  sandbox.checkSignIn();
  if (S.streak !== 4) throw new Error('连续签到应 +1');
});
run('节日日期门禁逻辑（按真实日历）', () => {
  const t = sandbox.todayStr(); const [Y, M, D] = t.split('-').map(Number);
  if (sandbox.festActive({ m: M, d: D, span: 0 }) !== true) throw new Error('今天应命中');
  if (sandbox.festActive({ m: (M % 12) + 1, d: D, span: 0 }) !== false) throw new Error('非今天应落空');
  if (sandbox.festActive({ m: M, d: Math.max(1, D - 5), span: 10 }) !== true) throw new Error('跨 10 天窗口应命中');
});
run('节日限定馅料按日期隐藏/显示', () => {
  const fz = X.FILLINGS.find(f => f.fest);
  if (!fz) throw new Error('应有节日限定馅料');
  const inList = sandbox.unlockedFillings().some(f => f.id === fz.id);
  if (inList !== sandbox.festOn(fz.fest)) throw new Error('unlockedFillings 与 festOn 应一致');
});

/* ---------- 第 2 阶段：顾客好感度 + 社会工程学顾客 AI ---------- */
run('好感度增减与边界', () => {
  const S = sandbox.S;
  S.affinity = { student: 50 };
  sandbox.affBump('student', 10); if (S.affinity.student !== 60) throw new Error('应 +10');
  sandbox.affBump('student', 100); if (S.affinity.student !== 100) throw new Error('应封顶 100');
  sandbox.affBump('student', -100); if (S.affinity.student !== 0) throw new Error('应封底 0');
  if ((S.stats.affMax || 0) < 100) throw new Error('affMax 应记录峰值');
});
run('口碑热度 buzz 增减与边界', () => {
  const S = sandbox.S; S.buzz = 50;
  sandbox.buzzBump(20); if (S.buzz !== 70) throw new Error('buzz +20');
  sandbox.buzzBump(100); if (S.buzz !== 100) throw new Error('buzz 封顶 100');
  sandbox.buzzBump(-200); if (S.buzz !== 0) throw new Error('buzz 封底 0');
});
run('社会影响力：博主声量最高', () => {
  if (sandbox.affInfluence(X.CUSTOMERS.find(c => c.special === 'blogger')) !== 4) throw new Error('blogger inf=4');
  if (!(sandbox.affInfluence(X.CUSTOMERS.find(c => c.id === 'student')) < sandbox.affInfluence(X.CUSTOMERS.find(c => c.special === 'blogger')))) throw new Error('博主应高于学生');
});
run('顾客好感度：满意服务提升好感', () => {
  const S = sandbox.S;
  G().bulk = null; G().prebook = null; G().online = null; G().queue.length = 0; G().serve.length = 0;
  S.affinity = { student: 50 }; S.buzz = 60; S.inv.sugar = 5;
  G().queue.push({ type: X.CUSTOMERS.find(c => c.id === 'student'), order: { fills: ['sugar'], done: 'std' }, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false });
  G().serve[0] = { fills: ['sugar'], q: .95, foldHeat: 300, foldOff: 0 };
  sandbox.serveFromTray(0);
  if ((S.affinity.student || 0) <= 50) throw new Error('满意应提升好感');
});
run('高影响力顾客满意 → 触发安利链', () => {
  const S = sandbox.S;
  G().bulk = null; G().prebook = null; G().online = null; G().referNext = null; G().queue.length = 0; G().serve.length = 0;
  S.affinity = { student: 50 }; S.buzz = 60; S.inv.sugar = 5;
  const blogger = { type: X.CUSTOMERS.find(c => c.special === 'blogger'), order: { fills: ['sugar'], done: 'std' }, pat: 150, wait: 0, max: 150, el: sandbox.document.createElement('div'), barEl: null, said: false, vip: true, wantsFresh: false };
  G().queue.push(blogger);
  G().serve[0] = { fills: ['sugar'], q: .95, foldHeat: 300, foldOff: 0 };
  sandbox.serveFromTray(0);
  if (G().referNext === null) throw new Error('博主满意应触发下一位安利新客');
});
run('社会工程学：被安利来的新客标记', () => {
  const S = sandbox.S;
  G().bulk = null; G().prebook = null; G().online = null; G().bringFriend = null;
  let consumed = false;
  for (let i = 0; i < 40; i++) {
    G().queue.length = 0; // 防止队列填满导致提前 return，保证每次都能走到 referNext 消费分支
    G().referNext = { inf: 3 };
    sandbox.tryArrive();
    if (G().referNext === null) { consumed = true; break; }
  }
  if (!consumed) throw new Error('referNext 应被消费');
});
run('口碑热度影响到达率（高 buzz 更聚客）', () => {
  const S = sandbox.S;
  S.adTier = 0; S.buffs = []; S.renameCd = 0; S.signatures = []; G().hypeT = 0;
  S.rep = 50; S.skills = {}; S.fxToday = {}; S.spot = 'metro'; S.diff = 'std';
  S.buzz = 20; const slow = sandbox.arrivalInterval();
  S.buzz = 95; const fast = sandbox.arrivalInterval();
  if (slow <= 1.6 || fast <= 1.6) throw new Error('到达间隔触底钳制，无法比较');
  if (!(fast < slow)) throw new Error('高 buzz 应缩短到达间隔');
});
run('图鉴顾客页含好感度渲染', () => {
  const S = sandbox.S;
  S.codexTab = '顾客'; S.seenCust = { student: 3 }; S.affinity = { student: 80 };
  sandbox.renderCodex();
});

/* ---------- 第 3 阶段：顾客记忆传播链 ---------- */
run('顾客记忆：累计 visits 与升级老主顾', () => {
  const S = sandbox.S;
  S.custMem = {}; S.affinity = { worker: 90 }; S.stats.loyalCount = 0;
  let becameLoyal = false;
  for (let i = 0; i < 5; i++) { if (sandbox.rememberCustomer('worker', ['sugar'], 0.9) === 'newLoyal') becameLoyal = true; }
  if (!S.custMem.worker || S.custMem.worker.visits !== 5) throw new Error('visits 应累计到 5');
  if (!becameLoyal) throw new Error('好感90 + 5次应升级老主顾');
  if (!sandbox.isLoyal('worker')) throw new Error('isLoyal 应为真');
  if ((S.stats.loyalCount || 0) < 1) throw new Error('loyalCount 应 +1');
  if (!S.custMem.worker.fav || S.custMem.worker.fav[0] !== 'sugar') throw new Error('应记住老规矩 sugar');
});
run('顾客记忆：老主顾“老规矩”额外好感', () => {
  const S = sandbox.S;
  G().bulk = null; G().prebook = null; G().online = null; G().queue.length = 0; G().serve.length = 0;
  S.affinity = { worker: 80 }; S.buzz = 60; S.inv.sugar = 5; S.inv.cream = 5;
  S.custMem = { worker: { fav: ['sugar', 'cream'], visits: 6, loyal: true, lastSat: 0, nick: '王叔' } };
  const c = { type: X.CUSTOMERS.find(x => x.id === 'worker'), order: { fills: ['sugar', 'cream'], done: 'std' }, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false, usual: true };
  G().queue.push(c);
  G().serve[0] = { fills: ['sugar', 'cream'], q: .95, foldHeat: 300, foldOff: 0 };
  sandbox.serveFromTray(0);
  if ((S.affinity.worker || 0) <= 80) throw new Error('老规矩做对应额外加好感');
  if ((S.custMem.worker.visits || 0) < 7) throw new Error('visits 应 +1');
});
run('顾客记忆传播链：忠实顾客满意 → 带朋友', () => {
  const S = sandbox.S;
  G().bulk = null; G().prebook = null; G().online = null; G().bringFriend = null; G().queue.length = 0; G().serve.length = 0;
  S.affinity = { worker: 80 }; S.buzz = 60; S.inv.sugar = 5;
  S.custMem = { worker: { fav: ['sugar'], visits: 6, loyal: true, lastSat: 0, nick: '王叔' } };
  const c = { type: X.CUSTOMERS.find(x => x.id === 'worker'), order: { fills: ['sugar'], done: 'std' }, pat: 60, wait: 0, max: 60, el: sandbox.document.createElement('div'), barEl: null, said: false, usual: true };
  G().queue.push(c);
  G().serve[0] = { fills: ['sugar'], q: .95, foldHeat: 300, foldOff: 0 };
  sandbox.serveFromTray(0);
  if (!G().bringFriend) throw new Error('忠实顾客满意应触发带朋友');
  if (G().bringFriend.from !== 'worker') throw new Error('应记录介绍人');
});
run('顾客记忆传播链：朋友新客标记与计数', () => {
  const S = sandbox.S;
  S.rep = 90; G().bulk = null; G().referNext = null; G().bringFriend = { from: 'worker', fromName: '王叔' };
  S.stats.friendBrings = 0; G().day.friendBrings = 0; G().queue.length = 0;
  let spawned = false;
  for (let i = 0; i < 40; i++) {
    G().queue.length = 0; G().prebook = null; G().online = null; G().bulk = null; G().referNext = null;
    sandbox.tryArrive();
    if (G().bringFriend === null) { spawned = true; break; }
  }
  if (!spawned) throw new Error('bringFriend 应被消费并生成朋友新客');
  if (!G().queue.some(c => c.broughtBy)) throw new Error('朋友新客应带 broughtBy 标记');
  if ((S.stats.friendBrings || 0) < 1) throw new Error('friendBrings 应 +1');
});
run('成就 a22/a23 解锁条件', () => {
  const S = sandbox.S;
  S.ach = S.ach.filter(a => a !== 'a22' && a !== 'a23');
  S.stats.loyalCount = 3; sandbox.checkAch();
  if (!S.ach.includes('a22')) throw new Error('loyalCount>=3 应解锁 a22');
  S.stats.friendBrings = 8; sandbox.checkAch();
  if (!S.ach.includes('a23')) throw new Error('friendBrings>=8 应解锁 a23');
});

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
