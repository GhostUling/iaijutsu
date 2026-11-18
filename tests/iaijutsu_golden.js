// ===== 居合斩「迁移前后一致性」基准测试 =====
// 运行：node tests/iaijutsu_golden.js
//
// 做法：以确定性随机种子 + 固定 dt + 脚本化输入，驱动真实的
//   Main.update → MiniGames.update → Player.update → IaijutsuMode.update
// 管线跑若干局（每个无我奥义各一局），逐帧记录玩家/靶子/连斩/大招/粒子/音效调用
// 的完整状态，最后输出一个 SHA-256 指纹。
//
// 独立版（D:\Desktop\word\games\iaijutsu）里放了一份同样的脚本，
// 两边指纹相同 ⇒ 逻辑、手感、音效触发时序完全一致。
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var ROOT = path.join(__dirname, '..');
var GAME_ROOT = process.env.IAI_GAME_ROOT || ROOT;

// ---------- 确定性随机 ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- DOM shim ----------
function stubElement() {
  return {
    style: {}, dataset: {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return true; }, toggle: function () {} },
    addEventListener: function () {}, removeEventListener: function () {},
    appendChild: function () {}, removeChild: function () {}, remove: function () {},
    querySelector: function () { return stubElement(); },
    querySelectorAll: function () { return []; },
    setAttribute: function () {}, getAttribute: function () { return null; },
    closest: function () { return null; },
    textContent: '', innerHTML: '', value: '', width: 960, height: 540,
    getContext: function () { return stubCtx(); },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 960, height: 540 }; },
  };
}
function stubCtx() {
  var t = {};
  return new Proxy(t, {
    get: function (o, k) {
      if (k === 'canvas') return { width: 960, height: 540 };
      if (!(k in o)) o[k] = function () { return undefined; };
      return o[k];
    },
    set: function (o, k, v) { o[k] = v; return true; },
  });
}

global.window = global;
global.addEventListener = function () {};
global.removeEventListener = function () {};
global.document = {
  getElementById: function () { return stubElement(); },
  createElement: function () { return stubElement(); },
  querySelector: function () { return stubElement(); },
  addEventListener: function () {}, removeEventListener: function () {},
  body: stubElement(), documentElement: stubElement(),
};
function defGlobal(k, v) {
  try { global[k] = v; } catch (e) { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); }
}
var FAKE_NOW = 0;
defGlobal('performance', { now: function () { return FAKE_NOW; } });
defGlobal('requestAnimationFrame', function () { return 0; });
defGlobal('localStorage', (function () {
  var m = {};
  return {
    getItem: function (k) { return k in m ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
  };
})());
defGlobal('navigator', { userAgent: 'node' });
defGlobal('Audio', function () {
  this.volume = 1; this.loop = false; this.preload = ''; this.paused = true;
  this.currentTime = 0; this.src = ''; this.onerror = null;
});
Audio.prototype.play = function () { this.paused = false; return { catch: function () {} }; };
Audio.prototype.pause = function () { this.paused = true; };

// ---------- 加载脚本 ----------
var SCRIPTS = (function () {
  var listFile = path.join(GAME_ROOT, 'js/load_order.js');
  if (fs.existsSync(listFile)) {
    // game4：与 index.html 同一份唯一清单
    vm.runInThisContext(fs.readFileSync(listFile, 'utf8'), { filename: 'js/load_order.js' });
    return window.GAME_LOAD_ORDER.slice();
  }
  // 独立版：自带清单
  var own = path.join(GAME_ROOT, 'js/load_order.js');
  throw new Error('缺少脚本清单: ' + own);
})();

SCRIPTS.forEach(function (f) {
  var code = fs.readFileSync(path.join(GAME_ROOT, f), 'utf8');
  try { vm.runInThisContext(code, { filename: f }); }
  catch (e) { console.error('✗ 加载失败: ' + f + '\n' + e.stack); process.exit(1); }
});

// ---------- 打桩：UI / 音效记录 ----------
// UI 只保留居合逻辑读取的两个开关 + 横幅，其余空实现（真实 UI 需要完整 DOM）
var UI_REAL = {};
Object.getOwnPropertyNames(UI).forEach(function (k) {
  if (typeof UI[k] === 'function') { UI_REAL[k] = UI[k]; UI[k] = function () {}; }
});
UI.isIaiHubOpen = function () { return false; };
UI.isIaiShopOpen = function () { return false; };
UI.flashBanner = function () {};

var SFX_LOG = [];
SFX.play = function (name) { SFX_LOG.push(name); };
var BGM_LOG = [];
SFX.playIaijutsuBgm = function (id) { BGM_LOG.push('play:' + (id || 'default')); this._iaijutsuBgmPlaying = true; };
SFX.stopIaijutsuBgm = function () { BGM_LOG.push('stop'); this._iaijutsuBgmPlaying = false; };

// 引擎在 Node 下没有真实 canvas，渲染全部跳过；只跑逻辑
Input.isDown = function (code) { return !!this.keys[code]; };
Input.logicalPos = function () { return { x: this.mouseX, y: this.mouseY }; };
Input.updateRect = function () {};

Math.random = mulberry32(20261117);

// ---------- 驱动 ----------
var DT = 1 / 60;
var trace = [];
var SEEN = { maxCombo: 0, ultHits: 0, maxLivesLost: 0, particlePeak: 0 };

function snap(tag, f) {
  var d = MiniGames.iaijutsuData || {};
  var dummies = d.dummies || [];
  if (MiniGames.combo > SEEN.maxCombo) SEEN.maxCombo = MiniGames.combo;
  if ((d.ultimateHits || 0) > SEEN.ultHits) SEEN.ultHits = d.ultimateHits;
  if (3 - (d.lives === undefined ? 3 : d.lives) > SEEN.maxLivesLost) SEEN.maxLivesLost = 3 - d.lives;
  if (MiniGames.particles.length > SEEN.particlePeak) SEEN.particlePeak = MiniGames.particles.length;
  var dm = [];
  for (var i = 0; i < dummies.length; i++) {
    var o = dummies[i];
    dm.push([o.type, o.x.toFixed(4), o.y.toFixed(4), o.time.toFixed(4), o.pulse.toFixed(4),
      o.dir, (o.trail ? o.trail.length : -1)].join(','));
  }
  var cd = d.ultCustomData || {};
  trace.push([
    tag, f,
    Player.x.toFixed(4), Player.y.toFixed(4), Player.vx.toFixed(4), Player.vy.toFixed(4),
    Player.dashT.toFixed(4), Player.dashAngle.toFixed(4), Player.aimAngle.toFixed(4),
    Player.invulnTimer.toFixed(4), Player.skillTimers[1].toFixed(4), Player.swingT.toFixed(4),
    Player.fireTimer.toFixed(4), Player.weapon, Player._weaponShowT.toFixed(4),
    d.lives, MiniGames.combo, MiniGames.maxCombo,
    (d.ultimateCharge || 0).toFixed(3), (d.ultimateTimer || 0).toFixed(4),
    (d.ultimatePauseTimer || 0).toFixed(4), (d.frenzyTimer || 0).toFixed(4),
    (d.specialCooldown || 0).toFixed(4), (d.bulletTime || 0).toFixed(4),
    (d.bannerTimer || 0).toFixed(4), (d.ultimateHits || 0),
    (d.finisherRespawnTimer || 0).toFixed(4), (d.finisherWaves || []).length,
    d.isDashing ? 1 : 0, d.currentDashHits,
    (cd.cracks || []).length, (cd.clones || []).length, (cd.swords || []).length,
    (cd.scorchedEarth || []).length, (cd.flameBlades || []).length,
    (cd.lightningStrikes || []).length, (cd.electricChains || []).length,
    MiniGames.particles.length, (window.Game ? Game.particles.length : 0),
    (window.Game ? Game.effects.length : 0), Main.dmgTexts.length, Main.dashTrail.length,
    Main.shakeTrauma.toFixed(4), SFX_LOG.length,
    dm.join('|')
  ].join(';'));
}

function nearestDummy() {
  var ds = (MiniGames.iaijutsuData && MiniGames.iaijutsuData.dummies) || [];
  var best = null, bd = Infinity;
  for (var i = 0; i < ds.length; i++) {
    var dx = ds[i].x - Player.x, dy = ds[i].y - Player.y;
    var dd = dx * dx + dy * dy;
    if (dd < bd) { bd = dd; best = ds[i]; }
  }
  return best;
}

function resetInput() {
  Input.keys = {};
  Input.keysJustPressed = {};
  Input.leftPressed = false;
  Input.rightPressed = false;
  Input.spacePressed = false;
  Input.mouseDown = false;
  Input.rightDown = false;
}

// 一局：ultId 为装备的无我奥义；infinite 开启无CD无我测试模式
function runRound(tag, ultId, frames, opts) {
  opts = opts || {};
  localStorage.setItem('iaijutsu_equipped_ult', ultId);
  localStorage.setItem('iaijutsu_infinite_ult', opts.infinite ? '1' : '0');
  localStorage.setItem('iaijutsu_slash_skin', opts.skin || 'classic');
  localStorage.setItem('iaijutsu_bg_skin', opts.bg || 'none');

  resetInput();
  Game.state = 'PLAYING';
  // 与真实流程一致：进特训前玩家是满状态（Main.startGame -> Player.reset）
  Player.maxHp = 100;
  Player.maxShield = 50;
  Player.money = 0;
  Player.shards = 0;
  MiniGames.start('iaijutsu');

  var tgt = null;
  for (var f = 0; f < frames; f++) {
    FAKE_NOW += DT * 1000;
    resetInput();

    // 移动脚本：分段按压方向键（走位会改变碰撞与瞄准姿态）
    var seg = Math.floor(f / 90) % 4;
    if (seg === 0) Input.keys['KeyD'] = true;
    else if (seg === 1) Input.keys['KeyS'] = true;
    else if (seg === 2) Input.keys['KeyA'] = true;
    else Input.keys['KeyW'] = true;

    // 瞄准：常规锁定最近靶；forceMiss 回合每 260 帧故意背身出刀一次（制造挥空断连）
    tgt = nearestDummy();
    var forceMiss = !!opts.forceMiss && (f % 260) < 2;
    var aimX, aimY;
    if (tgt) {
      var off = forceMiss ? Math.PI : 0;
      aimX = tgt.x + Math.cos(off) * 40;
      aimY = tgt.y + Math.sin(off) * 40;
    } else {
      aimX = Player.x + Math.cos(f * 0.02) * 200;
      aimY = Player.y + Math.sin(f * 0.02) * 200;
    }
    // 光标贴着靶子时会有 1~2px 抖动（复刻真人手部微抖）
    aimX += ((f * 37) % 5) - 2;
    aimY += ((f * 53) % 5) - 2;
    Input.mouseX = aimX;
    Input.mouseY = aimY;
    Input.mouse.x = aimX;
    Input.mouse.y = aimY;

    // 出刀节奏：每 9 帧一次左键（略快于 1.8s CD 的恢复节奏，靠命中刷新 CD）
    if (f % 9 === 0) { Input.leftPressed = true; Input.mouseDown = true; }
    // 每 240 帧一次右键普攻
    if (f % 240 === 7) { Input.rightPressed = true; Input.rightDown = true; }
    // 每 300 帧一次空格（充能满/无CD时开大）
    if (f % 300 === 30) Input.spacePressed = true;
    // 指定回合第 3 帧按 T：切换无CD无我测试模式（测开关本身）
    if (opts.pressT && f === 3) Input.keysJustPressed['KeyT'] = true;
    // 第 4 帧按 J（键盘居合映射）
    if (f === 4) Input.keysJustPressed['KeyJ'] = true;

    Main.update(DT);
    snap(tag, f);
    if (MiniGames.finished) sawFinish = true;
    // 断连 3 次 → 结算 3.2s → 自动离场；本回合到此为止
    if (!MiniGames.active) break;
  }
}

// ---------- 跑 7 局：五大奥义 + 随机觉醒 + 断连致死 ----------
var sawFinish = false;
var ROUNDS = [
  ['classic', 'classic', 720, { infinite: true }],
  ['timestop', 'timestop', 540, { infinite: true, bg: 'cross_blade' }],
  ['blades', 'blades', 540, { infinite: true, bg: 'mitsudomoe' }],
  ['asura', 'asura', 540, { infinite: true, bg: 'mandala' }],
  ['thunder', 'thunder', 540, { infinite: true, bg: 'compass' }],
  ['random', 'random', 480, { infinite: false, pressT: true }],
  ['death', 'classic', 1600, { infinite: false, forceMiss: true }]
];
for (var r = 0; r < ROUNDS.length; r++) {
  runRound(ROUNDS[r][0], ROUNDS[r][1], ROUNDS[r][2], ROUNDS[r][3]);
}

// ---------- 指纹与断言 ----------
var payload = trace.join('\n');
var hash = crypto.createHash('sha256').update(payload).digest('hex');

var last = MiniGames.iaijutsuData;
var sfxHash = crypto.createHash('sha256').update(SFX_LOG.join(',')).digest('hex');
console.log('帧数          : ' + trace.length);
console.log('音效调用      : ' + SFX_LOG.length + ' 次 -> ' + sfxHash.slice(0, 16));
console.log('BGM 调用      : ' + BGM_LOG.join(' / '));
console.log('末局连斩      : ' + MiniGames.combo + ' / 最高 ' + MiniGames.maxCombo);
console.log('末局剩余生命  : ' + (last ? last.lives : '-'));
console.log('末局大招斩杀  : ' + (last ? last.ultimateHits : '-'));
console.log('末局结束标记  : finished=' + MiniGames.finished + ' result=' + MiniGames.result);
console.log('HASH=' + hash);

if (process.env.IAI_TRACE) {
  var out = path.join(ROOT, 'tests', 'iaijutsu_golden.trace.txt');
  fs.writeFileSync(out, payload + '\n', 'utf8');
  console.log('轨迹已写入    : ' + path.relative(path.join(__dirname, '..'), out));
} else {
  console.log('逐行轨迹      : 需要时用 IAI_TRACE=1 node tests/iaijutsu_golden.js');
}

var fail = 0;
function expect(cond, msg) {
  if (!cond) { console.error('✗ ' + msg); fail++; }
  else console.log('✓ ' + msg);
}
expect(trace.length > 3500, '全部回合帧数充足 (' + trace.length + ')');
expect(SFX_LOG.indexOf('iai') >= 0, '斩击音效 iai 已触发');
expect(SFX_LOG.indexOf('hit') >= 0, '命中音效 hit 已触发');
expect(SFX_LOG.indexOf('hurt') >= 0, '断连音效 hurt 已触发');
expect(SFX_LOG.indexOf('victory') >= 0, '里程碑/大招 victory 已触发');
expect(SFX_LOG.indexOf('lightning') >= 0, '大招 lightning 已触发');
expect(SFX_LOG.indexOf('swing') >= 0, '右键挥砍 swing 已触发');
expect(SFX_LOG.indexOf('empty') >= 0, '充能不足 empty 已触发');
expect(SEEN.maxCombo > 20, '最高连斩 > 20（连击闭环成立，实测 ' + SEEN.maxCombo + '）');
expect(SEEN.ultHits > 0, '无我大招有斩杀（实测 ' + SEEN.ultHits + '）');
expect(SEEN.maxLivesLost >= 3, '断连扣命可致死（实测扣 ' + SEEN.maxLivesLost + ' 命）');
expect(BGM_LOG.length > 0, '居合专属 BGM 已播放');
expect(sawFinish, '存在因 3 次断连而结算的回合');
if (fail) { console.error('\n共 ' + fail + ' 项断言失败'); process.exit(1); }
console.log('\n全部断言通过');
