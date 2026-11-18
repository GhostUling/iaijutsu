// ===== 脚本加载清单（唯一权威，index.html 与 tests/ 共用） =====
window.GAME_ASSET_VER = '5';
window.GAME_LOAD_ORDER = [
  // 核心引擎层
  'js/core/config.js',
  'js/core/utils.js',
  'js/core/physics.js',
  'js/core/game.js',
  'js/core/fx.js',
  'js/core/input.js',
  'js/core/sfx.js',

  // 实体
  'js/entities/player.js',

  // 居合斩专属模块（顺序与 game4 一致）
  'js/modes/iaijutsu/iaijutsu_skins.js',
  'js/modes/iaijutsu/iaijutsu_targets.js',
  'js/modes/iaijutsu/iaijutsu_fx.js',
  'js/modes/iaijutsu/iaijutsu_ultimates.js',
  'js/modes/iaijutsu/iaijutsu_mode.js',

  // 异靶乱舞（独立扩展包，不修改上面五个原版文件）
  'js/modes/iaijutsu/iaijutsu_targets_ex.js',
  'js/modes/iaijutsu/iaijutsu_mode_ex.js',

  // 宿敌战（独立扩展包，Boss 实体 + 模式控制器）
  'js/modes/iaijutsu/iaijutsu_boss.js',
  'js/modes/iaijutsu/iaijutsu_mode_boss.js',

  // 宿主与 UI
  'js/modes/minigames.js',
  'js/ui/ui.js',

  // 主循环
  'js/core/main.js',
];
