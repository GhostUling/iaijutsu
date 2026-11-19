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
  data.isEscapeDash = false;
  data.escapeVictory = false;
  data.victoryTimer = 0;
  data.nextMilestoneM = 500;
  data.prevPos = { x: Player.x, y: Player.y };

  // 生成追猎恶鬼
  data.monster = window.IaijutsuChaseMonster.create(mg, Player.x);

  // 预铺前方踏板靶位
  data.nextSpawnX = Player.x + 150;
  data.waveIndex = 0;
  this._ensureTargetsAhead(mg);

  data.bannerTimer = 2.6;
  data.bannerText = isEndless ? '👹 永夜死逃 · 无尽追猎' : '👹 鬼影追猎 · 逃向 1500m 鸟居！';
  data.bannerSub = '左键切靶瞬刷冷却 · 挥空短暂冷却 · 空格瞬步脱身';

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
  var dm = window.IaijutsuTargets.createDummy(mg.room, Player, {
    type: type || window.IaijutsuTargets.TYPE_NORMAL,
    x: x,
    y: y,
    time: 9999
  });
  dm.time = 9999;
  dm.maxTime = 9999;
  dm.noTimeout = true;
  dm.chaseTarget = true;
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

    // 决定本波是否夹带一个狂暴黄金加速靶（至少间隔 12 秒）
    var spawnGoldIdx = -1;
    if (wIdx >= 3 && (!data.specialCooldown || data.specialCooldown <= 0) && Math.random() < 0.16) {
      spawnGoldIdx = 1;
      data.specialCooldown = 12.0;
    }

    if (pattern === 'intro_line') {
      // 起步 3 连踏板，让玩家一开局立刻体验丝滑连闪
      data.dummies.push(this._makeCorridorDummy(x0, midY, window.IaijutsuTargets.TYPE_NORMAL, mg));
      data.dummies.push(this._makeCorridorDummy(x0 + 145, midY - 62, window.IaijutsuTargets.TYPE_NORMAL, mg));
      data.dummies.push(this._makeCorridorDummy(x0 + 290, midY + 56, window.IaijutsuTargets.TYPE_NORMAL, mg));
      data.nextSpawnX = x0 + 440;
    } else if (pattern === 'zigzag') {
      // 折线连跳：3~4 个交替上下，间距 140px
      var zSign = Math.random() < 0.5 ? 1 : -1;
      var zCount = 3 + (Math.random() < 0.4 ? 1 : 0);
      for (var zi = 0; zi < zCount; zi++) {
        var zx = x0 + zi * 142;
        if (zx >= maxAllowedX) break;
        var zy = Utils.clamp(midY + zSign * (zi % 2 === 0 ? 1 : -1) * (88 + Math.random() * 34), topY, botY);
        var zType = (zi === spawnGoldIdx) ? window.IaijutsuTargets.TYPE_SPECIAL : window.IaijutsuTargets.TYPE_NORMAL;
        data.dummies.push(this._makeCorridorDummy(zx, zy, zType, mg));
      }
      data.nextSpawnX = x0 + zCount * 142 + 45;
    } else if (pattern === 'fork') {
      // 上下双线分叉：方便玩家绕开封路斩波或减速陷阱
      data.dummies.push(this._makeCorridorDummy(x0, midY + (Math.random() - 0.5) * 30, window.IaijutsuTargets.TYPE_NORMAL, mg));
      if (x0 + 145 < maxAllowedX) {
        var topT = (spawnGoldIdx === 1) ? window.IaijutsuTargets.TYPE_SPECIAL : window.IaijutsuTargets.TYPE_NORMAL;
        data.dummies.push(this._makeCorridorDummy(x0 + 145, topY + Math.random() * 24, topT, mg));
        data.dummies.push(this._makeCorridorDummy(x0 + 145, botY - Math.random() * 24, window.IaijutsuTargets.TYPE_NORMAL, mg));
      }
      if (x0 + 295 < maxAllowedX) {
        data.dummies.push(this._makeCorridorDummy(x0 + 295, midY + (Math.random() - 0.5) * 40, window.IaijutsuTargets.TYPE_NORMAL, mg));
      }
      data.nextSpawnX = x0 + 435;
    } else if (pattern === 'stair') {
      // 斜向阶梯：顺畅变道穿过横扫车道
      var goDown = Math.random() < 0.5;
      var ys = goDown ? [topY + 12, midY, botY - 12] : [botY - 12, midY, topY + 12];
      for (var si = 0; si < 3; si++) {
        var sx = x0 + si * 138;
        if (sx >= maxAllowedX) break;
        var sType = (si === spawnGoldIdx) ? window.IaijutsuTargets.TYPE_SPECIAL : window.IaijutsuTargets.TYPE_NORMAL;
        data.dummies.push(this._makeCorridorDummy(sx, ys[si], sType, mg));
      }
      data.nextSpawnX = x0 + 455;
    } else {
      // 飞梭衔接桥：普通靶 + 纵向巡逻飞梭靶（+2连斩）+ 落脚靶
      data.dummies.push(this._makeCorridorDummy(x0, midY + (Math.random() - 0.5) * 60, window.IaijutsuTargets.TYPE_NORMAL, mg));
      if (x0 + 150 < maxAllowedX) {
        data.dummies.push(this._makeCorridorDummy(x0 + 150, midY, window.IaijutsuTargets.TYPE_SHUTTLE, mg));
      }
      if (x0 + 300 < maxAllowedX) {
        var endType = (spawnGoldIdx === 1) ? window.IaijutsuTargets.TYPE_SPECIAL : window.IaijutsuTargets.TYPE_NORMAL;
        data.dummies.push(this._makeCorridorDummy(x0 + 300, midY + (Math.random() < 0.5 ? -75 : 75), endType, mg));
      }
      data.nextSpawnX = x0 + 445;
    }
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
// 斩中靶子覆写：立刻刷新 CD + 保持高速跑酷手感（短顿挫 + 微推进）
// --------------------------------------------------------------------------
IaijutsuModeChase.onKill = function (dm, isDash, hitAngle, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
  var isSpecial = dm.isSpecial;
  var isShuttle = dm.isShuttle;

  mg.combo += (isShuttle ? 2 : 1);
  if (mg.combo > mg.maxCombo) {
    mg.maxCombo = mg.combo;
  }

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
// 空格键【瞬步脱身】：清除减速 + 短无敌 + 向前疾冲（不触发挥空惩罚）
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

  data.escapeDashCd = data.escapeDashMaxCd || this.ESCAPE_DASH_CD;
  data.slowTimer = 0; // 立刻解除黑雾减速
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.45);
  Player.dashAngle = 0; // 笔直向右突围
  Player.dashT = 0.17;
  Player.swingT = 0.16;
  Player.swingAngle = 0;
  data.isDashing = false;      // 不走常规挥空判定
  data.isEscapeDash = true;

  if (window.SFX) {
    SFX.play('dash');
    SFX.play('parry');
  }
  if (window.FX) {
    FX.dash(Player.x, Player.y, 0);
    FX.floatText(Player.x, Player.y - 40, '💨 瞬步脱身！解除减速·无敌突围', '#7dd3fc', 1.35);
  }
  mg.addExplosion(Player.x, Player.y, '#7dd3fc', 20);

  // 震散身旁 150px 内的飞行斩波
  var monster = data.monster;
  if (monster && monster.waves && monster.waves.length) {
    for (var i = monster.waves.length - 1; i >= 0; i--) {
      var w = monster.waves[i];
      if (Utils.dist(w.x, w.y, Player.x, Player.y) <= 155) {
        mg.addExplosion(w.x, w.y, '#7dd3fc', 12);
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
  if (data.escapeDashCd > 0) data.escapeDashCd = Math.max(0, data.escapeDashCd - dt);
  if (data.slowTimer > 0) data.slowTimer = Math.max(0, data.slowTimer - dt);
  if (data.isEscapeDash && Player.dashT <= 0) data.isEscapeDash = false;

  // 根据减速池与疾风狂暴动态同步步行速度倍率
  if (data.frenzyTimer > 0) {
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

  // 4. 拦截空格 / T / U，屏蔽原版自动无我，把空格交给【瞬步脱身】
  var safeInput = input;
  if (input.spacePressed) {
    this.triggerEscapeStep(mg);
    safeInput = Object.assign({}, input);
    safeInput.spacePressed = false;
  }
  if (input.keysJustPressed && (input.keysJustPressed['KeyT'] || input.keysJustPressed['KeyU'])) {
    if (safeInput === input) safeInput = Object.assign({}, input);
    safeInput.keysJustPressed = Object.assign({}, input.keysJustPressed);
    delete safeInput.keysJustPressed['KeyT'];
    delete safeInput.keysJustPressed['KeyU'];
  }

  // 防止点击顶部无CD按钮区域误触发原版 toggleInfiniteUlt
  var mLogical = (window.Input && Input.logicalPos) ? Input.logicalPos() : { x: 0, y: 0 };
  if ((safeInput.leftPressed || safeInput.leftClick) && mLogical.y <= 64) {
    // 不让点在顶部 HUD 区域触发原版无 CD 切换，但仍允许向该方向居合
    var origToggle = this.toggleInfiniteUlt;
    this.toggleInfiniteUlt = function () {};
    IAIJUTSU_MODE_CHASE_BASE.update.call(this, dt, mouseWorld, safeInput, mg);
    this.toggleInfiniteUlt = origToggle;
  } else {
    IAIJUTSU_MODE_CHASE_BASE.update.call(this, dt, mouseWorld, safeInput, mg);
  }

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

  // 7. 回收滚出左侧视野的旧靶子（不扣命），并在前方持续铺设新踏板靶
  for (var di = data.dummies.length - 1; di >= 0; di--) {
    var d = data.dummies[di];
    d.time = 9999; // 永不超时扣命
    if (d.x < data.camX - 160) {
      data.dummies.splice(di, 1);
    }
  }
  this._ensureTargetsAhead(mg);

  // 8. 更新追猎恶鬼与三大封路技能
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

  // 4. 狂暴加速光环
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

  // 5. 沿途踏板靶位（只画视野附近的靶位提升性能）
  for (var i = 0; i < data.dummies.length; i++) {
    var dm = data.dummies[i];
    if (dm.x < camX - 60 || dm.x > camX + rw + 80) continue;
    window.IaijutsuTargets.drawDummy(ctx, dm, skin);
  }

  // 6. 玩家脚下冷却环与缚足减速紫链提示
  this._renderPlayerChaseStatus(ctx, data);

  // 7. 追猎恶鬼本体、飞行斩波与左侧压迫提示
  window.IaijutsuChaseMonster.render(ctx, mg);

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

  // 疾驰速度线（连斩 >= 5 或冲刺中增强临场速度感）
  if (mg.combo >= 4 || Player.dashT > 0 || data.frenzyTimer > 0) {
    var lineCount = Player.dashT > 0 ? 10 : 5;
    ctx.strokeStyle = data.frenzyTimer > 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(125, 211, 252, 0.12)';
    ctx.lineWidth = 1.5;
    for (var li = 0; li < lineCount; li++) {
      var ly = ry + wallH + 22 + ((li * 97 + Math.floor(mg.timer * 420)) % (rh - wallH * 2 - 44));
      var lx = camX + rw - ((mg.timer * 900 + li * 173) % (rw + 180));
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 75, ly);
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

IaijutsuModeChase._renderPlayerChaseStatus = function (ctx, data) {
  // 1. 突进冷却环形进度条（挥空陷入 CD 时绕角色显示，极度直观）
  if (Player.skillTimers[1] > 0) {
    var cd = Player.skillTimers[1];
    var pct = Utils.clamp(1 - cd / this.MISS_COOLDOWN, 0, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 28, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CD ' + cd.toFixed(1) + 's', Player.x, Player.y - 36);
    ctx.restore();
  }

  // 2. 缚足黑雾减速视觉环
  if (data.slowTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(Player.x, Player.y, 24, 0, Math.PI * 2);
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

    // 轨道底槽
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 8);
    else ctx.rect(barX, barY, barW, barH);
    ctx.fill();
    ctx.stroke();

    // 已逃跑进度
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

    // 怪物追击红点与玩家蓝白点
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

    // 进度文字读数
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

  // ==================== 底部左右技能与状态条 ====================
  var footY = ry + CFG.H - 22;

  // 左下：突进冷却 + 瞬步脱身 + 减速状态
  var dashCd = Math.max(0, Player.skillTimers[1] || 0);
  var stepCd = Math.max(0, data.escapeDashCd || 0);
  var statusLine =
    '左键居合: ' + (dashCd > 0 ? ('冷却 ' + dashCd.toFixed(1) + 's') : '就绪') +
    '   |   空格瞬步: ' + (stepCd > 0 ? ('冷却 ' + stepCd.toFixed(1) + 's') : '就绪') +
    '   |   右键近斩可救场刷新   |   B 工坊';

  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(11, 16, 30, 0.82)';
  ctx.fillRect(rx + 18, footY - 14, 530, 26);
  ctx.strokeStyle = dashCd > 0 ? 'rgba(245, 158, 11, 0.55)' : 'rgba(56, 189, 248, 0.35)';
  ctx.strokeRect(rx + 18, footY - 14, 530, 26);
  ctx.fillStyle = dashCd > 0 ? '#fde68a' : '#cbd5e1';
  ctx.fillText(statusLine, rx + 28, footY - 1);

  // 右下：当前阶段 + 恶鬼距离（或狂暴/减速状态标签）
  var gapM = data.monster ? Math.max(0, Math.round((Player.x - data.monster.x) / this.PIXELS_PER_METER)) : 0;
  var curPhase = (data.monster && data.monster.phase) ? data.monster.phase : 1;
  var phaseTag = curPhase >= 3 ? '🔥百鬼' : (curPhase === 2 ? '🩸血月' : '🌑阴风');
  var rightText = data.slowTimer > 0
    ? '🕸️ 缚足减速中！按空格脱身'
    : (data.frenzyTimer > 0
      ? ('⚡ 疾风狂暴: ' + data.frenzyTimer.toFixed(1) + 's')
      : (phaseTag + ' · 👹 距你 ' + gapM + 'm'));
  var rightColor = data.slowTimer > 0
    ? '#e9d5ff'
    : (data.frenzyTimer > 0 ? '#fde047' : (gapM <= 20 ? '#fca5a5' : (curPhase >= 2 ? '#fdba74' : '#94a3b8')));

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(11, 16, 30, 0.82)';
  ctx.fillRect(rx + CFG.W - 246, footY - 14, 228, 26);
  ctx.strokeStyle = gapM <= 20 ? 'rgba(239, 68, 68, 0.65)' : (curPhase >= 2 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(148, 163, 184, 0.3)');
  ctx.strokeRect(rx + CFG.W - 246, footY - 14, 228, 26);
  ctx.fillStyle = rightColor;
  ctx.fillText(rightText, rx + CFG.W - 28, footY - 1);

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
