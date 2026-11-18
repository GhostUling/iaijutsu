// ============================================================================
// 宿敌战 · Boss 实体（独立文件）
// ----------------------------------------------------------------------------
// 设计原则：
//   1. 不改动原版/异靶的任何文件，本文件只被 IaijutsuModeBoss 引用；
//   2. Boss 本身作为"一个打不死的大靶子"塞进 data.dummies，
//      这样原版的线段命中判定、突进手感、子弹时间全部原样复用；
//   3. 招式严格"先预告、后出手"：红色扇形/直线出现 → 0.4~1.0s 后才生效，
//      玩家用突进（自带 0.3s 无敌）侧移躲开，不需要新按键。
//   4. 反击窗口 = 招式后的 1.2~1.7s（Boss 收起护甲、弱点发光）。
// ============================================================================

window.IaijutsuBoss = {
  // 三位宿敌：同一套引擎，靠配色 / 数值 / 招式权重区分
  BOSS_LIST: [
    {
      id: 'mumyo',
      name: '影武者「无明」',
      title: '一刀未出，胜负已分',
      emoji: '👹',
      colors: { main: '#f43f5e', sub: '#7c3aed', glow: 'rgba(244, 63, 94, 0.55)' },
      hp: 164,
      style: 'balanced',
      sweepArc: 1.75,      // 横扫半角（弧度）
      sweepRange: 250,
      bladeCount: 5,
      novaRange: 176,      // 环身爆发的半径
      stormCount: 10,      // 剑阵放射的飞刃数
      speedMul: 1.0,
      spin: 0.9
    },
    {
      id: 'akaoni',
      name: '鬼武者「赤鬼」',
      title: '力可断柱，怒可焚山',
      emoji: '👺',
      colors: { main: '#ef4444', sub: '#f97316', glow: 'rgba(239, 68, 68, 0.55)' },
      hp: 178,
      style: 'brute',
      sweepArc: 2.0,
      sweepRange: 285,
      bladeCount: 4,
      novaRange: 196,      // 赤鬼贴脸最危险
      stormCount: 8,
      speedMul: 1.12,      // 预告更慢，给你更多读招时间
      spin: 0.62
    },
    {
      id: 'byakuya',
      name: '剑圣「白夜」',
      title: '千刃归一，月下无影',
      emoji: '🦊',
      colors: { main: '#38bdf8', sub: '#c084fc', glow: 'rgba(56, 189, 248, 0.55)' },
      hp: 168,
      style: 'swift',
      sweepArc: 1.55,
      sweepRange: 230,
      bladeCount: 7,
      novaRange: 158,
      stormCount: 12,      // 白夜剑阵最密
      speedMul: 0.88,      // 预告更快
      spin: 1.35
    }
  ],

  // --------------------------------------------------------------------------
  // 创建
  // --------------------------------------------------------------------------
  create: function (mg) {
    var pick = this.BOSS_LIST[Math.floor(Math.random() * this.BOSS_LIST.length)];
    var rx = mg.room.worldX, ry = mg.room.worldY;

    return {
      id: 'boss',
      name: pick.name,
      title: pick.title,
      emoji: pick.emoji,
      colors: pick.colors,
      style: pick.style,
      sweepArc: pick.sweepArc,
      sweepRange: pick.sweepRange,
      bladeCount: pick.bladeCount,
      novaRange: pick.novaRange,
      stormCount: pick.stormCount,
      speedMul: pick.speedMul,
      spin: pick.spin,

      maxHp: pick.hp,
      hp: pick.hp,
      phase: 1,

      x: rx + CFG.W / 2,
      y: ry + CFG.H * 0.36,
      introY0: ry + CFG.H * 0.36 - 110,   // 入场起点（从上方落下）
      introY1: ry + CFG.H * 0.36,
      r: 66,
      pulse: 0,
      state: 'intro',
      stateT: 0,
      stateDur: 2.1,
      action: null,
      aim: Math.PI / 2,

      vulnerable: false,
      weakSpin: 0,
      weak: [
        { a: 0 },
        { a: Math.PI }
      ],

      blades: [],
      hitCd: 0,
      hitFlash: 0,
      swingHit: false,
      lungeHit: false,
      lungeDir: 0,
      deathT: 0,
      novaT: 0,
      novaHit: false,
      spawnShake: 0
    };
  },

  // --------------------------------------------------------------------------
  // 命中回调（由 IaijutsuModeBoss.onKill 转入）
  // 注意：原版主循环已经把 Boss 从 dummies 里 splice 掉了，活着就要放回去
  // --------------------------------------------------------------------------
  hit: function (dm, isDash, hitAngle, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss) return;

    // 入场演出 / 死亡演出 / 同一次突进的多帧重复命中：不结算，但要留在场上
    if (boss.state === 'intro' || boss.state === 'dying' || boss.hitCd > 0) {
      if (boss.state !== 'dying') data.dummies.push(dm);
      return;
    }

    boss.hitCd = 0.11;

    // ---------- 出招中护体：砍上去会弹刀 ----------
    // 没有这条，玩家贴着 Boss 连续出刀就能靠突进无敌帧免疫一切招式。
    if (boss.state === 'telegraph' || boss.state === 'action') {
      boss.hitFlash = 0.07;
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.14);
      FX.floatText(boss.x, boss.y - boss.r - 14, '🔰 弹刀！蓄力中硬砍 = 白给冷却', '#94a3b8', 1.1);
      // 弹刀等同于挥空：锁住突进 1.9s，逼玩家在蓄力期离开、用刀魂重新起刀
      Player.skillTimers[1] = 1.9;
      data.bulletTime = Math.max(data.bulletTime || 0, 0.05);
      data.dummies.push(dm);
      return;
    }

    // ---------- 弱点判定 ----------
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
          // 右键原地挥砍：必须真的贴到弱点旁（42px 内）才算暴击，否则只是蹭铁甲
          d = Utils.dist(Player.x, Player.y, wp.x, wp.y);
          if (d <= 42) { weakHit = true; break; }
        }
        if (d <= wp.r + 24) { weakHit = true; break; }
      }
    }

    var dmg = weakHit ? 4 : 1;
    boss.hp = Math.max(0, boss.hp - dmg);
    boss.hitFlash = weakHit ? 0.22 : 0.12;

    // ---------- 共同反馈：刷新冷却 + 无敌帧（不会让玩家陷入"砍完等 2.2s"） ----------
    Player.skillTimers[1] = 0;
    Player.invulnTimer = Math.max(Player.invulnTimer, 0.28);
    data.bulletTime = Math.max(data.bulletTime || 0, weakHit ? 0.16 : 0.06);

    if (weakHit) {
      mg.combo += 3;
      SFX.play('hit');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.38);
      FX.floatText(boss.x, boss.y - boss.r - 16, '🎯 弱点崩解 -4', '#fde047', 1.6);
      mg.addExplosion(boss.x, boss.y, '#fde047', 26);
      mg.addExplosion(boss.x, boss.y, boss.colors.main, 14);
    } else {
      mg.combo += 1;
      SFX.play('parry');
      SFX.play('hit');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.16);
      FX.floatText(boss.x, boss.y - boss.r - 14, '🛡 铁甲 -1', '#94a3b8', 1.1);
      mg.addExplosion(boss.x, boss.y, '#cbd5e1', 12);
    }

    if (mg.combo > mg.maxCombo) {
      mg.maxCombo = mg.combo;
    }

    // ---------- 阶段推进 ----------
    var ratio = boss.hp / boss.maxHp;
    var nextPhase = ratio > 0.66 ? 1 : (ratio > 0.33 ? 2 : 3);
    if (nextPhase > boss.phase && boss.hp > 0) {
      boss.phase = nextPhase;
      this.enterStagger(boss, 0.9);
      data.bannerTimer = 2.6;
      data.bannerText = '🔥 宿敌 · 第 ' + boss.phase + ' 阶段';
      data.bannerSub = boss.phase === 2 ? '「护甲剥落，杀意渐盛」' : '「生死一线，刀意全开」';
      SFX.play('victory');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.6);
      mg.addExplosion(boss.x, boss.y, boss.colors.main, 40);
      mg.addExplosion(boss.x, boss.y, '#ffffff', 18);
    }

    if (boss.hp <= 0) {
      this.startDying(boss, mg);
      return;
    }

    data.dummies.push(dm);
  },

  getWeakPos: function (boss, i) {
    var wp = boss.weak[i];
    var ang = boss.weakSpin + wp.a;
    var dist = boss.r * 0.94;
    return {
      x: boss.x + Math.cos(ang) * dist,
      y: boss.y + Math.sin(ang) * dist,
      r: 14
    };
  },

  // --------------------------------------------------------------------------
  // 状态切换
  // --------------------------------------------------------------------------
  enterStagger: function (boss, dur) {
    boss.state = 'stagger';
    boss.stateT = 0;
    boss.stateDur = dur;
    boss.vulnerable = true;
    boss.action = null;
  },

  startDying: function (boss, mg) {
    var data = mg.iaijutsuData;
    boss.state = 'dying';
    boss.stateT = 0;
    boss.deathT = 0;
    boss.vulnerable = false;
    boss.hp = 0;

    // 从场上撤掉假靶，避免玩家继续砍
    if (data.bossDummy) {
      var idx = data.dummies.indexOf(data.bossDummy);
      if (idx >= 0) data.dummies.splice(idx, 1);
    }
    data.bossDead = true;

    mg.combo += 30;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    try { mg.saveHighScore(mg.currentGame, mg.maxCombo); } catch (e) {}

    SFX.play('victory');
    SFX.play('lightning');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.85);
    data.bannerTimer = 3.2;
    data.bannerText = '🏆 宿敌已斩！';
    data.bannerSub = '连斩 +30';
    mg.addExplosion(boss.x, boss.y, boss.colors.main, 60);
    mg.addExplosion(boss.x, boss.y, '#ffffff', 30);
    FX.floatText(boss.x, boss.y - 40, '⚔️ 一刀两断！', '#fde047', 2.2);
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
    boss.stateT += dt;

    var spinMul = boss.phase === 1 ? 1 : (boss.phase === 2 ? 1.35 : 1.75);
    boss.weakSpin += dt * boss.spin * spinMul;

    this.updateBlades(dt, mg);

    if (boss.state === 'dying') {
      boss.deathT += dt;
      // 连环爆
      if (Math.floor(boss.deathT * 14) % 3 === 0) {
        var ea = Math.random() * Math.PI * 2;
        var ed = Math.random() * boss.r * 0.9;
        mg.addExplosion(boss.x + Math.cos(ea) * ed, boss.y + Math.sin(ea) * ed,
          Math.random() < 0.5 ? boss.colors.main : '#fde047', 6);
      }
      if (boss.deathT >= 1.9) {
        mg.finishGame('win', '🏆 宿敌「' + boss.name + '」已斩，居合大成！');
      }
      return;
    }

    if (boss.state === 'intro') {
      // 入场：从上方落下并放大
      var t = Math.min(1, boss.stateT / 0.7);
      var ease = 1 - Math.pow(1 - t, 3);
      boss.y = boss.introY0 + (boss.introY1 - boss.introY0) * ease;
      if (boss.stateT >= boss.stateDur) {
        boss.state = 'idle';
        boss.stateT = 0;
        boss.stateDur = this.durOf(boss, 1.8);
      }
      return;
    }

    // 缓慢游走：始终与玩家保持 ~250px，像在绕圈找破绽
    if (boss.state !== 'telegraph' && boss.state !== 'action') {
      this.drift(boss, dt, mg);
    }

    switch (boss.state) {
      case 'idle':
        boss.vulnerable = true;
        if (boss.stateT >= boss.stateDur) {
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
          boss.state = 'idle';
          boss.stateT = 0;
          boss.stateDur = this.durOf(boss, 1.5);
        }
        break;

      case 'stagger':
        boss.vulnerable = true;
        if (boss.stateT >= boss.stateDur) {
          boss.state = 'recover';
          boss.stateT = 0;
          boss.stateDur = this.durOf(boss, 0.8);
        }
        break;
    }
  },

  durOf: function (boss, base) {
    var f = boss.phase === 1 ? 1 : (boss.phase === 2 ? 0.88 : 0.76);
    return base * f * boss.speedMul;
  },

  drift: function (boss, dt, mg) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var pad = 150;
    var ang = Math.atan2(boss.y - Player.y, boss.x - Player.x);
    var tx = Utils.clamp(Player.x + Math.cos(ang) * 250, rx + pad, rx + CFG.W - pad);
    var ty = Utils.clamp(Player.y + Math.sin(ang) * 250, ry + pad + 60, ry + CFG.H - pad);

    var dx = tx - boss.x, dy = ty - boss.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 6) {
      var spd = 62 * (boss.phase === 1 ? 1 : (boss.phase === 2 ? 1.12 : 1.24));
      boss.x += (dx / len) * spd * dt;
      boss.y += (dy / len) * spd * dt;
    }
  },

  // --------------------------------------------------------------------------
  // 选招：阶段越高，招越狠、间歇越短
  // --------------------------------------------------------------------------
  pickAction: function (boss, mg) {
    var distP = Utils.dist(boss.x, boss.y, Player.x, Player.y);

    // 按距离选招：贴得越近，越容易吃到环身爆发与剑阵
    var table;
    if (distP < 210) {
      table = [
        { a: 'nova', w: 44 },        // 贴脸惩罚
        { a: 'storm', w: 24 },
        { a: 'sweep', w: 20 },
        { a: 'blitz', w: 12 }
      ];
    } else if (distP < 340) {
      table = [
        { a: 'sweep', w: 32 },
        { a: 'blades', w: 30 },
        { a: 'blitz', w: 20 },
        { a: 'storm', w: 12 },
        { a: 'nova', w: 6 }
      ];
    } else {
      table = [
        { a: 'blades', w: 36 },
        { a: 'blitz', w: 30 },
        { a: 'sweep', w: 24 },
        { a: 'storm', w: 10 }
      ];
    }

    // 一阶段先不给"一闪"和"剑阵"，让玩家先学会近身爆发与横扫
    if (boss.phase === 1) {
      table = table.filter(function (t) { return t.a !== 'blitz' && t.a !== 'storm'; });
      table.forEach(function (t) { if (t.a === 'nova') t.w += 10; });
    }

    var total = 0;
    for (var i = 0; i < table.length; i++) total += table[i].w;
    var roll = Math.random() * total;
    var action = table[0].a;
    for (var k = 0; k < table.length; k++) {
      roll -= table[k].w;
      if (roll <= 0) { action = table[k].a; break; }
    }

    boss.action = action;
    boss.state = 'telegraph';
    boss.stateT = 0;
    boss.vulnerable = false;
    boss.swingHit = false;
    boss.lungeHit = false;
    boss.novaHit = false;
    boss.novaT = 0;

    var data = mg.iaijutsuData;
    var hintY = boss.y - boss.r - 26;

    if (action === 'sweep') {
      boss.stateDur = this.durOf(boss, 0.95);
      boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      data.bannerTimer = 0;
      SFX.play('swing');
      FX.floatText(boss.x, hintY, '⚠ 横扫 · 离开红区', '#f87171', 1.2);
    } else if (action === 'blades') {
      boss.stateDur = this.durOf(boss, 0.45);
      boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      FX.floatText(boss.x, hintY, '⚠ 飞刃 · 侧移躲开', '#f87171', 1.1);
    } else if (action === 'nova') {
      // 环身爆发不吃 speedMul：赤鬼虽然出招慢，但"贴脸就炸"必须是所有宿敌的共同威慑
      boss.stateDur = this.durOf(boss, 0.8) / boss.speedMul;
      SFX.play('lightning');
      FX.floatText(boss.x, hintY - 6, '💥 环身爆发 · 快离开', '#fb7185', 1.35);
    } else if (action === 'storm') {
      boss.stateDur = this.durOf(boss, 0.65);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, '🌀 剑阵 · 全向弹幕', '#f87171', 1.2);
    } else {
      boss.stateDur = this.durOf(boss, 1.05);
      boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      SFX.play('swing');
      FX.floatText(boss.x, hintY, '⚠ 一刀一闪 · 蓄力中', '#fbbf24', 1.3);
    }
  },

  tickTelegraph: function (boss, dt, mg) {
    // 出手前 0.3s 锁定方向：给玩家一个明确的"最后一刻躲开"
    var lockAt = Math.max(0, boss.stateDur - 0.3);
    if (boss.stateT < lockAt) {
      var want = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      // 缓慢跟随（不是瞬间贴脸），读招有余地
      var diff = Utils.normalizeAngle(want - boss.aim);
      boss.aim += Utils.clamp(diff, -3.2 * dt, 3.2 * dt);
    }

    if (boss.stateT >= boss.stateDur) {
      boss.state = 'action';
      boss.stateT = 0;
      this.startAction(boss, mg);
    }
  },

  startAction: function (boss, mg) {
    var data = mg.iaijutsuData;

    if (boss.action === 'sweep') {
      boss.stateDur = 0.26;
      boss.swingT = 0;
      SFX.play('swing');
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.4);

      // 判定：出手瞬间，站在扇形内就吃一下
      var dist = Utils.dist(boss.x, boss.y, Player.x, Player.y);
      var angToP = Math.atan2(Player.y - boss.y, Player.x - boss.x);
      var diff = Math.abs(Utils.normalizeAngle(angToP - boss.aim));
      if (dist <= boss.sweepRange && diff <= boss.sweepArc && !boss.swingHit) {
        boss.swingHit = true;
        if (this.damagePlayer(mg, Player.x, Player.y, '🩸 横扫命中 · -1 命')) {
          // 命中反馈已由 damagePlayer 处理
        }
      }
      // 刀风粒子
      for (var i = 0; i < 18; i++) {
        var a = boss.aim - boss.sweepArc + (i / 17) * boss.sweepArc * 2;
        mg.particles.push({
          x: boss.x + Math.cos(a) * boss.sweepRange * 0.9,
          y: boss.y + Math.sin(a) * boss.sweepRange * 0.9,
          vx: Math.cos(a) * 90,
          vy: Math.sin(a) * 90,
          size: 4,
          color: boss.colors.main,
          life: 0.3,
          maxLife: 0.3
        });
      }

    } else if (boss.action === 'blades') {
      boss.stateDur = 0.3;
      var n = boss.bladeCount;
      var spread = 0.17;
      for (var k = 0; k < n; k++) {
        var off = (k - (n - 1) / 2) * spread;
        var a2 = boss.aim + off;
        var sx = boss.x + Math.cos(a2) * (boss.r * 0.75);
        var sy = boss.y + Math.sin(a2) * (boss.r * 0.75);
        boss.blades.push({
          x: sx, y: sy,
          vx: Math.cos(a2) * 265,
          vy: Math.sin(a2) * 265,
          ang: a2,
          life: 2.6,
          maxLife: 2.6
        });
      }
      SFX.play('swing');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.22);

    } else if (boss.action === 'blitz') {
      boss.stateDur = 0.2;
      boss.lungeDir = boss.aim;
      boss.lungeHit = false;
      boss.lungeFrom = { x: boss.x, y: boss.y };
      boss.lungeDist = 0;
      SFX.play('iai');
      SFX.play('swing');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.5);

    } else if (boss.action === 'nova') {
      // 环身爆发：贴脸必吃，唯一的解法是突进离开（或无敌帧硬穿）
      boss.stateDur = 0.45;
      boss.novaT = 0;
      if (!boss.novaHit) {
        boss.novaHit = true;
        if (Utils.dist(boss.x, boss.y, Player.x, Player.y) <= boss.novaRange) {
          this.damagePlayer(mg, Player.x, Player.y, '💥 环身爆发 · -1 命');
        }
      }
      SFX.play('lightning');
      SFX.play('parry');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.7);
      for (var ni = 0; ni < 30; ni++) {
        var na = Math.random() * Math.PI * 2;
        var nsp = 260 + Math.random() * 180;
        mg.particles.push({
          x: boss.x + Math.cos(na) * boss.r * 0.9,
          y: boss.y + Math.sin(na) * boss.r * 0.9,
          vx: Math.cos(na) * nsp,
          vy: Math.sin(na) * nsp,
          size: 4.5,
          color: Math.random() < 0.5 ? boss.colors.main : '#fde047',
          life: 0.35,
          maxLife: 0.35
        });
      }

    } else if (boss.action === 'storm') {
      // 剑阵：全向弹幕，专门惩罚"站在 Boss 身边等破绽"
      boss.stateDur = 0.32;
      var sn = boss.stormCount;
      for (var si = 0; si < sn; si++) {
        var sa = (si / sn) * Math.PI * 2 + boss.aim;
        boss.blades.push({
          x: boss.x + Math.cos(sa) * (boss.r * 0.8),
          y: boss.y + Math.sin(sa) * (boss.r * 0.8),
          vx: Math.cos(sa) * 205,
          vy: Math.sin(sa) * 205,
          ang: sa,
          life: 2.1,
          maxLife: 2.1
        });
      }
      SFX.play('swing');
      SFX.play('lightning');
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.35);
    }
  },

  tickAction: function (boss, dt, mg) {
    if (boss.action === 'nova') boss.novaT = (boss.novaT || 0) + dt;

    if (boss.action === 'blitz') {
      var spd = 1750;
      var step = spd * dt;
      var nx = boss.x + Math.cos(boss.lungeDir) * step;
      var ny = boss.y + Math.sin(boss.lungeDir) * step;

      var rx = mg.room.worldX, ry = mg.room.worldY, pad = 110;
      var cx = Utils.clamp(nx, rx + pad, rx + CFG.W - pad);
      var cy = Utils.clamp(ny, ry + pad + 50, ry + CFG.H - pad);

      // 冲刺拖尾
      mg.particles.push({
        x: boss.x, y: boss.y,
        vx: 0, vy: 0,
        size: boss.r * 0.7,
        color: boss.colors.main,
        life: 0.18,
        maxLife: 0.18
      });

      boss.x = cx;
      boss.y = cy;

      if (!boss.lungeHit && Utils.dist(boss.x, boss.y, Player.x, Player.y) < boss.r + 24) {
        boss.lungeHit = true;
        this.damagePlayer(mg, Player.x, Player.y, '🩸 一闪命中 · -1 命');
      }

      if (boss.stateT >= boss.stateDur) {
        boss.state = 'recover';
        boss.stateT = 0;
        boss.stateDur = this.durOf(boss, 1.9);   // 一闪后的大破绽
        boss.action = null;
      }
      return;
    }

    if (boss.stateT >= boss.stateDur) {
      boss.state = 'recover';
      boss.stateT = 0;
      boss.stateDur = this.durOf(boss, 1.65);
      boss.action = null;
    }
  },

  // --------------------------------------------------------------------------
  // 飞刃
  // --------------------------------------------------------------------------
  updateBlades: function (dt, mg) {
    var data = mg.iaijutsuData;
    var boss = data.boss;
    if (!boss || !boss.blades || !boss.blades.length) return;

    var rx = mg.room.worldX, ry = mg.room.worldY;
    var pad = 40;

    for (var i = boss.blades.length - 1; i >= 0; i--) {
      var b = boss.blades[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // 出界 / 超时
      if (b.life <= 0 || b.x < rx - pad || b.x > rx + CFG.W + pad || b.y < ry - pad || b.y > ry + CFG.H + pad) {
        boss.blades.splice(i, 1);
        continue;
      }

      // 突进切飞刃：把弹幕砍掉，给一点连斩奖励（鼓励迎着弹幕上）
      if (data.isDashing && data.prevPos) {
        var dd = Utils.distToSegment(b.x, b.y, data.prevPos.x, data.prevPos.y, Player.x, Player.y);
        if (dd <= 26) {
          boss.blades.splice(i, 1);
          mg.combo += 1;
          if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
          SFX.play('parry');
          FX.floatText(b.x, b.y - 14, '✂ 斩落飞刃', '#38bdf8', 0.9);
          mg.addExplosion(b.x, b.y, '#38bdf8', 8);
          continue;
        }
      }

      // 命中玩家
      if (Utils.dist(b.x, b.y, Player.x, Player.y) < 12 + 16) {
        boss.blades.splice(i, 1);
        this.damagePlayer(mg, Player.x, Player.y, '🩸 飞刃命中 · -1 命');
      }
    }
  },

  // --------------------------------------------------------------------------
  // 玩家受伤（统一入口：无敌帧内免伤，避免被连招一次打空）
  // --------------------------------------------------------------------------
  damagePlayer: function (mg, x, y, label) {
    var data = mg.iaijutsuData;
    if (!data) return false;
    if (Player.invulnTimer > 0) return false;
    if (data.lives <= 0) return false;

    data.lives -= 1;
    mg.combo = 0;

    SFX.play('hurt');
    SFX.play('parry');
    Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);
    FX.floatText(x, y - 34, label || '🩸 被宿敌命中 · -1 命', '#f43f5e', 1.8);
    mg.addExplosion(x, y, '#f43f5e', 26);
    mg.addExplosion(x, y, '#ffffff', 10);

    // 受伤后 1.0s 无敌，给玩家重新站位的时间
    Player.invulnTimer = Math.max(Player.invulnTimer, 1.0);

    if (data.lives <= 0) {
      data.lives = 0;
      mg.finishGame('lose', '👹 宿敌「' + (data.boss ? data.boss.name : '无名') + '」未斩，特训结束！');
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------
  render: function (ctx, mg) {
    var data = mg.iaijutsuData;
    var boss = data && data.boss;
    if (!boss) return;

    this.drawTelegraph(ctx, boss, mg);
    this.drawBlades(ctx, boss);
    this.drawBoss(ctx, boss, mg);
    this.drawHud(ctx, boss, mg);
  },

  drawTelegraph: function (ctx, boss, mg) {
    if (boss.state !== 'telegraph') return;
    var p = Utils.clamp(boss.stateT / boss.stateDur, 0, 1);
    ctx.save();

    if (boss.action === 'sweep') {
      var alpha = 0.07 + 0.16 * p;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.arc(boss.x, boss.y, boss.sweepRange, boss.aim - boss.sweepArc, boss.aim + boss.sweepArc);
      ctx.closePath();
      ctx.fillStyle = 'rgba(244, 63, 94, ' + alpha.toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.45 + 0.45 * p).toFixed(3) + ')';
      ctx.lineWidth = 2 + p * 2;
      ctx.stroke();

      // 扫过来的刀锋边
      var edge = boss.aim - boss.sweepArc + boss.sweepArc * 2 * p;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(edge) * boss.sweepRange, boss.y + Math.sin(edge) * boss.sweepRange);
      ctx.strokeStyle = 'rgba(255, 220, 220, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

    } else if (boss.action === 'blades') {
      var n = boss.bladeCount;
      for (var i = 0; i < n; i++) {
        var off = (i - (n - 1) / 2) * 0.17;
        var a = boss.aim + off;
        ctx.beginPath();
        ctx.moveTo(boss.x + Math.cos(a) * boss.r * 0.8, boss.y + Math.sin(a) * boss.r * 0.8);
        ctx.lineTo(boss.x + Math.cos(a) * 320, boss.y + Math.sin(a) * 320);
        ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.18 + 0.4 * p).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([9, 7]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

    } else if (boss.action === 'nova') {
      // 收缩的红环 + 范围填充，读起来就是"马上要炸开"
      var nr = boss.novaRange;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, nr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 63, 94, ' + (0.05 + 0.12 * p).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 113, 133, ' + (0.4 + 0.5 * p).toFixed(3) + ')';
      ctx.lineWidth = 2 + 3 * p;
      ctx.stroke();

      var shrink = nr * (1.35 - 0.35 * p);
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, shrink, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 240, 240, ' + (0.25 + 0.5 * p).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (boss.action === 'storm') {
      var sn2 = boss.stormCount;
      for (var si2 = 0; si2 < sn2; si2++) {
        var sa2 = (si2 / sn2) * Math.PI * 2 + boss.aim;
        ctx.beginPath();
        ctx.moveTo(boss.x + Math.cos(sa2) * boss.r * 0.8, boss.y + Math.sin(sa2) * boss.r * 0.8);
        ctx.lineTo(boss.x + Math.cos(sa2) * boss.r * 2.4, boss.y + Math.sin(sa2) * boss.r * 2.4);
        ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.18 + 0.35 * p).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 9]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

    } else if (boss.action === 'blitz') {
      var len = 400;
      var ex = boss.x + Math.cos(boss.aim) * len;
      var ey = boss.y + Math.sin(boss.aim) * len;

      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.25 + 0.45 * p).toFixed(3) + ')';
      ctx.lineWidth = 2 + 6 * p;
      ctx.stroke();

      // 锁定圈
      ctx.beginPath();
      ctx.arc(ex, ey, 26 + Math.sin(boss.pulse * 14) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.4 + 0.5 * p).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  },

  drawBlades: function (ctx, boss) {
    if (!boss.blades || !boss.blades.length) return;
    ctx.save();
    for (var i = 0; i < boss.blades.length; i++) {
      var b = boss.blades[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);

      // 拖尾
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(248, 113, 113, 0.28)';
      ctx.fill();

      // 刃身
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-2, -5);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.fillStyle = '#fecaca';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawBoss: function (ctx, boss, mg) {
    var r = boss.r;
    var dying = boss.state === 'dying';
    var scale = 1;
    if (boss.state === 'intro') scale = Utils.clamp(boss.stateT / 0.6, 0.2, 1);
    if (dying) scale = Math.max(0.05, 1 - boss.deathT / 1.5);

    ctx.save();

    // 环身爆发的扩散冲击环
    if (boss.action === 'nova' && boss.state === 'action') {
      var np = Utils.clamp((boss.novaT || 0) / 0.45, 0, 1);
      var rr2 = boss.r * 0.8 + (boss.novaRange - boss.r * 0.8) * np;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, rr2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.75 * (1 - np)).toFixed(3) + ')';
      ctx.lineWidth = 6 * (1 - np) + 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, rr2 * 0.92, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(244, 63, 94, ' + (0.55 * (1 - np)).toFixed(3) + ')';
      ctx.lineWidth = 10 * (1 - np) + 1;
      ctx.stroke();
    }

    // 地面投影
    ctx.beginPath();
    ctx.ellipse(boss.x, boss.y + r * 0.95, r * 0.85 * scale, r * 0.28 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // 外环（护甲）
    var rings = boss.phase === 1 ? 2 : (boss.phase === 2 ? 3 : 4);
    for (var i = 0; i < rings; i++) {
      var rr = (r + 12 + i * 11) * scale;
      var rot = boss.pulse * (0.5 + i * 0.35) * (i % 2 === 0 ? 1 : -1);
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 1.45);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 + i * 0.05) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // 光晕
    var glow = ctx.createRadialGradient(boss.x, boss.y, r * 0.3, boss.x, boss.y, r * 1.7);
    glow.addColorStop(0, boss.colors.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * 1.7, 0, Math.PI * 2);
    ctx.fill();

    // 本体
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(11, 17, 32, 0.92)';
    ctx.fill();
    ctx.strokeStyle = boss.colors.main;
    ctx.lineWidth = 3;
    ctx.shadowColor = boss.colors.main;
    ctx.shadowBlur = 22;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 内圈装饰
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * scale * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = boss.colors.sub;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 表情
    ctx.font = Math.round(r * 0.95 * scale) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boss.emoji, boss.x, boss.y + 2);

    // 受击白闪
    if (boss.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (boss.hitFlash * 2.2).toFixed(3) + ')';
      ctx.fill();
    }

    // 弱点：仅在破绽期可打，没破绽时只是暗色标记
    for (var w = 0; w < boss.weak.length; w++) {
      var wp = this.getWeakPos(boss, w);
      var live = boss.vulnerable && !dying;
      var pulse = 1 + Math.sin(boss.pulse * 6 + w * Math.PI) * 0.12;

      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = live ? 'rgba(253, 224, 71, 0.85)' : 'rgba(71, 85, 105, 0.55)';
      ctx.shadowColor = live ? '#fde047' : 'transparent';
      ctx.shadowBlur = live ? 18 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.r * pulse + 5, 0, Math.PI * 2);
      ctx.strokeStyle = live ? 'rgba(255,255,255,0.9)' : 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (live) {
        ctx.beginPath();
        ctx.moveTo(wp.x - 7, wp.y); ctx.lineTo(wp.x + 7, wp.y);
        ctx.moveTo(wp.x, wp.y - 7); ctx.lineTo(wp.x, wp.y + 7);
        ctx.strokeStyle = 'rgba(120, 53, 15, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // 破绽期给本体加一圈绿光，读招更直观
    if (boss.vulnerable && !dying) {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r * scale + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(74, 222, 128, ' + (0.25 + 0.25 * Math.sin(boss.pulse * 5)).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  },

  drawHud: function (ctx, boss, mg) {
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var data = mg.iaijutsuData;
    var w = 320, h = 62;
    var x = rx + CFG.W - w - 24;   // 右上角：不压画面正中，也不碰连斩徽章与高光横幅
    var y = ry + 74;

    ctx.save();

    // 面板
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = boss.colors.main;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    // 名字
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(boss.emoji + ' ' + boss.name, x + 12, y + 7);

    // 阶段点
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = boss.colors.main;
    var pips = '';
    for (var i = 0; i < 3; i++) pips += (i < boss.phase ? '◆' : '◇');
    ctx.fillText(pips, x + w - 12, y + 9);

    // 血条
    var bx = x + 12, by = y + 26, bw = w - 24, bh = 13;
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

    // 阶段刻度
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
    ctx.lineWidth = 1;
    [0.33, 0.66].forEach(function (m) {
      var mx = bx + bw * m;
      ctx.beginPath();
      ctx.moveTo(mx, by);
      ctx.lineTo(mx, by + bh);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.strokeRect(bx, by, bw, bh);

    // 血量数字：居中放在血条里，带一层暗底保证在任何填充色上都读得清
    var hpText = Math.ceil(boss.hp) + ' / ' + boss.maxHp;
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    var tw = (ctx.measureText ? (ctx.measureText(hpText).width || 0) : 0);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
    ctx.fillRect(bx + bw / 2 - tw / 2 - 5, by + 2, tw + 10, bh - 4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(hpText, bx + bw / 2, by + bh / 2 + 1);

    // 状态提示 + 心眼冷却
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    var stateText, stateColor;
    if (boss.state === 'dying') {
      stateText = '💀 宿敌已斩'; stateColor = '#fde047';
    } else if (boss.state === 'intro') {
      stateText = '◆ 宿敌降临'; stateColor = boss.colors.main;
    } else if (boss.vulnerable) {
      stateText = '◆ 破绽 · 砍发光弱点'; stateColor = '#4ade80';
    } else if (boss.state === 'telegraph') {
      stateText = boss.action === 'sweep' ? '⚠ 横扫 · 离开红区' :
        boss.action === 'blades' ? '⚠ 飞刃 · 准备侧移' :
        boss.action === 'nova' ? '💥 环身爆发 · 快出去' :
        boss.action === 'storm' ? '🌀 剑阵 · 全向弹幕' : '⚠ 一闪 · 别站红线';
      stateColor = '#f87171';
    } else {
      stateText = '⚠ 出招中'; stateColor = '#f87171';
    }
    ctx.fillStyle = stateColor;
    ctx.fillText(stateText, x + 12, by + bh + 6);

    // 心眼
    var eyeCd = data.eyeCd || 0;
    ctx.textAlign = 'right';
    ctx.fillStyle = eyeCd > 0 ? '#94a3b8' : '#7dd3fc';
    ctx.fillText(eyeCd > 0 ? ('🧿 ' + eyeCd.toFixed(1) + 's') : '🧿 就绪 [空格]', x + w - 12, by + bh + 6);

    ctx.restore();
  }
};

// ============================================================================
// 宿敌战专用靶表代理：只做一件事 —— 别用普通靶的画法画 Boss
// （宿主 MiniGames.start 会把 window.IaijutsuTargets 临时指向这里）
// ============================================================================
var IAIJUTSU_TARGETS_BOSS_PARENT = window.IaijutsuTargets;
window.IaijutsuTargetsBoss = Object.create(IAIJUTSU_TARGETS_BOSS_PARENT);

window.IaijutsuTargetsBoss.drawDummy = function (ctx, d, skin) {
  if (d && d.isBoss) return;              // Boss 由 IaijutsuBoss.drawBoss 负责
  IAIJUTSU_TARGETS_BOSS_PARENT.drawDummy.call(IAIJUTSU_TARGETS_BOSS_PARENT, ctx, d, skin);

  // 刀魂 = 宿敌战的"跳板"：斩中它不消耗突进 CD，所以给一圈醒目的青色脉冲环
  if (d && d.bossMinion) {
    var ph = (d.pulse || 0) * 2.2;
    var rr = d.r + 11 + Math.sin(ph) * 2.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y, rr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, ' + (0.4 + 0.25 * Math.sin(ph)).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.fillText('⟳ 跳板', d.x, d.y + d.r + 8);
    ctx.restore();
  }
};
