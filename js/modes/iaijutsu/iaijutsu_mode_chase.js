// ============================================================================
// 鬼影追猎 · 横向卷轴追逐战模式控制器 (Iaijutsu Horizontal Corridor Chase Mode)
// ----------------------------------------------------------------------------
// 独立扩展模块，通过原型继承复用原版居合闪手感、皮肤、音效与准星，零修改原版 5 文件。
// 双变体：
//   - chase_escape  终点逃脱（奔袭 1500m 冲过朱红鸟居结界即胜利，可一键转入无尽）
//   - chase_endless 无尽逃亡（无终点、随距离提速与强化技能，以逃亡米数冲榜）
// 核心规则：
//   - 奔跑途中左键居合闪切中靶子 → 冷却立刻归零 + 短促微顿挫 + 持续连闪推进
//   - 居合挥空未中靶子 → 不扣命！陷入 1.35s 短暂突进冷却（脚下与准星同步显示读条）
//   - 右键近身挥砍切中附近靶子 → 同样刷新突进冷却（绝境救场）
//   - 空格【瞬步脱身】→ 清除黑雾减速 + 0.42s 无敌 + 向前瞬移突围（5.5s CD）
//   - 3 条命：仅被怪物本体或怪物技能命中扣 1 命，带受击无敌与弹开保护
// ============================================================================

var IAIJUTSU_MODE_CHASE_BASE = window.IaijutsuMode;
var IaijutsuModeChase = Object.assign({}, IAIJUTSU_MODE_CHASE_BASE);

IaijutsuModeChase.PIXELS_PER_METER = 10;
IaijutsuModeChase.ESCAPE_TARGET_M = 1500;
IaijutsuModeChase.MISS_COOLDOWN = 1.35;
IaijutsuModeChase.ESCAPE_DASH_CD = 5.5;
IaijutsuModeChase.COUNTER_MAX = 8;
IaijutsuModeChase.TYPE_WIND_BELL = 'wind_bell';

// 准星方法委托给原版单例，确保不重复绑定 DOM 事件
IaijutsuModeChase.initReticle = function () {
  return IAIJUTSU_MODE_CHASE_BASE.initReticle.apply(IAIJUTSU_MODE_CHASE_BASE, arguments);
};
IaijutsuModeChase.applyGameCursor = function () {
  return IAIJUTSU_MODE_CHASE_BASE.applyGameCursor.apply(IAIJUTSU_MODE_CHASE_BASE, arguments);
};
IaijutsuModeChase.restoreDefaultCursor = function () {
  return IAIJUTSU_MODE_CHASE_BASE.restoreDefaultCursor.apply(IAIJUTSU_MODE_CHASE_BASE, arguments);
};
IaijutsuModeChase.renderCursor = function () {
  return IAIJUTSU_MODE_CHASE_BASE.renderCursor.apply(IAIJUTSU_MODE_CHASE_BASE, arguments);
};

// --------------------------------------------------------------------------
// 构建 / 扩展横向卷轴长廊边界
// --------------------------------------------------------------------------
IaijutsuModeChase._setupCorridorRoom = function (mg, widthPx) {
  var room = mg.room;
  var m = CFG.wall.thickness;
  var x0 = room.worldX;
  var y0 = room.worldY;
  var h = CFG.H;

  room.w = widthPx;
  room.h = h;
  room.colliders = [
    { x: x0, y: y0, w: widthPx, h: m },                   // 上走廊墙
    { x: x0, y: y0 + h - m, w: widthPx, h: m },           // 下走廊墙
    { x: x0, y: y0, w: m, h: h },                         // 左侧起点墙
    { x: x0 + widthPx - m, y: y0, w: m, h: h }            // 右侧极限墙
  ];
};

// --------------------------------------------------------------------------
// 相机钩子：供 MiniGames.update / _renderHud 同步横向卷轴视野
// --------------------------------------------------------------------------
IaijutsuModeChase.getCamera = function (mg) {
  var data = mg && mg.iaijutsuData;
  if (!data || !mg.room) return null;
  return {
    x: data.camX !== undefined ? data.camX : mg.room.worldX,
    y: mg.room.worldY
  };
};

// --------------------------------------------------------------------------
// 初始化追逐战
// --------------------------------------------------------------------------
IaijutsuModeChase.init = function (mg) {
  var isEndless = (mg.modeId === 'chase_endless');
  var initialWidth = isEndless
    ? 40000
    : (this.ESCAPE_TARGET_M * this.PIXELS_PER_METER + 1600);

  this._setupCorridorRoom(mg, initialWidth);

  // 调用原版 init（此时 this.spawnDummies 已覆写为空，不会刷原地 4 靶）
  IAIJUTSU_MODE_CHASE_BASE.init.call(this, mg);

  var data = mg.iaijutsuData;
  if (!data) return;

  var rx = mg.room.worldX;
  var ry = mg.room.worldY;

  // 玩家站位靠左前方，留足右侧视野瞄准连闪
  Player.x = rx + 280;
  Player.y = ry + CFG.H / 2;
  Player.vx = 0;
  Player.vy = 0;
  Player.speedMult = 1;
  Player.skillTimers[1] = 0;
  Player.invulnTimer = 0.8;

  data.chaseMode = true;
  data.chaseVariant = isEndless ? 'endless' : 'escape';
  data.lives = 3;
  data.maxLives = 3;
  data.infiniteUlt = false;         // 追逐战封印原版自动无我，空格改【瞬步脱身】
  data.ultimateCharge = 0;
  data.dummies.length = 0;

  data.startX = Player.x;
  data.maxXReached = Player.x;
  data.distanceM = 0;
  data.targetDistanceM = this.ESCAPE_TARGET_M;
  data.finishGateX = data.startX + this.ESCAPE_TARGET_M * this.PIXELS_PER_METER;
  data.camX = rx;

  data.hitInvuln = 0;
  data.grazeCd = 0;
  data.slowTimer = 0;
  data.escapeDashCd = 0;
  data.escapeDashMaxCd = this.ESCAPE_DASH_CD;
  data.wasEscapeReady = true;
  data.escapeReadyPulse = 0;
  data.isEscapeDash = false;
  data.escapeVictory = false;
  data.victoryTimer = 0;
  data.nextMilestoneM = 500;
  data.prevPos = { x: Player.x, y: Player.y };

  // 空格【风雷缩地步】专属视觉池
  data.windStepFx = { seals: [], rings: [], afterimages: [], feathers: [], afterTimer: 0 };

  // 切靶充能反击技【回身 · 破魔斩】
  data.counterCharge = 0;
  data.counterMax = this.COUNTER_MAX;
  data.counterReadyPulse = 0;
  data.counterCount = 0;
  data.counterWaves = [];
  data.calligraphyCard = null;

  // 疾风铃靶 & 神佑鸟居加速状态
  data.windBoostTimer = 0;
  data.windBellCooldown = 3.5;
  data.toriiBoostTimer = 0;

  // 长廊动态地形：破门木障 & 神佑加速鸟居 + 碎木符纸粒子
  data.landmarks = [];
  data.debris = [];
  data.nextBarrierX = Player.x + 620;
  data.nextToriiX = Player.x + 980;
  data.barrierPromptCd = 0;

  // 生成追猎恶鬼
  data.monster = window.IaijutsuChaseMonster.create(mg, Player.x);

  // 预铺前方踏板靶位与长廊地标
  data.nextSpawnX = Player.x + 150;
  data.waveIndex = 0;
  this._ensureTargetsAhead(mg);
  this._ensureLandmarksAhead(mg);

  data.bannerTimer = 2.8;
  data.bannerText = isEndless ? '👹 永夜死逃 · 无尽追猎' : '👹 鬼影追猎 · 逃向 1500m 鸟居！';
  data.bannerSub = '左键切靶/劈门/断影刷CD · 空格风雷瞬步 · 满8能按 E/Q 破魔反击';

  if (window.SFX) {
    SFX.play('portal');
  }
};

// 阻止原版主循环在原地随机补靶
IaijutsuModeChase.spawnDummies = function () {
  return;
};

// --------------------------------------------------------------------------
// 长廊踏板靶位生成器（可连闪的节奏模板，保证永远有公平落脚点）
// --------------------------------------------------------------------------
IaijutsuModeChase._makeCorridorDummy = function (x, y, type, mg) {
  var isWindBell = (type === this.TYPE_WIND_BELL);
  var baseType = isWindBell ? window.IaijutsuTargets.TYPE_NORMAL : (type || window.IaijutsuTargets.TYPE_NORMAL);
  var dm = window.IaijutsuTargets.createDummy(mg.room, Player, {
    type: baseType,
    x: x,
    y: y,
    time: 9999
  });
  dm.time = 9999;
  dm.maxTime = 9999;
  dm.noTimeout = true;
  dm.chaseTarget = true;
  if (isWindBell) {
    dm.isWindBell = true;
    dm.r = 25;
    dm.bellPhase = Math.random() * Math.PI * 2;
  }
  if (dm.isShuttle) {
    // 走廊飞梭靶默认纵向巡逻，避免飞出走廊或打乱横向间距
    dm.axis = 'v';
    dm.range = 75 + Math.random() * 35;
    dm.speed = 95 + Math.random() * 35;
    dm.vx = 0;
    dm.vy = dm.speed * dm.dir;
  }
  return dm;
};

IaijutsuModeChase._ensureTargetsAhead = function (mg) {
  var data = mg.iaijutsuData;
  if (!data || !window.IaijutsuTargets) return;

  var ry = mg.room.worldY;
  var topY = ry + 108;
  var midY = ry + CFG.H / 2;
  var botY = ry + CFG.H - 108;
  var horizonX = data.camX + CFG.W + 480;

  // 逃脱模式终点前 80px 不再刷靶，留出鸟居冲线高光通道
  var maxAllowedX = data.chaseVariant === 'escape' ? (data.finishGateX - 90) : Infinity;

  while (data.nextSpawnX < horizonX && data.nextSpawnX < maxAllowedX) {
    var x0 = data.nextSpawnX;
    var wIdx = data.waveIndex++;
    var pattern;

    if (wIdx === 0) {
      pattern = 'intro_line';
    } else {
      var r = Math.random();
      if (r < 0.30) pattern = 'zigzag';
      else if (r < 0.56) pattern = 'fork';
      else if (r < 0.80) pattern = 'stair';
      else pattern = 'shuttle_bridge';
    }

    // 决定本波是否夹带狂暴黄金加速靶（至少间隔 12 秒）或 🎐 疾风铃靶（至少间隔 7.5 秒）
    var spawnGoldIdx = -1;
    var spawnBellIdx = -1;
    if (wIdx >= 3 && (!data.specialCooldown || data.specialCooldown <= 0) && Math.random() < 0.16) {
      spawnGoldIdx = 1;
      data.specialCooldown = 12.0;
    } else if (wIdx >= 1 && (!data.windBellCooldown || data.windBellCooldown <= 0)) {
      var needCleanse = (data.slowTimer > 0) || (data.monster && data.monster.traps && data.monster.traps.length > 0);
      if (needCleanse || Math.random() < 0.30) {
        spawnBellIdx = (pattern === 'fork') ? 2 : 1;
        data.windBellCooldown = 7.5;
      }
    }

    if (pattern === 'intro_line') {
      // 起步 3 连踏板（第 3 靶为疾风铃靶，开局即可体验顺风加速）
      data.dummies.push(this._makeCorridorDummy(x0, midY, window.IaijutsuTargets.TYPE_NORMAL, mg));
      data.dummies.push(this._makeCorridorDummy(x0 + 145, midY - 62, window.IaijutsuTargets.TYPE_NORMAL, mg));
      data.dummies.push(this._makeCorridorDummy(x0 + 290, midY + 56, this.TYPE_WIND_BELL, mg));
      data.nextSpawnX = x0 + 440;
    } else if (pattern === 'zigzag') {
      var zSign = Math.random() < 0.5 ? 1 : -1;
      var zCount = 3 + (Math.random() < 0.4 ? 1 : 0);
      for (var zi = 0; zi < zCount; zi++) {
        var zx = x0 + zi * 142;
        if (zx >= maxAllowedX) break;
        var zy = Utils.clamp(midY + zSign * (zi % 2 === 0 ? 1 : -1) * (88 + Math.random() * 34), topY, botY);
        var zType = (zi === spawnGoldIdx)
          ? window.IaijutsuTargets.TYPE_SPECIAL
          : (zi === spawnBellIdx ? this.TYPE_WIND_BELL : window.IaijutsuTargets.TYPE_NORMAL);
        data.dummies.push(this._makeCorridorDummy(zx, zy, zType, mg));
      }
      data.nextSpawnX = x0 + zCount * 142 + 45;
    } else if (pattern === 'fork') {
      data.dummies.push(this._makeCorridorDummy(x0, midY + (Math.random() - 0.5) * 30, window.IaijutsuTargets.TYPE_NORMAL, mg));
      if (x0 + 145 < maxAllowedX) {
        var topT = (spawnGoldIdx === 1) ? window.IaijutsuTargets.TYPE_SPECIAL : window.IaijutsuTargets.TYPE_NORMAL;
        var botT = (spawnBellIdx === 2) ? this.TYPE_WIND_BELL : window.IaijutsuTargets.TYPE_NORMAL;
        data.dummies.push(this._makeCorridorDummy(x0 + 145, topY + Math.random() * 24, topT, mg));
        data.dummies.push(this._makeCorridorDummy(x0 + 145, botY - Math.random() * 24, botT, mg));
      }
      if (x0 + 295 < maxAllowedX) {
        data.dummies.push(this._makeCorridorDummy(x0 + 295, midY + (Math.random() - 0.5) * 40, window.IaijutsuTargets.TYPE_NORMAL, mg));
      }
      data.nextSpawnX = x0 + 435;
    } else if (pattern === 'stair') {
      var goDown = Math.random() < 0.5;
      var ys = goDown ? [topY + 12, midY, botY - 12] : [botY - 12, midY, topY + 12];
      for (var si = 0; si < 3; si++) {
        var sx = x0 + si * 138;
        if (sx >= maxAllowedX) break;
        var sType = (si === spawnGoldIdx)
          ? window.IaijutsuTargets.TYPE_SPECIAL
          : (si === spawnBellIdx ? this.TYPE_WIND_BELL : window.IaijutsuTargets.TYPE_NORMAL);
        data.dummies.push(this._makeCorridorDummy(sx, ys[si], sType, mg));
      }
      data.nextSpawnX = x0 + 455;
    } else {
      data.dummies.push(this._makeCorridorDummy(x0, midY + (Math.random() - 0.5) * 60, window.IaijutsuTargets.TYPE_NORMAL, mg));
      if (x0 + 150 < maxAllowedX) {
        data.dummies.push(this._makeCorridorDummy(x0 + 150, midY, window.IaijutsuTargets.TYPE_SHUTTLE, mg));
      }
      if (x0 + 300 < maxAllowedX) {
        var endType = (spawnGoldIdx === 1)
          ? window.IaijutsuTargets.TYPE_SPECIAL
          : (spawnBellIdx === 1 ? this.TYPE_WIND_BELL : window.IaijutsuTargets.TYPE_NORMAL);
        data.dummies.push(this._makeCorridorDummy(x0 + 300, midY + (Math.random() < 0.5 ? -75 : 75), endType, mg));
      }
      data.nextSpawnX = x0 + 445;
    }
  }
};

// --------------------------------------------------------------------------
// 长廊动态地形生成器：「破门木障」&「神佑加速鸟居」
// --------------------------------------------------------------------------
IaijutsuModeChase._ensureLandmarksAhead = function (mg) {
  var data = mg.iaijutsuData;
  if (!data || !data.landmarks) return;

  var ry = mg.room.worldY;
  var wallH = 38;
  var usableH = CFG.H - wallH * 2;
  var horizonX = data.camX + CFG.W + 520;
  var maxBarrierX = data.chaseVariant === 'escape' ? (data.finishGateX - 280) : Infinity;
  var maxToriiX = data.chaseVariant === 'escape' ? (data.finishGateX - 360) : Infinity;

  // 若玩家瞬间远跳（例如测试跳转），把生成游标拉到视野前方避免落到身后
  if (data.nextBarrierX < data.camX - 200) data.nextBarrierX = data.camX + CFG.W + 180;
  if (data.nextToriiX < data.camX - 200) data.nextToriiX = data.camX + CFG.W + 380;

  // 1. 生成【神佑加速鸟居】
  while (data.nextToriiX < horizonX && data.nextToriiX < maxToriiX) {
    var tx = data.nextToriiX;
    var bandT = Math.floor(Math.random() * 3); // 0 上 / 1 中 / 2 下
    var gateH = 152;
    var ty = bandT === 0
      ? (ry + wallH + gateH / 2 + 16)
      : (bandT === 2 ? (ry + CFG.H - wallH - gateH / 2 - 16) : (ry + CFG.H / 2));

    data.landmarks.push({
      type: 'torii',
      x: tx,
      y: ty,
      w: 36,
      gateH: gateH,
      activated: false,
      glowT: 0
    });
    data.nextToriiX = tx + 960 + Math.floor(Math.random() * 260);
  }

  // 2. 生成【破门木障】（符咒障子木门）
  while (data.nextBarrierX < horizonX && data.nextBarrierX < maxBarrierX) {
    var bx = data.nextBarrierX;
    // 避开鸟居附近 180px，保持视觉清晰
    var nearTorii = false;
    for (var li = 0; li < data.landmarks.length; li++) {
      if (data.landmarks[li].type === 'torii' && Math.abs(data.landmarks[li].x - bx) < 180) {
        nearTorii = true;
        break;
      }
    }
    if (!nearTorii) {
      var bandB = Math.floor(Math.random() * 3); // 0 上半廊 / 1 中廊 / 2 下半廊
      var bh = Math.min(188, Math.floor(usableH * 0.42));
      var by = bandB === 0
        ? (ry + wallH + bh / 2 + 8)
        : (bandB === 2 ? (ry + CFG.H - wallH - bh / 2 - 8) : (ry + CFG.H / 2));

      data.landmarks.push({
        type: 'barrier',
        x: bx,
        y: by,
        w: 24,
        h: bh,
        broken: false,
        breakT: 0
      });
    }
    data.nextBarrierX = bx + 540 + Math.floor(Math.random() * 150);
  }
};

// --------------------------------------------------------------------------
// 挥空惩罚覆写：不扣命！仅陷入短暂冷却 (1.35s)
// --------------------------------------------------------------------------
IaijutsuModeChase.triggerDisconnect = function (x, y, reason, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  if (data.frenzyTimer > 0 || data.isEscapeDash || data.escapeVictory) return;

  // 追逐战核心规则：没有切到靶子，短暂陷入突进 CD，不扣血
  Player.skillTimers[1] = this.MISS_COOLDOWN;

  if (window.SFX) SFX.play('empty');
  if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.1);
  if (window.FX && FX.floatText) {
    FX.floatText(x, y - 34, '💨 挥空 · 冷却 ' + this.MISS_COOLDOWN.toFixed(2) + 's', '#94a3b8', 1.15);
  }
  mg.addExplosion(x, y, '#64748b', 8);
};

// --------------------------------------------------------------------------
// 切靶充能辅助：【回身 · 破魔斩】能量累积
// --------------------------------------------------------------------------
IaijutsuModeChase.addCounterCharge = function (mg, amount, srcX, srcY) {
  var data = mg && mg.iaijutsuData;
  if (!data || data.escapeVictory) return;
  var maxC = data.counterMax || this.COUNTER_MAX;
  var prev = data.counterCharge || 0;
  var next = Math.min(maxC, prev + (amount || 1));
  data.counterCharge = next;

  if (prev < maxC && next >= maxC) {
    data.counterReadyPulse = 0.78;
    if (window.SFX) {
      SFX.play('victory');
      SFX.play('switch');
    }
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 52, '🔥 破魔斩就绪！按 [E / Q] 回身重创恶鬼', '#fde047', 1.45);
    }
    mg.addExplosion(Player.x, Player.y, '#fde047', 22);
    mg.addExplosion(Player.x, Player.y, '#f43f5e', 14);
  }
};

// --------------------------------------------------------------------------
// 斩中靶子覆写：立刻刷新 CD + 反击充能 + 疾风铃靶顺风驱雾
// --------------------------------------------------------------------------
IaijutsuModeChase.onKill = function (dm, isDash, hitAngle, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
  var isSpecial = dm.isSpecial;
  var isShuttle = dm.isShuttle;
  var isWindBell = dm.isWindBell;

  mg.combo += (isShuttle ? 2 : 1);
  if (mg.combo > mg.maxCombo) {
    mg.maxCombo = mg.combo;
  }

  // 反击技充能：普通靶/疾风铃 +1，飞梭/黄金靶 +2
  this.addCounterCharge(mg, (isShuttle || isSpecial) ? 2 : 1, dm.x, dm.y);

  // 立即刷新左键突进冷却 + 给予短暂无敌帧 + 利落的 0.07s 微子弹时间（不拖慢跑酷节奏）
  Player.skillTimers[1] = 0;
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.24);
  data.bulletTime = 0.07;

  // 若向右前方居合斩中，附带一丝顺势前冲推进感
  if (isDash && Math.cos(hitAngle) > 0.2) {
    Player.x += 12;
    if (mg.room) Physics.clampToBounds(Player, mg.room);
  }

  if (window.SFX) {
    SFX.play('hit');
    SFX.play('iai');
  }

  if (isSpecial) {
    // 金色加速靶：2.6 秒疾风无 CD 狂奔 + 解除减速
    data.frenzyTimer = 2.6;
    data.frenzyMaxTimer = 2.6;
    data.slowTimer = 0;
    if (window.SFX) {
      SFX.play('victory');
      SFX.play('lightning');
    }
    if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.36);
    mg.addExplosion(dm.x, dm.y, '#facc15', 30);
    mg.addExplosion(dm.x, dm.y, '#ffffff', 16);
    if (window.FX && FX.floatText) {
      FX.floatText(dm.x, dm.y - 34, '⚡ 疾风狂暴！2.6s 无限居合加速', '#facc15', 1.45);
    }
  } else if (isWindBell) {
    // 🎐 疾风铃靶：2.3s 顺风疾行加速 + 驱散周边 280px 暗雾陷阱 + 缩减瞬步冷却 0.8s
    data.windBoostTimer = Math.max(data.windBoostTimer || 0, 2.3);
    data.slowTimer = 0;
    if (data.escapeDashCd > 0) {
      data.escapeDashCd = Math.max(0, data.escapeDashCd - 0.8);
    }
    var monster = data.monster;
    var clearedTraps = 0;
    if (monster && monster.traps && monster.traps.length) {
      for (var ti = monster.traps.length - 1; ti >= 0; ti--) {
        var tr = monster.traps[ti];
        if (Utils.dist(dm.x, dm.y, tr.x, tr.y) <= 280) {
          mg.addExplosion(tr.x, tr.y, '#5eead4', 14);
          monster.traps.splice(ti, 1);
          clearedTraps++;
        }
      }
    }
    if (monster && monster.waves && monster.waves.length) {
      for (var wi = monster.waves.length - 1; wi >= 0; wi--) {
        var wv = monster.waves[wi];
        if (Utils.dist(dm.x, dm.y, wv.x, wv.y) <= 165) {
          mg.addExplosion(wv.x, wv.y, '#5eead4', 12);
          monster.waves.splice(wi, 1);
        }
      }
    }
    if (data.windStepFx && data.windStepFx.rings) {
      data.windStepFx.rings.push({ x: dm.x, y: dm.y, rx: 16, ry: 16, maxRx: 145, maxRy: 145, life: 0.42, maxLife: 0.42, color: '#5eead4', circle: true });
    }
    if (window.SFX) {
      SFX.play('switch');
      SFX.play('parry');
    }
    mg.addExplosion(dm.x, dm.y, '#5eead4', 24);
    mg.addExplosion(dm.x, dm.y, '#ffffff', 12);
    if (window.FX && FX.floatText) {
      var bellMsg = clearedTraps > 0
        ? ('🎐 疾风铃破！2.3s 顺风加速 · 驱散 ' + clearedTraps + ' 处黑雾')
        : '🎐 疾风铃破！2.3s 顺风疾行 · 瞬步CD-0.8s';
      FX.floatText(dm.x, dm.y - 34, bellMsg, '#5eead4', 1.35);
    }
  } else if (isShuttle) {
    mg.addExplosion(dm.x, dm.y, '#38bdf8', 24);
    mg.addExplosion(dm.x, dm.y, '#c084fc', 16);
    if (window.FX && FX.floatText) {
      FX.floatText(dm.x, dm.y - 30, '🚀 飞梭瞬断！冷却刷新 +2', '#38bdf8', 1.25);
    }
  } else {
    mg.addExplosion(dm.x, dm.y, (skin && skin.primaryColor) || '#38bdf8', 16);
    if (window.FX && FX.floatText) {
      var label = isDash ? ('⚡ 刷新CD x' + mg.combo) : ('🗡️ 救场刷新CD x' + mg.combo);
      FX.floatText(dm.x, dm.y - 22, label, (skin && skin.primaryColor) || '#38bdf8', 0.95);
    }
  }
};

// --------------------------------------------------------------------------
// 迎面斩杀【夺路鬼影分身】→ 【一闪断影！】+3反击充能 + 立即刷新瞬步CD
// --------------------------------------------------------------------------
IaijutsuModeChase.onKillPhantom = function (ph, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  data.currentDashHits = (data.currentDashHits || 0) + 1;
  mg.combo += 3;
  if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;

  Player.skillTimers[1] = 0;
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.34);
  data.bulletTime = 0.09;

  // 立即刷新空格瞬步 CD 并触发就绪脉冲
  if ((data.escapeDashCd || 0) > 0) {
    data.escapeDashCd = 0;
    data.escapeReadyPulse = 0.68;
    data.wasEscapeReady = true;
  }

  this.addCounterCharge(mg, 3, ph.x, ph.y);

  data.calligraphyCard = {
    title: '一闪 · 断影',
    sub: '迎面斩碎鬼影分身 · 瞬步刷新',
    color: '#7dd3fc',
    accent: '#f43f5e',
    timer: 1.15,
    maxTimer: 1.15
  };

  if (window.SFX) {
    SFX.play('iai');
    SFX.play('parry');
    SFX.play('lightning');
  }
  if (window.Main) {
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.42);
    Main.screenFlash = 0.22;
    Main.screenFlashColor = '125,211,252';
  }
  mg.addExplosion(ph.x, ph.y, '#f43f5e', 28);
  mg.addExplosion(ph.x, ph.y, '#fde047', 20);
  mg.addExplosion(ph.x, ph.y, '#ffffff', 14);
  if (window.FX && FX.floatText) {
    FX.floatText(ph.x, ph.y - 42, '⚔️ 一闪断影！反击+3 · 瞬步就绪', '#fde047', 1.48);
  }
};

// --------------------------------------------------------------------------
// 破门木障劈碎 & 神佑鸟居穿过激活
// --------------------------------------------------------------------------
IaijutsuModeChase._breakBarrier = function (b, mg, viaEscape) {
  var data = mg.iaijutsuData;
  if (!data || b.broken) return;
  b.broken = true;
  b.breakT = 0.4;

  data.currentDashHits = (data.currentDashHits || 0) + 1;
  Player.skillTimers[1] = 0;
  mg.combo += 2;
  if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
  this.addCounterCharge(mg, 2, b.x, b.y);

  // 飞散木屑与符纸碎片
  for (var i = 0; i < 18; i++) {
    var isPaper = (i % 4 === 0);
    data.debris.push({
      x: b.x + (Math.random() - 0.5) * 14,
      y: b.y + (Math.random() - 0.5) * b.h * 0.85,
      vx: 140 + Math.random() * 280,
      vy: (Math.random() - 0.5) * 260,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 16,
      w: isPaper ? 10 : (8 + Math.random() * 14),
      h: isPaper ? 16 : (3 + Math.random() * 4),
      color: isPaper ? '#fef3c7' : (i % 2 === 0 ? '#b45309' : '#78350f'),
      isPaper: isPaper,
      life: 0.55 + Math.random() * 0.35,
      maxLife: 0.9
    });
  }

  if (window.SFX) {
    SFX.play('hit');
    SFX.play('iai');
  }
  if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.24);
  mg.addExplosion(b.x, b.y, '#fbbf24', 18);
  if (window.FX && FX.floatText) {
    FX.floatText(b.x, b.y - 36, viaEscape ? '💨 穿障破门！反击+2' : '🚪 破障一闪！CD刷新 · 反击+2', '#fbbf24', 1.32);
  }
};

IaijutsuModeChase._activateTorii = function (t, mg) {
  var data = mg.iaijutsuData;
  if (!data || t.activated) return;
  t.activated = true;
  t.glowT = 0.95;

  data.toriiBoostTimer = Math.max(data.toriiBoostTimer || 0, 2.5);
  data.slowTimer = 0;
  mg.combo += 2;
  if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
  this.addCounterCharge(mg, 1, t.x, t.y);

  // 驱散附近暗雾陷阱并微退迫近的噬影鬼
  var monster = data.monster;
  if (monster) {
    if (monster.traps && monster.traps.length) {
      for (var ti = monster.traps.length - 1; ti >= 0; ti--) {
        if (Utils.dist(t.x, t.y, monster.traps[ti].x, monster.traps[ti].y) <= 250) {
          mg.addExplosion(monster.traps[ti].x, monster.traps[ti].y, '#fde047', 12);
          monster.traps.splice(ti, 1);
        }
      }
    }
    if (Player.x - monster.x < 360 && !monster.banished) {
      monster.x = Math.max(mg.room.worldX + 56, monster.x - 68);
      mg.addExplosion(monster.x, monster.y, '#fde047', 16);
    }
  }

  if (data.windStepFx && data.windStepFx.rings) {
    data.windStepFx.rings.push({ x: t.x, y: t.y, rx: 18, ry: 68, maxRx: 90, maxRy: 165, life: 0.45, maxLife: 0.45, color: '#fde047' });
  }
  if (window.SFX) {
    SFX.play('portal');
    SFX.play('victory');
  }
  if (window.Main) {
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.2);
  }
  mg.addExplosion(t.x, t.y, '#fde047', 26);
  mg.addExplosion(t.x, t.y, '#f87171', 14);
  if (window.FX && FX.floatText) {
    FX.floatText(t.x, t.y - 48, '⛩️ 神佑加速！2.5s 疾行净魔 · 反击+1', '#fde047', 1.4);
  }
};

// --------------------------------------------------------------------------
// 切靶充能反击技【回身 · 破魔斩】（E / Q 键）：轰出炽金绯红回身剑气重创噬影鬼
// --------------------------------------------------------------------------
IaijutsuModeChase.triggerCounterSlash = function (mg) {
  var data = mg.iaijutsuData;
  if (!data || data.escapeVictory) return false;

  var cur = data.counterCharge || 0;
  var maxC = data.counterMax || this.COUNTER_MAX;
  if (cur < maxC) {
    if (window.SFX) SFX.play('empty');
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 40, '🔥 破魔斩充能中 (' + cur + '/' + maxC + ')', '#fbbf24', 1.12);
    }
    return false;
  }

  data.counterCharge = 0;
  data.counterCount = (data.counterCount || 0) + 1;
  data.slowTimer = 0;
  data.windBoostTimer = Math.max(data.windBoostTimer || 0, 1.3);
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.55);
  data.bulletTime = 0.11;

  mg.combo += 5;
  if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;

  var ry = mg.room.worldY;
  var waveMinX = data.monster
    ? Math.min((data.camX || 0) - 320, data.monster.x - 120)
    : ((data.camX || 0) - 320);

  var waveObj = {
    x: Player.x + 18,
    y: ry + CFG.H / 2,
    originX: Player.x + 18,
    vx: -1620,
    halfH: CFG.H * 0.44,
    minX: Math.max(mg.room.worldX, waveMinX),
    hitMonster: false,
    life: 0.85,
    maxLife: 0.85
  };
  data.counterWaves.push(waveObj);

  // 若噬影鬼已在近身 150px 内，立刻命中防擦肩而过
  if (data.monster && !data.monster.banished && Math.abs(data.monster.x - Player.x) <= 150) {
    waveObj.hitMonster = true;
    window.IaijutsuChaseMonster.applyCounterHit(mg, 295, 1.85);
  }

  data.calligraphyCard = {
    title: '回身 · 破魔斩',
    sub: '击退恶鬼 · 破招硬直 · 净空追击',
    color: '#fde047',
    accent: '#f43f5e',
    timer: 1.35,
    maxTimer: 1.35
  };

  if (window.SFX) {
    SFX.play('iai');
    SFX.play('lightning');
    SFX.play('victory');
  }
  if (window.Main) {
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.52);
    Main.screenFlash = 0.28;
    Main.screenFlashColor = '251,146,60';
  }
  mg.addExplosion(Player.x, Player.y, '#fde047', 28);
  mg.addExplosion(Player.x, Player.y, '#f43f5e', 20);
  if (window.FX && FX.floatText) {
    FX.floatText(Player.x, Player.y - 46, '🔥 回身 · 破魔斩！+5连斩', '#fde047', 1.48);
  }
  return true;
};

// --------------------------------------------------------------------------
// 空格键【风雷缩地步 · 瞬步脱身】：专属青翠风符特效 + 清除减速 + 无敌突围
// --------------------------------------------------------------------------
IaijutsuModeChase.triggerEscapeStep = function (mg) {
  var data = mg.iaijutsuData;
  if (!data || data.escapeVictory) return;

  if ((data.escapeDashCd || 0) > 0) {
    if (window.SFX) SFX.play('empty');
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 38, '💨 瞬步冷却中 ' + data.escapeDashCd.toFixed(1) + 's', '#94a3b8', 1.1);
    }
    return;
  }

  var startX = Player.x;
  var startY = Player.y;

  data.escapeDashCd = data.escapeDashMaxCd || this.ESCAPE_DASH_CD;
  data.wasEscapeReady = false;
  data.slowTimer = 0; // 立刻解除黑雾减速
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.48);
  Player.dashAngle = 0; // 笔直向右突围
  Player.dashT = 0.17;
  // 不触发 Player.swingT / FX.dash，彻底与左键居合刀光视觉区分！
  data.isDashing = false;
  data.isEscapeDash = true;

  // 专属【风雷缩地步】青翠风符阵、音爆风环、青风残影、风羽粒子
  var wfx = data.windStepFx;
  if (wfx) {
    wfx.afterTimer = 0;
    wfx.seals.push({ x: startX, y: startY, life: 0.56, maxLife: 0.56, rot: 0 });
    wfx.rings.push({ x: startX + 8, y: startY, rx: 8, ry: 22, maxRx: 32, maxRy: 64, life: 0.34, maxLife: 0.34, color: '#34d399' });
    wfx.rings.push({ x: startX + 38, y: startY, rx: 6, ry: 18, maxRx: 26, maxRy: 52, life: 0.30, maxLife: 0.30, color: '#a7f3d0' });
    wfx.afterimages.push({ x: startX, y: startY, life: 0.34, maxLife: 0.34 });
    for (var fi = 0; fi < 14; fi++) {
      wfx.feathers.push({
        x: startX + (Math.random() - 0.3) * 36,
        y: startY + (Math.random() - 0.5) * 44,
        vx: -120 - Math.random() * 190,
        vy: (Math.random() - 0.5) * 110,
        rot: (Math.random() - 0.5) * 0.9,
        len: 10 + Math.random() * 12,
        color: fi % 3 === 0 ? '#ecfdf5' : (fi % 2 === 0 ? '#34d399' : '#2dd4bf'),
        life: 0.34 + Math.random() * 0.2,
        maxLife: 0.54
      });
    }
  }

  if (window.SFX) {
    SFX.play('dash');
    SFX.play('switch');
  }
  if (window.FX && FX.floatText) {
    FX.floatText(startX, startY - 42, '🍃 风雷瞬步！无敌突围', '#6ee7b7', 1.35);
  }
  mg.addExplosion(startX, startY, '#34d399', 18);
  mg.addExplosion(startX, startY, '#a7f3d0', 10);

  // 震散身旁 155px 内的飞行斩波
  var monster = data.monster;
  if (monster && monster.waves && monster.waves.length) {
    for (var i = monster.waves.length - 1; i >= 0; i--) {
      var w = monster.waves[i];
      if (Utils.dist(w.x, w.y, startX, startY) <= 155) {
        mg.addExplosion(w.x, w.y, '#34d399', 12);
        monster.waves.splice(i, 1);
      }
    }
  }
};

// --------------------------------------------------------------------------
// 帧更新
// --------------------------------------------------------------------------
IaijutsuModeChase.update = function (dt, mouseWorld, input, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  // 打开工坊（按 B）时暂停
  if (window.UI && (
    (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
    (UI.isIaiShopOpen && UI.isIaiShopOpen())
  )) {
    return;
  }

  // 1. 逃脱胜利演出期间
  if (data.escapeVictory) {
    data.victoryTimer -= dt;
    window.IaijutsuChaseMonster.update(dt, mg);
    if (data.victoryTimer <= 0 && !mg.finished) {
      mg.finishGame('win', '⛩️ 成功冲过鸟居结界！用时 ' + (data.clearTime || mg.timer).toFixed(1) + 's · 最高 ' + mg.maxCombo + ' 连斩');
    }
    return;
  }

  // 2. 冷却与状态计时
  if (data.hitInvuln > 0) data.hitInvuln = Math.max(0, data.hitInvuln - dt);
  var prevEscCd = data.escapeDashCd || 0;
  if (data.escapeDashCd > 0) data.escapeDashCd = Math.max(0, data.escapeDashCd - dt);
  if (prevEscCd > 0 && data.escapeDashCd <= 0) {
    data.escapeReadyPulse = 0.68;
    data.wasEscapeReady = true;
    if (window.SFX) SFX.play('switch');
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 44, '🍃 瞬步就绪 [空格]', '#6ee7b7', 1.2);
    }
  }
  if (data.escapeReadyPulse > 0) data.escapeReadyPulse = Math.max(0, data.escapeReadyPulse - dt);
  if (data.counterReadyPulse > 0) data.counterReadyPulse = Math.max(0, data.counterReadyPulse - dt);
  if (data.slowTimer > 0) data.slowTimer = Math.max(0, data.slowTimer - dt);
  if (data.windBoostTimer > 0) data.windBoostTimer = Math.max(0, data.windBoostTimer - dt);
  if (data.toriiBoostTimer > 0) data.toriiBoostTimer = Math.max(0, data.toriiBoostTimer - dt);
  if (data.windBellCooldown > 0) data.windBellCooldown = Math.max(0, data.windBellCooldown - dt);
  if (data.barrierPromptCd > 0) data.barrierPromptCd = Math.max(0, data.barrierPromptCd - dt);
  if (data.calligraphyCard) {
    data.calligraphyCard.timer -= dt;
    if (data.calligraphyCard.timer <= 0) data.calligraphyCard = null;
  }

  // 风雷缩地步持续采样青翠残影与音爆环
  if (data.isEscapeDash && Player.dashT > 0 && data.windStepFx) {
    data.windStepFx.afterTimer += dt;
    if (data.windStepFx.afterTimer >= 0.028) {
      data.windStepFx.afterTimer = 0;
      data.windStepFx.afterimages.push({ x: Player.x, y: Player.y, life: 0.30, maxLife: 0.30 });
      data.windStepFx.rings.push({ x: Player.x, y: Player.y, rx: 6, ry: 18, maxRx: 24, maxRy: 48, life: 0.24, maxLife: 0.24, color: '#34d399' });
    }
  }
  if (data.isEscapeDash && Player.dashT <= 0) data.isEscapeDash = false;

  // 根据神佑鸟居 / 疾风铃 / 狂暴 / 黑雾减速动态同步步行速度倍率
  if (data.toriiBoostTimer > 0) {
    Player.speedMult = 1.38;
  } else if (data.windBoostTimer > 0) {
    Player.speedMult = 1.34;
  } else if (data.frenzyTimer > 0) {
    Player.speedMult = 1.28;
  } else if (data.slowTimer > 0) {
    Player.speedMult = 0.45;
  } else {
    Player.speedMult = 1.0;
  }

  // 3. 无尽模式动态延长走廊，防止碰到右侧尽头
  if (data.chaseVariant === 'endless' && Player.x > mg.room.worldX + mg.room.w - 3200) {
    this._setupCorridorRoom(mg, mg.room.w + 20000);
  }

  // 4. 拦截空格 / E / Q / T / U，把空格交给【风雷瞬步】，把 E/Q 交给【回身·破魔斩】
  var safeInput = input;
  if (input.spacePressed) {
    this.triggerEscapeStep(mg);
    safeInput = Object.assign({}, input);
    safeInput.spacePressed = false;
  }
  var triggerCounter = !!(input.ePressed || (input.keysJustPressed && (input.keysJustPressed['KeyE'] || input.keysJustPressed['KeyQ'])));
  if (triggerCounter) {
    this.triggerCounterSlash(mg);
    if (safeInput === input) safeInput = Object.assign({}, input);
    safeInput.ePressed = false;
    if (input.keysJustPressed) {
      safeInput.keysJustPressed = Object.assign({}, input.keysJustPressed);
      delete safeInput.keysJustPressed['KeyE'];
      delete safeInput.keysJustPressed['KeyQ'];
    }
  }
  if (input.keysJustPressed && (input.keysJustPressed['KeyT'] || input.keysJustPressed['KeyU'])) {
    if (safeInput === input) safeInput = Object.assign({}, input);
    safeInput.keysJustPressed = Object.assign({}, safeInput.keysJustPressed || input.keysJustPressed);
    delete safeInput.keysJustPressed['KeyT'];
    delete safeInput.keysJustPressed['KeyU'];
  }

  // 4.5 在原版冲刺结束判定前，先结算【破门木障】【神佑鸟居】【迎面斩杀鬼影分身】
  // 确保单劈木障或单斩鬼影分身也会计入 currentDashHits，绝不误判挥空！
  var segPrevX = data.prevPos ? data.prevPos.x : Player.x;
  var segPrevY = data.prevPos ? data.prevPos.y : Player.y;
  this._updateLandmarksAndPhantomSlash(dt, segPrevX, segPrevY, safeInput, mg);

  // 防止点击顶部无CD按钮区域误触发原版 toggleInfiniteUlt
  var mLogical = (window.Input && Input.logicalPos) ? Input.logicalPos() : { x: 0, y: 0 };
  if ((safeInput.leftPressed || safeInput.leftClick) && mLogical.y <= 64) {
    var origToggle = this.toggleInfiniteUlt;
    this.toggleInfiniteUlt = function () {};
    IAIJUTSU_MODE_CHASE_BASE.update.call(this, dt, mouseWorld, safeInput, mg);
    this.toggleInfiniteUlt = origToggle;
  } else {
    IAIJUTSU_MODE_CHASE_BASE.update.call(this, dt, mouseWorld, safeInput, mg);
  }

  // 更新回身破魔斩剑气波、风雷缩地步特效池、木障碎屑
  this._updateChaseFx(dt, mg);

  // 5. 推进距离统计
  if (Player.x > data.maxXReached) {
    data.maxXReached = Player.x;
  }
  data.distanceM = Math.max(0, (data.maxXReached - data.startX) / this.PIXELS_PER_METER);

  // 无尽模式每 500m 播报里程碑
  if (data.chaseVariant === 'endless' && data.distanceM >= data.nextMilestoneM) {
    data.bannerTimer = 2.4;
    data.bannerText = '🔥 逃亡突破 ' + data.nextMilestoneM + 'm · 噬影鬼加速！';
    data.nextMilestoneM += 500;
    if (window.SFX) SFX.play('victory');
  }

  // 6. 横向卷轴相机平滑超前跟随（把玩家放在视口约 35% 处，右侧留足 65% 瞄准视野）
  var targetCamX = Math.max(mg.room.worldX, Player.x - CFG.W * 0.35);
  if (data.chaseVariant === 'escape') {
    var maxEscapeCamX = Math.max(mg.room.worldX, data.finishGateX - CFG.W * 0.68);
    targetCamX = Math.min(targetCamX, maxEscapeCamX);
  }
  data.camX += (targetCamX - data.camX) * Math.min(1, dt * 11);

  // 7. 回收滚出左侧视野的旧靶子与地标（不扣命），并在前方持续铺设
  for (var di = data.dummies.length - 1; di >= 0; di--) {
    var d = data.dummies[di];
    d.time = 9999; // 永不超时扣命
    if (d.x < data.camX - 160) {
      data.dummies.splice(di, 1);
    }
  }
  for (var li = data.landmarks.length - 1; li >= 0; li--) {
    if (data.landmarks[li].x < data.camX - 220) {
      data.landmarks.splice(li, 1);
    }
  }
  this._ensureTargetsAhead(mg);
  this._ensureLandmarksAhead(mg);

  // 8. 更新追猎恶鬼与七大封路技能
  window.IaijutsuChaseMonster.update(dt, mg);

  // 9. 逃脱模式冲线判定（1500m 朱红鸟居）
  if (data.chaseVariant === 'escape' && Player.x >= data.finishGateX && !data.escapeVictory) {
    data.escapeVictory = true;
    data.victoryTimer = 1.05;
    data.clearTime = mg.timer;
    data.distanceM = data.targetDistanceM;
    Player.invulnTimer = 3.0;
    Player.speedMult = 1.0;

    if (window.SFX) {
      SFX.play('victory');
      SFX.play('lightning');
    }
    if (window.Main) {
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);
      Main.screenFlash = 0.45;
      Main.screenFlashColor = '250,204,21';
    }
    mg.addExplosion(data.finishGateX, Player.y, '#fde047', 42);
    mg.addExplosion(data.finishGateX, Player.y, '#38bdf8', 24);
    data.bannerTimer = 3.0;
    data.bannerText = '⛩️ 结界突破 · 成功逃脱！';
  }
};

// --------------------------------------------------------------------------
// 地标（破门木障 / 神佑鸟居）与迎面斩杀鬼影分身检测
// --------------------------------------------------------------------------
IaijutsuModeChase._updateLandmarksAndPhantomSlash = function (dt, prevX, prevY, input, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  var isSlashingDash = (Player.dashT > 0 || data.isDashing);
  var isRightSwing = !!(input && (input.rightPressed || input.rightClick || (input.keysJustPressed && input.keysJustPressed['KeyK']))) && Player.dashT <= 0 && Player.fireTimer <= 0;
  var monster = data.monster;

  // 1. 迎面斩杀【夺路鬼影分身】（支持左键居合突进穿透 或 右键近身挥砍）
  if (monster && monster.phantoms && monster.phantoms.length) {
    for (var pi = monster.phantoms.length - 1; pi >= 0; pi--) {
      var ph = monster.phantoms[pi];
      if (ph.phase !== 'telegraph' && ph.phase !== 'dash') continue;
      var hitByDash = data.isDashing && Player.dashT > 0 && (
        Physics.checkSegmentOverlap(prevX, prevY, Player.x, Player.y, ph, 36) ||
        Utils.dist(Player.x, Player.y, ph.x, ph.y) <= ph.r + 34
      );
      var hitByMelee = isRightSwing && Utils.dist(Player.x, Player.y, ph.x, ph.y) <= ph.r + 86;
      if (hitByDash || hitByMelee) {
        monster.phantoms.splice(pi, 1);
        this.onKillPhantom(ph, mg);
      }
    }
  }

  // 2. 长廊动态地标交互
  if (!data.landmarks || !data.landmarks.length) return;
  var pr = Player.radius || 16;

  for (var i = 0; i < data.landmarks.length; i++) {
    var lm = data.landmarks[i];
    if (lm.type === 'torii') {
      if (lm.glowT > 0) lm.glowT = Math.max(0, lm.glowT - dt);
      if (!lm.activated) {
        var crossedX = (Math.abs(Player.x - lm.x) <= 34) || (prevX <= lm.x && Player.x >= lm.x);
        var insideY = Math.abs(Player.y - lm.y) <= lm.gateH / 2 + 16;
        if (crossedX && insideY) {
          this._activateTorii(lm, mg);
        }
      }
    } else if (lm.type === 'barrier') {
      if (lm.breakT > 0) lm.breakT = Math.max(0, lm.breakT - dt);
      if (lm.broken) continue;

      var topB = lm.y - lm.h / 2;
      var botB = lm.y + lm.h / 2;
      var minSegX = Math.min(prevX, Player.x) - pr - 16;
      var maxSegX = Math.max(prevX, Player.x) + pr + 16;
      var minSegY = Math.min(prevY, Player.y) - pr - 10;
      var maxSegY = Math.max(prevY, Player.y) + pr + 10;

      // 居合突进 / 风雷瞬步 / 右键挥砍直接劈碎木障！
      var slashTouch = isSlashingDash && maxSegX >= lm.x - lm.w / 2 && minSegX <= lm.x + lm.w / 2 && maxSegY >= topB && minSegY <= botB;
      var meleeTouch = isRightSwing && Math.abs(Player.x - lm.x) <= 84 && Player.y >= topB - 24 && Player.y <= botB + 24;
      if (slashTouch || meleeTouch) {
        this._breakBarrier(lm, mg, !!data.isEscapeDash);
        continue;
      }

      // 普通步行贴脸阻挡（不强制卡死在远跳中，仅当从木障近侧步入时推回）
      if (Math.abs(Player.x - prevX) < 40 &&
          Player.y >= topB - pr + 4 && Player.y <= botB + pr - 4 &&
          Player.x + pr > lm.x - lm.w / 2 && prevX <= lm.x) {
        Player.x = lm.x - lm.w / 2 - pr;
        if (data.barrierPromptCd <= 0) {
          data.barrierPromptCd = 0.65;
          if (window.FX && FX.floatText) {
            FX.floatText(lm.x, lm.y - lm.h / 2 - 14, '⚔️ 左键居合劈开木障！', '#fde68a', 1.15);
          }
        }
      }

      // 噬影鬼撞破未被劈开的木障时短暂减速
      if (monster && !monster.banished && monster.x + monster.r >= lm.x - lm.w / 2 && monster.x - monster.r <= lm.x + lm.w / 2 &&
          monster.y >= topB - 20 && monster.y <= botB + 20) {
        lm.broken = true;
        lm.breakT = 0.35;
        monster.barrierSlowT = Math.max(monster.barrierSlowT || 0, 0.45);
        mg.addExplosion(lm.x, lm.y, '#b45309', 14);
      }
    }
  }
};

// --------------------------------------------------------------------------
// 回身破魔斩剑气波 / 风雷缩地步特效 / 碎木粒子更新
// --------------------------------------------------------------------------
IaijutsuModeChase._updateChaseFx = function (dt, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  var monster = data.monster;

  // 1. 回身破魔斩剑气波（向左横扫整条长廊）
  for (var wi = data.counterWaves.length - 1; wi >= 0; wi--) {
    var cw = data.counterWaves[wi];
    var prevWaveX = cw.x;
    cw.x += cw.vx * dt;
    cw.life -= dt;

    // 剑气余烬粒子
    if (Math.random() < 0.85) {
      mg.particles.push({
        x: cw.x + 18,
        y: cw.y + (Math.random() - 0.5) * cw.halfH * 1.7,
        vx: 90 + Math.random() * 80,
        vy: (Math.random() - 0.5) * 60,
        size: 3.5 + Math.random() * 3,
        color: Math.random() < 0.55 ? '#fde047' : '#f43f5e',
        life: 0.24,
        maxLife: 0.24
      });
    }

    if (monster && !monster.banished) {
      // 命中噬影鬼本体
      if (!cw.hitMonster && monster.x >= cw.x - 45 && monster.x <= prevWaveX + 45) {
        cw.hitMonster = true;
        window.IaijutsuChaseMonster.applyCounterHit(mg, 295, 1.85);
      }
      // 粉碎沿途所有封路斩波
      for (var i1 = monster.waves.length - 1; i1 >= 0; i1--) {
        if (monster.waves[i1].x >= cw.x - 45 && monster.waves[i1].x <= prevWaveX + 60) {
          mg.addExplosion(monster.waves[i1].x, monster.waves[i1].y, '#fde047', 12);
          monster.waves.splice(i1, 1);
        }
      }
      // 净化沿途黑雾陷阱
      for (var i2 = monster.traps.length - 1; i2 >= 0; i2--) {
        if (monster.traps[i2].x >= cw.x - 50 && monster.traps[i2].x <= prevWaveX + 60) {
          mg.addExplosion(monster.traps[i2].x, monster.traps[i2].y, '#fde047', 12);
          monster.traps.splice(i2, 1);
        }
      }
      // 斩灭沿途鬼影分身
      for (var i3 = monster.phantoms.length - 1; i3 >= 0; i3--) {
        if (monster.phantoms[i3].x >= cw.x - 50 && monster.phantoms[i3].x <= prevWaveX + 60) {
          mg.addExplosion(monster.phantoms[i3].x, monster.phantoms[i3].y, '#fde047', 16);
          monster.phantoms.splice(i3, 1);
        }
      }
      // 逼退沿途墙隙鬼手
      for (var i4 = monster.claws.length - 1; i4 >= 0; i4--) {
        var cl = monster.claws[i4];
        if (cl.x >= cw.x - 40 && cl.x <= prevWaveX + 40 && cl.phase !== 'retract') {
          cl.phase = 'retract';
          mg.addExplosion(cl.x, cl.anchorY + cl.dir * cl.reach * 0.5, '#fde047', 12);
        }
      }
    }

    if (cw.life <= 0 || cw.x <= cw.minX) {
      data.counterWaves.splice(wi, 1);
    }
  }

  // 2. 风雷缩地步特效池
  var wfx = data.windStepFx;
  if (wfx) {
    for (var si = wfx.seals.length - 1; si >= 0; si--) {
      wfx.seals[si].life -= dt;
      wfx.seals[si].rot += dt * 7.5;
      if (wfx.seals[si].life <= 0) wfx.seals.splice(si, 1);
    }
    for (var ri = wfx.rings.length - 1; ri >= 0; ri--) {
      wfx.rings[ri].life -= dt;
      if (wfx.rings[ri].life <= 0) wfx.rings.splice(ri, 1);
    }
    for (var ai = wfx.afterimages.length - 1; ai >= 0; ai--) {
      wfx.afterimages[ai].life -= dt;
      if (wfx.afterimages[ai].life <= 0) wfx.afterimages.splice(ai, 1);
    }
    for (var fi = wfx.feathers.length - 1; fi >= 0; fi--) {
      var f = wfx.feathers[fi];
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.pow(0.25, dt);
      f.rot += dt * 4;
      if (f.life <= 0) wfx.feathers.splice(fi, 1);
    }
  }

  // 3. 破门木屑与符纸碎片
  if (data.debris && data.debris.length) {
    for (var dbi = data.debris.length - 1; dbi >= 0; dbi--) {
      var db = data.debris[dbi];
      db.life -= dt;
      db.x += db.vx * dt;
      db.y += db.vy * dt;
      db.vy += (db.isPaper ? 60 : 320) * dt;
      db.rot += db.vrot * dt;
      if (db.life <= 0) data.debris.splice(dbi, 1);
    }
  }
};

// --------------------------------------------------------------------------
// 横向视差暗夜长廊 + 鸟居终点门 + 技能预警 + 靶位 + 怪物渲染
// --------------------------------------------------------------------------
IaijutsuModeChase.render = function (ctx, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : { primaryColor: '#38bdf8' };
  var camX = data.camX || mg.room.worldX;
  var ry = mg.room.worldY;
  var rw = CFG.W;
  var rh = CFG.H;

  // 1. 暗夜百鬼长廊视差背景（60% 低饱和深靛基底 + 30% 结构木柱/石板）
  this._renderCorridorBackground(ctx, camX, ry, rw, rh, mg, data);

  // 2. 逃脱模式朱红鸟居终点结界门
  if (data.chaseVariant === 'escape' && data.finishGateX <= camX + rw + 220) {
    this._renderFinishGate(ctx, data.finishGateX, ry, rh, mg.timer);
  }

  // 3. 地面层：怪物封路预警轨道、斩波警示线、缚足黑雾陷阱
  window.IaijutsuChaseMonster.renderGround(ctx, mg);

  // 3.5 长廊动态地标：神佑加速鸟居 & 破门木障 + 木屑碎片
  this._renderLandmarks(ctx, data, camX, rw, mg.timer);
  this._renderDebris(ctx, data);

  // 4. 狂暴 / 神佑 / 疾风顺行光环 + 空格风雷缩地步专属特效
  if (data.frenzyTimer > 0 && window.IaijutsuFX && window.IaijutsuFX.renderFrenzyAura) {
    ctx.save();
    var faR = 44 + Math.sin(mg.timer * 14) * 5;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, faR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  this._renderWindStepFx(ctx, data);

  // 5. 沿途踏板靶位（含自定义青玉【疾风铃靶】）
  for (var i = 0; i < data.dummies.length; i++) {
    var dm = data.dummies[i];
    if (dm.x < camX - 60 || dm.x > camX + rw + 80) continue;
    if (dm.isWindBell) {
      this._drawWindBellDummy(ctx, dm, mg.timer);
    } else {
      window.IaijutsuTargets.drawDummy(ctx, dm, skin);
    }
  }

  // 6. 玩家周身状态光环（瞬步就绪风羽环 / 破魔斩就绪金绯印 / 挥空冷却环 / 减速紫环）
  this._renderPlayerChaseStatus(ctx, data, mg.timer);

  // 7. 追猎恶鬼本体、飞行斩波与左侧压迫提示
  window.IaijutsuChaseMonster.render(ctx, mg);

  // 7.5 【回身 · 破魔斩】横贯长廊剑气波
  this._renderCounterWaves(ctx, data);

  // 8. 工坊打开时的柔和暂停遮罩
  if (window.UI && (
    (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
    (UI.isIaiShopOpen && UI.isIaiShopOpen())
  )) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 29, 0.45)';
    ctx.fillRect(camX, ry, rw, rh);
    ctx.restore();
  }

  // 9. 准星维护
  this.renderCursor(ctx, mg);
};

IaijutsuModeChase._renderCorridorBackground = function (ctx, camX, ry, rw, rh, mg, data) {
  ctx.save();
  var phase = (data.monster && data.monster.phase) ? data.monster.phase : 1;

  // 随三阶段递进变色的暗夜长廊天空（一阶深靛 -> 二阶血月绯红 -> 三阶百鬼紫红深渊）
  var skyGrad = ctx.createLinearGradient(camX, ry, camX, ry + rh);
  if (phase >= 3) {
    skyGrad.addColorStop(0, '#16061a');
    skyGrad.addColorStop(0.5, '#2b0b1d');
    skyGrad.addColorStop(1, '#120512');
  } else if (phase === 2) {
    skyGrad.addColorStop(0, '#140814');
    skyGrad.addColorStop(0.5, '#210e1f');
    skyGrad.addColorStop(1, '#0d0914');
  } else {
    skyGrad.addColorStop(0, '#070b14');
    skyGrad.addColorStop(0.5, '#0e1629');
    skyGrad.addColorStop(1, '#080c17');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(camX - 10, ry, rw + 20, rh);

  // 远景绯月（二阶起暴涨为血月！）
  var moonX = camX + rw * 0.78 - ((camX - mg.room.worldX) * 0.025) % 240;
  var moonY = ry + 122;
  var moonR = phase >= 3 ? 115 : (phase === 2 ? 100 : 82);
  var moonGrad = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, moonR);
  if (phase >= 2) {
    moonGrad.addColorStop(0, 'rgba(254, 202, 202, 0.52)');
    moonGrad.addColorStop(0.42, 'rgba(239, 68, 68, 0.34)');
    moonGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
  } else {
    moonGrad.addColorStop(0, 'rgba(254, 226, 226, 0.28)');
    moonGrad.addColorStop(0.45, 'rgba(244, 63, 94, 0.14)');
    moonGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
  }
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // 远景山影（0.25x 视差）
  var farShift = (camX - mg.room.worldX) * 0.25;
  var farStep = 320;
  var firstFar = Math.floor(farShift / farStep) * farStep;
  ctx.fillStyle = phase >= 2 ? 'rgba(28, 10, 24, 0.72)' : 'rgba(15, 23, 42, 0.65)';
  for (var fx = firstFar - farStep; fx < farShift + rw + farStep; fx += farStep) {
    var drawX = camX + (fx - farShift);
    ctx.beginPath();
    ctx.moveTo(drawX, ry + rh);
    ctx.lineTo(drawX + 90, ry + 185);
    ctx.lineTo(drawX + 210, ry + 235);
    ctx.lineTo(drawX + 320, ry + rh);
    ctx.closePath();
    ctx.fill();
  }

  // 二阶+ 飘浮血色余烬火星（无状态纯函数式渲染，零 GC 开销）
  if (phase >= 2) {
    var emberCount = phase >= 3 ? 28 : 14;
    for (var ei = 0; ei < emberCount; ei++) {
      var ex = camX + rw - ((mg.timer * (220 + (ei % 5) * 45) + ei * 137) % (rw + 100));
      var ey = ry + 50 + ((ei * 79 + Math.sin(mg.timer * 3 + ei) * 28) % (rh - 100));
      ctx.fillStyle = (ei % 3 === 0) ? 'rgba(253, 224, 71, 0.72)' : 'rgba(248, 113, 113, 0.65)';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.8 + (ei % 3) * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 长廊上下石板边界与木梁结构
  var wallH = 38;
  ctx.fillStyle = phase >= 2 ? '#1a0e19' : '#111827';
  ctx.fillRect(camX - 10, ry, rw + 20, wallH);
  ctx.fillRect(camX - 10, ry + rh - wallH, rw + 20, wallH);

  ctx.strokeStyle = phase >= 3 ? 'rgba(244, 63, 94, 0.62)' : (phase === 2 ? 'rgba(249, 115, 22, 0.5)' : 'rgba(56, 189, 248, 0.35)');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(camX - 10, ry + wallH); ctx.lineTo(camX + rw + 10, ry + wallH);
  ctx.moveTo(camX - 10, ry + rh - wallH); ctx.lineTo(camX + rw + 10, ry + rh - wallH);
  ctx.stroke();

  // 中景朱红木柱与灯笼（每隔 240px）
  var pillarStep = 240;
  var startPillar = Math.floor((camX - 80) / pillarStep) * pillarStep;
  for (var px = startPillar; px < camX + rw + 120; px += pillarStep) {
    // 柱子纵线淡影
    ctx.fillStyle = 'rgba(153, 27, 27, 0.14)';
    ctx.fillRect(px - 8, ry + wallH, 16, rh - wallH * 2);

    // 上下柱基
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(px - 10, ry + wallH - 12, 20, 14);
    ctx.fillRect(px - 10, ry + rh - wallH - 2, 20, 14);

    // 暖光灯笼微芒
    var glow = 0.22 + 0.06 * Math.sin(mg.timer * 3 + px * 0.01);
    ctx.fillStyle = 'rgba(251, 191, 36, ' + glow.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(px, ry + wallH + 14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(px, ry + wallH + 14, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 走廊地面石板纹理与三车道淡参考线
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
  ctx.lineWidth = 1;
  var tileStep = 80;
  var firstTile = Math.floor(camX / tileStep) * tileStep;
  for (var gx = firstTile; gx < camX + rw + tileStep; gx += tileStep) {
    ctx.beginPath();
    ctx.moveTo(gx, ry + wallH);
    ctx.lineTo(gx, ry + rh - wallH);
    ctx.stroke();
  }
  ctx.setLineDash([12, 16]);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
  ctx.beginPath();
  ctx.moveTo(camX, ry + rh * 0.36); ctx.lineTo(camX + rw, ry + rh * 0.36);
  ctx.moveTo(camX, ry + rh * 0.64); ctx.lineTo(camX + rw, ry + rh * 0.64);
  ctx.stroke();
  ctx.setLineDash([]);

  // 地面距离里程标（每 100m = 1000px 刻一个路标）
  var markerStep = 100 * this.PIXELS_PER_METER;
  var firstMeterIdx = Math.max(1, Math.floor((camX - data.startX) / markerStep));
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (var mi = firstMeterIdx; mi <= firstMeterIdx + 2; mi++) {
    var mx = data.startX + mi * markerStep;
    if (mx < camX - 40 || mx > camX + rw + 60) continue;
    if (data.chaseVariant === 'escape' && mi * 100 >= data.targetDistanceM) continue;

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, ry + wallH + 6);
    ctx.lineTo(mx, ry + rh - wallH - 6);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(mx - 28, ry + rh - wallH - 26, 56, 18);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText((mi * 100) + 'm', mx, ry + rh - wallH - 17);
  }

  // 疾驰速度线（神佑鸟居 / 疾风铃 / 狂暴 / 连斩冲刺）
  if (mg.combo >= 4 || Player.dashT > 0 || data.frenzyTimer > 0 || data.windBoostTimer > 0 || data.toriiBoostTimer > 0) {
    var boosted = (data.toriiBoostTimer > 0 || data.windBoostTimer > 0 || data.frenzyTimer > 0);
    var lineCount = (Player.dashT > 0 || boosted) ? 12 : 5;
    ctx.strokeStyle = data.toriiBoostTimer > 0
      ? 'rgba(253, 224, 71, 0.24)'
      : (data.windBoostTimer > 0
        ? 'rgba(94, 234, 212, 0.24)'
        : (data.frenzyTimer > 0 ? 'rgba(250, 204, 21, 0.18)' : 'rgba(125, 211, 252, 0.12)'));
    ctx.lineWidth = boosted ? 2 : 1.5;
    for (var li = 0; li < lineCount; li++) {
      var ly = ry + wallH + 22 + ((li * 97 + Math.floor(mg.timer * 420)) % (rh - wallH * 2 - 44));
      var lx = camX + rw - ((mg.timer * (boosted ? 1250 : 900) + li * 173) % (rw + 180));
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + (boosted ? 105 : 75), ly);
      ctx.stroke();
    }
  }

  ctx.restore();
};

IaijutsuModeChase._renderFinishGate = function (ctx, gateX, ry, rh, timer) {
  ctx.save();
  var pulse = 0.75 + 0.25 * Math.sin(timer * 5);

  // 金色净化结界光幕
  var curtainGrad = ctx.createLinearGradient(gateX - 36, 0, gateX + 48, 0);
  curtainGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
  curtainGrad.addColorStop(0.5, 'rgba(250, 204, 21, ' + (0.38 * pulse).toFixed(3) + ')');
  curtainGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = curtainGrad;
  ctx.fillRect(gateX - 36, ry + 36, 84, rh - 72);

  // 鸟居朱红双柱
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 18;
  ctx.fillRect(gateX - 8, ry + 42, 16, 68);
  ctx.fillRect(gateX - 8, ry + rh - 110, 16, 68);

  // 中心发光冲线光柱
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gateX, ry + 42);
  ctx.lineTo(gateX, ry + rh - 42);
  ctx.stroke();

  // 顶部终点标牌
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(gateX - 68, ry + 78, 136, 32, 8);
  else ctx.rect(gateX - 68, ry + 78, 136, 32);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⛩️ 结界终点 1500m', gateX, ry + 94);
  ctx.restore();
};

// --------------------------------------------------------------------------
// 渲染长廊动态地标：「神佑加速鸟居」&「破门木障」
// --------------------------------------------------------------------------
IaijutsuModeChase._renderLandmarks = function (ctx, data, camX, rw, timer) {
  if (!data.landmarks || !data.landmarks.length) return;
  for (var i = 0; i < data.landmarks.length; i++) {
    var lm = data.landmarks[i];
    if (lm.x < camX - 90 || lm.x > camX + rw + 100) continue;
    if (lm.type === 'torii') {
      this._drawToriiLandmark(ctx, lm, timer);
    } else if (lm.type === 'barrier' && !lm.broken) {
      this._drawBarrierLandmark(ctx, lm, timer);
    }
  }
};

IaijutsuModeChase._drawToriiLandmark = function (ctx, t, timer) {
  ctx.save();
  var topY = t.y - t.gateH / 2;
  var botY = t.y + t.gateH / 2;
  var pulse = 0.72 + 0.28 * Math.sin(timer * 6 + t.x * 0.01);

  // 门洞金色神佑光幕
  var veilAlpha = t.activated ? (0.12 + (t.glowT || 0) * 0.45) : (0.26 * pulse);
  var veilGrad = ctx.createLinearGradient(t.x - 24, 0, t.x + 28, 0);
  veilGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
  veilGrad.addColorStop(0.5, 'rgba(253, 224, 71, ' + veilAlpha.toFixed(3) + ')');
  veilGrad.addColorStop(1, 'rgba(94, 234, 212, 0)');
  ctx.fillStyle = veilGrad;
  ctx.fillRect(t.x - 24, topY, 52, t.gateH);

  // 鸟居上下朱红双柱基座
  ctx.shadowColor = t.activated ? '#fde047' : '#ef4444';
  ctx.shadowBlur = t.activated ? 20 : 12;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(t.x - 7, topY - 12, 14, 22);
  ctx.fillRect(t.x - 7, botY - 10, 14, 22);

  // 顶部笠木（微翘横梁）
  ctx.fillStyle = '#b91c1c';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6;
  ctx.fillRect(t.x - 12, topY - 16, 24, 7);
  ctx.strokeRect(t.x - 12, topY - 16, 24, 7);

  // 中间金色注连绳与白色纸垂光带
  ctx.strokeStyle = t.activated ? '#ffffff' : 'rgba(253, 224, 71, 0.9)';
  ctx.lineWidth = t.activated ? 3.5 : 2.4;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(t.x, topY + 10);
  ctx.lineTo(t.x, botY - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // 门洞内三枚飘动金白纸垂
  for (var si = -1; si <= 1; si++) {
    var sy = t.y + si * 36;
    var sway = Math.sin(timer * 7 + si) * 4;
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.moveTo(t.x, sy - 6);
    ctx.lineTo(t.x + 7 + sway, sy);
    ctx.lineTo(t.x, sy + 6);
    ctx.lineTo(t.x - 3 + sway * 0.5, sy);
    ctx.closePath();
    ctx.fill();
  }

  // 标签
  ctx.shadowBlur = 0;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.activated ? '#a7f3d0' : '#fef08a';
  ctx.fillText(t.activated ? '✦ 神佑已启' : '⛩️ 加速鸟居', t.x, topY - 26);
  ctx.restore();
};

IaijutsuModeChase._drawBarrierLandmark = function (ctx, b, timer) {
  ctx.save();
  var x = b.x - b.w / 2;
  var y = b.y - b.h / 2;

  // 木门外框（暖木棕 + 浅障子纸格）
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, b.w, b.h);
  ctx.strokeRect(x, y, b.w, b.h);

  // 障子横格木棂
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 1.6;
  var cells = 6;
  for (var ci = 1; ci < cells; ci++) {
    var gy = y + (b.h / cells) * ci;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + b.w, gy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(b.x, y);
  ctx.lineTo(b.x, y + b.h);
  ctx.stroke();

  // 中央发光朱红符纸（提示可一刀劈开！）
  var pulse = 0.72 + 0.28 * Math.sin(timer * 9 + b.x * 0.02);
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12 * pulse;
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6;
  ctx.fillRect(b.x - 10, b.y - 18, 20, 36);
  ctx.strokeRect(b.x - 10, b.y - 18, 20, 36);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('破', b.x, b.y);

  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('🚪 可劈开', b.x, y - 12);
  ctx.restore();
};

IaijutsuModeChase._renderDebris = function (ctx, data) {
  if (!data.debris || !data.debris.length) return;
  ctx.save();
  for (var i = 0; i < data.debris.length; i++) {
    var db = data.debris[i];
    var a = Utils.clamp(db.life / db.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(db.x, db.y);
    ctx.rotate(db.rot);
    ctx.fillStyle = db.color;
    ctx.fillRect(-db.w / 2, -db.h / 2, db.w, db.h);
    if (db.isPaper) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, -4, 4, 8);
    }
    ctx.restore();
  }
  ctx.restore();
};

// --------------------------------------------------------------------------
// 渲染青玉【疾风铃靶】
// --------------------------------------------------------------------------
IaijutsuModeChase._drawWindBellDummy = function (ctx, dm, timer) {
  ctx.save();
  var bob = Math.sin(timer * 5 + (dm.bellPhase || 0)) * 3.5;
  var sway = Math.sin(timer * 6.5 + (dm.bellPhase || 0)) * 0.14;
  ctx.translate(dm.x, dm.y + bob);

  // 外围旋转青风气流双弧
  ctx.save();
  ctx.rotate(timer * 3.2);
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.85)';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = '#2dd4bf';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 0, dm.r + 7, 0, Math.PI * 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, dm.r + 7, Math.PI, Math.PI * 1.72);
  ctx.stroke();
  ctx.restore();

  // 飘动短册纸签（风铃下摆）
  ctx.save();
  ctx.rotate(sway);
  ctx.fillStyle = '#f0fdfa';
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-4, 8, 8, 22);
  ctx.strokeRect(-4, 8, 8, 22);
  ctx.fillStyle = '#0d9488';
  ctx.fillRect(-1.5, 13, 3, 12);

  // 琉璃风铃铃身
  var bellGrad = ctx.createRadialGradient(-4, -8, 2, 0, -2, 20);
  bellGrad.addColorStop(0, '#ecfeff');
  bellGrad.addColorStop(0.45, '#5eead4');
  bellGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = bellGrad;
  ctx.strokeStyle = '#ccfbf1';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#5eead4';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, -2, 16, Math.PI * 0.92, Math.PI * 2.08);
  ctx.quadraticCurveTo(16, 10, 0, 11);
  ctx.quadraticCurveTo(-16, 10, -15, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 发光铃舌
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 8, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 标签
  ctx.shadowBlur = 0;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#99f6e4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎐 疾风铃', 0, -dm.r - 12);
  ctx.restore();
};

// --------------------------------------------------------------------------
// 渲染空格【风雷缩地步】专属青翠风符特效（彻底区别于居合斩白蓝刀光）
// --------------------------------------------------------------------------
IaijutsuModeChase._renderWindStepFx = function (ctx, data) {
  var wfx = data.windStepFx;
  if (!wfx) return;
  ctx.save();

  // 1. 起步点旋转青翠风符替身阵
  for (var si = 0; si < wfx.seals.length; si++) {
    var sl = wfx.seals[si];
    var a = Utils.clamp(sl.life / sl.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(sl.x, sl.y);
    ctx.rotate(sl.rot);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + (1 - a) * 18, 0, Math.PI * 2);
    ctx.stroke();
    // 替身风符纸
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-7, -13, 14, 26);
    ctx.strokeRect(-7, -13, 14, 26);
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#047857';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('风', 0, 0);
    ctx.restore();
  }

  // 2. 横推青翠音爆风环
  for (var ri = 0; ri < wfx.rings.length; ri++) {
    var rg = wfx.rings[ri];
    var ra = Utils.clamp(rg.life / rg.maxLife, 0, 1);
    var prog = 1 - ra;
    var rx = rg.rx + (rg.maxRx - rg.rx) * prog;
    var ry = rg.ry + (rg.maxRy - rg.ry) * prog;
    ctx.save();
    ctx.globalAlpha = ra * 0.9;
    ctx.strokeStyle = rg.color || '#34d399';
    ctx.lineWidth = 3.5 * ra + 1;
    ctx.shadowColor = rg.color || '#34d399';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    if (rg.circle) {
      ctx.arc(rg.x, rg.y, rx, 0, Math.PI * 2);
    } else {
      ctx.ellipse(rg.x, rg.y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. 青翠风行残影 + 水平流风拖尾
  for (var ai = 0; ai < wfx.afterimages.length; ai++) {
    var img = wfx.afterimages[ai];
    var aa = Utils.clamp(img.life / img.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = aa * 0.58;
    var tailGrad = ctx.createLinearGradient(img.x - 54, img.y, img.x + 14, img.y);
    tailGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
    tailGrad.addColorStop(0.6, 'rgba(52, 211, 153, 0.55)');
    tailGrad.addColorStop(1, 'rgba(167, 243, 208, 0.92)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.ellipse(img.x - 16, img.y, 34, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(img.x, img.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. 青风羽/竹叶流光
  for (var fi = 0; fi < wfx.feathers.length; fi++) {
    var f = wfx.feathers[fi];
    var fa = Utils.clamp(f.life / f.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = fa;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, f.len, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
};

// --------------------------------------------------------------------------
// 渲染【回身 · 破魔斩】横贯长廊炽金绯红剑气波
// --------------------------------------------------------------------------
IaijutsuModeChase._renderCounterWaves = function (ctx, data) {
  if (!data.counterWaves || !data.counterWaves.length) return;
  ctx.save();
  for (var i = 0; i < data.counterWaves.length; i++) {
    var cw = data.counterWaves[i];
    var a = Utils.clamp(cw.life / cw.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.4);

    // 剑气尾焰拖光（朝右拉尾，刃锋朝左横扫！）
    var tailGrad = ctx.createLinearGradient(cw.x - 36, cw.y, cw.x + 170, cw.y);
    tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    tailGrad.addColorStop(0.24, 'rgba(253, 224, 71, 0.85)');
    tailGrad.addColorStop(0.62, 'rgba(244, 63, 94, 0.55)');
    tailGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(cw.x - 42, cw.y);
    ctx.quadraticCurveTo(cw.x + 10, cw.y - cw.halfH, cw.x + 160, cw.y - cw.halfH * 0.78);
    ctx.lineTo(cw.x + 76, cw.y);
    ctx.lineTo(cw.x + 160, cw.y + cw.halfH * 0.78);
    ctx.quadraticCurveTo(cw.x + 10, cw.y + cw.halfH, cw.x - 42, cw.y);
    ctx.closePath();
    ctx.fill();

    // 炽白破魔月牙刃锋
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(cw.x + 28, cw.y - cw.halfH * 0.92);
    ctx.quadraticCurveTo(cw.x - 58, cw.y, cw.x + 28, cw.y + cw.halfH * 0.92);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
};

// --------------------------------------------------------------------------
// 玩家周身状态环（瞬步就绪高辨识青翠风羽环 + 紧急脱身提示 + 破魔斩就绪金绯环 + 冷却环）
// --------------------------------------------------------------------------
IaijutsuModeChase._renderPlayerChaseStatus = function (ctx, data, timer) {
  var t = timer || 0;
  var escCd = Math.max(0, data.escapeDashCd || 0);
  var escReady = escCd <= 0;
  var gapPx = data.monster ? Math.max(0, Player.x - data.monster.x) : 999;
  var isUrgent = escReady && (gapPx < 175 || (data.slowTimer || 0) > 0);
  var counterReady = (data.counterCharge || 0) >= (data.counterMax || this.COUNTER_MAX);

  // 1. 空格【风雷瞬步】就绪/冷却高可见度环（半径 30px，绝不与 25px 挥空环重叠）
  if (escReady) {
    ctx.save();
    var pulse = 0.5 + 0.5 * Math.sin(t * (isUrgent ? 14 : 5.5));
    var baseR = isUrgent ? (31 + pulse * 4) : (29 + pulse * 1.8);

    // 紧急危险时外层呼吸光晕
    if (isUrgent) {
      ctx.strokeStyle = 'rgba(110, 231, 183, ' + (0.45 + pulse * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(Player.x, Player.y, baseR + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 旋转双青翠风羽弧
    ctx.save();
    ctx.translate(Player.x, Player.y);
    ctx.rotate(t * (isUrgent ? 5.2 : 2.6));
    ctx.strokeStyle = isUrgent ? '#ffffff' : '#34d399';
    ctx.lineWidth = isUrgent ? 3.2 : 2.4;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 14;
    for (var ai = 0; ai < 2; ai++) {
      var a0 = ai * Math.PI;
      ctx.beginPath();
      ctx.arc(0, 0, baseR, a0, a0 + Math.PI * 0.68);
      ctx.stroke();
      // 风羽尖点
      var tipA = a0 + Math.PI * 0.68;
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(Math.cos(tipA) * baseR, Math.sin(tipA) * baseR, isUrgent ? 3.8 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 脚下常驻轻巧就绪标签 / 头顶危险急促提醒
    if (isUrgent) {
      ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(Player.x - 46, Player.y - 56, 92, 22, 6);
      else ctx.rect(Player.x - 46, Player.y - 56, 92, 22);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ecfdf5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍃 空格脱身!', Player.x, Player.y - 45);
    } else {
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(110, 231, 183, 0.92)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍃 空格瞬步', Player.x, Player.y + 39);
    }
    ctx.restore();
  } else {
    // 瞬步冷却外圈进度弧（柔和青灰，清晰不喧宾夺主）
    var escPct = Utils.clamp(1 - escCd / (data.escapeDashMaxCd || this.ESCAPE_DASH_CD), 0, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 32, -Math.PI / 2, -Math.PI / 2 + escPct * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1.5 瞬步刚转好瞬间的青翠脉冲扩散波
  if ((data.escapeReadyPulse || 0) > 0) {
    var ep = 1 - Utils.clamp(data.escapeReadyPulse / 0.68, 0, 1);
    ctx.save();
    ctx.globalAlpha = (1 - ep) * 0.9;
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 3.5 * (1 - ep) + 1;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 26 + ep * 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. 【回身 · 破魔斩】充能满格周身炽金绯红四印环
  if (counterReady) {
    ctx.save();
    ctx.translate(Player.x, Player.y);
    ctx.rotate(-t * 3.1);
    var cr = 37 + Math.sin(t * 9) * 2;
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (var ki = 0; ki < 4; ki++) {
      var ka = (Math.PI / 2) * ki;
      var kx = Math.cos(ka) * cr;
      var ky = Math.sin(ka) * cr;
      ctx.fillStyle = ki % 2 === 0 ? '#fde047' : '#f43f5e';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(kx, ky - 5);
      ctx.lineTo(kx + 4.5, ky);
      ctx.lineTo(kx, ky + 5);
      ctx.lineTo(kx - 4.5, ky);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (!isUrgent) {
      ctx.save();
      ctx.fillStyle = 'rgba(124, 45, 18, 0.92)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(Player.x - 48, Player.y - 56, 96, 20, 5);
      else ctx.rect(Player.x - 48, Player.y - 56, 96, 20);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥 [E] 破魔斩!', Player.x, Player.y - 46);
      ctx.restore();
    }
  }
  if ((data.counterReadyPulse || 0) > 0) {
    var cp = 1 - Utils.clamp(data.counterReadyPulse / 0.78, 0, 1);
    ctx.save();
    ctx.globalAlpha = (1 - cp) * 0.9;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4 * (1 - cp) + 1;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 28 + cp * 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. 左键挥空冷却环形进度条（半径 24px）
  if (Player.skillTimers[1] > 0) {
    var cd = Player.skillTimers[1];
    var pct = Utils.clamp(1 - cd / this.MISS_COOLDOWN, 0, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 24, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CD ' + cd.toFixed(1) + 's', Player.x, Player.y - 34);
    ctx.restore();
  }

  // 4. 缚足黑雾减速视觉环
  if (data.slowTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
};

// --------------------------------------------------------------------------
// 追逐战专属 HUD（固定在当前相机视野内，清晰无遮挡）
// --------------------------------------------------------------------------
IaijutsuModeChase.renderCustomHud = function (ctx, mg) {
  var data = mg.iaijutsuData;
  if (!data || !mg.room) return;

  var rx = data.camX !== undefined ? data.camX : mg.room.worldX;
  var ry = mg.room.worldY;
  var isEndless = (data.chaseVariant === 'endless');
  var curL = data.lives !== undefined ? data.lives : 3;
  var heartStr = '❤️'.repeat(Math.max(0, curL)) + '🖤'.repeat(Math.max(0, 3 - curL));
  var distM = Math.floor(data.distanceM || 0);

  ctx.save();
  ctx.textBaseline = 'middle';

  // ==================== 顶部精简信息条 ====================
  ctx.fillStyle = 'rgba(11, 16, 30, 0.88)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.fillRect(rx + 18, ry + 12, CFG.W - 36, 44);
  ctx.strokeRect(rx + 18, ry + 12, CFG.W - 36, 44);

  // 左侧：模式名 + 心数
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(isEndless ? '👹 鬼影追猎 · 无尽' : '👹 鬼影追猎 · 逃脱', rx + 32, ry + 34);

  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText(heartStr, rx + 186, ry + 34);

  // 中央：进度条（逃脱模式）或 实时距离与危险阶数（无尽模式）
  if (!isEndless) {
    var barX = rx + 292;
    var barY = ry + 26;
    var barW = 330;
    var barH = 16;
    var pPct = Utils.clamp((data.distanceM || 0) / data.targetDistanceM, 0, 1);
    var mDistM = data.monster ? Math.max(0, (data.monster.x - data.startX) / this.PIXELS_PER_METER) : 0;
    var mPct = Utils.clamp(mDistM / data.targetDistanceM, 0, 1);

    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 8);
    else ctx.rect(barX, barY, barW, barH);
    ctx.fill();
    ctx.stroke();

    if (pPct > 0) {
      var fillGrad = ctx.createLinearGradient(barX, 0, barX + barW * pPct, 0);
      fillGrad.addColorStop(0, '#0284c7');
      fillGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(barX + 2, barY + 2, Math.max(6, (barW - 4) * pPct), barH - 4, 6);
      else ctx.rect(barX + 2, barY + 2, Math.max(6, (barW - 4) * pPct), barH - 4);
      ctx.fill();
    }

    var mxPos = barX + 4 + (barW - 8) * mPct;
    var pxPos = barX + 4 + (barW - 8) * pPct;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mxPos, barY + barH / 2, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(pxPos, barY + barH / 2, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(distM + 'm / ' + data.targetDistanceM + 'm ⛩️', barX + barW + 10, ry + 34);
  } else {
    var bestM = mg.getModeHighScore('chase_endless');
    var tier = 1 + Math.floor(distM / 500);
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('🏃 ' + distM + ' m', rx + 415, ry + 34);

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('威胁 Lv.' + tier + '  ·  纪录 ' + bestM + 'm', rx + 585, ry + 34);
  }

  // 右侧：连斩与退出提示
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('连斩 ' + mg.combo + ' (最高 ' + mg.maxCombo + ')  |  Esc 退出', rx + CFG.W - 30, ry + 34);

  // ==================== 底部左右技能与破魔反击槽 ====================
  var footY = ry + CFG.H - 22;
  var dashCd = Math.max(0, Player.skillTimers[1] || 0);
  var stepCd = Math.max(0, data.escapeDashCd || 0);
  var cCur = data.counterCharge || 0;
  var cMax = data.counterMax || this.COUNTER_MAX;
  var cReady = cCur >= cMax;

  // 左下技能底板
  ctx.fillStyle = 'rgba(11, 16, 30, 0.86)';
  ctx.fillRect(rx + 18, footY - 15, 650, 28);
  ctx.strokeStyle = cReady
    ? 'rgba(253, 224, 71, 0.72)'
    : (stepCd <= 0 ? 'rgba(52, 211, 153, 0.55)' : 'rgba(56, 189, 248, 0.35)');
  ctx.strokeRect(rx + 18, footY - 15, 650, 28);

  // 1) 左键居合
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillStyle = dashCd > 0 ? '#fde68a' : '#bae6fd';
  ctx.fillText('左键居合: ' + (dashCd > 0 ? ('CD ' + dashCd.toFixed(1) + 's') : '就绪'), rx + 28, footY - 1);

  // 2) 空格风雷瞬步（青翠高亮）
  ctx.fillStyle = stepCd <= 0 ? '#6ee7b7' : '#94a3b8';
  ctx.fillText('🍃 空格瞬步: ' + (stepCd <= 0 ? '就绪!' : (stepCd.toFixed(1) + 's')), rx + 158, footY - 1);

  // 3) [E/Q] 回身破魔斩 8格能量槽
  var gaugeX = rx + 305;
  ctx.fillStyle = cReady ? '#fde047' : '#cbd5e1';
  ctx.fillText(cReady ? '🔥 [E/Q] 破魔斩就绪!' : ('🔥 破魔斩 ' + cCur + '/' + cMax), gaugeX, footY - 1);

  var pipStartX = gaugeX + (cReady ? 132 : 96);
  for (var pi = 0; pi < cMax; pi++) {
    var px = pipStartX + pi * 11;
    ctx.fillStyle = pi < cCur
      ? (cReady ? (pi % 2 === 0 ? '#fde047' : '#fb7185') : '#f59e0b')
      : 'rgba(148, 163, 184, 0.24)';
    ctx.fillRect(px, footY - 7, 8, 12);
  }

  ctx.fillStyle = '#94a3b8';
  ctx.fillText('右键救场 · B 工坊', rx + 556, footY - 1);

  // 右下：当前增益 / 恶鬼硬直 / 阶段与距离
  var gapM = data.monster ? Math.max(0, Math.round((Player.x - data.monster.x) / this.PIXELS_PER_METER)) : 0;
  var curPhase = (data.monster && data.monster.phase) ? data.monster.phase : 1;
  var phaseTag = curPhase >= 3 ? '🔥百鬼' : (curPhase === 2 ? '🩸血月' : '🌑阴风');
  var isMonsterStaggered = data.monster && data.monster.state === 'stagger';

  var rightText;
  var rightColor;
  if (data.slowTimer > 0) {
    rightText = '🕸️ 缚足减速！按空格脱身';
    rightColor = '#e9d5ff';
  } else if (isMonsterStaggered) {
    rightText = '💥 噬影鬼硬直 ' + (data.monster.staggerTimer || 0).toFixed(1) + 's';
    rightColor = '#fef08a';
  } else if (data.toriiBoostTimer > 0) {
    rightText = '⛩️ 神佑加速 ' + data.toriiBoostTimer.toFixed(1) + 's';
    rightColor = '#fde047';
  } else if (data.windBoostTimer > 0) {
    rightText = '🎐 疾风顺行 ' + data.windBoostTimer.toFixed(1) + 's';
    rightColor = '#5eead4';
  } else if (data.frenzyTimer > 0) {
    rightText = '⚡ 疾风狂暴 ' + data.frenzyTimer.toFixed(1) + 's';
    rightColor = '#fde047';
  } else {
    rightText = phaseTag + ' · 👹 距你 ' + gapM + 'm';
    rightColor = gapM <= 20 ? '#fca5a5' : (curPhase >= 2 ? '#fdba74' : '#94a3b8');
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(11, 16, 30, 0.86)';
  ctx.fillRect(rx + CFG.W - 246, footY - 15, 228, 28);
  ctx.strokeStyle = isMonsterStaggered
    ? 'rgba(253, 224, 71, 0.72)'
    : (gapM <= 20 ? 'rgba(239, 68, 68, 0.65)' : (curPhase >= 2 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(148, 163, 184, 0.3)'));
  ctx.strokeRect(rx + CFG.W - 246, footY - 15, 228, 28);
  ctx.fillStyle = rightColor;
  ctx.fillText(rightText, rx + CFG.W - 28, footY - 1);

  // 右侧竖排墨印技名卡（回身·破魔斩 / 一闪·断影）
  if (data.calligraphyCard) {
    var cc = data.calligraphyCard;
    var cAlpha = Math.min(1, cc.timer / 0.35);
    var slide = (1 - Math.min(1, (cc.maxTimer - cc.timer) / 0.14)) * 28;
    var cardX = rx + CFG.W - 76 + slide;
    var cardY = ry + 138;
    ctx.save();
    ctx.globalAlpha = cAlpha;
    ctx.fillStyle = 'rgba(10, 10, 18, 0.88)';
    ctx.strokeStyle = cc.color || '#fde047';
    ctx.lineWidth = 2;
    ctx.fillRect(cardX - 24, cardY, 48, 184);
    ctx.strokeRect(cardX - 24, cardY, 48, 184);

    // 顶部朱红落款印
    ctx.fillStyle = cc.accent || '#f43f5e';
    ctx.fillRect(cardX - 9, cardY + 10, 18, 18);
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fffbeb';
    ctx.textAlign = 'center';
    ctx.fillText('斩', cardX, cardY + 19);

    // 竖排招式名
    var chars = (cc.title || '').replace(/\s+/g, '').split('');
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = cc.color || '#fde047';
    for (var ci = 0; ci < chars.length; ci++) {
      ctx.fillText(chars[ci], cardX, cardY + 46 + ci * 22);
    }
    ctx.restore();
  }

  // 高光横幅
  if (data.bannerTimer > 0) {
    data.bannerTimer -= 0.016;
    var bAlpha = Math.min(1, data.bannerTimer / 0.45);
    ctx.save();
    ctx.globalAlpha = bAlpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 18;
    ctx.fillText(data.bannerText, rx + CFG.W / 2, ry + 96);
    if (data.bannerSub) {
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e0f2fe';
      ctx.shadowBlur = 8;
      ctx.fillText(data.bannerSub, rx + CFG.W / 2, ry + 124);
    }
    ctx.restore();
  }

  ctx.restore();
};

window.IaijutsuModeChase = IaijutsuModeChase;
