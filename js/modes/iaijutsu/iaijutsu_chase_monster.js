// ============================================================================
// 鬼影追猎 · 追猎恶鬼与七大华丽技能引擎 (Chase Pursuer Boss & 7 Spectacle Skills)
// ----------------------------------------------------------------------------
// 独立扩展模块，不修改任何原版 / 异靶 / 宿敌文件。
// 难度三阶段递增（0m -> 500m 血月降临 -> 1000m+ 百鬼夜行）：
//   原有三招强化：
//     1. lunge   猛冲突袭（猩红冲锋轨道 + 残影重击）
//     2. wave    封路斩波（多车道高速月牙斩波）
//     3. trap    缚足黑雾陷阱（预埋紫红符文 + 引爆伤 + 减速毒池）
//   新增四大华丽压迫招式：
//     4. claws   墙隙鬼手合杀（上下石墙撕裂伸出巨型鬼手，交替/夹击并可捏碎靶位）
//     5. pillars 血月业火柱（沿玩家前路连环追踪爆破的 4~6 道冲天业火柱）
//     6. lattice 绯红次元刀网（二阶解锁：全屏斜向交叉激光预警 -> 同步次元爆裂斩）
//     7. phantom 夺路鬼影分身（三阶解锁：黑雾残影越顶瞬移至前方 -> 迎面逆向反冲斩）
//   高燃交互：
//     - 二阶起开启「脱手技 + 本体技」双技能压迫连携
//     - 居合闪无敌帧贴身穿招触发【⚡ 见切！】奖励 +3 连斩并缩减瞬步冷却
// ============================================================================

window.IaijutsuChaseMonster = {
  create: function (mg, playerStartX) {
    var ry = mg.room.worldY;
    return {
      name: '噬影鬼',
      emoji: '👹',
      x: playerStartX - 210,
      y: ry + CFG.H / 2,
      vx: 0,
      vy: 0,
      r: 35,
      baseSpeed: 302,

      // 阶段（1: 阴风初起 0~499m | 2: 血月降临 500~999m | 3: 百鬼夜行 1000m+）
      phase: 1,

      // 行为状态机：intro -> chase -> telegraph -> action -> recover -> chase
      state: 'intro',
      stateT: 0,
      stateDur: 0.7,
      skillType: null,
      skillCd: 2.0,
      offhandCd: 3.4, // 二阶起允许脱手技（鬼手/黑雾/火柱）独立叠放
      lastSkill: null,
      sameSkillStreak: 0,

      // 技能临时数据
      lungeY: ry + CFG.H / 2,
      lungeStartX: 0,
      lungeHitDone: false,
      pendingWaveLanes: [],

      // 场上活跃技能实体列表
      waves: [],
      traps: [],
      claws: [],
      pillars: [],
      pillarQueue: [],
      lattices: [],
      phantoms: [],

      // 视觉表现
      pulse: 0,
      afterimages: [],
      afterimageTimer: 0,
      roarFlash: 0,
      dimFlash: 0,      // 次元刀网 / 阶段爆发时的镜头压暗聚焦
      banished: false,
      banishT: 0
    };
  },

  // 当前难度阶段：0~499m 一阶，500~999m 二阶（血月降临），1000m+ 三阶（百鬼夜行）
  getPhase: function (data) {
    var m = (data && data.distanceM) ? data.distanceM : 0;
    if (m >= 1000) return 3;
    if (m >= 500) return 2;
    return 1;
  },

  // 连续难度倍率（随距离平滑递增）
  getDifficulty: function (data) {
    var m = (data && data.distanceM) ? data.distanceM : 0;
    if (data && data.chaseVariant === 'endless') {
      return 1 + Math.min(1.45, m / 1350);
    }
    return 1 + Math.min(0.75, m / 1450);
  },

  // 【⚡ 见切！】用居合闪无敌帧贴身穿过危险招式的高光奖励
  triggerGraze: function (mg, sourceLabel) {
    var data = mg.iaijutsuData;
    if (!data || data.escapeVictory || mg.finished) return false;
    if ((data.grazeCd || 0) > 0) return false;

    data.grazeCd = 0.42;
    mg.combo += 3;
    if (mg.combo > mg.maxCombo) mg.maxCombo = mg.combo;
    if (data.escapeDashCd > 0) {
      data.escapeDashCd = Math.max(0, data.escapeDashCd - 1.2);
    }

    if (window.SFX) {
      SFX.play('parry');
      SFX.play('lightning');
    }
    if (window.Main) {
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.16);
    }
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 44, '⚡ 见切·' + (sourceLabel || '破招') + ' +3连斩！', '#7dd3fc', 1.4);
    }
    mg.addExplosion(Player.x, Player.y, '#7dd3fc', 18);
    mg.addExplosion(Player.x, Player.y, '#ffffff', 10);
    return true;
  },

  // 统一碰撞检测入口：冲刺中触发见切奖励，否则扣 1 命
  checkHitOrGraze: function (mg, reasonLabel, grazeLabel, pushForward, isBodyHit) {
    var data = mg.iaijutsuData;
    if (!data || data.escapeVictory || mg.finished) return false;

    // 正在居合冲刺或瞬步脱身期间撞招 -> 华丽【见切！】
    if (Player.dashT > 0 || data.isEscapeDash) {
      this.triggerGraze(mg, grazeLabel || reasonLabel);
      return false;
    }
    return this.hurtPlayer(mg, reasonLabel, pushForward, isBodyHit);
  },

  // 玩家受击统一结算（3 条命、受击无敌保护、向前安全弹开防连撞）
  hurtPlayer: function (mg, reasonLabel, pushForward, isBodyHit) {
    var data = mg.iaijutsuData;
    if (!data || data.escapeVictory || mg.finished) return false;
    if (Player.invulnTimer > 0 || (data.hitInvuln || 0) > 0) return false;
    if (data.frenzyTimer > 0) return false;

    data.lives = Math.max(0, (data.lives || 3) - 1);
    data.hitInvuln = 1.25;
    Player.invulnTimer = Math.max(Player.invulnTimer, 1.25);
    data.slowTimer = 0;
    mg.combo = 0;

    if (Player.skillTimers[1] > 0.35) {
      Player.skillTimers[1] = 0.35;
    }

    var push = pushForward || 80;
    Player.x += push;
    if (mg.room) {
      Physics.clampToBounds(Player, mg.room);
    }

    if (isBodyHit && data.monster) {
      data.monster.x = Math.min(data.monster.x - 80, Player.x - 145);
      if (data.monster.state === 'action' && data.monster.skillType === 'lunge') {
        data.monster.state = 'recover';
        data.monster.stateT = 0;
        data.monster.stateDur = 0.55;
      }
    }

    if (window.SFX) {
      SFX.play('hurt');
      SFX.play('parry');
    }
    if (window.Main) {
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.58);
      Main.screenFlash = 0.34;
      Main.screenFlashColor = '239,68,68';
    }
    if (window.FX && FX.floatText) {
      FX.floatText(
        Player.x,
        Player.y - 36,
        '🩸 ' + (reasonLabel || '受击') + ' · 剩余 ' + data.lives + ' 命',
        '#fb7185',
        1.55
      );
    }
    mg.addExplosion(Player.x, Player.y, '#ef4444', 24);
    mg.addExplosion(Player.x, Player.y, '#ffffff', 10);

    if (data.lives <= 0) {
      var modeLabel = data.chaseVariant === 'endless' ? '无尽逃亡结束' : '未能逃离长廊';
      mg.finishGame('lose', '👹 被噬影鬼吞噬！' + modeLabel + '（已奔袭 ' + Math.floor(data.distanceM || 0) + 'm）');
    }
    return true;
  },

  // ==================== 技能调度（按阶段逐步解锁七大技能） ====================
  pickNextSkill: function (monster, data) {
    var phase = monster.phase || this.getPhase(data);
    var gap = Player.x - monster.x;

    // 阶段 1：lunge / wave / trap / claws / pillars
    // 阶段 2：解锁 lattice（绯红次元刀网）
    // 阶段 3：解锁 phantom（夺路鬼影分身前后夹击）
    var entries = [
      { id: 'lunge',   w: (gap > 150 && gap < 560) ? 1.1 : 0.65 },
      { id: 'wave',    w: 1.05 },
      { id: 'trap',    w: 0.9 },
      { id: 'claws',   w: 1.35 },
      { id: 'pillars', w: 1.25 }
    ];
    if (phase >= 2) {
      entries.push({ id: 'lattice', w: 1.4 });
    }
    if (phase >= 3) {
      entries.push({ id: 'phantom', w: 1.45 });
    }

    var total = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === monster.lastSkill) {
        entries[i].w *= (monster.sameSkillStreak >= 1 ? 0.12 : 0.4);
      }
      total += entries[i].w;
    }

    var r = Math.random() * total;
    var chosen = entries[0].id;
    var acc = 0;
    for (var j = 0; j < entries.length; j++) {
      acc += entries[j].w;
      if (r <= acc) { chosen = entries[j].id; break; }
    }

    if (chosen === monster.lastSkill) monster.sameSkillStreak++;
    else {
      monster.lastSkill = chosen;
      monster.sameSkillStreak = 0;
    }
    return chosen;
  },

  // 脱手技能独立释放（墙隙鬼手 / 黑雾陷阱 / 血月业火柱，可与其他招式叠放）
  spawnClaws: function (monster, mg) {
    var data = mg.iaijutsuData;
    var phase = monster.phase || this.getPhase(data);
    var ry = mg.room.worldY;
    var wallH = 38;
    var count = phase === 1 ? 3 : (phase === 2 ? 4 : 5);
    var usePinch = phase >= 2 && Math.random() < 0.48;
    var startSide = Math.random() < 0.5 ? 'top' : 'bottom';
    var baseX = Player.x + 175;
    var spacing = phase >= 3 ? 112 : 126;

    for (var i = 0; i < count; i++) {
      var side = (i % 2 === 0) ? startSide : (startSide === 'top' ? 'bottom' : 'top');
      var cx = baseX + i * spacing;
      var reach = (phase >= 2 ? 196 : 180) + Math.random() * 24;

      if (usePinch && i === 1) {
        // 夹击对拍：上下同时伸出巨爪，正中留约 120px 极窄安全缝
        var pinchReach = (CFG.H - wallH * 2 - 122) / 2;
        monster.claws.push(this._makeClawObj(cx, 'top', pinchReach, 0.12, ry, wallH));
        monster.claws.push(this._makeClawObj(cx, 'bottom', pinchReach, 0.12, ry, wallH));
      } else {
        monster.claws.push(this._makeClawObj(cx, side, reach, i * 0.12, ry, wallH));
      }
    }

    if (window.SFX) SFX.play('parry');
    if (window.FX && FX.floatText) {
      FX.floatText(
        Player.x + 120,
        ry + 96,
        usePinch ? '🖐️ 墙隙鬼手夹击！穿缝突围' : '🖐️ 墙隙鬼手合杀！斜闪躲爪',
        '#e879f9',
        1.3
      );
    }
  },

  _makeClawObj: function (x, side, reach, delay, ry, wallH) {
    var anchorY = (side === 'top') ? (ry + wallH) : (ry + CFG.H - wallH);
    return {
      x: x,
      side: side,
      anchorY: anchorY,
      dir: (side === 'top') ? 1 : -1,
      reach: reach,
      width: 68,
      progress: 0,
      phase: 'telegraph',
      delay: delay || 0,
      telegraphT: 0.64,
      telegraphMax: 0.64,
      strikeT: 0.18,
      strikeMax: 0.18,
      holdT: 0.28,
      retractT: 0.34,
      retractMax: 0.34,
      crushedTarget: false,
      hitPlayer: false,
      pulse: Math.random() * Math.PI * 2
    };
  },

  spawnPillars: function (monster, mg) {
    var data = mg.iaijutsuData;
    var phase = monster.phase || this.getPhase(data);
    var count = phase === 1 ? 4 : (phase === 2 ? 5 : 6);
    var interval = phase >= 3 ? 0.19 : 0.23;

    for (var i = 0; i < count; i++) {
      monster.pillarQueue.push({
        wait: i * interval,
        leadPx: 140 + i * 24,
        idx: i
      });
    }

    if (window.SFX) SFX.play('switch');
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x + 110, Player.y - 46, '🔥 血月业火柱连环追爆！切勿停步', '#fb923c', 1.3);
    }
  },

  spawnTraps: function (monster, mg) {
    var data = mg.iaijutsuData;
    var ry = mg.room.worldY;
    var minY = ry + 86;
    var maxY = ry + CFG.H - 86;
    var phase = monster.phase || this.getPhase(data);
    var count = phase >= 2 ? 3 : 2;
    var spawned = [];

    for (var ti = 0; ti < count; ti++) {
      var tx = Player.x + 185 + ti * 130 + (Math.random() - 0.5) * 36;
      var ty;
      if (ti === 0) {
        ty = Utils.clamp(Player.y + (Math.random() - 0.5) * 40, minY, maxY);
      } else {
        var offset = (ti % 2 === 1 ? 1 : -1) * (105 + Math.random() * 45);
        ty = Utils.clamp(Player.y + offset, minY, maxY);
        if (Math.abs(ty - spawned[0].y) < 70) {
          ty = (spawned[0].y > ry + CFG.H / 2) ? (ry + 108) : (ry + CFG.H - 108);
        }
      }
      var trapObj = {
        x: tx,
        y: ty,
        r: 52,
        telegraphT: 0.72,
        telegraphMax: 0.72,
        activeT: 4.8,
        activeMax: 4.8,
        burstT: 0,
        burstHit: false,
        phase: 'telegraph',
        pulse: Math.random() * Math.PI * 2
      };
      monster.traps.push(trapObj);
      spawned.push(trapObj);
    }
    if (window.SFX) SFX.play('switch');
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x + 110, Player.y - 44, '🕸️ 缚足黑雾预警！居合闪跨越', '#c084fc', 1.2);
    }
  },

  spawnLattice: function (monster, mg) {
    var data = mg.iaijutsuData;
    var phase = monster.phase || this.getPhase(data);
    var ry = mg.room.worldY;
    var topY = ry + 36;
    var botY = ry + CFG.H - 36;
    var baseStartX = Player.x - 40;

    // 4~6 条斜向交叉猩红刀网，按等距交错保证中间总有菱形安全区
    var pairs = phase >= 3 ? 3 : 2;
    var stepX = phase >= 3 ? 215 : 245;
    var lines = [];
    for (var i = 0; i < pairs; i++) {
      var lx = baseStartX + i * stepX + 70;
      // 正斜斩（左上 -> 右下）
      lines.push({ x1: lx - 140, y1: topY, x2: lx + 185, y2: botY });
      // 反斜斩（左下 -> 右上）
      lines.push({ x1: lx - 80, y1: botY, x2: lx + 245, y2: topY });
    }

    monster.lattices.push({
      lines: lines,
      phase: 'telegraph',
      telegraphT: phase >= 3 ? 0.76 : 0.84,
      telegraphMax: phase >= 3 ? 0.76 : 0.84,
      slashT: 0.22,
      slashMax: 0.22,
      fadeT: 0.38,
      fadeMax: 0.38,
      hitDone: false
    });
    monster.dimFlash = 0.82;

    if (window.SFX) {
      SFX.play('parry');
      SFX.play('iai');
    }
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x + 130, ry + 112, '⚔️ 绯红次元刀网！抢占菱形安全格或居合见切', '#fda4af', 1.38);
    }
  },

  spawnPhantom: function (monster, mg) {
    var data = mg.iaijutsuData;
    var ry = mg.room.worldY;
    var targetX = Player.x + 410;
    var targetY = Utils.clamp(Player.y, ry + 96, ry + CFG.H - 96);

    monster.phantoms.push({
      x: monster.x,
      y: monster.y,
      startX: monster.x,
      startY: monster.y,
      targetX: targetX,
      targetY: targetY,
      phase: 'travel',   // travel -> telegraph -> dash -> fade
      t: 0,
      travelDur: 0.32,
      telegraphDur: 0.72,
      dashDur: 0.42,
      fadeDur: 0.28,
      dashSpeed: 880,
      r: 30,
      hitDone: false,
      afterimages: []
    });

    if (window.SFX) {
      SFX.play('dash');
      SFX.play('lightning');
    }
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x + 160, ry + 115, '👻 鬼影分身越顶包抄！小心迎面反冲斩', '#f43f5e', 1.35);
    }
  },

  startSkillTelegraph: function (monster, skillType, mg) {
    var data = mg.iaijutsuData;
    var ry = mg.room.worldY;
    var minY = ry + 78;
    var maxY = ry + CFG.H - 78;
    var diff = this.getDifficulty(data);
    var phase = monster.phase || this.getPhase(data);

    monster.state = 'telegraph';
    monster.stateT = 0;
    monster.skillType = skillType;
    monster.roarFlash = 0.48;

    if (skillType === 'lunge') {
      monster.stateDur = Math.max(0.50, 0.66 - (diff - 1) * 0.12);
      monster.lungeY = Utils.clamp(Player.y, minY, maxY);
      monster.lungeStartX = monster.x;
      monster.lungeHitDone = false;
      if (window.SFX) SFX.play('parry');
      if (window.FX && FX.floatText) {
        FX.floatText(Math.max(monster.x + 70, data.camX + 120), monster.lungeY - 26, '⚠ 噬影猛冲！上下变道躲避', '#f87171', 1.25);
      }
    } else if (skillType === 'wave') {
      monster.stateDur = Math.max(0.58, 0.74 - (diff - 1) * 0.12);
      var allLanes = [ry + 112, ry + CFG.H / 2, ry + CFG.H - 112];
      var playerLaneIdx = 1;
      if (Player.y < ry + CFG.H * 0.36) playerLaneIdx = 0;
      else if (Player.y > ry + CFG.H * 0.64) playerLaneIdx = 2;

      var lanes = [allLanes[playerLaneIdx]];
      if (phase >= 2 || data.distanceM >= 260) {
        var others = [];
        for (var oi = 0; oi < 3; oi++) {
          if (oi !== playerLaneIdx) others.push(allLanes[oi]);
        }
        lanes.push(others[Math.floor(Math.random() * others.length)]);
      }

      monster.pendingWaveLanes = lanes;
      if (window.SFX) SFX.play('parry');
      if (window.FX && FX.floatText) {
        FX.floatText(Player.x + 80, ry + 112, '⚔ 封路斩波来袭！寻找安全车道', '#fb923c', 1.2);
      }
    } else if (skillType === 'trap') {
      monster.stateDur = 0.24;
      this.spawnTraps(monster, mg);
    } else if (skillType === 'claws') {
      monster.stateDur = 0.26;
      this.spawnClaws(monster, mg);
    } else if (skillType === 'pillars') {
      monster.stateDur = 0.26;
      this.spawnPillars(monster, mg);
    } else if (skillType === 'lattice') {
      monster.stateDur = 0.36;
      this.spawnLattice(monster, mg);
    } else if (skillType === 'phantom') {
      monster.stateDur = 0.30;
      this.spawnPhantom(monster, mg);
    }
  },

  executeSkillAction: function (monster, mg) {
    var data = mg.iaijutsuData;
    var diff = this.getDifficulty(data);

    if (monster.skillType === 'lunge') {
      monster.state = 'action';
      monster.stateT = 0;
      monster.stateDur = 0.42;
      monster.y = monster.lungeY;
      var minLaunchX = data.camX - 70;
      if (monster.x < minLaunchX) monster.x = minLaunchX;
      monster.vx = 830 + (diff - 1) * 150;
      monster.vy = 0;

      if (window.SFX) {
        SFX.play('dash');
        SFX.play('lightning');
      }
      if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.28);
      mg.addExplosion(monster.x, monster.y, '#ef4444', 22);
    } else if (monster.skillType === 'wave') {
      monster.state = 'action';
      monster.stateT = 0;
      monster.stateDur = 0.20;

      var waveStartX = Math.max(monster.x + 28, data.camX - 24);
      var waveSpd = 770 + (diff - 1) * 150;
      for (var i = 0; i < monster.pendingWaveLanes.length; i++) {
        var ly = monster.pendingWaveLanes[i];
        monster.waves.push({
          x: waveStartX,
          y: ly,
          vx: waveSpd,
          halfW: 28,
          halfH: 27,
          life: 2.2,
          hit: false
        });
        mg.addExplosion(waveStartX, ly, '#f97316', 16);
      }
      monster.pendingWaveLanes = [];
      if (window.SFX) {
        SFX.play('iai');
        SFX.play('swing');
      }
      if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.22);
    } else {
      // 脱手招式施法完立刻短收招，保持紧追不舍的压迫节奏
      monster.state = 'recover';
      monster.stateT = 0;
      monster.stateDur = 0.26;
    }
  },

  // ==================== 帧更新 ====================
  update: function (dt, mg) {
    var data = mg.iaijutsuData;
    var monster = data && data.monster;
    if (!monster) return;

    var ry = mg.room.worldY;
    var minY = ry + 64;
    var maxY = ry + CFG.H - 64;
    var diff = this.getDifficulty(data);

    monster.pulse += dt * 6.5;
    if (monster.roarFlash > 0) monster.roarFlash = Math.max(0, monster.roarFlash - dt);
    if (monster.dimFlash > 0) monster.dimFlash = Math.max(0, monster.dimFlash - dt);
    if (data.grazeCd > 0) data.grazeCd = Math.max(0, data.grazeCd - dt);

    // 逃脱胜利后净化所有技能与怪物
    if (data.escapeVictory) {
      monster.banished = true;
      monster.banishT += dt;
      monster.x -= 110 * dt;
      monster.waves.length = 0;
      monster.traps.length = 0;
      monster.claws.length = 0;
      monster.pillars.length = 0;
      monster.pillarQueue.length = 0;
      monster.lattices.length = 0;
      monster.phantoms.length = 0;
      return;
    }

    // 阶段递增触发演出（500m 血月降临 / 1000m 百鬼夜行）
    var targetPhase = this.getPhase(data);
    if (targetPhase > monster.phase) {
      monster.phase = targetPhase;
      monster.roarFlash = 0.9;
      monster.dimFlash = 0.65;
      if (window.SFX) {
        SFX.play('victory');
        SFX.play('lightning');
      }
      if (window.Main) {
        Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.55);
        Main.screenFlash = 0.35;
        Main.screenFlashColor = targetPhase === 2 ? '239,68,68' : '168,85,247';
      }
      mg.addExplosion(monster.x, monster.y, '#ef4444', 36);
      mg.addExplosion(monster.x, monster.y, '#fde047', 18);
      data.bannerTimer = 3.0;
      if (targetPhase === 2) {
        data.bannerText = '🩸 二阶 · 血月降临！';
        data.bannerSub = '解锁【绯红次元刀网】与双技能压迫连携！';
      } else {
        data.bannerText = '🔥 三阶 · 百鬼夜行！';
        data.bannerSub = '业火双翼觉醒 · 解锁【夺路鬼影分身】前后夹击！';
      }
    }

    // 残影衰减
    for (var ai = monster.afterimages.length - 1; ai >= 0; ai--) {
      monster.afterimages[ai].life -= dt;
      if (monster.afterimages[ai].life <= 0) monster.afterimages.splice(ai, 1);
    }

    var gap = Player.x - monster.x;
    var baseChaseSpd = monster.baseSpeed + (diff - 1) * 140;
    var rubberBonus = 0;
    if (gap > 400) {
      rubberBonus = Math.min(220, (gap - 400) * 0.52);
    } else if (gap < 145) {
      rubberBonus = -20;
    }
    var effectiveChaseSpd = Math.max(225, baseChaseSpd + rubberBonus);

    // ==================== 怪物主状态机 ====================
    monster.stateT += dt;

    if (monster.state === 'intro') {
      monster.x += 135 * dt;
      monster.y += (Player.y - monster.y) * Math.min(1, dt * 4);
      if (monster.stateT >= monster.stateDur) {
        monster.state = 'chase';
        monster.stateT = 0;
        monster.skillCd = 1.6;
      }
    } else if (monster.state === 'chase') {
      monster.vx = effectiveChaseSpd;
      monster.x += monster.vx * dt;
      var minKeepX = data.camX - 240;
      if (monster.x < minKeepX) monster.x = minKeepX;

      var yDiff = Player.y - monster.y;
      var ySpd = 230 + (diff - 1) * 65;
      monster.vy = Utils.clamp(yDiff * 4.2, -ySpd, ySpd);
      monster.y = Utils.clamp(monster.y + monster.vy * dt, minY, maxY);

      monster.skillCd -= dt;
      if (monster.skillCd <= 0 && gap < 720) {
        var nextSk = this.pickNextSkill(monster, data);
        this.startSkillTelegraph(monster, nextSk, mg);
      }
    } else if (monster.state === 'telegraph') {
      if (monster.skillType === 'lunge') {
        monster.x += (effectiveChaseSpd * 0.66) * dt;
        monster.y += (monster.lungeY - monster.y) * Math.min(1, dt * 13);
      } else {
        monster.x += (effectiveChaseSpd * 0.82) * dt;
        monster.y += (Player.y - monster.y) * Math.min(1, dt * 3.8);
      }
      monster.y = Utils.clamp(monster.y, minY, maxY);

      if (monster.stateT >= monster.stateDur) {
        this.executeSkillAction(monster, mg);
      }
    } else if (monster.state === 'action') {
      if (monster.skillType === 'lunge') {
        monster.x += monster.vx * dt;
        monster.y = monster.lungeY;

        monster.afterimageTimer += dt;
        if (monster.afterimageTimer >= 0.028) {
          monster.afterimageTimer = 0;
          monster.afterimages.push({ x: monster.x, y: monster.y, life: 0.26, maxLife: 0.26 });
        }

        if (monster.x > Player.x + 125) {
          monster.state = 'recover';
          monster.stateT = 0;
          monster.stateDur = 0.50;
        }
      } else {
        monster.x += (effectiveChaseSpd * 0.72) * dt;
      }

      if (monster.state === 'action' && monster.stateT >= monster.stateDur) {
        monster.state = 'recover';
        monster.stateT = 0;
        monster.stateDur = monster.skillType === 'lunge' ? 0.50 : 0.34;
      }
    } else if (monster.state === 'recover') {
      monster.x += (effectiveChaseSpd * 0.58) * dt;
      monster.y += (Player.y - monster.y) * Math.min(1, dt * 3.5);
      monster.y = Utils.clamp(monster.y, minY, maxY);

      if (monster.stateT >= monster.stateDur) {
        monster.state = 'chase';
        monster.stateT = 0;
        monster.skillType = null;
        // 技能间隔随阶段显著收紧：一阶 ~2.0s -> 二阶 ~1.5s -> 三阶/无尽 ~1.15s
        var baseCd = monster.phase === 1 ? 2.05 : (monster.phase === 2 ? 1.52 : 1.18);
        monster.skillCd = Math.max(0.95, baseCd - (diff - 1) * 0.35) + Math.random() * 0.35;
      }
    }

    // ==================== 二阶+ 双技能脱手连携压迫 ====================
    if (monster.phase >= 2 && monster.state !== 'intro') {
      monster.offhandCd -= dt;
      if (monster.offhandCd <= 0) {
        monster.offhandCd = (monster.phase >= 3 ? 3.2 : 4.3) + Math.random() * 1.1;
        // 只在当前同类脱手技不多时叠加，避免视觉糊成一团
        var rOff = Math.random();
        if (rOff < 0.42 && monster.claws.length === 0) {
          this.spawnClaws(monster, mg);
        } else if (rOff < 0.74 && monster.pillars.length === 0 && monster.pillarQueue.length === 0) {
          this.spawnPillars(monster, mg);
        } else if (monster.traps.length <= 2) {
          this.spawnTraps(monster, mg);
        }
      }
    }

    // 常规煞气拖尾粒子
    if (Math.random() < (monster.phase >= 3 ? 0.8 : 0.5)) {
      mg.particles.push({
        x: monster.x - 18 + (Math.random() - 0.5) * 24,
        y: monster.y + (Math.random() - 0.5) * 40,
        vx: -55 - Math.random() * 65,
        vy: (Math.random() - 0.5) * 38,
        size: 3.5 + Math.random() * 4,
        color: monster.phase >= 3 ? (Math.random() < 0.5 ? '#f97316' : '#ef4444') : (Math.random() < 0.6 ? '#ef4444' : '#7c3aed'),
        life: 0.32,
        maxLife: 0.32
      });
    }

    // ==================== 1. 本体碰撞 ====================
    var hitDist = monster.r + (Player.radius || 16) - 4;
    if (Utils.dist(monster.x, monster.y, Player.x, Player.y) <= hitDist) {
      var label = (monster.state === 'action' && monster.skillType === 'lunge') ? '猛冲突袭命中' : '被噬影鬼追上';
      this.checkHitOrGraze(mg, label, '猛冲', 125, true);
    }

    // ==================== 2. 封路斩波更新 ====================
    for (var wi = monster.waves.length - 1; wi >= 0; wi--) {
      var w = monster.waves[wi];
      w.x += w.vx * dt;
      w.life -= dt;

      if (Math.random() < 0.45) {
        mg.particles.push({
          x: w.x - 16,
          y: w.y + (Math.random() - 0.5) * w.halfH * 1.4,
          vx: -70,
          vy: (Math.random() - 0.5) * 40,
          size: 2.5,
          color: '#fb923c',
          life: 0.16,
          maxLife: 0.16
        });
      }

      if (!w.hit) {
        var pr = (Player.radius || 16) - 2;
        if (Math.abs(Player.x - w.x) <= w.halfW + pr && Math.abs(Player.y - w.y) <= w.halfH + pr) {
          if (this.checkHitOrGraze(mg, '封路斩波命中', '斩波', 55, false)) {
            w.hit = true;
            mg.addExplosion(w.x, w.y, '#fb923c', 16);
            monster.waves.splice(wi, 1);
            continue;
          }
        }
      }
      if (w.life <= 0 || w.x > data.camX + CFG.W + 220) {
        monster.waves.splice(wi, 1);
      }
    }

    // ==================== 3. 缚足黑雾陷阱更新 ====================
    var playerInSlowPool = false;
    for (var ti2 = monster.traps.length - 1; ti2 >= 0; ti2--) {
      var tr = monster.traps[ti2];
      tr.pulse += dt * 7;

      if (tr.phase === 'telegraph') {
        tr.telegraphT -= dt;
        if (tr.telegraphT <= 0) {
          tr.phase = 'active';
          tr.burstT = 0.20;
          if (window.SFX) SFX.play('hit');
          mg.addExplosion(tr.x, tr.y, '#a855f7', 20);
        }
      } else {
        tr.activeT -= dt;
        if (tr.burstT > 0) tr.burstT = Math.max(0, tr.burstT - dt);

        var dTrap = Utils.dist(Player.x, Player.y, tr.x, tr.y);
        if (dTrap <= tr.r + (Player.radius || 16) - 4) {
          if (tr.burstT > 0 && !tr.burstHit) {
            if (this.checkHitOrGraze(mg, '黑雾爆裂命中', '黑雾', 55, false)) {
              tr.burstHit = true;
            }
          }
          if (Player.dashT <= 0 && Player.invulnTimer <= 0 && (data.hitInvuln || 0) <= 0 && data.frenzyTimer <= 0) {
            playerInSlowPool = true;
          }
        }
        if (tr.activeT <= 0 || tr.x < data.camX - 180) {
          monster.traps.splice(ti2, 1);
        }
      }
    }
    if (playerInSlowPool) {
      var wasSlowed = (data.slowTimer || 0) > 0;
      data.slowTimer = 0.55;
      if (!wasSlowed && window.FX && FX.floatText) {
        FX.floatText(Player.x, Player.y - 34, '🕸️ 缚足减速！切靶或空格脱身', '#d8b4fe', 1.15);
      }
    }

    // ==================== 4. 墙隙鬼手合杀更新 ====================
    for (var ci = monster.claws.length - 1; ci >= 0; ci--) {
      var cl = monster.claws[ci];
      cl.pulse += dt * 9;

      if (cl.delay > 0) {
        cl.delay -= dt;
        continue;
      }

      if (cl.phase === 'telegraph') {
        cl.telegraphT -= dt;
        if (cl.telegraphT <= 0) {
          cl.phase = 'strike';
          if (window.SFX) SFX.play('swing');
        }
      } else if (cl.phase === 'strike') {
        cl.strikeT -= dt;
        cl.progress = Utils.clamp(1 - cl.strikeT / cl.strikeMax, 0, 1);
        if (cl.strikeT <= 0) {
          cl.phase = 'hold';
          cl.progress = 1;
          var tipY = cl.anchorY + cl.dir * cl.reach;
          if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.22);
          if (window.SFX) SFX.play('hit');
          mg.addExplosion(cl.x, tipY, '#e879f9', 18);
          mg.addExplosion(cl.x, tipY, '#ef4444', 10);

          // 高阶段鬼手重拍时可捏碎手掌里的普通靶子，逼玩家临时换线！
          if (!cl.crushedTarget && monster.phase >= 2 && data.dummies && data.dummies.length > 3) {
            for (var di = data.dummies.length - 1; di >= 0; di--) {
              var dm = data.dummies[di];
              if (!dm.isSpecial && Math.abs(dm.x - cl.x) <= cl.width * 0.65 && Math.abs(dm.y - tipY) <= 46) {
                data.dummies.splice(di, 1);
                cl.crushedTarget = true;
                mg.addExplosion(dm.x, dm.y, '#c084fc', 16);
                if (window.FX && FX.floatText) {
                  FX.floatText(dm.x, dm.y - 20, '🖐️ 鬼手捏碎靶位！', '#f0abfc', 1.1);
                }
                break;
              }
            }
          }
        }
      } else if (cl.phase === 'hold') {
        cl.holdT -= dt;
        if (cl.holdT <= 0) {
          cl.phase = 'retract';
        }
      } else if (cl.phase === 'retract') {
        cl.retractT -= dt;
        cl.progress = Utils.clamp(cl.retractT / cl.retractMax, 0, 1);
        if (cl.retractT <= 0) {
          monster.claws.splice(ci, 1);
          continue;
        }
      }

      // 鬼手伸出拍击 & 停留阶段碰撞判定
      if ((cl.phase === 'strike' && cl.progress > 0.35) || cl.phase === 'hold') {
        var curLen = cl.reach * cl.progress;
        var yStart = Math.min(cl.anchorY, cl.anchorY + cl.dir * curLen);
        var yEnd = Math.max(cl.anchorY, cl.anchorY + cl.dir * curLen);
        var prC = (Player.radius || 16) - 3;
        if (!cl.hitPlayer &&
            Math.abs(Player.x - cl.x) <= cl.width * 0.44 + prC &&
            Player.y >= yStart - prC && Player.y <= yEnd + prC) {
          if (this.checkHitOrGraze(mg, '鬼手合杀命中', '鬼手', 55, false)) {
            cl.hitPlayer = true;
          }
        }
      }

      if (cl.x < data.camX - 220) {
        monster.claws.splice(ci, 1);
      }
    }

    // ==================== 5. 血月业火柱连环追爆更新 ====================
    for (var qi = monster.pillarQueue.length - 1; qi >= 0; qi--) {
      var q = monster.pillarQueue[qi];
      q.wait -= dt;
      if (q.wait <= 0) {
        var px = Player.x + q.leadPx;
        var py = Utils.clamp(Player.y + (Math.random() - 0.5) * 65, ry + 86, ry + CFG.H - 86);
        monster.pillars.push({
          x: px,
          y: py,
          r: 46,
          phase: 'telegraph',
          telegraphT: 0.62,
          telegraphMax: 0.62,
          eruptT: 0.34,
          eruptMax: 0.34,
          fadeT: 0.32,
          fadeMax: 0.32,
          hitPlayer: false,
          rot: Math.random() * Math.PI * 2
        });
        if (window.SFX) SFX.play('click');
        monster.pillarQueue.splice(qi, 1);
      }
    }

    for (var pi = monster.pillars.length - 1; pi >= 0; pi--) {
      var pl = monster.pillars[pi];
      pl.rot += dt * 4.5;
      if (pl.phase === 'telegraph') {
        pl.telegraphT -= dt;
        if (pl.telegraphT <= 0) {
          pl.phase = 'erupt';
          if (window.SFX) SFX.play('lightning');
          if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.24);
          mg.addExplosion(pl.x, pl.y, '#f97316', 24);
          mg.addExplosion(pl.x, pl.y, '#fef08a', 12);
        }
      } else if (pl.phase === 'erupt') {
        pl.eruptT -= dt;
        // 火焰余烬冲天粒子
        if (Math.random() < 0.7) {
          mg.particles.push({
            x: pl.x + (Math.random() - 0.5) * pl.r * 1.4,
            y: pl.y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 40,
            vy: -140 - Math.random() * 140,
            size: 3 + Math.random() * 3,
            color: Math.random() < 0.5 ? '#fde047' : '#ef4444',
            life: 0.28,
            maxLife: 0.28
          });
        }
        if (!pl.hitPlayer && Utils.dist(Player.x, Player.y, pl.x, pl.y) <= pl.r + (Player.radius || 16) - 5) {
          if (this.checkHitOrGraze(mg, '血月业火命中', '业火', 55, false)) {
            pl.hitPlayer = true;
          }
        }
        if (pl.eruptT <= 0) pl.phase = 'fade';
      } else {
        pl.fadeT -= dt;
        if (pl.fadeT <= 0) monster.pillars.splice(pi, 1);
      }
    }

    // ==================== 6. 绯红次元刀网更新 ====================
    for (var li = monster.lattices.length - 1; li >= 0; li--) {
      var lat = monster.lattices[li];
      if (lat.phase === 'telegraph') {
        lat.telegraphT -= dt;
        if (lat.telegraphT <= 0) {
          lat.phase = 'slash';
          if (window.SFX) {
            SFX.play('iai');
            SFX.play('lightning');
          }
          if (window.Main) {
            Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.42);
            Main.screenFlash = 0.22;
            Main.screenFlashColor = '244,63,94';
          }
          for (var si = 0; si < lat.lines.length; si++) {
            var ln = lat.lines[si];
            mg.addExplosion((ln.x1 + ln.x2) / 2, (ln.y1 + ln.y2) / 2, '#f43f5e', 12);
          }
        }
      } else if (lat.phase === 'slash') {
        lat.slashT -= dt;
        if (!lat.hitDone) {
          var hitTol = 13 + (Player.radius || 16) - 3;
          for (var si2 = 0; si2 < lat.lines.length; si2++) {
            var seg = lat.lines[si2];
            if (Utils.distToSegment(Player.x, Player.y, seg.x1, seg.y1, seg.x2, seg.y2) <= hitTol) {
              if (this.checkHitOrGraze(mg, '次元刀网斩裂', '刀网', 45, false)) {
                lat.hitDone = true;
              }
              break;
            }
          }
        }
        if (lat.slashT <= 0) lat.phase = 'fade';
      } else {
        lat.fadeT -= dt;
        if (lat.fadeT <= 0) monster.lattices.splice(li, 1);
      }
    }

    // ==================== 7. 夺路鬼影分身（前后夹击）更新 ====================
    for (var phi = monster.phantoms.length - 1; phi >= 0; phi--) {
      var ph = monster.phantoms[phi];
      ph.t += dt;

      for (var pai = ph.afterimages.length - 1; pai >= 0; pai--) {
        ph.afterimages[pai].life -= dt;
        if (ph.afterimages[pai].life <= 0) ph.afterimages.splice(pai, 1);
      }

      if (ph.phase === 'travel') {
        var u = Utils.clamp(ph.t / ph.travelDur, 0, 1);
        // 抛物线越顶掠过玩家头顶，落到右侧前方
        ph.x = ph.startX + (ph.targetX - ph.startX) * u;
        ph.y = ph.startY + (ph.targetY - ph.startY) * u - Math.sin(u * Math.PI) * 135;
        if (Math.random() < 0.75) {
          mg.particles.push({
            x: ph.x, y: ph.y,
            vx: -30, vy: (Math.random() - 0.5) * 30,
            size: 4, color: '#f43f5e', life: 0.22, maxLife: 0.22
          });
        }
        if (u >= 1) {
          ph.phase = 'telegraph';
          ph.t = 0;
          ph.y = Utils.clamp(Player.y, ry + 82, ry + CFG.H - 82);
          ph.x = Math.max(Player.x + 310, ph.targetX);
          if (window.SFX) SFX.play('parry');
          mg.addExplosion(ph.x, ph.y, '#f43f5e', 18);
        }
      } else if (ph.phase === 'telegraph') {
        // 微微跟随玩家跑动保持在前方蓄力，但锁定 Y 车道让玩家可躲
        ph.x += 130 * dt;
        if (ph.t >= ph.telegraphDur) {
          ph.phase = 'dash';
          ph.t = 0;
          if (window.SFX) {
            SFX.play('iai');
            SFX.play('dash');
          }
          if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.28);
          mg.addExplosion(ph.x, ph.y, '#ef4444', 20);
        }
      } else if (ph.phase === 'dash') {
        ph.x -= ph.dashSpeed * dt;
        ph.afterimages.push({ x: ph.x, y: ph.y, life: 0.2, maxLife: 0.2 });

        if (!ph.hitDone && Utils.dist(Player.x, Player.y, ph.x, ph.y) <= ph.r + (Player.radius || 16) - 2) {
          if (this.checkHitOrGraze(mg, '鬼影分身反斩命中', '分身', 45, false)) {
            ph.hitDone = true;
          }
        }
        if (ph.t >= ph.dashDur || ph.x < data.camX - 120) {
          ph.phase = 'fade';
          ph.t = 0;
        }
      } else {
        if (ph.t >= ph.fadeDur) monster.phantoms.splice(phi, 1);
      }
    }
  },

  // ==================== 地面预警与陷阱层（靶子与玩家下层） ====================
  renderGround: function (ctx, mg) {
    var data = mg.iaijutsuData;
    var monster = data && data.monster;
    if (!monster || monster.banished) return;

    var camX = data.camX || mg.room.worldX;
    var ry = mg.room.worldY;

    // 0. 高能大招瞬间暗化聚焦幕布
    if (monster.dimFlash > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(8, 5, 18, ' + (Math.min(0.42, monster.dimFlash * 0.45)).toFixed(3) + ')';
      ctx.fillRect(camX, ry, CFG.W, CFG.H);
      ctx.restore();
    }

    // 1. 缚足黑雾陷阱
    for (var i = 0; i < monster.traps.length; i++) {
      var tr = monster.traps[i];
      ctx.save();
      if (tr.phase === 'telegraph') {
        var prog = 1 - Math.max(0, tr.telegraphT / tr.telegraphMax);
        ctx.fillStyle = 'rgba(168, 85, 247, ' + (0.14 + prog * 0.24).toFixed(3) + ')';
        ctx.strokeStyle = 'rgba(216, 180, 254, ' + (0.58 + prog * 0.42).toFixed(3) + ')';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(192, 132, 252, 0.36)';
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r * prog, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(244, 114, 182, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tr.x - 14, tr.y); ctx.lineTo(tr.x + 14, tr.y);
        ctx.moveTo(tr.x, tr.y - 14); ctx.lineTo(tr.x, tr.y + 14);
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f5d0fe';
        ctx.fillText('☠ 黑雾', tr.x, tr.y - tr.r - 10);
      } else {
        var fade = Math.min(1, tr.activeT / 0.8);
        var swirl = Math.sin(tr.pulse) * 3.5;
        var grad = ctx.createRadialGradient(tr.x, tr.y, 6, tr.x, tr.y, tr.r + swirl);
        grad.addColorStop(0, 'rgba(88, 28, 135, ' + (0.76 * fade).toFixed(3) + ')');
        grad.addColorStop(0.65, 'rgba(126, 34, 206, ' + (0.48 * fade).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(88, 28, 135, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r + swirl, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = tr.burstT > 0
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(192, 132, 252, ' + (0.68 * fade).toFixed(3) + ')';
        ctx.lineWidth = tr.burstT > 0 ? 4 : 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(233, 213, 255, ' + (0.9 * fade).toFixed(3) + ')';
        ctx.fillText('减速区', tr.x, tr.y);
      }
      ctx.restore();
    }

    // 2. 血月业火柱地面法阵预警
    for (var pi = 0; pi < monster.pillars.length; pi++) {
      var pl = monster.pillars[pi];
      if (pl.phase !== 'telegraph') continue;
      var pProg = 1 - Math.max(0, pl.telegraphT / pl.telegraphMax);
      ctx.save();
      ctx.translate(pl.x, pl.y);

      // 地面血焰外圈
      ctx.fillStyle = 'rgba(239, 68, 68, ' + (0.14 + pProg * 0.28).toFixed(3) + ')';
      ctx.strokeStyle = pProg > 0.75 ? '#fef08a' : '#f97316';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, pl.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 旋转八卦怨灵内阵
      ctx.save();
      ctx.rotate(pl.rot);
      ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.55 + pProg * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      var sq = pl.r * 0.68;
      ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
      ctx.restore();

      // 充能扩散内环
      ctx.fillStyle = 'rgba(251, 146, 60, 0.36)';
      ctx.beginPath();
      ctx.arc(0, 0, pl.r * pProg, 0, Math.PI * 2);
      ctx.fill();

      // 从天而降的引导光束
      ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.25 + pProg * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 2 + pProg * 4;
      ctx.beginPath();
      ctx.moveTo(0, -320);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.restore();
    }

    // 3. 墙隙鬼手地面爪影预警区
    for (var ci = 0; ci < monster.claws.length; ci++) {
      var cl = monster.claws[ci];
      if (cl.delay > 0 || cl.phase !== 'telegraph') continue;
      var cProg = 1 - Math.max(0, cl.telegraphT / cl.telegraphMax);
      var zoneY = cl.side === 'top' ? cl.anchorY : (cl.anchorY - cl.reach);

      ctx.save();
      // 红色长条拍击危险区
      var zGrad = ctx.createLinearGradient(0, cl.anchorY, 0, cl.anchorY + cl.dir * cl.reach);
      zGrad.addColorStop(0, 'rgba(217, 70, 239, ' + (0.34 + cProg * 0.25).toFixed(3) + ')');
      zGrad.addColorStop(1, 'rgba(239, 68, 68, ' + (0.12 + cProg * 0.28).toFixed(3) + ')');
      ctx.fillStyle = zGrad;
      ctx.fillRect(cl.x - cl.width / 2, zoneY, cl.width, cl.reach);

      // 充能进度推进阴影
      var fillLen = cl.reach * cProg;
      var fillY = cl.side === 'top' ? cl.anchorY : (cl.anchorY - fillLen);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.24)';
      ctx.fillRect(cl.x - cl.width / 2, fillY, cl.width, fillLen);

      ctx.strokeStyle = cProg > 0.78 ? '#ffffff' : '#e879f9';
      ctx.lineWidth = cProg > 0.78 ? 2.4 : 1.6;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(cl.x - cl.width / 2, zoneY, cl.width, cl.reach);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 4. 猛冲突袭红色轨道预警
    if (monster.state === 'telegraph' && monster.skillType === 'lunge') {
      var lProg = Utils.clamp(monster.stateT / monster.stateDur, 0, 1);
      var railX = Math.max(monster.x, camX - 20);
      var railW = CFG.W + 180;
      var railH = 66;
      var railY = monster.lungeY - railH / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, ' + (0.16 + lProg * 0.24).toFixed(3) + ')';
      ctx.fillRect(railX, railY, railW, railH);
      ctx.fillStyle = 'rgba(248, 113, 113, ' + (0.28 * lProg).toFixed(3) + ')';
      ctx.fillRect(railX, monster.lungeY - (railH * lProg) / 2, railW, railH * lProg);

      ctx.strokeStyle = lProg > 0.78 ? '#ffffff' : '#ef4444';
      ctx.lineWidth = lProg > 0.78 ? 2.6 : 1.8;
      ctx.beginPath();
      ctx.moveTo(railX, railY); ctx.lineTo(railX + railW, railY);
      ctx.moveTo(railX, railY + railH); ctx.lineTo(railX + railW, railY + railH);
      ctx.stroke();

      var offset = (mg.timer * 260) % 60;
      ctx.strokeStyle = 'rgba(254, 202, 202, 0.8)';
      ctx.lineWidth = 2.2;
      for (var cx = railX + offset; cx < railX + railW; cx += 60) {
        ctx.beginPath();
        ctx.moveTo(cx - 10, monster.lungeY - 12);
        ctx.lineTo(cx + 4, monster.lungeY);
        ctx.lineTo(cx - 10, monster.lungeY + 12);
        ctx.stroke();
      }
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fecaca';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠ 猛冲扑击轨道', Math.max(railX + 18, camX + 26), railY - 10);
      ctx.restore();
    }

    // 5. 封路斩波水平红线预警
    if (monster.state === 'telegraph' && monster.skillType === 'wave' && monster.pendingWaveLanes.length) {
      var wProg = Utils.clamp(monster.stateT / monster.stateDur, 0, 1);
      var wRailX = camX;
      var wRailW = CFG.W + 40;
      var laneH = 54;

      ctx.save();
      for (var li = 0; li < monster.pendingWaveLanes.length; li++) {
        var ly = monster.pendingWaveLanes[li];
        ctx.fillStyle = 'rgba(249, 115, 22, ' + (0.14 + wProg * 0.24).toFixed(3) + ')';
        ctx.fillRect(wRailX, ly - laneH / 2, wRailW, laneH);

        ctx.strokeStyle = wProg > 0.75 ? '#fef08a' : '#fb923c';
        ctx.lineWidth = 2 + wProg * 3;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.moveTo(wRailX, ly);
        ctx.lineTo(wRailX + wRailW, ly);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fed7aa';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔ 斩波封路', camX + 24, ly - laneH / 2 - 10);
      }
      ctx.restore();
    }

    // 6. 夺路鬼影分身反冲预警轨道（向左指！）
    for (var phi = 0; phi < monster.phantoms.length; phi++) {
      var ph = monster.phantoms[phi];
      if (ph.phase !== 'telegraph') continue;
      var phProg = Utils.clamp(ph.t / ph.telegraphDur, 0, 1);
      var pRailH = 58;
      var pRailW = 680;
      var pRailX = ph.x - pRailW;
      var pRailY = ph.y - pRailH / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, ' + (0.14 + phProg * 0.25).toFixed(3) + ')';
      ctx.fillRect(pRailX, pRailY, pRailW, pRailH);

      ctx.strokeStyle = phProg > 0.78 ? '#ffffff' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pRailX, pRailY); ctx.lineTo(ph.x, pRailY);
      ctx.moveTo(pRailX, pRailY + pRailH); ctx.lineTo(ph.x, pRailY + pRailH);
      ctx.stroke();

      // 向左推进警告箭头（<<<）
      var offL = (mg.timer * 260) % 56;
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.85)';
      ctx.lineWidth = 2.2;
      for (var ax = ph.x - 24 - offL; ax > pRailX; ax -= 56) {
        ctx.beginPath();
        ctx.moveTo(ax + 10, ph.y - 11);
        ctx.lineTo(ax - 4, ph.y);
        ctx.lineTo(ax + 10, ph.y + 11);
        ctx.stroke();
      }
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fecdd3';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('<<< 鬼影迎面反冲斩', ph.x - 24, pRailY - 10);
      ctx.restore();
    }
  },

  // ==================== 实体与华丽技能爆发层 ====================
  render: function (ctx, mg) {
    var data = mg.iaijutsuData;
    var monster = data && data.monster;
    if (!monster) return;

    var camX = data.camX || mg.room.worldX;
    var ry = mg.room.worldY;

    // 1. 墙隙鬼手实体渲染（裂缝 + 苍白紫纹巨臂 + 猩红利爪）
    for (var ci = 0; ci < monster.claws.length; ci++) {
      var cl = monster.claws[ci];
      if (cl.delay > 0) continue;
      this._renderSingleClaw(ctx, cl);
    }

    // 2. 血月业火柱爆发柱体
    for (var pi = 0; pi < monster.pillars.length; pi++) {
      var pl = monster.pillars[pi];
      if (pl.phase === 'telegraph') continue;
      var pAlpha = pl.phase === 'erupt' ? 1 : Utils.clamp(pl.fadeT / pl.fadeMax, 0, 1);
      var colW = pl.r * (pl.phase === 'erupt' ? (1.0 + Math.sin(mg.timer * 40) * 0.08) : (0.7 * pAlpha));
      ctx.save();
      ctx.globalAlpha = pAlpha;

      // 冲天绯红外焰柱
      var pGrad = ctx.createLinearGradient(pl.x - colW, 0, pl.x + colW, 0);
      pGrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
      pGrad.addColorStop(0.22, 'rgba(239, 68, 68, 0.82)');
      pGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.96)');
      pGrad.addColorStop(0.78, 'rgba(239, 68, 68, 0.82)');
      pGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = pGrad;
      ctx.fillRect(pl.x - colW, ry + 26, colW * 2, CFG.H - 52);

      // 底部火环爆散
      var ringGrad = ctx.createRadialGradient(pl.x, pl.y, 4, pl.x, pl.y, pl.r * 1.35);
      ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      ringGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.75)');
      ringGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. 绯红次元刀网（交叉预警激光 + 爆裂白红空间裂痕）
    for (var li = 0; li < monster.lattices.length; li++) {
      var lat = monster.lattices[li];
      ctx.save();
      ctx.lineCap = 'round';
      for (var si = 0; si < lat.lines.length; si++) {
        var seg = lat.lines[si];
        if (lat.phase === 'telegraph') {
          var tProg = 1 - Math.max(0, lat.telegraphT / lat.telegraphMax);
          var flash = tProg > 0.78;
          ctx.strokeStyle = flash ? 'rgba(255, 255, 255, 0.95)' : 'rgba(244, 63, 94, ' + (0.45 + tProg * 0.55).toFixed(3) + ')';
          ctx.lineWidth = flash ? 4 : (1.5 + tProg * 3);
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = flash ? 18 : 8;
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        } else {
          var sAlpha = lat.phase === 'slash' ? 1 : Utils.clamp(lat.fadeT / lat.fadeMax, 0, 1);
          ctx.globalAlpha = sAlpha;
          // 外层猩红刀气光带
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = lat.phase === 'slash' ? 22 : (14 * sAlpha);
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();

          // 中层炽白斩痕核心
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = lat.phase === 'slash' ? 8 : (4 * sAlpha);
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();

          // 极细黑色次元裂隙线
          if (lat.phase === 'slash') {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#09040f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 4. 飞行封路月牙斩波
    for (var wi = 0; wi < monster.waves.length; wi++) {
      var w = monster.waves[wi];
      ctx.save();
      ctx.translate(w.x, w.y);
      var tailGrad = ctx.createLinearGradient(-76, 0, 20, 0);
      tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      tailGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.62)');
      tailGrad.addColorStop(1, 'rgba(254, 240, 138, 0.98)');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.quadraticCurveTo(0, -w.halfH, -72, -w.halfH * 0.55);
      ctx.lineTo(-42, 0);
      ctx.lineTo(-72, w.halfH * 0.55);
      ctx.quadraticCurveTo(0, w.halfH, 24, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-6, 0, w.halfH + 2, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.restore();
    }

    // 5. 夺路鬼影分身渲染
    for (var phi = 0; phi < monster.phantoms.length; phi++) {
      var ph = monster.phantoms[phi];
      this._renderPhantom(ctx, ph, mg.timer);
    }

    // 6. 猛冲残影
    for (var ai = 0; ai < monster.afterimages.length; ai++) {
      var img = monster.afterimages[ai];
      var a = (img.life / img.maxLife) * 0.52;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(img.x, img.y, monster.r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. 追猎恶鬼本体（三阶段进化特效：二阶鬼面法轮、三阶业火双翼）
    var banishAlpha = monster.banished ? Math.max(0, 1 - monster.banishT * 1.4) : 1;
    if (banishAlpha > 0.01) {
      this._renderBossBody(ctx, monster, banishAlpha, mg.timer);
    }

    // 8. 左侧近身压迫暗角与距离提示
    if (!monster.banished) {
      var gapPx = Math.max(0, Player.x - monster.x);
      var gapM = Math.max(0, Math.round(gapPx / 10));

      if (gapPx < 220) {
        var dangerRatio = Utils.clamp(1 - gapPx / 220, 0, 1);
        var beat = 0.65 + 0.35 * Math.sin(mg.timer * 12);
        ctx.save();
        var edgeGrad = ctx.createLinearGradient(camX, 0, camX + 150, 0);
        edgeGrad.addColorStop(0, 'rgba(220, 38, 38, ' + (0.42 * dangerRatio * beat).toFixed(3) + ')');
        edgeGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(camX, ry, 150, CFG.H);
        ctx.restore();
      }

      if (monster.x < camX + 24) {
        var indY = Utils.clamp(monster.y, ry + 96, ry + CFG.H - 76);
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = gapPx < 220 ? '#ef4444' : '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(camX + 14, indY - 18, 86, 36, 8);
        else ctx.rect(camX + 14, indY - 18, 86, 36);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fecaca';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👹 距 ' + gapM + 'm', camX + 57, indY);
        ctx.restore();
      }
    }
  },

  // 绘制单只从上下墙缝撕裂伸出的巨型鬼手
  _renderSingleClaw: function (ctx, cl) {
    ctx.save();
    var dir = cl.dir;
    var ax = cl.x;
    var ay = cl.anchorY;

    // 墙沿怨气裂缝
    ctx.fillStyle = '#09030f';
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#c026d3';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(ax, ay, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (cl.phase === 'telegraph') {
      // 预警期：五根猩红鬼指先探出墙沿扣住边缘，微微发颤
      var tremble = Math.sin(cl.pulse * 3) * 2.5;
      var peekLen = 22 + (1 - cl.telegraphT / cl.telegraphMax) * 16;
      for (var fi = -2; fi <= 2; fi++) {
        var fx = ax + fi * 13 + tremble;
        ctx.fillStyle = '#e9d5ff';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(fx - 4, ay);
        ctx.lineTo(fx, ay + dir * (peekLen + (2 - Math.abs(fi)) * 5));
        ctx.lineTo(fx + 4, ay);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // 拍击 / 停留 / 缩回：苍白暗紫手臂 + 猩红符纹 + 巨型鬼掌利爪
    var curLen = cl.reach * cl.progress;
    var palmY = ay + dir * Math.max(14, curLen - 24);

    // 鬼臂
    var armGrad = ctx.createLinearGradient(0, ay, 0, palmY);
    armGrad.addColorStop(0, '#1e0b2e');
    armGrad.addColorStop(0.55, '#4c1d95');
    armGrad.addColorStop(1, '#c4b5fd');
    ctx.fillStyle = armGrad;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ax - 24, ay);
    ctx.lineTo(ax - 18, palmY);
    ctx.lineTo(ax + 18, palmY);
    ctx.lineTo(ax + 24, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 手臂发光符文锁链纹
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 12, ay + dir * curLen * 0.25);
    ctx.lineTo(ax + 12, ay + dir * curLen * 0.45);
    ctx.moveTo(ax + 12, ay + dir * curLen * 0.25);
    ctx.lineTo(ax - 12, ay + dir * curLen * 0.45);
    ctx.stroke();

    // 巨掌核心
    ctx.fillStyle = '#ede9fe';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(ax, palmY, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 掌心鬼眼
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(ax, palmY, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(ax, palmY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // 五根弯钩尖锐鬼爪
    var clawSpread = [-26, -13, 0, 13, 26];
    for (var k = 0; k < 5; k++) {
      var bx = ax + clawSpread[k];
      var extra = (k === 2 ? 32 : (k === 1 || k === 3 ? 28 : 22));
      ctx.fillStyle = '#fda4af';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - 5, palmY + dir * 8);
      ctx.quadraticCurveTo(bx + (k - 2) * 3, palmY + dir * (extra * 0.7), bx + (k - 2) * 1.5, palmY + dir * extra);
      ctx.lineTo(bx + 5, palmY + dir * 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  },

  // 绘制夺路鬼影分身（朝左迎面反冲！）
  _renderPhantom: function (ctx, ph, timer) {
    var alpha = ph.phase === 'fade' ? Utils.clamp(1 - ph.t / ph.fadeDur, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;

    // 冲刺残影
    for (var i = 0; i < ph.afterimages.length; i++) {
      var img = ph.afterimages[i];
      ctx.save();
      ctx.globalAlpha = (img.life / img.maxLife) * 0.45 * alpha;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(img.x, img.y, ph.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (ph.phase === 'travel') {
      // 越顶黑红彗星光球
      var g = ctx.createRadialGradient(ph.x, ph.y, 4, ph.x, ph.y, 34);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, '#f43f5e');
      g.addColorStop(1, 'rgba(124, 58, 237, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ph.x, ph.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 鬼影武士分身本体（朝左）
    ctx.translate(ph.x, ph.y);
    ctx.fillStyle = 'rgba(24, 9, 28, 0.92)';
    ctx.strokeStyle = ph.phase === 'dash' ? '#fef08a' : '#f43f5e';
    ctx.lineWidth = 2.8;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, ph.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 朝左双鬼眼
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-10, -5, 5.5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-20, -3, 4.5, 2.5, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // 拔刀血色弧光（冲刺中）
    if (ph.phase === 'dash') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(8, 0, ph.r + 18, Math.PI * 0.65, Math.PI * 1.35);
      ctx.stroke();
    } else if (ph.phase === 'telegraph') {
      var pr = Utils.clamp(ph.t / ph.telegraphDur, 0, 1);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ph.r + 9, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  },

  // 绘制进化版噬影鬼本体（二阶鬼面法轮 + 三阶燃烧业火双翼）
  _renderBossBody: function (ctx, monster, banishAlpha, timer) {
    ctx.save();
    ctx.globalAlpha = banishAlpha;
    var bob = Math.sin(monster.pulse) * 4;
    var lean = (monster.state === 'action' && monster.skillType === 'lunge') ? 0.25 : 0.1;
    ctx.translate(monster.x, monster.y + bob);
    ctx.rotate(lean);

    // 三阶觉醒：燃烧绯红业火双翼
    if (monster.phase >= 3) {
      var flap = Math.sin(timer * 14) * 14;
      ctx.save();
      var wingGrad = ctx.createLinearGradient(-10, -80, -90, 80);
      wingGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      wingGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.72)');
      wingGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = wingGrad;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 20;
      // 上翼
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.quadraticCurveTo(-55, -72 - flap, -98, -44 - flap * 0.6);
      ctx.quadraticCurveTo(-54, -22, -16, 4);
      ctx.closePath();
      ctx.fill();
      // 下翼
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.quadraticCurveTo(-55, 72 + flap, -98, 44 + flap * 0.6);
      ctx.quadraticCurveTo(-54, 22, -16, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 二阶及以上：旋转血月鬼面法轮
    if (monster.phase >= 2) {
      ctx.save();
      ctx.rotate(timer * 2.2);
      ctx.strokeStyle = monster.phase >= 3 ? 'rgba(253, 224, 71, 0.75)' : 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, monster.r + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var oi = 0; oi < 4; oi++) {
        var oa = (Math.PI / 2) * oi;
        ctx.fillStyle = monster.phase >= 3 ? '#fde047' : '#fb7185';
        ctx.beginPath();
        ctx.arc(Math.cos(oa) * (monster.r + 18), Math.sin(oa) * (monster.r + 18), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 外围血色煞气光环
    var auraR = monster.r + (monster.phase >= 3 ? 32 : 24) + Math.sin(monster.pulse * 1.4) * 5;
    var auraGrad = ctx.createRadialGradient(0, 0, monster.r * 0.3, 0, 0, auraR);
    auraGrad.addColorStop(0, monster.phase >= 3 ? 'rgba(249, 115, 22, 0.68)' : 'rgba(239, 68, 68, 0.6)');
    auraGrad.addColorStop(0.55, 'rgba(124, 58, 237, 0.36)');
    auraGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 飘动暗红妖气丝带
    ctx.strokeStyle = monster.phase >= 3 ? 'rgba(251, 146, 60, 0.82)' : 'rgba(244, 63, 94, 0.74)';
    ctx.lineWidth = 4;
    for (var ri = -1; ri <= 1; ri++) {
      var rWave = Math.sin(monster.pulse * 1.3 + ri * 1.8) * 11;
      ctx.beginPath();
      ctx.moveTo(-12, ri * 14);
      ctx.quadraticCurveTo(-40, ri * 18 + rWave, -72, ri * 12 - rWave * 0.6);
      ctx.stroke();
    }

    // 躯干与暗甲轮廓
    ctx.fillStyle = '#1a0b1c';
    ctx.strokeStyle = monster.state === 'telegraph' ? '#fde047' : (monster.phase >= 3 ? '#fb923c' : '#f43f5e');
    ctx.lineWidth = monster.state === 'telegraph' ? 3.8 : 2.8;
    ctx.shadowColor = monster.phase >= 3 ? '#f97316' : '#ef4444';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, monster.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 恶鬼双角
    ctx.fillStyle = monster.phase >= 3 ? '#fde047' : '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(-10, -monster.r + 4);
    ctx.lineTo(-24, -monster.r - 20);
    ctx.lineTo(2, -monster.r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -monster.r + 4);
    ctx.lineTo(26, -monster.r - 18);
    ctx.lineTo(18, -monster.r + 8);
    ctx.closePath();
    ctx.fill();

    // 赤金鬼眼
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#fef08a';
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(9, -6, 6.5, 3.6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(21, -4, 5.2, 3.1, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 锯齿獠牙嘴纹
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(4, 11);
    ctx.lineTo(10, 8);
    ctx.lineTo(15, 13);
    ctx.lineTo(20, 8);
    ctx.lineTo(25, 12);
    ctx.stroke();

    // 蓄力环
    if (monster.state === 'telegraph') {
      var tProg = Utils.clamp(monster.stateT / monster.stateDur, 0, 1);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, monster.r + 11, -Math.PI / 2, -Math.PI / 2 + tProg * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};
