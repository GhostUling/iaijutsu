// ===== 对局全局状态（与 game4 同名同字段，供特效与结算共用） =====
var Game = {
  state: 'MENU',        // MENU | PLAYING | GAMEOVER
  chapter: 0,
  damageFlash: 0,
  particles: [],
  effects: [],
  playTime: 0,
  debugMode: false,
};
