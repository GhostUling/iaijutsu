// ===== 统一特效引擎（接口与 game4 一致，全部委托给 Main / 小游戏宿主） =====
var FX = {
  burst: function (x, y, color, count, speed, size) {
    if (window.Main && Main._burst) {
      Main._burst(x, y, color || '#ffffff', count || 8);
    }
  },

  ring: function (x, y, color, maxRadius, duration) {
    if (window.Main && Main._ring) {
      Main._ring(x, y, color || '#fbbf24', maxRadius || 40, duration || 0.4);
    }
  },

  // 刀光挥砍动画
  slash: function (x, y, angle, color) {
    if (window.Main && Main.fxSwing) {
      Main.fxSwing(x, y, angle, color);
    }
  },

  // 冲刺拖尾与位移冲击波
  dash: function (x, y, angle, color) {
    if (window.Main && Main.fxDash) {
      Main.fxDash(x, y, angle, color);
    }
  },

  // 冲刺残影（由主循环统一淡出回收）
  trail: function (x, y, angle, duration, customSkin) {
    if (window.Main) {
      if (!Main.dashTrail) Main.dashTrail = [];
      var skin = customSkin || (window.MiniGames && MiniGames.active && MiniGames.getEquippedIaiSkin ? MiniGames.getEquippedIaiSkin() : null);
      Main.dashTrail.push({
        x: x,
        y: y,
        a: angle || 0,
        t: duration || 0.35,
        maxT: duration || 0.35,
        skin: skin
      });
    }
  },

  // 统一飘字（走 Main.dmgTexts，与伤害飘字同一条管线）
  floatText: function (x, y, text, color, scale) {
    if (window.Main && Main.addDmgText) {
      Main.addDmgText(x, y, text, color || '#ffffff');
    }
  },

  explosion: function (x, y, color, count) {
    this.burst(x, y, color || '#f59e0b', count || 16, 120, 4);
    this.ring(x, y, color || '#fbbf24', 36, 0.35);
  }
};
