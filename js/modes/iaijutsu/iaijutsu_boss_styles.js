// ============================================================================
// 宿敌战专属 · 三大古流派系统 + 角色「心眼就绪」醒目环绕特效
// 仅作用于宿敌模式（boss / boss_tutorial），不影响原版、异靶、追逐模式
// ============================================================================

var IaijutsuBossStyles = {
  STORAGE_KEY: 'arcade_iaijutsu_boss_style',

  STYLE_LIST: [
    {
      id: 'eishin',
      name: '无双英信流',
      shortName: '英信流',
      subtitle: '迅捷连闪 · 燕返 / 稻妻',
      badge: '疾风连斩',
      color: '#38bdf8',
      subColor: '#818cf8',
      glow: 'rgba(56, 189, 248, 0.36)',
      summary: '轻灵疾速：左键命中后接【右键】发动折返「燕返」，挥空冷却更短，突进带雷光瞬步。',
      keyHint: '左键命中 → 0.48s 内按【右键】接燕返',
      parryWindow: 0.28,
      eyeCd: 3.6,
      eyeRefund: 2.0,
      missCd: 0.9,
      execBonus: 0,
      dashBoost: 56,
      skills: [
        { name: '奥义 · 燕返', key: '命中接右键', desc: '0.48s内折返交叉追斩 +4伤/+14架势，不占破绽2刀上限' },
        { name: '立膝 · 稻妻', key: '左键突进', desc: '雷光瞬步射程延伸，挥空冷却缩短至 0.9s' }
      ]
    },
    {
      id: 'jigen',
      name: '萨摩示现流',
      shortName: '示现流',
      subtitle: '一击必杀 · 云耀 / 泷落',
      badge: '极意重斩',
      color: '#f59e0b',
      subColor: '#ef4444',
      glow: 'rgba(245, 158, 11, 0.38)',
      summary: '霸道高伤：长按【左键】蓄力拔刀，鞘口金光松手发动秘剑「云耀」，处决伤害暴增。',
      keyHint: '长按【左键】0.45s 亮金光松手 → 秘剑云耀',
      parryWindow: 0.28,
      eyeCd: 3.6,
      eyeRefund: 2.0,
      missCd: 1.1,
      execBonus: 8,
      dashBoost: 0,
      skills: [
        { name: '秘剑 · 云耀', key: '长按左键松手', desc: '黄金窗松手12伤/42架势，普通蓄力「泷落」8伤/28架势' },
        { name: '重劈 · 泷落断魄', key: '破防处决', desc: '居合处决伤害额外 +8（总计 34 点毁灭爆发）' }
      ]
    },
    {
      id: 'shinkage',
      name: '柳生新阴流',
      shortName: '新阴流',
      subtitle: '见切反击 · 受流 / 总切 / 纳刀',
      badge: '后发先至',
      color: '#a855f7',
      subColor: '#34d399',
      glow: 'rgba(168, 85, 247, 0.36)',
      summary: '见切宗师：【空格】见切窗更宽、冷却更短，见切触发三连「总切」，停手自动「纳刀」爆印。',
      keyHint: '✦ 金光按【空格】受流总切 · 停手自动纳刀爆伤',
      parryWindow: 0.38,
      eyeCd: 2.9,
      eyeRefund: 2.1,
      missCd: 1.1,
      execBonus: 0,
      dashBoost: 0,
      skills: [
        { name: '参之型 · 受流总切', key: '金光按空格', desc: '见切窗扩至0.38s，成功触发三连总切 10伤/44架势' },
        { name: '血振 · 纳刀残心', key: '叠印后停手', desc: '斩击/见切刻下残心印(最多3层)，纳刀引爆每层3伤/8架势' }
      ]
    }
  ],

  getSelectedStyleId: function () {
    try {
      var saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && this.getStyle(saved)) return saved;
    } catch (e) {}
    return 'eishin';
  },

  setSelectedStyleId: function (id) {
    if (!this.getStyle(id)) return false;
    try {
      localStorage.setItem(this.STORAGE_KEY, id);
    } catch (e) {}
    return true;
  },

  getStyle: function (id) {
    var target = id || this.getSelectedStyleId();
    for (var i = 0; i < this.STYLE_LIST.length; i++) {
      if (this.STYLE_LIST[i].id === target) return this.STYLE_LIST[i];
    }
    return this.STYLE_LIST[0];
  },

  getActiveStyle: function (mg) {
    var data = mg && mg.iaijutsuData;
    var sid = (data && data.bossStyleId) ? data.bossStyleId : this.getSelectedStyleId();
    return this.getStyle(sid);
  },

  // --------------------------------------------------------------------------
  // 开局初始化流派运行时状态
  // --------------------------------------------------------------------------
  initRun: function (mg) {
    var data = mg && mg.iaijutsuData;
    if (!data) return;
    var style = this.getStyle(mg.selectedBossStyleId || this.getSelectedStyleId());
    data.bossStyleId = style.id;
    data.bossStyle = style;

    // 心眼就绪提示特效状态
    data.eyePrevCd = 0;
    data.eyeJustReadyT = 0.6;
    data.eyeAuraPulse = 0;

    // 水墨竖排招式名
    data.styleCalligraphy = null; // { title, sub, color, life, maxLife }

    // 英信流：燕返派生窗
    data.tsubameWindow = 0;
    data.tsubameReadyAngle = 0;

    // 示现流：长按左键蓄力拔刀
    data.jigenHolding = false;
    data.jigenChargeT = 0;
    data.jigenReleasePower = 0; // 0=普通 1=泷落 2=云耀
    data.jigenPowerTimer = 0;

    // 新阴流：残心印记 & 自动纳刀
    data.zanshinStacks = 0;
    data.zanshinIdleT = 0;
    data.sheatheFlashT = 0;
  },

  showCalligraphy: function (mg, title, sub, color) {
    var data = mg && mg.iaijutsuData;
    if (!data) return;
    data.styleCalligraphy = {
      title: title,
      sub: sub || '',
      color: color || (data.bossStyle ? data.bossStyle.color : '#38bdf8'),
      life: 0.92,
      maxLife: 0.92
    };
  },

  // --------------------------------------------------------------------------
  // 示现流：长按左键蓄力拦截器（轻点 < 0.16s 立刻突进，长按蓄力松手出云耀/泷落）
  // --------------------------------------------------------------------------
  processStyleInput: function (dt, mouseWorld, input, mg) {
    var data = mg && mg.iaijutsuData;
    if (!data || !data.bossStyle) return input;

    var style = data.bossStyle;
    var safeInput = input;

    // 1) 英信流：左键命中后 0.48s 内按右键 → 发动【奥义 · 燕返】！
    if (style.id === 'eishin' && data.tsubameWindow > 0 && input.rightPressed) {
      if (this.triggerTsubameGaeshi(mg)) {
        safeInput = Object.assign({}, input);
        safeInput.rightPressed = false;
      }
    }

    // 2) 示现流：长按左键蓄力「云耀 / 泷落」
    if (style.id === 'jigen') {
      var canCharge = (Player.skillTimers[1] <= 0 && Player.dashT <= 0 && (data.ultimateTimer || 0) <= 0);
      var leftDown = !!input.mouseDown;
      var leftJust = !!(input.leftPressed || input.leftClick || (input.keysJustPressed && input.keysJustPressed['KeyJ']));

      if (leftJust && canCharge && !data.jigenHolding) {
        // 先拦截当帧立刻突进，开始计时判断是轻点还是长按蓄力
        data.jigenHolding = true;
        data.jigenChargeT = 0;
        safeInput = (safeInput === input) ? Object.assign({}, input) : safeInput;
        safeInput.leftPressed = false;
        safeInput.leftClick = false;
        if (safeInput.keysJustPressed && safeInput.keysJustPressed['KeyJ']) {
          safeInput.keysJustPressed = Object.assign({}, safeInput.keysJustPressed);
          delete safeInput.keysJustPressed['KeyJ'];
        }
      } else if (data.jigenHolding) {
        if (leftDown && canCharge) {
          var prevT = data.jigenChargeT;
          data.jigenChargeT += dt;
          // 蓄力刚跨入黄金云耀窗（0.42s）时闪金光+叮一声
          if (prevT < 0.42 && data.jigenChargeT >= 0.42) {
            SFX.play('parry');
            FX.floatText(Player.x, Player.y - 42, '✦ 秘剑·云耀 就绪！松手！', '#fde047', 1.3);
            mg.addExplosion(Player.x, Player.y, '#fde047', 10);
          }
          // 超过 1.05s 自动出刀防止一直憋着
          if (data.jigenChargeT >= 1.05) {
            safeInput = this._releaseJigenSlash(safeInput, input, mg, 1);
          } else {
            // 蓄力中屏蔽普通左键
            safeInput = (safeInput === input) ? Object.assign({}, input) : safeInput;
            safeInput.leftPressed = false;
            safeInput.leftClick = false;
          }
        } else {
          // 松手！根据蓄力时长判定：轻点普通斩 / 泷落 / 秘剑·云耀
          var t = data.jigenChargeT;
          var pwr = 0;
          if (t >= 0.42 && t <= 0.74) pwr = 2;      // 秘剑·云耀（黄金窗口）
          else if (t >= 0.16) pwr = 1;               // 秘剑·泷落（普通蓄力）
          safeInput = this._releaseJigenSlash(safeInput, input, mg, pwr);
        }
      }
    }

    return safeInput;
  },

  _releaseJigenSlash: function (safeInput, rawInput, mg, power) {
    var data = mg.iaijutsuData;
    data.jigenHolding = false;
    data.jigenChargeT = 0;
    data.jigenReleasePower = power;
    data.jigenPowerTimer = power > 0 ? 0.34 : 0;

    safeInput = (safeInput === rawInput) ? Object.assign({}, rawInput) : safeInput;
    safeInput.leftPressed = true;

    if (power === 2) {
      SFX.play('lightning');
      SFX.play('iai');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);
      this.showCalligraphy(mg, '秘剑 · 云耀', '示现流极意', '#fde047');
      mg.addExplosion(Player.x, Player.y, '#fde047', 18);
      mg.addExplosion(Player.x, Player.y, '#f97316', 14);
    } else if (power === 1) {
      SFX.play('iai');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.24);
      this.showCalligraphy(mg, '秘剑 · 泷落', '示现流重斩', '#fb923c');
      mg.addExplosion(Player.x, Player.y, '#fb923c', 12);
    }
    return safeInput;
  },

  // --------------------------------------------------------------------------
  // 英信流专属：【奥义 · 燕返】反手折返二段交叉斩
  // --------------------------------------------------------------------------
  triggerTsubameGaeshi: function (mg) {
    var data = mg && mg.iaijutsuData;
    var boss = data && data.boss;
    if (!data || !boss || boss.state === 'dying' || boss.state === 'intro') return false;
    if (boss.state === 'telegraph' || boss.state === 'action') {
      // 蓄力/出招霸体期间不能拿燕返白嫖，给提示
      data.tsubameWindow = 0;
      return false;
    }

    data.tsubameWindow = 0;
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var ox = Player.x, oy = Player.y;
    var ang = Math.atan2(boss.y - oy, boss.x - ox);
    // 燕返折返穿过 Boss 到另一侧
    Player.x = Utils.clamp(boss.x + Math.cos(ang) * (boss.r + 58), rx + 50, rx + CFG.W - 50);
    Player.y = Utils.clamp(boss.y + Math.sin(ang) * (boss.r + 58), ry + 84, ry + CFG.H - 50);
    Player.skillTimers[1] = 0;
    data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.16);
    Player.invulnTimer = data.bossSafeInvuln;

    var dmg = 4;
    var postureGain = 14;
    boss.hp = data.bossTutorial ? Math.max(75, boss.hp - dmg) : Math.max(0, boss.hp - dmg);
    boss.hitFlash = 0.22;
    // 关键亮点：燕返不累加 windowHits，让你在破绽窗能打出华丽的折返绝杀！

    // 绘制 X 型青白燕尾双刀痕
    var len = 135;
    boss.slashScars.push(
      {
        x0: boss.x - Math.cos(ang + 0.42) * len, y0: boss.y - Math.sin(ang + 0.42) * len,
        x1: boss.x + Math.cos(ang + 0.42) * len, y1: boss.y + Math.sin(ang + 0.42) * len,
        color: '#38bdf8', coreColor: '#ffffff', width: 7, life: 0.42, maxLife: 0.42
      },
      {
        x0: boss.x - Math.cos(ang - 0.42) * len, y0: boss.y - Math.sin(ang - 0.42) * len,
        x1: boss.x + Math.cos(ang - 0.42) * len, y1: boss.y + Math.sin(ang - 0.42) * len,
        color: '#818cf8', coreColor: '#e0f2fe', width: 7, life: 0.42, maxLife: 0.42
      }
    );
    boss.clashRings.push({
      x: boss.x, y: boss.y, r: 14, maxR: 130,
      color: '#38bdf8', subColor: '#e0f2fe', life: 0.3, maxLife: 0.3, star: true
    });

    // 顺手切碎 Boss 附近飞刃
    if (window.IaijutsuBoss && window.IaijutsuBoss.slashNearbyBlades) {
      window.IaijutsuBoss.slashNearbyBlades(mg, 130);
    }

    mg.combo += 2;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    SFX.play('iai');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.32);
    FX.floatText(boss.x, boss.y - boss.r - 24, '⚡ 奥义·燕返！-' + dmg, '#38bdf8', 1.48);
    mg.addExplosion(boss.x, boss.y, '#38bdf8', 18);
    this.showCalligraphy(mg, '奥义 · 燕返', '无双英信流', '#38bdf8');

    if (boss.hp <= 0) {
      window.IaijutsuBoss.startDying(boss, mg);
      return true;
    }
    var broke = window.IaijutsuBoss.addPosture(boss, data.bossTutorial && boss.tutorialLockPosture ? 0 : postureGain, mg);
    if (!broke) window.IaijutsuBoss.checkPhaseTransition(boss, mg);
    return true;
  },

  // --------------------------------------------------------------------------
  // 命中 Boss 时的流派联动（英信开启燕返 / 示现结算云耀泷落 / 新阴叠残心印）
  // 返回 { extraDmg, extraPosture, label }
  // --------------------------------------------------------------------------
  onBossHit: function (boss, weakHit, isDash, mg) {
    var data = mg && mg.iaijutsuData;
    var res = { extraDmg: 0, extraPosture: 0, label: '' };
    if (!data || !data.bossStyle) return res;
    var sid = data.bossStyle.id;

    if (sid === 'eishin' && isDash) {
      data.tsubameWindow = 0.48;
      data.tsubameReadyAngle = Math.atan2(boss.y - Player.y, boss.x - Player.x);
    }

    if (sid === 'jigen' && isDash && data.jigenReleasePower > 0 && data.jigenPowerTimer > 0) {
      var pwr = data.jigenReleasePower;
      data.jigenReleasePower = 0;
      data.jigenPowerTimer = 0;
      if (pwr === 2) {
        // 秘剑·云耀：总计 12 伤 / 42 架势（在基础弱点/普通上补足差额）
        res.extraDmg = weakHit ? 7 : 9;
        res.extraPosture = weakHit ? 22 : 32;
        res.label = '🔥 秘剑 · 云耀！-' + ((weakHit ? 5 : 3) + res.extraDmg);
        var ang = Math.atan2(boss.y - Player.y, boss.x - Player.x);
        boss.slashScars.push({
          x0: boss.x - Math.cos(ang) * 240, y0: boss.y - Math.sin(ang) * 240,
          x1: boss.x + Math.cos(ang) * 240, y1: boss.y + Math.sin(ang) * 240,
          color: '#fde047', coreColor: '#ffffff', width: 12, life: 0.52, maxLife: 0.52
        });
        boss.clashRings.push({
          x: boss.x, y: boss.y, r: 18, maxR: 210,
          color: '#f59e0b', subColor: '#fde047', life: 0.36, maxLife: 0.36, star: true
        });
        SFX.play('lightning');
        Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.52);
        mg.addExplosion(boss.x, boss.y, '#fde047', 26);
      } else {
        // 秘剑·泷落：总计 8 伤 / 28 架势
        res.extraDmg = weakHit ? 3 : 5;
        res.extraPosture = weakHit ? 8 : 18;
        res.label = '🔥 秘剑 · 泷落 -' + ((weakHit ? 5 : 3) + res.extraDmg);
        var ang2 = Math.atan2(boss.y - Player.y, boss.x - Player.x);
        boss.slashScars.push({
          x0: boss.x - Math.cos(ang2) * 165, y0: boss.y - Math.sin(ang2) * 165,
          x1: boss.x + Math.cos(ang2) * 165, y1: boss.y + Math.sin(ang2) * 165,
          color: '#fb923c', coreColor: '#fef08a', width: 8, life: 0.38, maxLife: 0.38
        });
      }
      if (window.IaijutsuBoss && window.IaijutsuBoss.slashNearbyBlades) {
        window.IaijutsuBoss.slashNearbyBlades(mg, 175);
      }
    }

    if (sid === 'shinkage') {
      data.zanshinStacks = Math.min(3, (data.zanshinStacks || 0) + 1);
      data.zanshinIdleT = 0;
    }

    return res;
  },

  // --------------------------------------------------------------------------
  // 完美见切时的流派定制（新阴流发动【参之型·受流 + 三连总切】！）
  // 返回 { counterDmg, postureGain, label }
  // --------------------------------------------------------------------------
  onPerfectParry: function (boss, mg) {
    var data = mg && mg.iaijutsuData;
    var style = this.getActiveStyle(mg);
    if (style.id === 'shinkage') {
      // 3 道交叉月华残影斩击（面 → 肩 → 胴）
      var angles = [-0.65, 0.55, 0.05];
      var len = 155;
      for (var i = 0; i < angles.length; i++) {
        var a = angles[i];
        boss.slashScars.push({
          x0: boss.x - Math.cos(a) * len, y0: boss.y - Math.sin(a) * len,
          x1: boss.x + Math.cos(a) * len, y1: boss.y + Math.sin(a) * len,
          color: i === 2 ? '#34d399' : '#c084fc', coreColor: '#ffffff', width: 8, life: 0.48, maxLife: 0.48
        });
      }
      data.zanshinStacks = Math.min(3, (data.zanshinStacks || 0) + 1);
      data.zanshinIdleT = 0.55; // 见切后更快触发纳刀引爆
      this.showCalligraphy(mg, '参之型 · 受流', '新阴流 · 总切三连', '#c084fc');
      return {
        counterDmg: 10,
        postureGain: 44,
        label: '🌙 受流·总切三连！-10'
      };
    }

    this.showCalligraphy(mg, '心眼 · 见切', style.shortName, style.color);
    return {
      counterDmg: 6,
      postureGain: 34,
      label: '⚡ 心眼·完美见切！反斩 -6'
    };
  },

  // --------------------------------------------------------------------------
  // 新阴流：【血振 · 纳刀残心】停手归鞘，引爆全部残心刀印
  // --------------------------------------------------------------------------
  detonateZanshin: function (mg) {
    var data = mg && mg.iaijutsuData;
    var boss = data && data.boss;
    if (!data || !boss || boss.state === 'dying' || !data.zanshinStacks) return false;

    var stacks = data.zanshinStacks;
    data.zanshinStacks = 0;
    data.zanshinIdleT = 0;
    data.sheatheFlashT = 0.45;

    var dmg = stacks * 3;
    var postureGain = stacks * 8;
    boss.hp = data.bossTutorial ? Math.max(75, boss.hp - dmg) : Math.max(0, boss.hp - dmg);
    boss.hitFlash = 0.24;
    data.eyeCd = Math.max(0, (data.eyeCd || 0) - 0.45);

    for (var i = 0; i < stacks; i++) {
      var a = (i / Math.max(1, stacks)) * Math.PI + 0.35;
      boss.slashScars.push({
        x0: boss.x - Math.cos(a) * 130, y0: boss.y - Math.sin(a) * 130,
        x1: boss.x + Math.cos(a) * 130, y1: boss.y + Math.sin(a) * 130,
        color: '#a855f7', coreColor: '#fde047', width: 6.5, life: 0.42, maxLife: 0.42
      });
    }
    boss.clashRings.push({
      x: boss.x, y: boss.y, r: 16, maxR: 150,
      color: '#a855f7', subColor: '#34d399', life: 0.32, maxLife: 0.32, star: true
    });

    SFX.play('parry');
    SFX.play('iai');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.32);
    FX.floatText(boss.x, boss.y - boss.r - 28, '🌙 咔哒·纳刀爆印 x' + stacks + ' (-' + dmg + ')', '#c084fc', 1.45);
    mg.addExplosion(boss.x, boss.y, '#c084fc', 18);
    this.showCalligraphy(mg, '血振 · 纳刀', '残心印 x' + stacks, '#34d399');

    if (boss.hp <= 0) {
      window.IaijutsuBoss.startDying(boss, mg);
      return true;
    }
    var broke = window.IaijutsuBoss.addPosture(boss, data.bossTutorial && boss.tutorialLockPosture ? 0 : postureGain, mg);
    if (!broke) window.IaijutsuBoss.checkPhaseTransition(boss, mg);
    return true;
  },

  // --------------------------------------------------------------------------
  // 帧更新（追踪心眼刚就绪脉冲、燕返窗口、残心自动纳刀、招式名淡出）
  // --------------------------------------------------------------------------
  update: function (dt, mg) {
    var data = mg && mg.iaijutsuData;
    if (!data) return;

    data.eyeAuraPulse = (data.eyeAuraPulse || 0) + dt;

    // 监测心眼刚转好（从 >0 归 0）：触发清脆脉冲与光圈扩散！
    var curCd = data.eyeCd || 0;
    if ((data.eyePrevCd || 0) > 0 && curCd <= 0) {
      data.eyeJustReadyT = 0.65;
      SFX.play('click');
      FX.floatText(Player.x, Player.y - 44, '🧿 心眼就绪 [空格]', data.bossStyle ? data.bossStyle.color : '#38bdf8', 1.15);
    }
    data.eyePrevCd = curCd;
    if (data.eyeJustReadyT > 0) data.eyeJustReadyT = Math.max(0, data.eyeJustReadyT - dt);

    if (data.tsubameWindow > 0) data.tsubameWindow = Math.max(0, data.tsubameWindow - dt);
    if (data.jigenPowerTimer > 0) {
      data.jigenPowerTimer = Math.max(0, data.jigenPowerTimer - dt);
      if (data.jigenPowerTimer <= 0) data.jigenReleasePower = 0;
    }
    if (data.sheatheFlashT > 0) data.sheatheFlashT = Math.max(0, data.sheatheFlashT - dt);

    // 新阴流：拥有残心印记且短暂停手 0.78s 后，自动触发【血振 · 纳刀】引爆！
    if (data.bossStyle && data.bossStyle.id === 'shinkage' && data.zanshinStacks > 0 && !data.isDashing) {
      data.zanshinIdleT = (data.zanshinIdleT || 0) + dt;
      if (data.zanshinIdleT >= 0.78) {
        this.detonateZanshin(mg);
      }
    }

    // 英信流【稻妻】：突进中附带青电残影加速延展
    if (data.bossStyle && data.bossStyle.id === 'eishin' && Player.dashT > 0) {
      var rx = mg.room.worldX, ry = mg.room.worldY;
      var boost = (data.bossStyle.dashBoost || 56) * dt * 4.5;
      Player.x = Utils.clamp(Player.x + Math.cos(Player.dashAngle || 0) * boost, rx + 42, rx + CFG.W - 42);
      Player.y = Utils.clamp(Player.y + Math.sin(Player.dashAngle || 0) * boost, ry + 78, ry + CFG.H - 42);
    }

    if (data.styleCalligraphy) {
      data.styleCalligraphy.life -= dt;
      if (data.styleCalligraphy.life <= 0) data.styleCalligraphy = null;
    }
  },

  // --------------------------------------------------------------------------
  // 渲染：角色「心眼就绪」醒目环绕特效 + 流派专属视觉 + 水墨招式牌
  // --------------------------------------------------------------------------
  render: function (ctx, mg) {
    var data = mg && mg.iaijutsuData;
    var boss = data && data.boss;
    if (!data || !boss) return;
    var style = data.bossStyle || this.getActiveStyle(mg);
    var t = data.eyeAuraPulse || 0;
    var eyeCd = data.eyeCd || 0;
    var eyeMaxCd = data.bossTutorial ? 1.15 : (style.eyeCd || 3.6);
    var inParry = (boss.state !== 'dying' && window.IaijutsuBoss && window.IaijutsuBoss.isParryWindow(boss));

    // 1) 角色周围「心眼可用 / 金光爆闪 / 充能进度」高可见度环绕特效
    this._drawPlayerEyeRing(ctx, Player.x, Player.y, eyeCd, eyeMaxCd, inParry, data.eyeActiveT || 0, data.eyeJustReadyT || 0, style, t);

    // 2) 英信流：燕返可触发窗口提示环
    if (style.id === 'eishin' && data.tsubameWindow > 0 && boss.state !== 'telegraph' && boss.state !== 'action') {
      this._drawTsubamePrompt(ctx, Player.x, Player.y, data.tsubameWindow / 0.48, t);
    }

    // 3) 示现流：长按蓄力拔刀特效（黄金云耀窗口爆白金光）
    if (style.id === 'jigen' && data.jigenHolding) {
      this._drawJigenCharge(ctx, Player.x, Player.y, data.jigenChargeT, t);
    }

    // 4) 新阴流：Boss 身上的残心刀印 + 角色纳刀星芒
    if (style.id === 'shinkage') {
      if (data.zanshinStacks > 0 && boss.state !== 'dying') {
        this._drawZanshinMarks(ctx, boss, data.zanshinStacks, t);
      }
      if (data.sheatheFlashT > 0) {
        this._drawSheatheSpark(ctx, Player.x, Player.y, data.sheatheFlashT / 0.45);
      }
    }

    // 5) 竖排毛笔水墨招式名（释放流派奥义时在左侧优雅浮现）
    if (data.styleCalligraphy) {
      this._drawCalligraphy(ctx, mg, data.styleCalligraphy);
    }

    // 6) 左上角流派微标（不遮视野，随时看清当前流派与核心按键）
    this._drawStyleBadge(ctx, mg, style, data);
  },

  _drawPlayerEyeRing: function (ctx, px, py, eyeCd, eyeMaxCd, inParry, eyeActiveT, justReadyT, style, t) {
    ctx.save();
    ctx.translate(px, py);

    // (A) 心眼刚转好那一刻的扩张涟漪
    if (justReadyT > 0) {
      var p = 1 - Utils.clamp(justReadyT / 0.65, 0, 1);
      ctx.beginPath();
      ctx.arc(0, 0, 26 + p * 46, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 211, 252, ' + ((1 - p) * 0.9).toFixed(3) + ')';
      ctx.lineWidth = 3.2 * (1 - p) + 0.8;
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 16;
      ctx.stroke();
    }

    if (eyeCd <= 0) {
      // (B) 心眼就绪常驻角色环绕特效（醒目、呼吸感、绝不杂乱）
      var pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
      var alertMode = inParry; // Boss 正处于金光窗时，角色身周爆金青警示光环！

      // 脚下柔光气场底晕
      var auraR = alertMode ? (52 + pulse * 10) : (40 + pulse * 5);
      var grad = ctx.createRadialGradient(0, 0, 10, 0, 0, auraR);
      if (alertMode) {
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.34)');
        grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.24)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else {
        grad.addColorStop(0, 'rgba(125, 211, 252, 0.16)');
        grad.addColorStop(0.6, style.glow || 'rgba(56, 189, 248, 0.18)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, Math.PI * 2);
      ctx.fill();

      // 外圈旋转 4 段心眼灵弧
      var outerR = alertMode ? (34 + (1 - pulse) * 14) : (32 + pulse * 3);
      var rot = t * (alertMode ? 4.4 : 1.5);
      ctx.strokeStyle = alertMode ? '#fde047' : style.color;
      ctx.lineWidth = alertMode ? 3.4 : 2.2;
      ctx.shadowColor = alertMode ? '#fde047' : style.color;
      ctx.shadowBlur = alertMode ? 20 : 12;
      for (var i = 0; i < 4; i++) {
        var a0 = rot + i * (Math.PI * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, outerR, a0, a0 + 0.78);
        ctx.stroke();
      }

      // 内圈细实环 + 反向慢旋星点
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.strokeStyle = alertMode ? 'rgba(255, 255, 255, 0.92)' : 'rgba(224, 242, 254, 0.45)';
      ctx.lineWidth = alertMode ? 2.0 : 1.2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      for (var k = 0; k < 4; k++) {
        var sa = -rot * 1.3 + k * (Math.PI * 0.5);
        var sx = Math.cos(sa) * (outerR + 2);
        var sy = Math.sin(sa) * (outerR + 2);
        ctx.fillStyle = alertMode ? '#ffffff' : '#e0f2fe';
        ctx.beginPath();
        ctx.arc(sx, sy, alertMode ? 3.2 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // 金光瞬间在角色头顶直接弹出超清晰【✦ 按空格见切!】提示
      if (alertMode) {
        var txt = '✦ 空格见切!';
        ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        var tw = ctx.measureText(txt).width + 14;
        ctx.fillStyle = 'rgba(120, 53, 15, 0.92)';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-tw / 2, -56, tw, 20, 6);
        else ctx.rect(-tw / 2, -56, tw, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 0, -45.5);
      }
    } else {
      // (C) 心眼冷却中：低调清晰的圆弧充能进度环
      var ratio = Utils.clamp(1 - eyeCd / Math.max(0.1, eyeMaxCd), 0, 1);
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 27, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * ratio);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // (D) 按下空格心眼激活瞬间护体光罩
    if (eyeActiveT > 0) {
      var a = Utils.clamp(eyeActiveT / 0.24, 0, 1);
      ctx.beginPath();
      ctx.arc(0, 0, 36 + (1 - a) * 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 211, 252, ' + (a * 0.95).toFixed(3) + ')';
      ctx.lineWidth = 3.2;
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 18;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(253, 224, 71, ' + (a * 0.9).toFixed(3) + ')';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  },

  _drawTsubamePrompt: function (ctx, px, py, ratio, t) {
    ctx.save();
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.arc(0, 0, 44, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * Utils.clamp(ratio, 0, 1));
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 11.5px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('⚡ 右键接【燕返】', 0, 46 + Math.sin(t * 14) * 2);
    ctx.restore();
  },

  _drawJigenCharge: function (ctx, px, py, chargeT, t) {
    var inSweet = (chargeT >= 0.42 && chargeT <= 0.74);
    var ratio = Utils.clamp(chargeT / 0.52, 0, 1);
    ctx.save();
    ctx.translate(px, py);

    // 收缩蓄力环
    var r = inSweet ? (26 + Math.sin(t * 36) * 3) : (48 - ratio * 22);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = inSweet ? '#fef08a' : '#f59e0b';
    ctx.lineWidth = inSweet ? 4 : 2.6;
    ctx.shadowColor = inSweet ? '#fde047' : '#f97316';
    ctx.shadowBlur = inSweet ? 24 : 14;
    ctx.stroke();

    // 黄金窗爆白金十字星
    if (inSweet) {
      var sl = 24 + Math.sin(t * 30) * 4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -sl); ctx.lineTo(3.5, -3.5);
      ctx.lineTo(sl, 0); ctx.lineTo(3.5, 3.5);
      ctx.lineTo(0, sl); ctx.lineTo(-3.5, 3.5);
      ctx.lineTo(-sl, 0); ctx.lineTo(-3.5, -3.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = inSweet ? '#fef08a' : '#fdba74';
    ctx.fillText(inSweet ? '✦ 云耀就绪！松手出刀!' : '🔥 蓄力拔刀 · 示现流', 0, -44);
    ctx.restore();
  },

  _drawZanshinMarks: function (ctx, boss, stacks, t) {
    ctx.save();
    for (var i = 0; i < stacks; i++) {
      var ang = t * 2.2 + i * ((Math.PI * 2) / Math.max(1, stacks));
      var mx = boss.x + Math.cos(ang) * (boss.r + 22);
      var my = boss.y + Math.sin(ang) * (boss.r + 22);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang + Math.PI * 0.25);
      ctx.fillStyle = '#c084fc';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  _drawSheatheSpark: function (ctx, px, py, alpha) {
    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
    var sl = 26 * (1.3 - alpha * 0.3);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-sl, 0); ctx.lineTo(sl, 0);
    ctx.moveTo(0, -sl * 0.65); ctx.lineTo(0, sl * 0.65);
    ctx.stroke();
    ctx.restore();
  },

  _drawCalligraphy: function (ctx, mg, c) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var p = 1 - (c.life / c.maxLife);
    var alpha = p < 0.14 ? (p / 0.14) : (p > 0.72 ? (1 - p) / 0.28 : 1);
    var slideX = p < 0.16 ? (1 - p / 0.16) * -18 : 0;

    ctx.save();
    ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
    var bx = rx + 26 + slideX;
    var by = ry + 132;
    var bw = 54, bh = 166;

    // 宣纸暗墨底牌
    ctx.fillStyle = 'rgba(7, 11, 22, 0.86)';
    ctx.strokeStyle = c.color || '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();

    // 竖排招式大字
    var chars = String(c.title || '').replace(/\s+/g, '').split('');
    ctx.font = '900 18px "STKaiti", "KaiTi", "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = c.color || '#38bdf8';
    ctx.shadowBlur = 10;
    var stepY = Math.min(24, 116 / Math.max(1, chars.length));
    var startY = by + 24;
    for (var i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], bx + bw * 0.5, startY + i * stepY);
    }

    // 底部朱红流派印章
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bx + bw * 0.5 - 10, by + bh - 26, 20, 18);
    ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#fef2f2';
    ctx.fillText('奥', bx + bw * 0.5, by + bh - 16.5);

    ctx.restore();
  },

  _drawStyleBadge: function (ctx, mg, style, data) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    ctx.save();
    var x = rx + 24, y = ry + 72;
    var txt = style.name + ' · ' + style.keyHint;
    if (style.id === 'shinkage' && data.zanshinStacks > 0) {
      txt = style.name + ' · 残心印 ' + '◆'.repeat(data.zanshinStacks);
    }
    ctx.font = 'bold 11.5px "Microsoft YaHei", sans-serif';
    var w = Math.min(350, ctx.measureText(txt).width + 24);
    ctx.fillStyle = 'rgba(10, 15, 30, 0.84)';
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, 26, 6);
    else ctx.rect(x, y, w, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x + 11, y + 13.5);
    ctx.restore();
  }
};

window.IaijutsuBossStyles = IaijutsuBossStyles;
