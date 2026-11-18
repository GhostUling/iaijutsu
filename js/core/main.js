// ===== 主控：相机、游戏循环、粒子/特效/飘字/拖尾、光照与滤镜 =====
// 说明：渲染管线与 game4 的 Main 保持一致（同样的绘制顺序与同样的公式），
// 只剥离了与本作无关的系统（地牢/Boss/子弹/背包…）。
var Main = {
  VERSION: 'iaijutsu-standalone-1.0',
  canvas: null,
  ctx: null,
  lastTime: 0,
  camX: 0,
  camY: 0,
  dashTrail: [],
  hitstop: 0,
  timeScale: 1,
  shakeTrauma: 0,
  dmgTexts: [],
  screenFlash: 0,
  screenFlashColor: '255,255,255',
  ambient: [],
  decals: [],
  _lightCanvas: null,
  _lightCtx: null,

  init: function () {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');

    Input.init(this.canvas);
    UI.init(this.canvas);

    this.lastTime = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  },

  _frameErr: function (phase, err) {
    var msg = (err && err.message) || String(err);
    var sig = phase + ':' + msg;
    var now = Date.now();
    if (this._frameErrSig === sig && now - (this._frameErrAt || 0) < 3000) return;
    this._frameErrSig = sig; this._frameErrAt = now;
    console.error('[Frame Error @' + phase + ']:', err);
  },

  _loop: function (now) {
    // 与 game4 完全一致：可变步长，单帧上限 0.05s
    var dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    try { this.update(dt); } catch (err) { this._frameErr('update', err); }
    try { this.render(); } catch (err) { this._frameErr('render', err); }

    requestAnimationFrame(this._loop.bind(this));
  },

  update: function (dt) {
    this.timeScale += (1 - this.timeScale) * Math.min(1, dt * 2);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 3.2);

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    dt *= this.timeScale;
    if (Game.state === 'PLAYING') Game.playTime += dt;

    if (Game.damageFlash > 0) Game.damageFlash = Math.max(0, Game.damageFlash - dt);

    for (var i = Game.particles.length - 1; i >= 0; i--) {
      var pt = Game.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
      pt.vx *= 0.92;
      pt.vy *= 0.92;
      if (pt.life <= 0) Game.particles.splice(i, 1);
    }
    if (Game.particles.length > 400) {
      Game.particles.splice(0, Game.particles.length - 400);
    }

    for (var ei = Game.effects.length - 1; ei >= 0; ei--) {
      var ef = Game.effects[ei];
      ef.t -= dt;
      if (ef.t <= 0) Game.effects.splice(ei, 1);
    }

    for (var dti = this.dmgTexts.length - 1; dti >= 0; dti--) {
      var txt = this.dmgTexts[dti];
      txt.t -= dt;
      txt.y += txt.vy * dt;
      if (txt.t <= 0) this.dmgTexts.splice(dti, 1);
    }

    if (CFG.debug.ambientDust !== false) this._updateAmbient(dt);
    for (var dci = this.decals.length - 1; dci >= 0; dci--) {
      this.decals[dci].t -= dt;
      if (this.decals[dci].t <= 0) this.decals.splice(dci, 1);
    }

    if (this.dashTrail && this.dashTrail.length) {
      for (var trI = this.dashTrail.length - 1; trI >= 0; trI--) {
        var trP = this.dashTrail[trI];
        trP.t -= dt;
        if (trP.t <= 0) this.dashTrail.splice(trI, 1);
      }
    }

    if (Game.state !== 'PLAYING') return;

    // 居合斩运行态：整帧逻辑交给小游戏宿主
    if (window.MiniGames && MiniGames.active) { MiniGames.update(dt); return; }
  },

  render: function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    if (CFG.debug.renderReset !== false) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = 'rgba(0,0,0,0)';
    }

    ctx.fillStyle = '#0f1320';
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    if (CFG.debug.renderReset !== false) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f1320';
      ctx.fillRect(0, 0, 1, 1);
      ctx.restore();
    }

    // 世界坐标系（带屏幕震动偏移）
    ctx.save();
    var shOff = this._shakeOffset();
    ctx.translate(-Math.round(this.camX + shOff.x), -Math.round(this.camY + shOff.y));

    if (window.MiniGames && MiniGames.active) {
      MiniGames.render(ctx);

      // 以下世界层实体只在特训进行中绘制（标题/结算时画面留给 DOM 覆盖层）
      this._renderWorldEntities(ctx);
    }

    ctx.restore();

    this._renderScreenLayers(ctx);
  },

  // 玩家 / 飘字 / 残影 / 环境微粒 / 粒子 / 一次性特效（顺序与 game4 的 Main.render 相同）
  _renderWorldEntities: function (ctx) {
    // 玩家辉光画在角色下层，角色始终清晰不透明
    this._drawGlow(ctx, Player.x, Player.y, 'rgba(255,200,120,0.35)', 100, 0.26);
    Player.render(ctx);

    // 伤害飘字（带暴击放大与发光轮廓）
    for (var dtj = 0; dtj < this.dmgTexts.length; dtj++) {
      var dt2 = this.dmgTexts[dtj];
      var dta = Utils.clamp(dt2.t / 0.7, 0, 1);
      var isCrit = dt2.color === '#ffcc00' || dt2.color === '#ff3366' || (dt2.text && dt2.text.indexOf('暴击') !== -1);
      var scale = isCrit ? (1 + (1 - dta) * 0.35) : 1;

      ctx.save();
      ctx.translate(dt2.x, dt2.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = dta;
      ctx.font = isCrit ? '900 18px "Segoe UI", sans-serif' : 'bold 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = isCrit ? 4.5 : 3;
      ctx.strokeText(dt2.text, 0, 0);

      if (isCrit) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = dt2.color;
      }
      ctx.fillStyle = dt2.color;
      ctx.fillText(dt2.text, 0, 0);
      ctx.restore();
    }

    // 居合斩能量幻影残影与离子拖尾（八套皮肤各一组配色）
    for (var trJ = 0; trJ < this.dashTrail.length; trJ++) {
      var tr = this.dashTrail[trJ];
      var maxLife = tr.maxT || 0.35;
      var trA = Utils.clamp(tr.t / maxLife, 0, 1);
      var trSkin = tr.skin || (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin ? MiniGames.getEquippedIaiSkin() : null);
      var sId = trSkin ? trSkin.id : 'classic';

      ctx.save();
      ctx.lineCap = 'round';
      var tx0 = tr.x - Math.cos(tr.a) * 22;
      var ty0 = tr.y - Math.sin(tr.a) * 22;
      var tx1 = tr.x + Math.cos(tr.a) * 8;
      var ty1 = tr.y + Math.sin(tr.a) * 8;

      if (sId === 'zen') {
        ctx.strokeStyle = 'rgba(10, 15, 29, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 2.8 * trA + 0.8;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 1.0 * trA;
        ctx.stroke();
      } else if (sId === 'sakura') {
        ctx.strokeStyle = 'rgba(225, 29, 72, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(244, 114, 182, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.2 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      } else if (sId === 'crimson') {
        ctx.strokeStyle = 'rgba(220, 38, 38, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 107, 0, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.5 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 240, 138, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      } else if (sId === 'thunder') {
        ctx.strokeStyle = 'rgba(124, 58, 237, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(6, 182, 212, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.2 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      } else if (sId === 'aurum') {
        ctx.strokeStyle = 'rgba(217, 119, 6, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(250, 204, 21, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.5 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      } else if (sId === 'void') {
        ctx.strokeStyle = 'rgba(88, 28, 135, ' + (trA * 0.85).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 0, 127, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.2 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(186, 230, 253, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(37, 99, 235, ' + (trA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 6.5 * trA + 2;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 240, 255, ' + (trA * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 3.2 * trA + 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (trA * 0.98).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * trA;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 环境微粒
    if (CFG.debug.ambientDust !== false) {
      for (var ai3 = 0; ai3 < this.ambient.length; ai3++) {
        var ad = this.ambient[ai3];
        var lifeRatio = Utils.clamp(ad.life / (ad.maxLife || 6), 0, 1);
        var pulse = 0.4 + 0.6 * Math.max(0, Math.sin(ad.phase));
        var alpha = lifeRatio * pulse;

        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha * 0.75);
        ctx.fillStyle = ad.color;

        if (ad.kind === 'firefly') {
          ctx.beginPath();
          ctx.arc(ad.x, ad.y, ad.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (ad.kind === 'stardust') {
          ctx.translate(ad.x, ad.y);
          ctx.rotate(ad.phase * 0.5);
          var ss = ad.size;
          ctx.fillRect(-ss / 2, -ss / 2, ss, ss);
        } else if (ad.kind === 'leaf') {
          ctx.translate(ad.x, ad.y);
          ctx.rotate(ad.phase);
          ctx.beginPath();
          ctx.ellipse(0, 0, ad.size * 1.6, ad.size * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(ad.x, ad.y, ad.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    for (var j = 0; j < Game.particles.length; j++) {
      var pt = Game.particles[j];
      ctx.globalAlpha = Utils.clamp(pt.life / pt.maxLife, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = pt.color;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      if (pt.spin) ctx.rotate(pt.spin * (1 - pt.life / pt.maxLife));
      var ps = pt.size;
      if (pt.emoji) {
        var spr = this._emojiSprite(pt.emoji, pt.size);
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      } else if (pt.shape === 'diamond') {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-ps / 2, -ps / 2, ps, ps);
      } else if (pt.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -ps / 2);
        ctx.lineTo(ps / 2, ps / 2);
        ctx.lineTo(-ps / 2, ps / 2);
        ctx.closePath();
        ctx.fill();
      } else if (pt.shape === 'ring') {
        ctx.beginPath();
        ctx.arc(0, 0, ps / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.shape === 'star') {
        ctx.beginPath();
        for (var sp2 = 0; sp2 < 8; sp2++) {
          var rad2 = sp2 % 2 === 0 ? ps / 2 : ps / 6;
          var sa2 = (sp2 / 8) * Math.PI * 2 - Math.PI / 2;
          var sx2 = Math.cos(sa2) * rad2, sy2 = Math.sin(sa2) * rad2;
          if (sp2 === 0) ctx.moveTo(sx2, sy2); else ctx.lineTo(sx2, sy2);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, ps / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // 一次性特效：刀光弧斩 / 冲击环
    for (var k = 0; k < Game.effects.length; k++) {
      var ef = Game.effects[k];
      if (ef.type === 'ring') {
        var rp = 1 - Utils.clamp(ef.t / ef.t0, 0, 1);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.size * (0.2 + rp * 0.8), 0, Math.PI * 2);
        ctx.strokeStyle = ef.color;
        ctx.globalAlpha = Utils.clamp(ef.t / ef.t0, 0, 1) * 0.85;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (ef.type === 'slash') {
        var swp = 1 - Utils.clamp(ef.t / ef.t0, 0, 1);
        ctx.save();
        ctx.translate(ef.x, ef.y);
        ctx.rotate(ef.angle - ef.half);
        ctx.globalAlpha = Utils.clamp(ef.t / ef.t0, 0, 1);
        var arcR = ef.range * (0.4 + swp * 0.7);
        ctx.shadowBlur = 15;
        ctx.shadowColor = ef.color;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4 + swp * 6;
        ctx.beginPath();
        ctx.arc(0, 0, arcR, 0, ef.half * 2 * swp);
        ctx.stroke();
        ctx.globalAlpha *= 0.55;
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 11 + swp * 10;
        ctx.beginPath();
        ctx.arc(0, 0, arcR * 0.94, 0, ef.half * 2 * swp);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  },

  // 屏幕空间层级：光照 / 暗角 / 全屏闪光 / 受伤红闪 / CRT
  _renderScreenLayers: function (ctx) {
    if (CFG.debug.lighting !== false) this._applyLighting(ctx);

    ctx.fillStyle = this._getVignette();
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    if (this.screenFlash > 0) {
      ctx.fillStyle = 'rgba(' + this.screenFlashColor + ',' + this.screenFlash.toFixed(3) + ')';
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }

    if (Game.damageFlash > 0) {
      ctx.fillStyle = 'rgba(255,40,60,' + (Game.damageFlash * 0.9).toFixed(3) + ')';
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }

    this._renderCRTFilter(ctx);
  },

  // ==================== 相机震动 ====================
  _shakeOffset: function () {
    var t = this.shakeTrauma;
    if (t <= 0) return { x: 0, y: 0 };
    var time = performance.now() * 0.05;
    var maxOffset = t * t * 25;
    return {
      x: Math.sin(time) * Math.cos(time * 0.8) * maxOffset,
      y: Math.sin(time * 1.1 + 2) * Math.cos(time * 0.9) * maxOffset
    };
  },

  // ==================== 粒子 / 特效基础件 ====================
  _xyOk: function (x, y) {
    return typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y);
  },

  _burst: function (x, y, color, n) {
    for (var i = 0; i < n; i++) {
      if (Game.particles.length > 360) return;
      var ang = Math.random() * Math.PI * 2;
      var sp = Utils.rand(40, 180);
      Game.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: Utils.rand(0.25, 0.5),
        maxLife: 0.5,
        color: color,
        size: Utils.rand(2, 5),
      });
    }
  },

  _emojiBurst: function (x, y, emoji, n, spMin, spMax, life, size) {
    if (!this._xyOk(x, y)) return;
    for (var i = 0; i < n; i++) {
      if (Game.particles.length > 360) return;
      var ang = Math.random() * Math.PI * 2;
      var sp = Utils.rand(spMin, spMax);
      Game.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: Utils.rand(life * 0.5, life),
        maxLife: life,
        emoji: emoji,
        size: Utils.rand(size * 0.75, size * 1.3),
        spin: Utils.rand(-4, 4),
      });
    }
  },

  _ring: function (x, y, color, size, life) {
    if (!this._xyOk(x, y)) return;
    Game.effects.push({ type: 'ring', x: x, y: y, t: life, t0: life, color: color, size: size });
  },

  _slashFx: function (x, y, angle, range, half, color, life) {
    Game.effects.push({ type: 'slash', x: x, y: y, angle: angle, range: range, half: half, color: color, t: life, t0: life });
  },

  fxSwing: function (x, y, angle, color) {
    var pColor = color || (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin ? MiniGames.getEquippedIaiSkin().primaryColor : '#38bdf8');
    var slashCol = (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin) ? MiniGames.getEquippedIaiSkin().slashColor : 'rgba(150,210,255,0.85)';
    for (var i = 0; i < 10; i++) {
      var a = angle + Utils.rand(-0.9, 0.9);
      var d = Utils.rand(30, 72);
      Game.particles.push({
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        vx: Math.cos(a) * Utils.rand(40, 140),
        vy: Math.sin(a) * Utils.rand(40, 140),
        life: Utils.rand(0.15, 0.3), maxLife: 0.3,
        color: Utils.pick([pColor, '#ffffff', '#ffffff']), size: Utils.rand(3, 6),
      });
    }
    this._emojiBurst(x, y, '🗡️', 1, 40, 120, 0.3, 16);
    this._slashFx(x, y, angle, 100, 0.95, slashCol, 0.22);
  },

  fxDash: function (x, y, angle, color) {
    var pColor = color || (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin ? MiniGames.getEquippedIaiSkin().primaryColor : '#ffffff');
    for (var i = 0; i < 8; i++) {
      Game.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * Utils.rand(160, 320) + Utils.rand(-40, 40),
        vy: Math.sin(angle) * Utils.rand(160, 320) + Utils.rand(-40, 40),
        life: Utils.rand(0.2, 0.35), maxLife: 0.35,
        color: pColor, size: Utils.rand(3, 6), shape: 'star',
      });
    }
    this._emojiBurst(x, y, '⚡', 3, 120, 260, 0.3, 16);
    this._ring(x, y, pColor, 30, 0.25);
  },

  addDmgText: function (x, y, text, color) {
    if (!this._xyOk(x, y)) return;
    if (this.dmgTexts.length > 30) this.dmgTexts.shift();
    var isCrit = color === '#ff8ca0';
    this.dmgTexts.push({
      x: x + Utils.rand(-8, 8),
      y: y,
      text: '' + text,
      color: color,
      t: 0.8,
      t0: 0.8,
      vy: Utils.rand(-60, -90),
      vx: Utils.rand(-25, 25),
      isCrit: isCrit
    });
  },

  // ==================== 光晕 / emoji 精灵 ====================
  _glowSprite: function (color) {
    if (!this._glowCache) this._glowCache = {};
    var c = this._glowCache[color];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.2, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    this._glowCache[color] = c;
    return c;
  },

  _drawGlow: function (ctx, x, y, color, radius, alpha) {
    var spr = this._glowSprite(color);
    ctx.save();
    if (CFG.debug.glowLighter !== false) {
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
    ctx.drawImage(spr, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  },

  _emojiSprite: function (emoji, size) {
    size = Math.max(8, Math.round((size || 14) / 2) * 2);
    var key = emoji + '@' + size;
    if (!this._emojiCache) this._emojiCache = {};
    var c = this._emojiCache[key];
    if (c) return c;
    c = document.createElement('canvas');
    var d = Math.round(size * 1.6);
    c.width = d;
    c.height = d;
    var g = c.getContext('2d');
    g.font = size + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, d / 2, d / 2 + size * 0.06);
    this._emojiCache[key] = c;
    return c;
  },

  // ==================== 环境微粒（第一章熔岩余烬，同 game4 的随机序列） ====================
  _updateAmbient: function (dt) {
    var list = this.ambient;
    var maxParticles = 28;

    while (list.length < maxParticles) {
      // 注意：这 4 个初始随机数与 game4 一样先消耗掉（随后被章节分支覆盖），
      // 删掉它们会让整个随机序列错位，直接影响靶子生成与手感，务必保留。
      var kind = 'dust';
      var vx = Utils.rand(-10, 10);
      var vy = Utils.rand(-14, -4);
      var size = Utils.rand(1.2, 3);
      var life = Utils.rand(3.5, 9);
      var color = '#9fb4d8';

      // 第一章：恶魔熔岩热浪余烬
      kind = 'ember';
      vy = Utils.rand(-26, -10);
      vx = Utils.rand(-12, 12);
      size = Utils.rand(1.2, 3.0);
      color = Math.random() < 0.5 ? '#ff4d26' : (Math.random() < 0.5 ? '#ff9933' : '#ffcc00');

      list.push({
        x: this.camX + Utils.rand(-80, CFG.W + 80),
        y: this.camY + Utils.rand(-80, CFG.H + 80),
        vx: vx, vy: vy,
        life: life, maxLife: life,
        size: size,
        kind: kind,
        color: color,
        phase: Utils.rand(0, Math.PI * 2),
      });
    }

    for (var i = list.length - 1; i >= 0; i--) {
      var d = list[i];
      d.x += (d.vx + Math.sin(d.phase) * 6) * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      d.phase += dt * (d.kind === 'firefly' ? 3.2 : 1.8);
      if (d.life <= 0 || d.x < this.camX - 140 || d.x > this.camX + CFG.W + 140 ||
          d.y < this.camY - 140 || d.y > this.camY + CFG.H + 140) {
        list.splice(i, 1);
      }
    }
  },

  // ==================== 暗角 / CRT / 光照 ====================
  _getVignette: function () {
    if (!this._vig) {
      this._vig = this.ctx.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * 0.40, CFG.W / 2, CFG.H / 2, CFG.H * 0.82);
      this._vig.addColorStop(0, 'rgba(8,12,24,0)');
      this._vig.addColorStop(0.7, 'rgba(6,10,20,0.14)');
      this._vig.addColorStop(1, 'rgba(4,6,14,0.38)');
    }
    return this._vig;
  },

  _renderCRTFilter: function (ctx) {
    if (CFG.debug && CFG.debug.crtFilter === false) return;
    if (!this._crtCanvas) {
      this._crtCanvas = document.createElement('canvas');
      this._crtCanvas.width = CFG.W;
      this._crtCanvas.height = CFG.H;
      var cctx = this._crtCanvas.getContext('2d');

      cctx.fillStyle = 'rgba(0, 4, 12, 0.11)';
      for (var y = 0; y < CFG.H; y += 3) {
        cctx.fillRect(0, y, CFG.W, 1);
      }

      var crtGrad = cctx.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * 0.35, CFG.W / 2, CFG.H / 2, CFG.H * 0.85);
      crtGrad.addColorStop(0, 'rgba(0,0,0,0)');
      crtGrad.addColorStop(0.85, 'rgba(2,4,10,0.08)');
      crtGrad.addColorStop(1, 'rgba(0,2,6,0.28)');
      cctx.fillStyle = crtGrad;
      cctx.fillRect(0, 0, CFG.W, CFG.H);

      cctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      cctx.lineWidth = 2;
      cctx.strokeRect(1, 1, CFG.W - 2, CFG.H - 2);
    }

    ctx.drawImage(this._crtCanvas, 0, 0);
  },

  // 光照光源：玩家 + 竞技场四角灯柱（与 game4 街机小游戏一致）
  _collectLights: function () {
    var L = [];
    L.push({ x: Player.x, y: Player.y, r: 250, a: 0.9 });

    var m = CFG.wall.thickness;
    var room = MiniGames.room;
    if (room) {
      L.push({ x: room.worldX + m + 32, y: room.worldY + m + 32, r: 110, a: 0.6 });
      L.push({ x: room.worldX + CFG.W - m - 32, y: room.worldY + m + 32, r: 110, a: 0.6 });
      L.push({ x: room.worldX + m + 32, y: room.worldY + CFG.H - m - 32, r: 110, a: 0.6 });
      L.push({ x: room.worldX + CFG.W - m - 32, y: room.worldY + CFG.H - m - 32, r: 110, a: 0.6 });
    }

    L = L.filter(function (l) { return isFinite(l.x) && isFinite(l.y) && isFinite(l.r) && l.r >= 0; });
    return L;
  },

  _applyLighting: function (ctx) {
    var s = 1;
    var LW = Math.round(CFG.W / s), LH = Math.round(CFG.H / s);
    if (!this._lightCanvas || this._lightCanvas.width !== LW || this._lightCanvas.height !== LH) {
      this._lightCanvas = document.createElement('canvas');
      this._lightCanvas.width = LW;
      this._lightCanvas.height = LH;
      this._lightCtx = this._lightCanvas.getContext('2d');
    }
    var lc = this._lightCtx;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, LW, LH);
    var ambient = 0.36;
    lc.fillStyle = 'rgba(5,8,18,' + ambient + ')';
    lc.fillRect(0, 0, LW, LH);
    lc.globalCompositeOperation = 'destination-out';
    var lights = this._collectLights();
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      var sx = (l.x - this.camX) / s, sy = (l.y - this.camY) / s, sr = l.r / s;
      if (sx < -sr || sx > LW + sr || sy < -sr || sy > LH + sr) continue;
      var g = lc.createRadialGradient(sx, sy, 0, sx, sy, sr);
      g.addColorStop(0, 'rgba(0,0,0,' + l.a + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(sx, sy, sr, 0, Math.PI * 2);
      lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this._lightCanvas, 0, 0);
  },
};

window.addEventListener('DOMContentLoaded', function () {
  Main.init();
});
