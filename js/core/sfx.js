// ===== Web Audio 程序合成音效 + 背景音乐 =====
var SFX = {
  ctx: null,
  master: null,
  sfxGain: null,
  bgmGain: null,
  muted: false,
  volume: 0.55,             // 主音量（0~1，设置面板滑块控制）

  BPM: 112,
  _bgmTimer: null,
  _nextNote: 0,
  _step: 0,
  _customBuffers: {},
  _loadingCustom: false,
  _iaijutsuBgmAudio: null,
  _iaijutsuBgmPlaying: false,
  _iaijutsuBgmVolumeRatio: 0.10, // 居合斩专属背景音乐音量比例（舒适柔和不刺耳）

  // 加载自定义真实音效文件（统一从 assets/audio/ 目录加载管理，如 5b11d18ab53841919fa0d1d7334ea3da.mp3）
  _loadCustomAudio: function () {
    if (this._loadingCustom || !this.ctx) return;
    this._loadingCustom = true;
    var self = this;
    var candidates = [
      'assets/audio/juhe3.mp3',
      'assets/audio/juhe2.mp3',
      'assets/audio/juhe1.wav'
    ];

    function tryNext(idx) {
      if (idx >= candidates.length) return;
      fetch(candidates[idx])
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then(function (ab) {
          return self.ctx.decodeAudioData(ab);
        })
        .then(function (decoded) {
          self._customBuffers['iai'] = decoded;
        })
        .catch(function () {
          tryNext(idx + 1);
        });
    }
    tryNext(0);
  },

  // 在用户手势中调用以解锁音频
  init: function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this._loadCustomAudio();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.5;
    this.bgmGain.connect(this.master);

    this._loadCustomAudio();
  },

  resume: function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this._loadCustomAudio();
    if (this._iaijutsuBgmPlaying && this._iaijutsuBgmAudio && this._iaijutsuBgmAudio.paused) {
      this._iaijutsuBgmAudio.play().catch(function () {});
    }
  },

  setMuted: function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
    if (this._iaijutsuBgmAudio) {
      this._iaijutsuBgmAudio.volume = m ? 0 : (this.volume * (this._iaijutsuBgmVolumeRatio || 0.22));
    }
    if (this._previewBgmAudio) {
      this._previewBgmAudio.volume = m ? 0 : (this.volume * (this._previewBgmVolumeRatio || 0.25));
    }
    this._updateMuteUi();
  },

  toggleMute: function () {
    this.setMuted(!this.muted);
    this.play('click');
  },

  // 设置面板音量滑块：0~1
  setVolume: function (v) {
    this.volume = Utils.clamp(v, 0, 1);
    if (this.master && !this.muted) this.master.gain.value = this.volume;
    if (this._iaijutsuBgmAudio) {
      this._iaijutsuBgmAudio.volume = this.muted ? 0 : (this.volume * (this._iaijutsuBgmVolumeRatio || 0.22));
    }
    if (this._previewBgmAudio) {
      this._previewBgmAudio.volume = this.muted ? 0 : (this.volume * (this._previewBgmVolumeRatio || 0.25));
    }
    this._updateMuteUi();
  },

  setIaijutsuBgmVolumeRatio: function (ratio) {
    this._iaijutsuBgmVolumeRatio = Utils.clamp(ratio, 0, 1);
    if (this._iaijutsuBgmAudio) {
      this._iaijutsuBgmAudio.volume = this.muted ? 0 : (this.volume * this._iaijutsuBgmVolumeRatio);
    }
  },

  _updateMuteUi: function () {
    var btn = document.getElementById('settings-mute');
    if (btn) btn.textContent = this.muted ? '🔇' : '🔊';
    var vol = document.getElementById('settings-volume');
    if (vol) vol.value = Math.round(this.volume * 100);
  },

  // ---------- 基础发声单元 ----------
  // when: 绝对时间（BGM 调度用）；delay: 相对延迟（音效用）
  _tone: function (o) {
    var t = (o.when != null) ? o.when : this.ctx.currentTime + (o.delay || 0);
    var osc = this.ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t + o.dur);
    var g = this.ctx.createGain();
    var vol = o.vol || 0.2;
    var attack = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    g.connect(o.dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  },

  _noise: function (o) {
    var t = (o.when != null) ? o.when : this.ctx.currentTime + (o.delay || 0);
    var dur = o.dur;
    var n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var f = this.ctx.createBiquadFilter();
    f.type = o.filterType || 'lowpass';
    f.frequency.value = o.filterFreq || 1000;
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest || this.sfxGain);
    src.start(t);
  },

  // ---------- 音效表 ----------
  play: function (name) {
    if (!this.ctx || this.muted) return;
    // 浏览器自动播放策略：上下文可能仍处于 suspended（页面刚打开 / 从后台切回）。
    // 这里先尝试恢复；本帧还没恢复就跳过，避免恢复瞬间把积压的音效一次性齐放。
    if (this.ctx.state !== 'running') {
      this.ctx.resume();
      if (this.ctx.state !== 'running') return;
    }
    switch (name) {
      case 'shoot': // 激光：高能等离子束
        this._tone({ freq: 1150, glideTo: 280, type: 'sawtooth', dur: 0.1, vol: 0.12 });
        this._tone({ freq: 2400, glideTo: 600, type: 'sine', dur: 0.08, vol: 0.07, delay: 0.01 });
        break;
      case 'sniper': // 狙击枪：重型反器材电磁贯通炮（沉重轰鸣 + 超音速音爆）
        this._noise({ dur: 0.22, vol: 0.5, filterType: 'lowpass', filterFreq: 600 });
        this._tone({ freq: 180, glideTo: 32, type: 'square', dur: 0.25, vol: 0.42 });
        this._noise({ dur: 0.08, vol: 0.35, filterType: 'highpass', filterFreq: 3200 });
        this._tone({ freq: 2600, glideTo: 800, type: 'sawtooth', dur: 0.15, vol: 0.18 });
        break;
      case 'shotgun': // 霰弹枪：沉闷重炮群射
        this._noise({ dur: 0.26, vol: 0.45, filterType: 'lowpass', filterFreq: 950 });
        this._tone({ freq: 240, glideTo: 45, type: 'sawtooth', dur: 0.24, vol: 0.35 });
        this._noise({ dur: 0.08, vol: 0.25, filterType: 'bandpass', filterFreq: 1600 });
        break;
      case 'iai': // 居合斩：使用用户武士刀金属拔刀斩击真实音效（支持高保真AudioBuffer，未加载完成时合成音兜底）
        if (this._customBuffers && this._customBuffers['iai'] && this.ctx) {
          try {
            var sNode = this.ctx.createBufferSource();
            sNode.buffer = this._customBuffers['iai'];
            var gNode = this.ctx.createGain();
            gNode.gain.value = 0.95;
            sNode.connect(gNode);
            gNode.connect(this.sfxGain);
            sNode.start(0);
            return;
          } catch (e) {}
        }
        this._noise({ dur: 0.22, vol: 0.32, filterType: 'bandpass', filterFreq: 1800 });
        this._tone({ freq: 280, glideTo: 1420, type: 'sawtooth', dur: 0.18, vol: 0.18 });
        this._tone({ freq: 2200, glideTo: 3400, type: 'square', dur: 0.14, vol: 0.16, delay: 0.03 });
        this._tone({ freq: 3800, glideTo: 1800, type: 'sine', dur: 0.16, vol: 0.12, delay: 0.06 });
        break;
      case 'crit': // 暴击：清脆水晶破碎 + 高频金属爆破
        this._tone({ freq: 1760, glideTo: 2640, type: 'sine', dur: 0.12, vol: 0.18 });
        this._tone({ freq: 3520, glideTo: 4400, type: 'triangle', dur: 0.14, vol: 0.14, delay: 0.03 });
        this._noise({ dur: 0.08, vol: 0.2, filterType: 'highpass', filterFreq: 4000 });
        break;
      case 'hit': // 命中实感打击
        this._tone({ freq: 580, glideTo: 220, type: 'triangle', dur: 0.07, vol: 0.1 });
        this._noise({ dur: 0.05, vol: 0.12, filterType: 'bandpass', filterFreq: 1400 });
        break;
      case 'kill': // 击杀爆炸：震撼重低音轰鸣 + 碎裂破片声
        this._noise({ dur: 0.32, vol: 0.35, filterType: 'lowpass', filterFreq: 1400 });
        this._tone({ freq: 160, glideTo: 38, type: 'sawtooth', dur: 0.32, vol: 0.32 });
        this._noise({ dur: 0.12, vol: 0.22, filterType: 'highpass', filterFreq: 2600, delay: 0.04 });
        break;
      case 'hurt': // 玩家受创
        this._noise({ dur: 0.2, vol: 0.3, filterType: 'lowpass', filterFreq: 800 });
        this._tone({ freq: 210, glideTo: 65, type: 'sawtooth', dur: 0.22, vol: 0.28 });
        break;
      case 'playerhit': // 统一伤害总线对玩家的命中（与 hurt 同源，略轻）
        this._noise({ dur: 0.16, vol: 0.24, filterType: 'lowpass', filterFreq: 900 });
        this._tone({ freq: 260, glideTo: 80, type: 'sawtooth', dur: 0.18, vol: 0.22 });
        break;
      case 'explosion': // 爆炸：重低音轰鸣 + 高频破片
        this._noise({ dur: 0.38, vol: 0.4, filterType: 'lowpass', filterFreq: 1200 });
        this._tone({ freq: 140, glideTo: 30, type: 'sawtooth', dur: 0.4, vol: 0.36 });
        this._noise({ dur: 0.14, vol: 0.24, filterType: 'highpass', filterFreq: 2800, delay: 0.05 });
        break;
      case 'parry': // 完美弹反：清脆金属高频ping + 气浪
        this._tone({ freq: 2400, glideTo: 3200, type: 'square', dur: 0.1, vol: 0.16 });
        this._tone({ freq: 1200, type: 'triangle', dur: 0.16, vol: 0.14, delay: 0.02 });
        this._noise({ dur: 0.1, vol: 0.16, filterType: 'highpass', filterFreq: 3600 });
        break;
      case 'laser': // 聚能激光：高能充能嘶鸣 + 贯穿锐响
        this._tone({ freq: 320, glideTo: 1800, type: 'sawtooth', dur: 0.2, vol: 0.14 });
        this._tone({ freq: 3600, glideTo: 900, type: 'sine', dur: 0.24, vol: 0.12, delay: 0.06 });
        this._noise({ dur: 0.16, vol: 0.12, filterType: 'bandpass', filterFreq: 2400, delay: 0.04 });
        break;
      case 'charge': // 蓄力充能：持续上扬音
        this._tone({ freq: 220, glideTo: 880, type: 'triangle', dur: 0.3, vol: 0.12 });
        this._tone({ freq: 440, glideTo: 1320, type: 'sine', dur: 0.26, vol: 0.08, delay: 0.04 });
        break;
      case 'bounce': // 子弹反弹：短促弹性blip
        this._tone({ freq: 900, glideTo: 1500, type: 'triangle', dur: 0.06, vol: 0.1 });
        break;
      case 'empty': // 弹尽：干瘪空仓click
        this._noise({ dur: 0.03, vol: 0.14, filterType: 'highpass', filterFreq: 3000 });
        this._tone({ freq: 420, type: 'square', dur: 0.03, vol: 0.08, delay: 0.05 });
        break;
      case 'bomb': // 引爆：引信哔声 + 中型爆破
        this._tone({ freq: 1300, type: 'square', dur: 0.07, vol: 0.1 });
        this._tone({ freq: 1300, type: 'square', dur: 0.07, vol: 0.1, delay: 0.12 });
        this._noise({ dur: 0.3, vol: 0.34, filterType: 'lowpass', filterFreq: 1100, delay: 0.24 });
        this._tone({ freq: 170, glideTo: 40, type: 'sawtooth', dur: 0.3, vol: 0.3, delay: 0.24 });
        break;
      case 'reload': // 换弹：机械三连clack
        this._noise({ dur: 0.04, vol: 0.18, filterType: 'bandpass', filterFreq: 2000 });
        this._noise({ dur: 0.04, vol: 0.18, filterType: 'bandpass', filterFreq: 1600, delay: 0.1 });
        this._tone({ freq: 700, glideTo: 400, type: 'square', dur: 0.06, vol: 0.12, delay: 0.22 });
        break;
      case 'wave': // 波次来袭警报
        this._tone({ freq: 520, glideTo: 920, type: 'square', dur: 0.16, vol: 0.12 });
        this._tone({ freq: 720, glideTo: 1150, type: 'square', dur: 0.18, vol: 0.1, delay: 0.12 });
        break;
      case 'portal': // 传送门共鸣
        this._tone({ freq: 660, type: 'sine', dur: 0.14, vol: 0.14 });
        this._tone({ freq: 880, type: 'sine', dur: 0.14, vol: 0.14, delay: 0.09 });
        this._tone({ freq: 1320, type: 'sine', dur: 0.22, vol: 0.14, delay: 0.18 });
        this._noise({ dur: 0.32, vol: 0.12, filterType: 'highpass', filterFreq: 4500, delay: 0.18 });
        break;
      case 'nextfloor': // 进入下一层号角
        [523, 659, 784, 1046].forEach(function (f, i) {
          SFX._tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.2, delay: i * 0.08 });
        });
        break;
      case 'lock': // 门锁落锁金属沉响
        this._noise({ dur: 0.16, vol: 0.32, filterType: 'lowpass', filterFreq: 500 });
        this._tone({ freq: 130, glideTo: 60, type: 'square', dur: 0.2, vol: 0.25 });
        this._tone({ freq: 1600, glideTo: 800, type: 'square', dur: 0.08, vol: 0.1, delay: 0.08 });
        break;
      case 'boss': // 首领降临深渊震颤低吼
        this._tone({ freq: 130, glideTo: 45, type: 'sawtooth', dur: 0.8, vol: 0.38 });
        this._tone({ freq: 80, glideTo: 35, type: 'sawtooth', dur: 0.9, vol: 0.32, delay: 0.15 });
        this._noise({ dur: 0.6, vol: 0.25, filterType: 'lowpass', filterFreq: 350, delay: 0.12 });
        break;
      case 'victory': // 通关胜利凯旋号角
        [523, 659, 784, 1046, 1318].forEach(function (f, i) {
          SFX._tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.22, delay: i * 0.1 });
        });
        SFX._tone({ freq: 1046, type: 'triangle', dur: 0.7, vol: 0.2, delay: 0.52 });
        SFX._tone({ freq: 1318, type: 'sine', dur: 0.7, vol: 0.16, delay: 0.52 });
        break;
      case 'gameover': // 死亡低沉悲鸣
        [440, 349, 311, 233, 145].forEach(function (f, i) {
          SFX._tone({ freq: f, type: 'triangle', dur: 0.38, vol: 0.22, delay: i * 0.2 });
        });
        break;
      case 'click':
        this._tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.08 });
        break;
      case 'switch': // 切换武器
        this._tone({ freq: 660, type: 'square', dur: 0.05, vol: 0.09 });
        this._tone({ freq: 990, type: 'square', dur: 0.06, vol: 0.09, delay: 0.04 });
        break;
      case 'swing': // 剑锋锐利挥砍
        this._noise({ dur: 0.14, vol: 0.22, filterType: 'bandpass', filterFreq: 2000 });
        this._tone({ freq: 650, glideTo: 260, type: 'sawtooth', dur: 0.12, vol: 0.12 });
        break;
      case 'slash': // 居合/刀光破空撕裂
        this._noise({ dur: 0.16, vol: 0.26, filterType: 'bandpass', filterFreq: 3400 });
        this._tone({ freq: 2600, glideTo: 1600, type: 'sawtooth', dur: 0.14, vol: 0.15 });
        this._tone({ freq: 3600, glideTo: 2200, type: 'sine', dur: 0.1, vol: 0.1, delay: 0.02 });
        break;
      case 'dash': // 极速瞬移/破风冲刺
        this._noise({ dur: 0.18, vol: 0.25, filterType: 'bandpass', filterFreq: 2400 });
        this._tone({ freq: 600, glideTo: 1400, type: 'sine', dur: 0.16, vol: 0.14 });
        break;
      case 'bolt': // 法杖高能法球
        this._tone({ freq: 880, glideTo: 440, type: 'triangle', dur: 0.18, vol: 0.16 });
        this._tone({ freq: 1760, type: 'sine', dur: 0.12, vol: 0.08, delay: 0.02 });
        break;
      case 'cast': // 雷击/法术充能蓄力
        this._tone({ freq: 620, glideTo: 1350, type: 'sine', dur: 0.24, vol: 0.14 });
        this._tone({ freq: 930, glideTo: 2000, type: 'sine', dur: 0.26, vol: 0.1, delay: 0.06 });
        break;
      case 'lightning': // 雷霆轰顶命中
        this._noise({ dur: 0.35, vol: 0.36, filterType: 'highpass', filterFreq: 2800 });
        this._tone({ freq: 2800, glideTo: 180, type: 'sawtooth', dur: 0.32, vol: 0.28 });
        this._tone({ freq: 95, glideTo: 35, type: 'sine', dur: 0.35, vol: 0.35, delay: 0.02 });
        break;
      case 'summon': // 召唤空间裂隙
        this._tone({ freq: 520, type: 'sine', dur: 0.2, vol: 0.14 });
        this._tone({ freq: 780, type: 'sine', dur: 0.2, vol: 0.14, delay: 0.1 });
        this._tone({ freq: 1040, type: 'sine', dur: 0.32, vol: 0.14, delay: 0.2 });
        this._noise({ dur: 0.3, vol: 0.1, filterType: 'highpass', filterFreq: 4000, delay: 0.2 });
        break;
      case 'gate': // 星门裂变
        this._noise({ dur: 0.45, vol: 0.26, filterType: 'lowpass', filterFreq: 900 });
        this._tone({ freq: 160, glideTo: 70, type: 'sawtooth', dur: 0.4, vol: 0.25 });
        this._tone({ freq: 900, type: 'sine', dur: 0.3, vol: 0.12, delay: 0.1 });
        break;
      case 'stomp': // 震地重踏
        this._tone({ freq: 140, glideTo: 50, type: 'square', dur: 0.12, vol: 0.2 });
        this._noise({ dur: 0.1, vol: 0.14, filterType: 'lowpass', filterFreq: 600 });
        break;
      case 'vanish': // 空间折跃消失
        this._tone({ freq: 1600, glideTo: 3400, type: 'sine', dur: 0.18, vol: 0.14 });
        this._tone({ freq: 2400, glideTo: 5000, type: 'sine', dur: 0.22, vol: 0.1, delay: 0.06 });
        break;
      case 'root': // 第六章：那伽缠绕（低频缠丝）
        this._tone({ freq: 220, glideTo: 90, type: 'sawtooth', dur: 0.3, vol: 0.16 });
        this._tone({ freq: 330, glideTo: 140, type: 'sine', dur: 0.24, vol: 0.1, delay: 0.05 });
        break;
      case 'charm': // 第六章：阿普萨罗魅惑（迷幻琶音）
        this._tone({ freq: 740, type: 'sine', dur: 0.12, vol: 0.13 });
        this._tone({ freq: 988, type: 'sine', dur: 0.12, vol: 0.13, delay: 0.09 });
        this._tone({ freq: 1245, glideTo: 900, type: 'sine', dur: 0.2, vol: 0.12, delay: 0.18 });
        break;
      case 'guard': // 第六章：神龟卫龟甲（闷响合拢）
        this._tone({ freq: 180, glideTo: 70, type: 'square', dur: 0.16, vol: 0.14 });
        this._noise({ dur: 0.08, vol: 0.1, filterType: 'lowpass', filterFreq: 400 });
        break;
      case 'sell': // 出售
        this._tone({ freq: 880, type: 'triangle', dur: 0.09, vol: 0.14 });
        this._tone({ freq: 1175, type: 'triangle', dur: 0.14, vol: 0.14, delay: 0.06 });
        break;
      case 'buy': // 购买/强化解锁
        this._tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.15 });
        this._tone({ freq: 990, type: 'triangle', dur: 0.13, vol: 0.15, delay: 0.07 });
        this._tone({ freq: 1320, type: 'triangle', dur: 0.2, vol: 0.15, delay: 0.14 });
        break;
      case 'unlock': // 解锁栏位/系统
        this._tone({ freq: 523, type: 'sine', dur: 0.1, vol: 0.15 });
        this._tone({ freq: 659, type: 'sine', dur: 0.12, vol: 0.16, delay: 0.08 });
        this._tone({ freq: 784, type: 'sine', dur: 0.15, vol: 0.18, delay: 0.16 });
        this._tone({ freq: 1046, type: 'triangle', dur: 0.25, vol: 0.2, delay: 0.24 });
        break;
      case 'heal': // 治疗回复
        this._tone({ freq: 440, type: 'sine', dur: 0.14, vol: 0.15 });
        this._tone({ freq: 660, type: 'sine', dur: 0.18, vol: 0.16, delay: 0.08 });
        this._tone({ freq: 880, type: 'sine', dur: 0.22, vol: 0.18, delay: 0.16 });
        break;
      case 'pickup': // 拾取
        this._tone({ freq: 1046, type: 'triangle', dur: 0.07, vol: 0.12 });
        this._tone({ freq: 1568, type: 'triangle', dur: 0.09, vol: 0.1, delay: 0.04 });
        break;
      case 'crate': // 开箱
        this._noise({ dur: 0.22, vol: 0.22, filterType: 'lowpass', filterFreq: 900 });
        this._tone({ freq: 220, glideTo: 120, type: 'square', dur: 0.16, vol: 0.16 });
        this._tone({ freq: 880, glideTo: 1320, type: 'triangle', dur: 0.18, vol: 0.14, delay: 0.08 });
        break;
      case 'lockpick': // 解锁
        this._tone({ freq: 500, glideTo: 300, type: 'triangle', dur: 0.2, vol: 0.14 });
        this._tone({ freq: 750, type: 'triangle', dur: 0.12, vol: 0.12, delay: 0.1 });
        this._noise({ dur: 0.12, vol: 0.12, filterType: 'highpass', filterFreq: 3500, delay: 0.05 });
        break;
      case 'throw': // 投掷
        this._noise({ dur: 0.15, vol: 0.2, filterType: 'bandpass', filterFreq: 1700 });
        this._tone({ freq: 420, glideTo: 820, type: 'sine', dur: 0.15, vol: 0.12 });
        break;
      case 'flame': // 火焰喷射
        this._noise({ dur: 0.24, vol: 0.16, filterType: 'lowpass', filterFreq: 950 });
        break;
      case 'boss_laser': // 旋转激光
        this._tone({ freq: 800, glideTo: 320, type: 'sawtooth', dur: 0.2, vol: 0.18 });
        break;
      case 'boss_dash': // Boss超光速斩击
        this._noise({ dur: 0.2, vol: 0.35, filterType: 'bandpass', filterFreq: 2600 });
        this._tone({ freq: 120, glideTo: 600, type: 'sawtooth', dur: 0.25, vol: 0.28 });
        break;
      case 'singularity': // 黑洞引力
        this._tone({ freq: 90, glideTo: 30, type: 'sawtooth', dur: 0.6, vol: 0.35 });
        this._noise({ dur: 0.5, vol: 0.2, filterType: 'lowpass', filterFreq: 400 });
        break;
      case 'ion_strike': // 离子炮轰顶
        this._noise({ dur: 0.4, vol: 0.45, filterType: 'lowpass', filterFreq: 600 });
        this._tone({ freq: 120, glideTo: 30, type: 'sawtooth', dur: 0.45, vol: 0.4 });
        this._noise({ dur: 0.15, vol: 0.3, filterType: 'highpass', filterFreq: 3000 });
        break;
      case 'water': // 水流奔涌
        this._noise({ dur: 0.2, vol: 0.18, filterType: 'bandpass', filterFreq: 800 });
        break;
    }
  },

  // ---------- BGM（8 小节循环：Am F C G） ----------
  startBgm: function () {
    if (!this.ctx || this._bgmTimer || this._iaijutsuBgmPlaying) return;
    this._nextNote = this.ctx.currentTime + 0.1;
    this._step = 0;
    this._bgmTimer = setInterval(this._bgmTick.bind(this), 25);
  },

  stopBgm: function () {
    if (this._bgmTimer) { clearInterval(this._bgmTimer); this._bgmTimer = null; }
  },

  // ⚔️ 居合斩专属背景音乐（支持音乐商店随心切换各款 BGM）
  _iaijutsuCurTrackId: null,
  _previewBgmAudio: null,
  _previewBgmTrackId: null,
  _previewBgmVolumeRatio: 0.25,

  playIaijutsuBgm: function (trackId) {
    this._iaijutsuBgmPlaying = true;
    this.stopBgm(); // 停止常规主城/地牢合成 BGM
    this.stopIaijutsuBgmPreview(); // 停止试听

    var track = (window.IaijutsuSkins && window.IaijutsuSkins.getBgmById)
      ? (trackId ? window.IaijutsuSkins.getBgmById(trackId) : window.IaijutsuSkins.getEquippedBgm())
      : null;

    var targetId = track ? track.id : 'default';
    var targetFile = track ? track.file : 'assets/audio/iaijutsu_bgm.ogg';
    var fallbacks = (track && track.fallbacks) ? track.fallbacks.slice() : ['assets/audio/iaijutsu_bgm.ogg'];
    var targetRatio = (track && track.volumeRatio) ? track.volumeRatio : 0.22;
    this._iaijutsuBgmVolumeRatio = targetRatio;

    // 如果已经在播放相同音轨且未暂停，只需更新音量
    if (this._iaijutsuBgmAudio && this._iaijutsuCurTrackId === targetId && !this._iaijutsuBgmAudio.paused) {
      this._iaijutsuBgmAudio.volume = this.muted ? 0 : (this.volume * this._iaijutsuBgmVolumeRatio);
      return;
    }

    if (this._iaijutsuBgmAudio) {
      try {
        this._iaijutsuBgmAudio.pause();
      } catch (e) {}
    }

    var audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';

    var sources = [targetFile].concat(fallbacks);
    var sIdx = 0;
    audio.src = sources[0];
    audio.onerror = function () {
      sIdx++;
      if (sIdx < sources.length) {
        audio.src = sources[sIdx];
        audio.play().catch(function () {});
      }
    };

    this._iaijutsuBgmAudio = audio;
    this._iaijutsuCurTrackId = targetId;
    this._iaijutsuBgmAudio.volume = this.muted ? 0 : (this.volume * this._iaijutsuBgmVolumeRatio);

    var playPromise = this._iaijutsuBgmAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(function () {});
    }
  },

  stopIaijutsuBgm: function () {
    this._iaijutsuBgmPlaying = false;
    this._iaijutsuCurTrackId = null;
    if (this._iaijutsuBgmAudio) {
      try {
        this._iaijutsuBgmAudio.pause();
        this._iaijutsuBgmAudio.currentTime = 0;
      } catch (e) {}
    }
  },

  // 🎵 音乐商店专属 · 单曲即时试听与暂停
  previewIaijutsuBgm: function (trackId) {
    // 若当前正在试听同一首，则切换为暂停
    if (this._previewBgmAudio && this._previewBgmTrackId === trackId && !this._previewBgmAudio.paused) {
      this.stopIaijutsuBgmPreview();
      return false; // 已停止试听
    }

    this.stopIaijutsuBgmPreview();

    // 如果正在进行特训游戏或播放原 BGM，暂时静音或暂停以专注试听
    if (this._iaijutsuBgmAudio && !this._iaijutsuBgmAudio.paused) {
      try { this._iaijutsuBgmAudio.pause(); } catch (e) {}
    }

    var track = (window.IaijutsuSkins && window.IaijutsuSkins.getBgmById)
      ? window.IaijutsuSkins.getBgmById(trackId)
      : null;
    if (!track) return false;

    var audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    var sources = [track.file].concat(track.fallbacks || []);
    var sIdx = 0;
    audio.src = sources[0];
    audio.onerror = function () {
      sIdx++;
      if (sIdx < sources.length) {
        audio.src = sources[sIdx];
        audio.play().catch(function () {});
      }
    };

    this._previewBgmVolumeRatio = track.volumeRatio || 0.25;
    audio.volume = this.muted ? 0 : (this.volume * this._previewBgmVolumeRatio);
    this._previewBgmAudio = audio;
    this._previewBgmTrackId = trackId;

    var self = this;
    var playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(function () {
        self.stopIaijutsuBgmPreview();
      });
    }
    return true; // 正在试听
  },

  stopIaijutsuBgmPreview: function () {
    if (this._previewBgmAudio) {
      try {
        this._previewBgmAudio.pause();
        this._previewBgmAudio.currentTime = 0;
      } catch (e) {}
      this._previewBgmAudio = null;
    }
    this._previewBgmTrackId = null;

    // 如果正在居合斩游戏中，恢复游戏背景音乐
    if (this._iaijutsuBgmPlaying && this._iaijutsuBgmAudio && this._iaijutsuBgmAudio.paused) {
      this._iaijutsuBgmAudio.play().catch(function () {});
    }
  },

  isPreviewingIaijutsuBgm: function (trackId) {
    return !!(this._previewBgmAudio && !this._previewBgmAudio.paused && (trackId ? this._previewBgmTrackId === trackId : true));
  },

  getPreviewingIaijutsuBgmId: function () {
    return (this._previewBgmAudio && !this._previewBgmAudio.paused) ? this._previewBgmTrackId : null;
  },

  _bgmTick: function () {
    var sixteenth = 60 / this.BPM / 4;
    while (this._nextNote < this.ctx.currentTime + 0.12) {
      this._scheduleStep(this._step, this._nextNote);
      this._step = (this._step + 1) % 128;
      this._nextNote += sixteenth;
    }
  },

  _chords: [
    { root: 110.0, tones: [220, 261.63, 329.63] },   // Am
    { root: 87.31, tones: [174.61, 220, 261.63] },   // F
    { root: 130.81, tones: [261.63, 329.63, 392.0] },// C
    { root: 98.0, tones: [196, 246.94, 293.66] },    // G
  ],

  // 稀疏主旋律（A 小调五声音阶），{step: freq}
  _lead: {
    0: 440, 8: 523.25,
    18: 659.25, 26: 587.33,
    32: 880, 40: 783.99,
    48: 659.25, 56: 523.25,
    64: 440, 70: 523.25, 74: 587.33,
    82: 659.25, 90: 783.99,
    96: 880, 102: 880, 106: 783.99,
    112: 659.25, 120: 440,
  },

  _scheduleStep: function (step, t) {
    var chordIndex = Math.floor(step / 32);
    var ch = this._chords[chordIndex];
    var barStep = step % 16;

    // 底鼓：每拍
    if (barStep % 4 === 0) {
      this._tone({ when: t, freq: 150, glideTo: 48, type: 'sine', dur: 0.12, vol: 0.42, dest: this.bgmGain });
    }
    // 踩镲：后半拍
    if (barStep % 4 === 2) {
      this._noise({ when: t, dur: 0.03, vol: 0.05, filterType: 'highpass', filterFreq: 6000, dest: this.bgmGain });
    }
    // 贝斯：八分音符（偶数步）
    if (barStep % 2 === 0) {
      var oct = (Math.floor(barStep / 4) % 2 === 0) ? 1 : 2;
      this._tone({ when: t, freq: ch.root * oct, type: 'sine', dur: 0.14, vol: 0.2, dest: this.bgmGain });
    }
    // 琶音：后半八分（奇数步）
    if (barStep % 2 === 1) {
      var arpIdx = [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(barStep / 2)];
      this._tone({ when: t, freq: ch.tones[arpIdx], type: 'triangle', dur: 0.16, vol: 0.08, dest: this.bgmGain });
    }
    // 主旋律
    if (this._lead[step] != null) {
      this._tone({ when: t, freq: this._lead[step], type: 'triangle', dur: 0.4, vol: 0.13, attack: 0.02, dest: this.bgmGain });
    }
  },

  // 赛事片头开场震撼和弦 + 赛博凝聚爆破声
  playIntroBoom: function () {
    if (!this.ctx) return;
    try {
      // 1. 聚拢深音嗡鸣
      this._tone({ freq: 80, glideTo: 180, type: 'sawtooth', dur: 1.2, vol: 0.22 });
      // 2. 聚拢高频能量流
      this._tone({ freq: 440, glideTo: 1760, type: 'sine', dur: 1.3, vol: 0.12, delay: 0.1 });
      // 3. 爆裂冲击波 (1.35s 处冲击音)
      this._noise({ dur: 0.65, vol: 0.35, filterType: 'lowpass', filterFreq: 600, delay: 1.32 });
      this._tone({ freq: 140, glideTo: 36, type: 'sawtooth', dur: 0.8, vol: 0.38, delay: 1.34 });
      // 4. 赛事和弦亮起 (C大调高亢共鸣: C5-E5-G5-B5)
      var chords = [523.25, 659.25, 783.99, 987.77, 1046.5];
      var self = this;
      chords.forEach(function (f, idx) {
        self._tone({ freq: f, type: 'triangle', dur: 1.4, vol: 0.16, delay: 1.36 + idx * 0.04 });
        self._tone({ freq: f * 1.5, type: 'sine', dur: 1.6, vol: 0.08, delay: 1.4 + idx * 0.04 });
      });
    } catch (e) {}
  },
};

