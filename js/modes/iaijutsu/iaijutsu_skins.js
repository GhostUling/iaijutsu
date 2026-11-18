// ============================================================================
// 居合斩专属模块 · 特效皮肤管理 (Iaijutsu Skins & Customization)
// ============================================================================

window.IaijutsuSkins = {
  // 居合斩专属特效皮肤定义 (多色渐变与高饱和华丽特效，兼顾极致60帧流畅性能)
  LIST: [
    {
      id: 'classic',
      name: '苍蓝极刃',
      emoji: '⚔️',
      tag: '初始',
      tagBg: '#0284c7',
      reqCombo: 0,
      desc: '深海幽蓝与霓虹青光的双色音爆剑气，刃尖闪耀星芒冷光。',
      primaryColor: '#00f0ff',
      secondaryColor: '#2563eb',
      coreColor: '#ffffff',
      trailGlow: '#00f0ff',
      particleColors: ['#00f0ff', '#ffffff', '#38bdf8', '#2563eb', '#bae6fd'],
      burstEmoji: '⚡',
      glowColor: '#00f0ff'
    },
    {
      id: 'water',
      name: '流水断瀑',
      emoji: '🌊',
      tag: '水华',
      tagBg: '#0284c7',
      reqCombo: 20,
      desc: '碧波如练、怒涛穿石！刀痕如清冽水流激荡飞溅，附带水波涟漪与晶莹水花水滴。',
      primaryColor: '#0ea5e9',
      secondaryColor: '#0369a1',
      coreColor: '#e0f2fe',
      trailGlow: '#38bdf8',
      particleColors: ['#ffffff', '#bae6fd', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1'],
      burstEmoji: '🌊',
      glowColor: '#38bdf8'
    },
    {
      id: 'crimson',
      name: '赤焰红莲',
      emoji: '🔥',
      tag: '狂暴',
      tagBg: '#dc2626',
      reqCombo: 15,
      desc: '炽热金阳与业火赤红交织的熔岩焰浪，斩切时爆散金红火星与灼热余烬。',
      primaryColor: '#ff3b30',
      secondaryColor: '#ff9500',
      coreColor: '#fef08a',
      trailGlow: '#ff5722',
      particleColors: ['#fef08a', '#facc15', '#ff9500', '#ff3b30', '#dc2626'],
      burstEmoji: '🔥',
      glowColor: '#ff3b30'
    },
    {
      id: 'thunder',
      name: '紫霄雷煞',
      emoji: '⚡',
      tag: '破极',
      tagBg: '#7c3aed',
      reqCombo: 30,
      desc: '极光幽紫与电浆青蓝交织的双色等离子电弧，沿途爆裂高亮折线雷斑。',
      primaryColor: '#a855f7',
      secondaryColor: '#06b6d4',
      coreColor: '#f8fafc',
      trailGlow: '#c084fc',
      particleColors: ['#ffffff', '#22d3ee', '#c084fc', '#9333ea', '#a855f7'],
      burstEmoji: '⚡',
      glowColor: '#a855f7'
    },
    {
      id: 'aurum',
      name: '暗金神域',
      emoji: '👑',
      tag: '神域',
      tagBg: '#ca8a04',
      reqCombo: 50,
      desc: '24K流金色与落日暖橙相融的神圣天罚，爆散高饱和璀璨四芒星。',
      primaryColor: '#facc15',
      secondaryColor: '#f97316',
      coreColor: '#ffffff',
      trailGlow: '#facc15',
      particleColors: ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#d97706'],
      burstEmoji: '✨',
      glowColor: '#facc15'
    },
    {
      id: 'void',
      name: '虚空断绝',
      emoji: '🌌',
      tag: '绝境',
      tagBg: '#e11d48',
      reqCombo: 75,
      desc: '霓虹玫红与深渊暗紫交融的次元裂缝，所过之处崩解出晶莹碎隙。',
      primaryColor: '#f43f5e',
      secondaryColor: '#7e22ce',
      coreColor: '#bae6fd',
      trailGlow: '#f43f5e',
      particleColors: ['#ffffff', '#ff007f', '#f43f5e', '#a855f7', '#3b0764'],
      burstEmoji: '🌌',
      glowColor: '#f43f5e'
    },
    {
      id: 'sakura',
      name: '粉樱落雪',
      emoji: '🌸',
      tag: '极境',
      tagBg: '#db2777',
      reqCombo: 100,
      desc: '艳丽绯红与娇嫩柔粉双色花刃，沿途飘洒鲜明落樱花瓣与粉白光屑。',
      primaryColor: '#f472b6',
      secondaryColor: '#e11d48',
      coreColor: '#ffffff',
      trailGlow: '#f472b6',
      particleColors: ['#ffffff', '#fbcfe8', '#f472b6', '#e11d48', '#fda4af'],
      burstEmoji: '🌸',
      glowColor: '#f472b6'
    },
    {
      id: 'zen',
      name: '水墨太极',
      emoji: '☯️',
      tag: '无我',
      tagBg: '#1e293b',
      reqCombo: 150,
      desc: '黑白交融、阴阳相生的水墨极意！黑墨与银光浑然一体，浓墨与飞白相映成趣。',
      primaryColor: '#0a0f1d',
      secondaryColor: '#ffffff',
      coreColor: '#94a3b8',
      trailGlow: '#ffffff',
      particleColors: ['#090d16', '#ffffff', '#0f172a', '#e2e8f0', '#64748b'],
      burstEmoji: '☯️',
      glowColor: '#ffffff'
    }
  ],

  // 获取当前装备的居合斩特效ID
  getEquippedSkinId: function () {
    try {
      return localStorage.getItem('iaijutsu_slash_skin') || 'classic';
    } catch (e) {
      return 'classic';
    }
  },

  // 获取当前装备的皮肤对象
  getEquippedSkin: function () {
    var id = this.getEquippedSkinId();
    for (var i = 0; i < this.LIST.length; i++) {
      if (this.LIST[i].id === id) return this.LIST[i];
    }
    return this.LIST[0];
  },

  // 装备特效皮肤（检查是否已达到解锁连击数）
  setEquippedSkin: function (skinId, highScore) {
    var skin = null;
    for (var i = 0; i < this.LIST.length; i++) {
      if (this.LIST[i].id === skinId) { skin = this.LIST[i]; break; }
    }
    if (!skin) return false;
    var high = highScore !== undefined ? highScore : 0;
    if (high < skin.reqCombo) return false; // 未解锁
    try {
      localStorage.setItem('iaijutsu_slash_skin', skinId);
      return true;
    } catch (e) {
      return false;
    }
  },

  // ============================================================================
  // 道场背景皮肤定义 (Dojo Background Skins)
  // ============================================================================
  BG_LIST: [
    {
      id: 'none',
      name: '纯净空境',
      emoji: '🔲',
      tag: '初始',
      tagBg: '#475569',
      reqCombo: 0,
      desc: '无任何背景几何阵法与光阵干扰，心无杂念，返璞归真，专注极限刀感与视觉反馈。'
    },
    {
      id: 'cross_blade',
      name: '四芒视界',
      emoji: '🎯',
      tag: '锋芒',
      tagBg: '#0ea5e9',
      reqCombo: 10,
      desc: '向心收缩的四芒星切线与视界光圈，四道锐利弧光向外弯曲渐细，中心镂空准星，高速向心自转与共鸣。'
    },
    {
      id: 'mitsudomoe',
      name: '极意三巴纹',
      emoji: '🌀',
      tag: '动感',
      tagBg: '#ec4899',
      reqCombo: 18,
      desc: '几何重构的日本传统「三巴纹（Mitsudomoe）」，三个勾玉追尾连环极速旋转，极简发光线框轮廓与三旋涡流冲击波，动感与节奏韵律极强。'
    },
    {
      id: 'mandala',
      name: '虚无曼陀罗',
      emoji: '💠',
      tag: '心流',
      tagBg: '#8b5cf6',
      reqCombo: 30,
      desc: '双层反向旋转的「虚无齿轮 / 曼陀罗线框」，外圈顺时针慢转，内圈逆时针快转，极淡几何细虚线构成催眠专注视错觉。'
    },
    {
      id: 'compass',
      name: '极道罗盘',
      emoji: '🧭',
      tag: '阵眼',
      tagBg: '#f59e0b',
      reqCombo: 45,
      desc: '12方位剑符圆环罗盘、八芒破空星阵与双层逆旋阵轮，随连击激荡同心共鸣脉冲与聚气光晕。'
    }
  ],

  // 获取当前装备的道场背景皮肤ID
  getEquippedBgSkinId: function () {
    try {
      return localStorage.getItem('iaijutsu_bg_skin') || 'none';
    } catch (e) {
      return 'none';
    }
  },

  // 获取当前装备的背景皮肤对象
  getEquippedBgSkin: function () {
    var id = this.getEquippedBgSkinId();
    for (var i = 0; i < this.BG_LIST.length; i++) {
      if (this.BG_LIST[i].id === id) return this.BG_LIST[i];
    }
    return this.BG_LIST[0];
  },

  // 装备道场背景皮肤（检查是否已达到解锁连击数）
  setEquippedBgSkin: function (bgSkinId, highScore) {
    var skin = null;
    for (var i = 0; i < this.BG_LIST.length; i++) {
      if (this.BG_LIST[i].id === bgSkinId) { skin = this.BG_LIST[i]; break; }
    }
    if (!skin) return false;
    var high = highScore !== undefined ? highScore : 0;
    if (high < skin.reqCombo) return false; // 未解锁
    try {
      localStorage.setItem('iaijutsu_bg_skin', bgSkinId);
      return true;
    } catch (e) {
      return false;
    }
  },

  // ============================================================================
  // 居合心流音律定义 (Iaijutsu BGM Soundtracks & Music Store)
  // ============================================================================
  BGM_LIST: [
    {
      id: 'default',
      name: '热血战歌 · 初心',
      emoji: '🔥',
      tag: '原版',
      tagBg: '#0284c7',
      reqCombo: 0,
      desc: '经典居合原版激昂战曲，激越电音与强劲战鼓交织，出鞘即决死。',
      fileName: 'iaijutsu_bgm.ogg',
      file: 'assets/audio/iaijutsu_bgm.ogg',
      fallbacks: ['assets/audio/iaijutsu_bgm.ogg'],
      volumeRatio: 0.12
    },
    {
      id: 'bgm_1',
      name: '疾风迅雷 · 破晓',
      emoji: '⚡',
      tag: '疾速',
      tagBg: '#7c3aed',
      reqCombo: 0,
      desc: '高节奏电子合成脉冲与紧迫音阶，专为极限手速与毫秒级反应特训打造。',
      fileName: 'bgm_iaijutsu_1.mp3',
      file: 'assets/audio/bgm_iaijutsu_1.mp3',
      volumeRatio: 0.28
    },
    {
      id: 'bgm_2',
      name: '落樱幽瞑 · 禅心',
      emoji: '🌸',
      tag: '心流',
      tagBg: '#db2777',
      reqCombo: 10,
      desc: '悠扬空灵的和风五声音阶与清幽笛鸣，平复躁动心绪，进入心流空灵之境。',
      fileName: 'bgm_iaijutsu_2.mp3',
      file: 'assets/audio/bgm_iaijutsu_2.mp3',
      volumeRatio: 0.28
    },
    {
      id: 'bgm_3',
      name: '修罗血海 · 焚天',
      emoji: '⚔️',
      tag: '狂暴',
      tagBg: '#dc2626',
      reqCombo: 25,
      desc: '重低音震荡与轰鸣战鼓激荡，犹如置身万军从中浴血拔刀，决死突围。',
      fileName: 'bgm_iaijutsu_3.mp3',
      file: 'assets/audio/bgm_iaijutsu_3.mp3',
      volumeRatio: 0.28
    },
    {
      id: 'bgm_4',
      name: '太虚星海 · 绝巅',
      emoji: '🌌',
      tag: '极境',
      tagBg: '#ca8a04',
      reqCombo: 50,
      desc: '宏大空灵的深空漫游旋律与无上剑意，超脱生死凡尘，见证剑道极意。',
      fileName: 'bgm_iaijutsu_4.mp3',
      file: 'assets/audio/bgm_iaijutsu_4.mp3',
      volumeRatio: 0.28
    },
    {
      id: 'bgm_5',
      name: '水墨玄机 · 无我',
      emoji: '☯️',
      tag: '无我',
      tagBg: '#1e293b',
      reqCombo: 80,
      desc: '孤寂悠远、阴阳交融的水墨意境，大音希声，唯有心刃出鞘之刹那。',
      fileName: 'bgm_iaijutsu_5.mp3',
      file: 'assets/audio/bgm_iaijutsu_5.mp3',
      volumeRatio: 0.28
    }
  ],

  // 根据ID获取音乐对象
  getBgmById: function (bgmId) {
    for (var i = 0; i < this.BGM_LIST.length; i++) {
      if (this.BGM_LIST[i].id === bgmId) return this.BGM_LIST[i];
    }
    return this.BGM_LIST[0];
  },

  // 获取当前装备的居合斩背景音乐ID
  getEquippedBgmId: function () {
    try {
      return localStorage.getItem('iaijutsu_bgm_track') || 'default';
    } catch (e) {
      return 'default';
    }
  },

  // 获取当前装备的背景音乐对象
  getEquippedBgm: function () {
    var id = this.getEquippedBgmId();
    return this.getBgmById(id);
  },

  // 装备背景音乐（检查是否已达到解锁连击数）
  setEquippedBgm: function (bgmId, highScore) {
    var track = this.getBgmById(bgmId);
    if (!track) return false;
    var high = highScore !== undefined ? highScore : 0;
    if (high < track.reqCombo) return false; // 未解锁
    try {
      localStorage.setItem('iaijutsu_bgm_track', bgmId);
      return true;
    } catch (e) {
      return false;
    }
  }
};

