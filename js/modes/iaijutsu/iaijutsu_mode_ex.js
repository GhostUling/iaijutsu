// ============================================================================
// 异靶乱舞 · 模式控制器（独立文件，不改动原版 iaijutsu_mode.js）
// ============================================================================
// 通过 Object.assign 继承原版控制器，只覆盖四件事：
//   init          换开局数据（连锁状态）
//   spawnDummies  注入四种新靶的生成概率与"场上各限 1 个"
//   onKill        诱饵罚命 / 铁壁两刀 / 分裂产物 / 连锁补刀奖励
//   update        新靶的无惩罚退场 + 连锁线的渲染与到期
// 其余（突进、命中、子弹时间、充能、断连、结算、渲染、准星）全部沿用原版。

var IAIJUTSU_MODE_BASE = window.IaijutsuMode;

var IaijutsuModeEx = Object.assign({}, IAIJUTSU_MODE_BASE);

// 准星状态挂在原版对象上，避免两个模式各装一套 DOM 监听
IaijutsuModeEx.initReticle = function () {
  return IAIJUTSU_MODE_BASE.initReticle.apply(IAIJUTSU_MODE_BASE, arguments);
};
IaijutsuModeEx.applyGameCursor = function () {
  return IAIJUTSU_MODE_BASE.applyGameCursor.apply(IAIJUTSU_MODE_BASE, arguments);
};
IaijutsuModeEx.restoreDefaultCursor = function () {
  return IAIJUTSU_MODE_BASE.restoreDefaultCursor.apply(IAIJUTSU_MODE_BASE, arguments);
};
IaijutsuModeEx.renderCursor = function () {
  return IAIJUTSU_MODE_BASE.renderCursor.apply(IAIJUTSU_MODE_BASE, arguments);
};

IaijutsuModeEx.init = function (mg) {
  IAIJUTSU_MODE_BASE.init.call(this, mg);
  var data = mg.iaijutsuData;
  if (!data) return;
  data.exMode = true;
  data.chainLink = null;      // { id, until, x0, y0 } 连锁靶拉出的限时补刀目标
};

// 生成：原版 3% 黄金 / 8% 飞梭的规则完全保留，额外叠加"新靶池"
IaijutsuModeEx.spawnDummies = function (count, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  var T = window.IaijutsuTargets;
  var hasSpecial = false, shuttleCount = 0;
  var hasDecoy = false, hasArmor = false, hasSplit = false, hasChain = false;

  for (var j = 0; j < data.dummies.length; j++) {
    var dj = data.dummies[j];
    if (dj.isSpecial) hasSpecial = true;
    if (dj.isShuttle) shuttleCount++;
    if (dj.isDecoy) hasDecoy = true;
    if (dj.isArmor) hasArmor = true;
    if (dj.isSplit) hasSplit = true;
    if (dj.isChain) hasChain = true;
  }

  var canSpawnSpecial = !hasSpecial && (!data.specialCooldown || data.specialCooldown <= 0);

  // 无我/收刀/冲击波期间不投新靶，避免自动斩击误吃诱饵、或铁壁卡住演武
  var isBusyClearing = (data.ultimateTimer > 0) || (data.ultimatePauseTimer > 0) ||
    (data.finisherRespawnTimer > 0) || (data.finisherWaves && data.finisherWaves.length > 0);
  // 前 6 连斩先让玩家熟悉基础操作，再投放新靶
  var exAllowed = (mg.combo || 0) >= 6 && !isBusyClearing;

  for (var i = 0; i < count; i++) {
    var tType = T.TYPE_NORMAL;

    if (canSpawnSpecial && Math.random() < 0.03) {
      tType = T.TYPE_SPECIAL;
      hasSpecial = true;
      canSpawnSpecial = false;
      data.specialCooldown = 10.0;
    } else if (shuttleCount < 2 && Math.random() < 0.08) {
      tType = T.TYPE_SHUTTLE;
      shuttleCount++;
    } else if (exAllowed && Math.random() < 0.12) {
      var pool = [];
      if (!hasDecoy) { pool.push(T.TYPE_DECOY); pool.push(T.TYPE_DECOY); }   // 诱饵/铁壁各占两份权重
      if (!hasArmor) { pool.push(T.TYPE_ARMOR); pool.push(T.TYPE_ARMOR); }
      if (!hasSplit) pool.push(T.TYPE_SPLIT);
      if (!hasChain) pool.push(T.TYPE_CHAIN);
      if (pool.length) {
        tType = pool[Math.floor(Math.random() * pool.length)];
        if (tType === T.TYPE_DECOY) hasDecoy = true;
        else if (tType === T.TYPE_ARMOR) hasArmor = true;
        else if (tType === T.TYPE_SPLIT) hasSplit = true;
        else if (tType === T.TYPE_CHAIN) hasChain = true;
      }
    }

    var dm = T.createDummy(mg.room, Player, { type: tType });

    // 诱饵雷不贴脸：出生离玩家太近会变成"无解暴毙"，直接降级为普通靶
    if (dm.isDecoy && Utils.dist(dm.x, dm.y, Player.x, Player.y) < 100) {
      dm.type = T.TYPE_NORMAL;
      dm.isDecoy = false;
      dm.r = 24;
      dm.time = 5.0;
      dm.maxTime = 5.0;
      dm.noTimeout = false;
      dm.ownLife = 0;
    }

    data.dummies.push(dm);
  }
};

IaijutsuModeEx.onKill = function (dm, isDash, hitAngle, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;

  // ---------- 💣 诱饵雷：斩中扣 1 命，不给连斩/充能 ----------
  if (dm.isDecoy) {
    // 无我演武期间不罚（否则自动斩击会把玩家打死）
    if (data.ultimateTimer > 0 || data.ultimatePauseTimer > 0) return;

    data.lives -= 1;
    mg.combo = 0;
    SFX.play('hurt');
    SFX.play('parry');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);

    FX.floatText(dm.x, dm.y - 32, '💣 诱饵雷！-1 命', '#f43f5e', 2.0);
    mg.addExplosion(dm.x, dm.y, '#f43f5e', 30);
    mg.addExplosion(dm.x, dm.y, '#fbbf24', 12);

    // 命中诱饵不算挥空（不额外罚 CD），代价就是这一条命
    if (data.lives <= 0) {
      mg.finishGame('lose', '💣 踩中诱饵雷，特训结束！');
    }
    return;
  }

  // ---------- 🗿 铁壁：第一刀只崩甲 ----------
  if (dm.isArmor && dm.armorLeft > 0) {
    dm.armorLeft -= 1;
    dm.hitFlash = 0.25;

    if (dm.armorLeft > 0) {
      // 原版主循环已经把靶子从数组里删了，这里放回去
      data.dummies.push(dm);

      Player.skillTimers[1] = 0;                              // 立刻可以再斩
      Player.invulnTimer = Math.max(Player.invulnTimer, 0.2);
      SFX.play('parry');
      SFX.play('hit');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.2);
      FX.floatText(dm.x, dm.y - 30, '🗿 护甲崩解！再斩一刀', '#cbd5e1', 1.2);
      mg.addExplosion(dm.x, dm.y, '#e2e8f0', 14);
      return;
    }

    // 甲已碎，落到下面按普通靶结算（多给一点连斩反馈）
    FX.floatText(dm.x, dm.y - 34, '🗿 破甲斩杀！', '#fbbf24', 1.3);
    mg.addExplosion(dm.x, dm.y, '#fbbf24', 18);
  }

  // ---------- 🔗 连锁补刀判定（必须在原版结算前读状态） ----------
  var link = data.chainLink;
  var chainBonus = !!(link && link.id === dm.id && mg.timer <= link.until);
  if (link && (chainBonus || mg.timer > link.until)) data.chainLink = null;

  // ---------- 其余按原版结算 ----------
  IAIJUTSU_MODE_BASE.onKill.call(this, dm, isDash, hitAngle, mg);

  if (chainBonus) {
    mg.combo += 3;
    if (mg.combo > mg.maxCombo) {
      mg.maxCombo = mg.combo;
      mg.saveHighScore(mg.currentGame, mg.maxCombo);
    }
    SFX.play('victory');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.3);
    FX.floatText(dm.x, dm.y - 42, '🔗 连锁斩！+3 连斩', '#22d3ee', 1.7);
    mg.addExplosion(dm.x, dm.y, '#22d3ee', 26);
    mg.addExplosion(dm.x, dm.y, '#ffffff', 10);
  }

  // ---------- 🪞 分裂：斩中后弹出两个小靶 ----------
  if (dm.isSplit && data.dummies.length <= 6) {
    var kids = window.IaijutsuTargets.spawnSplitChildren(dm, mg.room, mg);
    for (var ki = 0; ki < kids.length; ki++) data.dummies.push(kids[ki]);
    FX.floatText(dm.x, dm.y - 36, '🪞 分裂！补刀小红靶', '#c084fc', 1.3);
    mg.addExplosion(dm.x, dm.y, '#a855f7', 16);
  }

  // ---------- 🔗 连锁源：拉一条 0.55s 的补刀线 ----------
  if (dm.isChain) {
    var best = null, bestD = Infinity;
    for (var ci = 0; ci < data.dummies.length; ci++) {
      var cd = data.dummies[ci];
      if (cd.isDecoy || cd.id === dm.id) continue;
      var dd = Utils.distSq(cd.x, cd.y, dm.x, dm.y);
      if (dd < bestD) { bestD = dd; best = cd; }
    }
    if (best) {
      data.chainLink = { id: best.id, until: mg.timer + 0.55, x0: dm.x, y0: dm.y };
      FX.floatText(dm.x, dm.y - 40, '🔗 连锁！0.55s 内补刀 +3', '#22d3ee', 1.5);
    }
  }
};

IaijutsuModeEx.update = function (dt, mouseWorld, input, mg) {
  IAIJUTSU_MODE_BASE.update.call(this, dt, mouseWorld, input, mg);

  var data = mg.iaijutsuData;
  if (!data) return;

  // 新靶自行退场（不扣命）
  for (var i = data.dummies.length - 1; i >= 0; i--) {
    var d = data.dummies[i];
    if (d.expired) {
      data.dummies.splice(i, 1);
      mg.addExplosion(d.x, d.y, d.isDecoy ? '#f43f5e' : '#94a3b8', 10);
      if (d.isDecoy) FX.floatText(d.x, d.y - 18, '💣 诱饵自行失效', '#94a3b8', 1.0);
    }
  }

  // 连锁线：跟随目标、到期清除
  var link = data.chainLink;
  if (link) {
    var target = null;
    for (var k = 0; k < data.dummies.length; k++) {
      if (data.dummies[k].id === link.id) { target = data.dummies[k]; break; }
    }
    if (!target || mg.timer > link.until) {
      data.chainLink = null;
    } else {
      mg.particles.push({
        isLaser: true,
        skinId: 'chain',
        x0: link.x0,
        y0: link.y0,
        x1: target.x,
        y1: target.y,
        primaryColor: '#22d3ee',
        secondaryColor: '#0ea5e9',
        coreColor: '#ffffff',
        life: 0.07,
        maxLife: 0.07
      });
    }
  }
};

window.IaijutsuModeEx = IaijutsuModeEx;
