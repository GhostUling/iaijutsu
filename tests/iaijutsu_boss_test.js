// ============================================================================
// 宿敌战 · Boss 回归测试
// 运行：node tests/iaijutsu_boss_test.js
// ============================================================================
// 覆盖：模式隔离 / Boss 假靶同步 / 弱点 4 伤与铁甲 1 伤 / 阶段推进 /
//       横扫命中与预览 / 心眼无敌 / 飞刃移动与清除 / 击杀胜利 / 阵亡失败 /
//       记录互不污染 / 离场还原实现。
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

// ---------- DOM shim（与 ex 测试一致） ----------
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
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 960, height: 540 }; }
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
    set: function (o, k, v) { o[k] = v; return true; }
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
  body: stubElement(), documentElement: stubElement()
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
    _raw: m
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
var MODE_BOSS = window.IaijutsuModeBoss;
var BOSS = window.IaijutsuBoss;

Object.getOwnPropertyNames(UI).forEach(function (k) {
  if (typeof UI[k] === 'function') UI[k] = function () {};
});
UI.isIaiHubOpen = function () { return false; };
UI.isIaiShopOpen = function () { return false; };
SFX.play = function () {};
SFX.playIaijutsuBgm = function () {};
SFX.stopIaijutsuBgm = function () {};
Input.isDown = function () { return false; };
Input.logicalPos = function () { return { x: 480, y: 260 }; };

var fail = 0;
function ok(cond, msg) {
  if (cond) console.log('✓ ' + msg);
  else { console.error('✗ ' + msg); fail++; }
}
function eq(a, b, msg) { ok(a === b, msg + '（实际 ' + a + '，期望 ' + b + '）'); }

function startBoss() {
  Game.state = 'PLAYING';
  Player.maxHp = 100;
  Player.maxShield = 50;
  Player.invulnTimer = 0;
  MiniGames.start('iaijutsu', 'boss');
  return MiniGames.iaijutsuData;
}

function resetInput() {
  Input.leftPressed = false;
  Input.rightPressed = false;
  Input.spacePressed = false;
  Input.mouseDown = false;
  Input.rightDown = false;
  Input.keysJustPressed = {};
}

// 把 Boss 摆到可打击状态（跳过入场）
function makeIdle(data) {
  var b = data.boss;
  b.state = 'idle';
  b.stateT = 0;
  b.stateDur = 99;
  b.vulnerable = true;
  b.hitCd = 0;
}

// ============================================================================
// 1. 模式隔离与初始状态
// ============================================================================
var data = startBoss();
ok(window.IaijutsuMode === MODE_BOSS, 'boss 启动后切到宿敌控制器');
ok(window.IaijutsuTargets === window.IaijutsuTargetsBoss, 'boss 启动后切到宿敌靶表');
function countBoss(d) { return d.dummies.filter(function (x) { return x.isBoss; }).length; }
function countMinion(d) { return d.dummies.filter(function (x) { return x.bossMinion; }).length; }

eq(countBoss(data), 1, '场上只有 1 个 Boss');
eq(countMinion(data), 2, '开局有 2 个刀魂当跳板');
ok(data.dummies[0].isBoss === true, 'Boss 被标记为 isBoss');
ok(data.boss && data.boss.maxHp >= 40, 'Boss 已生成（HP ' + (data.boss && data.boss.maxHp) + '）');
ok(data.dummies[0].time > 1000, 'Boss 假靶被钉住倒计时，不会超时扣命');
eq(data.lives, 3, '宿敌战开局 3 条命');

// 生成接口在宿敌战里必须是空实现（否则会自己补普通靶）
var cntBefore = data.dummies.length;
MODE_BOSS.spawnDummies(20, MiniGames);
eq(data.dummies.length, cntBefore, 'spawnDummies 在宿敌战里不额外补靶');

// ============================================================================
// 2. 弱点 / 铁甲伤害
// ============================================================================
makeIdle(data);
var boss = data.boss;
var hp0 = boss.hp;
var wp = BOSS.getWeakPos(boss, 0);

// 模拟原版主循环：先把 Boss 从数组里摘掉，再调 onKill
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = wp.x;
Player.y = wp.y;
data.prevPos = { x: wp.x, y: wp.y };
MiniGames.combo = 0;
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hp0 - 4, '斩中发光弱点造成 4 点伤害');
eq(MiniGames.combo, 3, '弱点命中 +3 连斩');
ok(data.dummies.indexOf(data.bossDummy) >= 0, '命中后 Boss 被放回场上（打不死）');

// 同一次突进的多帧重复命中应被 hitCd 吃掉
var hpAfterWeak = boss.hp;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
BOSS.hit(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpAfterWeak, '0.11s 内的重复命中不再掉血');

// 铁甲：离弱点足够远
boss.hitCd = 0;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = boss.x + 200;
Player.y = boss.y;
data.prevPos = { x: Player.x, y: Player.y };
var hpBeforeBody = boss.hp;
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpBeforeBody - 1, '砍在铁甲上只造成 1 点伤害');

// 非破绽期弱点不生效（一律按铁甲算）
boss.hitCd = 0;
boss.vulnerable = false;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = BOSS.getWeakPos(boss, 0).x;
Player.y = BOSS.getWeakPos(boss, 0).y;
data.prevPos = { x: Player.x, y: Player.y };
var hpArmored = boss.hp;
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpArmored - 1, '非破绽期砍弱点也只算铁甲 1 点');
boss.vulnerable = true;

// ============================================================================
// 3. 阶段推进
// ============================================================================
boss.hitCd = 0;
boss.hp = Math.floor(boss.maxHp * 0.6);
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = BOSS.getWeakPos(boss, 0).x;
Player.y = BOSS.getWeakPos(boss, 0).y;
data.prevPos = { x: Player.x, y: Player.y };
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.phase, 2, '血量降到 60% 进入第 2 阶段');
eq(boss.state, 'stagger', '阶段切换时进入硬直（给玩家喘气）');

// ============================================================================
// 4. 横扫命中 / 心眼无敌
// ============================================================================
makeIdle(data);
boss.swingHit = false;
boss.action = 'sweep';
boss.aim = 0;
Player.x = boss.x + 150;
Player.y = boss.y;
Player.invulnTimer = 0;
data.lives = 3;
BOSS.startAction(boss, MiniGames);
eq(data.lives, 2, '站在横扫扇形内会 -1 命');

// 心眼期间不受伤（上一步横扫已经给了 1s 无敌）
var livesNow = data.lives;
eq(BOSS.damagePlayer(MiniGames, Player.x, Player.y, 'x'), false, '无敌帧内再挨打不掉命');
eq(data.lives, livesNow, '命数保持不变');

// 心眼技能本身
data.eyeCd = 0;
Player.invulnTimer = 0;
MODE_BOSS.eyeOfMind(MiniGames);
ok(Player.invulnTimer >= 0.4, '心眼给出 0.45s 无敌');
eq(data.eyeCd, 5, '心眼进入 5s 冷却');
ok((data.bulletTime || 0) >= 0.4, '心眼同时触发一次短暂子弹时间');

// ============================================================================
// 5. 飞刃
// ============================================================================
boss.blades.length = 0;
boss.aim = 0;
boss.action = 'blades';
data.dummies.length = 0;      // 清场，避免飞刃立刻打到玩家以外的判定干扰
Player.x = boss.x + 400;
Player.y = boss.y + 200;
Player.invulnTimer = 999;     // 本节只测运动与清除
BOSS.startAction(boss, MiniGames);
ok(boss.blades.length >= 4, '飞刃按数量发射（' + boss.blades.length + ' 把）');
var bx0 = boss.blades[0].x;
BOSS.updateBlades(1 / 60, MiniGames);
ok(boss.blades[0].x !== bx0, '飞刃每帧向前飞行');
boss.blades[0].life = 0;
BOSS.updateBlades(1 / 60, MiniGames);
ok(boss.blades.length === boss.bladeCount - 1, '飞刃超时后自动移除');
boss.blades.length = 0;
Player.invulnTimer = 0;

// ============================================================================
// 5.5 挥空 / 弹刀 / 近身招（本轮重做的核心规则）
// ============================================================================
data = startBoss();
makeIdle(data);
boss = data.boss;

// 挥空：不扣命，只锁突进
data.lives = 3;
MiniGames.combo = 7;
Player.skillTimers[1] = 0;
MODE_BOSS.triggerDisconnect(Player.x, Player.y, 'miss', MiniGames);
eq(data.lives, 3, '宿敌战挥空不扣命');
eq(MiniGames.combo, 7, '挥空不清空连斩');
ok(Player.skillTimers[1] >= 1.9, '挥空后突进进入长冷却（' + Player.skillTimers[1].toFixed(2) + 's）');

// 弹刀：砍在蓄力/出招的 Boss 上，0 伤害 + 同样长冷却
boss.hitCd = 0;
boss.state = 'telegraph';
boss.vulnerable = false;
var hpBeforeBounce = boss.hp;
Player.skillTimers[1] = 0;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpBeforeBounce, '蓄力中砍 Boss 不造成伤害（弹刀）');
ok(Player.skillTimers[1] >= 1.9, '弹刀也会锁住突进（' + Player.skillTimers[1].toFixed(2) + 's）');

// 跳板：斩中刀魂立刻刷新突进（这是本模式的核心机动来源）
var minion = data.dummies.filter(function (x) { return x.bossMinion; })[0];
ok(!!minion, '场上存在刀魂可供跳板');
Player.skillTimers[1] = 1.9;
data.dummies.splice(data.dummies.indexOf(minion), 1);
MODE_BOSS.onKill(minion, true, 0, MiniGames);
eq(Player.skillTimers[1], 0, '斩中刀魂立刻刷新突进（跳板成立）');

// 环身爆发：范围内扣命，范围外安全
makeIdle(data);
boss.action = 'nova';
boss.novaHit = false;
boss.state = 'telegraph';
data.lives = 3;
Player.invulnTimer = 0;
Player.x = boss.x + boss.novaRange - 20;
Player.y = boss.y;
BOSS.startAction(boss, MiniGames);
eq(data.lives, 2, '环身爆发范围内 -1 命');

boss.novaHit = false;
boss.action = 'nova';
Player.invulnTimer = 0;
data.lives = 3;
Player.x = boss.x + boss.novaRange + 60;
Player.y = boss.y;
BOSS.startAction(boss, MiniGames);
eq(data.lives, 3, '站在环身爆发范围外不掉血');

// 剑阵：全向弹幕，数量 = stormCount
boss.blades.length = 0;
boss.action = 'storm';
boss.aim = 0;
BOSS.startAction(boss, MiniGames);
eq(boss.blades.length, boss.stormCount, '剑阵按 stormCount 放射飞刃（' + boss.stormCount + ' 把）');
var angSet = boss.blades.map(function (b) { return Math.round(Math.atan2(b.vy, b.vx) * 100) / 100; });
ok(new Set(angSet).size >= boss.stormCount - 1, '剑阵是 360° 全向而不是扇形');
boss.blades.length = 0;

// 贴脸时选招偏向近身惩罚
boss.phase = 3;
Player.x = boss.x + 120;
Player.y = boss.y;
var nearHits = 0;
for (var pi = 0; pi < 200; pi++) {
  BOSS.pickAction(boss, MiniGames);
  if (boss.action === 'nova' || boss.action === 'storm') nearHits++;
}
ok(nearHits / 200 >= 0.5, '贴脸时 60% 概率触发环身爆发/剑阵（实测 ' + (nearHits / 200 * 100).toFixed(0) + '%）');

// 一阶段不出「一闪」
boss.phase = 1;
var sawBlitz = false;
for (var pj = 0; pj < 120; pj++) {
  BOSS.pickAction(boss, MiniGames);
  if (boss.action === 'blitz') sawBlitz = true;
}
ok(!sawBlitz, '第一阶段不会出「一闪」（先让玩家学近身招）');

// ============================================================================
// 6. 击杀 Boss → 胜利结算
// ============================================================================
data = startBoss();
makeIdle(data);
boss = data.boss;
boss.hp = 4;
boss.hitCd = 0;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = BOSS.getWeakPos(boss, 0).x;
Player.y = BOSS.getWeakPos(boss, 0).y;
data.prevPos = { x: Player.x, y: Player.y };
var comboBefore = MiniGames.combo;
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.state, 'dying', '血量归零进入死亡演出');
ok(MiniGames.combo >= comboBefore + 30, '击杀额外 +30 连斩');
ok(data.dummies.indexOf(data.bossDummy) < 0, '死亡后 Boss 假靶撤离战场');

// 跑完演出（1.9s）+ 结算（3.2s）
resetInput();
for (var i = 0; i < 140 && !MiniGames.finished; i++) MiniGames.update(1 / 60);
ok(MiniGames.finished === true, '死亡演出结束触发结算');
eq(MiniGames.result, 'win', '结算结果为 win');
ok(MiniGames.lastSummary && MiniGames.lastSummary.result === 'win', '结算摘要带上 win（结算页显示「宿敌已斩」）');
ok(MiniGames.lastSummary && MiniGames.lastSummary.modeName.indexOf('宿敌') >= 0, '结算摘要记录模式名');

// 记录隔离
var bossHigh = parseInt(localStorage.getItem('arcade_iaijutsu_boss_high') || '0', 10);
eq(localStorage.getItem('arcade_iaijutsu_high'), null, '宿敌战的成绩不写进原版记录键');
ok(bossHigh >= 30, '宿敌战成绩写入自己的记录键（' + bossHigh + '）');

// ============================================================================
// 7. 阵亡 → 失败结算
// ============================================================================
data = startBoss();
makeIdle(data);
data.lives = 1;
Player.invulnTimer = 0;
BOSS.damagePlayer(MiniGames, Player.x, Player.y, 'x');
eq(data.lives, 0, '最后一条命被打掉');
ok(MiniGames.finished === true, '生命耗尽立刻结算');
eq(MiniGames.result, 'lose', '结算结果为 lose');
ok(MiniGames.lastSummary && MiniGames.lastSummary.msg.indexOf('宿敌') >= 0, '失败文案指向宿敌战');

// ============================================================================
// 8. 离场还原实现
// ============================================================================
MiniGames.leave();
ok(window.IaijutsuMode === MODE_BASE, '离场后全局恢复原版控制器');
ok(window.IaijutsuTargets === TARGETS_BASE, '离场后全局恢复原版靶表');

// 原版再启动一次，确认没被宿敌战污染
Game.state = 'PLAYING';
MiniGames.start('iaijutsu', 'classic');
eq(MiniGames.modeId, 'classic', '宿敌战之后仍能正常开原版');
eq(MiniGames.iaijutsuData.boss, undefined, '原版没有 Boss 字段');

console.log('');
if (fail) {
  console.error('共 ' + fail + ' 项断言失败');
  process.exit(1);
}
console.log('宿敌战全部断言通过');
