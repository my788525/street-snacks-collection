/* 冒烟测试：Node + DOM 桩驱动真实代码（合集架构：profile + common 引擎） */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BASE = path.join(__dirname);

function el() {
  const e = {
    style: { cssText: '', setProperty() {} }, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
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
vm.runInContext('globalThis.__x={get G(){return G},get S(){return S},get CUSTOMERS(){return GAME.customers},get BAL(){return BAL},get FILLINGS(){return GAME.fillings},get PREMISES(){return GAME.premises},get FESTIVALS(){return GAME.festivals}};', sandbox);
const X = sandbox.__x;
const G = () => X.G;

run('boot', () => sandbox.boot());
run('newGame', () => sandbox.newGame('测试员', '测试小摊'));
run('startDay(true)', () => sandbox.startDay(true));
run('renderPrep', () => sandbox.renderPrep());
run('buy flour', () => { sandbox.S.money = 100; sandbox.priceOf({ id: 'flour', c: .8 }); sandbox.S.batter += 4; });
run('ferment slow', () => { sandbox.S.batter = 0; sandbox.S.ferm = 'slow'; sandbox.S.batter = 6; sandbox.S.batterQ = 1.1; });
run('psychPrice/cakePrice', () => { if (sandbox.psychPrice() <= 0) throw new Error('psych<=0'); if (sandbox.cakePrice(['sugar']) <= 0) throw new Error('cake<=0'); });
run('startService', () => sandbox.startService());
run('pour batter', () => sandbox.wellTap(0));
run('open picker', () => { G().wells[0].heat = 200; sandbox.wellTap(0); if (G().picked !== 0) throw new Error('picker not opened'); });
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

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
