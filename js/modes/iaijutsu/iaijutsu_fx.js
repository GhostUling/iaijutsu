// ============================================================================
// 居合斩专属模块 · 特效与领域渲染器 (Iaijutsu Visual Effects & Particle Engine)
// ============================================================================

window.IaijutsuFX = {
  /**
   * 播放皮肤专属居合斩特效线与粒子（全皮肤高精专属多色视觉，0延迟超流畅）
   */
  playSkinSlashFx: function (particles, x0, y0, x1, y1, angle, skin) {
    skin = skin || (window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null) || { primaryColor: '#00f0ff', secondaryColor: '#2563eb' };
    var pColors = skin.particleColors || ['#ffffff', '#38bdf8'];
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var sId = skin.id || 'classic';

    // 1. 皮肤专属多色交融激光斩痕 (斩切激光束)
    particles.push({
      isLaser: true,
      skinId: sId,
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      primaryColor: skin.primaryColor,
      secondaryColor: skin.secondaryColor,
      coreColor: skin.coreColor || '#ffffff',
      life: 0.28,
      maxLife: 0.28
    });

    // 2. 沿冲刺路径生成残影拖尾 (仅生成 2~3 个，性能极佳且轻盈连贯)
    var trailSteps = Math.max(2, Math.min(3, Math.floor(dist / 45)));
    for (var ts = 0; ts <= trailSteps; ts++) {
      var trPct = ts / trailSteps;
      var tx = x0 + dx * trPct;
      var ty = y0 + dy * trPct;
      if (window.FX && FX.trail) FX.trail(tx, ty, angle, 0.32, skin);
    }

    // 3. 高饱和度鲜明多色飞溅粒子（色彩丰富、高对比、明亮饱满）
    var particleSteps = Math.max(6, Math.min(14, Math.floor(dist / 22)));
    for (var i = 0; i <= particleSteps; i++) {
      var t = i / particleSteps;
      var px = x0 + dx * t;
      var py = y0 + dy * t;
      var c = pColors[i % pColors.length];
      var pAng = angle + (Math.random() < 0.5 ? (Math.PI / 2) : (-Math.PI / 2)) + (Math.random() - 0.5) * 0.7;
      var pSpd = 60 + Math.random() * 120;
      particles.push({
        x: px + (Math.random() - 0.5) * 8,
        y: py + (Math.random() - 0.5) * 8,
        vx: Math.cos(pAng) * pSpd,
        vy: Math.sin(pAng) * pSpd,
        size: 3.5 + Math.random() * 3.5,
        color: c,
        life: 0.34,
        maxLife: 0.34
      });
    }

    // 4. 专属皮肤主题高亮特异微粒
    var decorCount = Math.max(3, Math.min(7, Math.floor(dist / 35)));
    for (var di = 0; di <= decorCount; di++) {
      var dtPct = di / decorCount;
      var dpx = x0 + dx * dtPct + (Math.random() - 0.5) * 10;
      var dpy = y0 + dy * dtPct + (Math.random() - 0.5) * 10;

      if (sId === 'water') {
        // 🌊 流水断瀑：水流激荡飞溅粒子、晶莹水珠与扩散水花波纹
        var isFoam = di % 3 === 0;
        var isRipple = di % 3 === 1;
        var wSpd = 35 + Math.random() * 65;
        var wDir = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.8;
        if (isRipple) {
          particles.push({
            type: 'water_ripple',
            x: dpx,
            y: dpy,
            vx: 0,
            vy: 0,
            r: 4 + Math.random() * 4,
            maxR: 16 + Math.random() * 12,
            color: '#38bdf8',
            life: 0.35 + Math.random() * 0.15,
            maxLife: 0.5
          });
        } else {
          particles.push({
            type: 'water_drop',
            x: dpx,
            y: dpy,
            vx: Math.cos(wDir) * wSpd,
            vy: Math.sin(wDir) * wSpd + 15,
            size: isFoam ? (3 + Math.random() * 2.5) : (4.5 + Math.random() * 3.5),
            color: isFoam ? '#ffffff' : (di % 2 === 0 ? '#38bdf8' : '#0ea5e9'),
            life: 0.38 + Math.random() * 0.18,
            maxLife: 0.55
          });
        }
      } else if (sId === 'sakura') {
        var pRot = Math.random() * Math.PI * 2;
        var pVRot = (Math.random() - 0.5) * 5;
        var pSpd = 25 + Math.random() * 45;
        var pDir = angle + (Math.random() - 0.5) * 1.4;
        particles.push({
          type: 'sakura_petal',
          x: dpx,
          y: dpy,
          vx: Math.cos(pDir) * pSpd,
          vy: Math.sin(pDir) * pSpd + 12,
          rot: pRot,
          vRot: pVRot,
          size: 5 + Math.random() * 3,
          color: (di % 2 === 0) ? '#f43f5e' : '#fbcfe8',
          life: 0.5 + Math.random() * 0.2,
          maxLife: 0.7
        });
      } else if (sId === 'zen') {
        var isInk = di % 2 === 0;
        var inkSpd = 30 + Math.random() * 55;
        var inkDir = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.5;
        particles.push({
          type: 'ink_drop',
          x: dpx,
          y: dpy,
          vx: Math.cos(inkDir) * inkSpd,
          vy: Math.sin(inkDir) * inkSpd,
          size: 4 + Math.random() * 3,
          color: isInk ? '#0a0f1d' : '#ffffff',
          life: 0.4 + Math.random() * 0.15,
          maxLife: 0.55
        });
      } else if (sId === 'crimson') {
        particles.push({
          type: 'ember',
          x: dpx,
          y: dpy,
          vx: (Math.random() - 0.5) * 35,
          vy: -35 - Math.random() * 45,
          size: 3.5 + Math.random() * 3,
          color: (di % 2 === 0) ? '#facc15' : '#ff3b30',
          life: 0.42 + Math.random() * 0.18,
          maxLife: 0.6
        });
      } else if (sId === 'thunder') {
        particles.push({
          type: 'lightning_spark',
          x: dpx,
          y: dpy,
          vx: (Math.random() - 0.5) * 55,
          vy: (Math.random() - 0.5) * 55,
          size: 4.5 + Math.random() * 3,
          color: (di % 2 === 0) ? '#22d3ee' : '#c084fc',
          life: 0.28 + Math.random() * 0.12,
          maxLife: 0.4
        });
      } else if (sId === 'aurum') {
        particles.push({
          type: 'spark',
          x: dpx,
          y: dpy,
          vx: (Math.random() - 0.5) * 25,
          vy: (Math.random() - 0.5) * 25,
          rot: Math.random() * Math.PI,
          vRot: 3.5,
          size: 4.5 + Math.random() * 3,
          color: (di % 2 === 0) ? '#facc15' : '#ffffff',
          life: 0.38 + Math.random() * 0.15,
          maxLife: 0.53
        });
      } else if (sId === 'void') {
        particles.push({
          type: 'void_shard',
          x: dpx,
          y: dpy,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          rot: Math.random() * Math.PI,
          vRot: 2.5,
          size: 4 + Math.random() * 3,
          color: (di % 2 === 0) ? '#ff007f' : '#a855f7',
          life: 0.38 + Math.random() * 0.15,
          maxLife: 0.53
        });
      }
    }

    // 5. 起点与落点位移冲击波与刀光动画
    if (window.FX) {
      if (FX.dash) FX.dash(x1, y1, angle, skin.primaryColor);
      if (FX.slash) FX.slash(x1, y1, angle, skin.primaryColor);
    }
    if (window.Main && Main._burst) {
      Main._burst(x1, y1, skin.primaryColor, 12);
    }
  },

  /**
   * 渲染无我之境 (Ultimate) 领域大阵
   */
  renderUltimateField: function (ctx, room, player, timer) {
    ctx.save();
    var rx = room.worldX, ry = room.worldY;
    var rw = room.w, rh = room.h;

    // 1.1 全屏深邃次元暗幕
    var voidGrad = ctx.createRadialGradient(player.x, player.y, 40, player.x, player.y, rw * 0.75);
    voidGrad.addColorStop(0, 'rgba(15, 23, 42, 0.2)');
    voidGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.6)');
    voidGrad.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(rx, ry, rw, rh);

    // 1.2 空间全屏交错水墨与雷芒次元斩裂痕
    for (var cutI = 0; cutI < 5; cutI++) {
      var cutAng = ((cutI * 1.25) + timer * 0.6) % (Math.PI * 2);
      var cutLen = rw * 0.85;
      var cutAlpha = 0.25 + 0.2 * Math.sin(timer * 6 + cutI * 1.5);
      var cx0 = player.x + Math.cos(cutAng) * cutLen;
      var cy0 = player.y + Math.sin(cutAng) * cutLen;
      var cx1 = player.x - Math.cos(cutAng) * cutLen;
      var cy1 = player.y - Math.sin(cutAng) * cutLen;

      ctx.strokeStyle = cutI % 2 === 0 ? 'rgba(250, 204, 21, ' + cutAlpha.toFixed(2) + ')' : 'rgba(255, 255, 255, ' + cutAlpha.toFixed(2) + ')';
      ctx.lineWidth = cutI % 2 === 0 ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx1, cy1); ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 1.3 放射状水墨极速剑气速度线
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1.5;
    for (var sl = 0; sl < 8; sl++) {
      var sAng = (timer * 4.5 + sl * (Math.PI / 4)) % (Math.PI * 2);
      var len = 120 + ((sl * 43) % 160);
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(sAng) * 32, player.y + Math.sin(sAng) * 32);
      ctx.lineTo(player.x + Math.cos(sAng) * (32 + len), player.y + Math.sin(sAng) * (32 + len));
      ctx.stroke();
    }

    // 1.4 主角脚下【正宗黑白阴阳太极八卦大阵】
    ctx.save();
    var taijiRad = 48 + Math.sin(timer * 6) * 3;
    var taijiRot = timer * 2.0;
    ctx.translate(player.x, player.y);
    ctx.rotate(taijiRot);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, taijiRad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, taijiRad - 2, 0, Math.PI * 2);
    ctx.stroke();

    // 八方卦象光斑
    for (var gi = 0; gi < 8; gi++) {
      var gAng = gi * (Math.PI / 4);
      var gx = Math.cos(gAng) * (taijiRad + 6);
      var gy = Math.sin(gAng) * (taijiRad + 6);
      ctx.fillStyle = gi % 2 === 0 ? '#ffffff' : '#facc15';
      ctx.beginPath();
      ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 太极阴阳双鱼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, taijiRad - 4, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(0, 0, taijiRad - 4, Math.PI / 2, -Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -(taijiRad - 4) / 2, (taijiRad - 4) / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(0, (taijiRad - 4) / 2, (taijiRad - 4) / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(0, -(taijiRad - 4) / 2, (taijiRad - 4) / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, (taijiRad - 4) / 2, (taijiRad - 4) / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1.5 围绕主角高速旋转的 8 柄太极流光诛仙飞刃
    var ringRad = 60 + Math.sin(timer * 10) * 4;
    for (var bi = 0; bi < 8; bi++) {
      var bAngle = timer * 5 + (bi * Math.PI / 4);
      var bx = player.x + Math.cos(bAngle) * ringRad;
      var by = player.y + Math.sin(bAngle) * ringRad;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bAngle + Math.PI / 2);
      var isWhite = bi % 2 === 0;
      ctx.fillStyle = isWhite ? '#ffffff' : (bi % 4 === 1 ? '#0a0f1d' : '#facc15');
      ctx.strokeStyle = isWhite ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(4.5, 8);
      ctx.lineTo(0, 5);
      ctx.lineTo(-4.5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = isWhite ? '#38bdf8' : '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(0, 18);
      ctx.stroke();
      ctx.restore();
    }

    // 1.6 无我之境四方神圣光辉边框
    var ultBorderAlpha = 0.7 + Math.sin(timer * 8) * 0.25;
    ctx.strokeStyle = 'rgba(250, 204, 21, ' + ultBorderAlpha.toFixed(2) + ')';
    ctx.lineWidth = 4;
    ctx.strokeRect(rx + 10, ry + 10, rw - 20, rh - 20);

    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (ultBorderAlpha * 0.8).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 15, ry + 15, rw - 30, rh - 30);
    ctx.restore();
  },

  /**
   * 渲染终焉冲击波前的【纳刀聚气·收敛屏息】视觉特效 (蓄势待发聚气环)
   */
  renderPauseConvergence: function (ctx, player, pauseTimer, maxPauseTimer) {
    ctx.save();
    maxPauseTimer = maxPauseTimer || 0.36;
    var pProg = Math.max(0, Math.min(1, pauseTimer / maxPauseTimer));
    var contractRad = 15 + pProg * 70;

    // 向心收束高能光环
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(player.x, player.y, contractRad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, Math.max(5, contractRad - 6), 0, Math.PI * 2);
    ctx.stroke();

    // 向心汇聚的 6 道聚气星芒
    for (var fsi = 0; fsi < 6; fsi++) {
      var fAng = fsi * (Math.PI / 3) + (1 - pProg) * 3;
      var rInner = contractRad;
      var rOuter = contractRad + 25 * pProg + 10;
      ctx.strokeStyle = fsi % 2 === 0 ? '#38bdf8' : '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(fAng) * rOuter, player.y + Math.sin(fAng) * rOuter);
      ctx.lineTo(player.x + Math.cos(fAng) * rInner, player.y + Math.sin(fAng) * rInner);
      ctx.stroke();
    }
    ctx.restore();
  },

  /**
   * 渲染狂暴模式黄色等离子光晕
   */
  renderFrenzyAura: function (ctx, room, player, timer, frenzyTimer) {
    var isEnding = frenzyTimer <= 1.0;
    var flicker = true;
    if (isEnding) flicker = Math.floor(timer * 12) % 2 === 0;

    if (flicker) {
      ctx.save();
      var pAuraRadius = 32 + Math.sin(timer * 12) * 5;
      var pAlpha = isEnding ? 0.8 : (0.5 + Math.sin(timer * 8) * 0.25);

      var auraGrad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, pAuraRadius + 14);
      auraGrad.addColorStop(0, 'rgba(254, 240, 138, ' + (pAlpha * 0.95).toFixed(3) + ')');
      auraGrad.addColorStop(0.4, 'rgba(250, 204, 21, ' + (pAlpha * 0.6).toFixed(3) + ')');
      auraGrad.addColorStop(0.8, 'rgba(234, 179, 8, ' + (pAlpha * 0.25).toFixed(3) + ')');
      auraGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, pAuraRadius + 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isEnding ? '#fef08a' : '#facc15';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(player.x, player.y, pAuraRadius, 0, Math.PI * 2);
      ctx.stroke();

      for (var si = 0; si < 4; si++) {
        var sAng = timer * 6 + (si * Math.PI / 2);
        var sDist = pAuraRadius + 2;
        var sx = player.x + Math.cos(sAng) * sDist;
        var sy = player.y + Math.sin(sAng) * sDist;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    var alphaBorder = 0.25 + Math.sin(timer * 8) * 0.15;
    ctx.strokeStyle = 'rgba(250, 204, 21, ' + alphaBorder + ')';
    ctx.lineWidth = 4;
    ctx.strokeRect(room.worldX + 12, room.worldY + 12, (room.w || CFG.W) - 24, (room.h || CFG.H) - 24);
    ctx.restore();
  },

  /**
   * 渲染终焉全域冲击波 (Finisher Shockwaves)
   */
  renderFinisherWaves: function (ctx, waves) {
    if (!waves || waves.length === 0) return;
    for (var fwi = 0; fwi < waves.length; fwi++) {
      var fw = waves[fwi];
      var fAlpha = Math.max(0, Math.min(1, fw.life / fw.maxLife));
      if (fAlpha <= 0 || fw.r <= 0) continue;

      ctx.save();

      // 穹顶光晕
      var waveGrad = ctx.createRadialGradient(fw.x, fw.y, Math.max(1, fw.r * 0.25), fw.x, fw.y, fw.r + 30);
      waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      waveGrad.addColorStop(0.5, fw.secondaryColor ? (fw.secondaryColor + '22') : 'rgba(56, 189, 248, 0.12)');
      waveGrad.addColorStop(0.85, fw.primaryColor ? (fw.primaryColor + '44') : 'rgba(250, 204, 21, 0.25)');
      waveGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = waveGrad;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.r + 30, 0, Math.PI * 2);
      ctx.fill();

      // 主波阵面
      ctx.strokeStyle = fw.secondaryColor || '#38bdf8';
      ctx.globalAlpha = fAlpha * 0.75;
      ctx.lineWidth = 11 * fAlpha + 3;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = fw.primaryColor || '#facc15';
      ctx.globalAlpha = fAlpha * 0.95;
      ctx.lineWidth = 5.5 * fAlpha + 1.5;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = fAlpha;
      ctx.lineWidth = 2.2 * fAlpha + 0.8;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.r, 0, Math.PI * 2);
      ctx.stroke();

      // 伴生内环
      if (fw.r > 50) {
        ctx.strokeStyle = fw.primaryColor || '#facc15';
        ctx.globalAlpha = fAlpha * 0.6;
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, fw.r - 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 12 道贯日诛仙剑气
      for (var rayI = 0; rayI < 12; rayI++) {
        var rayAng = rayI * (Math.PI / 6) + (1 - fAlpha) * 0.6;
        var rayInner = Math.max(10, fw.r - (50 * fAlpha + 20));
        var rayOuter = fw.r + (25 * fAlpha + 12);
        var rx0 = fw.x + Math.cos(rayAng) * rayInner;
        var ry0 = fw.y + Math.sin(rayAng) * rayInner;
        var rx1 = fw.x + Math.cos(rayAng) * rayOuter;
        var ry1 = fw.y + Math.sin(rayAng) * rayOuter;

        ctx.strokeStyle = rayI % 2 === 0 ? (fw.primaryColor || '#facc15') : '#ffffff';
        ctx.globalAlpha = fAlpha * 0.85;
        ctx.lineWidth = (rayI % 3 === 0 ? 3.5 : 2.0) * fAlpha + 0.8;
        ctx.beginPath();
        ctx.moveTo(rx0, ry0);
        ctx.lineTo(rx1, ry1);
        ctx.stroke();
      }

      // 皮肤专属波纹
      if (fw.skinId === 'zen') {
        ctx.strokeStyle = '#0a0f1d';
        ctx.globalAlpha = fAlpha * 0.85;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, fw.r + 14, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, fw.r + 14, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else if (fw.skinId === 'sakura') {
        for (var skI = 0; skI < 8; skI++) {
          var skAng = skI * (Math.PI / 4) + fw.r * 0.02;
          var skx = fw.x + Math.cos(skAng) * fw.r;
          var sky = fw.y + Math.sin(skAng) * fw.r;
          ctx.fillStyle = '#f472b6';
          ctx.globalAlpha = fAlpha * 0.9;
          ctx.beginPath();
          ctx.ellipse(skx, sky, 6 * fAlpha, 3.5 * fAlpha, skAng, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (fw.skinId === 'water') {
        // 水波扩散与碧浪晶莹水花
        for (var wkI = 0; wkI < 10; wkI++) {
          var wkAng = wkI * (Math.PI / 5) - fw.r * 0.025;
          var wkx = fw.x + Math.cos(wkAng) * (fw.r + 8);
          var wky = fw.y + Math.sin(wkAng) * (fw.r + 8);
          ctx.fillStyle = wkI % 2 === 0 ? '#38bdf8' : '#ffffff';
          ctx.globalAlpha = fAlpha * 0.95;
          ctx.beginPath();
          ctx.arc(wkx, wky, (wkI % 2 === 0 ? 5 : 3.5) * fAlpha, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  },

  /**
   * 🏮 极道武场 · 模块化动态背景皮肤渲染 (支持纯净空境、四芒视界、虚无曼陀罗、极道罗盘)
   * 采用纯轻量数学与 Canvas 原生渐变，零动态垃圾回收，绝对稳定 60 帧极速流畅
   */
  renderDojoBackground: function (ctx, room, timer, combo, skin, bgSkinId) {
    if (!room) return;
    timer = timer || 0;
    combo = combo || 0;
    skin = skin || (window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedSkin() : null) || { primaryColor: '#38bdf8', secondaryColor: '#0284c7', coreColor: '#ffffff' };
    bgSkinId = bgSkinId || (window.IaijutsuSkins ? window.IaijutsuSkins.getEquippedBgSkinId() : 'none');

    // 如果是纯净空境且无特效，直接返回（零背景干扰，返璞归真）
    if (bgSkinId === 'none') return;

    var rx = room.worldX, ry = room.worldY;
    var rw = room.w, rh = room.h;
    var cx = rx + rw / 2;
    var cy = ry + rh / 2;

    var pColor = skin.primaryColor || '#38bdf8';
    var sColor = skin.secondaryColor || '#0284c7';
    var cColor = skin.coreColor || '#ffffff';

    ctx.save();

    // =========================================================================
    // 1. 倾斜神圣流动光束 (Cinematic Sweeping God Rays / 丁达尔光隙流光)
    // =========================================================================
    var numBeams = 4;
    for (var bi = 0; bi < numBeams; bi++) {
      var beamPhase = timer * 1.2 + bi * 1.57;
      var beamAlpha = 0.08 + 0.06 * Math.sin(beamPhase) + 0.03 * Math.cos(timer * 2.4 + bi * 0.8);
      var sweepOffset = Math.sin(timer * 0.6 + bi * 1.2) * 55;
      var beamX0 = rx + (bi * (rw / 3.0)) - 60 + sweepOffset;
      var beamW = 100 + Math.sin(timer * 0.9 + bi) * 30;

      var bGrad = ctx.createLinearGradient(beamX0, ry, beamX0 + 260, ry + rh);
      bGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (beamAlpha * 2.2).toFixed(3) + ')');
      bGrad.addColorStop(0.25, (skin.primaryColor ? skin.primaryColor : 'rgba(56, 189, 248, 1)') );
      bGrad.addColorStop(0.7, (skin.secondaryColor ? skin.secondaryColor : 'rgba(14, 165, 233, 1)') );
      bGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, beamAlpha * 1.6);
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(beamX0, ry);
      ctx.lineTo(beamX0 + beamW, ry);
      ctx.lineTo(beamX0 + beamW + 260, ry + rh);
      ctx.lineTo(beamX0 + 200, ry + rh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // =========================================================================
    // 2. 根据背景皮肤渲染中央法阵 (Center Matrix Geometry)
    // =========================================================================

    // -------------------------------------------------------------------------
    // 皮肤 A:「四芒视界」—— 向心收缩的四芒星切线 / 视界光圈 / 极致锋芒准星
    // -------------------------------------------------------------------------
    if (bgSkinId === 'cross_blade') {
      var baseSpin = 0.6 + Math.min(3.6, combo * 0.22);
      var ang = timer * baseSpin;
      var pulse = 0.8 + 0.2 * Math.sin(timer * 4.0);
      var hollowR = 28;

      // 中心镂空区微弱聚气虚空
      var cRadGrad = ctx.createRadialGradient(cx, cy, hollowR, cx, cy, 140);
      cRadGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
      cRadGrad.addColorStop(0.2, 'rgba(56, 189, 248, ' + (0.12 * pulse).toFixed(3) + ')');
      cRadGrad.addColorStop(0.7, 'rgba(2, 6, 23, ' + (0.05 * pulse).toFixed(3) + ')');
      cRadGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.save();
      ctx.fillStyle = cRadGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 连击共鸣：向内收缩与向外斩切的四芒光波
      if (combo > 0) {
        var waveP = (timer * (1.2 + combo * 0.08)) % 1.0;
        var waveR = hollowR + waveP * 140;
        var waveAlpha = (1.0 - waveP) * (0.35 + Math.min(0.45, combo * 0.025));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang * 0.5);
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = waveAlpha;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -waveR);
        ctx.lineTo(waveR * 0.7, 0);
        ctx.lineTo(0, waveR);
        ctx.lineTo(-waveR * 0.7, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 主体：四芒向外弯曲、渐变收窄的锐利刀痕弧光
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);

      var slashLen = 150 + Math.sin(timer * 2.5) * 8 + Math.min(35, combo * 1.5);
      var sweepCurve = 55;

      for (var bi = 0; bi < 4; bi++) {
        var bAngle = bi * (Math.PI / 2);
        ctx.save();
        ctx.rotate(bAngle);

        // 外层副色晕光
        ctx.strokeStyle = sColor;
        ctx.globalAlpha = 0.55 * pulse;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(hollowR + 2, 8);
        ctx.quadraticCurveTo(hollowR + sweepCurve * 0.7, sweepCurve, slashLen, 0);
        ctx.stroke();

        // 中层主色锋芒
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.85 * pulse;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(hollowR + 3, 6);
        ctx.quadraticCurveTo(hollowR + sweepCurve * 0.65, sweepCurve * 0.85, slashLen, 0);
        ctx.stroke();

        // 极细高光刃芯
        ctx.strokeStyle = cColor;
        ctx.globalAlpha = 0.95 * pulse;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(hollowR + 4, 4);
        ctx.quadraticCurveTo(hollowR + sweepCurve * 0.6, sweepCurve * 0.75, slashLen + 8, 0);
        ctx.stroke();

        // 破空延伸刺线
        var tipGrad = ctx.createLinearGradient(slashLen - 10, 0, slashLen + 75, 0);
        tipGrad.addColorStop(0, pColor);
        tipGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = tipGrad;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.75 * pulse;
        ctx.beginPath();
        ctx.moveTo(slashLen, 0);
        ctx.lineTo(slashLen + 75, 0);
        ctx.stroke();

        // 准星刻度短切线
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.65 * pulse;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(slashLen * 0.6, -5);
        ctx.lineTo(slashLen * 0.6, 5);
        ctx.moveTo(slashLen * 0.82, -8);
        ctx.lineTo(slashLen * 0.82, 8);
        ctx.stroke();

        ctx.restore();
      }

      // 中心镂空视界准星框架
      ctx.lineWidth = 1.8;
      for (var qi = 0; qi < 4; qi++) {
        var qAng = qi * (Math.PI / 2) + Math.PI / 4;
        ctx.save();
        ctx.rotate(qAng);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.85 * pulse;
        var bDist = hollowR + 4;
        var bArm = 10;
        ctx.beginPath();
        ctx.moveTo(bDist, bDist - bArm);
        ctx.lineTo(bDist, bDist);
        ctx.lineTo(bDist - bArm, bDist);
        ctx.stroke();

        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(bDist, bDist, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // 恢复外层坐标系

      // 逆向副刃切线
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-ang * 1.5);
      for (var ci2 = 0; ci2 < 4; ci2++) {
        var cAng2 = ci2 * (Math.PI / 2);
        ctx.save();
        ctx.rotate(cAng2);
        var iLen = 95 + Math.sin(timer * 3.2 + ci2) * 6;
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.35 * pulse;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hollowR + 6, -4);
        ctx.quadraticCurveTo(hollowR + 35, -35, iLen, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // -------------------------------------------------------------------------
    // 皮肤 B:「极意三巴纹」—— 极坐标涡流场精确生成的日本传统三巴纹（Mitsudomoe），饱满勾玉追尾连环
    // -------------------------------------------------------------------------
    else if (bgSkinId === 'mitsudomoe') {
      var tomoeSpin = timer * (0.85 + Math.min(3.2, combo * 0.22)); // 随连击加速追尾旋转
      var tPulse = 0.82 + 0.18 * Math.sin(timer * 4.2);
      var outerR = 118; // 外圈包络半径
      var twistK = 2.15; // 空间涡流扭转系数 (产生极其自然的勾玉拖尾曲线)
      var segAngle = (Math.PI * 2) / 3; // 120度对称

      // (A) 外层包络轮廓与极简发光光环
      ctx.save();
      ctx.translate(cx, cy);

      // 1. 最外侧虚线共鸣光圈
      ctx.strokeStyle = pColor;
      ctx.globalAlpha = 0.35 * tPulse;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 10, 0, Math.PI * 2);
      ctx.stroke();

      // 2. 主包络外环 (实体细线)
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.65 * tPulse;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 三方位天极切点刻度
      ctx.save();
      ctx.rotate(tomoeSpin * 0.4);
      for (var ti = 0; ti < 3; ti++) {
        var tMarkAng = ti * segAngle;
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.75 * tPulse;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(tMarkAng) * (outerR - 6), Math.sin(tMarkAng) * (outerR - 6));
        ctx.lineTo(Math.cos(tMarkAng) * (outerR + 14), Math.sin(tMarkAng) * (outerR + 14));
        ctx.stroke();
      }
      ctx.restore();

      // (B) 连击共鸣：三旋向外扩散波
      if (combo > 0) {
        var tWaveP = (timer * (1.1 + combo * 0.08)) % 1.0;
        var tWaveR = 15 + tWaveP * (outerR + 25);
        var tWaveAlpha = (1.0 - tWaveP) * (0.35 + Math.min(0.4, combo * 0.02));
        ctx.save();
        ctx.rotate(tomoeSpin * 0.8);
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = tWaveAlpha;
        ctx.lineWidth = 1.5;
        for (var wi = 0; wi < 3; wi++) {
          var wAng = wi * segAngle;
          ctx.beginPath();
          ctx.arc(0, 0, tWaveR, wAng, wAng + segAngle * 0.6);
          ctx.stroke();
        }
        ctx.restore();
      }

      // (C) 核心主体：极坐标涡流场生成的 3 个饱满勾玉实体与发光轮廓
      ctx.save();
      ctx.rotate(tomoeSpin);

      // 计算单个勾玉的平滑多边形点集函数
      var getTomoePoints = function (baseAng, steps) {
        var pts = [];
        var n = steps || 48;

        // 1. 沿内侧拖尾曲线 (从中心向外边缘延展)
        for (var i = 0; i <= n; i++) {
          var t = i / n;
          var rNorm = 0.04 + 0.96 * t;
          var r = rNorm * outerR;
          var twist = twistK * (1.0 - rNorm);
          var ang = baseAng + twist;
          pts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
        }

        // 2. 沿外侧头部与弧身曲线 (从外边缘向中心回溯，加入非线性饱满正弦厚度)
        for (var j = n; j >= 0; j--) {
          var t2 = j / n;
          var rNorm2 = 0.04 + 0.96 * t2;
          var r2 = rNorm2 * outerR;
          var twist2 = twistK * (1.0 - rNorm2);
          // 头部在 rNorm 约 0.45~0.55 处达到最大饱满宽度
          var widthAng = Math.sin(Math.PI * Math.pow(rNorm2, 0.72)) * (segAngle * 0.58);
          var ang2 = baseAng + twist2 + widthAng;
          pts.push({ x: Math.cos(ang2) * r2, y: Math.sin(ang2) * r2 });
        }
        return pts;
      };

      // 逐个绘制 3 个勾玉
      for (var bi = 0; bi < 3; bi++) {
        var baseAng = bi * segAngle;
        var pts = getTomoePoints(baseAng, 48);

        // 1. 勾玉半透实体剪影填充 (Volumetric Translucent Fill)
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var p = 1; p < pts.length; p++) {
          ctx.lineTo(pts[p].x, pts[p].y);
        }
        ctx.closePath();

        // 渐变填充营造深邃质感
        var eyeRNorm = 0.48;
        var eyeTwist = twistK * (1.0 - eyeRNorm);
        var eyeW = Math.sin(Math.PI * Math.pow(eyeRNorm, 0.72)) * (segAngle * 0.58);
        var eyeAng = baseAng + eyeTwist + eyeW * 0.52;
        var eyeX = Math.cos(eyeAng) * (eyeRNorm * outerR);
        var eyeY = Math.sin(eyeAng) * (eyeRNorm * outerR);

        var grad = ctx.createRadialGradient(eyeX, eyeY, 4, eyeX, eyeY, outerR * 0.75);
        grad.addColorStop(0, pColor);
        grad.addColorStop(0.35, sColor);
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.2)');

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.28 * tPulse;
        ctx.fill();

        // 2. 勾玉外层柔和光晕描边 (Glow Stroke)
        ctx.strokeStyle = sColor;
        ctx.globalAlpha = 0.45 * tPulse;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 3. 勾玉主轮廓刃光 (Sharp Primary Stroke)
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.9 * tPulse;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 4. 勾玉内部高能脊流光 (Center Streamline)
        ctx.beginPath();
        for (var si = 2; si <= 44; si += 2) {
          var st = si / 48;
          var srNorm = 0.08 + 0.88 * st;
          var sr = srNorm * outerR;
          var stwist = twistK * (1.0 - srNorm);
          var sw = Math.sin(Math.PI * Math.pow(srNorm, 0.72)) * (segAngle * 0.58) * 0.5;
          var sang = baseAng + stwist + sw;
          var sx = Math.cos(sang) * sr;
          var sy = Math.sin(sang) * sr;
          if (si === 2) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.55 * tPulse;
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // 5. 巴之眼 (勾玉头部灵动神瞳 · Tomoe Eye)
        ctx.save();
        // 外层微光晕
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.6 * tPulse;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 6.5, 0, Math.PI * 2);
        ctx.stroke();

        // 白金眼环
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.9 * tPulse;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 4.2, 0, Math.PI * 2);
        ctx.stroke();

        // 瞳心极意发光核心
        ctx.fillStyle = pColor;
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 2.0, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔高光点
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX - 0.8, eyeY - 0.8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // (D) 中心神核微光点 (Center Focus Dot)
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85 * tPulse;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // 结束主体旋转
      ctx.restore(); // 结束位移
    }

    // -------------------------------------------------------------------------
    // 皮肤 C:「虚无曼陀罗」—— 双层反向旋转的虚无齿轮与极淡几何虚线框（极度心流催眠与专注）
    // -------------------------------------------------------------------------
    else if (bgSkinId === 'mandala') {
      var outerSpin = timer * (0.35 + Math.min(1.5, combo * 0.08)); // 外圈顺时针慢转
      var innerSpin = -timer * (1.2 + Math.min(3.8, combo * 0.22)); // 内圈逆时针快转
      var mPulse = 0.75 + 0.25 * Math.sin(timer * 3.2);

      // (A) 外层：多芒微细光环与 16 芒虚无几何齿轮 (顺时针慢转)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(outerSpin);

      // 1. 最外侧同心微细虚线圆
      ctx.strokeStyle = pColor;
      ctx.globalAlpha = 0.55 * mPulse;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 155, 0, Math.PI * 2);
      ctx.stroke();

      // 2. 次外层细实线圆 + 极细切线
      ctx.strokeStyle = sColor;
      ctx.globalAlpha = 0.4 * mPulse;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, 138, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 16 芒细齿几何切线与点阵
      ctx.lineWidth = 1.0;
      for (var mi1 = 0; mi1 < 16; mi1++) {
        var mAng1 = mi1 * (Math.PI / 8);
        var isOdd = mi1 % 2 === 1;
        var r1 = isOdd ? 138 : 124;
        var r2 = isOdd ? 162 : 155;
        
        ctx.strokeStyle = isOdd ? '#ffffff' : pColor;
        ctx.globalAlpha = (isOdd ? 0.6 : 0.35) * mPulse;
        ctx.beginPath();
        ctx.moveTo(Math.cos(mAng1) * r1, Math.sin(mAng1) * r1);
        ctx.lineTo(Math.cos(mAng1) * r2, Math.sin(mAng1) * r2);
        ctx.stroke();

        // 齿尖几何微晶点
        if (isOdd) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.8 * mPulse;
          ctx.beginPath();
          ctx.arc(Math.cos(mAng1) * r2, Math.sin(mAng1) * r2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. 外层正八边形与十二边形交错线框 (几何几何曼陀罗)
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.35 * mPulse;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (var oi = 0; oi <= 8; oi++) {
        var oAng = oi * (Math.PI / 4);
        var ox = Math.cos(oAng) * 118;
        var oy = Math.sin(oAng) * 118;
        if (oi === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore(); // 结束外层

      // (B) 内层：逆向快转的小圆环与几何阵眼 (逆时针快转)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(innerSpin);

      // 1. 内层虚线双圈
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.75 * mPulse;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = pColor;
      ctx.globalAlpha = 0.6 * mPulse;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. 8 芒内圈高频齿线与切向细切痕
      for (var mi2 = 0; mi2 < 8; mi2++) {
        var mAng2 = mi2 * (Math.PI / 4);
        var inR1 = 38;
        var inR2 = 72;
        ctx.strokeStyle = sColor;
        ctx.globalAlpha = 0.65 * mPulse;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(mAng2) * inR1, Math.sin(mAng2) * inR1);
        ctx.lineTo(Math.cos(mAng2) * inR2, Math.sin(mAng2) * inR2);
        ctx.stroke();

        // 尖端点
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85 * mPulse;
        ctx.beginPath();
        ctx.arc(Math.cos(mAng2) * inR2, Math.sin(mAng2) * inR2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 核心内圈正方形交错对角线 (菱形几何核心)
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.5 * mPulse;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-28, 0); ctx.lineTo(28, 0);
      ctx.moveTo(0, -28); ctx.lineTo(0, 28);
      ctx.stroke();

      ctx.restore(); // 结束内层

      // (C) 连击共鸣：同心微细虚线扩散波
      if (combo > 0) {
        var mWaveP = (timer * (1.0 + combo * 0.06)) % 1.0;
        var mWaveR = 25 + mWaveP * 160;
        var mWaveAlpha = (1.0 - mWaveP) * (0.4 + Math.min(0.4, combo * 0.02));
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = mWaveAlpha;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, mWaveR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // -------------------------------------------------------------------------
    // 皮肤 C:「极道罗盘」—— 经典 12 方位剑符罗盘、八芒星阵与双层阵轮
    // -------------------------------------------------------------------------
    else if (bgSkinId === 'compass') {
      var cBaseSpin = 0.7 + Math.min(3.5, combo * 0.25);
      var cAng = timer * cBaseSpin;
      var cPulse = 0.75 + 0.25 * Math.sin(timer * 3.5);

      // (A) 罗盘中心聚气光晕
      var compassGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 175);
      compassGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.35 * cPulse).toFixed(3) + ')');
      compassGrad.addColorStop(0.3, pColor);
      compassGrad.addColorStop(0.7, sColor);
      compassGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.save();
      ctx.globalAlpha = (0.22 + Math.min(0.35, combo * 0.015)) * cPulse;
      ctx.fillStyle = compassGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 175, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // (B) 连击共鸣同心冲击波
      if (combo > 0) {
        var cWaveP = (timer * (1.2 + combo * 0.08)) % 1.0;
        var cWaveR = 25 + cWaveP * 150;
        var cWaveAlpha = (1.0 - cWaveP) * (0.35 + Math.min(0.45, combo * 0.02));
        ctx.save();
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = cWaveAlpha;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, cWaveR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // (C) 顺时针旋转的主外环与 12 方位剑符
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(cAng);

      ctx.strokeStyle = pColor;
      ctx.globalAlpha = 0.75 * cPulse;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.55 * cPulse;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 148, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.lineWidth = 2.0;
      for (var ki = 0; ki < 12; ki++) {
        var kAngle = ki * (Math.PI / 6);
        var isMajor = ki % 3 === 0;
        var rInner = isMajor ? 115 : 126;
        var rOuter = isMajor ? 144 : 138;
        ctx.strokeStyle = isMajor ? '#ffffff' : pColor;
        ctx.globalAlpha = isMajor ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(kAngle) * rInner, Math.sin(kAngle) * rInner);
        ctx.lineTo(Math.cos(kAngle) * rOuter, Math.sin(kAngle) * rOuter);
        ctx.stroke();
      }

      // 八芒破空星阵
      ctx.lineWidth = 1.8;
      for (var starI = 0; starI < 2; starI++) {
        var sRot = starI * (Math.PI / 4);
        ctx.save();
        ctx.rotate(sRot);
        ctx.strokeStyle = starI === 0 ? pColor : '#ffffff';
        ctx.globalAlpha = (starI === 0 ? 0.65 : 0.45) * cPulse;
        var sHalf = 68;
        ctx.strokeRect(-sHalf, -sHalf, sHalf * 2, sHalf * 2);
        ctx.restore();
      }

      ctx.restore();

      // (D) 逆时针反向旋转阵轮
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-cAng * 1.35);

      ctx.strokeStyle = sColor;
      ctx.globalAlpha = 0.8 * cPulse;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      for (var gi = 0; gi < 8; gi++) {
        var gAng = gi * (Math.PI / 4);
        var gx = Math.cos(gAng) * 75;
        var gy = Math.sin(gAng) * 75;
        ctx.globalAlpha = 0.85 * cPulse;
        ctx.beginPath();
        ctx.arc(gx, gy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9 * cPulse;
      ctx.beginPath();
      ctx.moveTo(-32, 0); ctx.lineTo(32, 0);
      ctx.moveTo(0, -32); ctx.lineTo(0, 32);
      ctx.stroke();

      ctx.restore();
    }

    // =========================================================================
    // 3. 四角道场神柱与微光闪烁 (Corner Pillars & Flickering Beacons)
    // =========================================================================
    var corners = [
      { x: rx + 38, y: ry + 38 },
      { x: rx + rw - 38, y: ry + 38 },
      { x: rx + 38, y: ry + rh - 38 },
      { x: rx + rw - 38, y: ry + rh - 38 }
    ];
    for (var ci = 0; ci < corners.length; ci++) {
      var cPos = corners[ci];
      var flicker = 0.7 + 0.2 * Math.sin(timer * 4.5 + ci * 1.8) + 0.1 * Math.sin(timer * 12.0 + ci * 2.5);
      flicker = Math.max(0.4, Math.min(1.0, flicker));

      var cGrad = ctx.createRadialGradient(cPos.x, cPos.y, 4, cPos.x, cPos.y, 75);
      cGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (flicker * 0.9).toFixed(3) + ')');
      cGrad.addColorStop(0.25, pColor);
      cGrad.addColorStop(0.65, sColor);
      cGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');

      ctx.globalAlpha = flicker * 0.65;
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, 75, 0, Math.PI * 2);
      ctx.fill();

      // 灯柱核心晶体
      ctx.globalAlpha = flicker * 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================================
    // 4. 环境升腾灵气微尘与萤火浮光 (Rising Spirit Motes)
    // =========================================================================
    var numMotes = 28;
    for (var mi = 0; mi < numMotes; mi++) {
      var seed = (mi * 9301 + 49297) % 233280;
      var normSeed = seed / 233280;
      var seed2 = (mi * 49297 + 9301) % 233280;
      var normSeed2 = seed2 / 233280;

      var moteSpeed = 22 + normSeed * 30;
      var moteY = ry + ((normSeed2 * rh - timer * moteSpeed) % rh + rh) % rh;
      var moteX = rx + (normSeed * rw + Math.sin(timer * 1.8 + mi * 1.1) * 40) % rw;
      var moteSize = 1.8 + (normSeed * 2.5);
      var mAlpha = (0.35 + 0.45 * Math.sin(timer * 2.5 + mi * 1.5));

      if (moteY > ry + 30 && moteY < ry + rh - 30) {
        ctx.globalAlpha = Math.max(0.1, Math.min(0.9, mAlpha));
        ctx.fillStyle = (mi % 3 === 0) ? '#ffffff' : pColor;
        ctx.beginPath();
        ctx.arc(moteX, moteY, moteSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // =========================================================================
    // 5. 高连击全域流光边界 (High Combo Border Pulse)
    // =========================================================================
    if (combo >= 5) {
      var comboScale = Math.min(1.0, (combo - 5) / 20);
      var borderPulse = 0.4 + 0.3 * Math.sin(timer * 7.0);
      ctx.globalAlpha = borderPulse * comboScale;
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 3 + comboScale * 3;
      ctx.strokeRect(rx + 10, ry + 10, rw - 20, rh - 20);
    }

    ctx.restore();
  }
};
