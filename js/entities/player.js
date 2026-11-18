// ===== 玩家（字段与更新顺序照抄 game4 的街机小游戏路径） =====
var Player = {
  x: 0, y: 0,
  radius: 16,
  hp: 0, shield: 0,
  maxHp: 0, maxShield: 0,
  money: 0,
  shards: 0,
  damageMult: 1,
  speedMult: 1,
  alive: true,
  unarmed: false,
  prologueGunJammed: false,
  fireTimer: 0,
  skillTimers: [0, 0, 0, 0, 0],
  invulnTimer: 0,
  aimAngle: 0,
  buffs: [],
  weapon: 0,
  swingT: 0, swingAngle: 0,
  dashT: 0, dashAngle: 0,
  dashId: 0,
  rollT: 0, rollAngle: 0,
  rollCd: 0,
  lightningCharges: [],
  attacks: [],
  lasers: [],
  _autoAim: null,
  _weaponShowT: 0,
  _hookSlow: 0,
  customActive: false,
  currentSlot: 0,

  _collideWalls: function (colliders, radius) {
    Physics.resolveWallCollision(this, colliders, radius || this.radius);
  },

  reset: function () {
    var p = CFG.player || {};
    this.radius = (p && p.radius) || 16;
    this.maxHp = p.maxHp || 100;
    this.maxShield = p.maxShield || 50;
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.money = 0;
    this.shards = 0;
    this.damageMult = 1;
    this.speedMult = 1;
    this.alive = true;
    this.unarmed = false;
    this.prologueGunJammed = false;
    this.fireTimer = 0;
    this.skillTimers = [0, 0, 0, 0, 0];
    this.invulnTimer = 0;
    this._weaponShowT = 0;
    this._hookSlow = 0;
    this.weapon = 0;
    this.swingT = 0;
    this.dashT = 0;
    this.dashId = 0;
    this.rollT = 0;
    this.rollCd = 0;
    this.lightningCharges = [];
    this.attacks = [];
    this.lasers = [];
    this.buffs = [];
    this.currentSlot = 0;
    this._autoAim = null;
  },

  setWeapon: function (idx, force) {
    if (window.MiniGames && MiniGames.active && !force && !MiniGames._forcingWeapon) return;
    if (idx < 0 || idx >= WEAPONS.length) return;
    if (idx === this.weapon && !force) return;
    this.weapon = idx;
    this.currentSlot = idx;
    this.fireTimer = 0;
    this._weaponShowT = 2;
    this.lightningCharges = [];
    this.attacks = [];
    SFX.play('switch');
  },

  // 独立版没有配件系统：增益恒为 1（与 game4 空配件时一致）
  weaponMods: function () {
    return { atkSpeed: 1, size: 1, swordRange: 1, swordWave: 0 };
  },

  hasBuff: function (id) {
    for (var i = 0; i < this.buffs.length; i++) {
      if (this.buffs[i].id === id) return true;
    }
    return false;
  },

  update: function (dt, colliders, mouseWorld) {
    var p = CFG.player;
    if (!this.alive) return;

    var moveColliders = (CFG.debug && CFG.debug.noclip) ? [] : colliders;
    if (!mouseWorld) {
      var mouse = (typeof Input !== 'undefined' && Input.logicalPos) ? Input.logicalPos() : { x: this.x, y: this.y };
      var cx = (typeof Main !== 'undefined' && Main.camX !== undefined) ? Main.camX : 0;
      var cy = (typeof Main !== 'undefined' && Main.camY !== undefined) ? Main.camY : 0;
      mouseWorld = { x: mouse.x + cx, y: mouse.y + cy };
    }
    var mods = this.weaponMods(this.weapon);

    // 移动输入
    var dx = 0, dy = 0;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) dy -= 1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) dy += 1;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) dx -= 1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) dx += 1;

    if (this.rollT > 0) {
      // 翻滚闪避
      this.rollT -= dt;
      this.vx = Math.cos(this.rollAngle) * p.rollSpeed;
      this.vy = Math.sin(this.rollAngle) * p.rollSpeed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this._collideWalls(moveColliders, p.radius);
      this.invulnTimer = Math.max(this.invulnTimer, 0.06);
      if (Math.random() < 0.8) {
        Game.particles.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.22, maxLife: 0.22, emoji: '🧑‍🚀', size: 32 });
      }
    } else if (this.dashT > 0) {
      // 居合冲刺位移：速度 = 冲刺距离 / 冲刺时长（与 game4 同式）
      this.dashT -= dt;
      var ld = (WEAPONS[1].lungeDist * mods.swordRange) / WEAPONS[1].lungeTime;
      this.vx = Math.cos(this.dashAngle) * ld;
      this.vy = Math.sin(this.dashAngle) * ld;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this._collideWalls(moveColliders, p.radius);
      if (Math.random() < 0.8) {
        Game.particles.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, emoji: '🧑‍🚀', size: 32 });
      }
      var prow = (window.MiniGames && MiniGames.active && MiniGames.room) ? MiniGames.room : null;
      if (prow && !(CFG.debug && CFG.debug.noclip)) {
        Physics.clampToBounds(this, prow);
      }
      this.invulnTimer = Math.max(this.invulnTimer, 0.06);
    } else if (dx !== 0 || dy !== 0) {
      this.facingAngle = Math.atan2(dy, dx);
      var len = Math.sqrt(dx * dx + dy * dy);
      var slowFactor = this._hookSlow > 0 ? 0.45 : 1;
      if (this.hasBuff('frost_curse')) slowFactor *= 0.65;
      var catFactor = this.hasBuff('polymorph') ? 1.2 : 1;
      var moveSpd = p.speed * this.speedMult * slowFactor * catFactor;
      this.vx = (dx / len) * moveSpd;
      this.vy = (dy / len) * moveSpd;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this._collideWalls(moveColliders, p.radius);
      if (window.MiniGames && MiniGames.active && MiniGames.room && !(CFG.debug && CFG.debug.noclip)) {
        Physics.clampToBounds(this, MiniGames.room);
      }
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.aimAngle = Utils.angleTo(this.x, this.y, mouseWorld.x, mouseWorld.y);
    if (this._autoAim) this.aimAngle = Utils.angleTo(this.x, this.y, this._autoAim.x, this._autoAim.y);

    // 计时
    this.fireTimer -= dt;
    for (var si2 = 0; si2 < this.skillTimers.length; si2++) {
      if (this.skillTimers[si2] > 0) this.skillTimers[si2] -= dt;
    }
    this.rollCd -= dt;
    if (this.swingT > 0) this.swingT -= dt;

    // 空格在居合特训里属于无我大招，不触发翻滚
    var isMiniGameWithSkillSpace = window.MiniGames && MiniGames.active && (MiniGames.currentGame === 'iaijutsu');
    if (Input.spacePressed && !isMiniGameWithSkillSpace) {
      Input.spacePressed = false;
      if (this.rollCd <= 0 && this.rollT <= 0 && this.dashT <= 0) {
        this.rollCd = p.rollCd;
        this.rollAngle = (dx !== 0 || dy !== 0) ? Math.atan2(dy, dx) : this.aimAngle;
        this.rollT = p.rollTime;
        this.invulnTimer = Math.max(this.invulnTimer, p.rollTime + 0.1);
        SFX.play('dash');
      }
    }

    // 居合特训：武器攻击全部由小游戏逻辑接管，这里只推进计时
    if (window.MiniGames && MiniGames.active) {
      if (this.invulnTimer > 0) this.invulnTimer -= dt;
      if (this._weaponShowT > 0) this._weaponShowT -= dt;
      return;
    }
  },

  render: function (ctx) {
    if (!this.alive) return;
    var p = CFG.player;

    // 无敌指示：脉冲护盾圈
    if (this.invulnTimer > 0) {
      var ivP = 0.5 + 0.5 * Math.sin(performance.now() * 0.02);
      ctx.beginPath();
      ctx.arc(this.x, this.y, p.radius + 6 + ivP * 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,200,255,' + (0.35 + ivP * 0.3).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 护盾微光泡
    if (this.shield > 0) {
      var shP = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
      ctx.beginPath();
      ctx.arc(this.x, this.y, p.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,200,255,' + (0.16 + shP * 0.2).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 脚下实心亮色底座 + 双层流光辉光圈 + 柔和软阴影
    var pGlowPulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + p.radius - 2, p.radius * 1.6, p.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.12 + pGlowPulse * 0.08).toFixed(3) + ')';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(this.x, this.y + p.radius - 2, p.radius * 1.3, p.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 58, 110, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, ' + (0.75 + pGlowPulse * 0.25).toFixed(3) + ')';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(this.x, this.y + p.radius + 3, p.radius * 0.9, p.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fill();

    // 翻滚冷却进度条（本模式不使用翻滚，恒为满格）
    var rmax = p.rollCd || 1.2;
    var rp = Utils.clamp(this.rollCd > 0 ? 1 - this.rollCd / rmax : 1, 0, 1);
    var rbx = this.x - 17, rby = this.y + p.radius + 9, rbw = 34, rbh = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(rbx - 1, rby - 1, rbw + 2, rbh + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(rbx, rby, rbw, rbh);
    ctx.fillStyle = rp >= 1 ? '#ffd66b' : 'rgba(120,170,255,0.9)';
    ctx.fillRect(rbx, rby, rbw * rp, rbh);

    // 剑挥砍弧光（按实际范围画）
    if (this.weapon === 1 && this.swingT > 0) {
      var wS = WEAPONS[1];
      var swingDur = 0.18;
      var wR = wS.swingRange * this.weaponMods(1).size;
      var arcHalf = wS.swingArcHalf;
      var prog = 1 - this.swingT / swingDur;
      var alpha = (this.swingT / swingDur) * 0.85;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.swingAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wR * (0.5 + prog * 0.6), -arcHalf * 0.9, arcHalf * 0.9);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,235,255,' + alpha.toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.9).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, wR, -arcHalf * 0.9, arcHalf * 0.9);
      ctx.stroke();
      ctx.restore();
    }

    // 冲刺拖尾
    if (this.rollT > 0 || this.dashT > 0) {
      var tAng = this.rollT > 0 ? this.rollAngle : this.dashAngle;
      var tA = Utils.clamp(this.rollT > 0 ? this.rollT / 0.28 : this.dashT / 0.2, 0, 1);
      var curIaiSkin = (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin) ? MiniGames.getEquippedIaiSkin() : null;
      var tColor = (this.dashT > 0 && curIaiSkin && curIaiSkin.trailRgba) ? (curIaiSkin.trailRgba + (tA * 0.45).toFixed(3) + ')') : ('rgba(255,255,255,' + (tA * 0.3).toFixed(3) + ')');
      ctx.beginPath();
      ctx.arc(this.x - Math.cos(tAng) * 20, this.y - Math.sin(tAng) * 20, 14 * (0.5 + tA * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = tColor;
      ctx.fill();
    }

    // 瞄准线
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(this.aimAngle) * (p.radius + 14), this.y + Math.sin(this.aimAngle) * (p.radius + 14));
    ctx.stroke();
    ctx.restore();

    // Emoji 本体（移动时轻微起伏）
    var pMoving = Input.isDown('KeyW') || Input.isDown('KeyA') || Input.isDown('KeyS') || Input.isDown('KeyD') ||
                  Input.isDown('ArrowUp') || Input.isDown('ArrowDown') || Input.isDown('ArrowLeft') || Input.isDown('ArrowRight');
    var bob = (pMoving && this.rollT <= 0 && this.dashT <= 0) ? Math.sin(performance.now() * 0.012) * 2 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.rollT > 0) ctx.scale(1.14, 0.86);
    var bodyAngle = this.aimAngle;
    if (this.rollT > 0) {
      bodyAngle += Utils.clamp(1 - this.rollT / p.rollTime, 0, 1) * Math.PI * 2;
    }
    ctx.rotate(bodyAngle);
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.hasBuff('polymorph') ? '🐈' : '🧑‍🚀', 0, 2);
    ctx.restore();

    // 切换武器提示：头顶短暂展示当前武器 emoji
    if (this._weaponShowT > 0) {
      var wShowA = Utils.clamp(this._weaponShowT / 0.5, 0, 1);
      var wShowEmoji = WEAPONS[this.weapon].emoji;
      ctx.save();
      ctx.globalAlpha = wShowA;
      ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(wShowEmoji, this.x, this.y - p.radius - 16);
      ctx.restore();
    }
  },
};
