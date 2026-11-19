// ============================================================================
// 宿敌战 · Boss 实体（高难度真·剑戟对决版）
// ----------------------------------------------------------------------------
// 战斗铁律（彻底杜绝“贴脸无脑左键切赢”）：
//   1. 蓄力中硬撞 Boss：不再触发免费见切！Boss 立刻【震刀弹开】（0 伤 0 架势，
//      击退 110px + 锁突进 1.15s，且不给无敌帧），逼迫玩家读招走位或卡点弹反；
//   2. 出招中硬撞 Boss：Boss 具备霸体迎击，直接【迎击反斩】扣 1 命；
//   3. 真正的主动博弈：
//      - 【✦ 金光招式】：出手前 0.28s 闪现金星，按【空格 · 心眼见切】触发完美弹反，
//        打断连段 + 造成反击伤与大额架势 + 刷新突进 + 返还 2.0s 心眼冷却；
//      - 【危 红色杀招】：不可格挡弹反！必须靠突进拉扯/穿隙躲开红区；
//   4. 破绽期最多连斩 2 刀，Boss 立刻撤步起招反攻；打满架势后进入【绝】处决窗，
//      下一刀触发高伤【居合处决 · 一刀断魄】！
// ============================================================================

window.IaijutsuBoss = {
  BOSS_LIST: [
    {
      id: 'mumyo',
      name: '影武者「无明」',
      shortName: '无明',
      title: '一刀未出，胜负已分',
      badge: '居合剑豪',
      difficulty: 3,
      diffLabel: '剑道试炼',
      desc: '疾风骤雨般的纯粹居合剑豪。擅长多段拔刀连斩与折返一闪，破招节奏最纯粹，适合磨炼心眼见切。',
      colors: { main: '#f43f5e', sub: '#818cf8', accent: '#fde047', glow: 'rgba(244, 63, 94, 0.52)' },
      hp: 140,
      posture: 130,
      sweepArc: 1.62,
      sweepRange: 252,
      bladeCount: 5,
      speedMul: 0.96,
      spin: 1.1,
      moves: ['iaijutsu_draw', 'blitz', 'cross_cut', 'blades'],
      moveCards: [
        { name: '居合·残月连斩', tag: '✦ 见切', tagType: 'parry', desc: '一阶二连、二阶三连拔刀弧斩' },
        { name: '极意·折返一闪', tag: '✦ 见切', tagType: 'parry', desc: '二段/三段高速折返突刺与残痕' },
        { name: '十字断空', tag: '危 必闪', tagType: 'danger', desc: '十字空间斩线，二阶追加正十字连爆' },
        { name: '双波月轮剑气', tag: '✂ 可斩', tagType: 'slice', desc: '连续两波扇形刀波，可挥刀切碎' }
      ]
    },
    {
      id: 'akaoni',
      name: '鬼武者「赤鬼」',
      shortName: '赤鬼',
      title: '力可断柱，怒可焚山',
      badge: '炼狱鬼将',
      difficulty: 4,
      diffLabel: '猛将压制',
      desc: '威压极强的炼狱重甲鬼将。大范围重劈自带火浪冲击，贴脸即吃连环震地波与追踪业火柱，容错极低。',
      colors: { main: '#ef4444', sub: '#f97316', accent: '#fde047', glow: 'rgba(239, 68, 68, 0.56)' },
      hp: 168,
      posture: 155,
      sweepArc: 1.88,
      sweepRange: 274,
      novaRange: 196,
      speedMul: 1.0,
      spin: 0.85,
      moves: ['heavy_cleave', 'magma_pillars', 'quake_nova', 'oni_charge'],
      moveCards: [
        { name: '鬼神重劈·炎浪', tag: '✦ 见切', tagType: 'parry', desc: '超广角熔岩巨斩并迸射三道炎刃' },
        { name: '炼狱追踪业火柱', tag: '危 必闪', tagType: 'danger', desc: '4~7 道连环追踪火柱封锁走位' },
        { name: '怒涛连环震地', tag: '危 必闪', tagType: 'danger', desc: '先内圈后外环震爆，二阶三连震' },
        { name: '赤鬼猛突·震踏', tag: '✦ 见切', tagType: 'parry', desc: '烈焰冲撞接落地冲击，二阶二连冲' }
      ]
    },
    {
      id: 'byakuya',
      name: '剑圣「白夜」',
      shortName: '白夜',
      title: '千刃归一，月下无影',
      badge: '月影剑圣',
      difficulty: 5,
      diffLabel: '极境宿敌',
      desc: '神出鬼没的终极剑圣。擅长瞬身背刺、全屏月影分身合击与双波次元刀网，对读招与身法要求最高。',
      colors: { main: '#38bdf8', sub: '#c084fc', accent: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.52)' },
      hp: 132,
      posture: 120,
      sweepArc: 1.5,
      sweepRange: 235,
      stormCount: 12,
      speedMul: 0.86,
      spin: 1.4,
      moves: ['phantom_rush', 'dimension_net', 'moon_storm', 'blink_slash'],
      moveCards: [
        { name: '月下无影连闪', tag: '✦ 见切', tagType: 'parry', desc: '瞬移至背后拔刀，二阶二段瞬身连斩' },
        { name: '月影分身合击', tag: '✦ 见切', tagType: 'parry', desc: '3~5 道月影分身多角度交叉斩击' },
        { name: '千刃次元刀网', tag: '危 必闪', tagType: 'danger', desc: '交错次元刀线切割全场，二阶双波连斩' },
        { name: '双旋白夜剑阵', tag: '✂ 可斩', tagType: 'slice', desc: '全向螺旋月光飞刃风暴' }
      ]
    }
  ],

  // 不可格挡/弹反的【危】字杀招集合
  UNBLOCKABLE_MOVES: {
    cross_cut: true,
    magma_pillars: true,
    quake_nova: true,
    dimension_net: true
  },

  isUnblockable: function (action) {
    return !!(action && this.UNBLOCKABLE_MOVES[action]);
  },

  getBossDef: function (bossId) {
    if (bossId && bossId !== 'random') {
      for (var i = 0; i < this.BOSS_LIST.length; i++) {
        if (this.BOSS_LIST[i].id === bossId) return this.BOSS_LIST[i];
      }
    }
    return this.BOSS_LIST[Math.floor(Math.random() * this.BOSS_LIST.length)];
  },

  // --------------------------------------------------------------------------
  // 创建
  // --------------------------------------------------------------------------
  create: function (mg, bossId) {
    var pick = this.getBossDef(bossId);
    var rx = mg.room.worldX, ry = mg.room.worldY;

    return {
      id: pick.id,
      bossId: pick.id,
      name: pick.name,
      shortName: pick.shortName,
      title: pick.title,
      badge: pick.badge,
      difficulty: pick.difficulty,
      colors: pick.colors,
      moves: pick.moves.slice(),

      sweepArc: pick.sweepArc || 1.6,
      sweepRange: pick.sweepRange || 250,
      bladeCount: pick.bladeCount || 5,
      novaRange: pick.novaRange || 195,
      stormCount: pick.stormCount || 12,
      speedMul: pick.speedMul || 0.96,
      spin: pick.spin || 1.1,

      maxHp: pick.hp,
      hp: pick.hp,
      maxPosture: pick.posture,
      posture: 0,
      postureDecayDelay: 0,
      phase: 1,

      x: rx + CFG.W / 2,
      y: ry + CFG.H * 0.34,
      introY0: ry + CFG.H * 0.34 - 120,
      introY1: ry + CFG.H * 0.34,
      r: 44,
      pulse: 0,
      facing: Math.PI / 2,

      state: 'intro',
      stateT: 0,
      stateDur: 1.25,
      action: null,
      lastAction: null,
      comboStep: 0,
      aim: Math.PI / 2,

      vulnerable: false,
      windowHits: 0,
      weakSpin: 0,
      weak: [
        { a: 0 },
        { a: Math.PI }
      ],

      blades: [],
      hazards: [],
      slashVfx: [],
      slashScars: [],
      afterimages: [],
      clashRings: [],

      hitCd: 0,
      hitFlash: 0,
      execFlash: 0,
      parryGlint: 0,
      swingHit: false,
      lungeHit: false,
      lungeDir: 0,
      novaHit: false,
      novaOuterHit: false,
      novaThirdHit: false,
      novaT: 0,
      deathT: 0,
      grazeCd: 0
    };
  },

  // --------------------------------------------------------------------------
  // 见切判定窗口：仅限【非危字招式】蓄力最后 0.28s 或出手前 0.14s
  // 必须通过空格【心眼·见切】主动触发，不再允许无脑左键贴脸白嫖！
  // --------------------------------------------------------------------------
  isParryWindow: function (boss) {
    if (!boss || this.isUnblockable(boss.action)) return false;
    var win = boss.tutorialParryWindow || boss.styleParryWindow || 0.28;
    if (boss.state === 'telegraph') {
      var rem = boss.stateDur - boss.stateT;
      return rem <= win && rem >= -0.02;
    }
    if (boss.state === 'action') {
      return boss.stateT <= (win > 0.3 ? 0.20 : 0.14);
    }
    return false;
  },

  // --------------------------------------------------------------------------
  // 架势值与破防
  // --------------------------------------------------------------------------
  addPosture: function (boss, amount, mg) {
    if (!boss || boss.state === 'dying' || boss.state === 'broken') return false;
    boss.posture = Math.min(boss.maxPosture, (boss.posture || 0) + amount);
    boss.postureDecayDelay = 2.2;

    if (boss.posture >= boss.maxPosture) {
      this.enterBroken(boss, mg);
      return true;
    }
    return false;
  },

  enterBroken: function (boss, mg) {
    var data = mg.iaijutsuData;
    boss.state = 'broken';
    boss.stateT = 0;
    boss.stateDur = 2.2;
    boss.vulnerable = true;
    boss.action = null;
    boss.comboStep = 0;
    boss.windowHits = 0;
    boss.posture = boss.maxPosture;

    boss.blades.length = 0;
    boss.hazards.length = 0;

    boss.clashRings.push({
      x: boss.x, y: boss.y, r: 24, maxR: 230,
      color: '#fde047', subColor: '#f43f5e', life: 0.42, maxLife: 0.42, star: true
    });

    if (data) {
      data.bulletTime = Math.max(data.bulletTime || 0, 0.2);
    }
    SFX.play('victory');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.65);
    FX.floatText(boss.x, boss.y - boss.r - 30, '💥 架势崩解！出刀【居合处决】！', '#fde047', 1.75);
    mg.addExplosion(boss.x, boss.y, '#fde047', 34);
    mg.addExplosion(boss.x, boss.y, boss.colors.main, 22);
  },

  // --------------------------------------------------------------------------
  // 居合处决（架势破防后的一刀重创）
  // --------------------------------------------------------------------------
  executeBoss: function (boss, hitAngle, mg) {
    var data = mg.iaijutsuData;
    var style = (data && data.bossStyle) || (window.IaijutsuBossStyles ? window.IaijutsuBossStyles.getActiveStyle(mg) : null);
    var baseExec = 26 + ((style && style.execBonus) ? style.execBonus : 0);
    var execDmg = boss.hp <= (baseExec + 2) ? boss.hp : baseExec;
    boss.hp = (data && data.bossTutorial) ? Math.max(12, boss.hp - execDmg) : Math.max(0, boss.hp - execDmg);
    boss.posture = 0;
    boss.hitFlash = 0.35;
    boss.execFlash = 0.48;
    boss.hitCd = 0.25;
    boss.windowHits = 0;

    if (data) {
      data.execCount = (data.execCount || 0) + 1;
      data.bulletTime = Math.max(data.bulletTime || 0, 0.24);
    }

    Player.skillTimers[1] = 0;
    if (data) data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.45);
    Player.invulnTimer = Math.max(Player.invulnTimer, 0.45);

    mg.combo += 10;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;

    var ang = isFinite(hitAngle) ? hitAngle : Math.atan2(boss.y - Player.y, boss.x - Player.x);
    var scarLen = 280;
    boss.slashScars.push({
      x0: boss.x - Math.cos(ang) * scarLen,
      y0: boss.y - Math.sin(ang) * scarLen,
      x1: boss.x + Math.cos(ang) * scarLen,
      y1: boss.y + Math.sin(ang) * scarLen,
      color: '#fde047', coreColor: '#ffffff', width: 14, life: 0.65, maxLife: 0.65
    });
    boss.clashRings.push({
      x: boss.x, y: boss.y, r: 20, maxR: 280,
      color: '#fde047', subColor: boss.colors.main, life: 0.5, maxLife: 0.5, star: true
    });

    SFX.play('iai');
    SFX.play('lightning');
    SFX.play('victory');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.85);
    var execTxt = (style && style.id === 'jigen') ? ('🔥 秘剑·泷落断魄 -' + execDmg) : ('⚡ 居合处决 · 一刀断魄 -' + execDmg);
    FX.floatText(boss.x, boss.y - boss.r - 36, execTxt, '#fde047', 2.05);
    if (window.IaijutsuBossStyles && style) {
      window.IaijutsuBossStyles.showCalligraphy(mg, style.id === 'jigen' ? '秘剑 · 泷落' : '奥义 · 处决', style.shortName, '#fde047');
    }
    mg.addExplosion(boss.x, boss.y, '#fde047', 42);
    mg.addExplosion(boss.x, boss.y, boss.colors.main, 28);

    if (boss.hp <= 0) {
      this.startDying(boss, mg);
      return;
    }

    if (!this.checkPhaseTransition(boss, mg)) {
      this.evadeStep(boss, mg);
      boss.state = 'idle';
      boss.stateT = 0;
      boss.stateDur = this.durOf(boss, 0.65);
      boss.vulnerable = true;
    }

    if (data && data.bossDummy && data.dummies.indexOf(data.bossDummy) < 0) {
      data.dummies.push(data.bossDummy);
    }
  },

  // --------------------------------------------------------------------------
  // 完美见切弹反（仅由空格【心眼·见切】卡金光触发）
  // --------------------------------------------------------------------------
  triggerPerfectParry: function (boss, mg, source) {
    var data = mg.iaijutsuData;
    if (!boss || !data || boss.state === 'dying') return false;

    var style = (data && data.bossStyle) || (window.IaijutsuBossStyles ? window.IaijutsuBossStyles.getActiveStyle(mg) : null);
    var refund = (style && style.eyeRefund) ? style.eyeRefund : 2.0;
    data.parryCount = (data.parryCount || 0) + 1;
    data.eyeCd = Math.max(0, (data.eyeCd || 0) - refund);
    data.bulletTime = Math.max(data.bulletTime || 0, 0.22);

    Player.skillTimers[1] = 0;
    data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.48);
    Player.invulnTimer = Math.max(Player.invulnTimer, 0.48);

    mg.combo += 5;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;

    boss.action = null;
    boss.comboStep = 0;
    boss.swingHit = true;
    boss.lungeHit = true;
    boss.novaHit = true;
    boss.novaOuterHit = true;
    boss.novaThirdHit = true;
    boss.hitFlash = 0.28;
    boss.hitCd = 0.14;
    boss.pendingClones = [];

    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      if (Utils.dist(b.x, b.y, Player.x, Player.y) <= 260) {
        mg.addExplosion(b.x, b.y, '#7dd3fc', 8);
        boss.blades.splice(i, 1);
      }
    }

    var parryRes = (window.IaijutsuBossStyles && window.IaijutsuBossStyles.onPerfectParry)
      ? window.IaijutsuBossStyles.onPerfectParry(boss, mg)
      : { counterDmg: 6, postureGain: 34, label: '⚡ 心眼·完美见切！反斩 -6' };
    var counterDmg = parryRes.counterDmg || 6;
    var parryPosture = parryRes.postureGain || 34;
    boss.hp = data.bossTutorial ? Math.max(75, boss.hp - counterDmg) : Math.max(0, boss.hp - counterDmg);

    var cx = (Player.x + boss.x) * 0.5;
    var cy = (Player.y + boss.y) * 0.5;
    boss.clashRings.push({
      x: cx, y: cy, r: 16, maxR: 210,
      color: (style && style.color) || '#7dd3fc', subColor: '#fde047', life: 0.38, maxLife: 0.38, star: true
    });

    SFX.play('parry');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.58);
    FX.floatText(boss.x, boss.y - boss.r - 32, parryRes.label || ('⚡ 心眼·完美见切！反斩 -' + counterDmg), (style && style.color) || '#7dd3fc', 1.75);
    mg.addExplosion(cx, cy, '#fde047', 26);
    mg.addExplosion(cx, cy, (style && style.color) || '#38bdf8', 22);

    if (boss.hp <= 0) {
      this.startDying(boss, mg);
      return true;
    }

    var broke = this.addPosture(boss, data.bossTutorial && boss.tutorialLockPosture ? 0 : parryPosture, mg);
    if (!broke) {
      if (!this.checkPhaseTransition(boss, mg)) {
        boss.state = 'recover';
        boss.stateT = 0;
        boss.stateDur = this.durOf(boss, 1.15);
        boss.vulnerable = true;
        boss.windowHits = 0;
      }
    }

    if (data.bossDummy && data.dummies.indexOf(data.bossDummy) < 0) {
      data.dummies.push(data.bossDummy);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 命中回调：严惩蓄力/出招期无脑贴脸硬砍！
  // --------------------------------------------------------------------------
  hit: function (dm, isDash, hitAngle, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss) return;

    if (boss.state === 'intro' || boss.state === 'dying' || boss.hitCd > 0) {
      if (boss.state !== 'dying') data.dummies.push(dm);
      return;
    }

    // 1) 架势崩解：触发【居合处决】
    if (boss.state === 'broken') {
      this.executeBoss(boss, hitAngle, mg);
      return;
    }

    // 清除原版居合突进当帧注入的 0.30s 免费无敌帧，防止贴脸硬撞吞掉霸体反斩/白嫖无敌
    Player.invulnTimer = Math.min(Player.invulnTimer || 0, data.bossSafeInvuln || 0);

    var rx = mg.room.worldX, ry = mg.room.worldY;
    var pushAng = Math.atan2(Player.y - boss.y, Player.x - boss.x);

    // 2) 出招中硬撞 Boss 本体：霸体迎击反斩（直接扣血！）
    if (boss.state === 'action') {
      boss.hitCd = 0.2;
      Player.dashT = 0;
      data.isDashing = false;
      Player.x = Utils.clamp(boss.x + Math.cos(pushAng) * (boss.r + 75), rx + 50, rx + CFG.W - 50);
      Player.y = Utils.clamp(boss.y + Math.sin(pushAng) * (boss.r + 75), ry + 84, ry + CFG.H - 50);
      Player.skillTimers[1] = Math.max(Player.skillTimers[1] || 0, data.bossTutorial ? 0.75 : 1.15);
      boss.clashRings.push({
        x: (Player.x + boss.x) * 0.5, y: (Player.y + boss.y) * 0.5,
        r: 12, maxR: 110, color: '#ef4444', subColor: '#fde047', life: 0.25, maxLife: 0.25, star: false
      });
      if (data.bossTutorial) data.tutorialEvent = 'action_hit';
      this.damagePlayer(mg, Player.x, Player.y, data.bossTutorial ? '⛔ 出招期别硬撞！先躲开或按空格见切' : '⚔️ 硬撞霸体 · 迎击反斩 -1 命');
      data.dummies.push(dm);
      return;
    }

    // 3) 蓄力中硬撞 Boss 本体：震刀弹开（0 伤 0 架势 + 强力击退 + 锁 1.15s 冷却 + 无免费无敌！）
    if (boss.state === 'telegraph') {
      boss.hitCd = 0.22;
      boss.hitFlash = 0.08;
      Player.dashT = 0;
      data.isDashing = false;
      Player.x = Utils.clamp(boss.x + Math.cos(pushAng) * (boss.r + 110), rx + 50, rx + CFG.W - 50);
      Player.y = Utils.clamp(boss.y + Math.sin(pushAng) * (boss.r + 110), ry + 84, ry + CFG.H - 50);
      Player.skillTimers[1] = data.bossTutorial ? 0.75 : 1.15;
      // 注意：故意不给无敌帧！贴脸瞎砍被弹开后必须靠走位或空格心眼应对接下来的招式
      if (data.bossTutorial) data.tutorialEvent = 'recoil';

      boss.clashRings.push({
        x: (Player.x + boss.x) * 0.5, y: (Player.y + boss.y) * 0.5,
        r: 14, maxR: 95, color: '#f87171', subColor: '#e2e8f0', life: 0.24, maxLife: 0.24, star: false
      });
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.28);
      var tip = this.isUnblockable(boss.action) ? '⛔ 危招霸体 · 震刀弹开!' : '🔰 震刀弹开！用【空格】心眼见切';
      FX.floatText(boss.x, boss.y - boss.r - 22, tip, '#fca5a5', 1.25);
      mg.addExplosion((Player.x + boss.x) * 0.5, (Player.y + boss.y) * 0.5, '#f87171', 14);
      data.dummies.push(dm);
      return;
    }

    boss.hitCd = 0.14;

    // 4) 破绽期弱点判定
    var weakHit = false;
    if (boss.vulnerable) {
      var px = (data.prevPos && data.prevPos.x !== undefined) ? data.prevPos.x : Player.x;
      var py = (data.prevPos && data.prevPos.y !== undefined) ? data.prevPos.y : Player.y;
      for (var i = 0; i < boss.weak.length; i++) {
        var wp = this.getWeakPos(boss, i);
        var d;
        if (isDash) {
          d = Utils.distToSegment(wp.x, wp.y, px, py, Player.x, Player.y);
        } else {
          d = Utils.dist(Player.x, Player.y, wp.x, wp.y);
          if (d <= 44) { weakHit = true; break; }
        }
        if (d <= wp.r + 22) { weakHit = true; break; }
      }
    }

    var styleHit = (window.IaijutsuBossStyles && window.IaijutsuBossStyles.onBossHit)
      ? window.IaijutsuBossStyles.onBossHit(boss, weakHit, isDash, mg)
      : { extraDmg: 0, extraPosture: 0, label: '' };
    var dmg = (weakHit ? 5 : 3) + (styleHit.extraDmg || 0);
    var postureGain = (weakHit ? 20 : 10) + (styleHit.extraPosture || 0);
    boss.hp = data.bossTutorial ? Math.max(75, boss.hp - dmg) : Math.max(0, boss.hp - dmg);
    boss.hitFlash = weakHit ? 0.18 : 0.10;
    boss.windowHits = (boss.windowHits || 0) + 1;
    if (data.bossTutorial) {
      data.tutorialEvent = weakHit ? 'weak_hit' : 'normal_hit';
      data.tutorialSlashCount = (data.tutorialSlashCount || 0) + 1;
    }

    // 仅给极短 0.08s 防同帧叠伤保护，禁止靠连点左键白嫖全程无敌！
    Player.skillTimers[1] = 0;
    data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.08);
    Player.invulnTimer = data.bossSafeInvuln;
    data.bulletTime = Math.max(data.bulletTime || 0, weakHit ? 0.03 : 0);

    if (styleHit.label) {
      mg.combo += 3;
      SFX.play('hit');
      SFX.play('lightning');
      FX.floatText(boss.x, boss.y - boss.r - 22, styleHit.label, '#fde047', 1.65);
      mg.addExplosion(boss.x, boss.y, '#fde047', 22);
    } else if (weakHit) {
      mg.combo += 3;
      SFX.play('hit');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.28);
      FX.floatText(boss.x, boss.y - boss.r - 18, '🎯 破绽一斩 -' + dmg, '#fde047', 1.4);
      mg.addExplosion(boss.x, boss.y, '#fde047', 20);
      mg.addExplosion(boss.x, boss.y, boss.colors.main, 12);
    } else {
      mg.combo += 1;
      SFX.play('hit');
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.14);
      FX.floatText(boss.x, boss.y - boss.r - 14, '⚔️ 斩击 -' + dmg, '#e2e8f0', 1.1);
      mg.addExplosion(boss.x, boss.y, '#cbd5e1', 10);
    }

    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;

    if (boss.hp <= 0) {
      this.startDying(boss, mg);
      return;
    }

    var broke = this.addPosture(boss, data.bossTutorial && boss.tutorialLockPosture ? 0 : postureGain, mg);
    if (!broke && !this.checkPhaseTransition(boss, mg)) {
      // 严防贴脸连切：破绽期挨满 2 刀，Boss 立刻敏捷撤步并反手起招！
      if (boss.windowHits >= 2 && (boss.state === 'idle' || boss.state === 'recover')) {
        boss.windowHits = 0;
        this.evadeStep(boss, mg);
        if (!boss.tutorialNoAutoPick) {
          this.pickAction(boss, mg);
        } else {
          FX.floatText(boss.x, boss.y - boss.r - 26, '💨 满 2 刀撤步拉开！', '#7dd3fc', 1.35);
        }
      }
    }

    data.dummies.push(dm);
  },

  // --------------------------------------------------------------------------
  // 50% 血量二阶段觉醒
  // --------------------------------------------------------------------------
  checkPhaseTransition: function (boss, mg) {
    var data = mg.iaijutsuData;
    if (boss.phase >= 2 || boss.hp <= 0) return false;
    if (boss.hp / boss.maxHp <= 0.5) {
      boss.phase = 2;
      boss.state = 'stagger';
      boss.stateT = 0;
      boss.stateDur = 0.72;
      boss.vulnerable = false;
      boss.action = null;
      boss.comboStep = 0;
      boss.windowHits = 0;
      boss.blades.length = 0;
      boss.hazards.length = 0;

      // 觉醒冲击波把贴脸玩家震退到中距离
      var rx = mg.room.worldX, ry = mg.room.worldY;
      var ang = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      if (Utils.dist(Player.x, Player.y, boss.x, boss.y) < 180) {
        Player.x = Utils.clamp(boss.x + Math.cos(ang) * 200, rx + 50, rx + CFG.W - 50);
        Player.y = Utils.clamp(boss.y + Math.sin(ang) * 200, ry + 84, ry + CFG.H - 50);
      }

      boss.clashRings.push({
        x: boss.x, y: boss.y, r: 22, maxR: 280,
        color: boss.colors.main, subColor: '#fde047', life: 0.55, maxLife: 0.55, star: true
      });

      if (data) {
        data.bannerTimer = 2.4;
        data.bannerText = '🔥 ' + boss.name + ' · 二阶段觉醒';
        data.bannerSub = boss.id === 'mumyo' ? '「三连残月 · 三段折返一闪」'
          : (boss.id === 'akaoni' ? '「七柱业火 · 三连怒涛震地」' : '「五影合击 · 双波次元刀网」');
      }
      SFX.play('victory');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.68);
      mg.addExplosion(boss.x, boss.y, boss.colors.main, 42);
      mg.addExplosion(boss.x, boss.y, '#ffffff', 18);
      return true;
    }
    return false;
  },

  evadeStep: function (boss, mg) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var ang = Math.atan2(boss.y - Player.y, boss.x - Player.x) + (Math.random() < 0.5 ? 0.68 : -0.68);
    boss.afterimages.push({ x: boss.x, y: boss.y, facing: boss.facing, color: boss.colors.main, life: 0.3, maxLife: 0.3 });
    boss.x = Utils.clamp(boss.x + Math.cos(ang) * 150, rx + 110, rx + CFG.W - 110);
    boss.y = Utils.clamp(boss.y + Math.sin(ang) * 125, ry + 125, ry + CFG.H - 105);
  },

  getWeakPos: function (boss, i) {
    var wp = boss.weak[i];
    var ang = boss.weakSpin + wp.a;
    var dist = boss.r + 12;
    return {
      x: boss.x + Math.cos(ang) * dist,
      y: boss.y + Math.sin(ang) * dist,
      r: 12
    };
  },

  computeRank: function (clearTime, hitsTaken, parryCount) {
    if (hitsTaken === 0 && (clearTime <= 65 || parryCount >= 3)) return 'S';
    if (hitsTaken <= 1 && clearTime <= 85) return 'A';
    if (hitsTaken <= 2) return 'B';
    return 'C';
  },

  startDying: function (boss, mg) {
    var data = mg.iaijutsuData;
    boss.state = 'dying';
    boss.stateT = 0;
    boss.deathT = 0;
    boss.vulnerable = false;
    boss.hp = 0;
    boss.blades.length = 0;
    boss.hazards.length = 0;

    if (data.bossDummy) {
      var idx = data.dummies.indexOf(data.bossDummy);
      if (idx >= 0) data.dummies.splice(idx, 1);
    }
    data.bossDead = true;

    var clearTime = Math.max(0.1, mg.timer || 0.1);
    var hitsTaken = data.hitsTaken || 0;
    var parryCount = data.parryCount || 0;
    var rank = this.computeRank(clearTime, hitsTaken, parryCount);
    data.bossClearTime = clearTime;
    data.bossRank = rank;

    mg.combo += 25;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    try { mg.saveHighScore(mg.currentGame, mg.maxCombo); } catch (e) {}

    boss.slashScars.push({
      x0: boss.x - 260, y0: boss.y - 140,
      x1: boss.x + 260, y1: boss.y + 140,
      color: '#fde047', coreColor: '#ffffff', width: 16, life: 1.2, maxLife: 1.2
    });
    boss.clashRings.push({
      x: boss.x, y: boss.y, r: 24, maxR: 320,
      color: '#fde047', subColor: boss.colors.main, life: 0.7, maxLife: 0.7, star: true
    });

    SFX.play('victory');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.9);
    data.bannerTimer = 3.0;
    data.bannerText = '🏆 宿敌已斩 · 评级 ' + rank;
    data.bannerSub = clearTime.toFixed(1) + 's · ' + (hitsTaken === 0 ? '无伤通关' : ('受击 ' + hitsTaken + ' 次')) + ' · 见切 ' + parryCount + ' 次';
    mg.addExplosion(boss.x, boss.y, boss.colors.main, 56);
    mg.addExplosion(boss.x, boss.y, '#ffffff', 30);
    FX.floatText(boss.x, boss.y - 44, '⚔️ 一刀两断！', '#fde047', 2.3);
  },

  // --------------------------------------------------------------------------
  // 帧更新
  // --------------------------------------------------------------------------
  update: function (dt, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss) return;

    boss.pulse += dt;
    boss.hitCd = Math.max(0, boss.hitCd - dt);
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    boss.execFlash = Math.max(0, boss.execFlash - dt);
    boss.grazeCd = Math.max(0, boss.grazeCd - dt);
    boss.stateT += dt;

    if (boss.state !== 'action' && boss.state !== 'dying' && boss.state !== 'broken') {
      boss.facing = Math.atan2(Player.y - boss.y, Player.x - boss.x);
    }

    boss.parryGlint = this.isParryWindow(boss) ? Math.min(1, boss.parryGlint + dt * 11) : Math.max(0, boss.parryGlint - dt * 12);

    // 架势衰减（不积极压制会逐渐恢复）
    if (boss.state !== 'broken' && boss.state !== 'dying') {
      if (boss.postureDecayDelay > 0) {
        boss.postureDecayDelay = Math.max(0, boss.postureDecayDelay - dt);
      } else if (boss.posture > 0) {
        boss.posture = Math.max(0, boss.posture - 10 * dt);
      }
    }

    var spinMul = boss.phase === 1 ? 1.15 : 1.65;
    boss.weakSpin += dt * boss.spin * spinMul;

    this.updateVfx(dt, boss);
    this.updateBlades(dt, mg);
    this.updateHazards(dt, mg);

    if (boss.state === 'dying') {
      boss.deathT += dt;
      if (Math.floor(boss.deathT * 15) % 3 === 0) {
        var ea = Math.random() * Math.PI * 2;
        var ed = Math.random() * boss.r * 1.1;
        mg.addExplosion(boss.x + Math.cos(ea) * ed, boss.y + Math.sin(ea) * ed,
          Math.random() < 0.5 ? boss.colors.main : '#fde047', 6);
      }
      if (boss.deathT >= 1.6) {
        var rankStr = data.bossRank || 'B';
        var tStr = (data.bossClearTime || mg.timer || 0).toFixed(1);
        mg.finishGame('win', '🏆 斩杀「' + boss.name + '」· ' + rankStr + ' 级评级 (' + tStr + 's)！');
      }
      return;
    }

    if (boss.state === 'intro') {
      var t = Math.min(1, boss.stateT / 0.5);
      var ease = 1 - Math.pow(1 - t, 3);
      boss.y = boss.introY0 + (boss.introY1 - boss.introY0) * ease;
      if (boss.stateT >= boss.stateDur) {
        boss.state = 'idle';
        boss.stateT = 0;
        boss.stateDur = this.durOf(boss, 0.65);
        boss.vulnerable = true;
      }
      return;
    }

    if (boss.state === 'idle' || boss.state === 'recover') {
      this.drift(boss, dt, mg);
    }

    switch (boss.state) {
      case 'idle':
        boss.vulnerable = true;
        if (boss.stateT >= boss.stateDur) {
          boss.windowHits = 0;
          this.pickAction(boss, mg);
        }
        break;

      case 'telegraph':
        boss.vulnerable = false;
        this.tickTelegraph(boss, dt, mg);
        break;

      case 'action':
        boss.vulnerable = false;
        this.tickAction(boss, dt, mg);
        break;

      case 'recover':
        boss.vulnerable = true;
        if (boss.stateT >= boss.stateDur) {
          boss.windowHits = 0;
          this.pickAction(boss, mg);
        }
        break;

      case 'broken':
        boss.vulnerable = true;
        if (boss.stateT >= boss.stateDur) {
          boss.posture = Math.floor(boss.maxPosture * 0.4);
          boss.state = 'idle';
          boss.stateT = 0;
          boss.stateDur = this.durOf(boss, 0.55);
        }
        break;

      case 'stagger':
        boss.vulnerable = false;
        if (boss.stateT >= boss.stateDur) {
          boss.state = 'idle';
          boss.stateT = 0;
          boss.stateDur = this.durOf(boss, 0.4);
          boss.vulnerable = true;
        }
        break;
    }
  },

  durOf: function (boss, base) {
    var f = boss.phase === 1 ? 1.0 : 0.80;
    return base * f * boss.speedMul;
  },

  drift: function (boss, dt, mg) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var pad = 115;
    var ang = Math.atan2(boss.y - Player.y, boss.x - Player.x);
    var preferDist = boss.id === 'akaoni' ? 195 : (boss.id === 'byakuya' ? 260 : 225);
    var strafe = Math.sin(boss.pulse * 1.8) * 0.78;
    var tx = Utils.clamp(Player.x + Math.cos(ang + strafe) * preferDist, rx + pad, rx + CFG.W - pad);
    var ty = Utils.clamp(Player.y + Math.sin(ang + strafe) * preferDist, ry + pad + 35, ry + CFG.H - pad);

    var dx = tx - boss.x, dy = ty - boss.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 6) {
      var spd = (boss.id === 'byakuya' ? 185 : (boss.id === 'akaoni' ? 120 : 155)) * (boss.phase === 2 ? 1.22 : 1.0);
      boss.x += (dx / len) * spd * dt;
      boss.y += (dy / len) * spd * dt;
    }
  },

  // --------------------------------------------------------------------------
  // 选招：攻势紧凑、贴脸强惩罚
  // --------------------------------------------------------------------------
  pickAction: function (boss, mg) {
    var pool = boss.moves && boss.moves.length ? boss.moves.slice() : ['iaijutsu_draw', 'blitz', 'cross_cut', 'blades'];
    if (boss.lastAction && pool.length > 1) {
      pool = pool.filter(function (m) { return m !== boss.lastAction; });
    }

    var distP = Utils.dist(boss.x, boss.y, Player.x, Player.y);
    var action = pool[Math.floor(Math.random() * pool.length)];

    // 贴脸高概率触发高威胁反制技
    if (distP < 185 && Math.random() < 0.58) {
      if (boss.id === 'akaoni' && boss.lastAction !== 'quake_nova') action = 'quake_nova';
      else if (boss.id === 'mumyo' && boss.lastAction !== 'iaijutsu_draw') action = 'iaijutsu_draw';
      else if (boss.id === 'byakuya' && boss.lastAction !== 'blink_slash') action = 'blink_slash';
    }

    boss.lastAction = action;
    boss.comboStep = 0;
    this.beginMove(boss, action, mg);
  },

  beginMove: function (boss, action, mg) {
    boss.action = action;
    boss.state = 'telegraph';
    boss.stateT = 0;
    boss.vulnerable = false;
    boss.swingHit = false;
    boss.lungeHit = false;
    boss.novaHit = false;
    boss.novaOuterHit = false;
    boss.novaThirdHit = false;
    boss.novaT = 0;
    boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);

    var hintY = boss.y - boss.r - 28;
    var rx = mg.room.worldX, ry = mg.room.worldY;

    if (action === 'iaijutsu_draw') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.42 : 0.68);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? ('⚡ ' + (boss.comboStep + 1) + '连残月!') : '✦ 残月连斩 · 空格见切', '#fda4af', 1.25);

    } else if (action === 'blitz') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.42 : 0.72);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? ('⚡ ' + (boss.comboStep + 1) + '段一闪!') : '✦ 极意·一闪 · 空格见切', '#fde047', 1.3);

    } else if (action === 'cross_cut') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.50 : 0.76);
      var cx = Utils.clamp(Player.x, rx + 100, rx + CFG.W - 100);
      var cy = Utils.clamp(Player.y, ry + 100, ry + CFG.H - 100);
      var baseA = boss.comboStep > 0 ? 0 : (Math.PI * 0.25);
      boss.crossCenter = { x: cx, y: cy, ang: baseA };
      SFX.play('lightning');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? '危 正十字追斩!' : '危 十字断空 · 不可弹反!', '#ef4444', 1.35);

    } else if (action === 'blades') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.34 : 0.46);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, '🌙 月轮双波 · 挥刀斩落', '#fda4af', 1.15);

    } else if (action === 'heavy_cleave') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.48 : 0.78);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? '🔥 鬼神回劈!' : '✦ 鬼神重劈 · 空格见切', '#fb923c', 1.3);

    } else if (action === 'magma_pillars') {
      boss.stateDur = this.durOf(boss, 0.44);
      SFX.play('lightning');
      FX.floatText(boss.x, hintY, '危 炼狱业火柱 · 速离火阵!', '#ef4444', 1.35);

    } else if (action === 'quake_nova') {
      boss.stateDur = this.durOf(boss, 0.72);
      SFX.play('lightning');
      FX.floatText(boss.x, hintY, boss.phase >= 2 ? '危 三连震地 · 进退闪避!' : '危 双环震地 · 先出后进!', '#ef4444', 1.35);

    } else if (action === 'oni_charge') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.48 : 0.74);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? '👹 二段猛突!' : '✦ 赤鬼猛突 · 空格见切', '#fb923c', 1.3);

    } else if (action === 'phantom_rush') {
      boss.stateDur = this.durOf(boss, 0.80);
      var cloneCnt = boss.phase >= 2 ? 5 : 3;
      boss.pendingClones = [];
      var baseAng = Math.random() * Math.PI * 2;
      for (var ci = 0; ci < cloneCnt; ci++) {
        var ca = baseAng + (ci / cloneCnt) * Math.PI * 2;
        var sx = Utils.clamp(Player.x + Math.cos(ca) * 225, rx + 70, rx + CFG.W - 70);
        var sy = Utils.clamp(Player.y + Math.sin(ca) * 190, ry + 95, ry + CFG.H - 70);
        var aimC = Math.atan2(Player.y - sy, Player.x - sx);
        boss.pendingClones.push({
          x0: sx, y0: sy,
          x1: sx + Math.cos(aimC) * 520,
          y1: sy + Math.sin(aimC) * 520,
          ang: aimC
        });
      }
      SFX.play('lightning');
      FX.floatText(boss.x, hintY, '✦ 月影分身合击 · 空格见切!', '#7dd3fc', 1.3);

    } else if (action === 'dimension_net') {
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.56 : 0.82);
      var netCnt = boss.phase >= 2 ? 7 : 5;
      boss.pendingNet = [];
      for (var ni = 0; ni < netCnt; ni++) {
        var na = (ni / netCnt) * Math.PI + (Math.random() - 0.5) * 0.2;
        var offset = (ni % 2 === 0 ? 1 : -1) * (54 + Math.floor(ni / 2) * 66);
        var mx = Player.x + Math.cos(na + Math.PI / 2) * offset;
        var my = Player.y + Math.sin(na + Math.PI / 2) * offset;
        boss.pendingNet.push({
          x0: mx - Math.cos(na) * 640, y0: my - Math.sin(na) * 640,
          x1: mx + Math.cos(na) * 640, y1: my + Math.sin(na) * 640,
          ang: na
        });
      }
      SFX.play('lightning');
      FX.floatText(boss.x, hintY, boss.comboStep > 0 ? '危 二波次元刀网!' : '危 千刃次元网 · 找隙闪避!', '#c084fc', 1.35);

    } else if (action === 'moon_storm') {
      boss.stateDur = this.durOf(boss, 0.52);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, '🌀 双旋白夜剑阵', '#7dd3fc', 1.25);

    } else if (action === 'blink_slash') {
      boss.afterimages.push({ x: boss.x, y: boss.y, facing: boss.facing, color: boss.colors.main, life: 0.35, maxLife: 0.35 });
      var behindAng = Math.atan2(boss.y - Player.y, boss.x - Player.x) + Math.PI + (Math.random() - 0.5) * 0.7;
      boss.x = Utils.clamp(Player.x + Math.cos(behindAng) * 112, rx + 90, rx + CFG.W - 90);
      boss.y = Utils.clamp(Player.y + Math.sin(behindAng) * 112, ry + 110, ry + CFG.H - 90);
      boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      boss.stateDur = this.durOf(boss, boss.comboStep > 0 ? 0.44 : 0.62);
      SFX.play('iai');
      mg.addExplosion(boss.x, boss.y, '#7dd3fc', 16);
      FX.floatText(boss.x, boss.y - boss.r - 28, boss.comboStep > 0 ? '⚡ 二段无影闪!' : '✦ 月下无影闪 · 空格见切!', '#7dd3fc', 1.3);
    }
  },

  tickTelegraph: function (boss, dt, mg) {
    var lockAt = Math.max(0, boss.stateDur - 0.28);
    if (boss.stateT < lockAt && (
      boss.action === 'iaijutsu_draw' || boss.action === 'blitz' ||
      boss.action === 'heavy_cleave' || boss.action === 'oni_charge' ||
      boss.action === 'blades' || boss.action === 'blink_slash'
    )) {
      var want = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      var diff = Utils.normalizeAngle(want - boss.aim);
      boss.aim += Utils.clamp(diff, -4.2 * dt, 4.2 * dt);
      boss.facing = boss.aim;
    }

    if (boss.stateT >= boss.stateDur) {
      boss.state = 'action';
      boss.stateT = 0;
      this.startAction(boss, mg);
    }
  },

  startAction: function (boss, mg) {
    var data = mg.iaijutsuData;

    if (boss.action === 'iaijutsu_draw' || boss.action === 'heavy_cleave' || boss.action === 'blink_slash') {
      var isHeavy = boss.action === 'heavy_cleave';
      var isBlink = boss.action === 'blink_slash';
      boss.stateDur = isHeavy ? 0.26 : 0.20;

      boss.slashVfx.push({
        x: boss.x, y: boss.y,
        r: boss.sweepRange,
        startAng: boss.aim - boss.sweepArc,
        endAng: boss.aim + boss.sweepArc,
        dir: (boss.comboStep % 2 === 0) ? 1 : -1,
        color: boss.colors.main,
        subColor: isHeavy ? '#fde047' : boss.colors.sub,
        life: 0.26, maxLife: 0.26
      });

      SFX.play('iai');
      SFX.play('swing');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, isHeavy ? 0.55 : 0.4);

      var dist = Utils.dist(boss.x, boss.y, Player.x, Player.y);
      var angToP = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      var diff = Math.abs(Utils.normalizeAngle(angToP - boss.aim));
      if (dist <= boss.sweepRange && diff <= boss.sweepArc && !boss.swingHit) {
        boss.swingHit = true;
        var hitTxt = isHeavy ? '🔥 鬼神重劈命中 · -1 命' : (isBlink ? '✨ 无影闪命中 · -1 命' : '🩸 残月斩命中 · -1 命');
        this.damagePlayer(mg, Player.x, Player.y, hitTxt);
      }

      // 赤鬼重劈额外迸发 3 道熔岩剑气波！
      if (isHeavy) {
        for (var fi = -1; fi <= 1; fi++) {
          var fa = boss.aim + fi * 0.34;
          boss.blades.push({
            x: boss.x + Math.cos(fa) * boss.r,
            y: boss.y + Math.sin(fa) * boss.r,
            vx: Math.cos(fa) * 310, vy: Math.sin(fa) * 310,
            ang: fa, color: '#f97316', life: 2.2, maxLife: 2.2
          });
        }
      }

      for (var i = 0; i < 20; i++) {
        var a = boss.aim - boss.sweepArc + (i / 19) * boss.sweepArc * 2;
        mg.particles.push({
          x: boss.x + Math.cos(a) * boss.sweepRange * 0.88,
          y: boss.y + Math.sin(a) * boss.sweepRange * 0.88,
          vx: Math.cos(a) * 145, vy: Math.sin(a) * 145,
          size: isHeavy ? 5.5 : 4,
          color: i % 2 === 0 ? boss.colors.main : boss.colors.accent,
          life: 0.32, maxLife: 0.32
        });
      }

    } else if (boss.action === 'blitz' || boss.action === 'oni_charge') {
      boss.stateDur = boss.action === 'oni_charge' ? 0.22 : 0.16;
      boss.lungeDir = boss.aim;
      boss.lungeHit = false;
      boss.lungeFrom = { x: boss.x, y: boss.y };
      SFX.play('iai');
      SFX.play('swing');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.5);

    } else if (boss.action === 'cross_cut') {
      boss.stateDur = 0.24;
      var cc = boss.crossCenter || { x: Player.x, y: Player.y, ang: Math.PI * 0.25 };
      var halfLen = 540;
      for (var ci = 0; ci < 2; ci++) {
        var ca = cc.ang + ci * (Math.PI / 2);
        var x0 = cc.x - Math.cos(ca) * halfLen;
        var y0 = cc.y - Math.sin(ca) * halfLen;
        var x1 = cc.x + Math.cos(ca) * halfLen;
        var y1 = cc.y + Math.sin(ca) * halfLen;
        boss.slashScars.push({
          x0: x0, y0: y0, x1: x1, y1: y1,
          color: boss.colors.main, coreColor: '#ffffff', width: 14, life: 0.45, maxLife: 0.45
        });
        if (Utils.distToSegment(Player.x, Player.y, x0, y0, x1, y1) <= 26) {
          this.damagePlayer(mg, Player.x, Player.y, '✖ 十字断空命中 · -1 命');
        }
      }
      SFX.play('iai');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);
      mg.addExplosion(cc.x, cc.y, boss.colors.main, 26);

    } else if (boss.action === 'blades') {
      boss.stateDur = 0.22;
      var n = boss.bladeCount + (boss.phase >= 2 ? 2 : 0) + (boss.comboStep > 0 ? 1 : 0);
      var spread = 0.16;
      for (var k = 0; k < n; k++) {
        var off = (k - (n - 1) / 2) * spread;
        var a2 = boss.aim + off;
        boss.blades.push({
          x: boss.x + Math.cos(a2) * (boss.r * 0.8),
          y: boss.y + Math.sin(a2) * (boss.r * 0.8),
          vx: Math.cos(a2) * 320, vy: Math.sin(a2) * 320,
          ang: a2, color: boss.colors.main, life: 2.4, maxLife: 2.4
        });
      }
      SFX.play('swing');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.22);

    } else if (boss.action === 'magma_pillars') {
      boss.stateDur = 0.22;
      var rx = mg.room.worldX, ry = mg.room.worldY;
      var count = boss.phase >= 2 ? 7 : 4;
      for (var pi = 0; pi < count; pi++) {
        var angP = (pi / count) * Math.PI * 2 + Math.random() * 0.4;
        var radP = pi === 0 ? 0 : (85 + Math.random() * 90);
        var px = Utils.clamp(Player.x + Math.cos(angP) * radP, rx + 70, rx + CFG.W - 70);
        var py = Utils.clamp(Player.y + Math.sin(angP) * radP, ry + 95, ry + CFG.H - 70);
        boss.hazards.push({
          kind: 'pillar',
          x: px, y: py,
          trackPlayer: pi >= 2, // 后续火柱动态追踪玩家脚步！
          r: 56,
          delay: pi * 0.16,
          warnDur: 0.68,
          activeDur: 0.34,
          t: 0,
          hit: false,
          color: '#f97316'
        });
      }
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.38);

    } else if (boss.action === 'quake_nova') {
      boss.stateDur = boss.phase >= 2 ? 1.12 : 0.76;
      boss.novaT = 0;
      if (!boss.novaHit) {
        boss.novaHit = true;
        if (Utils.dist(boss.x, boss.y, Player.x, Player.y) <= boss.novaRange) {
          this.damagePlayer(mg, Player.x, Player.y, '💥 内环震地命中 · -1 命');
        }
      }
      boss.clashRings.push({
        x: boss.x, y: boss.y, r: boss.r, maxR: boss.novaRange,
        color: '#f97316', subColor: '#ef4444', life: 0.38, maxLife: 0.38, star: false
      });
      SFX.play('lightning');
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.65);
      mg.addExplosion(boss.x, boss.y, '#f97316', 32);

    } else if (boss.action === 'phantom_rush') {
      boss.stateDur = 0.22;
      var clones = boss.pendingClones || [];
      for (var pIdx = 0; pIdx < clones.length; pIdx++) {
        var cl = clones[pIdx];
        boss.slashScars.push({
          x0: cl.x0, y0: cl.y0, x1: cl.x1, y1: cl.y1,
          color: '#38bdf8', coreColor: '#ffffff', width: 10, life: 0.42, maxLife: 0.42
        });
        boss.afterimages.push({ x: cl.x0, y: cl.y0, facing: cl.ang, color: '#38bdf8', life: 0.32, maxLife: 0.32 });
        if (Utils.distToSegment(Player.x, Player.y, cl.x0, cl.y0, cl.x1, cl.y1) <= 22) {
          this.damagePlayer(mg, Player.x, Player.y, '🦊 月影分身命中 · -1 命');
        }
      }
      boss.pendingClones = [];
      SFX.play('iai');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);

    } else if (boss.action === 'dimension_net') {
      boss.stateDur = 0.22;
      var net = boss.pendingNet || [];
      for (var nIdx = 0; nIdx < net.length; nIdx++) {
        var nl = net[nIdx];
        boss.slashScars.push({
          x0: nl.x0, y0: nl.y0, x1: nl.x1, y1: nl.y1,
          color: '#c084fc', coreColor: '#e0f2fe', width: 8, life: 0.44, maxLife: 0.44
        });
        if (Utils.distToSegment(Player.x, Player.y, nl.x0, nl.y0, nl.x1, nl.y1) <= 18) {
          this.damagePlayer(mg, Player.x, Player.y, '🕸 次元刀网命中 · -1 命');
        }
      }
      boss.pendingNet = [];
      SFX.play('iai');
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.48);

    } else if (boss.action === 'moon_storm') {
      boss.stateDur = 0.26;
      var sn = boss.stormCount + (boss.phase >= 2 ? 6 : 0);
      for (var si = 0; si < sn; si++) {
        var sa = (si / sn) * Math.PI * 2 + boss.aim;
        boss.blades.push({
          x: boss.x + Math.cos(sa) * (boss.r * 0.8),
          y: boss.y + Math.sin(sa) * (boss.r * 0.8),
          vx: Math.cos(sa) * 235, vy: Math.sin(sa) * 235,
          ang: sa, color: '#38bdf8', life: 2.3, maxLife: 2.3
        });
      }
      if (boss.phase >= 2) {
        // 二阶追加逆向第二环慢速飞刃，形成螺旋封锁
        for (var sj = 0; sj < 10; sj++) {
          var sb = (sj / 10) * Math.PI * 2 + boss.aim + 0.31;
          boss.blades.push({
            x: boss.x + Math.cos(sb) * (boss.r * 0.7),
            y: boss.y + Math.sin(sb) * (boss.r * 0.7),
            vx: Math.cos(sb) * 165, vy: Math.sin(sb) * 165,
            ang: sb, color: '#c084fc', life: 2.6, maxLife: 2.6
          });
        }
      }
      SFX.play('swing');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.35);
    }
  },

  tickAction: function (boss, dt, mg) {
    // 赤鬼连环震地波：一阶双环（内→外），二阶三环（内→外→内）
    if (boss.action === 'quake_nova') {
      boss.novaT = (boss.novaT || 0) + dt;
      if (!boss.novaOuterHit && boss.novaT >= 0.42) {
        boss.novaOuterHit = true;
        var dOuter = Utils.dist(boss.x, boss.y, Player.x, Player.y);
        if (dOuter >= boss.novaRange - 22 && dOuter <= boss.novaRange + 150) {
          this.damagePlayer(mg, Player.x, Player.y, '💥 外环震地命中 · -1 命');
        }
        boss.clashRings.push({
          x: boss.x, y: boss.y, r: boss.novaRange - 18, maxR: boss.novaRange + 150,
          color: '#ef4444', subColor: '#fde047', life: 0.34, maxLife: 0.34, star: false
        });
        SFX.play('lightning');
        Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);
      }
      if (boss.phase >= 2 && !boss.novaThirdHit && boss.novaT >= 0.84) {
        boss.novaThirdHit = true;
        if (Utils.dist(boss.x, boss.y, Player.x, Player.y) <= boss.novaRange + 15) {
          this.damagePlayer(mg, Player.x, Player.y, '💥 终段震地命中 · -1 命');
        }
        boss.clashRings.push({
          x: boss.x, y: boss.y, r: boss.r, maxR: boss.novaRange + 15,
          color: '#f97316', subColor: '#ffffff', life: 0.34, maxLife: 0.34, star: true
        });
        SFX.play('lightning');
        Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.62);
      }
    }

    if (boss.action === 'blitz' || boss.action === 'oni_charge') {
      var isOni = boss.action === 'oni_charge';
      var spd = isOni ? 1580 : 2150;
      var step = spd * dt;
      var rx = mg.room.worldX, ry = mg.room.worldY, pad = 90;
      var prevX = boss.x, prevY = boss.y;
      var nx = Utils.clamp(boss.x + Math.cos(boss.lungeDir) * step, rx + pad, rx + CFG.W - pad);
      var ny = Utils.clamp(boss.y + Math.sin(boss.lungeDir) * step, ry + pad + 35, ry + CFG.H - pad);

      boss.afterimages.push({
        x: boss.x, y: boss.y, facing: boss.lungeDir,
        color: boss.colors.main, life: 0.24, maxLife: 0.24
      });
      boss.x = nx;
      boss.y = ny;

      if (!boss.lungeHit) {
        var dSeg = Utils.distToSegment(Player.x, Player.y, prevX, prevY, boss.x, boss.y);
        if (dSeg < boss.r + 22) {
          boss.lungeHit = true;
          this.damagePlayer(mg, Player.x, Player.y, isOni ? '👹 赤鬼猛突命中 · -1 命' : '⚡ 一闪命中 · -1 命');
        }
      }

      if (boss.stateT >= boss.stateDur) {
        if (boss.lungeFrom) {
          boss.slashScars.push({
            x0: boss.lungeFrom.x, y0: boss.lungeFrom.y, x1: boss.x, y1: boss.y,
            color: boss.colors.main, coreColor: '#fde047', width: isOni ? 12 : 9, life: 0.45, maxLife: 0.45
          });
        }
        if (isOni) {
          boss.clashRings.push({
            x: boss.x, y: boss.y, r: 20, maxR: 130,
            color: '#f97316', subColor: '#fde047', life: 0.28, maxLife: 0.28, star: false
          });
          if (Utils.dist(boss.x, boss.y, Player.x, Player.y) <= 125) {
            this.damagePlayer(mg, Player.x, Player.y, '💥 猛突震踏命中 · -1 命');
          }
          mg.addExplosion(boss.x, boss.y, '#f97316', 18);
          if (boss.phase >= 2 && boss.comboStep === 0) {
            boss.comboStep = 1;
            this.beginMove(boss, 'oni_charge', mg);
            return;
          }
        }
        // 无明：一阶二段一闪，二阶三段折返一闪！
        var maxBlitz = boss.phase >= 2 ? 2 : 1;
        if (boss.id === 'mumyo' && boss.action === 'blitz' && boss.comboStep < maxBlitz) {
          boss.comboStep += 1;
          this.beginMove(boss, 'blitz', mg);
          return;
        }
        boss.state = 'recover';
        boss.stateT = 0;
        boss.stateDur = this.durOf(boss, 1.05);
        boss.action = null;
        boss.windowHits = 0;
      }
      return;
    }

    if (boss.stateT >= boss.stateDur) {
      // 多段连招链
      if (boss.id === 'mumyo' && boss.action === 'iaijutsu_draw' && boss.comboStep < (boss.phase >= 2 ? 2 : 1)) {
        boss.comboStep += 1;
        this.beginMove(boss, 'iaijutsu_draw', mg);
        return;
      }
      if (boss.id === 'mumyo' && boss.action === 'cross_cut' && boss.phase >= 2 && boss.comboStep === 0) {
        boss.comboStep = 1;
        this.beginMove(boss, 'cross_cut', mg);
        return;
      }
      if (boss.id === 'mumyo' && boss.action === 'blades' && boss.comboStep === 0) {
        boss.comboStep = 1;
        this.beginMove(boss, 'blades', mg);
        return;
      }
      if (boss.id === 'akaoni' && boss.action === 'heavy_cleave' && boss.phase >= 2 && boss.comboStep === 0) {
        boss.comboStep = 1;
        this.beginMove(boss, 'heavy_cleave', mg);
        return;
      }
      if (boss.id === 'byakuya' && boss.action === 'blink_slash' && boss.phase >= 2 && boss.comboStep === 0) {
        boss.comboStep = 1;
        this.beginMove(boss, 'blink_slash', mg);
        return;
      }
      if (boss.id === 'byakuya' && boss.action === 'dimension_net' && boss.phase >= 2 && boss.comboStep === 0) {
        boss.comboStep = 1;
        this.beginMove(boss, 'dimension_net', mg);
        return;
      }

      boss.state = 'recover';
      boss.stateT = 0;
      boss.stateDur = this.durOf(boss, 0.95);
      boss.action = null;
      boss.windowHits = 0;
    }
  },

  // --------------------------------------------------------------------------
  // 持续危险（追踪业火柱）
  // --------------------------------------------------------------------------
  updateHazards: function (dt, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss || !boss.hazards || !boss.hazards.length) return;
    var rx = mg.room.worldX, ry = mg.room.worldY;

    for (var i = boss.hazards.length - 1; i >= 0; i--) {
      var h = boss.hazards[i];
      if (h.delay > 0) {
        h.delay -= dt;
        if (h.delay <= 0 && h.trackPlayer) {
          h.x = Utils.clamp(Player.x, rx + 70, rx + CFG.W - 70);
          h.y = Utils.clamp(Player.y, ry + 95, ry + CFG.H - 70);
        }
        continue;
      }
      h.t += dt;
      if (h.kind === 'pillar') {
        if (h.t >= h.warnDur && !h.erupted) {
          h.erupted = true;
          SFX.play('lightning');
          Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.32);
          mg.addExplosion(h.x, h.y, '#f97316', 22);
          mg.addExplosion(h.x, h.y, '#fde047', 12);
        }
        if (h.erupted && !h.hit && h.t < h.warnDur + h.activeDur) {
          if (Utils.dist(h.x, h.y, Player.x, Player.y) <= h.r) {
            h.hit = true;
            this.damagePlayer(mg, Player.x, Player.y, '🌋 业火柱灼烧 · -1 命');
          }
        }
        if (h.t >= h.warnDur + h.activeDur) {
          boss.hazards.splice(i, 1);
        }
      }
    }
  },

  updateVfx: function (dt, boss) {
    var lists = [boss.slashVfx, boss.slashScars, boss.afterimages, boss.clashRings];
    for (var l = 0; l < lists.length; l++) {
      var arr = lists[l];
      if (!arr) continue;
      for (var i = arr.length - 1; i >= 0; i--) {
        arr[i].life -= dt;
        if (arr[i].life <= 0) arr.splice(i, 1);
      }
    }
  },

  updateBlades: function (dt, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss || !boss.blades || !boss.blades.length) return;

    var rx = mg.room.worldX, ry = mg.room.worldY;
    var pad = 40;

    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || b.x < rx - pad || b.x > rx + CFG.W + pad || b.y < ry - pad || b.y > ry + CFG.H + pad) {
        boss.blades.splice(i, 1);
        continue;
      }

      if (data.isDashing && data.prevPos) {
        var dd = Utils.distToSegment(b.x, b.y, data.prevPos.x, data.prevPos.y, Player.x, Player.y);
        if (dd <= 26) {
          this.shatterBlade(boss, i, mg);
          continue;
        }
      }

      if (Utils.dist(b.x, b.y, Player.x, Player.y) < 12 + 15) {
        boss.blades.splice(i, 1);
        this.damagePlayer(mg, Player.x, Player.y, '🩸 飞刃命中 · -1 命');
      }
    }
  },

  shatterBlade: function (boss, idx, mg) {
    var b = boss.blades[idx];
    if (!b) return;
    boss.blades.splice(idx, 1);
    mg.combo += 1;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    var data = mg.iaijutsuData;
    if (data && data.bossTutorial) {
      data.tutorialBladesCut = (data.tutorialBladesCut || 0) + 1;
    }
    this.addPosture(boss, (data && data.bossTutorial && boss.tutorialLockPosture) ? 0 : 3, mg);
    SFX.play('parry');
    FX.floatText(b.x, b.y - 14, '✂ 斩落剑气', '#7dd3fc', 0.9);
    mg.addExplosion(b.x, b.y, '#7dd3fc', 7);
  },

  slashNearbyBlades: function (mg, radius) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss || !boss.blades || !boss.blades.length) return 0;
    var cleared = 0;
    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      if (Utils.dist(b.x, b.y, Player.x, Player.y) <= (radius || 108)) {
        this.shatterBlade(boss, i, mg);
        cleared++;
      }
    }
    return cleared;
  },

  damagePlayer: function (mg, x, y, label) {
    var data = mg.iaijutsuData;
    if (!data) return false;
    if (Player.invulnTimer > 0) return false;
    if (data.lives <= 0) return false;

    // 新手教程模式：不死不结算，温和提示并记录本次受击
    if (data.bossTutorial) {
      data.tutorialHitCount = (data.tutorialHitCount || 0) + 1;
      data.tutorialStepHit = true;
      data.tutorialEvent = 'damaged';
      SFX.play('hurt');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.32);
      FX.floatText(x, y - 34, label || '💡 特训免死 · 注意红区/金光提示！', '#fbbf24', 1.45);
      mg.addExplosion(x, y, '#fbbf24', 16);
      data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.95);
      Player.invulnTimer = Math.max(Player.invulnTimer, 0.95);
      return true;
    }

    data.lives -= 1;
    data.hitsTaken = (data.hitsTaken || 0) + 1;
    mg.combo = 0;

    SFX.play('hurt');
    SFX.play('parry');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.58);
    FX.floatText(x, y - 34, label || '🩸 被宿敌命中 · -1 命', '#f43f5e', 1.75);
    mg.addExplosion(x, y, '#f43f5e', 26);
    mg.addExplosion(x, y, '#ffffff', 10);

    data.bossSafeInvuln = Math.max(data.bossSafeInvuln || 0, 0.95);
    Player.invulnTimer = Math.max(Player.invulnTimer, 0.95);

    if (data.lives <= 0) {
      data.lives = 0;
      var remPct = data.boss ? Math.max(1, Math.ceil((data.boss.hp / data.boss.maxHp) * 100)) : 0;
      mg.finishGame('lose', '👹 宿敌「' + (data.boss ? data.boss.name : '无名') + '」尚余 ' + remPct + '% 血量，再战一局！');
    }
    return true;
  },

  // ==========================================================================
  // 渲染层
  // ==========================================================================
  render: function (ctx, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss) return;

    this.drawTelegraph(ctx, boss, mg);
    this.drawHazards(ctx, boss);
    this.drawAfterimages(ctx, boss);
    this.drawSlashVfx(ctx, boss);
    this.drawSlashScars(ctx, boss);
    this.drawBlades(ctx, boss);
    this.drawBoss(ctx, boss, mg);
    this.drawClashRings(ctx, boss);
    this.drawEyeAura(ctx, mg);
    this.drawExecOverlay(ctx, boss, mg);
    this.drawHud(ctx, boss, mg);
  },

  drawEyeAura: function (ctx, mg) {
    if (window.IaijutsuBossStyles && window.IaijutsuBossStyles.render) {
      window.IaijutsuBossStyles.render(ctx, mg);
      return;
    }
    var data = mg.iaijutsuData;
    if (!data || !data.eyeActiveT || data.eyeActiveT <= 0) return;
    var alpha = Utils.clamp(data.eyeActiveT / 0.24, 0, 1);
    ctx.save();
    ctx.translate(Player.x, Player.y);
    ctx.beginPath();
    ctx.arc(0, 0, 34 + (1 - alpha) * 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125, 211, 252, ' + (alpha * 0.95).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  },

  drawExecOverlay: function (ctx, boss, mg) {
    if (!boss.execFlash || boss.execFlash <= 0) return;
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var a = Utils.clamp(boss.execFlash / 0.48, 0, 1);
    ctx.save();
    var grad = ctx.createRadialGradient(boss.x, boss.y, 40, boss.x, boss.y, 520);
    grad.addColorStop(0, 'rgba(253, 224, 71, ' + (a * 0.14).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(244, 63, 94, ' + (a * 0.24).toFixed(3) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(rx, ry, CFG.W, CFG.H);
    ctx.restore();
  },

  drawTelegraph: function (ctx, boss, mg) {
    var showOuterNova = (boss.state === 'action' && boss.action === 'quake_nova' && !boss.novaOuterHit);
    var showThirdNova = (boss.state === 'action' && boss.action === 'quake_nova' && boss.phase >= 2 && boss.novaOuterHit && !boss.novaThirdHit);
    if (boss.state !== 'telegraph' && !showOuterNova && !showThirdNova) {
      return;
    }
    var p = Utils.clamp(boss.stateT / Math.max(0.01, boss.stateDur), 0, 1);
    var inParry = this.isParryWindow(boss);
    ctx.save();

    if (showOuterNova) {
      var op = Utils.clamp((boss.novaT || 0) / 0.42, 0, 1);
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.novaRange + 150, 0, Math.PI * 2);
      ctx.arc(boss.x, boss.y, boss.novaRange - 22, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(239, 68, 68, ' + (0.09 + 0.17 * op).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.5 + 0.45 * op).toFixed(3) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.novaRange + 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (showThirdNova) {
      var tp = Utils.clamp(((boss.novaT || 0) - 0.42) / 0.42, 0, 1);
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.novaRange + 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, ' + (0.1 + 0.2 * tp).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (boss.action === 'iaijutsu_draw' || boss.action === 'heavy_cleave' || boss.action === 'blink_slash') {
      var fillC = boss.action === 'blink_slash' ? 'rgba(56, 189, 248, ' : 'rgba(244, 63, 94, ';
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.arc(boss.x, boss.y, boss.sweepRange, boss.aim - boss.sweepArc, boss.aim + boss.sweepArc);
      ctx.closePath();
      ctx.fillStyle = fillC + (0.09 + 0.18 * p).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = inParry ? '#fde047' : boss.colors.main;
      ctx.lineWidth = inParry ? 3.5 : (2 + p * 1.5);
      ctx.stroke();

      var edge = boss.aim - boss.sweepArc + boss.sweepArc * 2 * p;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(edge) * boss.sweepRange, boss.y + Math.sin(edge) * boss.sweepRange);
      ctx.strokeStyle = inParry ? '#ffffff' : 'rgba(255, 230, 230, 0.85)';
      ctx.lineWidth = inParry ? 4 : 2.5;
      ctx.stroke();

    } else if (boss.action === 'blitz' || boss.action === 'oni_charge') {
      var len = boss.action === 'oni_charge' ? 390 : 460;
      var ex = boss.x + Math.cos(boss.aim) * len;
      var ey = boss.y + Math.sin(boss.aim) * len;

      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(boss.aim);
      var laneH = boss.action === 'oni_charge' ? 76 : 52;
      ctx.fillStyle = 'rgba(244, 63, 94, ' + (0.1 + 0.15 * p).toFixed(3) + ')';
      ctx.fillRect(0, -laneH / 2, len, laneH);
      ctx.strokeStyle = inParry ? '#fde047' : 'rgba(251, 191, 36, ' + (0.45 + 0.45 * p).toFixed(3) + ')';
      ctx.lineWidth = inParry ? 3 : 1.5;
      ctx.strokeRect(0, -laneH / 2, len, laneH);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = inParry ? '#ffffff' : 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 2 + 4 * p;
      ctx.stroke();

    } else if (boss.action === 'cross_cut' && boss.crossCenter) {
      var cc = boss.crossCenter;
      for (var ci = 0; ci < 2; ci++) {
        var ca = cc.ang + ci * (Math.PI / 2);
        ctx.save();
        ctx.translate(cc.x, cc.y);
        ctx.rotate(ca);
        ctx.fillStyle = 'rgba(239, 68, 68, ' + (0.1 + 0.18 * p).toFixed(3) + ')';
        ctx.fillRect(-540, -24, 1080, 48);
        ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.5 + 0.5 * p).toFixed(3) + ')';
        ctx.lineWidth = 2 + 1.5 * p;
        ctx.beginPath();
        ctx.moveTo(-540, 0); ctx.lineTo(540, 0);
        ctx.stroke();
        ctx.restore();
      }

    } else if (boss.action === 'blades') {
      var bn = boss.bladeCount + (boss.phase >= 2 ? 2 : 0) + (boss.comboStep > 0 ? 1 : 0);
      for (var bi = 0; bi < bn; bi++) {
        var boff = (bi - (bn - 1) / 2) * 0.16;
        var ba = boss.aim + boff;
        ctx.beginPath();
        ctx.moveTo(boss.x + Math.cos(ba) * boss.r * 0.8, boss.y + Math.sin(ba) * boss.r * 0.8);
        ctx.lineTo(boss.x + Math.cos(ba) * 330, boss.y + Math.sin(ba) * 330);
        ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.24 + 0.45 * p).toFixed(3) + ')';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

    } else if (boss.action === 'quake_nova') {
      var nr = boss.novaRange;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, nr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, ' + (0.1 + 0.18 * p).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 146, 60, ' + (0.5 + 0.5 * p).toFixed(3) + ')';
      ctx.lineWidth = 2.5 + 2.5 * p;
      ctx.stroke();

      var shrink = nr * (1.35 - 0.35 * p);
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, shrink, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 240, 200, ' + (0.35 + 0.55 * p).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (boss.action === 'phantom_rush' && boss.pendingClones) {
      for (var pi = 0; pi < boss.pendingClones.length; pi++) {
        var cl = boss.pendingClones[pi];
        ctx.beginPath();
        ctx.moveTo(cl.x0, cl.y0);
        ctx.lineTo(cl.x1, cl.y1);
        ctx.strokeStyle = inParry ? '#fde047' : 'rgba(56, 189, 248, ' + (0.3 + 0.55 * p).toFixed(3) + ')';
        ctx.lineWidth = inParry ? 4 : (2 + 2 * p);
        ctx.setLineDash(inParry ? [] : [10, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(cl.x0, cl.y0, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.25 + 0.35 * p).toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

    } else if (boss.action === 'dimension_net' && boss.pendingNet) {
      for (var ni = 0; ni < boss.pendingNet.length; ni++) {
        var nl = boss.pendingNet[ni];
        ctx.beginPath();
        ctx.moveTo(nl.x0, nl.y0);
        ctx.lineTo(nl.x1, nl.y1);
        ctx.strokeStyle = 'rgba(192, 132, 252, ' + (0.3 + 0.6 * p).toFixed(3) + ')';
        ctx.lineWidth = 1.8 + 2.2 * p;
        ctx.setLineDash([8, 7]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

    } else if (boss.action === 'moon_storm') {
      var sn2 = boss.stormCount + (boss.phase >= 2 ? 6 : 0);
      for (var si2 = 0; si2 < sn2; si2++) {
        var sa2 = (si2 / sn2) * Math.PI * 2 + boss.aim;
        ctx.beginPath();
        ctx.moveTo(boss.x + Math.cos(sa2) * boss.r * 0.9, boss.y + Math.sin(sa2) * boss.r * 0.9);
        ctx.lineTo(boss.x + Math.cos(sa2) * boss.r * 3.1, boss.y + Math.sin(sa2) * boss.r * 3.1);
        ctx.strokeStyle = 'rgba(125, 211, 252, ' + (0.22 + 0.45 * p).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 8]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  },

  drawHazards: function (ctx, boss) {
    if (!boss.hazards || !boss.hazards.length) return;
    ctx.save();
    for (var i = 0; i < boss.hazards.length; i++) {
      var h = boss.hazards[i];
      if (h.delay > 0) continue;
      if (h.kind === 'pillar') {
        if (!h.erupted) {
          var p = Utils.clamp(h.t / h.warnDur, 0, 1);
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(249, 115, 22, ' + (0.12 + 0.24 * p).toFixed(3) + ')';
          ctx.fill();
          ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.5 + 0.5 * p).toFixed(3) + ')';
          ctx.lineWidth = 2 + p * 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r * (1.25 - 0.9 * p), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          var ep = Utils.clamp((h.t - h.warnDur) / h.activeDur, 0, 1);
          var ea = 1 - ep;
          var grad = ctx.createLinearGradient(h.x - h.r, h.y, h.x + h.r, h.y);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
          grad.addColorStop(0.25, 'rgba(249, 115, 22, ' + (0.8 * ea).toFixed(3) + ')');
          grad.addColorStop(0.5, 'rgba(254, 240, 138, ' + (0.95 * ea).toFixed(3) + ')');
          grad.addColorStop(0.75, 'rgba(249, 115, 22, ' + (0.8 * ea).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(h.x - h.r * 0.95, h.y - 360, h.r * 1.9, 360);

          ctx.beginPath();
          ctx.ellipse(h.x, h.y, h.r * (0.9 + 0.2 * ep), h.r * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(254, 240, 138, ' + (0.78 * ea).toFixed(3) + ')';
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },

  drawSlashVfx: function (ctx, boss) {
    if (!boss.slashVfx || !boss.slashVfx.length) return;
    ctx.save();
    for (var i = 0; i < boss.slashVfx.length; i++) {
      var sv = boss.slashVfx[i];
      var a = Utils.clamp(sv.life / sv.maxLife, 0, 1);
      var prog = 1 - a;
      var sweepStart = sv.dir > 0 ? sv.startAng : sv.endAng;
      var sweepEnd = sv.dir > 0 ? (sv.startAng + (sv.endAng - sv.startAng) * Math.min(1, prog * 2.4))
        : (sv.endAng - (sv.endAng - sv.startAng) * Math.min(1, prog * 2.4));
      var a0 = Math.min(sweepStart, sweepEnd);
      var a1 = Math.max(sweepStart, sweepEnd);

      ctx.beginPath();
      ctx.arc(sv.x, sv.y, sv.r * 0.92, a0, a1);
      ctx.strokeStyle = sv.color;
      ctx.globalAlpha = a * 0.72;
      ctx.lineWidth = 34 * a + 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = sv.color;
      ctx.shadowBlur = 22;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sv.x, sv.y, sv.r * 0.95, a0, a1);
      ctx.strokeStyle = sv.subColor;
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = 16 * a + 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sv.x, sv.y, sv.r * 0.97, a0, a1);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = a;
      ctx.lineWidth = 5 * a + 1;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawSlashScars: function (ctx, boss) {
    if (!boss.slashScars || !boss.slashScars.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (var i = 0; i < boss.slashScars.length; i++) {
      var sc = boss.slashScars[i];
      var a = Utils.clamp(sc.life / sc.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = sc.color;
      ctx.lineWidth = sc.width * a + 2;
      ctx.shadowColor = sc.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(sc.x0, sc.y0);
      ctx.lineTo(sc.x1, sc.y1);
      ctx.stroke();

      ctx.globalAlpha = a;
      ctx.strokeStyle = sc.coreColor || '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc.width * 0.35 * a);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(sc.x0, sc.y0);
      ctx.lineTo(sc.x1, sc.y1);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawAfterimages: function (ctx, boss) {
    if (!boss.afterimages || !boss.afterimages.length) return;
    ctx.save();
    for (var i = 0; i < boss.afterimages.length; i++) {
      var ai = boss.afterimages[i];
      var a = Utils.clamp(ai.life / ai.maxLife, 0, 1);
      ctx.save();
      ctx.translate(ai.x, ai.y);
      ctx.globalAlpha = a * 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, boss.r * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = ai.color;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  drawClashRings: function (ctx, boss) {
    if (!boss.clashRings || !boss.clashRings.length) return;
    ctx.save();
    for (var i = 0; i < boss.clashRings.length; i++) {
      var cr = boss.clashRings[i];
      var a = Utils.clamp(cr.life / cr.maxLife, 0, 1);
      var prog = 1 - a;
      var rad = cr.r + (cr.maxR - cr.r) * prog;

      ctx.beginPath();
      ctx.arc(cr.x, cr.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = cr.color;
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = 6 * a + 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cr.x, cr.y, rad * 0.88, 0, Math.PI * 2);
      ctx.strokeStyle = cr.subColor;
      ctx.globalAlpha = a * 0.65;
      ctx.lineWidth = 3 * a + 1;
      ctx.stroke();

      if (cr.star) {
        var sl = 48 * (0.4 + 0.6 * a);
        ctx.save();
        ctx.translate(cr.x, cr.y);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -sl); ctx.lineTo(sl * 0.14, -sl * 0.14);
        ctx.lineTo(sl, 0); ctx.lineTo(sl * 0.14, sl * 0.14);
        ctx.lineTo(0, sl); ctx.lineTo(-sl * 0.14, sl * 0.14);
        ctx.lineTo(-sl, 0); ctx.lineTo(-sl * 0.14, -sl * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  },

  drawBlades: function (ctx, boss) {
    if (!boss.blades || !boss.blades.length) return;
    ctx.save();
    for (var i = 0; i < boss.blades.length; i++) {
      var b = boss.blades[i];
      var col = b.color || boss.colors.main;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);

      ctx.beginPath();
      ctx.arc(-4, 0, 16, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-2, 0, 14, -Math.PI * 0.36, Math.PI * 0.36);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawBossSilhouette: function (ctx, boss, scale) {
    var r = boss.r * scale;
    var bob = Math.sin(boss.pulse * 3.8) * 3;
    var kneel = boss.state === 'broken' ? 8 : 0;
    var p2 = boss.phase >= 2;
    var cMain = boss.colors.main;
    var cSub = boss.colors.sub;

    ctx.save();
    ctx.translate(boss.x, boss.y + bob + kneel);

    if (p2) {
      ctx.save();
      ctx.rotate(boss.pulse * 0.85);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.42, 0, Math.PI * 2);
      ctx.strokeStyle = cMain;
      ctx.globalAlpha = 0.5 + 0.22 * Math.sin(boss.pulse * 6);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (boss.id === 'mumyo') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.15);
      ctx.quadraticCurveTo(-r * 0.92, r * 0.48, -r * 0.65 + Math.sin(boss.pulse * 5) * 4, r * 0.95);
      ctx.lineTo(r * 0.65 + Math.cos(boss.pulse * 5) * 4, r * 0.95);
      ctx.quadraticCurveTo(r * 0.92, r * 0.48, r * 0.55, -r * 0.15);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = cMain;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.36, 0);
      ctx.lineTo(r * 0.38, r * 0.62);
      ctx.strokeStyle = cMain;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -r * 1.05);
      ctx.quadraticCurveTo(r * 0.58, -r * 0.55, r * 1.12, -r * 0.28);
      ctx.quadraticCurveTo(0, -r * 0.08, -r * 1.12, -r * 0.28);
      ctx.quadraticCurveTo(-r * 0.58, -r * 0.55, 0, -r * 1.05);
      ctx.closePath();
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = cSub;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fb7185';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-12, -r * 0.18); ctx.lineTo(-4, -r * 0.13); ctx.lineTo(-10, -r * 0.11); ctx.closePath();
      ctx.moveTo(12, -r * 0.18); ctx.lineTo(4, -r * 0.13); ctx.lineTo(10, -r * 0.11); ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.save();
      var drawRot = boss.state === 'telegraph' ? (boss.aim - 0.6) : 0.35;
      ctx.rotate(drawRot);
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.22);
      ctx.lineTo(r * 1.25, r * 0.14);
      ctx.strokeStyle = boss.state === 'telegraph' ? '#fef08a' : '#e2e8f0';
      ctx.lineWidth = boss.state === 'telegraph' ? 4 : 2.6;
      ctx.shadowColor = cMain;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

    } else if (boss.id === 'akaoni') {
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.96, 0, Math.PI * 2);
      ctx.strokeStyle = p2 ? '#f97316' : 'rgba(249, 115, 22, 0.45)';
      ctx.lineWidth = p2 ? 5 : 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.18);
      ctx.lineTo(-r * 0.62, r * 0.92);
      ctx.lineTo(r * 0.62, r * 0.92);
      ctx.lineTo(r * 0.95, -r * 0.18);
      ctx.lineTo(r * 0.55, -r * 0.48);
      ctx.lineTo(-r * 0.55, -r * 0.48);
      ctx.closePath();
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(0, r * 0.35); ctx.lineTo(r * 0.3, -r * 0.1);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -r * 0.48, r * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.72);
      ctx.quadraticCurveTo(-r * 0.65, -r * 1.15, -r * 0.32, -r * 1.28);
      ctx.quadraticCurveTo(-r * 0.38, -r * 0.96, -r * 0.08, -r * 0.78);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(r * 0.25, -r * 0.72);
      ctx.quadraticCurveTo(r * 0.65, -r * 1.15, r * 0.32, -r * 1.28);
      ctx.quadraticCurveTo(r * 0.38, -r * 0.96, r * 0.08, -r * 0.78);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.fillRect(-11, -r * 0.52, 7, 4);
      ctx.fillRect(4, -r * 0.52, 7, 4);
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.rotate(boss.state === 'telegraph' ? (boss.aim - 0.8) : -0.45);
      ctx.beginPath();
      ctx.moveTo(r * 0.2, r * 0.3);
      ctx.lineTo(r * 1.38, -r * 0.55);
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 7;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

    } else {
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 1.02, -Math.PI * 0.78, Math.PI * 0.55);
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = p2 ? 5 : 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.quadraticCurveTo(r * 0.8, -r * 0.1, r * 0.65, r * 0.92);
      ctx.lineTo(0, r * 0.72);
      ctx.lineTo(-r * 0.65, r * 0.92);
      ctx.quadraticCurveTo(-r * 0.8, -r * 0.1, 0, -r * 0.7);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.32, -r * 0.45);
      ctx.lineTo(-r * 0.42, -r * 1.02);
      ctx.lineTo(-r * 0.1, -r * 0.68);
      ctx.lineTo(r * 0.1, -r * 0.68);
      ctx.lineTo(r * 0.42, -r * 1.02);
      ctx.lineTo(r * 0.32, -r * 0.45);
      ctx.lineTo(0, -r * 0.18);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-10, -r * 0.52, 6, 3);
      ctx.fillRect(4, -r * 0.52, 6, 3);

      for (var s = -1; s <= 1; s += 2) {
        ctx.save();
        var floatY = Math.sin(boss.pulse * 4.5 + s) * 6;
        ctx.translate(s * r * 1.05, -r * 0.1 + floatY);
        ctx.rotate(s * 0.32 + Math.sin(boss.pulse * 3) * 0.08);
        ctx.beginPath();
        ctx.moveTo(0, -32); ctx.lineTo(5, 0); ctx.lineTo(0, 26); ctx.lineTo(-5, 0); ctx.closePath();
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  },

  drawBoss: function (ctx, boss, mg) {
    var r = boss.r;
    var dying = boss.state === 'dying';
    var broken = boss.state === 'broken';
    var scale = 1;
    if (boss.state === 'intro') scale = Utils.clamp(boss.stateT / 0.45, 0.25, 1);
    if (dying) scale = Math.max(0.05, 1 - boss.deathT / 1.4);

    ctx.save();

    ctx.beginPath();
    ctx.ellipse(boss.x, boss.y + r * 0.96, r * 0.95 * scale, r * 0.30 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fill();

    var glow = ctx.createRadialGradient(boss.x, boss.y, r * 0.2, boss.x, boss.y, r * 1.9);
    glow.addColorStop(0, broken ? 'rgba(253, 224, 71, 0.45)' : boss.colors.glow);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    this.drawBossSilhouette(ctx, boss, scale);

    if (boss.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r * scale * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(0.85, boss.hitFlash * 2.4).toFixed(3) + ')';
      ctx.fill();
    }

    // 不可弹反【危】字警示印记
    if (boss.state === 'telegraph' && this.isUnblockable(boss.action) && !dying) {
      var wp2 = 1 + Math.sin(boss.pulse * 18) * 0.12;
      ctx.save();
      ctx.translate(boss.x, boss.y - r - 28);
      ctx.scale(wp2, wp2);
      ctx.font = 'bold 26px "Segoe UI", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.fillText('危', 0, 0);
      ctx.restore();
    }

    // 可弹反【✦ 空格见切】金光闪现
    if (boss.parryGlint > 0.05 && !dying && !broken) {
      var g = boss.parryGlint;
      var sl = (28 + Math.sin(boss.pulse * 32) * 5) * g;
      ctx.save();
      ctx.translate(boss.x, boss.y - r * 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(0, -sl); ctx.lineTo(sl * 0.18, -sl * 0.18);
      ctx.lineTo(sl, 0); ctx.lineTo(sl * 0.18, sl * 0.18);
      ctx.lineTo(0, sl); ctx.lineTo(-sl * 0.18, sl * 0.18);
      ctx.lineTo(-sl, 0); ctx.lineTo(-sl * 0.18, -sl * 0.18);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText('✦ 空格见切!', 0, -sl - 8);
      ctx.restore();
    }

    // 架势崩解【绝】字处决印记
    if (broken && !dying) {
      var bp = 1 + Math.sin(boss.pulse * 12) * 0.12;
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.scale(bp, bp);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 22;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('绝', 0, 1);
      ctx.restore();
    } else if (!dying) {
      for (var w = 0; w < boss.weak.length; w++) {
        var wp = this.getWeakPos(boss, w);
        var live = boss.vulnerable;
        var pulse = 1 + Math.sin(boss.pulse * 6 + w * Math.PI) * 0.12;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = live ? 'rgba(253, 224, 71, 0.88)' : 'rgba(71, 85, 105, 0.35)';
        ctx.shadowColor = live ? '#fde047' : 'transparent';
        ctx.shadowBlur = live ? 14 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.r * pulse + 4, 0, Math.PI * 2);
        ctx.strokeStyle = live ? 'rgba(255, 255, 255, 0.92)' : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  },

  drawHud: function (ctx, boss, mg) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var data = mg.iaijutsuData;
    var w = 344, h = 80;
    var x = rx + CFG.W - w - 24;
    var y = ry + 72;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
    ctx.strokeStyle = boss.state === 'broken' ? '#fde047' : boss.colors.main;
    ctx.lineWidth = boss.state === 'broken' ? 2.2 : 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(boss.name, x + 12, y + 7);

    ctx.textAlign = 'right';
    ctx.font = 'bold 11.5px "Segoe UI", sans-serif';
    ctx.fillStyle = boss.phase >= 2 ? '#fde047' : boss.colors.main;
    ctx.fillText(boss.phase >= 2 ? '🔥 二阶段 · 觉醒' : '◆ 一阶段 · ' + boss.badge, x + w - 12, y + 8);

    // 血条
    var bx = x + 12, by = y + 27, bw = w - 24, bh = 13;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(bx, by, bw, bh);

    var pct = Utils.clamp(boss.hp / boss.maxHp, 0, 1);
    if (pct > 0) {
      var grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, boss.colors.main);
      grad.addColorStop(1, boss.colors.sub);
      ctx.fillStyle = grad;
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * pct, bh - 2);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by);
    ctx.lineTo(bx + bw * 0.5, by + bh);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.strokeRect(bx, by, bw, bh);

    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(Math.ceil(boss.hp) + ' / ' + boss.maxHp, bx + bw / 2, by + bh / 2);

    // 金色架势条
    var py = by + bh + 5, ph = 8;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(bx, py, bw, ph);
    var pPct = Utils.clamp((boss.posture || 0) / boss.maxPosture, 0, 1);
    if (pPct > 0) {
      var pGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      pGrad.addColorStop(0, '#f59e0b');
      pGrad.addColorStop(1, boss.state === 'broken' ? '#ef4444' : '#fde047');
      ctx.fillStyle = pGrad;
      ctx.fillRect(bx + 1, py + 1, (bw - 2) * pPct, ph - 2);
    }
    ctx.strokeStyle = boss.state === 'broken' ? '#fde047' : 'rgba(250, 204, 21, 0.45)';
    ctx.strokeRect(bx, py, bw, ph);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 11.5px "Segoe UI", sans-serif';
    var stTxt, stCol;
    if (boss.state === 'dying') {
      stTxt = '🏆 宿敌已斩'; stCol = '#fde047';
    } else if (boss.state === 'broken') {
      stTxt = '⚡ 架势崩解！出刀【处决】!'; stCol = '#fde047';
    } else if (this.isParryWindow(boss)) {
      stTxt = '✦ 金光！按【空格】心眼见切!'; stCol = '#fde047';
    } else if (boss.state === 'telegraph' && this.isUnblockable(boss.action)) {
      stTxt = '危 不可弹反 · 立即闪避红区!'; stCol = '#ef4444';
    } else if (boss.vulnerable) {
      stTxt = '◆ 破绽 · 砍弱点削架势 (' + Math.floor(pPct * 100) + '%)'; stCol = '#4ade80';
    } else if (boss.state === 'telegraph') {
      stTxt = '⚠ 宿敌蓄力 · 别硬撞，等金光'; stCol = '#fca5a5';
    } else {
      stTxt = '⚔️ 宿敌出招 · 霸体迎击'; stCol = '#f87171';
    }
    ctx.fillStyle = stCol;
    ctx.fillText(stTxt, x + 12, py + ph + 7);

    var eyeCd = data.eyeCd || 0;
    ctx.textAlign = 'right';
    ctx.fillStyle = eyeCd > 0 ? '#94a3b8' : '#7dd3fc';
    ctx.fillText(eyeCd > 0 ? ('🧿 心眼 ' + eyeCd.toFixed(1) + 's') : '🧿 心眼 [空格]', x + w - 12, py + ph + 7);

    ctx.restore();
  }
};

var IAIJUTSU_TARGETS_BOSS_PARENT = window.IaijutsuTargets;
window.IaijutsuTargetsBoss = Object.create(IAIJUTSU_TARGETS_BOSS_PARENT);

window.IaijutsuTargetsBoss.drawDummy = function (ctx, d, skin) {
  if (d && d.isBoss) return;
  IAIJUTSU_TARGETS_BOSS_PARENT.drawDummy.call(IAIJUTSU_TARGETS_BOSS_PARENT, ctx, d, skin);

  if (d && d.bossMinion) {
    var ph = (d.pulse || 0) * 2.4;
    var rr = d.r + 10 + Math.sin(ph) * 2.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y, rr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, ' + (0.45 + 0.25 * Math.sin(ph)).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.92)';
    ctx.fillText('⟳ 刀魂跳板', d.x, d.y + d.r + 7);
    ctx.restore();
  }
};
