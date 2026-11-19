// ============================================================================
// 宿敌战 · 模式控制器（高难度居合对决版，不改动原版 5 个 iaijutsu_*.js）
// ============================================================================

var IAIJUTSU_MODE_BOSS_BASE = window.IaijutsuMode;

var IaijutsuModeBoss = Object.assign({}, IAIJUTSU_MODE_BOSS_BASE);

IaijutsuModeBoss.initReticle = function () {
  return IAIJUTSU_MODE_BOSS_BASE.initReticle.apply(IAIJUTSU_MODE_BOSS_BASE, arguments);
};
IaijutsuModeBoss.applyGameCursor = function () {
  return IAIJUTSU_MODE_BOSS_BASE.applyGameCursor.apply(IAIJUTSU_MODE_BOSS_BASE, arguments);
};
IaijutsuModeBoss.restoreDefaultCursor = function () {
  return IAIJUTSU_MODE_BOSS_BASE.restoreDefaultCursor.apply(IAIJUTSU_MODE_BOSS_BASE, arguments);
};
IaijutsuModeBoss.renderCursor = function () {
  return IAIJUTSU_MODE_BOSS_BASE.renderCursor.apply(IAIJUTSU_MODE_BOSS_BASE, arguments);
};

// --------------------------------------------------------------------------
// 初始化
// --------------------------------------------------------------------------
IaijutsuModeBoss.init = function (mg) {
  IAIJUTSU_MODE_BOSS_BASE.init.call(this, mg);

  var data = mg.iaijutsuData;
  if (!data) return;

  data.bossMode = true;
  data.exMode = false;
  data.lives = 3;
  data.hitsTaken = 0;
  data.parryCount = 0;
  data.execCount = 0;
  data.bossClearTime = 0;
  data.bossRank = '';
  data.ultimateCharge = 0;
  data.ultimateChargeMax = 100;
  data.infiniteUlt = false;

  data.dummies.length = 0;
  data.bossMinions = [];
  data.chainLink = null;
  data.eyeCd = 0;
  data.eyeActiveT = 0;
  data.bossDead = false;
  data.bossSafeInvuln = 0.5;

  var bossId = (mg && mg.selectedBossId) ? mg.selectedBossId : 'random';
  var boss = window.IaijutsuBoss.create(mg, bossId);
  data.boss = boss;

  if (window.IaijutsuBossStyles) {
    window.IaijutsuBossStyles.initRun(mg);
    if (data.bossStyle) {
      boss.styleParryWindow = data.bossStyle.parryWindow || 0.28;
    }
  }

  data.bossDummy = {
    id: 'boss',
    type: 'boss',
    isBoss: true,
    x: boss.x,
    y: boss.y,
    r: boss.r,
    time: 9999,
    maxTime: 9999,
    noTimeout: true,
    pulse: 0
  };
  data.dummies.push(data.bossDummy);

  // 场上最多维持 1 个刀魂跳板，用于位移拉扯，避免刷架势逃课
  data.minionTimer = 7.0;
  this.spawnMinions(mg, 1);

  data.bannerTimer = 2.4;
  data.bannerText = '⚔️ 宿敌降临 · ' + boss.name;
  data.bannerSub = '✦ 金光按空格【心眼见切】 · 危字杀招务必闪避';

  SFX.play('victory');
  SFX.play('lightning');
};

IaijutsuModeBoss.spawnDummies = function (count, mg) {
  return;
};

IaijutsuModeBoss.spawnMinions = function (mg, n) {
  var data = mg.iaijutsuData;
  if (!data || !window.IaijutsuTargets) return;

  var alive = 0;
  for (var i = 0; i < data.dummies.length; i++) {
    if (data.dummies[i].bossMinion) alive++;
  }
  if (alive >= 1) return;

  var toSpawn = Math.min(n, 1 - alive);
  for (var k = 0; k < toSpawn; k++) {
    var dm = window.IaijutsuTargets.createDummy(mg.room, Player, {
      type: window.IaijutsuTargets.TYPE_NORMAL
    });
    dm.time = 9999;
    dm.maxTime = 9999;
    dm.noTimeout = true;
    dm.bossMinion = true;
    dm.minionLife = 12 + Math.random() * 3;
    data.dummies.push(dm);
    data.bossMinions.push(dm);
  }
};

// --------------------------------------------------------------------------
// 挥空：1.1s 冷却、不扣命、不断连
// --------------------------------------------------------------------------
IaijutsuModeBoss.triggerDisconnect = function (x, y, reason, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  if (data.frenzyTimer > 0 || data.ultimateTimer > 0) return;

  var missCd = (data.bossStyle && data.bossStyle.missCd) ? data.bossStyle.missCd : 1.1;
  Player.skillTimers[1] = missCd;

  SFX.play('empty');
  Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.08);
  FX.floatText(x, y - 30, reason === 'miss' ? ('💨 挥空 · 冷却 ' + missCd.toFixed(1) + 's') : ('💨 冷却 ' + missCd.toFixed(1) + 's'), '#94a3b8', 1.15);
  mg.addExplosion(x, y, '#64748b', 7);
};

// --------------------------------------------------------------------------
// 命中
// --------------------------------------------------------------------------
IaijutsuModeBoss.onKill = function (dm, isDash, hitAngle, mg) {
  if (dm && dm.isBoss) {
    window.IaijutsuBoss.hit(dm, isDash, hitAngle, mg);
    return;
  }

  IAIJUTSU_MODE_BOSS_BASE.onKill.call(this, dm, isDash, hitAngle, mg);

  var data = mg.iaijutsuData;
  var boss = data && data.boss;
  if (dm && dm.bossMinion && boss && boss.state !== 'dying' && boss.state !== 'intro') {
    window.IaijutsuBoss.addPosture(boss, 6, mg);
    boss.slashScars.push({
      x0: dm.x, y0: dm.y, x1: boss.x, y1: boss.y,
      color: '#38bdf8', coreColor: '#e0f2fe', width: 3.5, life: 0.22, maxLife: 0.22
    });
    FX.floatText(dm.x, dm.y - 26, '⚡ 借力跳板 · 架势+6', '#7dd3fc', 1.05);
  }
  if (data) {
    data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.08);
    Player.invulnTimer = data.bossSafeInvuln;
  }
};

// --------------------------------------------------------------------------
// 空格 → 心眼 · 见切（3.6s CD，0.24s 精准弹反窗，成功见切返 2.0s CD）
// --------------------------------------------------------------------------
IaijutsuModeBoss.eyeOfMind = function (mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  if ((data.eyeCd || 0) > 0) {
    SFX.play('empty');
    FX.floatText(Player.x, Player.y - 40, '🧿 心眼冷却中 ' + data.eyeCd.toFixed(1) + 's', '#94a3b8', 1.05);
    return;
  }

  var boss = data.boss;
  var styleEyeCd = (data.bossStyle && data.bossStyle.eyeCd) ? data.bossStyle.eyeCd : 3.6;
  data.eyeCd = data.bossTutorial ? 1.15 : styleEyeCd;
  data.eyeActiveT = data.bossTutorial ? 0.34 : 0.24;
  data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.34);
  Player.invulnTimer = data.bossSafeInvuln;

  // 1) 若 Boss 正在放不可弹反【危】招，心眼无法打断，提醒玩家速闪！
  if (boss && boss.state === 'telegraph' && window.IaijutsuBoss.isUnblockable(boss.action)) {
    SFX.play('parry');
    FX.floatText(Player.x, Player.y - 44, '危 杀招不可弹反 · 速离红区!', '#f87171', 1.35);
    mg.addExplosion(Player.x, Player.y, '#f87171', 12);
    return;
  }

  // 2) 卡在 Boss ✦ 金光窗口 → 触发【心眼 · 完美见切】！
  if (boss && boss.state !== 'dying' && window.IaijutsuBoss.isParryWindow(boss)) {
    data.eyeActiveT = 0;
    window.IaijutsuBoss.triggerPerfectParry(boss, mg, 'eye');
    return;
  }

  // 3) 身边 190px 内的飞刃直接斩碎
  var cleared = 0;
  if (boss && boss.blades && boss.blades.length) {
    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      if (Utils.dist(b.x, b.y, Player.x, Player.y) <= 190) {
        mg.addExplosion(b.x, b.y, '#7dd3fc', 9);
        boss.blades.splice(i, 1);
        cleared++;
      }
    }
  }

  if (cleared > 0 && boss) {
    if (data.bossTutorial) data.tutorialBladesCut = (data.tutorialBladesCut || 0) + cleared;
    Player.skillTimers[1] = 0;
    window.IaijutsuBoss.addPosture(boss, (data.bossTutorial && boss.tutorialLockPosture) ? 0 : cleared * 5, mg);
    mg.combo += cleared;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    SFX.play('parry');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.28);
    FX.floatText(Player.x, Player.y - 42, '🧿 心眼破刃 x' + cleared, '#7dd3fc', 1.4);
    mg.addExplosion(Player.x, Player.y, '#7dd3fc', 16);
    return;
  }

  // 4) 空开心眼（没卡中金光）：仅有短暂 0.24s 架势与 0.34s 防身无敌，需承担 3.6s 冷却
  data.bulletTime = Math.max(data.bulletTime || 0, 0.14);
  SFX.play('parry');
  Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.14);
  FX.floatText(Player.x, Player.y - 42, '🧿 心眼架势', '#7dd3fc', 1.25);
  mg.addExplosion(Player.x, Player.y, '#7dd3fc', 12);
};

// --------------------------------------------------------------------------
// 帧更新
// --------------------------------------------------------------------------
IaijutsuModeBoss.update = function (dt, mouseWorld, input, mg) {
  var data = mg.iaijutsuData;
  if (!data || !data.boss) return;

  if (window.UI && (
    (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
    (UI.isIaiShopOpen && UI.isIaiShopOpen())
  )) {
    return;
  }

  var boss = data.boss;

  var bd = data.bossDummy;
  if (bd) {
    bd.x = boss.x;
    bd.y = boss.y;
    bd.r = boss.r;
    bd.time = 9999;
    if (boss.state === 'dying' && data.dummies.indexOf(bd) >= 0) {
      data.dummies.splice(data.dummies.indexOf(bd), 1);
    }
  }

  if (data.bossSafeInvuln > 0) {
    data.bossSafeInvuln = Math.max(0, data.bossSafeInvuln - dt);
  }
  data.bossSafeInvuln = Math.min(data.bossSafeInvuln || 0, Player.invulnTimer || 0);

  if (data.eyeCd > 0) data.eyeCd = Math.max(0, data.eyeCd - dt);
  if (data.eyeActiveT > 0) {
    data.eyeActiveT = Math.max(0, data.eyeActiveT - dt);
    if (boss.state !== 'dying' && window.IaijutsuBoss.isParryWindow(boss)) {
      data.eyeActiveT = 0;
      window.IaijutsuBoss.triggerPerfectParry(boss, mg, 'eye');
    }
  }

  var safeInput = input;
  if (input.spacePressed) {
    this.eyeOfMind(mg);
    safeInput = Object.assign({}, input);
    safeInput.spacePressed = false;
  }
  if (window.IaijutsuBossStyles && window.IaijutsuBossStyles.processStyleInput) {
    safeInput = window.IaijutsuBossStyles.processStyleInput(dt, mouseWorld, safeInput, mg);
  }
  if (input.keysJustPressed && (input.keysJustPressed['KeyT'] || input.keysJustPressed['KeyU'])) {
    if (safeInput === input) safeInput = Object.assign({}, input);
    safeInput.keysJustPressed = Object.assign({}, input.keysJustPressed);
    delete safeInput.keysJustPressed['KeyT'];
    delete safeInput.keysJustPressed['KeyU'];
  }

  if (safeInput.rightPressed && window.IaijutsuBoss && window.IaijutsuBoss.slashNearbyBlades) {
    window.IaijutsuBoss.slashNearbyBlades(mg, 110);
  }

  IAIJUTSU_MODE_BOSS_BASE.update.call(this, dt, mouseWorld, safeInput, mg);

  // 禁止原版居合突进白嫖 0.30s 全程无敌帧：宿敌战中仅保留明确授予的安全无敌（心眼/见切/处决/受击）
  Player.invulnTimer = Math.min(Player.invulnTimer || 0, data.bossSafeInvuln || 0);

  if (window.IaijutsuBossStyles && window.IaijutsuBossStyles.update) {
    window.IaijutsuBossStyles.update(dt, mg);
  }

  window.IaijutsuBoss.update(dt, mg);

  if (!data.bossDead) {
    data.minionTimer = (data.minionTimer || 0) - dt;
    if (data.minionTimer <= 0) {
      data.minionTimer = 7.0;
      var aliveM = 0;
      for (var mi = 0; mi < data.dummies.length; mi++) {
        if (data.dummies[mi].bossMinion) aliveM++;
      }
      if (aliveM < 1) this.spawnMinions(mg, 1);
    }
  }

  if (data.bossMinions && data.bossMinions.length) {
    for (var i = data.bossMinions.length - 1; i >= 0; i--) {
      var m = data.bossMinions[i];
      if (!m) { data.bossMinions.splice(i, 1); continue; }
      m.minionLife -= dt;
      var stillThere = data.dummies.indexOf(m) >= 0;
      if (!stillThere) {
        data.bossMinions.splice(i, 1);
        continue;
      }
      if (m.minionLife <= 0) {
        var idx = data.dummies.indexOf(m);
        if (idx >= 0) data.dummies.splice(idx, 1);
        data.bossMinions.splice(i, 1);
        mg.addExplosion(m.x, m.y, '#38bdf8', 8);
      }
    }
  }
};

IaijutsuModeBoss.render = function (ctx, mg) {
  IAIJUTSU_MODE_BOSS_BASE.render.call(this, ctx, mg);
  window.IaijutsuBoss.render(ctx, mg);
};

window.IaijutsuModeBoss = IaijutsuModeBoss;
