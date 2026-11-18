// ============================================================================
// 居合斩专属模块 · 靶位与飞梭靶系统 (Iaijutsu Targets & Shuttle Mechanics)
// ============================================================================

window.IaijutsuTargets = {
  TYPE_NORMAL: 'normal',
  TYPE_SPECIAL: 'special',
  TYPE_SHUTTLE: 'shuttle',

  /**
   * 生成单个居合靶子
   * @param {Object} room 房间边界对象
   * @param {Object} player 玩家对象
   * @param {Object} opts 生成配置 (type, x, y, time)
   */
  createDummy: function (room, player, opts) {
    opts = opts || {};
    var rx = room ? room.worldX : (Player.x - 400);
    var ry = room ? room.worldY : (Player.y - 300);
    var pad = 130;
    var w = room ? (room.w || CFG.W) : CFG.W;
    var h = room ? (room.h || CFG.H) : CFG.H;

    var ang = Math.random() * Math.PI * 2;
    var dist = 90 + Math.random() * 240;
    var dx = opts.x !== undefined ? opts.x : Utils.clamp(player.x + Math.cos(ang) * dist, rx + pad, rx + w - pad);
    var dy = opts.y !== undefined ? opts.y : Utils.clamp(player.y + Math.sin(ang) * dist, ry + pad, ry + h - pad);

    var type = opts.type || this.TYPE_NORMAL;
    var isSpecial = (type === this.TYPE_SPECIAL);
    var isShuttle = (type === this.TYPE_SHUTTLE);

    var baseRadius = isSpecial ? 26 : (isShuttle ? 22 : 24);
    var maxTime = opts.time || (isSpecial ? 6.5 : (isShuttle ? 5.8 : 5.0));

    // 飞梭靶 (Shuttle) 专属动力学参数：固定在一定范围内水平(左右)或垂直(上下)巡逻
    var isShuttle = (type === this.TYPE_SHUTTLE);
    var shuttleAxis = Math.random() < 0.5 ? 'h' : 'v'; // 'h': 左右横向, 'v': 上下纵向
    var shuttleRange = 90 + Math.random() * 45;         // 巡逻半径 (在生成点附近往返)
    var shuttleSpeed = 90 + Math.random() * 40;         // 适度巡航速度
    var shuttleDir = Math.random() < 0.5 ? 1 : -1;

    return {
      id: Math.random(),
      type: type,
      x: dx,
      y: dy,
      startX: dx,
      startY: dy,
      centerX: dx,
      centerY: dy,
      r: baseRadius,
      time: maxTime,
      maxTime: maxTime,
      isSpecial: isSpecial,
      isShuttle: isShuttle,
      pulse: Math.random() * Math.PI * 2,

      // 飞梭靶轴向运动字段
      axis: shuttleAxis,
      range: shuttleRange,
      speed: shuttleSpeed,
      dir: shuttleDir,
      vx: isShuttle ? (shuttleAxis === 'h' ? shuttleSpeed * shuttleDir : 0) : 0,
      vy: isShuttle ? (shuttleAxis === 'v' ? shuttleSpeed * shuttleDir : 0) : 0,
      trail: isShuttle ? [] : null,       // 光翼残影拖尾点集
      trailTimer: 0
    };
  },

  /**
   * 更新靶子物理运动与状态
   * @param {Object} dummy 靶位对象
   * @param {number} dt 帧间隔
   * @param {Object} room 房间对象
   * @param {Array} particles 粒子数组
   */
  updateDummy: function (dummy, dt, room, particles) {
    dummy.pulse += dt * 4.5;

    // 飞梭靶：在生成点附近的固定范围内核定上下或左右往返移动
    if (dummy.isShuttle) {
      var rx = room ? room.worldX : (dummy.centerX - 400);
      var ry = room ? room.worldY : (dummy.centerY - 300);
      var pad = 95;
      var minX = rx + pad, maxX = rx + (room ? (room.w || CFG.W) : CFG.W) - pad;
      var minY = ry + pad, maxY = ry + (room ? (room.h || CFG.H) : CFG.H) - pad;

      if (dummy.axis === 'h') {
        // 左右水平往返移动
        dummy.x += dummy.speed * dummy.dir * dt;
        var maxPatrolX = Math.min(maxX, dummy.centerX + dummy.range);
        var minPatrolX = Math.max(minX, dummy.centerX - dummy.range);

        if (dummy.x >= maxPatrolX) {
          dummy.x = maxPatrolX;
          dummy.dir = -1;
        } else if (dummy.x <= minPatrolX) {
          dummy.x = minPatrolX;
          dummy.dir = 1;
        }
        dummy.vx = dummy.speed * dummy.dir;
        dummy.vy = 0;
        dummy.y = dummy.centerY;
      } else {
        // 上下垂直往返移动
        dummy.y += dummy.speed * dummy.dir * dt;
        var maxPatrolY = Math.min(maxY, dummy.centerY + dummy.range);
        var minPatrolY = Math.max(minY, dummy.centerY - dummy.range);

        if (dummy.y >= maxPatrolY) {
          dummy.y = maxPatrolY;
          dummy.dir = -1;
        } else if (dummy.y <= minPatrolY) {
          dummy.y = minPatrolY;
          dummy.dir = 1;
        }
        dummy.vy = dummy.speed * dummy.dir;
        dummy.vx = 0;
        dummy.x = dummy.centerX;
      }

      // 飞梭靶光翼残影记录
      if (dummy.trail) {
        dummy.trailTimer = (dummy.trailTimer || 0) + dt;
        if (dummy.trailTimer >= 0.035) {
          dummy.trailTimer = 0;
          var curMoveAng = Math.atan2(dummy.vy, dummy.vx);
          dummy.trail.unshift({ x: dummy.x, y: dummy.y, angle: curMoveAng, life: 0.22 });
          if (dummy.trail.length > 5) dummy.trail.pop();
        }
        for (var ti = dummy.trail.length - 1; ti >= 0; ti--) {
          dummy.trail[ti].life -= dt;
          if (dummy.trail[ti].life <= 0) dummy.trail.splice(ti, 1);
        }
      }

      // 飞梭尾喷粒子
      if (particles && Math.random() < 0.3) {
        var pMoveAng = Math.atan2(dummy.vy, dummy.vx);
        var jetAng = pMoveAng + Math.PI + (Math.random() - 0.5) * 0.4;
        particles.push({
          x: dummy.x - Math.cos(pMoveAng) * 12,
          y: dummy.y - Math.sin(pMoveAng) * 12,
          vx: Math.cos(jetAng) * (35 + Math.random() * 50),
          vy: Math.sin(jetAng) * (35 + Math.random() * 50),
          size: 2.2 + Math.random() * 2,
          color: Math.random() < 0.5 ? '#38bdf8' : '#a855f7',
          life: 0.16,
          maxLife: 0.16
        });
      }
    }
  },

  /**
   * 绘制靶子外观
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {Object} d 靶位数据
   * @param {Object} skin 当前装备的皮肤
   */
  drawDummy: function (ctx, d, skin) {
    var progress = Math.max(0, Math.min(1, d.time / d.maxTime));
    ctx.save();

    if (d.isSpecial) {
      // 1. 狂暴黄金靶 (3%概率，10s冷却，击杀触发3s无限居合)
      var auraScale = 1.0 + Math.sin(d.pulse) * 0.12;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * auraScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 旋转双环
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.pulse);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, d.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 环形倒计时进度条 (炫光金)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 12, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', d.x, d.y);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;
      ctx.fillText('⚡ 狂暴·3s无限', d.x, d.y - d.r - 16);

    } else if (d.isShuttle) {
      // 2. 移动/飞梭靶 (灵动高速巡航穿梭靶 🛸/🚀)
      // 绘制残影拖尾
      if (d.trail && d.trail.length > 0) {
        for (var ti = 0; ti < d.trail.length; ti++) {
          var tr = d.trail[ti];
          var trAlpha = Math.max(0, tr.life / 0.25) * 0.45;
          ctx.save();
          ctx.translate(tr.x, tr.y);
          ctx.rotate(tr.angle);
          ctx.fillStyle = 'rgba(56, 189, 248, ' + trAlpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-10, -8);
          ctx.lineTo(-5, 0);
          ctx.lineTo(-10, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // 飞梭本体发光光晕与流线型护盾
      var curAngle = Math.atan2(d.vy, d.vx) || d.pulse;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(curAngle);

      // 流光穿梭护盾
      var shieldGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, d.r + 6);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      shieldGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.2)');
      shieldGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, d.r + 6, 0, Math.PI * 2);
      ctx.fill();

      // 飞梭流线型三角核心 (Aerodynamic Hull)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内层等离子光翼棱线
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, -6);
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, 6);
      ctx.stroke();

      // 尾部动力喷口高亮焰芯
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-8, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 飞梭靶倒计时环形光轨 (青紫双色渐变)
      ctx.strokeStyle = progress > 0.3 ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      // 动态标识
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText('🚀 飞梭·疾风', d.x, d.y - d.r - 14);

    } else {
      // 3. 普通弱点木桩傀儡
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.strokeStyle = skin.primaryColor || '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 环形倒计时进度条
      ctx.strokeStyle = progress > 0.3 ? (skin.primaryColor || '#38bdf8') : '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 6, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎎', d.x, d.y);
    }
    ctx.restore();
  }
};
