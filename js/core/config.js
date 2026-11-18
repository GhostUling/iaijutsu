// ===== 全局配置（数值与 game4 完全一致，勿改） =====
var CFG = {
  // 逻辑分辨率（固定，按窗口等比缩放）；同时也是竞技场的世界尺寸
  W: 960,
  H: 540,

  // 玩家
  player: {
    radius: 16,
    speed: 260,          // px/s
    maxHp: 100,
    maxShield: 50,
    shieldRegenDelay: 3.0,
    shieldRegenRate: 8,
    invulnTime: 0.5,
    rollCd: 1.2,
    rollTime: 0.28,
    rollSpeed: 560,
  },

  // 墙
  wall: {
    thickness: 24,
  },

  // 调试开关（与 game4 默认值一致：全部特效开启）
  debug: {
    ambientDust: true,
    decals: true,
    lighting: true,
    crtFilter: true,
    glowLighter: true,
    renderReset: true,
    infiniteCooldown: false,
    noclip: false,
  },
};

// ===== 武器表（居合斩只用到太刀 WEAPONS[1]；数值照抄 game4） =====
var WEAPONS = [
  {
    id: 'pistol', name: '脉冲手枪', emoji: '🔫',
    fireRate: 0.16, bulletSpeed: 640, bulletRadius: 5, bulletDamage: 12,
    skillName: '枪械变形', skillEmoji: '🎲', skillCooldown: 10,
  },
  {
    id: 'sword', name: '太刀', emoji: '⚔️',
    swingCooldown: 0.32, swingRange: 74, swingArcHalf: 0.95, swingDamage: 24,
    skillName: '居合斩', skillEmoji: '⚔️', skillCooldown: 2.2,
    lungeTime: 0.2, lungeDist: 150, lungeDamage: 60,
  },
];
