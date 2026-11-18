// ===== 街机特训馆 · 居合斩宿主（保留 game4 里 MiniGames 的同名 API 与同一套流程） =====
// 之所以不重写而是复刻这层"宿主"：IaijutsuMode / IaijutsuUltimates 等模块直接读写
// MiniGames.active / room / combo / particles，接口一致才能保证迁移后行为一模一样。
var MiniGames = {
  active: false,
  currentGame: null,
  modeId: 'classic',        // 'classic' = 原版；'ex' = 异靶乱舞
  lastModeId: 'classic',
  lockedWeapon: null,
  _forcingWeapon: false,
  finished: false,
  finishT: 0,
  result: '',
  score: 0,
  combo: 0,
  maxCombo: 0,
  timer: 0,
  timeLimit: 0,
  room: null,
  particles: [],
  floatingTexts: [],
  lastSummary: null,

  // 模式实现（原版对象在启动时被临时替换，离场时还原，保证原版文件零改动）
  _baseModeImpl: window.IaijutsuMode,
  _baseTargetsImpl: window.IaijutsuTargets,
  _modeImplApplied: false,

  // 与 game4 完全相同的世界坐标基准（保证靶子分布/相机计算一致）
  BASE_X: 63000,
  GAMES_Y: {
    iaijutsu: 61000,
  },

  META: {
    iaijutsu: {
      id: 'iaijutsu',
      name: '无限连闪 · 居合斩连锁',
      emoji: '⚔️',
      tag: '居合极限连击',
      desc: '太刀瞬影居合特训！斩杀目标立即刷新CD；充能击破100个靶子可按【空格】激活5秒【无我】绝杀大招！小心挥空或超时断连触发小猪手惩罚！可在商店随时切换专属居合斩特效。',
      controls: '【左键】居合闪 · 【右键】普攻挥砍 · 【空格】充能100个释放【无我】大招 · 【B】特效商店',
      highKey: 'arcade_iaijutsu_high',
      unit: '连斩'
    }
  },

  // 两种模式的展示信息与记录键（战斗逻辑共用 META.iaijutsu 的宿主规则）
  MODE_META: {
    classic: {
      id: 'classic',
      name: '无限连闪 · 居合斩连锁',
      shortName: '原版',
      emoji: '⚔️',
      tag: '原汁原味',
      desc: '和街机厅里一模一样：三种靶、3 条命、充能满 100 开无我。',
      highKey: 'arcade_iaijutsu_high',
      unit: '连斩',
      hudTitle: '',           // 留空 = 用 name
      legend: '',             // 留空 = 不显示新靶速查
      modeImpl: null,         // null = 原版 IaijutsuMode
      targetsImpl: null       // null = 原版 IaijutsuTargets
    },
    ex: {
      id: 'ex',
      name: '无限连闪 · 异靶乱舞',
      shortName: '异靶',
      emoji: '🧪',
      tag: '新靶型',
      desc: '在原版基础上加入诱饵雷、铁壁、分裂、连锁四种靶。',
      highKey: 'arcade_iaijutsu_ex_high',
      unit: '连斩',
      hudTitle: '异靶',
      legend: '💣 勿斩   🗿 两刀   🪞 分裂   🔗 连锁补刀',
      modeImpl: window.IaijutsuModeEx || null,
      targetsImpl: window.IaijutsuTargetsEx || null
    },
    boss: {
      id: 'boss',
      name: '宿敌 · 居合一刀',
      shortName: '宿敌',
      emoji: '👹',
      tag: 'BOSS 战',
      desc: '一对一宿敌战：Boss 出招前有红色预告，用突进侧移躲开；收招后的破绽期砍它发光的弱点。',
      highKey: 'arcade_iaijutsu_boss_high',
      unit: '连斩',
      hudTitle: '宿敌战',
      legend: '💨 砍空=锁突进   ⚔️ 砍中刀魂/弱点=立刻再斩   🩸 红区=躲   🧿 空格心眼',
      modeImpl: window.IaijutsuModeBoss || null,
      targetsImpl: window.IaijutsuTargetsBoss || null
    }
  },

  getModeMeta: function (modeId) {
    return this.MODE_META[modeId || this.modeId] || this.MODE_META.classic;
  },

  getModeHighScore: function (modeId) {
    var meta = this.getModeMeta(modeId);
    try {
      var val = localStorage.getItem(meta.highKey);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  },

  // 皮肤/奥义解锁取三种模式的最高连斩，进度互通
  getUnlockScore: function () {
    return Math.max(
      this.getModeHighScore('classic'),
      this.getModeHighScore('ex'),
      this.getModeHighScore('boss')
    );
  },

  getHighScore: function (gameId) {
    var meta = this.META[gameId];
    if (!meta) return 0;
    try {
      var val = localStorage.getItem(meta.highKey);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  },

  // 记录按当前模式落盘（原版 onKill 里写死 'iaijutsu' 的调用也走这里）
  saveHighScore: function (gameId, score) {
    var meta = this.META[gameId];
    if (!meta) return false;
    var modeMeta = this.getModeMeta();
    var prev = this.getModeHighScore();
    if (score > prev) {
      try {
        localStorage.setItem(modeMeta.highKey, score.toString());
      } catch (e) {}
      return true;
    }
    return false;
  },

  // 皮肤 / 背景 / 音乐（委托给 IaijutsuSkins）
  IAI_SKINS: (window.IaijutsuSkins && window.IaijutsuSkins.LIST) || [],
  IAI_BG_SKINS: (window.IaijutsuSkins && window.IaijutsuSkins.BG_LIST) || [],
  IAI_BGM_TRACKS: (window.IaijutsuSkins && window.IaijutsuSkins.BGM_LIST) || [],

  getEquippedIaiSkinId: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkinId() : 'classic';
  },
  getEquippedIaiSkin: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : (this.IAI_SKINS[0] || {});
  },
  setEquippedIaiSkin: function (skinId) {
    return window.IaijutsuSkins ? window.IaijutsuSkins.setEquippedSkin(skinId, this.getUnlockScore()) : false;
  },
  getEquippedIaiBgSkinId: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedBgSkinId() : 'none';
  },
  getEquippedIaiBgSkin: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedBgSkin() : { id: 'none' };
  },
  setEquippedIaiBgSkin: function (bgSkinId) {
    return window.IaijutsuSkins ? window.IaijutsuSkins.setEquippedBgSkin(bgSkinId, this.getUnlockScore()) : false;
  },
  getEquippedIaiBgmId: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedBgmId() : 'default';
  },
  getEquippedIaiBgm: function () {
    return window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedBgm() : null;
  },
  setEquippedIaiBgm: function (bgmId) {
    var ok = window.IaijutsuSkins ? window.IaijutsuSkins.setEquippedBgm(bgmId, this.getUnlockScore()) : false;
    if (ok && window.SFX && SFX._iaijutsuBgmPlaying) {
      SFX.playIaijutsuBgm(bgmId);
    }
    return ok;
  },

  _playSkinSlashFx: function (x0, y0, x1, y1, angle) {
    if (window.IaijutsuFX) {
      window.IaijutsuFX.playSkinSlashFx(this.particles, x0, y0, x1, y1, angle, this.getEquippedIaiSkin());
    }
  },

  buildRoom: function (gameId) {
    var m = CFG.wall.thickness;
    var x0 = this.BASE_X;
    var y0 = this.GAMES_Y[gameId] || 60000;
    var w = CFG.W, h = CFG.H;

    this.room = {
      type: 'minigame',
      gameId: gameId,
      state: 'cleared',
      worldX: x0, worldY: y0,
      w: w, h: h,
      doors: { n: false, e: false, s: false, w: false },
      colliders: [
        { x: x0, y: y0, w: w, h: m },
        { x: x0, y: y0 + h - m, w: w, h: m },
        { x: x0, y: y0, w: m, h: h },
        { x: x0 + w - m, y: y0, w: m, h: h },
      ],
      obstacles: [],
      pickups: [],
      crate: null,
      enemies: [],
    };
  },

  // ========================== 启动 ==========================
  // modeId: 'classic' 原版 / 'ex' 异靶乱舞（只切换靶型与结算记录，不改主循环）
  start: function (gameId, modeId) {
    gameId = gameId || 'iaijutsu';
    if (!this.META[gameId]) return;
    this.modeId = this.MODE_META[modeId] ? modeId : 'classic';
    this.lastModeId = this.modeId;
    this._applyModeImpl();
    try {
      localStorage.setItem('arcade_' + gameId + '_played', 'true');
      localStorage.setItem('arcade_' + gameId + '_' + this.modeId + '_played', 'true');
      localStorage.setItem('arcade_any_played', 'true');
    } catch (e) {}

    this.active = true;
    this.currentGame = gameId;
    this.finished = false;
    this.finishT = 0;
    this.result = '';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timer = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.lastSummary = null;

    this.buildRoom(gameId);

    // 状态安全重置（满状态进入特训）
    Player.hp = Player.maxHp;
    Player.shield = Player.maxShield;
    Player.alive = true;
    Player.invulnTimer = 1.0;
    Player.rollT = 0; Player.dashT = 0; Player.rollCd = 0;
    Player.lightningCharges = [];
    Player.attacks = [];

    Main.camX = this.room.worldX;
    Main.camY = this.room.worldY;

    UI.hideInteract();
    if (UI.hideArcadeMenu) UI.hideArcadeMenu();

    this._forcingWeapon = true;
    this.lockedWeapon = 1; // 太刀
    Player.setWeapon(1, true);
    this._initIaijutsu();
    if (window.SFX && SFX.playIaijutsuBgm) SFX.playIaijutsuBgm();
    if (window.IaijutsuMode && IaijutsuMode.applyGameCursor) {
      IaijutsuMode.applyGameCursor(this.getEquippedIaiSkin());
    }
    this._forcingWeapon = false;

    SFX.play('portal');
    var meta = this.getModeMeta();
    UI.flashBanner(meta.emoji + ' ' + meta.name + ' · 特训开始！', 2.8);
  },

  // 把 window.IaijutsuMode / IaijutsuTargets 临时指向对应实现，
  // 这样原版模块内部的 this.xxx 与 IaijutsuUltimates 里的全局调用都会走新模式。
  _applyModeImpl: function () {
    var meta = this.getModeMeta();
    window.IaijutsuMode = meta.modeImpl || this._baseModeImpl;
    window.IaijutsuTargets = meta.targetsImpl || this._baseTargetsImpl;
    this._modeImplApplied = !!(meta.modeImpl || meta.targetsImpl);
  },

  _restoreModeImpl: function () {
    window.IaijutsuMode = this._baseModeImpl;
    window.IaijutsuTargets = this._baseTargetsImpl;
    this._modeImplApplied = false;
  },

  _initIaijutsu: function () {
    if (window.IaijutsuUltimates && window.IaijutsuUltimates.cleanup) {
      window.IaijutsuUltimates.cleanup(this);
    }
    if (window.IaijutsuMode) {
      window.IaijutsuMode.init(this);
    }
  },

  _updateIaijutsu: function (dt, mouseWorld, input) {
    if (window.IaijutsuMode) {
      window.IaijutsuMode.update(dt, mouseWorld, input, this);
    }
  },

  // 离开本局（Esc / 结算后自动）
  leave: function () {
    this.active = false;
    this.currentGame = null;
    this.lockedWeapon = null;
    this.finished = false;

    if (window.SFX) {
      if (SFX.stopIaijutsuBgm) SFX.stopIaijutsuBgm();
    }

    if (window.IaijutsuMode && IaijutsuMode.restoreDefaultCursor) {
      IaijutsuMode.restoreDefaultCursor();
    }
    if (window.IaijutsuUltimates && window.IaijutsuUltimates.cleanup) {
      window.IaijutsuUltimates.cleanup(this);
    }
    // 还原全局实现，避免下一次启动仍指向异靶版
    this._restoreModeImpl();

    if (window.UI && UI.onRunLeft) UI.onRunLeft();
  },

  // 结算（3 次断连）
  finishGame: function (result, msg) {
    if (this.finished) return;
    this.finished = true;
    this.finishT = 3.2;
    this.result = result;

    var gameId = this.currentGame;
    var finalVal = this.maxCombo;
    var isNewHigh = this.saveHighScore(gameId, finalVal);
    var meta = this.getModeMeta();

    var rewardMoney = Math.min(300, Math.max(20, Math.floor(finalVal * 2)));
    var rewardShards = Math.min(25, Math.max(2, Math.floor(finalVal / 4)));
    Player.money += rewardMoney;
    Player.shards += rewardShards;

    this.lastSummary = {
      maxCombo: finalVal,
      isNewHigh: isNewHigh,
      rewardMoney: rewardMoney,
      rewardShards: rewardShards,
      modeId: this.modeId,
      modeName: meta.name,
      result: result,
      msg: msg || ''
    };

    var bannerText = (result === 'win' ? '🏆 ' : '🎯 ') + meta.name + ' · 结算完成！';
    if (isNewHigh) {
      bannerText = '🌟 刷新历史纪录！' + finalVal + ' ' + meta.unit + '！' + bannerText;
      SFX.play('victory');
    } else {
      SFX.play(result === 'win' ? 'victory' : 'portal');
    }
    UI.flashBanner(bannerText + ' (💰+' + rewardMoney + ' 🔷+' + rewardShards + ')', 3.5);
  },

  addFloatText: function (x, y, text, color, scale) {
    this.floatingTexts.push({
      x: x, y: y, text: text,
      color: color || '#ffd66b',
      scale: scale || 1.0,
      life: 1.0, maxLife: 1.0,
      vy: -35
    });
  },

  addExplosion: function (x, y, color, count) {
    count = count || 12;
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 40 + Math.random() * 160;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: color || '#ffd66b',
        size: 2.5 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8
      });
    }
  },

  // ========================== 主更新 ==========================
  update: function (dt) {
    if (!this.active) return;

    // 打开特效商店 / 工坊（按 B）时暂停整局
    var isIaiHubOpen = (this.currentGame === 'iaijutsu') && window.UI && (
      (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
      (UI.isIaiShopOpen && UI.isIaiShopOpen())
    );
    var isSettingsOpen = window.UI && UI.isSettingsOpen && UI.isSettingsOpen();

    if (isIaiHubOpen || isSettingsOpen) {
      if (this.room) {
        Main.camX = this.room.worldX;
        Main.camY = this.room.worldY;
      }
      // 消费并清空输入，防止面板里的点击在关闭时误触发冲刺
      Input.leftPressed = false;
      Input.rightPressed = false;
      Input.spacePressed = false;
      return;
    }

    this.timer = (this.timer || 0) + dt;

    if (this.finished) {
      this.finishT -= dt;
      if (this.finishT <= 0) {
        this.leave();
      }
      return;
    }

    if (this.room) {
      Main.camX = this.room.worldX;
      Main.camY = this.room.worldY;
    }

    // 捕获本帧按键输入供居合模块消费
    var input = {
      leftPressed: Input.leftPressed,
      rightPressed: Input.rightPressed,
      spacePressed: Input.spacePressed,
      mouseDown: Input.mouseDown,
      rightDown: Input.rightDown,
      keysJustPressed: Input.keysJustPressed || {},
      lastAttackSource: Input.lastAttackSource || 'mouse',
      lastInputDevice: Input.lastInputDevice || 'mouse'
    };
    Input.leftPressed = false;
    Input.rightPressed = false;
    Input.spacePressed = false;
    Input.keysJustPressed = {};

    var mouse = Input.logicalPos ? Input.logicalPos() : { x: Player.x, y: Player.y };
    var camX = (window.Main && Main.camX !== undefined) ? Main.camX : 0;
    var camY = (window.Main && Main.camY !== undefined) ? Main.camY : 0;
    var mouseWorld = { x: mouse.x + camX, y: mouse.y + camY };

    Player.update(dt, this.room.colliders, mouseWorld);
    this._updateIaijutsu(dt, mouseWorld, input);

    // 粒子与浮动文字
    for (var pIdx = this.particles.length - 1; pIdx >= 0; pIdx--) {
      var p = this.particles[pIdx];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(pIdx, 1);
      } else {
        if (p.vx) p.x += p.vx * dt;
        if (p.vy) p.y += p.vy * dt;
        if (p.vRot) p.rot = (p.rot || 0) + p.vRot * dt;
        if (p.type === 'sakura_petal') {
          p.x += Math.sin((p.life || 0) * 8) * 12 * dt;
        }
      }
    }

    for (var fIdx = this.floatingTexts.length - 1; fIdx >= 0; fIdx--) {
      var ft = this.floatingTexts[fIdx];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(fIdx, 1);
    }
  },

  // ========================== 主渲染 ==========================
  render: function (ctx) {
    if (!this.active || !this.room) return;
    var room = this.room;
    var rx = room.worldX, ry = room.worldY;
    var rw = room.w, rh = room.h;

    // 1. 赛博街机场地背景
    ctx.save();
    var bgGrad = ctx.createRadialGradient(rx + rw / 2, ry + rh / 2, 50, rx + rw / 2, ry + rh / 2, rw * 0.7);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(rx, ry, rw, rh);

    var gridPulse = 0.08 + 0.02 * Math.sin((this.timer || 0) * 1.8);
    ctx.strokeStyle = 'rgba(56, 189, 248, ' + gridPulse.toFixed(3) + ')';
    ctx.lineWidth = 1;
    for (var gx = rx; gx < rx + rw; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, ry); ctx.lineTo(gx, ry + rh); ctx.stroke();
    }
    for (var gy = ry; gy < ry + rh; gy += 40) {
      ctx.beginPath(); ctx.moveTo(rx, gy); ctx.lineTo(rx + rw, gy); ctx.stroke();
    }

    var borderAlpha = 0.45 + 0.15 * Math.sin((this.timer || 0) * 2.5);
    ctx.strokeStyle = 'rgba(56, 189, 248, ' + borderAlpha.toFixed(3) + ')';
    ctx.lineWidth = 4;
    ctx.strokeRect(rx + 8, ry + 8, rw - 16, rh - 16);

    // 2. 居合斩场景（道场背景 / 领域 / 靶位）
    if (window.IaijutsuMode) {
      window.IaijutsuMode.render(ctx, this);
    }

    // 3. 皮肤专属粒子
    for (var pIdx = 0; pIdx < this.particles.length; pIdx++) {
      var pt = this.particles[pIdx];
      var alpha = Utils.clamp(pt.life / pt.maxLife, 0, 1);
      if (pt.isLaser) {
        ctx.save();
        ctx.lineCap = 'round';
        var sId = pt.skinId || 'classic';
        if (sId === 'zen') {
          ctx.strokeStyle = 'rgba(10, 15, 29, ' + (alpha * 0.95).toFixed(3) + ')';
          ctx.lineWidth = 6.5 * alpha + 1.5;
          ctx.beginPath(); ctx.moveTo(pt.x0, pt.y0); ctx.lineTo(pt.x1, pt.y1); ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, ' + (alpha * 0.98).toFixed(3) + ')';
          ctx.lineWidth = 2.8 * alpha + 0.8;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(148, 163, 184, ' + (alpha * 0.8).toFixed(3) + ')';
          ctx.lineWidth = 1.0 * alpha;
          ctx.stroke();
        } else if (sId === 'water') {
          ctx.strokeStyle = 'rgba(3, 105, 161, ' + (alpha * 0.9).toFixed(3) + ')';
          ctx.lineWidth = 7.5 * alpha + 2.0;
          ctx.beginPath(); ctx.moveTo(pt.x0, pt.y0); ctx.lineTo(pt.x1, pt.y1); ctx.stroke();

          ctx.strokeStyle = 'rgba(14, 165, 233, ' + (alpha * 0.95).toFixed(3) + ')';
          ctx.lineWidth = 4.2 * alpha + 1.2;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(224, 242, 254, ' + (alpha * 0.98).toFixed(3) + ')';
          ctx.lineWidth = 1.8 * alpha + 0.6;
          ctx.stroke();
        } else {
          ctx.strokeStyle = pt.secondaryColor || '#2563eb';
          ctx.lineWidth = 6.5 * alpha + 1.5;
          ctx.beginPath(); ctx.moveTo(pt.x0, pt.y0); ctx.lineTo(pt.x1, pt.y1); ctx.stroke();

          ctx.strokeStyle = pt.primaryColor || '#00f0ff';
          ctx.lineWidth = 3.5 * alpha + 1;
          ctx.stroke();

          ctx.strokeStyle = pt.coreColor || '#ffffff';
          ctx.lineWidth = 1.2 * alpha + 0.5;
          ctx.stroke();
        }
        ctx.restore();
      } else if (pt.type === 'sakura_petal') {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot || 0);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color || '#f472b6';
        ctx.beginPath();
        var ps = (pt.size || 5) * (0.6 + alpha * 0.4);
        ctx.ellipse(0, 0, ps * 1.3, ps * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.ellipse(-ps * 0.2, 0, ps * 0.55, ps * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'ink_drop') {
        ctx.save();
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = pt.color || '#0a0f1d';
        ctx.beginPath();
        var isz = (pt.size || 4) * (0.65 + alpha * 0.35);
        ctx.arc(pt.x, pt.y, isz, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pt.color === '#ffffff' ? '#0a0f1d' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = pt.color === '#ffffff' ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x - isz * 0.3, pt.y - isz * 0.3, isz * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'spark') {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot || 0);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color || '#facc15';
        var sprkR = (pt.size || 5) * (0.6 + alpha * 0.4);
        ctx.beginPath();
        ctx.moveTo(0, -sprkR * 1.5);
        ctx.lineTo(sprkR * 0.35, 0);
        ctx.lineTo(0, sprkR * 1.5);
        ctx.lineTo(-sprkR * 0.35, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, sprkR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'ember') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color || '#ff3b30';
        var embR = (pt.size || 3.5) * (0.5 + alpha * 0.5);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, embR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, embR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'lightning_spark') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = pt.color || '#22d3ee';
        ctx.lineWidth = 2.2 * alpha + 0.5;
        ctx.beginPath();
        var lx0 = pt.x - 4;
        var ly0 = pt.y - 4;
        var lx1 = pt.x + 5;
        var ly1 = pt.y + 5;
        ctx.moveTo(lx0, ly0);
        ctx.lineTo(pt.x + 2, pt.y - 2);
        ctx.lineTo(lx1, ly1);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else if (pt.type === 'void_shard') {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot || 0);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color || '#ff007f';
        var vsz = (pt.size || 4) * (0.5 + alpha * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -vsz);
        ctx.lineTo(vsz * 0.7, vsz * 0.5);
        ctx.lineTo(-vsz * 0.7, vsz * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else if (pt.type === 'water_drop') {
        ctx.save();
        ctx.globalAlpha = alpha;
        var wAng = Math.atan2(pt.vy, pt.vx);
        ctx.translate(pt.x, pt.y);
        ctx.rotate(wAng);
        var wds = (pt.size || 4) * (0.6 + alpha * 0.4);
        ctx.fillStyle = pt.color || '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(0, 0, wds * 1.5, wds * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.ellipse(-wds * 0.3, -wds * 0.2, wds * 0.5, wds * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'water_ripple') {
        ctx.save();
        var rProgress = 1 - alpha;
        var curR = (pt.r || 4) + rProgress * ((pt.maxR || 20) - (pt.r || 4));
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = pt.color || '#38bdf8';
        ctx.lineWidth = 2.0 * alpha + 0.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, curR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (alpha * 0.9).toFixed(3) + ')';
        ctx.lineWidth = 1.0 * alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, curR - 2.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. 浮动文字
    for (var fIdx = 0; fIdx < this.floatingTexts.length; fIdx++) {
      var ft = this.floatingTexts[fIdx];
      var fAlpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.font = 'bold ' + Math.round(16 * ft.scale) + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = fAlpha;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 5. 顶层 HUD
    this._renderHud(ctx);

    ctx.restore();
  },

  // ========================== 仪表盘 HUD ==========================
  _renderHud: function (ctx) {
    var room = this.room;
    var rx = room.worldX, ry = room.worldY;
    var meta = this.getModeMeta();
    var high = this.getModeHighScore();

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 顶部标题背景条
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(rx + 20, ry + 16, CFG.W - 40, 48);
    ctx.strokeRect(rx + 20, ry + 16, CFG.W - 40, 48);

    // 游戏名称与武器锁定标识
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    var wLabel = ' [🔒太刀]';
    // 新模式可用短名，避免和右侧"连斩"状态在 960px 下挤在一起
    var titleName = meta.hudTitle || meta.name || '街机特训';
    ctx.fillText(meta.emoji + ' ' + titleName + wLabel, rx + 36, ry + 28);

    // 当前得分 / 状态数据
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    var statText = '得分: ' + this.score;
    var curL = this.iaijutsuData ? this.iaijutsuData.lives : 3;
    var heartStr = '❤️'.repeat(Math.max(0, curL)) + '🖤'.repeat(Math.max(0, 3 - curL));
    var isUlt = this.iaijutsuData && this.iaijutsuData.ultimateTimer > 0;
    var isFrenzy = this.iaijutsuData && this.iaijutsuData.frenzyTimer > 0;
    var isInf = !!(this.iaijutsuData && this.iaijutsuData.infiniteUlt);
    var ultDef = (window.IaijutsuUltimates && window.IaijutsuUltimates.getEquippedUltimate) ? window.IaijutsuUltimates.getEquippedUltimate() : { name: '无我之境', emoji: '🌌' };
    var activeUlt = (this.iaijutsuData && this.iaijutsuData.activeUltDef) || ultDef;
    var tierTag = '';
    if (isUlt) tierTag = ' ' + activeUlt.emoji + '[' + activeUlt.name + ']';
    else if (isInf) tierTag = ' ⚡[' + ultDef.name + '就绪·空格开大(无CD)]';
    else if (this.combo >= 50) tierTag = ' 👑[' + ultDef.name + '就绪·空格释放]';
    else if (this.combo >= 20) tierTag = ' 🔥[居合神域]';
    else if (this.combo >= 10) tierTag = ' ⚡[电光石火]';
    else if (this.combo >= 5) tierTag = ' ✨[疾风连闪]';

    var stateDesc = isUlt ? (activeUlt.emoji + ' ' + activeUlt.name + ': ' + this.iaijutsuData.ultimateTimer.toFixed(1) + 's') :
      (isFrenzy ? ('⚡ 狂暴无限: ' + this.iaijutsuData.frenzyTimer.toFixed(1) + 's') : ('居合状态: ' + heartStr + ' (断连 ' + (3 - curL) + '/3)'));

    statText = '连斩: ' + this.combo + tierTag + ' (最高 ' + this.maxCombo + ') | ' + stateDesc;

    // 宿敌战：顶部一行本来就挤，去掉段位标签与无我提示，只留连斩/命数
    if (this.modeId === 'boss') {
      statText = '连斩: ' + this.combo + ' (最高 ' + this.maxCombo + ') | ' + heartStr +
        ' 断连 ' + Math.max(0, 3 - curL) + '/3';
    }

    ctx.fillStyle = (this.iaijutsuData && (this.iaijutsuData.ultimateTimer > 0 || this.iaijutsuData.frenzyTimer > 0)) ? '#fde047' : '#38bdf8';
    ctx.fillText(statText, rx + 280, ry + 29);

    // HUD 顶部居右显示【无CD无我: ON / OFF (按T或点击切换)】测试按钮
    // 宿敌战封印无我，这个按钮只会误导，直接不画
    if (this.iaijutsuData && this.modeId !== 'boss') {
      var isInfMode = !!this.iaijutsuData.infiniteUlt;
      var btnX = rx + CFG.W - 550;
      var btnY = ry + 22;
      var btnW = 160;
      var btnH = 34;

      ctx.save();
      ctx.fillStyle = isInfMode ? 'rgba(234, 179, 8, 0.28)' : 'rgba(30, 41, 59, 0.75)';
      ctx.strokeStyle = isInfMode ? '#facc15' : '#475569';
      ctx.lineWidth = isInfMode ? 2 : 1;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isInfMode ? '#fef08a' : '#94a3b8';
      ctx.fillText(isInfMode ? '⚡ 无CD无我: ON [T]' : '⚡ 无CD无我: OFF [T]', btnX + btnW / 2, btnY + btnH / 2);
      ctx.restore();
    }

    // 历史最高分与退出提示
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd66b';
    ctx.fillText('🏆 历史纪录: ' + high + ' ' + (meta.unit || '') + ' (Esc 退出)', rx + CFG.W - 36, ry + 29);

    if (this.iaijutsuData) {
      var dData = this.iaijutsuData;
      var curSkin = this.getEquippedIaiSkin();

      // 1. 无我大招倒计时条
      if (dData.ultimateTimer > 0) {
        ctx.save();
        var uTimer = dData.ultimateTimer;
        var uMax = dData.ultimateMaxTimer || 5.0;
        var uPct = Math.min(1.0, Math.max(0, uTimer / uMax));

        var uBarW = 240;
        var uBarH = 36;
        var uBarX = rx + CFG.W - uBarW - 24;
        var uBarY = ry + 72;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(uBarX, uBarY, uBarW, uBarH, 8);
        else ctx.rect(uBarX, uBarY, uBarW, uBarH);
        ctx.fill();
        ctx.stroke();

        var uFillW = (uBarW - 8) * uPct;
        if (uFillW > 0) {
          var uBarGrad = ctx.createLinearGradient(uBarX + 4, 0, uBarX + 4 + uFillW, 0);
          uBarGrad.addColorStop(0, '#38bdf8');
          uBarGrad.addColorStop(0.5, '#c084fc');
          uBarGrad.addColorStop(1, '#fde047');
          ctx.fillStyle = uBarGrad;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(uBarX + 4, uBarY + 4, uFillW, uBarH - 8, 4);
          else ctx.rect(uBarX + 4, uBarY + 4, uFillW, uBarH - 8);
          ctx.fill();
        }

        ctx.font = 'bold 13px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var activeUltDef = dData.activeUltDef || (window.IaijutsuUltimates ? window.IaijutsuUltimates.getEquippedUltimate() : { name: '无我之境', emoji: '🌌' });
        ctx.fillText(activeUltDef.emoji + ' 【' + activeUltDef.name + '】' + uTimer.toFixed(1) + 's (瞬杀 ' + dData.ultimateHits + ' 连)', uBarX + uBarW / 2, uBarY + uBarH / 2);
        ctx.restore();
      } else if (dData.frenzyTimer > 0) {
        // 2. 狂暴 3 秒倒计时条
        ctx.save();
        var fTimer = dData.frenzyTimer;
        var fMax = dData.frenzyMaxTimer || 3.0;
        var fPct = Math.min(1.0, Math.max(0, fTimer / fMax));
        var isEnding = fTimer <= 1.0;

        var barW = 200;
        var barH = 34;
        var barX = rx + CFG.W - barW - 24;
        var barY = ry + 72;

        var showBox = true;
        if (isEnding) showBox = Math.floor(this.timer * 12) % 2 === 0;

        if (showBox) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = isEnding ? '#ef4444' : '#facc15';
          ctx.lineWidth = 2;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 8);
          else ctx.rect(barX, barY, barW, barH);
          ctx.fill();
          ctx.stroke();

          var fillW = (barW - 8) * fPct;
          if (fillW > 0) {
            var barGrad = ctx.createLinearGradient(barX + 4, 0, barX + 4 + fillW, 0);
            if (isEnding) {
              barGrad.addColorStop(0, '#f97316');
              barGrad.addColorStop(1, '#ef4444');
            } else {
              barGrad.addColorStop(0, '#fde047');
              barGrad.addColorStop(1, '#f59e0b');
            }
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(barX + 4, barY + 4, fillW, barH - 8, 4);
            else ctx.rect(barX + 4, barY + 4, fillW, barH - 8);
            ctx.fill();
          }

          ctx.font = 'bold 13px "Segoe UI", sans-serif';
          ctx.fillStyle = isEnding ? '#ffffff' : '#0f172a';
          ctx.shadowBlur = 0;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡ 狂暴无限: ' + fTimer.toFixed(1) + 's', barX + barW / 2, barY + barH / 2);
        }
        ctx.restore();
      } else if (dData.ultimateCharge >= (dData.ultimateChargeMax || 100)) {
        // 3. 充能满溢提示徽章
        ctx.save();
        var pX = rx + CFG.W - 250;
        var pY = ry + 72;
        var pScale = 1.0 + Math.sin(this.timer * 8) * 0.04;
        ctx.translate(pX + 115, pY + 18);
        ctx.scale(pScale, pScale);

        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-115, -18, 230, 36, 18);
        else ctx.rect(-115, -18, 230, 36);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ [按空格 SPACE] 释放无我大招!', 0, 0);
        ctx.restore();
      } else if (dData.ultimateCharge > 0) {
        // 4. 充能进度槽
        ctx.save();
        var cBarW = 160;
        var cBarH = 26;
        var cBarX = rx + CFG.W - cBarW - 24;
        var cBarY = ry + 72;
        var cPct = Math.min(1.0, (dData.ultimateCharge || 0) / (dData.ultimateChargeMax || 100));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cBarX, cBarY, cBarW, cBarH, 6);
        else ctx.rect(cBarX, cBarY, cBarW, cBarH);
        ctx.fill();
        ctx.stroke();

        var cFillW = (cBarW - 6) * cPct;
        if (cFillW > 0) {
          var cGrad = ctx.createLinearGradient(cBarX + 3, 0, cBarX + 3 + cFillW, 0);
          cGrad.addColorStop(0, '#0284c7');
          cGrad.addColorStop(1, '#38bdf8');
          ctx.fillStyle = cGrad;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cBarX + 3, cBarY + 3, cFillW, cBarH - 6, 4);
          else ctx.rect(cBarX + 3, cBarY + 3, cFillW, cBarH - 6);
          ctx.fill();
        }

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('无我充能: ' + dData.ultimateCharge + '/' + (dData.ultimateChargeMax || 100), cBarX + cBarW / 2, cBarY + cBarH / 2);
        ctx.restore();
      }

      // 皮肤与工坊快捷键提示小卡片
      ctx.save();
      var skX = rx + 24;
      var skY = ry + 72;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = curSkin.primaryColor || '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(skX, skY, 170, 30, 15);
      else ctx.rect(skX, skY, 170, 30);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(curSkin.emoji + ' 特效: ' + curSkin.name + ' [按B]', skX + 85, skY + 15);
      ctx.restore();

      // 模式扩展信息（新靶速查；原版留空，保持界面一致）
      if (meta.legend) {
        ctx.save();
        var lgX = rx + 24;
        var lgY = ry + CFG.H - 44;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        // 按文字实际宽度撑开，避免长速查条被裁掉
        var lgW = 300;
        try {
          var lgM = ctx.measureText(meta.legend);
          if (lgM && lgM.width) lgW = Math.max(300, lgM.width + 26);
        } catch (e) {}

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lgX, lgY, lgW, 26, 13);
        else ctx.rect(lgX, lgY, lgW, 26);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(meta.legend, lgX + 12, lgY + 13);
        ctx.restore();
      }
    }

    // 连斩高光动态徽章
    if (this.combo > 0) {
      ctx.save();
      var cX = rx + CFG.W / 2;
      var cY = ry + 86;
      var comboScale = Math.min(1.35, 1.0 + this.combo * 0.012);

      ctx.translate(cX, cY);
      ctx.scale(comboScale, comboScale);

      var isHighTier = this.combo >= 15;
      var strokeColor = this.combo >= 20 ? '#f97316' : (this.combo >= 10 ? '#c084fc' : '#38bdf8');
      var textColor = this.combo >= 20 ? '#fde047' : (this.combo >= 10 ? '#f472b6' : '#38bdf8');
      var comboIcon = this.combo >= 20 ? '👑' : (this.combo >= 10 ? '🔥' : '⚡');

      ctx.fillStyle = this.combo >= 20 ? 'rgba(234, 88, 12, 0.25)' : (this.combo >= 10 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(15, 23, 42, 0.45)');
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = isHighTier ? 14 : 8;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-110, -18, 220, 36, 18);
      } else {
        ctx.rect(-110, -18, 220, 36);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 17px "Segoe UI", sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comboIcon + ' 居合连斩 x' + this.combo + (this.combo >= 10 ? ' · 狂热!' : ''), 0, 0);
      ctx.restore();
    }

    // 高光突破横幅（纯发光文字）
    if (this.iaijutsuData && this.iaijutsuData.bannerTimer > 0) {
      var dBanner = this.iaijutsuData;
      dBanner.bannerTimer -= 0.016;
      var alpha = Math.min(1.0, dBanner.bannerTimer / 0.45);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 26px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 20;
      ctx.fillText(dBanner.bannerText, rx + CFG.W / 2, ry + 136);
      ctx.restore();
    }

    ctx.restore();
  }
};
