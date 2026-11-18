// ============================================================================
// 居合斩专属模块 · 无我绝杀奥义系统 (Iaijutsu Ultimate Arts System)
// 包含 5 大各具灵魂的真正全自动绝杀流派 + 1 个随机觉醒选项
// ============================================================================

window.IaijutsuUltimates = {
  // 6 大奥义选项定义
  LIST: [
    {
      id: 'classic',
      name: '经典·瞬影断空斩',
      emoji: '🗡️',
      tag: '极速穿影',
      tagBg: '#0284c7',
      reqCombo: 0,
      desc: '原版经典绝杀！全自动超音速连环瞬身穿刺，以残影剑光在全场靶位间极速穿梭，收鞘时引发【万象归寂破】超广域能量冲击波肃清全场。',
      bannerText: '🌌 【无我·瞬影断空】开启！5秒绝杀瞬影！',
      bannerSub: '疾风破空 · 万物皆斩',
      themeColor: '#38bdf8'
    },
    {
      id: 'timestop',
      name: '奥义·时空断裂',
      emoji: '⏳',
      tag: '时停裂隙',
      tagBg: '#9333ea',
      reqCombo: 25,
      desc: '全场瞬间进入黑白水墨负片反色滤镜，时间完全冻结（Bullet-time 99% 减速）！全屏 5 道幻影残影纵横交错在靶间拉出立体空间裂缝，5 秒后伴随清脆纳刀归鞘「咔嚓」声，全场所有裂缝同时二次大引爆！',
      bannerText: '⏳ 【奥义·时空断裂】降临！水墨负片·全屏时停裂隙！',
      bannerSub: '一瞬即永恒 · 纳刀归鞘同爆',
      themeColor: '#c084fc'
    },
    {
      id: 'blades',
      name: '奥义·万剑归宗',
      emoji: '✨',
      tag: '万剑倾泻',
      tagBg: '#ca8a04',
      reqCombo: 40,
      desc: '身后张开高速旋转的双层太极八卦剑阵！唤出轩辕圣剑、青霜龙渊、离火赤霄、太虚秋水、紫霄神雷 5 种不同流光飞剑，划出优美追踪弧线如暴雨般漫天倾泻洗礼，全场寸草不生！',
      bannerText: '✨ 【奥义·万剑归宗】觉醒！五色神剑·漫天暴雨！',
      bannerSub: '以气御剑 · 铺天盖地',
      themeColor: '#facc15'
    },
    {
      id: 'asura',
      name: '奥义·业火阿修罗',
      emoji: '🔥',
      tag: '修罗火龙卷',
      tagBg: '#dc2626',
      reqCombo: 55,
      desc: '地面撕裂出滚滚浓烟与岩浆流动的真实焦黑熔岩裂谷！主角化作高速自旋的修罗烈火陀螺（大风车风暴），在靶群中狂暴席卷碾压，并向四周疯狂甩出弯月业火飞刃！',
      bannerText: '🔥 【奥义·业火阿修罗】苏醒！焦土熔岩·修罗风暴火陀螺！',
      bannerSub: '战鼓雷动 · 焦土焚天',
      themeColor: '#f87171'
    },
    {
      id: 'thunder',
      name: '奥义·天眼雷殛',
      emoji: '⚡',
      tag: '雷尊召雷',
      tagBg: '#7c3aed',
      reqCombo: 70,
      desc: '主角傲立原地不动，脚下张开九天雷尊八卦召雷法阵，双手千鸟雷芒电弧激荡！苍穹之上疯狂降下粗壮紫金天罚落雷轰顶狂劈靶子，并生成狂暴高压连锁闪电网席卷全场！',
      bannerText: '⚡ 【奥义·天眼雷殛】天威！雷尊结印·苍穹落雷电网！',
      bannerSub: '天眼开阖 · 劫雷诛灭',
      themeColor: '#a855f7'
    },
    {
      id: 'random',
      name: '🎲 随机觉醒奥义',
      emoji: '🎲',
      tag: '天机命定',
      tagBg: '#ec4899',
      reqCombo: 0,
      desc: '每次释放「无我」时，自动从上述五大各具特色的绝杀奥义中随机觉醒一种！附带专属流派宣告横幅，让每一次出鞘都充满全新震撼！',
      bannerText: '🎲 随机觉醒：领悟心流奥义！',
      bannerSub: '千变万化 · 随心而斩',
      themeColor: '#f472b6'
    }
  ],

  // 获取当前装备的无我奥义 ID
  getEquippedUltimateId: function () {
    try {
      var saved = localStorage.getItem('iaijutsu_equipped_ult');
      if (saved) return saved;
    } catch (e) {}
    return 'classic';
  },

  // 获取当前装备的无我奥义配置对象
  getEquippedUltimate: function () {
    var id = this.getEquippedUltimateId();
    for (var i = 0; i < this.LIST.length; i++) {
      if (this.LIST[i].id === id) return this.LIST[i];
    }
    return this.LIST[0];
  },

  // 装备无我奥义
  setEquippedUltimate: function (ultId, highScore) {
    var item = null;
    for (var i = 0; i < this.LIST.length; i++) {
      if (this.LIST[i].id === ultId) { item = this.LIST[i]; break; }
    }
    if (!item) return false;
    var high = highScore !== undefined ? highScore : 0;
    if (high < item.reqCombo) return false;
    try {
      localStorage.setItem('iaijutsu_equipped_ult', ultId);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 彻底清理所有大招遗留特效实体（保证无我结束后绝对没有任何残留！）
   */
  cleanup: function (mg) {
    if (!mg || !mg.iaijutsuData) return;
    var data = mg.iaijutsuData;
    if (data.ultCustomData) {
      data.ultCustomData.cracks = [];
      data.ultCustomData.clones = [];
      data.ultCustomData.swords = [];
      data.ultCustomData.scorchedEarth = [];
      data.ultCustomData.fireWalls = [];
      data.ultCustomData.flameBlades = [];
      data.ultCustomData.lightningStrikes = [];
      data.ultCustomData.electricChains = [];
      data.ultCustomData.spinAngle = 0;
      data.ultCustomData.wheelAngle = 0;
      data.ultCustomData.time = 0;
    }
  },

  /**
   * 触发释放无我大招（全自动开局）
   */
  trigger: function (mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    // 先做一次深度清理，避免上一轮特效遗留
    this.cleanup(mg);

    var equipped = this.getEquippedUltimate();
    var actualId = equipped.id;
    var isRandom = (actualId === 'random');

    // 随机觉醒：从前 5 个正式大招流派中随机抽取
    if (isRandom) {
      var pool = ['classic', 'timestop', 'blades', 'asura', 'thunder'];
      actualId = pool[Math.floor(Math.random() * pool.length)];
    }

    var activeDef = null;
    for (var i = 0; i < this.LIST.length; i++) {
      if (this.LIST[i].id === actualId) { activeDef = this.LIST[i]; break; }
    }
    if (!activeDef) activeDef = this.LIST[0];

    // 初始化奥义状态
    data.activeUltId = actualId;
    data.activeUltDef = activeDef;
    data.ultimateCharge = 0;
    data.ultimateTimer = data.ultimateMaxTimer || 5.0;
    data.ultimateHits = 0;
    data.ultimateNextSlashTime = 0;
    data.ultimatePauseTimer = 0;
    data.finisherRespawnTimer = 0;
    data.finisherWaves = [];

    // 初始化各流派专属数据
    data.ultCustomData = {
      activeId: actualId,
      time: 0,
      // 时停：多维空间碎裂裂痕与 5 道半透明主角分身
      cracks: [],
      clones: [
        { x: Player.x - 50, y: Player.y - 30, angle: -0.5, timer: 0.02, slashT: 0 },
        { x: Player.x + 50, y: Player.y - 30, angle: 0.5, timer: 0.06, slashT: 0 },
        { x: Player.x - 60, y: Player.y + 35, angle: -2.4, timer: 0.10, slashT: 0 },
        { x: Player.x + 60, y: Player.y + 35, angle: 2.4, timer: 0.14, slashT: 0 },
        { x: Player.x,      y: Player.y - 65, angle: -1.57, timer: 0.18, slashT: 0 }
      ],
      // 万剑归宗：双层旋转八卦太极剑盘与直贯全场穿透金光神剑
      swords: [],
      wheelAngle: 0,
      // 业火阿修罗：焦土熔岩地壳、修罗自旋陀螺角度与业火弯月刃
      scorchedEarth: [],
      fireWalls: [],
      flameBlades: [],
      spinAngle: 0,
      asuraTargetX: Player.x,
      asuraTargetY: Player.y,
      // 天眼雷殛：主角固定坐标、天威神雷轰顶与高压闪电网
      anchorX: Player.x,
      anchorY: Player.y,
      lightningStrikes: [],
      electricChains: []
    };

    // 音效与画面剧烈震荡
    if (window.SFX) {
      SFX.play('victory');
      SFX.play('lightning');
      if (actualId === 'timestop') SFX.play('portal');
      else if (actualId === 'blades') SFX.play('shoot');
      else if (actualId === 'asura') SFX.play('flame');
      else if (actualId === 'thunder') SFX.play('lightning');
    }
    if (window.Main) {
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.75);
    }

    // 显示专属震撼横幅
    data.bannerTimer = 3.8;
    if (isRandom) {
      data.bannerText = '🎲 随机觉醒：【' + activeDef.name + '】！';
      data.bannerSub = activeDef.bannerSub || '天机命定 · 极意出鞘';
    } else {
      data.bannerText = activeDef.bannerText;
      data.bannerSub = activeDef.bannerSub;
    }

    // 瞬间在全图铺满 16 个靶位供全自动暴风雨收割
    if (window.IaijutsuMode && IaijutsuMode.spawnDummies) {
      IaijutsuMode.spawnDummies(16, mg);
    }
  },

  /**
   * 全自动无我大招主循环更新
   */
  update: function (dt, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;

    var ultId = data.activeUltId || 'classic';
    var custom = data.ultCustomData;
    if (!custom) custom = data.ultCustomData = {};
    custom.time = (custom.time || 0) + dt;

    // 阶段 1：5 秒全自动灭世大招进行中
    if (data.ultimateTimer > 0) {
      data.ultimateTimer -= dt;
      Player.skillTimers[1] = 0;
      Player.invulnTimer = Math.max(Player.invulnTimer, 0.4);

      // 保证场上有充裕的目标供连续收割
      if (data.dummies.length < 8 && window.IaijutsuMode && IaijutsuMode.spawnDummies) {
        IaijutsuMode.spawnDummies(10, mg);
      }

      // 执行对应流派的全自动演武
      if (ultId === 'classic') {
        this._updateClassic(dt, mg, data, custom);
      } else if (ultId === 'timestop') {
        this._updateTimestop(dt, mg, data, custom);
      } else if (ultId === 'blades') {
        this._updateBlades(dt, mg, data, custom);
      } else if (ultId === 'asura') {
        this._updateAsura(dt, mg, data, custom);
      } else if (ultId === 'thunder') {
        this._updateThunder(dt, mg, data, custom);
      }

      // 5 秒时间耗尽：进入收刀纳刀屏息停顿
      if (data.ultimateTimer <= 0) {
        data.ultimateTimer = 0;
        data.ultimatePauseTimer = (ultId === 'timestop') ? 0.45 : 0.36;
        Player.vx = 0;
        Player.vy = 0;
        Player.invulnTimer = Math.max(Player.invulnTimer, 0.8);

        // 清脆的归鞘（咔嚓）音效
        if (window.SFX) {
          SFX.play('parry');
          SFX.play('iai');
        }

        var closeMsg = '⚔️ 居合·归鞘屏息...';
        if (ultId === 'timestop') closeMsg = '⚔️ 纳刀·归鞘「咔嚓」！虚空裂缝引爆！';
        else if (ultId === 'blades') closeMsg = '✨ 万剑凝宗·神剑诛仙！';
        else if (ultId === 'asura') closeMsg = '🔥 修罗聚火·红莲断岳！';
        else if (ultId === 'thunder') closeMsg = '⚡ 九天劫雷·天罚合璧！';

        if (window.FX && FX.floatText) {
          FX.floatText(Player.x, Player.y - 45, closeMsg, '#fef08a', 0.6);
        }
      }
    }

    // 阶段 2：收刀纳刀屏息蓄力中（0.36s~0.45s）
    if (data.ultimatePauseTimer > 0) {
      data.ultimatePauseTimer -= dt;
      Player.vx = 0;
      Player.vy = 0;
      Player.invulnTimer = Math.max(Player.invulnTimer, 0.6);

      // 向主角身体核心强力收拢能量微粒
      if (Math.random() < 0.85) {
        var cAng = Math.random() * Math.PI * 2;
        var cDist = 45 + Math.random() * 85;
        var pColor = '#fde047';
        if (ultId === 'timestop') pColor = '#c084fc';
        else if (ultId === 'blades') pColor = '#facc15';
        else if (ultId === 'asura') pColor = '#ff4500';
        else if (ultId === 'thunder') pColor = '#a855f7';

        mg.particles.push({
          type: 'spark',
          x: Player.x + Math.cos(cAng) * cDist,
          y: Player.y + Math.sin(cAng) * cDist,
          vx: -Math.cos(cAng) * (cDist / 0.32),
          vy: -Math.sin(cAng) * (cDist / 0.32),
          color: pColor,
          size: 3.5,
          rot: 0,
          vRot: 0,
          life: 0.28,
          maxLife: 0.28
        });
      }

      // 屏息结束：引爆终焉全域荡平爆发！
      if (data.ultimatePauseTimer <= 0) {
        data.ultimatePauseTimer = 0;
        this._triggerFinisherBurst(mg, data, ultId, custom);
      }
    }

    // 阶段 3：终焉全域冲击波扩散消灭目标
    if (data.finisherWaves && data.finisherWaves.length > 0) {
      for (var fwi = data.finisherWaves.length - 1; fwi >= 0; fwi--) {
        var fWave = data.finisherWaves[fwi];
        fWave.r += fWave.speed * dt;
        fWave.life -= dt;

        for (var fdi = data.dummies.length - 1; fdi >= 0; fdi--) {
          var fDm = data.dummies[fdi];
          var distToWave = Utils.dist(fWave.x, fWave.y, fDm.x, fDm.y);
          if (distToWave <= fWave.r + 50) {
            fWave.clearedCount++;
            data.dummies.splice(fdi, 1);
            var fHitAng = Math.atan2(fDm.y - fWave.y, fDm.x - fWave.x);
            if (window.IaijutsuMode && IaijutsuMode.onKill) {
              IaijutsuMode.onKill(fDm, true, fHitAng, mg);
            }
          }
        }

        if (fWave.life <= 0 || fWave.r >= fWave.maxR) {
          data.finisherWaves.splice(fwi, 1);
        }
      }

      // 冲击波结束后，执行彻底清理，确保不留任何残影/裂缝/火海/闪电！
      if (data.finisherWaves.length === 0) {
        this.cleanup(mg);
      }
    }

    // 阶段 4：清屏后准时重新生成常态靶子
    if (data.finisherRespawnTimer > 0) {
      data.finisherRespawnTimer -= dt;
      if (data.finisherRespawnTimer <= 0) {
        data.finisherRespawnTimer = 0;
        if (data.dummies.length < 5 && window.IaijutsuMode && IaijutsuMode.spawnDummies) {
          IaijutsuMode.spawnDummies(6, mg);
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // 流派 1：经典·瞬影断空斩 (全自动极速穿行)
  // --------------------------------------------------------------------------
  _updateClassic: function (dt, mg, data, custom) {
    data.ultimateNextSlashTime -= dt;
    if (data.ultimateNextSlashTime <= 0) {
      data.ultimateNextSlashTime = 0.082;
      if (data.dummies.length > 0) {
        var bestIdx = -1;
        var maxDist = -1;
        for (var i = 0; i < data.dummies.length; i++) {
          var dDist = Utils.dist(Player.x, Player.y, data.dummies[i].x, data.dummies[i].y);
          if (dDist > maxDist) { maxDist = dDist; bestIdx = i; }
        }
        if (bestIdx >= 0) {
          var targetDm = data.dummies[bestIdx];
          var startX = Player.x, startY = Player.y;
          var targetX = targetDm.x, targetY = targetDm.y;
          var slashAngle = Math.atan2(targetY - startY, targetX - startX);

          Player.x = targetX;
          Player.y = targetY;
          Player.vx = 0; Player.vy = 0;
          Player.aimAngle = slashAngle;
          Player.swingAngle = slashAngle;
          Player.swingT = 0.12;

          for (var uKill = data.dummies.length - 1; uKill >= 0; uKill--) {
            var hDm = data.dummies[uKill];
            var isDirect = (hDm === targetDm);
            var distLine = Utils.distToSegment(hDm.x, hDm.y, startX, startY, targetX, targetY);
            if (isDirect || distLine <= hDm.r + 35) {
              data.ultimateHits++;
              data.dummies.splice(uKill, 1);
              if (window.IaijutsuMode) IaijutsuMode.onKill(hDm, true, slashAngle, mg);
            }
          }

          var uSkin = window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null;
          if (window.IaijutsuFX) {
            window.IaijutsuFX.playSkinSlashFx(mg.particles, startX, startY, targetX, targetY, slashAngle, uSkin);
          }
          if (window.SFX) SFX.play('iai');
          if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.26);
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // 流派 2：奥义·时空断裂 (水墨负片反色、99%时停、5道半透明主角分身交错斩击、空间多维碎裂)
  // --------------------------------------------------------------------------
  _updateTimestop: function (dt, mg, data, custom) {
    if (!custom.cracks) custom.cracks = [];
    if (!custom.clones) custom.clones = [];

    // 时间完全冻结：所有木桩静止悬空（速度归零，计时器停止）
    for (var di = 0; di < data.dummies.length; di++) {
      data.dummies[di].vx = 0;
      data.dummies[di].vy = 0;
    }

    // 主角自身居中悬空纳刀凝神
    Player.vx = 0; Player.vy = 0;

    // 更新空间裂痕寿命
    for (var cri = custom.cracks.length - 1; cri >= 0; cri--) {
      custom.cracks[cri].life -= dt;
      if (custom.cracks[cri].life <= 0) custom.cracks.splice(cri, 1);
    }

    // 5 道半透明主角分身全场纵横交错穿梭
    for (var ci = 0; ci < custom.clones.length; ci++) {
      var clone = custom.clones[ci];
      clone.timer -= dt;
      if (clone.slashT > 0) clone.slashT -= dt;

      if (clone.timer <= 0 && data.dummies.length > 0) {
        clone.timer = 0.08 + Math.random() * 0.04;

        var targetDm = data.dummies[Math.floor(Math.random() * data.dummies.length)];
        if (targetDm) {
          var sx = clone.x, sy = clone.y;
          var tx = targetDm.x, ty = targetDm.y;
          var sAng = Math.atan2(ty - sy, tx - sx);
          var dist = Utils.dist(sx, sy, tx, ty);

          // 生成真正的多维空间碎裂结构：锯齿主折线 + 枝桠裂纹 + 虚空狭缝
          var segments = [];
          var numPts = 5;
          var nx = -(ty - sy) / (dist || 1);
          var ny = (tx - sx) / (dist || 1);
          segments.push({ x: sx, y: sy });
          for (var pi = 1; pi < numPts; pi++) {
            var ratio = pi / numPts;
            var px = sx + (tx - sx) * ratio;
            var py = sy + (ty - sy) * ratio;
            var offset = (Math.random() - 0.5) * Math.min(26, dist * 0.22);
            segments.push({ x: px + nx * offset, y: py + ny * offset });
          }
          segments.push({ x: tx, y: ty });

          // 2~3 根向外蔓延的时空碎镜分叉
          var branches = [];
          for (var bi = 1; bi < segments.length - 1; bi++) {
            if (Math.random() < 0.7) {
              var basePt = segments[bi];
              var bLen = 10 + Math.random() * 18;
              var bAng = sAng + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.7);
              branches.push({
                x0: basePt.x, y0: basePt.y,
                x1: basePt.x + Math.cos(bAng) * bLen,
                y1: basePt.y + Math.sin(bAng) * bLen
              });
            }
          }

          // 2 块微型漂浮碎晶
          var shards = [];
          for (var shi = 0; shi < 2; shi++) {
            var sRatio = 0.2 + Math.random() * 0.6;
            shards.push({
              x: sx + (tx - sx) * sRatio + nx * ((Math.random() - 0.5) * 18),
              y: sy + (ty - sy) * sRatio + ny * ((Math.random() - 0.5) * 18),
              size: 2.2 + Math.random() * 3.0,
              rot: Math.random() * Math.PI
            });
          }

          custom.cracks.push({
            segments: segments,
            branches: branches,
            shards: shards,
            midX: (sx + tx) / 2 + nx * ((Math.random() - 0.5) * 12),
            midY: (sy + ty) / 2 + ny * ((Math.random() - 0.5) * 12),
            life: 4.5,
            maxLife: 4.5
          });

          // 瞬移主角分身并摆出居合斩姿
          clone.x = tx;
          clone.y = ty;
          clone.angle = sAng;
          clone.slashT = 0.22;

          // 斩杀命中的靶子
          for (var k = data.dummies.length - 1; k >= 0; k--) {
            var dm = data.dummies[k];
            if (dm === targetDm || Utils.distToSegment(dm.x, dm.y, sx, sy, tx, ty) <= dm.r + 32) {
              data.ultimateHits++;
              data.dummies.splice(k, 1);
              if (window.IaijutsuMode) IaijutsuMode.onKill(dm, true, sAng, mg);
            }
          }

          // 纯净虚空幽芒碎屑
          for (var sp = 0; sp < 3; sp++) {
            mg.particles.push({
              type: 'void_shard',
              x: tx, y: ty,
              vx: (Math.random() - 0.5) * 85,
              vy: (Math.random() - 0.5) * 85,
              size: 2.8,
              color: '#38bdf8',
              life: 0.25, maxLife: 0.25
            });
          }

          if (window.SFX && Math.random() < 0.35) SFX.play('parry');
        }
      }
    }
  },

  // --------------------------------------------------------------------------
  // 流派 3：奥义·万剑归宗 (太极八卦金光剑盘 + 仙侠金光飞剑笔直射出穿透全场目标)
  // --------------------------------------------------------------------------
  _updateBlades: function (dt, mg, data, custom) {
    if (!custom.swords) custom.swords = [];
    custom.wheelAngle = (custom.wheelAngle || 0) + dt * 3.5;

    // 主角悬浮于场地中央
    var centerX = mg.room.worldX + CFG.W / 2;
    var centerY = mg.room.worldY + CFG.H / 2;
    Player.x += (centerX - Player.x) * dt * 5.0;
    Player.y += (centerY - Player.y) * dt * 5.0;
    Player.vx = 0; Player.vy = 0;

    // 每 0.052s 从背后的旋转八卦剑盘中向全场靶子呼啸激射 2 柄仙剑（适度放慢飞剑速度，让每柄剑的形制清晰可辨）
    data.ultimateNextSlashTime -= dt;
    if (data.ultimateNextSlashTime <= 0) {
      data.ultimateNextSlashTime = 0.052;
      if (data.dummies.length > 0) {
        var shotCount = 2;
        for (var b = 0; b < shotCount; b++) {
          var tgt = data.dummies[Math.floor(Math.random() * data.dummies.length)];
          var launchAng = custom.wheelAngle + b * Math.PI + (Math.random() - 0.5) * 0.45;
          var launchR = 48;
          var sx = Player.x + Math.cos(launchAng) * launchR;
          var sy = Player.y + Math.sin(launchAng) * launchR;

          // 笔直射向目标方向，速度由 2100 降为 980，既有穿刺感又能清晰看清剑身细节
          var targetAng = tgt ? Math.atan2(tgt.y - sy, tgt.x - sx) : launchAng;
          var finalAng = targetAng + (Math.random() - 0.5) * 0.1;
          var speed = 980;

          custom.swords.push({
            x: sx, y: sy,
            prevX: sx, prevY: sy,
            vx: Math.cos(finalAng) * speed,
            vy: Math.sin(finalAng) * speed,
            angle: finalAng,
            speed: speed,
            piercedMap: {},
            pierceCount: 0,
            life: 1.35,
            maxLife: 1.35
          });
        }
        if (window.SFX && Math.random() < 0.35) SFX.play('shoot');
      }
    }

    // 更新飞行中的神剑：笔直飞行并穿透所有沿途目标
    for (var swi = custom.swords.length - 1; swi >= 0; swi--) {
      var sword = custom.swords[swi];
      sword.life -= dt;
      sword.prevX = sword.x;
      sword.prevY = sword.y;

      // 绝对笔直的直线弹道
      sword.x += sword.vx * dt;
      sword.y += sword.vy * dt;

      // 飞行中抛洒细小金芒星尘，强化飞剑剑气
      if (Math.random() < 0.45 && mg.particles.length < 350) {
        mg.particles.push({
          x: sword.x - Math.cos(sword.angle) * 16,
          y: sword.y - Math.sin(sword.angle) * 16,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 2.2,
          color: '#fef08a',
          life: 0.18, maxLife: 0.18
        });
      }

      // 穿透判定：沿线段穿透一切遇到的靶子，神剑绝不提前消失
      for (var di = data.dummies.length - 1; di >= 0; di--) {
        var dObj = data.dummies[di];
        var dKey = dObj.x + '_' + dObj.y;
        if (!sword.piercedMap[dKey]) {
          var hitDist = Utils.distToSegment(dObj.x, dObj.y, sword.prevX, sword.prevY, sword.x, sword.y);
          if (hitDist <= dObj.r + 20) {
            sword.piercedMap[dKey] = true;
            sword.pierceCount++;
            data.dummies.splice(di, 1);
            data.ultimateHits++;
            if (window.IaijutsuMode) IaijutsuMode.onKill(dObj, true, sword.angle, mg);

            // 专属剑气贯穿特效：移除平A挥刀特效，凸显神剑贯穿威能
            if (window.Main && Main._burst) Main._burst(dObj.x, dObj.y, '#facc15', 14);
            if (window.SFX && Math.random() < 0.4) SFX.play('parry');

            // 贯穿破空金芒微粒
            for (var spk = 0; spk < 5; spk++) {
              var spkAng = sword.angle + (Math.random() - 0.5) * 1.5;
              var spkSpd = 120 + Math.random() * 100;
              mg.particles.push({
                x: dObj.x, y: dObj.y,
                vx: Math.cos(spkAng) * spkSpd,
                vy: Math.sin(spkAng) * spkSpd,
                size: 3.0,
                color: '#fef08a',
                life: 0.22, maxLife: 0.22
              });
            }
          }
        }
      }

      if (sword.life <= 0) {
        custom.swords.splice(swi, 1);
      }
    }
  },

  // --------------------------------------------------------------------------
  // 流派 4：奥义·业火阿修罗 (焦黑熔岩裂谷、修罗火龙卷陀螺高速旋转大风车、甩出红莲飞刃)
  // --------------------------------------------------------------------------
  _updateAsura: function (dt, mg, data, custom) {
    if (!custom.scorchedEarth) custom.scorchedEarth = [];
    if (!custom.flameBlades) custom.flameBlades = [];

    // 陀螺大风车超高速极速旋转
    custom.spinAngle = (custom.spinAngle || 0) + dt * 26.0;

    // 确定修罗火风暴巡航目的地（在靶群中高速穿梭突进）
    if (!custom.asuraTargetX || Utils.dist(Player.x, Player.y, custom.asuraTargetX, custom.asuraTargetY) < 40) {
      if (data.dummies.length > 0) {
        var rndTgt = data.dummies[Math.floor(Math.random() * data.dummies.length)];
        custom.asuraTargetX = rndTgt.x;
        custom.asuraTargetY = rndTgt.y;
      } else {
        custom.asuraTargetX = mg.room.worldX + CFG.W / 2;
        custom.asuraTargetY = mg.room.worldY + CFG.H / 2;
      }
    }

    // 修罗陀螺突进物理位移
    var mAng = Math.atan2(custom.asuraTargetY - Player.y, custom.asuraTargetX - Player.x);
    var rushSpeed = 1350;
    var prevX = Player.x, prevY = Player.y;
    Player.x += Math.cos(mAng) * rushSpeed * dt;
    Player.y += Math.sin(mAng) * rushSpeed * dt;
    Player.vx = 0; Player.vy = 0;
    if (Player._collideWalls && mg.room) Player._collideWalls(mg.room.colliders);
    if (window.Physics && mg.room) Physics.clampToBounds(Player, mg.room);

    // 在地面撕裂出真实的焦黑岩浆地裂 (Scorched Earth Decal)
    if (Math.random() < 0.6) {
      custom.scorchedEarth.push({
        x: Player.x + (Math.random() - 0.5) * 20,
        y: Player.y + (Math.random() - 0.5) * 20,
        r: 32 + Math.random() * 24,
        rot: Math.random() * Math.PI * 2,
        life: 2.5,
        maxLife: 2.5
      });
    }

    // 旋转陀螺风暴斩杀判定（半径 60px 内的所有木桩瞬间被卷入撕碎）
    for (var k = data.dummies.length - 1; k >= 0; k--) {
      var dm = data.dummies[k];
      if (Utils.dist(Player.x, Player.y, dm.x, dm.y) <= dm.r + 62) {
        data.ultimateHits++;
        data.dummies.splice(k, 1);
        if (window.IaijutsuMode) IaijutsuMode.onKill(dm, true, custom.spinAngle, mg);

        // 烈焰爆轰微粒
        for (var fp = 0; fp < 6; fp++) {
          var fAng = Math.random() * Math.PI * 2;
          mg.particles.push({
            type: 'spark',
            x: dm.x, y: dm.y,
            vx: Math.cos(fAng) * 220,
            vy: Math.sin(fAng) * 220,
            size: 4 + Math.random() * 4,
            color: Math.random() < 0.5 ? '#ff3b30' : '#facc15',
            life: 0.35, maxLife: 0.35
          });
        }
      }
    }

    // 每 0.058s 由陀螺外圈狂暴甩出 4 道弧形【红莲业火飞刃】
    data.ultimateNextSlashTime -= dt;
    if (data.ultimateNextSlashTime <= 0) {
      data.ultimateNextSlashTime = 0.058;
      for (var fbi = 0; fbi < 4; fbi++) {
        var bAng = custom.spinAngle + fbi * (Math.PI / 2);
        custom.flameBlades.push({
          x: Player.x + Math.cos(bAng) * 35,
          y: Player.y + Math.sin(bAng) * 35,
          ang: bAng,
          speed: 1550,
          life: 0.45
        });
      }
      if (window.SFX && Math.random() < 0.4) SFX.play('flame');
      if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.32);
    }

    // 更新飞行的红莲业火飞刃
    for (var fbi2 = custom.flameBlades.length - 1; fbi2 >= 0; fbi2--) {
      var fb = custom.flameBlades[fbi2];
      fb.life -= dt;
      fb.x += Math.cos(fb.ang) * fb.speed * dt;
      fb.y += Math.sin(fb.ang) * fb.speed * dt;

      // 击杀触碰靶子
      for (var fdk = data.dummies.length - 1; fdk >= 0; fdk--) {
        var fTarget = data.dummies[fdk];
        if (Utils.dist(fb.x, fb.y, fTarget.x, fTarget.y) <= fTarget.r + 28) {
          data.ultimateHits++;
          data.dummies.splice(fdk, 1);
          if (window.IaijutsuMode) IaijutsuMode.onKill(fTarget, true, fb.ang, mg);
        }
      }

      if (fb.life <= 0) custom.flameBlades.splice(fbi2, 1);
    }

    // 更新地面焦土寿命
    for (var sci = custom.scorchedEarth.length - 1; sci >= 0; sci--) {
      custom.scorchedEarth[sci].life -= dt;
      if (custom.scorchedEarth[sci].life <= 0) {
        custom.scorchedEarth.splice(sci, 1);
      }
    }
  },

  // --------------------------------------------------------------------------
  // 流派 5：奥义·天眼雷殛 (主角傲立原地不动、雷尊千鸟结印法阵、苍穹落雷疯狂轰炸、连锁高压闪电网)
  // --------------------------------------------------------------------------
  _updateThunder: function (dt, mg, data, custom) {
    if (!custom.lightningStrikes) custom.lightningStrikes = [];
    if (!custom.electricChains) custom.electricChains = [];

    // 主角原地傲立！绝不奔跑瞬移！
    if (custom.anchorX !== undefined && custom.anchorY !== undefined) {
      Player.x = custom.anchorX;
      Player.y = custom.anchorY;
    }
    Player.vx = 0; Player.vy = 0;

    // 清理落雷与电弧闪电寿命
    for (var lsi = custom.lightningStrikes.length - 1; lsi >= 0; lsi--) {
      custom.lightningStrikes[lsi].life -= dt;
      if (custom.lightningStrikes[lsi].life <= 0) custom.lightningStrikes.splice(lsi, 1);
    }
    for (var eci = custom.electricChains.length - 1; eci >= 0; eci--) {
      custom.electricChains[eci].life -= dt;
      if (custom.electricChains[eci].life <= 0) custom.electricChains.splice(eci, 1);
    }

    // 每 0.065s 苍穹引下粗壮天雷狠狠劈杀靶子，并在靶间织造高压连锁电网
    data.ultimateNextSlashTime -= dt;
    if (data.ultimateNextSlashTime <= 0) {
      data.ultimateNextSlashTime = 0.065;
      if (data.dummies.length > 0) {
        var targetIdx = Math.floor(Math.random() * data.dummies.length);
        var primeTarget = data.dummies[targetIdx];
        var tx = primeTarget.x, ty = primeTarget.y;

        // 1. 苍穹粗壮紫金落雷从天际垂直狂暴轰杀
        custom.lightningStrikes.push({
          x: tx, y: ty,
          topY: mg.room.worldY,
          width: 22,
          life: 0.16, maxLife: 0.16
        });

        // 2. 连锁高压闪电网：以目标为核心向周围 4 个靶子疯狂传导折射
        var chainedDummies = [primeTarget];
        for (var cdi = 0; cdi < data.dummies.length; cdi++) {
          var cand = data.dummies[cdi];
          if (cand !== primeTarget && Utils.dist(tx, ty, cand.x, cand.y) <= 300) {
            custom.electricChains.push({
              x0: tx, y0: ty, x1: cand.x, y1: cand.y,
              life: 0.15, maxLife: 0.15
            });
            chainedDummies.push(cand);
            if (chainedDummies.length >= 5) break;
          }
        }

        // 击杀被轰雷与连锁电网串联的全部靶子
        for (var k = data.dummies.length - 1; k >= 0; k--) {
          var dm = data.dummies[k];
          if (chainedDummies.indexOf(dm) >= 0) {
            data.ultimateHits++;
            data.dummies.splice(k, 1);
            if (window.IaijutsuMode) IaijutsuMode.onKill(dm, true, 0, mg);
          }
        }

        // 等离子电火花微粒
        for (var lp = 0; lp < 8; lp++) {
          mg.particles.push({
            type: 'lightning_spark',
            x: tx + (Math.random() - 0.5) * 40,
            y: ty + (Math.random() - 0.5) * 40,
            color: Math.random() < 0.5 ? '#22d3ee' : '#c084fc',
            life: 0.24, maxLife: 0.24
          });
        }

        if (window.SFX) SFX.play('lightning');
        if (window.Main) Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.38);
      }
    }
  },

  // --------------------------------------------------------------------------
  // 终焉全屏冲击波爆发
  // --------------------------------------------------------------------------
  _triggerFinisherBurst: function (mg, data, ultId, custom) {
    if (window.SFX) {
      SFX.play('victory');
      SFX.play('lightning');
      SFX.play('iai');
    }
    if (window.Main) {
      Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.9);
    }

    var burstColor1 = '#fde047', burstColor2 = '#38bdf8';
    var burstMsg = '💥 终焉·万象归寂破！【全域荡尽】';

    if (ultId === 'timestop') {
      burstColor1 = '#c084fc'; burstColor2 = '#38bdf8';
      burstMsg = '🌌 终焉·虚空裂缝大引爆！【纳刀归鞘】';
    } else if (ultId === 'blades') {
      burstColor1 = '#facc15'; burstColor2 = '#ffffff';
      burstMsg = '✨ 终焉·万剑归宗诛仙剑！【万刃诛灭】';
    } else if (ultId === 'asura') {
      burstColor1 = '#ff3b30'; burstColor2 = '#ff8800';
      burstMsg = '🔥 终焉·红莲修罗火龙卷！【焦土焚尽】';
    } else if (ultId === 'thunder') {
      burstColor1 = '#a855f7'; burstColor2 = '#22d3ee';
      burstMsg = '⚡ 终焉·九天玄雷劫阵！【等离子湮灭】';
    }

    if (!data.finisherWaves) data.finisherWaves = [];
    data.finisherWaves.push({
      x: Player.x,
      y: Player.y,
      r: 25,
      maxR: 1300,
      speed: 1750,
      life: 0.8,
      maxLife: 0.8,
      skinId: ultId,
      primaryColor: burstColor1,
      secondaryColor: burstColor2,
      clearedCount: 0
    });

    if (mg.addExplosion) {
      mg.addExplosion(Player.x, Player.y, burstColor1, 60);
      mg.addExplosion(Player.x, Player.y, burstColor2, 45);
    }
    if (window.FX && FX.floatText) {
      FX.floatText(Player.x, Player.y - 45, burstMsg, burstColor1, 2.2);
    }

    // 延时 0.5s 生成新靶子
    data.finisherRespawnTimer = 0.5;
  },

  /**
   * 专属渲染无我奥义全景视觉特效
   */
  render: function (ctx, mg) {
    var data = mg.iaijutsuData;
    if (!data) return;
    var ultId = data.activeUltId || 'classic';
    var custom = data.ultCustomData;
    var isUltActive = (data.ultimateTimer > 0) || (data.ultimatePauseTimer > 0);

    // ------------------------------------------------------------------------
    // 1. 时空断裂：100%水墨负片反色滤镜、空间冷凝晕影、多维时空碎裂裂缝与5道半透明主角分身
    // ------------------------------------------------------------------------
    if (ultId === 'timestop' && isUltActive) {
      ctx.save();
      // (1) 100% 纯正水墨负片反色滤镜
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mg.room.worldX, mg.room.worldY, CFG.W, CFG.H);
      ctx.restore();

      // (2) 水墨冷调晕影
      ctx.save();
      var inkGrad = ctx.createRadialGradient(Player.x, Player.y, 80, Player.x, Player.y, 650);
      inkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      inkGrad.addColorStop(0.7, 'rgba(15, 23, 42, 0.25)');
      inkGrad.addColorStop(1, 'rgba(2, 6, 23, 0.55)');
      ctx.fillStyle = inkGrad;
      ctx.fillRect(mg.room.worldX, mg.room.worldY, CFG.W, CFG.H);
      ctx.restore();

      // (3) 多维时空碎裂裂缝（锯齿折线 + 枝桠裂纹 + 虚空狭缝 + 漂浮碎晶，拒绝突兀粗白线段）
      if (custom && custom.cracks && custom.cracks.length > 0) {
        ctx.save();
        for (var ci = 0; ci < custom.cracks.length; ci++) {
          var crk = custom.cracks[ci];
          var cAlpha = Math.max(0, crk.life / crk.maxLife);

          // a. 狭长虚空暗缝菱形断层（模拟空间被切穿露出的深渊无尽）
          if (crk.midX !== undefined && crk.segments && crk.segments.length > 2) {
            ctx.fillStyle = 'rgba(15, 23, 42, ' + (cAlpha * 0.75) + ')';
            var p0 = crk.segments[0];
            var pEnd = crk.segments[crk.segments.length - 1];
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(crk.midX + 3.5, crk.midY - 3.5);
            ctx.lineTo(pEnd.x, pEnd.y);
            ctx.lineTo(crk.midX - 3.5, crk.midY + 3.5);
            ctx.closePath();
            ctx.fill();
          }

          // b. 锯齿主裂缝多段折线（深黑虚空暗蚀边缘 + 柔和冷光细丝）
          if (crk.segments && crk.segments.length > 1) {
            ctx.strokeStyle = 'rgba(0, 0, 0, ' + (cAlpha * 0.85) + ')';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(crk.segments[0].x, crk.segments[0].y);
            for (var si = 1; si < crk.segments.length; si++) {
              ctx.lineTo(crk.segments[si].x, crk.segments[si].y);
            }
            ctx.stroke();

            // 内层次元微光裂心（柔和浅蓝冷光，绝不使用刺眼粗白线条）
            ctx.strokeStyle = 'rgba(125, 211, 252, ' + (cAlpha * 0.7) + ')';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // 极细时空微丝
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (cAlpha * 0.45) + ')';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }

          // c. 碎镜般向外蔓延的小分枝晶纹
          if (crk.branches && crk.branches.length > 0) {
            ctx.strokeStyle = 'rgba(186, 230, 253, ' + (cAlpha * 0.5) + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (var bi = 0; bi < crk.branches.length; bi++) {
              var br = crk.branches[bi];
              ctx.moveTo(br.x0, br.y0);
              ctx.lineTo(br.x1, br.y1);
            }
            ctx.stroke();
          }

          // d. 悬浮的微型次元碎片晶片
          if (crk.shards && crk.shards.length > 0) {
            ctx.fillStyle = 'rgba(15, 23, 42, ' + (cAlpha * 0.8) + ')';
            ctx.strokeStyle = 'rgba(186, 230, 253, ' + (cAlpha * 0.6) + ')';
            ctx.lineWidth = 0.8;
            for (var shi = 0; shi < crk.shards.length; shi++) {
              var sh = crk.shards[shi];
              ctx.save();
              ctx.translate(sh.x, sh.y);
              ctx.rotate(sh.rot);
              ctx.beginPath();
              ctx.moveTo(0, -sh.size);
              ctx.lineTo(sh.size * 0.7, sh.size * 0.7);
              ctx.lineTo(-sh.size * 0.7, sh.size * 0.7);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        }
        ctx.restore();
      }

      // (4) 5 道半透明主角分身在全场纵横交错穿梭斩击
      if (custom && custom.clones) {
        ctx.save();
        var isCat = (typeof Player !== 'undefined' && Player.hasBuff && Player.hasBuff('polymorph'));
        var playerChar = isCat ? '🐈' : '🧑‍🚀';

        for (var cli = 0; cli < custom.clones.length; cli++) {
          var cl = custom.clones[cli];
          ctx.save();
          ctx.translate(cl.x, cl.y);
          ctx.rotate(cl.angle || 0);

          // 半透明分身光晕
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();

          // 分身本体（主角半透明形象）
          ctx.font = '30px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(playerChar, 0, 0);

          // 半透明武士刀刃
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(8, -4);
          ctx.lineTo(26, -4);
          ctx.stroke();

          // 居合拔刀弧光（当处于瞬斩帧时）
          if (cl.slashT > 0) {
            var arcA = Math.min(1.0, cl.slashT / 0.22);
            ctx.strokeStyle = 'rgba(186, 230, 253, ' + (arcA * 0.8) + ')';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.arc(4, 0, 24, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
          }

          ctx.restore();
        }
        ctx.restore();
      }
    }

    // ------------------------------------------------------------------------
    // 2. 万剑归宗：双层旋转太极八卦剑阵与仙侠金光飞剑（直线高速贯穿全场目标）
    // ------------------------------------------------------------------------
    if (ultId === 'blades' && isUltActive) {
      ctx.save();
      var wAng = (custom && custom.wheelAngle) || 0;

      // (1) 外层太极八卦符文光盘
      ctx.save();
      ctx.translate(Player.x, Player.y);
      ctx.rotate(wAng * 0.4);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(254, 240, 138, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // (2) 内层 8 柄环绕法剑（正统修仙双刃飞剑）
      var numSwords = 8;
      var wR = 46;
      for (var sIdx = 0; sIdx < numSwords; sIdx++) {
        var curA = wAng + (sIdx / numSwords) * Math.PI * 2;
        var sx = Player.x + Math.cos(curA) * wR;
        var sy = Player.y + Math.sin(curA) * wR;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(curA + Math.PI / 2);

        // 正统双刃金光飞剑造型
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -18);      // 剑尖
        ctx.lineTo(3.2, -4);     // 剑身前段
        ctx.lineTo(3.2, 4);      // 剑身根部
        ctx.lineTo(6, 6);        // 护手翼
        ctx.lineTo(1.8, 6);      // 剑柄
        ctx.lineTo(1.8, 12);     // 剑柄底
        ctx.lineTo(-1.8, 12);
        ctx.lineTo(-1.8, 6);
        ctx.lineTo(-6, 6);
        ctx.lineTo(-3.2, 4);
        ctx.lineTo(-3.2, -4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // (3) 笔直激射贯穿全场的神剑实体与直线金光拖尾（正统仙侠飞剑，拒绝儿童涂鸦箭头与杂乱水彩）
      if (custom && custom.swords) {
        for (var fsi = 0; fsi < custom.swords.length; fsi++) {
          var fSw = custom.swords[fsi];

          // 1. 直线长虹剑气拖尾（笔直三层激光长虹，展现极具仙侠气魄的破空飞剑特效）
          var trailLen = 95;
          var tailX = fSw.x - Math.cos(fSw.angle) * trailLen;
          var tailY = fSw.y - Math.sin(fSw.angle) * trailLen;

          ctx.save();
          // 外层柔和金晕
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
          ctx.lineWidth = 8.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(fSw.x, fSw.y);
          ctx.stroke();

          // 中层灿烂耀金剑气
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(fSw.x - Math.cos(fSw.angle) * 70, fSw.y - Math.sin(fSw.angle) * 70);
          ctx.lineTo(fSw.x, fSw.y);
          ctx.stroke();

          // 核心炽白贯日光芒
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(fSw.x - Math.cos(fSw.angle) * 45, fSw.y - Math.sin(fSw.angle) * 45);
          ctx.lineTo(fSw.x, fSw.y);
          ctx.stroke();
          ctx.restore();

          // 2. 正统仙侠双刃神剑本体（高光与剑影全面增强）
          ctx.save();
          ctx.translate(fSw.x, fSw.y);
          ctx.rotate(fSw.angle);

          // 金光外晕
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 12;

          // 剑身主体：双刃修长神剑（尖利锋刃 + 展开剑翼护手 + 剑柄与剑首）
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(22, 0);          // 剑尖
          ctx.lineTo(16, -3.2);       // 剑锋
          ctx.lineTo(2, -3.2);        // 剑脊
          ctx.lineTo(0, -6.0);        // 向上扬起的护手飞翼
          ctx.lineTo(-2, -6.0);
          ctx.lineTo(-3, -2.0);       // 护手根部
          ctx.lineTo(-10, -2.0);      // 剑柄
          ctx.lineTo(-12, -3.5);      // 剑首
          ctx.lineTo(-14, 0);         // 剑首端点
          ctx.lineTo(-12, 3.5);       // 剑首
          ctx.lineTo(-10, 2.0);       // 剑柄
          ctx.lineTo(-3, 2.0);        // 护手根部
          ctx.lineTo(-2, 6.0);
          ctx.lineTo(0, 6.0);         // 向下扬起的护手飞翼
          ctx.lineTo(2, 3.2);         // 剑脊
          ctx.lineTo(16, 3.2);        // 剑锋
          ctx.closePath();
          ctx.fill();

          // 刃口纯白高光与中央剑脊
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.lineTo(-3, 0);
          ctx.stroke();

          // 护手核心金色装饰
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(-2, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // 剑尖极速破空激波锥
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(24, 0);
          ctx.lineTo(15, -5.5);
          ctx.moveTo(24, 0);
          ctx.lineTo(15, 5.5);
          ctx.stroke();

          ctx.restore();
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------------
    // 3. 业火阿修罗：焦黑熔岩裂谷地壳、修罗自旋陀螺风暴与红莲业火飞刃
    // ------------------------------------------------------------------------
    if (ultId === 'asura' && isUltActive) {
      ctx.save();

      // (1) 地面焦黑熔岩裂谷 (Scorched Earth Decals)
      if (custom && custom.scorchedEarth) {
        for (var sei = 0; sei < custom.scorchedEarth.length; sei++) {
          var se = custom.scorchedEarth[sei];
          var sAlpha = Math.min(1.0, se.life / se.maxLife);

          // 焦黑基底
          ctx.save();
          ctx.translate(se.x, se.y);
          ctx.rotate(se.rot);
          ctx.fillStyle = 'rgba(15, 23, 42, ' + (sAlpha * 0.7).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(0, 0, se.r, 0, Math.PI * 2);
          ctx.fill();

          // 岩浆裂纹
          ctx.strokeStyle = 'rgba(239, 68, 68, ' + (sAlpha * 0.9).toFixed(2) + ')';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(-se.r * 0.8, 0);
          ctx.lineTo(0, -se.r * 0.4);
          ctx.lineTo(se.r * 0.8, 0);
          ctx.stroke();

          // 金黄熔芯
          ctx.strokeStyle = 'rgba(253, 224, 71, ' + (sAlpha * 0.95).toFixed(2) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // (2) 修罗火陀螺自旋大风车风暴护盾
      var spAng = (custom && custom.spinAngle) || 0;
      ctx.save();
      ctx.translate(Player.x, Player.y);
      ctx.rotate(spAng);

      // 旋转烈火光轮
      var fireRingGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 62);
      fireRingGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      fireRingGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.7)');
      fireRingGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
      ctx.fillStyle = fireRingGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.fill();

      // 4 道旋转巨大修罗战刃
      for (var bi = 0; bi < 4; bi++) {
        ctx.save();
        ctx.rotate(bi * (Math.PI / 2));
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(18, -4);
        ctx.lineTo(58, 0);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // (3) 红莲业火飞刃
      if (custom && custom.flameBlades) {
        for (var fbi3 = 0; fbi3 < custom.flameBlades.length; fbi3++) {
          var blade = custom.flameBlades[fbi3];
          ctx.save();
          ctx.translate(blade.x, blade.y);
          ctx.rotate(blade.ang);

          // 弯月焰刃
          ctx.fillStyle = '#ff4500';
          ctx.beginPath();
          ctx.arc(0, 0, 20, -Math.PI / 3, Math.PI / 3, false);
          ctx.arc(8, 0, 18, Math.PI / 3, -Math.PI / 3, true);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------------
    // 4. 天眼雷殛：主角原地雷尊法阵、千鸟球形雷电护体、苍穹落雷与连锁电网
    // ------------------------------------------------------------------------
    if (ultId === 'thunder' && isUltActive) {
      ctx.save();
      var tTime = (custom && custom.time) || 0;

      // (1) 主角脚下张开九天雷尊召雷八卦法阵（双层旋转雷电阵盘）
      ctx.save();
      ctx.translate(Player.x, Player.y);

      // 外盘
      ctx.save();
      ctx.rotate(tTime * 4.0);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 内盘
      ctx.save();
      ctx.rotate(-tTime * 6.0);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // (2) 主角周身千鸟雷球电芒护罩
      var chidoriR = 26 + Math.sin(tTime * 30) * 4;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, chidoriR, 0, Math.PI * 2);
      ctx.fill();

      // 围绕主角跳跃的狂暴电弧
      for (var arcIdx = 0; arcIdx < 5; arcIdx++) {
        var arcAng = Math.random() * Math.PI * 2;
        var aR1 = 12 + Math.random() * 10;
        var aR2 = 28 + Math.random() * 14;
        ctx.strokeStyle = Math.random() < 0.5 ? '#a855f7' : '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(arcAng) * aR1, Math.sin(arcAng) * aR1);
        ctx.lineTo(Math.cos(arcAng + 0.3) * aR2, Math.sin(arcAng + 0.3) * aR2);
        ctx.stroke();
      }
      ctx.restore();

      // (3) 苍穹紫金落雷轰顶天柱
      if (custom && custom.lightningStrikes && custom.lightningStrikes.length > 0) {
        for (var li = 0; li < custom.lightningStrikes.length; li++) {
          var ls = custom.lightningStrikes[li];
          var lAlpha = ls.life / ls.maxLife;

          // 外层等离子光晕
          ctx.strokeStyle = 'rgba(168, 85, 247, ' + (lAlpha * 0.9).toFixed(2) + ')';
          ctx.lineWidth = ls.width || 22;
          ctx.beginPath();
          ctx.moveTo(ls.x, ls.topY);
          ctx.lineTo(ls.x, ls.y);
          ctx.stroke();

          // 核心超亮白热电浆
          ctx.strokeStyle = 'rgba(255, 255, 255, ' + lAlpha.toFixed(2) + ')';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      }

      // (4) 连锁高压闪电折射网
      if (custom && custom.electricChains && custom.electricChains.length > 0) {
        for (var eci = 0; eci < custom.electricChains.length; eci++) {
          var ec = custom.electricChains[eci];
          var eAlpha = ec.life / ec.maxLife;
          var mx = (ec.x0 + ec.x1) / 2 + (Math.random() - 0.5) * 24;
          var my = (ec.y0 + ec.y1) / 2 + (Math.random() - 0.5) * 24;

          ctx.strokeStyle = 'rgba(34, 211, 238, ' + (eAlpha * 0.95).toFixed(2) + ')';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(ec.x0, ec.y0);
          ctx.lineTo(mx, my);
          ctx.lineTo(ec.x1, ec.y1);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, ' + eAlpha.toFixed(2) + ')';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
};
