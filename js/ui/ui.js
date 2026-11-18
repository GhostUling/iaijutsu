// ===== UI：横幅 / 标题 / 结算 / 皮肤工坊（结构与文案沿用 game4 的居合大殿） =====
var UI = {
  canvas: null,
  waveBanner: null,
  titlePanel: null,
  endPanel: null,
  iaiHubPanel: null,
  iaiActiveTab: 'slash',
  lastModeId: 'classic',
  _bannerTimer: null,
  _muted: false,

  init: function (canvas) {
    var self = this;
    this.canvas = canvas;
    this.waveBanner = document.getElementById('wave-banner');
    this.titlePanel = document.getElementById('title-screen');
    this.endPanel = document.getElementById('result-screen');

    // ---- 居合大殿 ----
    this.iaiHubPanel = document.getElementById('iaijutsu-hub');
    this.iaiHubList = document.getElementById('iai-hub-list');
    this.iaiHubClose = document.getElementById('iai-hub-close');
    this.iaiHubHigh = document.getElementById('iai-hub-high');
    this.iaiHubRank = document.getElementById('iai-hub-rank');
    this.iaiHubStartBtn = document.getElementById('iai-hub-start-btn');
    this.iaiHubBottomBtn = document.getElementById('iai-hub-launch-bottom');
    this.iaiHubBack = document.getElementById('iai-hub-back-arcade');
    this.iaiTabSlash = document.getElementById('iai-tab-slash');
    this.iaiTabBg = document.getElementById('iai-tab-bg');
    this.iaiTabBgm = document.getElementById('iai-tab-bgm');
    this.iaiTabUlt = document.getElementById('iai-tab-ultimate');

    if (this.iaiHubClose) this.iaiHubClose.addEventListener('click', function () { UI.hideIaijutsuHub(); });
    if (this.iaiHubStartBtn) {
      this.iaiHubStartBtn.addEventListener('click', function () {
        UI.hideIaijutsuHub();
        if (!MiniGames.active || MiniGames.currentGame !== 'iaijutsu') {
          UI.beginRun();
        }
      });
    }
    if (this.iaiHubBottomBtn) {
      this.iaiHubBottomBtn.addEventListener('click', function () {
        UI.hideIaijutsuHub();
        if (!MiniGames.active || MiniGames.currentGame !== 'iaijutsu') {
          UI.beginRun();
        }
      });
    }
    if (this.iaiHubBack) {
      this.iaiHubBack.addEventListener('click', function () {
        UI.hideIaijutsuHub();
        if (MiniGames.active) MiniGames.leave();
        UI.showTitle();
      });
    }
    if (this.iaiTabSlash) this.iaiTabSlash.addEventListener('click', function () { UI.switchIaiTab('slash'); });
    if (this.iaiTabBg) this.iaiTabBg.addEventListener('click', function () { UI.switchIaiTab('bg'); });
    if (this.iaiTabBgm) this.iaiTabBgm.addEventListener('click', function () { UI.switchIaiTab('bgm'); });
    if (this.iaiTabUlt) this.iaiTabUlt.addEventListener('click', function () { UI.switchIaiTab('ultimate'); });

    // ---- 标题 / 结算 ----
    var startBtn = document.getElementById('title-start-btn');
    if (startBtn) startBtn.addEventListener('click', function () { UI.beginRun('classic'); });
    var startExBtn = document.getElementById('title-start-ex-btn');
    if (startExBtn) startExBtn.addEventListener('click', function () { UI.beginRun('ex'); });
    var startBossBtn = document.getElementById('title-start-boss-btn');
    if (startBossBtn) startBossBtn.addEventListener('click', function () { UI.beginRun('boss'); });
    var hubBtn = document.getElementById('title-hub-btn');
    if (hubBtn) hubBtn.addEventListener('click', function () { UI.showIaijutsuHub(); });
    var muteBtn = document.getElementById('title-mute-btn');
    if (muteBtn) muteBtn.addEventListener('click', function () { UI.toggleMute(); });
    this._muteBtn = muteBtn;
    this.syncMuteBtn();

    // 任何一次真实点击/按键都尝试解锁音频（自动播放策略：上下文要在手势里创建/恢复）
    this.initAudioUnlock();

    var retryBtn = document.getElementById('result-retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', function () { UI.beginRun(UI.lastModeId); });
    var backBtn = document.getElementById('result-back-btn');
    if (backBtn) backBtn.addEventListener('click', function () { UI.showTitle(); });

    window.addEventListener('resize', function () { self.resize(); });
    this.resize();
    this.showTitle();
  },

  resize: function () {
    var cw = CFG.W, ch = CFG.H;
    var scale = Math.min(window.innerWidth / cw, window.innerHeight / ch);
    var w = Math.floor(cw * scale);
    var h = Math.floor(ch * scale);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    var rect = this.canvas.getBoundingClientRect();
    Input.updateRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  },

  // ==================== 开局 / 离场 ====================
  // modeId: 'classic' 原版 / 'ex' 异靶乱舞
  beginRun: function (modeId) {
    if (modeId && window.MiniGames && MiniGames.MODE_META && MiniGames.MODE_META[modeId]) {
      this.lastModeId = modeId;
    } else if (!this.lastModeId) {
      this.lastModeId = 'classic';
    }
    if (window.SFX) {
      SFX.init();
      SFX.resume();
    }
    this.hideTitle();
    this.hideResult();
    // 清掉点击/空格残留，避免"一开局就自动出刀"
    Input.leftPressed = false;
    Input.rightPressed = false;
    Input.spacePressed = false;
    Input.keysJustPressed = {};
    // 满状态入场（与 game4 进入街机前 Main.startGame -> Player.reset 一致）
    Player.reset();
    Main.ambient = [];
    Main.dmgTexts = [];
    Main.dashTrail = [];
    Main.shakeTrauma = 0;
    Game.particles = [];
    Game.effects = [];
    Game.state = 'PLAYING';
    MiniGames.start('iaijutsu', this.lastModeId);

    // 若音频上下文仍被浏览器挂起，给玩家一个明确的恢复手势提示
    var self = this;
    setTimeout(function () {
      if (window.SFX && SFX.ctx && SFX.ctx.state !== 'running' && !SFX.muted) {
        self.flashBanner('🔇 浏览器拦住了声音：在画面里点一下即可开启', 2.8);
      }
    }, 150);
  },

  onRunLeft: function () {
    if (MiniGames.lastSummary) this.showResult();
    else this.showTitle();
  },

  showTitle: function () {
    Game.state = 'MENU';
    // 标题页是"最上层"：结算页 / 工坊都必须收起来，否则看起来像按钮没反应
    this.hideResult();
    this.hideIaijutsuHub();
    if (window.IaijutsuMode && IaijutsuMode.restoreDefaultCursor) {
      IaijutsuMode.restoreDefaultCursor();
    }
    if (this.titlePanel) this.titlePanel.classList.remove('hidden');
    if (window.MiniGames) {
      var highEl = document.getElementById('title-high');
      if (highEl) highEl.textContent = MiniGames.getModeHighScore('classic');
      var highExEl = document.getElementById('title-high-ex');
      if (highExEl) highExEl.textContent = MiniGames.getModeHighScore('ex');
      var highBossEl = document.getElementById('title-high-boss');
      if (highBossEl) highBossEl.textContent = MiniGames.getModeHighScore('boss');
    }
  },

  hideTitle: function () {
    if (this.titlePanel) this.titlePanel.classList.add('hidden');
  },

  showResult: function () {
    Game.state = 'GAMEOVER';
    var s = MiniGames.lastSummary || { maxCombo: MiniGames.maxCombo, isNewHigh: false, rewardMoney: 0, rewardShards: 0 };
    var el = this.endPanel;
    if (!el) return;
    var setText = function (id, txt) {
      var n = document.getElementById(id);
      if (n) n.textContent = txt;
    };
    var modeHigh = MiniGames.getModeHighScore();
    var isWin = (s.result === 'win' || MiniGames.result === 'win');
    setText('result-icon', isWin ? '🏆' : '🎯');
    setText('result-title', isWin ? '宿敌已斩' : '特训结束');
    setText('result-mode', s.modeName ? ('模式：' + s.modeName) : '');
    setText('result-combo', String(s.maxCombo));
    setText('result-high', String(modeHigh));
    setText('result-record', s.isNewHigh ? '🌟 新纪录！' : ('本模式最高：' + modeHigh));
    setText('result-reward', '💰 +' + s.rewardMoney + '   🔷 +' + s.rewardShards);
    setText('result-msg', s.msg || '⚔️ 居合断连 3 次，特训结束！');
    el.classList.remove('hidden');
  },

  hideResult: function () {
    if (this.endPanel) this.endPanel.classList.add('hidden');
  },

  // ==================== 横幅 ====================
  flashBanner: function (text, seconds) {
    var self = this;
    if (!this.waveBanner) return;
    this.waveBanner.textContent = text;
    this.waveBanner.classList.remove('hidden');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(function () {
      self.waveBanner.classList.add('hidden');
    }, seconds * 1000);
  },

  hideInteract: function () {},
  hideArcadeMenu: function () {},

  // ==================== 静音 / 音频解锁 ====================
  initAudioUnlock: function () {
    var self = this;
    var unlock = function () {
      if (!window.SFX || !SFX.init) return;
      SFX.init();
      SFX.resume();
      self.syncMuteBtn();
    };
    ['pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, unlock, true);
    });
  },

  syncMuteBtn: function () {
    if (!this._muteBtn) return;
    if (window.SFX && SFX.muted) this._muteBtn.textContent = '🔇 已静音 M';
    else this._muteBtn.textContent = '🔊 声音 M';
  },

  toggleMute: function () {
    this._muted = !this._muted;
    if (window.SFX) {
      SFX.init();
      SFX.setMuted(this._muted);
      SFX.play('click');
    }
    this.syncMuteBtn();
    this.flashBanner(this._muted ? '🔇 已静音（按 M 恢复）' : '🔊 声音已开启', 1.4);
  },

  // ==================== 居合大殿 ====================
  showIaijutsuHub: function () {
    if (!this.iaiHubPanel) this.iaiHubPanel = document.getElementById('iaijutsu-hub');
    if (!this.iaiHubPanel) return;
    this.renderIaijutsuHub();
    this.iaiHubPanel.classList.remove('hidden');
    SFX.play('click');
    if (window.IaijutsuMode && IaijutsuMode.restoreDefaultCursor) {
      IaijutsuMode.restoreDefaultCursor();
    }
  },

  hideIaijutsuHub: function () {
    if (!this.iaiHubPanel) this.iaiHubPanel = document.getElementById('iaijutsu-hub');
    var wasOpen = this.isIaiHubOpen();
    if (this.iaiHubPanel) this.iaiHubPanel.classList.add('hidden');
    if (window.SFX && SFX.stopIaijutsuBgmPreview) {
      SFX.stopIaijutsuBgmPreview();
    }
    if (wasOpen && window.MiniGames && MiniGames.active && MiniGames.currentGame === 'iaijutsu') {
      if (window.IaijutsuMode && IaijutsuMode.applyGameCursor) {
        IaijutsuMode.applyGameCursor(MiniGames.getEquippedIaiSkin());
      }
      this.flashBanner('▶️ 居合斩特训已继续！', 1.0);
    }
  },

  toggleIaijutsuShop: function () {
    if (this.isIaiHubOpen()) this.hideIaijutsuHub();
    else this.showIaijutsuHub();
  },

  isIaiHubOpen: function () {
    if (!this.iaiHubPanel) this.iaiHubPanel = document.getElementById('iaijutsu-hub');
    return !!(this.iaiHubPanel && !this.iaiHubPanel.classList.contains('hidden'));
  },

  // game4 里的别名（IaijutsuMode 会同时检测这两个开关）
  showIaijutsuShop: function () { this.showIaijutsuHub(); },
  hideIaijutsuShop: function () { this.hideIaijutsuHub(); },
  isIaiShopOpen: function () { return this.isIaiHubOpen(); },
  openIaijutsuShop: function () { this.showIaijutsuHub(); },
  closeIaijutsuShop: function () { this.hideIaijutsuHub(); },
  isSettingsOpen: function () { return false; },
  isInventoryOpen: function () { return false; },
  isAttachmentsOpen: function () { return false; },

  switchIaiTab: function (tab) {
    if (this.iaiActiveTab === 'bgm' && tab !== 'bgm' && window.SFX && SFX.stopIaijutsuBgmPreview) {
      SFX.stopIaijutsuBgmPreview();
    }
    this.iaiActiveTab = tab;
    if (this.iaiTabSlash) this.iaiTabSlash.classList.toggle('active', tab === 'slash');
    if (this.iaiTabBg) this.iaiTabBg.classList.toggle('active', tab === 'bg');
    if (this.iaiTabBgm) this.iaiTabBgm.classList.toggle('active', tab === 'bgm');
    if (this.iaiTabUlt) this.iaiTabUlt.classList.toggle('active', tab === 'ultimate');
    SFX.play('click');
    this.renderIaijutsuHub();
  },

  renderIaijutsuHub: function () {
    if (!this.iaiHubList || !this.iaiHubHigh) {
      this.iaiHubList = document.getElementById('iai-hub-list');
      this.iaiHubHigh = document.getElementById('iai-hub-high');
      this.iaiHubRank = document.getElementById('iai-hub-rank');
      this.iaiTabSlash = document.getElementById('iai-tab-slash');
      this.iaiTabBg = document.getElementById('iai-tab-bg');
      this.iaiTabBgm = document.getElementById('iai-tab-bgm');
      this.iaiTabUlt = document.getElementById('iai-tab-ultimate');
    }
    if (!this.iaiHubList || !window.MiniGames) return;
    var high = MiniGames.getUnlockScore ? MiniGames.getUnlockScore() : (MiniGames.getHighScore('iaijutsu') || 0);
    if (this.iaiHubHigh) this.iaiHubHigh.textContent = high;

    if (this.iaiHubRank) {
      var rankName = '🗡️ 初入剑道';
      if (high >= 150) rankName = '☯️ 无我剑仙';
      else if (high >= 100) rankName = '🌸 绝境神斩';
      else if (high >= 75) rankName = '🌌 破空剑圣';
      else if (high >= 50) rankName = '👑 极意剑豪';
      else if (high >= 25) rankName = '🌀 心流剑客';
      else if (high >= 10) rankName = '🎯 见习居合师';
      this.iaiHubRank.textContent = rankName;
    }

    var isPlaying = !!(window.MiniGames && MiniGames.active && MiniGames.currentGame === 'iaijutsu');
    var ruleTitleEl = document.querySelector('#iaijutsu-hub .iai-hub-rule-title');
    var ruleDescEl = document.querySelector('#iaijutsu-hub .iai-hub-rule-desc');
    var startTxtEl = document.querySelector('#iai-hub-start-btn .iai-start-txt');
    var startIconEl = document.querySelector('#iai-hub-start-btn .iai-start-icon');
    var btmBtnEl = document.getElementById('iai-hub-launch-bottom');

    if (isPlaying) {
      var curCombo = MiniGames.combo || 0;
      if (ruleTitleEl) ruleTitleEl.innerHTML = '⏸️ 居合特训已暂停 <span style="color:#fde047;font-size:13px;font-weight:bold;margin-left:6px;">(当前连斩 x' + curCombo + ')</span>';
      if (ruleDescEl) ruleDescEl.innerHTML = '对决倒计时与连斩判定已完美冻结！可在此随意切换【刀痕光刃】或【道场背景】。按 <b>B</b>、<b>Esc</b> 或点击“继续特训”无缝返回战场！';
      if (startIconEl) startIconEl.textContent = '▶️';
      if (startTxtEl) startTxtEl.textContent = '继续特训';
      if (btmBtnEl) btmBtnEl.textContent = '▶️ 继续特训 (恢复对决)';
    } else {
      if (ruleTitleEl) ruleTitleEl.innerHTML = '⚡ 极意口诀 · 心流出鞘';
      if (ruleDescEl) ruleDescEl.innerHTML = '朝光标 <b>左键</b> 突进出刀，斩中靶子立即刷新冷却；<b>右键</b> 原地挥砍清场；充能满 100 点按 <b>空格</b> 释放【无我】大招。挥空或超时会让小猪手发力，3 次断连特训结束！';
      if (startIconEl) startIconEl.textContent = '⚔️';
      if (startTxtEl) startTxtEl.textContent = '开始特训';
      if (btmBtnEl) btmBtnEl.textContent = '⚡ 拔刀出鞘';
    }

    var tab = this.iaiActiveTab || 'slash';
    if (this.iaiTabSlash) this.iaiTabSlash.classList.toggle('active', tab === 'slash');
    if (this.iaiTabBg) this.iaiTabBg.classList.toggle('active', tab === 'bg');
    if (this.iaiTabBgm) this.iaiTabBgm.classList.toggle('active', tab === 'bgm');
    if (this.iaiTabUlt) this.iaiTabUlt.classList.toggle('active', tab === 'ultimate');

    this.iaiHubList.innerHTML = '';

    // Tab 1：刀痕光刃皮肤
    if (tab === 'slash') {
      var slashSkins = MiniGames.IAI_SKINS || [];
      var curSlashId = MiniGames.getEquippedIaiSkinId ? MiniGames.getEquippedIaiSkinId() : 'classic';

      for (var i = 0; i < slashSkins.length; i++) {
        (function (skin) {
          var isUnlocked = high >= skin.reqCombo;
          var isEquipped = curSlashId === skin.id;

          var card = document.createElement('div');
          card.className = 'iai-shop-card' + (isEquipped ? ' equipped' : (isUnlocked ? '' : ' locked'));

          var top = document.createElement('div');
          top.className = 'iai-shop-card-top';
          top.innerHTML =
            '<span class="iai-shop-emoji">' + skin.emoji + '</span>' +
            '<div class="iai-shop-name">' + skin.name + '</div>' +
            '<span class="iai-shop-tag" style="background:' + (skin.tagBg || '#0284c7') + ';color:#fff;">' + skin.tag + '</span>';
          card.appendChild(top);

          var desc = document.createElement('div');
          desc.className = 'iai-shop-desc';
          desc.textContent = skin.desc;
          card.appendChild(desc);

          var btm = document.createElement('div');
          btm.className = 'iai-shop-bottom';

          var req = document.createElement('div');
          req.className = 'iai-shop-req' + (isUnlocked ? ' unlocked' : '');
          req.textContent = skin.reqCombo === 0 ? '默认解锁' : (isUnlocked ? '✓ 已解锁 (' + skin.reqCombo + '连斩)' : '🔒 解锁需 ' + skin.reqCombo + ' 连斩');
          btm.appendChild(req);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'iai-shop-equip-btn ' + (isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-locked'));
          btn.textContent = isEquipped ? '✅ 已装备' : (isUnlocked ? '⚡ 装备' : '🔒 未解锁');
          btn.disabled = !isUnlocked || isEquipped;

          var equipFn = function (e) {
            if (e) e.stopPropagation();
            if (isUnlocked && !isEquipped) {
              if (MiniGames.setEquippedIaiSkin(skin.id)) {
                SFX.play('buy');
                UI.flashBanner('✨ 已装备居合刀刃特效：「' + skin.name + '」', 1.8);
                UI.renderIaijutsuHub();
              }
            }
          };

          if (isUnlocked && !isEquipped) {
            btn.addEventListener('click', equipFn);
            card.style.cursor = 'pointer';
            card.addEventListener('click', equipFn);
          }

          btm.appendChild(btn);
          card.appendChild(btm);
          UI.iaiHubList.appendChild(card);
        })(slashSkins[i]);
      }
    }
    // Tab 2：道场背景特效
    else if (tab === 'bg') {
      var bgSkins = MiniGames.IAI_BG_SKINS || [];
      var curBgId = MiniGames.getEquippedIaiBgSkinId ? MiniGames.getEquippedIaiBgSkinId() : 'none';

      for (var j = 0; j < bgSkins.length; j++) {
        (function (skin) {
          var isUnlocked = high >= skin.reqCombo;
          var isEquipped = curBgId === skin.id;

          var card = document.createElement('div');
          card.className = 'iai-shop-card' + (isEquipped ? ' equipped' : (isUnlocked ? '' : ' locked'));

          var top = document.createElement('div');
          top.className = 'iai-shop-card-top';
          top.innerHTML =
            '<span class="iai-shop-emoji">' + skin.emoji + '</span>' +
            '<div class="iai-shop-name">' + skin.name + '</div>' +
            '<span class="iai-shop-tag" style="background:' + (skin.tagBg || '#475569') + ';color:#fff;">' + skin.tag + '</span>';
          card.appendChild(top);

          var desc = document.createElement('div');
          desc.className = 'iai-shop-desc';
          desc.textContent = skin.desc;
          card.appendChild(desc);

          var btm = document.createElement('div');
          btm.className = 'iai-shop-bottom';

          var req = document.createElement('div');
          req.className = 'iai-shop-req' + (isUnlocked ? ' unlocked' : '');
          req.textContent = skin.reqCombo === 0 ? '默认解锁' : (isUnlocked ? '✓ 已解锁 (' + skin.reqCombo + '连斩)' : '🔒 解锁需 ' + skin.reqCombo + ' 连斩');
          btm.appendChild(req);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'iai-shop-equip-btn ' + (isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-locked'));
          btn.textContent = isEquipped ? '✅ 已装备' : (isUnlocked ? '⚡ 装备' : '🔒 未解锁');
          btn.disabled = !isUnlocked || isEquipped;

          var equipBgFn = function (e) {
            if (e) e.stopPropagation();
            if (isUnlocked && !isEquipped) {
              if (MiniGames.setEquippedIaiBgSkin(skin.id)) {
                SFX.play('buy');
                UI.flashBanner('🏮 已装备道场背景：「' + skin.name + '」', 1.8);
                UI.renderIaijutsuHub();
              }
            }
          };

          if (isUnlocked && !isEquipped) {
            btn.addEventListener('click', equipBgFn);
            card.style.cursor = 'pointer';
            card.addEventListener('click', equipBgFn);
          }

          btm.appendChild(btn);
          card.appendChild(btm);
          UI.iaiHubList.appendChild(card);
        })(bgSkins[j]);
      }
    }
    // Tab 3: 居合心流音律 (BGM 音乐商店)
    else if (tab === 'bgm') {
      var bgmTracks = MiniGames.IAI_BGM_TRACKS || (window.IaijutsuSkins && window.IaijutsuSkins.BGM_LIST) || [];
      var curBgmId = MiniGames.getEquippedIaiBgmId ? MiniGames.getEquippedIaiBgmId() : 'default';

      for (var k = 0; k < bgmTracks.length; k++) {
        (function (track) {
          var isUnlocked = high >= track.reqCombo;
          var isEquipped = curBgmId === track.id;
          var isPreviewing = window.SFX && SFX.isPreviewingIaijutsuBgm && SFX.isPreviewingIaijutsuBgm(track.id);

          var card = document.createElement('div');
          card.className = 'iai-shop-card iai-bgm-card' + (isEquipped ? ' equipped' : (isUnlocked ? '' : ' locked')) + (isPreviewing ? ' is-previewing' : '');

          var top = document.createElement('div');
          top.className = 'iai-shop-card-top';
          top.innerHTML =
            '<span class="iai-shop-emoji">' + track.emoji + '</span>' +
            '<div class="iai-shop-name">' + track.name + (isPreviewing ? ' <span class="iai-preview-playing-tag">🎶 试听中...</span>' : '') + '</div>' +
            '<span class="iai-shop-tag" style="background:' + (track.tagBg || '#0284c7') + ';color:#fff;">' + track.tag + '</span>';
          card.appendChild(top);

          var desc = document.createElement('div');
          desc.className = 'iai-shop-desc';
          desc.textContent = track.desc;
          card.appendChild(desc);

          // 显示文件路径指示（方便玩家本地替换 MP3 文件）
          var pathBadge = document.createElement('div');
          pathBadge.className = 'iai-shop-filepath';
          pathBadge.innerHTML = '<span class="iai-filepath-icon">📁</span> <code class="iai-filepath-code">assets/audio/' + (track.fileName || 'bgm.mp3') + '</code>';
          card.appendChild(pathBadge);

          var btm = document.createElement('div');
          btm.className = 'iai-shop-bottom';

          var req = document.createElement('div');
          req.className = 'iai-shop-req' + (isUnlocked ? ' unlocked' : '');
          req.textContent = track.reqCombo === 0 ? '默认解锁' : (isUnlocked ? '✓ 已解锁 (' + track.reqCombo + '连斩)' : '🔒 解锁需 ' + track.reqCombo + ' 连斩');
          btm.appendChild(req);

          var actionGroup = document.createElement('div');
          actionGroup.className = 'iai-bgm-action-group';

          // 1. 试听按钮
          var previewBtn = document.createElement('button');
          previewBtn.type = 'button';
          previewBtn.className = 'iai-shop-preview-btn' + (isPreviewing ? ' playing' : '');
          previewBtn.innerHTML = isPreviewing ? '⏹ 停止' : '🎧 试听';
          previewBtn.title = isPreviewing ? '点击停止试听' : '点击试听本首曲目';

          previewBtn.addEventListener('click', function (e) {
            if (e) e.stopPropagation();
            if (window.SFX && SFX.previewIaijutsuBgm) {
              SFX.previewIaijutsuBgm(track.id);
              UI.renderIaijutsuHub();
            }
          });
          actionGroup.appendChild(previewBtn);

          // 2. 装备按钮
          var equipBtn = document.createElement('button');
          equipBtn.type = 'button';
          equipBtn.className = 'iai-shop-equip-btn ' + (isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-locked'));
          equipBtn.textContent = isEquipped ? '✅ 已装备' : (isUnlocked ? '⚡ 装备' : '🔒 未解锁');
          equipBtn.disabled = !isUnlocked || isEquipped;

          var equipBgmFn = function (e) {
            if (e) e.stopPropagation();
            if (isUnlocked && !isEquipped) {
              if (MiniGames.setEquippedIaiBgm(track.id)) {
                SFX.play('buy');
                UI.flashBanner('🎵 已装备居合背景音乐：「' + track.name + '」', 1.8);
                UI.renderIaijutsuHub();
              }
            }
          };

          if (isUnlocked && !isEquipped) {
            equipBtn.addEventListener('click', equipBgmFn);
          }
          actionGroup.appendChild(equipBtn);

          btm.appendChild(actionGroup);
          card.appendChild(btm);
          UI.iaiHubList.appendChild(card);
        })(bgmTracks[k]);
      }
    }
    // Tab 4：无我绝杀奥义
    else if (tab === 'ultimate') {
      var ultList = (window.IaijutsuUltimates && window.IaijutsuUltimates.LIST) || [];
      var curUltId = window.IaijutsuUltimates && window.IaijutsuUltimates.getEquippedUltimateId ? window.IaijutsuUltimates.getEquippedUltimateId() : 'classic';

      // 顶部【无CD无我测试模式】快捷开关栏
      var infBar = document.createElement('div');
      infBar.style.cssText = 'grid-column: 1 / -1; display:flex; align-items:center; justify-content:space-between; background:rgba(30,41,59,0.85); border:1px solid #475569; border-radius:8px; padding:10px 16px; margin-bottom:8px;';
      var isInfMode = false;
      try { isInfMode = localStorage.getItem('iaijutsu_infinite_ult') === '1'; } catch (e) {}
      infBar.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:20px;">⚡</span>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:bold;color:#f8fafc;">【无CD无我测试模式】' + (isInfMode ? '<span style="color:#fde047;margin-left:6px;">[已生效]</span>' : '<span style="color:#94a3b8;margin-left:6px;">[已关闭]</span>') + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;">开启后在居合对决中按空格键随时无条件开大（快捷键 T / U 或页面顶部按钮均可随时切换）</div>' +
        '</div>' +
      '</div>';
      var tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.style.cssText = 'padding:7px 18px; font-weight:bold; font-size:13px; border-radius:6px; cursor:pointer; transition:all 0.2s; border:1px solid ' + (isInfMode ? '#facc15' : '#64748b') + '; background:' + (isInfMode ? 'rgba(234,179,8,0.25)' : '#334155') + '; color:' + (isInfMode ? '#fef08a' : '#cbd5e1') + ';';
      tBtn.textContent = isInfMode ? '⚡ 已开启 (点击关闭)' : '⚪ 已关闭 (点击开启)';
      tBtn.addEventListener('click', function () {
        var nextVal = !isInfMode;
        try { localStorage.setItem('iaijutsu_infinite_ult', nextVal ? '1' : '0'); } catch (e) {}
        if (window.MiniGames && MiniGames.iaijutsuData) MiniGames.iaijutsuData.infiniteUlt = nextVal;
        if (window.SFX) SFX.play(nextVal ? 'powerup' : 'click');
        UI.renderIaijutsuHub();
      });
      infBar.appendChild(tBtn);
      UI.iaiHubList.appendChild(infBar);

      for (var u = 0; u < ultList.length; u++) {
        (function (ult) {
          var isUnlocked = high >= ult.reqCombo;
          var isEquipped = curUltId === ult.id;

          var card = document.createElement('div');
          card.className = 'iai-shop-card' + (isEquipped ? ' equipped' : (isUnlocked ? '' : ' locked'));

          var top = document.createElement('div');
          top.className = 'iai-shop-card-top';
          top.innerHTML =
            '<span class="iai-shop-emoji">' + ult.emoji + '</span>' +
            '<div class="iai-shop-name">' + ult.name + '</div>' +
            '<span class="iai-shop-tag" style="background:' + (ult.tagBg || '#7c3aed') + ';color:#fff;">' + ult.tag + '</span>';
          card.appendChild(top);

          var desc = document.createElement('div');
          desc.className = 'iai-shop-desc';
          desc.textContent = ult.desc;
          card.appendChild(desc);

          var btm = document.createElement('div');
          btm.className = 'iai-shop-bottom';

          var req = document.createElement('div');
          req.className = 'iai-shop-req' + (isUnlocked ? ' unlocked' : '');
          req.textContent = ult.reqCombo === 0 ? '默认解锁' : (isUnlocked ? '✓ 已解锁 (' + ult.reqCombo + '连斩)' : '🔒 解锁需 ' + ult.reqCombo + ' 连斩');
          btm.appendChild(req);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'iai-shop-equip-btn ' + (isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-locked'));
          btn.textContent = isEquipped ? '✅ 已装备' : (isUnlocked ? '⚡ 装备' : '🔒 未解锁');
          btn.disabled = !isUnlocked || isEquipped;

          var equipUltFn = function (e) {
            if (e) e.stopPropagation();
            if (isUnlocked && !isEquipped) {
              if (window.IaijutsuUltimates && window.IaijutsuUltimates.setEquippedUltimate(ult.id, high)) {
                SFX.play('buy');
                UI.flashBanner('⚡ 已装备居合无我奥义：「' + ult.name + '」', 1.8);
                UI.renderIaijutsuHub();
              }
            }
          };

          if (isUnlocked && !isEquipped) {
            btn.addEventListener('click', equipUltFn);
            card.style.cursor = 'pointer';
            card.addEventListener('click', equipUltFn);
          }

          btm.appendChild(btn);
          card.appendChild(btm);
          UI.iaiHubList.appendChild(card);
        })(ultList[u]);
      }
    }
  },

  renderIaijutsuShop: function () { this.renderIaijutsuHub(); },
};
