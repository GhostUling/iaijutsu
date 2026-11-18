// ===== 键盘 + 鼠标输入（按键映射与 game4 一致） =====
var Input = {
  keys: {},
  keysJustPressed: {},
  mouseX: 0,
  mouseY: 0,
  mouse: { x: 0, y: 0 },
  mouseDown: false,
  leftPressed: false,
  rightDown: false,
  rightPressed: false,
  spacePressed: false,
  ePressed: false,
  lastAttackSource: 'mouse',
  lastInputDevice: 'mouse',

  _rect: { left: 0, top: 0, width: 960, height: 540 },

  init: function (canvas) {
    var self = this;

    var deriveCode = function (e) {
      if (e.code || !e.key) return e.code;
      var k = e.key;
      if (k.length === 1) {
        if (/[a-zA-Z]/.test(k)) return 'Key' + k.toUpperCase();
        if (/[0-9]/.test(k)) return 'Digit' + k;
        if (k === ' ') return 'Space';
      }
      if (k === 'Escape' || k === 'Enter' || k === 'Tab' || k.indexOf('Arrow') === 0) return k;
      return '';
    };

    window.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.code = deriveCode(e);
      if (!self.keys[e.code]) {
        self.keysJustPressed[e.code] = true;
      }
      self.keys[e.code] = true;

      // 纯键盘映射：J = 左键（居合闪），K = 右键（普攻）
      if (e.code === 'KeyJ') {
        self.mouseDown = true;
        self.leftPressed = true;
        self.lastAttackSource = 'keyboard';
        self.lastInputDevice = 'keyboard';
      }
      if (e.code === 'KeyK') {
        self.rightDown = true;
        self.rightPressed = true;
        self.lastAttackSource = 'keyboard';
        self.lastInputDevice = 'keyboard';
      }

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
        self.lastInputDevice = 'keyboard';
      }

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }

      if (e.code === 'Space') {
        self.spacePressed = true;
      }
      if (e.code === 'KeyE') self.ePressed = true;

      // B：刀痕 / 道场 / 奥义工坊（开启时游戏暂停）
      if (e.code === 'KeyB' && window.UI && UI.toggleIaijutsuShop) {
        UI.toggleIaijutsuShop();
      }
      // M：静音
      if (e.code === 'KeyM' && window.UI && UI.toggleMute) {
        UI.toggleMute();
      }
      // Esc：关闭面板优先；没有面板时退出本局回主菜单
      if (e.code === 'Escape') {
        if (window.UI && UI.isIaiShopOpen && UI.isIaiShopOpen()) { UI.hideIaijutsuShop(); return; }
        if (window.MiniGames && MiniGames.active) { MiniGames.leave(); return; }
      }
    });

    window.addEventListener('keyup', function (e) {
      self.keys[e.code] = false;
      if (e.code === 'KeyJ') self.mouseDown = false;
      if (e.code === 'KeyK') self.rightDown = false;
    });

    window.addEventListener('blur', function () {
      self.keys = {};
      self.keysJustPressed = {};
      self.mouseDown = false;
      self.leftPressed = false;
      self.rightDown = false;
      self.spacePressed = false;
      self.ePressed = false;
    });

    window.addEventListener('mousemove', function (e) {
      self.lastInputDevice = 'mouse';
      self.mouseX = e.clientX;
      self.mouseY = e.clientY;
      var pos = self.logicalPos();
      self.mouse.x = pos.x;
      self.mouse.y = pos.y;
    });

    window.addEventListener('mousedown', function (e) {
      self.lastAttackSource = 'mouse';
      self.lastInputDevice = 'mouse';
      if (e.target && e.target.closest && (
          e.target.closest('#iaijutsu-hub') || e.target.closest('#iaijutsu-shop') ||
          e.target.closest('.overlay') || e.target.closest('button'))) return;
      if (e.button === 0) { self.mouseDown = true; self.leftPressed = true; }
      else if (e.button === 2) { self.rightDown = true; self.rightPressed = true; }
    });

    window.addEventListener('mouseup', function (e) {
      if (e.target && e.target.closest && (
          e.target.closest('#iaijutsu-hub') || e.target.closest('#iaijutsu-shop') ||
          e.target.closest('.overlay') || e.target.closest('button'))) return;
      if (e.button === 0) self.mouseDown = false;
      else if (e.button === 2) self.rightDown = false;
    });

    window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  },

  isDown: function (code) { return !!this.keys[code]; },

  logicalPos: function () {
    var mx = this.mouseX - this._rect.left;
    var my = this.mouseY - this._rect.top;
    var sx = CFG.W / this._rect.width;
    var sy = CFG.H / this._rect.height;
    return { x: mx * sx, y: my * sy };
  },

  updateRect: function (rect) { this._rect = rect; },
};
