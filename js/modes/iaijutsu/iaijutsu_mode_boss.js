// ============================================================================
// 宿敌战 · 模式控制器（独立文件，不改动 iaijutsu_mode.js / iaijutsu_mode_ex.js）
// ----------------------------------------------------------------------------
// 继承原版控制器，只覆盖四件事：
//   init          清掉普通靶，换成一个 Boss 假靶
//   spawnDummies  不再自动补靶（场上只有 Boss 和它召唤的刀魂）
//   onKill        Boss 命中走 IaijutsuBoss.hit，刀魂走原版结算
//   update        同步 Boss 坐标、驱动 Boss 招式、把空格换成【心眼】、清理刀魂
// 其余（突进、线段命中、子弹时间、断连、渲染、准星）全部沿用原版。
// ============================================================================

var IAIJUTSU_MODE_BOSS_BASE = window.IaijutsuMode;

var IaijutsuModeBoss = Object.assign({}, IAIJUTSU_MODE_BOSS_BASE);

// 准星状态挂在原版对象上，避免每个模式各装一套 DOM 监听
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
  // 原版 init 会顺手 spawnDummies(4)，此时 this.spawnDummies 已经是下面的空实现
  IAIJUTSU_MODE_BOSS_BASE.init.call(this, mg);

  var data = mg.iaijutsuData;
  if (!data) return;

  data.bossMode = true;
  data.exMode = false;
  data.lives = 3;
  data.ultimateCharge = 0;
  data.ultimateChargeMax = 100;
  data.infiniteUlt = false;      // 宿敌战封印无我，空格改为【心眼】

  // 清空普通靶，只留 Boss
  data.dummies.length = 0;
  data.bossMinions = [];
  data.chainLink = null;
  data.eyeCd = 0;
  data.bossDead = false;

  var boss = window.IaijutsuBoss.create(mg);
  data.boss = boss;

  // Boss 的"假靶"：让原版的线段命中/子弹时间/冷却刷新直接生效
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

  // 刀魂：宿敌战的核心资源 —— 砍中它不消耗突进 CD，可以当跳板连续位移
  data.minionTimer = 4.5;
  this.spawnMinions(mg, 2);

  data.bannerTimer = 3.0;
  data.bannerText = boss.emoji + ' 宿敌降临';
  data.bannerSub = boss.title;

  SFX.play('victory');
  SFX.play('lightning');
};

// --------------------------------------------------------------------------
// 生成：宿敌战不自动补靶
// --------------------------------------------------------------------------
IaijutsuModeBoss.spawnDummies = function (count, mg) {
  return;
};

// Boss 召唤的"刀魂"：给玩家补连斩节奏，到期自行消散，不扣命
IaijutsuModeBoss.spawnMinions = function (mg, n) {
  var data = mg.iaijutsuData;
  if (!data || !window.IaijutsuTargets) return;

  var alive = 0;
  for (var i = 0; i < data.dummies.length; i++) {
    if (data.dummies[i].bossMinion) alive++;
  }
  if (alive >= 4) return;

  for (var k = 0; k < n; k++) {
    var dm = window.IaijutsuTargets.createDummy(mg.room, Player, {
      type: window.IaijutsuTargets.TYPE_NORMAL
    });
    dm.time = 9999;
    dm.maxTime = 9999;
    dm.noTimeout = true;
    dm.bossMinion = true;
    dm.minionLife = 10 + Math.random() * 3;
    data.dummies.push(dm);
    data.bossMinions.push(dm);
  }

  FX.floatText(Player.x, Player.y - 46, '👻 宿敌召唤刀魂！', '#c084fc', 1.3);
};

// --------------------------------------------------------------------------
// 挥空：宿敌战改成"只罚冷却、不扣命"
// 原版会在挥空时先设好 2.2s 突进 CD 再调这里，所以这里只需要不扣命
// --------------------------------------------------------------------------
IaijutsuModeBoss.triggerDisconnect = function (x, y, reason, mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  if (data.frenzyTimer > 0 || data.ultimateTimer > 0) return;

  // 不留情面地锁住突进：这段时间只能走位，或者靠场上的刀魂再起
  Player.skillTimers[1] = 1.9;

  SFX.play('empty');
  Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.12);
  FX.floatText(x, y - 32, reason === 'miss' ? '💨 挥空 · 突进冷却 1.9s' : '💨 断连 · 突进冷却', '#94a3b8', 1.2);
  mg.addExplosion(x, y, '#64748b', 8);
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
};

// --------------------------------------------------------------------------
// 空格 → 心眼：0.45s 无敌 + 全场减速，并斩落身边飞刃
// --------------------------------------------------------------------------
IaijutsuModeBoss.eyeOfMind = function (mg) {
  var data = mg.iaijutsuData;
  if (!data) return;
  if ((data.eyeCd || 0) > 0) {
    SFX.play('empty');
    FX.floatText(Player.x, Player.y - 40, '🧿 心眼冷却中 ' + data.eyeCd.toFixed(1) + 's', '#94a3b8', 1.1);
    return;
  }

  data.eyeCd = 5.0;
  Player.invulnTimer = Math.max(Player.invulnTimer, 0.45);
  data.bulletTime = Math.max(data.bulletTime || 0, 0.45);

  SFX.play('parry');
  SFX.play('lightning');
  Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.25);
  FX.floatText(Player.x, Player.y - 42, '🧿 心眼 · 0.45s 无敌', '#7dd3fc', 1.6);
  mg.addExplosion(Player.x, Player.y, '#7dd3fc', 18);

  // 身边 220px 内的飞刃直接斩落
  var boss = data.boss;
  if (boss && boss.blades && boss.blades.length) {
    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      if (Utils.dist(b.x, b.y, Player.x, Player.y) <= 220) {
        mg.addExplosion(b.x, b.y, '#7dd3fc', 8);
        boss.blades.splice(i, 1);
      }
    }
  }
};

// --------------------------------------------------------------------------
// 帧更新
// --------------------------------------------------------------------------
IaijutsuModeBoss.update = function (dt, mouseWorld, input, mg) {
  var data = mg.iaijutsuData;
  if (!data || !data.boss) return;

  // 工坊打开时整局暂停（与 base 的判断保持一致）
  if (window.UI && (
    (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
    (UI.isIaiShopOpen && UI.isIaiShopOpen())
  )) {
    return;
  }

  // 1) 把 Boss 的真实坐标同步到假靶上，命中判定用得到
  var bd = data.bossDummy;
  if (bd) {
    var boss = data.boss;
    bd.x = boss.x;
    bd.y = boss.y;
    bd.r = boss.r;
    bd.time = 9999;
    if (boss.state === 'dying' && data.dummies.indexOf(bd) >= 0) {
      data.dummies.splice(data.dummies.indexOf(bd), 1);
    }
  }

  // 2) 心眼计时
  if (data.eyeCd > 0) data.eyeCd = Math.max(0, data.eyeCd - dt);

  // 3) 空格不再触发无我：摘掉 spacePressed / T / U 再交给原版
  var safeInput = input;
  if (input.spacePressed) {
    this.eyeOfMind(mg);
    safeInput = Object.assign({}, input);
    safeInput.spacePressed = false;
  }
  if (input.keysJustPressed && (input.keysJustPressed['KeyT'] || input.keysJustPressed['KeyU'])) {
    if (safeInput === input) safeInput = Object.assign({}, input);
    safeInput.keysJustPressed = Object.assign({}, input.keysJustPressed);
    delete safeInput.keysJustPressed['KeyT'];
    delete safeInput.keysJustPressed['KeyU'];
  }

  // 4) 原版主循环（突进、命中、子弹时间、断连、右键挥砍）
  IAIJUTSU_MODE_BOSS_BASE.update.call(this, dt, mouseWorld, safeInput, mg);

  // 5) Boss 招式状态机（死亡演出也走这里，1.9s 后触发胜利结算）
  window.IaijutsuBoss.update(dt, mg);

  // 6) 刀魂：始终保证场上有 2~3 个，供玩家当跳板
  if (!data.bossDead) {
    data.minionTimer = (data.minionTimer || 0) - dt;
    if (data.minionTimer <= 0) {
      data.minionTimer = 4.5;
      var aliveM = 0;
      for (var mi = 0; mi < data.dummies.length; mi++) {
        if (data.dummies[mi].bossMinion) aliveM++;
      }
      if (aliveM < 3) this.spawnMinions(mg, 1);
    }
  }

  // 7) 刀魂到期自行消散（不扣命）
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
        mg.addExplosion(m.x, m.y, '#c084fc', 10);
      }
    }
  }
};

// --------------------------------------------------------------------------
// 渲染：原版场景 + Boss 本体/预告/血条
// --------------------------------------------------------------------------
IaijutsuModeBoss.render = function (ctx, mg) {
  IAIJUTSU_MODE_BOSS_BASE.render.call(this, ctx, mg);
  window.IaijutsuBoss.render(ctx, mg);
};

window.IaijutsuModeBoss = IaijutsuModeBoss;
