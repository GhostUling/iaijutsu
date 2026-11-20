// ===== 脚本加载清单（唯一权威，index.html 与 tests/ 共用） =====
window.GAME_ASSET_VER = '12';
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

  // 宿敌战（独立扩展包，三大古流派 + Boss 实体 + 模式控制器 + 新手交互教程）
  'js/modes/iaijutsu/iaijutsu_boss_styles.js',
  'js/modes/iaijutsu/iaijutsu_boss.js',
  'js/modes/iaijutsu/iaijutsu_mode_boss.js',
  'js/modes/iaijutsu/iaijutsu_boss_tutorial.js',

  // 鬼影追猎（独立扩展包，横向卷轴追逐战：终点逃脱 + 无尽逃亡）
  'js/modes/iaijutsu/iaijutsu_chase_monster.js',
  'js/modes/iaijutsu/iaijutsu_mode_chase.js',

  // 宿主与 UI
  'js/modes/minigames.js',
  'js/ui/ui.js',

  // 主循环
  'js/core/main.js',
];
