// ============================================================================
// 异靶乱舞 · 靶型包回归测试
// 运行：node tests/iaijutsu_ex_test.js
// ============================================================================
// 覆盖：模式隔离（原版仍只有三种靶）/ 新靶生成上限 / 诱饵罚命 / 铁壁两刀 /
//       分裂产物 / 连锁补刀 / 新靶不因超时扣命 / 两模式记录互不污染。
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

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
defGlobal('performance', { now: function () { return 0; } });
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
defGlobal('Audio', function () { this.volume = 1; this.paused = true; this.currentTime = 0; this.src = ''; });
Audio.prototype.play = function () { this.paused = false; return { catch: function () {} }; };
Audio.prototype.pause = function () { this.paused = true; };

// ---------- 加载 ----------
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js/load_order.js'), 'utf8'), { filename: 'js/load_order.js' });
window.GAME_LOAD_ORDER.forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});

var MODE_BASE = window.IaijutsuMode;
var TARGETS_BASE = window.IaijutsuTargets;
var MODE_EX = window.IaijutsuModeEx;
var TARGETS_EX = window.IaijutsuTargetsEx;

Object.getOwnPropertyNames(UI).forEach(function (k) {
  if (typeof UI[k] === 'function') UI[k] = function () {};
});
UI.isIaiHubOpen = function () { return false; };
UI.isIaiShopOpen = function () { return false; };
SFX.play = function () {};
SFX.playIaijutsuBgm = function () {};
SFX.stopIaijutsuBgm = function () {};
Input.isDown = function () { return false; };
Input.logicalPos = function () { return { x: 480, y: 270 }; };

var fail = 0;
function ok(cond, msg) {
  if (cond) console.log('✓ ' + msg);
  else { console.error('✗ ' + msg); fail++; }
}
function eq(a, b, msg) { ok(a === b, msg + '（实际 ' + a + '，期望 ' + b + '）'); }

function startRun(modeId) {
  Game.state = 'PLAYING';
  Player.maxHp = 100;
  Player.maxShield = 50;
  MiniGames.start('iaijutsu', modeId);
  return MiniGames.iaijutsuData;
}
function typeCounts(data) {
  var c = {};
  data.dummies.forEach(function (d) { c[d.type] = (c[d.type] || 0) + 1; });
  return c;
}
function takeOut(data, dm) {
  var i = data.dummies.indexOf(dm);
  if (i >= 0) data.dummies.splice(i, 1);
}

// ============================================================================
// 1. 模式隔离
// ============================================================================
var data = startRun('classic');
ok(window.IaijutsuMode === MODE_BASE, 'classic 启动后用原版控制器');
ok(window.IaijutsuTargets === TARGETS_BASE, 'classic 启动后用原版靶表');

data.dummies.length = 0;
MiniGames.combo = 30;
MODE_BASE.spawnDummies(40, MiniGames);
var classicTypes = Object.keys(typeCounts(data));
ok(classicTypes.every(function (t) { return ['normal', 'special', 'shuttle'].indexOf(t) >= 0; }),
  '原版 40 次生成只出现三种靶（' + classicTypes.join('/') + '）');

data = startRun('ex');
ok(window.IaijutsuMode === MODE_EX, 'ex 启动后切到异靶控制器');
ok(window.IaijutsuTargets === TARGETS_EX, 'ex 启动后切到异靶靶表');

// ============================================================================
// 2. 生成门控与上限
// ============================================================================
data.dummies.length = 0;
MiniGames.combo = 0;
MODE_EX.spawnDummies(30, MiniGames);
var earlyEx = data.dummies.filter(function (d) { return d.isDecoy || d.isArmor || d.isSplit || d.isChain; });
eq(earlyEx.length, 0, '连斩 < 6 时不投放新靶');

data.dummies.length = 0;
MiniGames.combo = 30;
for (var round = 0; round < 4; round++) MODE_EX.spawnDummies(20, MiniGames);
var counts = typeCounts(data);
ok((counts.decoy || 0) <= 1 && (counts.armor || 0) <= 1 && (counts.split || 0) <= 1 && (counts.chain || 0) <= 1,
  '四种新靶各限 1 个（decoy=' + (counts.decoy || 0) + ' armor=' + (counts.armor || 0) +
  ' split=' + (counts.split || 0) + ' chain=' + (counts.chain || 0) + '）');
ok((counts.decoy || 0) + (counts.armor || 0) + (counts.split || 0) + (counts.chain || 0) >= 2,
  '连斩 30 时新靶会实际出现');

// ============================================================================
// 3. 新靶不因超时扣命
// ============================================================================
data.dummies.length = 0;
MiniGames.combo = 10;
var decoy = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_DECOY });
decoy.time = 0.01;
for (var f = 0; f < 20; f++) TARGETS_EX.updateDummy(decoy, 1 / 60, MiniGames.room, MiniGames.particles);
ok(decoy.time > 1 && !decoy.expired, '诱饵雷的 time 被钉住，不会触发原版超时判定');
decoy.ownLife = 0.01;
TARGETS_EX.updateDummy(decoy, 1 / 60, MiniGames.room, MiniGames.particles);
ok(decoy.expired === true, '诱饵雷到点后标记 expired');

var livesBefore = data.lives;
data.dummies.push(decoy);
MODE_EX.update(1 / 60, { x: 0, y: 0 }, { leftPressed: false, rightPressed: false, spacePressed: false, keysJustPressed: {} }, MiniGames);
eq(data.lives, livesBefore, '诱饵自行退场不扣命');
ok(data.dummies.indexOf(decoy) < 0, '过期的诱饵已从场上移除');

// ============================================================================
// 4. 诱饵雷：斩中扣命 + 清空连斩
// ============================================================================
data = startRun('ex');
MiniGames.combo = 12;
data.lives = 3;
var bomb = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_DECOY });
data.dummies.push(bomb);
takeOut(data, bomb);
MODE_EX.onKill(bomb, true, 0, MiniGames);
eq(data.lives, 2, '斩中诱饵扣 1 命');
eq(MiniGames.combo, 0, '斩中诱饵清空连斩');
eq(Player.skillTimers[1], 0, '斩中诱饵不施加额外冷却（可立刻重整再战）');

// ============================================================================
// 5. 铁壁：两刀
// ============================================================================
data = startRun('ex');
MiniGames.combo = 3;
var armor = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_ARMOR });
data.dummies.push(armor);
takeOut(data, armor);
var comboBefore = MiniGames.combo;
MODE_EX.onKill(armor, true, 0, MiniGames);
eq(armor.armorLeft, 1, '第一刀后剩 1 层甲');
eq(MiniGames.combo, comboBefore, '第一刀不计连斩');
ok(data.dummies.indexOf(armor) >= 0, '崩甲后靶子被放回场上');
eq(Player.skillTimers[1], 0, '崩甲立刻刷新突进冷却');

takeOut(data, armor);
MODE_EX.onKill(armor, true, 0, MiniGames);
eq(armor.armorLeft, 0, '第二刀破甲');
eq(MiniGames.combo, comboBefore + 1, '破甲后按普通靶 +1 连斩');
ok(data.dummies.indexOf(armor) < 0, '破甲后靶子不再回到场上');

// ============================================================================
// 6. 分裂：产 2 个小靶
// ============================================================================
data = startRun('ex');
MiniGames.combo = 3;
var split = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_SPLIT });
data.dummies.push(split);
takeOut(data, split);
MODE_EX.onKill(split, true, 0, MiniGames);
var minis = data.dummies.filter(function (d) { return d.isMini; });
eq(minis.length, 2, '分裂产出 2 个小靶');
ok(minis.every(function (m) { return m.r === 14 && m.noTimeout === true; }), '小靶尺寸 14 且不因超时扣命');

// ============================================================================
// 7. 连锁：0.55s 内补刀 +3
// ============================================================================
data = startRun('ex');
MiniGames.combo = 10;
data.chainLink = null;
data.dummies.length = 0;
var chainDm = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_CHAIN });
var normalDm = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_NORMAL });
chainDm.x = 63400; chainDm.y = 61200;
normalDm.x = 63520; normalDm.y = 61200;
data.dummies.push(chainDm, normalDm);
takeOut(data, chainDm);
MODE_EX.onKill(chainDm, true, 0, MiniGames);
ok(!!data.chainLink && data.chainLink.id === normalDm.id, '斩中连锁靶后拉出补刀线');

var comboAfterChain = MiniGames.combo;
takeOut(data, normalDm);
MODE_EX.onKill(normalDm, true, 0, MiniGames);
eq(MiniGames.combo - comboAfterChain, 4, '限时补刀 = 普通 +1 再 +3');
ok(!data.chainLink, '补刀后连锁状态清除');

// 超时后不再奖励
data = startRun('ex');
MiniGames.combo = 10;
data.dummies.length = 0;
chainDm = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_CHAIN });
normalDm = TARGETS_EX.createDummy(MiniGames.room, Player, { type: TARGETS_EX.TYPE_NORMAL });
data.dummies.push(chainDm, normalDm);
takeOut(data, chainDm);
MODE_EX.onKill(chainDm, true, 0, MiniGames);
MiniGames.timer += 1.0;
comboAfterChain = MiniGames.combo;
takeOut(data, normalDm);
MODE_EX.onKill(normalDm, true, 0, MiniGames);
eq(MiniGames.combo - comboAfterChain, 1, '超过 0.55s 只剩普通 +1');

// ============================================================================
// 8. 记录隔离
// ============================================================================
startRun('ex');
MiniGames.combo = 0;
MiniGames.saveHighScore('iaijutsu', 77);
eq(localStorage.getItem('arcade_iaijutsu_ex_high'), '77', '异靶记录写入 ex 键');
ok(localStorage.getItem('arcade_iaijutsu_high') === null, '异靶记录不污染原版键');

startRun('classic');
MiniGames.saveHighScore('iaijutsu', 33);
eq(localStorage.getItem('arcade_iaijutsu_high'), '33', '原版记录写入原版键');
eq(localStorage.getItem('arcade_iaijutsu_ex_high'), '77', '原版记录不改动异靶键');
eq(MiniGames.getUnlockScore(), 77, '解锁进度取两模式最高');

// ============================================================================
// 9. 离场还原
// ============================================================================
MiniGames.leave();
ok(window.IaijutsuMode === MODE_BASE, '离场后全局恢复原版控制器');
ok(window.IaijutsuTargets === TARGETS_BASE, '离场后全局恢复原版靶表');

if (fail) {
  console.error('\n共 ' + fail + ' 项断言失败');
  process.exit(1);
}
console.log('\n异靶乱舞全部断言通过');
