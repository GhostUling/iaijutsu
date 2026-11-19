// ============================================================================
// 宿敌战 · 高难居合对决 + 独立选敌页回归测试
// 运行：node tests/iaijutsu_boss_test.js
// ============================================================================
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

function stubElement() {
  return {
    style: { setProperty: function () {} }, dataset: {},
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
      if (k === 'measureText') return function () { return { width: 80 }; };
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
  querySelectorAll: function () { return []; },
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

function startBoss(bossId) {
  Game.state = 'PLAYING';
  Player.maxHp = 100;
  Player.maxShield = 50;
  MiniGames.selectedBossId = bossId || 'mumyo';
  MiniGames.start('iaijutsu', 'boss');
  Player.invulnTimer = 0;
  MiniGames.iaijutsuData.bossSafeInvuln = 0;
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

function makeIdle(data) {
  var b = data.boss;
  b.state = 'idle';
  b.stateT = 0;
  b.stateDur = 99;
  b.vulnerable = true;
  b.windowHits = 0;
  b.hitCd = 0;
}

// ============================================================================
// 1. 选敌页元数据 & 三位宿敌高难数值
// ============================================================================
eq(BOSS.BOSS_LIST.length, 3, '宿敌名录包含 3 位独立 Boss');
ok(BOSS.BOSS_LIST.every(function (b) { return b.moveCards && b.moveCards.length === 4 && b.difficulty >= 3; }), '每位宿敌均具备完整 4 招图鉴与星级难度');

var data = startBoss('mumyo');
ok(window.IaijutsuMode === MODE_BOSS, 'boss 启动后切到宿敌控制器');
eq(data.boss.id, 'mumyo', '指定无明生效');
ok(data.boss.maxHp >= 130 && data.boss.maxPosture >= 120, '宿敌血量与架势具备高难压迫感（HP ' + data.boss.maxHp + ' / 架势 ' + data.boss.maxPosture + '）');

// ============================================================================
// 2. 弱点 5 伤 +20 架势 / 普通 3 伤 +10 架势 / 破绽窗最多连砍 2 刀
// ============================================================================
makeIdle(data);
var boss = data.boss;
var hp0 = boss.hp;
var wp = BOSS.getWeakPos(boss, 0);

data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = wp.x;
Player.y = wp.y;
data.prevPos = { x: wp.x, y: wp.y };
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hp0 - 5, '斩中弱点造成 5 点伤害');
eq(boss.posture, 20, '弱点命中增加 20 点架势');
ok(Player.invulnTimer <= 0.1, '普攻不再附赠长无敌帧防无脑贴脸（' + Player.invulnTimer.toFixed(2) + 's）');

// 第 2 刀后 Boss 立刻撤步起招，彻底封死贴脸连切！
boss.hitCd = 0;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = boss.x + 200;
Player.y = boss.y;
data.prevPos = { x: Player.x, y: Player.y };
var hpBeforeNorm = boss.hp;
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpBeforeNorm - 3, '普通本体斩击造成 3 点伤害');
eq(boss.state, 'telegraph', '单次破绽期连砍 2 刀后 Boss 立刻撤步起招反攻');

// ============================================================================
// 3. 严惩无脑贴脸左键硬砍：蓄力震刀弹开 + 出招霸体迎击反斩
// ============================================================================
data = startBoss('mumyo');
boss = data.boss;
boss.state = 'telegraph';
boss.action = 'iaijutsu_draw';
boss.stateDur = 0.68;
boss.stateT = 0.55; // 即使在金光窗内，直接左键硬撞也不能白嫖见切！
boss.hitCd = 0;
boss.posture = 0;
Player.x = boss.x + 30;
Player.y = boss.y;
Player.invulnTimer = 0;
Player.skillTimers[1] = 0;
var hpTel = boss.hp;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.hp, hpTel, '蓄力中左键硬撞 Boss 触发震刀弹开（0 伤害）');
eq(boss.posture, 0, '蓄力中左键硬撞不涨 Boss 架势（禁止白嫖）');
ok(Player.skillTimers[1] >= 1.1, '蓄力中硬撞被锁突进 1.15s 并击退');
eq(Player.invulnTimer, 0, '蓄力中硬撞不给免费无敌帧');
ok(Utils.dist(Player.x, Player.y, boss.x, boss.y) >= boss.r + 95, '玩家被震刀强力击退拉开距离');

// 出招中（action）贴脸左键突进硬撞 Boss（走完整 update 流程验证原版 0.30s 突进无敌已被剥离）：直接吃霸体迎击反斩 -1 命！
boss.state = 'action';
boss.action = 'iaijutsu_draw';
boss.stateT = 0.05;
boss.stateDur = 0.4;
boss.hitCd = 0;
data.lives = 3;
Player.x = boss.x + 25;
Player.y = boss.y;
Player.invulnTimer = 0;
data.bossSafeInvuln = 0;
Player.skillTimers[1] = 0;
Player.dashT = 0;
resetInput();
Input.leftPressed = true;
MODE_BOSS.update(0.016, { x: boss.x, y: boss.y }, Input, MiniGames);
eq(data.lives, 2, '出招期贴脸左键突进硬撞 Boss 霸体吃迎击反斩 -1 命（不白嫖突进无敌帧）');

// ============================================================================
// 4. 真正的【空格心眼见切】与【危 字不可弹反杀招】
// ============================================================================
data = startBoss('mumyo');
boss = data.boss;
boss.state = 'telegraph';
boss.action = 'iaijutsu_draw';
boss.stateDur = 0.68;
boss.stateT = 0.52; // 剩余 0.16s <= 0.28s 金光窗
boss.posture = 0;
data.eyeCd = 0;
Player.skillTimers[1] = 1.1;
var hpBeforeParry = boss.hp;
MODE_BOSS.eyeOfMind(MiniGames);
eq(data.parryCount, 1, '金光窗内按空格触发【心眼·完美见切】');
eq(boss.hp, hpBeforeParry - 6, '完美见切反斩造成 6 点伤害');
eq(boss.posture, 34, '完美见切大削 34 点架势');
eq(Player.skillTimers[1], 0, '完美见切刷新突进冷却');
ok(data.eyeCd <= 1.7, '完美见切返还 2.0s 心眼冷却（剩余 ' + data.eyeCd.toFixed(1) + 's）');
eq(boss.state, 'recover', '完美见切打断连招并打出破绽');

// 危字杀招（如 cross_cut / quake_nova / dimension_net）不可弹反！
boss.state = 'telegraph';
boss.action = 'cross_cut';
boss.stateDur = 0.76;
boss.stateT = 0.62;
data.eyeCd = 0;
var parryCntBeforeDanger = data.parryCount;
ok(BOSS.isUnblockable('cross_cut') && BOSS.isUnblockable('quake_nova') && BOSS.isUnblockable('dimension_net'), '十字断空/震地/次元刀网被标记为危字不可弹反');
eq(BOSS.isParryWindow(boss), false, '危字杀招不开放见切弹反窗口');
MODE_BOSS.eyeOfMind(MiniGames);
eq(data.parryCount, parryCntBeforeDanger, '对危字杀招按空格不会打断 Boss，必须闪避红区');

// ============================================================================
// 5. 架势崩解 + 居合处决（-26 HP）+ 独立宿敌战绩落盘
// ============================================================================
data = startBoss('akaoni');
makeIdle(data);
boss = data.boss;
boss.posture = boss.maxPosture - 5;
BOSS.addPosture(boss, 10, MiniGames);
eq(boss.state, 'broken', '架势满格触发架势崩解');

var hpBeforeExec = boss.hp;
boss.hitCd = 0;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
MODE_BOSS.onKill(data.bossDummy, true, 0.2, MiniGames);
eq(boss.hp, hpBeforeExec - 26, '居合处决造成 26 点高额爆发伤害');
eq(data.execCount, 1, '处决计数 +1');

// 击杀赤鬼并验证分 Boss 独立纪录（选敌页卡片显示用）
makeIdle(data);
boss.hp = 5;
boss.hitCd = 0;
MiniGames.timer = 44.8;
data.hitsTaken = 0;
data.parryCount = 4;
data.dummies.splice(data.dummies.indexOf(data.bossDummy), 1);
Player.x = BOSS.getWeakPos(boss, 0).x;
Player.y = BOSS.getWeakPos(boss, 0).y;
data.prevPos = { x: Player.x, y: Player.y };
MODE_BOSS.onKill(data.bossDummy, true, 0, MiniGames);
eq(boss.state, 'dying', '血量归零进入终结演出');

resetInput();
for (var i = 0; i < 130 && !MiniGames.finished; i++) MiniGames.update(1 / 60);
ok(MiniGames.finished && MiniGames.result === 'win', '胜利结算触发');
var akaoniRec = MiniGames.getBossRecord('akaoni');
eq(akaoniRec.rank, 'S', '赤鬼独立战绩记录 S 级');
ok(akaoniRec.bestTime > 0 && akaoniRec.clears === 1, '赤鬼独立战绩记录最快用时与讨伐次数');
eq(MiniGames.getBossRecord('mumyo').clears, 0, '其他宿敌独立战绩互不污染');

// ============================================================================
// 6. 渲染冒烟 + 离场还原
// ============================================================================
var ctx = stubCtx();
var renderOk = true;
try {
  ['mumyo', 'akaoni', 'byakuya'].forEach(function (bid) {
    var d = startBoss(bid);
    var b = d.boss;
    ['intro', 'idle', 'telegraph', 'action', 'broken', 'dying'].forEach(function (st) {
      b.state = st;
      b.action = b.moves[0];
      b.stateDur = 0.7;
      b.stateT = 0.55;
      BOSS.render(ctx, MiniGames);
    });
  });
} catch (err) {
  renderOk = false;
  console.error('渲染异常:', err);
}
ok(renderOk, '三位宿敌所有状态（含危字/金光/处决/剪影）渲染无报错');

// ============================================================================
// 7. 宿敌交互式新手教程（5 课全流程 + 免死保护 + 渲染 + 毕业存档）
// ============================================================================
var MODE_TUT = window.IaijutsuModeBossTutorial;
ok(!!MODE_TUT && MODE_TUT.LESSONS.length === 5, '宿敌新手教程包含完整 5 课教学');

Game.state = 'PLAYING';
MiniGames.start('iaijutsu', 'boss_tutorial');
var tData = MiniGames.iaijutsuData;
ok(window.IaijutsuMode === MODE_TUT, 'boss_tutorial 启动后切到新手教程控制器');
eq(tData.bossTutorial, true, '教程模式标记开启');
eq(tData.tutorialStep, 0, '从第 1 课（破绽弱点）开始');

// 教程免死保护验证：受击不会扣命也不会结算失败
Player.invulnTimer = 0;
tData.bossSafeInvuln = 0;
BOSS.damagePlayer(MiniGames, Player.x, Player.y, '测试受击');
eq(tData.lives, 3, '新手教程受击不扣命（全程免死）');
eq(MiniGames.finished, false, '新手教程受击不触发失败结算');

// 第 1 课：破绽期砍 2 刀后准备推进第 2 课
tData.boss.hitCd = 0;
tData.dummies.splice(tData.dummies.indexOf(tData.bossDummy), 1);
MODE_TUT.onKill(tData.bossDummy, true, 0, MiniGames);
tData.boss.hitCd = 0;
tData.dummies.splice(tData.dummies.indexOf(tData.bossDummy), 1);
MODE_TUT.onKill(tData.bossDummy, true, 0, MiniGames);
resetInput();
MODE_TUT.update(0.05, { x: tData.boss.x, y: tData.boss.y }, Input, MiniGames);
eq(tData.tutorialProgress, 2, '第 1 课连砍 2 刀达成目标');
ok(tData.tutorialAdvanceTimer > 0, '第 1 课达成后进入自动切课倒计时');

// 跳到第 3 课：验证金光放宽窗口 + 空格见切推进
MODE_TUT.setupLesson(2, MiniGames);
eq(tData.tutorialStep, 2, '成功进入第 3 课（心眼见切）');
MODE_TUT._castTutorialParryDraw(tData.boss, MiniGames);
tData.boss.stateT = tData.boss.stateDur - 0.35; // 在 0.52s 教学宽容金光窗内
ok(BOSS.isParryWindow(tData.boss), '第 3 课金光见切窗口已放宽至 0.52s');
resetInput();
Input.spacePressed = true;
MODE_TUT.update(0.016, { x: tData.boss.x, y: tData.boss.y }, Input, MiniGames);
eq(tData.tutorialProgress, 1, '第 3 课空格心眼见切成功计入进度');

// 第 4 课：斩碎飞刃计数
MODE_TUT.setupLesson(3, MiniGames);
MODE_TUT._castTutorialBlades(tData.boss, MiniGames);
ok(tData.boss.blades.length === 3, '第 4 课发射 3 道教学慢速飞刃');
BOSS.shatterBlade(tData.boss, 0, MiniGames);
resetInput();
MODE_TUT.update(0.016, { x: tData.boss.x, y: tData.boss.y }, Input, MiniGames);
eq(tData.tutorialProgress, 1, '第 4 课斩碎飞刃正确计入进度');

// 第 5 课：高架势破防 → 居合处决 → 毕业存档
MODE_TUT.setupLesson(4, MiniGames);
ok(tData.boss.posture >= Math.floor(tData.boss.maxPosture * 0.8), '第 5 课开局预充高额架势方便体验处决');
BOSS.enterBroken(tData.boss, MiniGames);
tData.boss.hitCd = 0;
tData.dummies.splice(tData.dummies.indexOf(tData.bossDummy), 1);
MODE_TUT.onKill(tData.bossDummy, true, 0, MiniGames);
resetInput();
MODE_TUT.update(0.016, { x: tData.boss.x, y: tData.boss.y }, Input, MiniGames);
MODE_TUT.update(1.2, { x: tData.boss.x, y: tData.boss.y }, Input, MiniGames);
eq(tData.tutorialDone, true, '第 5 课处决后正式毕业');
eq(MODE_TUT.isCompleted(), true, '教程毕业状态写入本地存档');

// 教程全 5 课引导渲染冒烟
var tutRenderOk = true;
try {
  for (var ts = 0; ts < MODE_TUT.LESSONS.length; ts++) {
    tData.tutorialDone = false;
    MODE_TUT.setupLesson(ts, MiniGames);
    if (ts === 1) MODE_TUT._castTutorialCrossCut(tData.boss, MiniGames);
    if (ts === 2) { MODE_TUT._castTutorialParryDraw(tData.boss, MiniGames); tData.tutorialParrySlow = true; }
    if (ts === 3) MODE_TUT._castTutorialBlades(tData.boss, MiniGames);
    if (ts === 4) BOSS.enterBroken(tData.boss, MiniGames);
    MODE_TUT.render(ctx, MiniGames);
  }
} catch (err) {
  tutRenderOk = false;
  console.error('教程渲染异常:', err);
}
ok(tutRenderOk, '宿敌新手教程 5 课实景引导渲染全部无报错');

// ============================================================================
// 8. 宿敌战专属 · 三大古流派（英信 / 示现 / 新阴）+ 心眼角色环绕特效
// ============================================================================
var STYLES = window.IaijutsuBossStyles;
ok(!!STYLES && STYLES.STYLE_LIST.length === 3, '三大古流派已注册（英信/示现/新阴）');

// (1) 无双英信流：挥空 0.9s 短 CD + 命中后右键【奥义 · 燕返】
STYLES.setSelectedStyleId('eishin');
MiniGames.selectedBossStyleId = 'eishin';
var eData = startBoss('mumyo');
makeIdle(eData);
var eHp0 = eData.boss.hp;
eData.dummies.splice(eData.dummies.indexOf(eData.bossDummy), 1);
Player.x = BOSS.getWeakPos(eData.boss, 0).x;
Player.y = BOSS.getWeakPos(eData.boss, 0).y;
eData.prevPos = { x: Player.x, y: Player.y };
MODE_BOSS.onKill(eData.bossDummy, true, 0, MiniGames);
ok(eData.tsubameWindow > 0.3, '英信流左键命中后开启【燕返】派生窗口');
var eHpAfterHit = eData.boss.hp;
resetInput();
Input.rightPressed = true;
MODE_BOSS.update(0.016, { x: eData.boss.x, y: eData.boss.y }, Input, MiniGames);
eq(eData.boss.hp, eHpAfterHit - 4, '英信流右键触发【奥义·燕返】追加 4 点伤害');
ok(eData.styleCalligraphy && eData.styleCalligraphy.title.indexOf('燕返') >= 0, '燕返触发竖排毛笔水墨招式牌');
MODE_BOSS.triggerDisconnect(Player.x, Player.y, 'miss', MiniGames);
ok(Math.abs(Player.skillTimers[1] - 0.9) < 0.02, '英信流挥空冷却缩短至 0.9s');

// (2) 萨摩示现流：长按左键黄金窗松手【秘剑 · 云耀】+ 处决 34 点重伤
STYLES.setSelectedStyleId('jigen');
MiniGames.selectedBossStyleId = 'jigen';
var jData = startBoss('akaoni');
makeIdle(jData);
resetInput();
Player.skillTimers[1] = 0;
Player.dashT = 0;
Input.leftPressed = true;
Input.mouseDown = true;
MODE_BOSS.update(0.016, { x: jData.boss.x, y: jData.boss.y }, Input, MiniGames);
eq(jData.jigenHolding, true, '示现流按下左键进入蓄力拔刀态');
Input.leftPressed = false;
MODE_BOSS.update(0.50, { x: jData.boss.x, y: jData.boss.y }, Input, MiniGames);
Input.mouseDown = false; // 黄金窗 0.50s 松手
MODE_BOSS.update(0.016, { x: jData.boss.x, y: jData.boss.y }, Input, MiniGames);
eq(jData.jigenReleasePower, 2, '示现流黄金窗松手武装【秘剑·云耀】');
var jHp0 = jData.boss.hp;
jData.boss.hitCd = 0;
jData.dummies.splice(jData.dummies.indexOf(jData.bossDummy), 1);
Player.x = BOSS.getWeakPos(jData.boss, 0).x;
Player.y = BOSS.getWeakPos(jData.boss, 0).y;
jData.prevPos = { x: Player.x, y: Player.y };
MODE_BOSS.onKill(jData.bossDummy, true, 0, MiniGames);
eq(jData.boss.hp, jHp0 - 12, '示现流【秘剑·云耀】命中造成 12 点爆发伤害');

// 示现流处决重劈 +8 伤（共 34 伤）
BOSS.enterBroken(jData.boss, MiniGames);
var jHpExec = jData.boss.hp;
jData.boss.hitCd = 0;
jData.dummies.splice(jData.dummies.indexOf(jData.bossDummy), 1);
MODE_BOSS.onKill(jData.bossDummy, true, 0, MiniGames);
eq(jData.boss.hp, jHpExec - 34, '示现流【居合处决】升级为 34 点毁灭重劈');

// (3) 柳生新阴流：0.38s 宽见切窗 + 受流总切三连(10伤/44架势) + 停手自动纳刀爆残心印
STYLES.setSelectedStyleId('shinkage');
MiniGames.selectedBossStyleId = 'shinkage';
var sData = startBoss('mumyo');
var sBoss = sData.boss;
sBoss.state = 'telegraph';
sBoss.action = 'iaijutsu_draw';
sBoss.stateDur = 0.72;
sBoss.stateT = sBoss.stateDur - 0.34; // 0.34s：原版不能弹，新阴流 0.38s 可弹！
ok(BOSS.isParryWindow(sBoss), '新阴流【参之型·受流】见切窗口放宽至 0.38s');
var sHp0 = sBoss.hp;
sBoss.posture = 0;
sData.eyeCd = 0;
resetInput();
Input.spacePressed = true;
MODE_BOSS.update(0.016, { x: sBoss.x, y: sBoss.y }, Input, MiniGames);
eq(sBoss.hp, sHp0 - 10, '新阴流完美见切触发【总切三连】造成 10 点伤害');
eq(sBoss.posture, 44, '新阴流完美见切暴涨 44 点架势');
eq(sData.zanshinStacks, 1, '新阴流见切刻下残心印记');
var sHpBeforeSheathe = sBoss.hp;
resetInput();
MODE_BOSS.update(0.4, { x: sBoss.x, y: sBoss.y }, Input, MiniGames);
eq(sData.zanshinStacks, 0, '新阴流短暂停手自动完成【血振·纳刀】并清空残心印');
eq(sBoss.hp, sHpBeforeSheathe - 3, '新阴流纳刀引爆残心印造成追加伤害');

// (4) 心眼角色环绕特效全状态（就绪常驻 / 金光爆闪 / 冷却弧 / 流派专属渲染）冒烟
var styleRenderOk = true;
try {
  ['eishin', 'jigen', 'shinkage'].forEach(function (sid) {
    STYLES.setSelectedStyleId(sid);
    MiniGames.selectedBossStyleId = sid;
    var sd = startBoss('mumyo');
    sd.eyeCd = 0; sd.eyeJustReadyT = 0.3; sd.eyeActiveT = 0.15;
    sd.tsubameWindow = 0.3; sd.jigenHolding = true; sd.jigenChargeT = 0.52;
    sd.zanshinStacks = 2; sd.sheatheFlashT = 0.3;
    sd.boss.state = 'telegraph'; sd.boss.action = 'iaijutsu_draw';
    sd.boss.stateDur = 0.7; sd.boss.stateT = 0.58;
    STYLES.showCalligraphy(MiniGames, '奥义 · 测试', sid, '#38bdf8');
    BOSS.render(ctx, MiniGames);
    sd.eyeCd = 1.8;
    BOSS.render(ctx, MiniGames);
  });
} catch (err) {
  styleRenderOk = false;
  console.error('流派与心眼特效渲染异常:', err);
}
ok(styleRenderOk, '三大流派 + 心眼就绪/金光爆闪/冷却弧全状态渲染无报错');

MiniGames.leave();
ok(window.IaijutsuMode === MODE_BASE && window.IaijutsuTargets === TARGETS_BASE, '离场后恢复原版实现');

console.log('');
if (fail) {
  console.error('共 ' + fail + ' 项断言失败');
  process.exit(1);
}
console.log('高难宿敌战、三大流派、选敌页与新手教程全部断言通过');
