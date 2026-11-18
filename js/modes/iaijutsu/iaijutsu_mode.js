// ============================================================================
// 居合斩专属模块 · 主模式控制器 (Iaijutsu Dash Core Game Mode Controller)
// ============================================================================

window.IaijutsuMode = {
  /**
   * 初始化居合斩游戏模式
   */
  init: function (mg) {
    var rx = mg.room.worldX;
    var ry = mg.room.worldY;
    Player.x = rx + CFG.W / 2;
    Player.y = ry + CFG.H / 2;
    Player.vx = 0;
    Player.vy = 0;

    // 清空技能与冲刺冷却
    Player.skillTimers[1] = 0;
    Player.invulnTimer = 0.5;
    try { localStorage.setItem('arcade_iaijutsu_played', 'true'); } catch (e) {}

    mg.iaijutsuData = {
      lives: 3,               // 允许失误 3 次，第 4 次断连则失败
      dummies: [],
      bulletTime: 0,
      isDashing: false,
      currentDashHits: 0,
      prevPos: { x: Player.x, y: Player.y },
      ultimateCharge: 0,      // 独立无我大招充能点数 (满100点充能就绪)
      ultimateChargeMax: 100, // 充能上限 100 个靶子
      specialCooldown: 0,     // 黄色狂暴金靶刷新冷却（生成后至少间隔 10 秒才允许下一次出现）
      frenzyTimer: 0,         // 3秒无限居合狂暴时长
      frenzyMaxTimer: 3.0,
      infiniteUlt: (function () {
        try { return localStorage.getItem('iaijutsu_infinite_ult') === '1'; } catch (e) { return false; }
      })(),
      ultimateTimer: 0,       // 5秒无我大招时长
      ultimateMaxTimer: 5.0,
      ultimateHits: 0,        // 大招期间斩杀统计
      ultimateTargetIdx: 0,   // 大招自动突进锁定的目标索引
      ultimateNextSlashTime: 0,// 大招斩杀间隔计时
      ultimatePauseTimer: 0,  // 5s无我结束后的短暂屏息蓄力停顿（0.36s）
      finisherRespawnTimer: 0,// 冲击波触发后0.5s准时重新刷靶
      finisherWaves: [],      // 终焉全域冲击波实体列表
      bannerTimer: 0,         // 高光横幅计时
      bannerText: '',
      bannerSub: ''
    };

    this.spawnDummies(4, mg);

    // ⚔️ 循环播放居合斩专属背景音乐
    if (window.SFX && SFX.playIaijutsuBgm) {
      SFX.playIaijutsuBgm();
    }
  },

  /**
   * 刷新生成靶子（包含普通靶、黄色狂暴金靶、移动/飞梭靶）
   */
  spawnDummies: function (count, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    // 检查场上是否已有特殊傀儡，以及是否处于 10 秒刷新内置冷却中
    var hasSpecial = false;
    var shuttleCount = 0;
    for (var j = 0; j < data.dummies.length; j++) {
      if (data.dummies[j].isSpecial) hasSpecial = true;
      if (data.dummies[j].isShuttle) shuttleCount++;
    }
    var canSpawnSpecial = !hasSpecial && (!data.specialCooldown || data.specialCooldown <= 0);

    for (var i = 0; i < count; i++) {
      var tType = window.IaijutsuTargets.TYPE_NORMAL;

      // 1. 严格按照 3% 概率刷新特殊黄金靶子，且两次出现之间至少间隔 10 秒
      if (canSpawnSpecial && Math.random() < 0.03) {
        tType = window.IaijutsuTargets.TYPE_SPECIAL;
        hasSpecial = true;
        canSpawnSpecial = false;
        data.specialCooldown = 10.0; // 设定 10 秒冷却
      } else if (shuttleCount < 2 && Math.random() < 0.08) {
        // 2. 移动/飞梭靶 (Shuttle Target 🚀)：精准降至 8% 概率刷新，场上最多同时存在 2 个
        tType = window.IaijutsuTargets.TYPE_SHUTTLE;
        shuttleCount++;
      }

      var dm = window.IaijutsuTargets.createDummy(mg.room, Player, { type: tType });
      data.dummies.push(dm);
    }
  },

  /**
   * 🐷 居合断连惩罚与特效
   */
  triggerDisconnect: function (x, y, reason, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    // 狂暴或无我期间绝对免除断连惩罚！
    if (data.frenzyTimer > 0 || data.ultimateTimer > 0 || data.ultimatePauseTimer > 0) return;

    data.lives--;
    SFX.play('hurt');
    SFX.play('parry');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);

    var text = reason === 'miss' ? '🐷 小猪手发力了！(居合挥空)' : '🐷 小猪手发力了！(超时断连)';
    FX.floatText(x, y - 30, text, '#f43f5e', 2.0);

    // 爆散小猪手与粉色断连光斑
    for (var p = 0; p < 8; p++) {
      var pAng = Math.random() * Math.PI * 2;
      var pSpd = 50 + Math.random() * 80;
      mg.particles.push({
        x: x,
        y: y,
        vx: Math.cos(pAng) * pSpd,
        vy: Math.sin(pAng) * pSpd,
        size: 5 + Math.random() * 4,
        color: '#fb7185',
        life: 0.5,
        maxLife: 0.5
      });
    }

    // 连击归零
    mg.combo = 0;

    // 3 次断连直接特训结束
    if (data.lives <= 0) {
      mg.finishGame('lose', '⚔️ 居合断连 3 次，特训结束！');
    }
  },

  /**
   * 释放【无我】绝杀大招
   */
  triggerUltimate: function (mg) {
    if (window.IaijutsuUltimates && window.IaijutsuUltimates.trigger) {
      window.IaijutsuUltimates.trigger(mg);
      return;
    }

    var data = mg.iaijutsuData;
    if (!data) return;

    data.ultimateCharge = 0;
    data.ultimateTimer = data.ultimateMaxTimer || 5.0;
    data.ultimateHits = 0;
    data.ultimateNextSlashTime = 0;
    data.ultimatePauseTimer = 0;
    data.finisherRespawnTimer = 0;

    SFX.play('victory');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);

    data.bannerTimer = 3.5;
    data.bannerText = '🌌 【无我之境】开启！5秒绝杀瞬影！';
    data.bannerSub = '疾风破空 · 万物皆斩';

    // 瞬间在全图铺满 16 个靶位
    this.spawnDummies(16, mg);
  },

  /**
   * 切换【无CD无我】测试模式
   */
  toggleInfiniteUlt: function (mg) {
    var data = mg.iaijutsuData;
    if (!data) return;
    data.infiniteUlt = !data.infiniteUlt;
    try {
      localStorage.setItem('iaijutsu_infinite_ult', data.infiniteUlt ? '1' : '0');
    } catch (e) {}

    if (window.SFX) {
      SFX.play(data.infiniteUlt ? 'powerup' : 'click');
    }
    if (window.FX && FX.floatText) {
      FX.floatText(
        Player.x, Player.y - 45,
        data.infiniteUlt ? '⚡【无CD无我】已开启！空格随时开大！' : '⚡【无CD无我】已关闭',
        data.infiniteUlt ? '#facc15' : '#94a3b8',
        1.8
      );
    }
    if (window.UI && UI.flashBanner) {
      UI.flashBanner(data.infiniteUlt ? '⚡【无CD无我测试模式】已开启！按空格随时释放大招！' : '⚡【无CD无我测试模式】已关闭', 2.0);
    }
  },

  /**
   * 斩中并消灭靶子
   */
  onKill: function (dm, isDash, hitAngle, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
    var isSpecial = dm.isSpecial;
    var isShuttle = dm.isShuttle;
    var isUlt = data.ultimateTimer > 0;

    mg.combo += (isShuttle ? 2 : 1); // 斩杀飞梭靶奖励双倍连击！
    if (mg.combo > mg.maxCombo) {
      mg.maxCombo = mg.combo;
      mg.saveHighScore('iaijutsu', mg.maxCombo);
    }

    // 只有在【无我大招及终焉冲击波彻底结束、新靶位刷新后】斩下的靶子才开始计入充能！
    var isBusyClearing = (data.ultimateTimer > 0) || (data.ultimatePauseTimer > 0) || (data.finisherRespawnTimer > 0) || (data.finisherWaves && data.finisherWaves.length > 0);
    if (!isBusyClearing) {
      if (!data.ultimateCharge) data.ultimateCharge = 0;
      var maxCharge = data.ultimateChargeMax || 100;
      var prevCharge = data.ultimateCharge;
      var chargeInc = isSpecial ? 3 : (isShuttle ? 2 : 1);
      data.ultimateCharge = Math.min(maxCharge, data.ultimateCharge + chargeInc);

      // 刚好充能达到上限 (100 点) 时触发就绪提示
      if (prevCharge < maxCharge && data.ultimateCharge >= maxCharge) {
        data.bannerTimer = 3.2;
        data.bannerText = '⚡ 充能满溢！按【空格】激活【无我】绝杀大招！';
        SFX.play('victory');
      }
    }

    // 触发子弹时间与音效
    data.bulletTime = isUlt ? 0 : 0.16;
    SFX.play('hit');
    SFX.play('iai');

    // 刷新居合斩冷却，并给予短暂无敌帧
    Player.skillTimers[1] = 0;
    Player.invulnTimer = Math.max(Player.invulnTimer, 0.28);

    if (isSpecial) {
      // 斩中特殊黄金靶：激活 3 秒无限居合狂暴状态！
      data.frenzyTimer = data.frenzyMaxTimer || 3.0;
      SFX.play('victory');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);

      mg.addExplosion(dm.x, dm.y, '#facc15', 36);
      mg.addExplosion(dm.x, dm.y, '#ffffff', 20);
      FX.floatText(dm.x, dm.y - 36, '⚡⚡ 狂暴神域！3秒无限居合·免断连！', '#facc15', 1.5);
      this.spawnDummies(3, mg);

    } else if (isShuttle) {
      // 斩中移动飞梭靶：灵动破空额外极速奖励！
      mg.addExplosion(dm.x, dm.y, '#38bdf8', 28);
      mg.addExplosion(dm.x, dm.y, '#c084fc', 20);
      FX.floatText(dm.x, dm.y - 32, '🚀 飞梭瞬断！+2连击！', '#38bdf8', 1.3);
      this.spawnDummies(2, mg);

    } else {
      // 普通靶子击破
      mg.addExplosion(dm.x, dm.y, (skin && skin.primaryColor) || '#f59e0b', isUlt ? 22 : 18);
      var prefix = isUlt ? '🌌 无我百刃 x' : (isDash ? '⚡ 居合瞬杀 x' : '🗡️ 斩杀 x');
      FX.floatText(dm.x, dm.y - 20, prefix + mg.combo, (skin && skin.primaryColor) || '#38bdf8', 0.9);
    }

    // 达到里程碑连击时的耀眼文字播报
    if (mg.combo > 0 && mg.combo % 5 === 0 && !isUlt) {
      SFX.play('victory');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.35);
      var tierTitle = '⚔️ 连续居合 x' + mg.combo + ' 达成！';
      var tierSub = mg.combo >= 20 ? '「 居合神域 · 刀意破空 」' : (mg.combo >= 10 ? '「 瞬影流光 · 锋芒毕露 」' : '「 势如破竹 · 一气呵成 」');
      data.bannerTimer = 2.4;
      data.bannerText = tierTitle;
      data.bannerSub = tierSub;
    }
  },

  /**
   * 居合斩帧更新主逻辑
   */
  update: function (dt, mouseWorld, input, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    // 特训大殿/皮肤与音乐工坊开启时（按B切换皮肤或音乐）游戏完全暂停
    if (window.UI && (
      (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
      (UI.isIaiShopOpen && UI.isIaiShopOpen())
    )) {
      return;
    }

    data.timer = (data.timer || 0) + dt;
    mg.timer = (mg.timer || 0) + dt;

    var prevX = (data.prevPos && data.prevPos.x !== undefined) ? data.prevPos.x : Player.x;
    var prevY = (data.prevPos && data.prevPos.y !== undefined) ? data.prevPos.y : Player.y;

    // 快捷键 B 打开居合斩特效商店面板
    if (input.keysJustPressed && input.keysJustPressed['KeyB']) {
      if (window.UI && UI.openIaijutsuShop) {
        UI.openIaijutsuShop();
      }
    }

    // 快捷键 T 键或按 U 键：切换【无CD无我】测试模式
    if (input.keysJustPressed && (input.keysJustPressed['KeyT'] || input.keysJustPressed['KeyU'])) {
      this.toggleInfiniteUlt(mg);
    }

    // 检测点击 HUD 顶部上的【无CD无我】按钮
    var mLogical = (window.Input && Input.logicalPos) ? Input.logicalPos() : { x: (window.Input ? Input.mouseX : 0), y: (window.Input ? Input.mouseY : 0) };
    var infBtnX = CFG.W - 550;
    var infBtnY = 22;
    var infBtnW = 160;
    var infBtnH = 34;
    var isClickOnInfBtn = (input.leftPressed || input.leftClick) &&
      mLogical.x >= infBtnX && mLogical.x <= infBtnX + infBtnW &&
      mLogical.y >= infBtnY && mLogical.y <= infBtnY + infBtnH;

    if (isClickOnInfBtn) {
      this.toggleInfiniteUlt(mg);
      return;
    }

    // 1. 无我 (Ultimate) 状态处理：委托至全自动无我奥义系统进行全自动演武
    var isUltBusy = (data.ultimateTimer > 0) || (data.ultimatePauseTimer > 0) || (data.finisherWaves && data.finisherWaves.length > 0) || (data.finisherRespawnTimer > 0);
    if (isUltBusy && window.IaijutsuUltimates && window.IaijutsuUltimates.update) {
      window.IaijutsuUltimates.update(dt, mg);
    }

    // 5. 狂暴模式倒计时处理与持续无CD维护
    if (data.frenzyTimer > 0) {
      data.frenzyTimer -= dt;
      Player.skillTimers[1] = 0;
      if (data.frenzyTimer <= 0) {
        data.frenzyTimer = 0;
        FX.floatText(Player.x, Player.y - 30, '⚡ 狂暴神域结束', '#facc15', 1.0);
      }
    }

    // 特殊狂暴黄金靶刷新冷却倒计时
    if (data.specialCooldown > 0) {
      data.specialCooldown -= dt;
    }

    // 子弹时间缓速
    var effectiveDt = (data.bulletTime > 0 && data.ultimateTimer <= 0) ? dt * 0.35 : dt;
    if (data.bulletTime > 0) data.bulletTime -= dt;

    // 6. 傀儡倒计时与运动更新
    var isBusyClearing = (data.ultimateTimer > 0) || (data.ultimatePauseTimer > 0) || (data.finisherRespawnTimer > 0) || (data.finisherWaves && data.finisherWaves.length > 0);
    if (!isBusyClearing) {
      for (var i = data.dummies.length - 1; i >= 0; i--) {
        var d = data.dummies[i];
        d.time -= effectiveDt;

        // 更新靶位物理运动（包括飞梭靶的高速巡航机动）
        window.IaijutsuTargets.updateDummy(d, effectiveDt, mg.room, mg.particles);

        if (d.time <= 0) {
          data.dummies.splice(i, 1);
          this.triggerDisconnect(d.x, d.y, 'timeout', mg);
        }
      }
    }

    // 保持场上有足够的傀儡
    if (data.dummies.length < 3 && !isBusyClearing) {
      this.spawnDummies(3, mg);
    }

    // 斩击与冲刺方向：绝对锁定往鼠标光标所在方向移动与攻击（彻底移除键盘八方向锁定，确保手感指哪打哪）
    var aimAng = Math.atan2(mouseWorld.y - Player.y, mouseWorld.x - Player.x);
    Player.aimAngle = aimAng;

    // 7. 空格键激活无我大招
    if (input.spacePressed) {
      if (data.infiniteUlt) {
        // ⚡ 无CD无我测试模式：随时随地无条件开大，支持连续反复开大刷新测试！
        this.triggerUltimate(mg);
      } else if (data.ultimateTimer > 0) {
        // 已经在无我状态中
      } else if ((data.ultimateCharge || 0) >= (data.ultimateChargeMax || 100)) {
        this.triggerUltimate(mg);
      } else {
        var curC = data.ultimateCharge || 0;
        var maxC = data.ultimateChargeMax || 100;
        FX.floatText(Player.x, Player.y - 36, '⚠️ 【无我】大招充能未满！(' + curC + '/' + maxC + ')', '#fb7185', 1.2);
        SFX.play('empty');
      }
    }

    // 8. 触发常规居合斩（左键触发：input.leftPressed / input.leftClick / input.mouseDown，已映射 J 键）
    var triggerIai = input.leftPressed || input.leftClick || (input.keysJustPressed && input.keysJustPressed['KeyJ']);
    if (triggerIai && Player.skillTimers[1] <= 0 && Player.dashT <= 0 && data.ultimateTimer <= 0) {
      var w = WEAPONS[1];
      Player.dashAngle = aimAng;
      Player.dashT = w.lungeTime || 0.2;
      Player.dashId = (Player.dashId || 0) + 1;
      Player.invulnTimer = Math.max(Player.invulnTimer, (w.lungeTime || 0.2) + 0.1);
      Player.swingT = 0.2;
      Player.swingAngle = aimAng;
      data.isDashing = true;
      data.currentDashHits = 0;

      var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
      if (window.FX) {
        FX.dash(Player.x, Player.y, aimAng);
        FX.slash(Player.x, Player.y, aimAng);
      }
      if (window.Main && Main._burst && skin) {
        Main._burst(Player.x, Player.y, skin.primaryColor, 8);
      }
      SFX.play('iai');
    }

    // 9. 右键普攻挥砍（input.rightPressed / input.rightClick，已映射 K 键）
    var triggerSwing = input.rightPressed || input.rightClick || (input.keysJustPressed && input.keysJustPressed['KeyK']);
    if (triggerSwing && Player.dashT <= 0 && Player.fireTimer <= 0 && data.ultimateTimer <= 0) {
      var wMelee = WEAPONS[1];
      Player.fireTimer = wMelee.swingCooldown || 0.32;
      Player.swingT = 0.18;
      Player.swingAngle = aimAng;
      if (window.FX) {
        FX.slash(Player.x, Player.y, aimAng);
      }
      if (window.Main && Main.fxSwing) {
        Main.fxSwing(Player.x, Player.y, aimAng);
      }
      SFX.play('swing');

      // 普攻挥砍命中判定（前方扇形/近战范围）
      for (var sIdx = data.dummies.length - 1; sIdx >= 0; sIdx--) {
        var dmS = data.dummies[sIdx];
        if (Physics.checkSectorOverlap(Player.x, Player.y, aimAng, 110, 1.4 * 2, dmS) || (Utils.dist(Player.x, Player.y, dmS.x, dmS.y) <= dmS.r + 75)) {
          data.dummies.splice(sIdx, 1);
          this.onKill(dmS, false, aimAng, mg);
        }
      }
      if (data.dummies.length < 3 && !isBusyClearing) this.spawnDummies(2, mg);
    }

    // 10. 居合冲刺过程中的连续碰撞与斩击判定（物理平滑穿刺与线段相交检测）
    if ((Player.dashT > 0 || data.isDashing) && data.ultimateTimer <= 0) {
      var curSkin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
      if (window.FX) {
        FX.trail(Player.x, Player.y, Player.dashAngle, 0.35);
      }
      if (Math.random() < 0.4 && curSkin) {
        mg.particles.push({
          x: Player.x,
          y: Player.y,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          size: 3,
          color: curSkin.primaryColor,
          life: 0.2,
          maxLife: 0.2
        });
      }

      for (var k = data.dummies.length - 1; k >= 0; k--) {
        var dm = data.dummies[k];
        var isHit = Physics.checkSegmentOverlap(prevX, prevY, Player.x, Player.y, dm, 28) || Physics.checkCircleOverlap(Player, dm);

        if (isHit) {
          data.currentDashHits++;
          data.dummies.splice(k, 1);
          if (window.IaijutsuFX) {
            window.IaijutsuFX.playSkinSlashFx(mg.particles, prevX, prevY, dm.x, dm.y, Player.dashAngle, curSkin);
          }
          this.onKill(dm, true, Player.dashAngle, mg);
        }
      }

      if (data.dummies.length < 3 && !isBusyClearing) {
        this.spawnDummies(2 + (mg.combo > 10 ? 2 : 1), mg);
      }
    }

    // 11. 冲刺结束帧结算
    if (data.isDashing && Player.dashT <= 0 && data.ultimateTimer <= 0) {
      data.isDashing = false;
      if (data.currentDashHits === 0) {
        if (data.frenzyTimer > 0) {
          // 狂暴期间无限居合：挥空免罚、不断连、不设 CD！
          Player.skillTimers[1] = 0;
          FX.floatText(Player.x, Player.y - 30, '⚡ 狂暴免罚 · 连闪不中断！', '#facc15', 1.1);
        } else {
          // 挥空未斩中任何目标：触发断连特效
          var w2 = WEAPONS[1];
          Player.skillTimers[1] = w2.skillCooldown || 1.8;
          this.triggerDisconnect(Player.x, Player.y, 'miss', mg);
        }
      }
    }

    // 再次锁定在房间内部
    Physics.clampToBounds(Player, mg.room);
    data.prevPos = { x: Player.x, y: Player.y };
  },

  /**
   * 专属渲染居合斩场景、领域、特效与靶位
   */
  render: function (ctx, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;
    var skin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : { primaryColor: '#f59e0b' };

    // 0. 🏮 极道武场 · 动态光影背景（光隙倾泻、灯柱呼吸闪烁、悬浮灵气微尘与流光罗盘）
    if (window.IaijutsuFX && window.IaijutsuFX.renderDojoBackground) {
      window.IaijutsuFX.renderDojoBackground(ctx, mg.room, mg.timer, mg.combo, skin);
    }

    // 1. 无我之境全景特效
    if (data.ultimateTimer > 0 && window.IaijutsuFX) {
      window.IaijutsuFX.renderUltimateField(ctx, mg.room, Player, mg.timer);
    } else if (data.ultimatePauseTimer > 0 && window.IaijutsuFX) {
      window.IaijutsuFX.renderPauseConvergence(ctx, Player, data.ultimatePauseTimer, 0.36);
    } else if (data.frenzyTimer > 0 && window.IaijutsuFX) {
      window.IaijutsuFX.renderFrenzyAura(ctx, mg.room, Player, mg.timer, data.frenzyTimer);
    }

    // 1.5 当前无我奥义专属流派异象渲染 (时停次元裂隙 / 炽焰火壁 / 雷殛电网 / 万剑阵)
    if (window.IaijutsuUltimates && window.IaijutsuUltimates.render) {
      window.IaijutsuUltimates.render(ctx, mg);
    }

    // 2. 终焉全域冲击波
    if (data.finisherWaves && data.finisherWaves.length > 0 && window.IaijutsuFX) {
      window.IaijutsuFX.renderFinisherWaves(ctx, data.finisherWaves);
    }

    // 3. 绘制所有靶位 (包含普通木桩、黄金狂暴、灵动飞梭靶)
    for (var i = 0; i < data.dummies.length; i++) {
      window.IaijutsuTargets.drawDummy(ctx, data.dummies[i], skin);
    }

    // 4. 打开特训大殿/皮肤与音乐工坊（按B暂停）时绘制柔和暗化遮罩与暂停标识
    if (window.UI && (
      (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
      (UI.isIaiShopOpen && UI.isIaiShopOpen())
    )) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 15, 29, 0.45)';
      ctx.fillRect(mg.room.worldX, mg.room.worldY, CFG.W, CFG.H);
      ctx.restore();
    }

    // 5. 绘制高可见度电竞准星 / 武士刀十字环 (极暗与强光下均绝对清晰可见，无锁定动画)
    this.renderCursor(ctx, mg);
  },

  _reticleInited: false,
  _reticleEl: null,
  _reticleRing: null,
  _reticleCross: null,
  _reticleDot: null,
  _lastMouseX: -100,
  _lastMouseY: -100,
  _isMouseInside: true,

  /**
   * 初始化居合斩专属 DOM 电竞准星控制器（事件驱动、0ms 响应、不受帧率与震屏影响）
   */
  initReticle: function () {
    if (this._reticleInited) return;
    this._reticleInited = true;
    this._reticleEl = document.getElementById('iaijutsu-reticle');
    if (this._reticleEl) {
      this._reticleRing = document.getElementById('reticle-ring');
      this._reticleCross = document.getElementById('reticle-cross');
      this._reticleDot = document.getElementById('reticle-dot');
    }

    var self = this;
    window.addEventListener('mousemove', function (e) {
      self._lastMouseX = e.clientX;
      self._lastMouseY = e.clientY;
      self._isMouseInside = true;
      if (self._reticleEl && !self._reticleEl.classList.contains('hidden')) {
        self._reticleEl.style.transform = 'translate3d(' + (e.clientX - 18) + 'px, ' + (e.clientY - 18) + 'px, 0)';
      }
    }, { passive: true });

    window.addEventListener('mouseleave', function () {
      self._isMouseInside = false;
      if (self._reticleEl) self._reticleEl.classList.add('hidden');
    });

    window.addEventListener('mouseenter', function (e) {
      self._isMouseInside = true;
      if (window.MiniGames && MiniGames.active && MiniGames.currentGame === 'iaijutsu') {
        self.applyGameCursor();
      }
    });
  },

  /**
   * 应用居合斩高可见度电竞准星（极速硬件级跟随、绝不卡顿、不受震屏干扰、全场景清晰）
   */
  applyGameCursor: function (skinId) {
    this.initReticle();
    var canvas = (window.Main && Main.canvas) ? Main.canvas : document.getElementById('game');
    var isIaiActive = !!(window.MiniGames && MiniGames.active && MiniGames.currentGame === 'iaijutsu');
    var isMenuOpen = !!(window.UI && (
      (UI.isIaiHubOpen && UI.isIaiHubOpen()) ||
      (UI.isIaiShopOpen && UI.isIaiShopOpen()) ||
      (UI.isSettingsOpen && UI.isSettingsOpen()) ||
      (UI.isInventoryOpen && UI.isInventoryOpen()) ||
      (UI.isAttachmentsOpen && UI.isAttachmentsOpen())
    ));

    if (!isIaiActive || isMenuOpen || !this._isMouseInside) {
      if (this._reticleEl && !this._reticleEl.classList.contains('hidden')) {
        this._reticleEl.classList.add('hidden');
      }
      if (canvas && canvas.style.cursor !== 'default') {
        canvas.style.cursor = 'default';
      }
      return;
    }

    // 隐藏系统默认鼠标，显示极致丝滑的电竞 DOM 准星
    if (canvas && canvas.style.cursor !== 'none') {
      canvas.style.cursor = 'none';
    }

    if (this._reticleEl) {
      if (this._reticleEl.classList.contains('hidden')) {
        this._reticleEl.classList.remove('hidden');
        if (this._lastMouseX > 0 && this._lastMouseY > 0) {
          this._reticleEl.style.transform = 'translate3d(' + (this._lastMouseX - 18) + 'px, ' + (this._lastMouseY - 18) + 'px, 0)';
        }
      }

      // 实时根据皮肤或霓虹色更新准星颜色
      var skinColor = '#38bdf8';
      if (skinId && skinId.primaryColor) {
        skinColor = skinId.primaryColor;
      } else if (window.IaijutsuSkins && IaijutsuSkins.getEquippedSkin) {
        var eq = IaijutsuSkins.getEquippedSkin();
        if (eq && eq.primaryColor) skinColor = eq.primaryColor;
      }

      if (this._reticleRing && this._reticleRing.getAttribute('stroke') !== skinColor) {
        this._reticleRing.setAttribute('stroke', skinColor);
      }
      if (this._reticleCross && this._reticleCross.getAttribute('stroke') !== skinColor) {
        this._reticleCross.setAttribute('stroke', skinColor);
      }
    }
  },

  /**
   * 恢复操作系统常规鼠标
   */
  restoreDefaultCursor: function () {
    var canvas = (window.Main && Main.canvas) ? Main.canvas : document.getElementById('game');
    if (canvas && canvas.style.cursor !== 'default') {
      canvas.style.cursor = 'default';
    }
    if (this._reticleEl) {
      this._reticleEl.classList.add('hidden');
    }
  },

  /**
   * 居合斩鼠标准星管理
   */
  renderCursor: function (ctx, mg) {
    this.applyGameCursor();
  }
};
