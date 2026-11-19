// ============================================================================
// 鬼影追猎 · 横向卷轴追逐战回归测试
// 运行：node tests/iaijutsu_chase_test.js
// ============================================================================
// 覆盖：模式隔离 / 逃脱与无尽双模式初始化 / 切靶瞬刷 CD / 挥空仅罚短暂 CD 不扣命 /
//       右键救场刷新 CD / 空格瞬步脱身清减速与斩波 / 三大怪物技能预警与生效 /
//       3 命受击保护与失败结算 / 1500m 鸟居冲线胜利与最快用时存档 /
//       无尽长廊动态延伸与最远距离存档 / 离场还原原版实现。
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

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
      if (k === 'createLinearGradient' || k === 'createRadialGradient') {
        return function () { return { addColorStop: function () {} }; };
      }
      if (k === 'measureText') {
        return function () { return { width: 100 }; };
      }
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

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js/load_order.js'), 'utf8'), { filename: 'js/load_order.js' });
window.GAME_LOAD_ORDER.forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});

var MODE_BASE = window.IaijutsuMode;
var MODE_CHASE = window.IaijutsuModeChase;
var MONSTER = window.IaijutsuChaseMonster;

Object.getOwnPropertyNames(UI).forEach(function (k) {
  if (typeof UI[k] === 'function') UI[k] = function () {};
});
UI.isIaiHubOpen = function () { return false; };
UI.isIaiShopOpen = function () { return false; };
SFX.play = function () {};
SFX.playIaijutsuBgm = function () {};
SFX.stopIaijutsuBgm = function () {};
Input.isDown = function () { return false; };
Input.logicalPos = function () { return { x: 640, y: 270 }; };

var fail = 0;
function ok(cond, msg) {
  if (cond) console.log('✓ ' + msg);
  else { console.error('✗ ' + msg); fail++; }
}
function eq(a, b, msg) { ok(a === b, msg + '（实际 ' + a + '，期望 ' + b + '）'); }

function startChase(modeId) {
  Game.state = 'PLAYING';
  Player.reset();
  MiniGames.start('iaijutsu', modeId || 'chase_escape');
  return MiniGames.iaijutsuData;
}

function stepFrames(n, dt) {
  dt = dt || (1 / 60);
  for (var i = 0; i < n; i++) MiniGames.update(dt);
}

// ============================================================================
// 1. 终点逃脱模式初始化与走廊构建
// ============================================================================
var data = startChase('chase_escape');
ok(window.IaijutsuMode === MODE_CHASE, 'chase_escape 启动后切到追逐模式控制器');
eq(data.chaseVariant, 'escape', '变体为 escape');
eq(data.lives, 3, '追逐战开局 3 条命');
ok(data.monster && data.monster.x < Player.x, '追猎恶鬼位于玩家左侧后方');
ok(data.dummies.length >= 4, '前方已预铺可连闪踏板靶（实际 ' + data.dummies.length + ' 个）');
ok(MiniGames.room.w > 15000, '横向走廊房间长度超过 1500m');

// 渲染不报错
var ctx = stubCtx();
var renderOk = true;
try {
  MiniGames.render(ctx);
} catch (err) {
  renderOk = false;
  console.error(err);
}
ok(renderOk, '追逐战场景与专属 HUD 正常渲染不抛异常');

// ============================================================================
// 2. 切靶瞬刷 CD & 挥空仅罚短暂冷却（不扣命）
// ============================================================================
var target0 = data.dummies[0];
Player.skillTimers[1] = 1.1; // 模拟冷却中切中靶子
MODE_CHASE.onKill(target0, true, 0, MiniGames);
eq(Player.skillTimers[1], 0, '切中靶子立即将突进 CD 刷新为 0');
ok(MiniGames.combo >= 1, '切靶后连斩累加');

// 挥空：应不扣命、陷入 1.35s 短暂冷却
var livesBeforeMiss = data.lives;
Player.skillTimers[1] = 0;
MODE_CHASE.triggerDisconnect(Player.x, Player.y, 'miss', MiniGames);
eq(data.lives, livesBeforeMiss, '居合挥空不扣命');
ok(Math.abs(Player.skillTimers[1] - MODE_CHASE.MISS_COOLDOWN) < 0.01, '挥空后进入短暂突进冷却 (' + Player.skillTimers[1] + 's)');

// 右键近身挥砍命中旁边靶子同样可救场刷新 CD
var targetNear = data.dummies[1];
Player.x = targetNear.x - 20;
Player.y = targetNear.y;
Input.logicalPos = function () { return { x: targetNear.x - Main.camX, y: targetNear.y - Main.camY }; };
Input.rightPressed = true;
Player.fireTimer = 0;
stepFrames(1, 0.016);
eq(Player.skillTimers[1], 0, '冷却期间右键近身切中靶子同样刷新突进 CD');

// ============================================================================
// 3. 追猎恶鬼三大封路技能（猛冲、封路斩波、缚足黑雾陷阱）
// ============================================================================
var m = data.monster;
m.state = 'chase';
m.x = Player.x - 220;
m.y = Player.y;

// 3.1 猛冲突袭
MONSTER.startSkillTelegraph(m, 'lunge', MiniGames);
eq(m.state, 'telegraph', '猛冲进入预警阶段');
eq(m.skillType, 'lunge', '当前技能类型为 lunge');
MONSTER.executeSkillAction(m, MiniGames);
eq(m.state, 'action', '猛冲预警结束后进入扑击阶段');
ok(m.vx >= 750, '猛冲速度高速爆发 (' + m.vx + ')');

// 3.2 封路斩波
MONSTER.startSkillTelegraph(m, 'wave', MiniGames);
ok(m.pendingWaveLanes.length >= 1 && m.pendingWaveLanes.length <= 2, '封路斩波锁定 1~2 条车道（恒留安全通道）');
MONSTER.executeSkillAction(m, MiniGames);
ok(m.waves.length >= 1, '斩波释放后生成飞行斩波实体');

// 3.3 缚足黑雾陷阱 + 空格【瞬步脱身】清除减速与斩波
m.traps.length = 0;
MONSTER.startSkillTelegraph(m, 'trap', MiniGames);
ok(m.traps.length >= 2, '缚足陷阱预埋 2~3 个地面预警圈');
// 强制引爆陷阱并让玩家站入毒池
m.traps[0].phase = 'active';
m.traps[0].burstT = 0;
Player.x = m.traps[0].x;
Player.y = m.traps[0].y;
Player.invulnTimer = 0;
data.hitInvuln = 0;
Player.dashT = 0;
MONSTER.update(0.016, MiniGames);
ok(data.slowTimer > 0, '踩入黑雾毒池触发缚足减速');

// 放一个近身斩波 + 一个远处斩波，测试瞬步脱身精准震散近身斩波
m.waves.length = 0;
m.waves.push({ x: Player.x + 60, y: Player.y, vx: 700, halfW: 28, halfH: 27, life: 2, hit: false });
m.waves.push({ x: Player.x + 420, y: Player.y, vx: 700, halfW: 28, halfH: 27, life: 2, hit: false });
data.escapeDashCd = 0;
MODE_CHASE.triggerEscapeStep(MiniGames);
eq(data.slowTimer, 0, '空格【瞬步脱身】立即解除缚足减速');
ok(Player.invulnTimer >= 0.4, '【瞬步脱身】赋予短暂无敌');
ok(data.escapeDashCd > 0, '【瞬步脱身】进入冷却');
eq(m.waves.length, 1, '【瞬步脱身】精准震散身边斩波并保留远处斩波');

// 3.4 墙隙鬼手合杀
m.claws.length = 0;
MONSTER.spawnClaws(m, MiniGames);
ok(m.claws.length >= 3, '墙隙鬼手生成 3+ 只上下墙爪（实际 ' + m.claws.length + ' 只）');
m.claws[0].delay = 0;
m.claws[0].telegraphT = 0.01;
MONSTER.update(0.02, MiniGames);
eq(m.claws[0].phase, 'strike', '鬼手预警完毕转入拍击阶段');

// 3.5 血月业火柱连环追爆
m.pillars.length = 0;
m.pillarQueue.length = 0;
MONSTER.spawnPillars(m, MiniGames);
ok(m.pillarQueue.length >= 4, '血月业火柱排入 4+ 道连环队列（实际 ' + m.pillarQueue.length + ' 道）');
MONSTER.update(0.02, MiniGames);
ok(m.pillars.length >= 1, '首道血月业火柱进入地面法阵预警');

// 3.6 阶段递增（500m 二阶血月解锁刀网 / 1000m 三阶百鬼解锁鬼影分身）
data.distanceM = 560;
MONSTER.update(0.016, MiniGames);
eq(m.phase, 2, '推进过 500m 自动进入二阶·血月降临');
MONSTER.spawnLattice(m, MiniGames);
ok(m.lattices.length >= 1 && m.lattices[0].lines.length >= 4, '绯红次元刀网生成 4+ 条斜向交叉斩线');

data.distanceM = 1080;
MONSTER.update(0.016, MiniGames);
eq(m.phase, 3, '推进过 1000m 自动进入三阶·百鬼夜行');
MONSTER.spawnPhantom(m, MiniGames);
ok(m.phantoms.length >= 1 && m.phantoms[0].phase === 'travel', '夺路鬼影分身越顶飞向玩家右侧前方');

// 3.7 【⚡ 见切！】冲刺无敌帧穿招触发连斩奖励且不扣血
var comboBeforeGraze = MiniGames.combo;
var livesBeforeGraze = data.lives;
Player.dashT = 0.12;
data.grazeCd = 0;
var hitRes = MONSTER.checkHitOrGraze(MiniGames, '刀网命中', '刀网', 45, false);
eq(hitRes, false, '居合冲刺中穿招不掉血');
eq(data.lives, livesBeforeGraze, '见切后命数不变');
eq(MiniGames.combo, comboBeforeGraze + 3, '见切成功奖励 +3 连斩');
Player.dashT = 0;

// 3.8 全技能同屏华丽渲染无报错
var fxRenderOk = true;
try {
  m.lattices[0].phase = 'slash';
  m.pillars[0].phase = 'erupt';
  m.phantoms[0].phase = 'dash';
  MiniGames.render(ctx);
} catch (errFx) {
  fxRenderOk = false;
  console.error(errFx);
}
ok(fxRenderOk, '鬼手 / 业火柱 / 次元刀网 / 鬼影分身 / 三阶业火双翼同屏渲染正常');

// ============================================================================
// 4. 3 条命受击保护与失败结算
// ============================================================================
data.lives = 3;
Player.invulnTimer = 0;
data.hitInvuln = 0;
ok(MONSTER.hurtPlayer(MiniGames, '测试受击1', 50, false) === true, '第 1 次受击命中');
eq(data.lives, 2, '剩余 2 命');
ok(MONSTER.hurtPlayer(MiniGames, '无敌帧内连撞', 50, false) === false, '受击无敌保护期内免疫连续扣血');
Player.invulnTimer = 0; data.hitInvuln = 0;
MONSTER.hurtPlayer(MiniGames, '测试受击2', 50, false);
Player.invulnTimer = 0; data.hitInvuln = 0;
MONSTER.hurtPlayer(MiniGames, '测试受击3', 50, false);
eq(data.lives, 0, '3 命耗尽归零');
ok(MiniGames.finished && MiniGames.result === 'lose', '3 命耗尽正确触发追猎失败结算');

// ============================================================================
// 5. 1500m 鸟居冲线胜利与最快用时存档
// ============================================================================
data = startChase('chase_escape');
Player.x = data.finishGateX + 10;
MiniGames.timer = 48.5;
stepFrames(2, 0.016);
ok(data.escapeVictory === true, '到达 1500m 鸟居结界触发逃脱胜利演出');
stepFrames(75, 0.02);
ok(MiniGames.finished && MiniGames.result === 'win', '胜利演出结束后正确结算 win');
ok(MiniGames.getChaseEscapeBestTime() > 0 && MiniGames.getChaseEscapeBestTime() <= 50, '逃脱最快用时已写入 localStorage');

// ============================================================================
// 6. 无尽逃亡：动态延伸走廊、相机前进与最远距离存档
// ============================================================================
data = startChase('chase_endless');
eq(data.chaseVariant, 'endless', 'chase_endless 启动正确变体');
var cam0 = data.camX;
var roomW0 = MiniGames.room.w;
Player.x = MiniGames.room.worldX + roomW0 - 1500;
stepFrames(4, 0.016);
ok(MiniGames.room.w > roomW0, '无尽逃亡接近边界时自动延长走廊');
ok(data.camX > cam0, '横向卷轴相机平滑跟随玩家推进');
ok(data.distanceM > 3000, '无尽距离正确统计 (' + Math.floor(data.distanceM) + 'm)');
data.lives = 1;
Player.invulnTimer = 0; data.hitInvuln = 0;
MONSTER.hurtPlayer(MiniGames, '无尽终点受击', 20, true);
ok(MiniGames.finished, '无尽模式 0 命结束');
ok(MiniGames.getModeHighScore('chase_endless') >= 3000, '无尽最远逃亡距离已写入 localStorage');

// ============================================================================
// 7. 离场还原原版实现（不污染 classic / ex / boss）
// ============================================================================
MiniGames.leave();
ok(window.IaijutsuMode === MODE_BASE, '离场后 window.IaijutsuMode 还原为原版');
eq(Player.speedMult, 1, '离场后 Player.speedMult 还原为 1');

if (fail > 0) {
  console.error('\n失败用例数：' + fail);
  process.exit(1);
}
console.log('\n全部鬼影追猎测试通过！');
