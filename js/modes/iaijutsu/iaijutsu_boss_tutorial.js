// ============================================================================
// 宿敌战 · 交互式新手教程（5 课实战道场，零死亡风险，不改动原版 5 个文件）
// 1. 破绽弱点与「两刀撤步」
// 2. 识别【危】字杀招并闪出红区
// 3. 核心绝技：✦ 金光按【空格】心眼见切（含教学慢放提示）
// 4. 斩碎飞刃弹幕（左键穿透 / 右键挥砍 / 空格震散）
// 5. 打满架势条 → 触发【居合处决】终结毕业
// ============================================================================

var IAIJUTSU_BOSS_TUTORIAL_BASE = window.IaijutsuModeBoss;

var IaijutsuModeBossTutorial = Object.assign({}, IAIJUTSU_BOSS_TUTORIAL_BASE);

IaijutsuModeBossTutorial.DONE_KEY = 'arcade_iaijutsu_boss_tutorial_done';

IaijutsuModeBossTutorial.LESSONS = [
  {
    id: 'weak_strike',
    num: 1,
    title: '破绽弱点 · 两刀原则',
    goalLabel: '破绽期斩中宿敌',
    target: 2,
    keyHint: '鼠标左键 突进出刀',
    desc: 'Boss 没在蓄力时才可攻击。瞄准金色【弱点】左键突进伤害更高，但砍满 2 刀 Boss 就会撤步反击，切忌贪刀！',
    tip: '👉 将准星指向 Boss 身旁的金色弱点光球，点【左键】突进斩击！'
  },
  {
    id: 'dodge_unblockable',
    num: 2,
    title: '识别【危】字杀招 · 必闪红区',
    goalLabel: '无伤躲过危字十字斩',
    target: 2,
    keyHint: '左键闪向绿圈 / WASD',
    desc: '头顶出现红色【危】字代表不可弹反！千万别按空格，也别往 Boss 身上撞（蓄力硬撞会被震刀弹开），直接闪出红区！',
    tip: '👉 红色【危】字亮起时，鼠标指到红区外的绿色安全区，点【左键】或按 WASD 躲开！'
  },
  {
    id: 'mikiri_parry',
    num: 3,
    title: '核心绝技 · ✦ 金光【空格】心眼见切',
    goalLabel: '触发完美心眼见切',
    target: 2,
    keyHint: '看到 ✦ 金光按【空格】',
    desc: '可弹反招式蓄力将尽时会爆出【✦ 金色闪光】！此时按【空格】立刻无伤弹反、反砍一刀、狂涨架势条并刷新突进冷却！',
    tip: '👉 先别点左键撞他！盯紧 Boss，出现 ✦ 金光闪现（已开启教学慢放）立刻按【空格】！'
  },
  {
    id: 'cut_blades',
    num: 4,
    title: '斩碎飞刃 · 攻防一体',
    goalLabel: '斩碎飞行刀气',
    target: 3,
    keyHint: '左键穿透 / 右键挥砍',
    desc: 'Boss 释放飞刃弹幕时无需干等：左键突进穿透或贴近按【右键】原地挥砍都能切碎飞刃，还能顺手蹭涨架势！',
    tip: '👉 等青红刀气飞近，按【右键】挥砍或【左键】穿过去把它们斩碎（共 3 道）！'
  },
  {
    id: 'execute_finish',
    num: 5,
    title: '架势崩解 · 居合处决！',
    goalLabel: '完成 1 次居合处决',
    target: 1,
    keyHint: '空格见切/斩弱点 → 左键处决',
    desc: '当 Boss 血条下方的金色【架势条】打满，他会跪地破防！此时立刻朝 Boss 点【左键】即可发动高伤【居合处决】！',
    tip: '👉 架势已蓄至 85%！用【空格】见切或斩击打满架势，等他跪地破防后【左键】穿透处决！'
  }
];

IaijutsuModeBossTutorial.isCompleted = function () {
  try {
    return localStorage.getItem(this.DONE_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

IaijutsuModeBossTutorial.markCompleted = function () {
  try {
    localStorage.setItem(this.DONE_KEY, 'true');
  } catch (e) {}
};

// --------------------------------------------------------------------------
// 初始化：固定请出「无明」担任教官，开启不死保护与 5 课状态机
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial.init = function (mg) {
  mg.selectedBossId = 'mumyo';
  IAIJUTSU_BOSS_TUTORIAL_BASE.init.call(this, mg);

  var data = mg.iaijutsuData;
  if (!data || !data.boss) return;

  data.bossTutorial = true;
  data.lives = 3;
  data.tutorialStep = 0;
  data.tutorialProgress = 0;
  data.tutorialStepTimer = 0;
  data.tutorialAdvanceTimer = 0;
  data.tutorialDone = false;
  data.tutorialTip = '';
  data.tutorialTipKind = 'info'; // 'info' | 'warn' | 'good'
  data.tutorialCastCooldown = 0.9;
  data.tutorialStepHit = false;
  data.tutorialHitCount = 0;
  data.tutorialSlashCount = 0;
  data.tutorialBladesCut = 0;
  data.tutorialEvent = '';
  data.tutorialWasAction = false;
  data.tutorialParrySlow = false;

  // 初始站位：左右拉开清晰的对峙距离
  var rx = mg.room.worldX, ry = mg.room.worldY;
  Player.x = rx + CFG.W * 0.28;
  Player.y = ry + CFG.H * 0.56;
  data.boss.x = rx + CFG.W * 0.68;
  data.boss.y = ry + CFG.H * 0.52;
  data.boss.introT = 0;
  data.boss.state = 'idle';
  data.boss.stateT = 0;
  data.boss.stateDur = 999;

  // 移除初始小怪，到第 4 课再按需展示
  for (var i = data.dummies.length - 1; i >= 0; i--) {
    if (data.dummies[i].bossMinion) data.dummies.splice(i, 1);
  }
  data.bossMinions = [];

  this.setupLesson(0, mg);

  data.bannerTimer = 2.0;
  data.bannerText = '📖 宿敌道场 · 新手特训开始';
  data.bannerSub = '特训全程免死 · 5 课实战包会宿敌对决';
};

// --------------------------------------------------------------------------
// 切换课程（支持顺序推进或一键跳过本课）
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial.setupLesson = function (stepIdx, mg) {
  var data = mg.iaijutsuData;
  var boss = data && data.boss;
  if (!data || !boss) return;

  if (stepIdx >= this.LESSONS.length) {
    this.finishTutorial(mg);
    return;
  }

  var lesson = this.LESSONS[stepIdx];
  data.tutorialStep = stepIdx;
  data.tutorialProgress = 0;
  data.tutorialStepTimer = 0;
  data.tutorialAdvanceTimer = 0;
  data.tutorialStepHit = false;
  data.tutorialWasAction = false;
  data.tutorialEvent = '';
  data.tutorialTip = lesson.tip;
  data.tutorialTipKind = 'info';
  data.tutorialBaseSlash = data.tutorialSlashCount || 0;
  data.tutorialBaseParry = data.parryCount || 0;
  data.tutorialBaseBlades = data.tutorialBladesCut || 0;
  data.tutorialBaseExec = data.execCount || 0;

  // 重置教官与场地状态，避免上节课残留技能干扰
  var rx = mg.room.worldX, ry = mg.room.worldY;
  boss.blades.length = 0;
  boss.hazards.length = 0;
  boss.pendingClones = [];
  boss.action = null;
  boss.comboStep = 0;
  boss.windowHits = 0;
  boss.hitCd = 0;
  boss.hp = boss.maxHp;
  boss.phase = 1;
  boss.state = 'idle';
  boss.stateT = 0;
  boss.stateDur = 999;
  boss.vulnerable = true;
  boss.tutorialNoAutoPick = true;
  boss.tutorialLockPosture = true;
  boss.tutorialParryWindow = 0;

  Player.skillTimers[1] = 0;
  data.eyeCd = 0;

  // 若双方太近，重置到舒服的中距离观察位
  if (Utils.dist(Player.x, Player.y, boss.x, boss.y) < 160) {
    Player.x = rx + CFG.W * 0.28;
    Player.y = ry + CFG.H * 0.54;
    boss.x = rx + CFG.W * 0.68;
    boss.y = ry + CFG.H * 0.50;
  }

  if (lesson.id === 'weak_strike') {
    boss.posture = 0;
    data.tutorialCastCooldown = 999;
  } else if (lesson.id === 'dodge_unblockable') {
    boss.posture = 0;
    data.tutorialCastCooldown = 0.85;
  } else if (lesson.id === 'mikiri_parry') {
    boss.posture = 0;
    boss.tutorialParryWindow = 0.52;
    data.tutorialCastCooldown = 0.9;
  } else if (lesson.id === 'cut_blades') {
    boss.posture = 0;
    data.tutorialCastCooldown = 0.65;
    // 放 1 个刀魂靶展示拉扯跳板
    this.spawnMinions(mg, 1);
  } else if (lesson.id === 'execute_finish') {
    boss.tutorialLockPosture = false;
    boss.tutorialParryWindow = 0.52;
    boss.posture = Math.floor(boss.maxPosture * 0.84);
    boss.postureDecayDelay = 999;
    data.tutorialCastCooldown = 1.2;
  }

  this.syncHud(mg);
};

IaijutsuModeBossTutorial.skipCurrentLesson = function (mg) {
  var data = mg && mg.iaijutsuData;
  if (!data || !data.bossTutorial || data.tutorialDone) return;
  SFX.play('click');
  this.setupLesson(data.tutorialStep + 1, mg);
};

IaijutsuModeBossTutorial.finishTutorial = function (mg) {
  var data = mg.iaijutsuData;
  if (!data || data.tutorialDone) return;
  data.tutorialDone = true;
  data.tutorialAdvanceTimer = 0;
  this.markCompleted();

  if (data.boss) {
    data.boss.blades.length = 0;
    data.boss.hazards.length = 0;
    data.boss.state = 'idle';
    data.boss.stateDur = 999;
    data.boss.action = null;
  }

  SFX.play('victory');
  SFX.play('lightning');
  Main.shakeTrauma = Math.max(Main.shakeTrauma || 0, 0.45);
  data.bannerTimer = 2.6;
  data.bannerText = '🎓 宿敌心法已成 · 特训毕业！';
  data.bannerSub = '现在你可以自信挑战三大宿敌了';

  this.syncHud(mg);
  if (window.UI && UI.showTutorialComplete) {
    UI.showTutorialComplete();
  }
};

// --------------------------------------------------------------------------
// 同步底部教学提示条 HUD
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial.syncHud = function (mg) {
  if (!window.UI || !UI.updateTutorialHud) return;
  var data = mg && mg.iaijutsuData;
  if (!data || !data.bossTutorial) return;
  var idx = Math.min(data.tutorialStep || 0, this.LESSONS.length - 1);
  var lesson = this.LESSONS[idx];
  UI.updateTutorialHud({
    visible: true,
    step: idx,
    total: this.LESSONS.length,
    num: lesson.num,
    title: lesson.title,
    desc: lesson.desc,
    keyHint: lesson.keyHint,
    goalLabel: lesson.goalLabel,
    progress: Math.min(data.tutorialProgress || 0, lesson.target),
    target: lesson.target,
    tip: data.tutorialTip || lesson.tip,
    tipKind: data.tutorialTipKind || 'info',
    done: !!data.tutorialDone
  });
};

// --------------------------------------------------------------------------
// 教学专用招式发招器（节奏放缓、单段清晰、聚焦当前课题）
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial._castTutorialCrossCut = function (boss, mg) {
  var rx = mg.room.worldX, ry = mg.room.worldY;
  var cx = Utils.clamp(Player.x, rx + 120, rx + CFG.W - 120);
  var cy = Utils.clamp(Player.y, ry + 120, ry + CFG.H - 120);
  boss.action = 'cross_cut';
  boss.state = 'telegraph';
  boss.stateT = 0;
  boss.stateDur = 1.28;
  boss.comboStep = 1; // 教学仅单波
  boss.vulnerable = false;
  boss.hitCd = 0;
  boss.hazards.length = 0;
  boss.hazards.push(
    { kind: 'line', cx: cx, cy: cy, angle: Math.PI * 0.25, len: 560, halfW: 28, t: 0, dur: boss.stateDur, fired: false, fireT: 0, hit: false },
    { kind: 'line', cx: cx, cy: cy, angle: -Math.PI * 0.25, len: 560, halfW: 28, t: 0, dur: boss.stateDur, fired: false, fireT: 0, hit: false }
  );
  mg.iaijutsuData.tutorialStepHit = false;
  mg.iaijutsuData.tutorialWasAction = false;
  SFX.play('swing');
  FX.floatText(boss.x, boss.y - boss.r - 30, '危 十字断空 · 快闪出红区!', '#f87171', 1.4);
};

IaijutsuModeBossTutorial._castTutorialParryDraw = function (boss, mg) {
  var rx = mg.room.worldX, ry = mg.room.worldY;
  // 先优雅瞬步到玩家附近 150px 处，保证玩家看得清、挥砍也能打中
  var ang = Math.atan2(boss.y - Player.y, boss.x - Player.x);
  if (!isFinite(ang)) ang = 0;
  boss.x = Utils.clamp(Player.x + Math.cos(ang) * 145, rx + 110, rx + CFG.W - 110);
  boss.y = Utils.clamp(Player.y + Math.sin(ang) * 145, ry + 115, ry + CFG.H - 105);

  boss.action = 'iaijutsu_draw';
  boss.state = 'telegraph';
  boss.stateT = 0;
  boss.stateDur = 1.18;
  boss.comboStep = 1; // 单段清晰演示
  boss.vulnerable = false;
  boss.swingHit = false;
  boss.aim = Math.atan2(Player.y - boss.y, Player.x - boss.x);
  mg.iaijutsuData.tutorialStepHit = false;
  mg.iaijutsuData.tutorialWasAction = false;
  SFX.play('swing');
  FX.floatText(boss.x, boss.y - boss.r - 30, '✦ 准备！金光亮起按【空格】', '#fde047', 1.35);
};

IaijutsuModeBossTutorial._castTutorialBlades = function (boss, mg) {
  var ang = Math.atan2(Player.y - boss.y, Player.x - boss.x);
  var spd = 225;
  var offsets = [-0.26, 0, 0.26];
  for (var i = 0; i < offsets.length; i++) {
    var a = ang + offsets[i];
    boss.blades.push({
      x: boss.x + Math.cos(a) * (boss.r + 12),
      y: boss.y + Math.sin(a) * (boss.r + 12),
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      angle: a,
      color: '#38bdf8',
      life: 3.4
    });
  }
  SFX.play('iai');
  FX.floatText(boss.x, boss.y - boss.r - 24, '✂ 飞刃来袭 · 左/右键可斩碎!', '#7dd3fc', 1.25);
};

// --------------------------------------------------------------------------
// 帧更新：驱动 5 课互动判定与教学慢放
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial.update = function (dt, mouseWorld, input, mg) {
  var data = mg.iaijutsuData;
  if (!data || !data.boss) return;

  if (data.tutorialDone) {
    // 毕业弹窗开启期间暂停 Boss 动作
    return;
  }

  var boss = data.boss;
  var lesson = this.LESSONS[data.tutorialStep] || this.LESSONS[0];
  data.tutorialStepTimer += dt;

  // 监测第 3 / 5 课是否提前按了空格（给出贴心时机反馈）
  if (input && input.spacePressed && (lesson.id === 'mikiri_parry' || lesson.id === 'execute_finish')) {
    if (boss.state === 'telegraph' && !window.IaijutsuBoss.isParryWindow(boss) && !window.IaijutsuBoss.isUnblockable(boss.action)) {
      data.tutorialTip = '⏳ 空格按早了一点！等 Boss 身上爆出【✦ 金色闪光】的瞬间再按【空格】！';
      data.tutorialTipKind = 'warn';
      this.syncHud(mg);
    }
  }

  // 第 3 课 / 第 5 课在 ✦ 金光窗口内触发轻柔教学慢放（0.38x），让新手清晰感受弹反瞬间！
  var inParrySlow = (lesson.id === 'mikiri_parry' || lesson.id === 'execute_finish') &&
    boss.state === 'telegraph' && window.IaijutsuBoss.isParryWindow(boss);
  data.tutorialParrySlow = inParrySlow;
  var effDt = inParrySlow ? dt * 0.38 : dt;

  // 保持不死满血（防止第 5 课前误死）
  data.lives = 3;

  // 调用宿敌模式完整底层（保证手感、按键、判定与真实宿敌战 100% 一致）
  IAIJUTSU_BOSS_TUTORIAL_BASE.update.call(this, effDt, mouseWorld, input, mg);

  // 防止教官自主乱切其他招式（仅允许当前课程指定动作）
  if (boss.state === 'idle' && boss.stateDur < 100) {
    boss.stateDur = 999;
  }
  if (lesson.id === 'execute_finish' && boss.state === 'broken' && boss.stateDur < 5.0) {
    boss.stateDur = 6.0;
  }

  // 若正在过关庆祝倒计时中
  if (data.tutorialAdvanceTimer > 0) {
    data.tutorialAdvanceTimer -= dt;
    if (data.tutorialAdvanceTimer <= 0) {
      this.setupLesson(data.tutorialStep + 1, mg);
    }
    return;
  }

  // 处理反馈事件（震刀 / 受击）
  if (data.tutorialEvent) {
    var ev = data.tutorialEvent;
    data.tutorialEvent = '';
    if (ev === 'recoil' || ev === 'action_hit') {
      if (lesson.id === 'dodge_unblockable') {
        data.tutorialTip = '⛔ 蓄力期别左键硬撞（会被震刀弹开）！鼠标指到红区外的【绿色安全区】点左键躲开！';
      } else if (lesson.id === 'mikiri_parry') {
        data.tutorialTip = '⛔ 蓄力中点左键会被震刀！千万别点左键，等 ✦ 金光亮起按【空格】见切！';
      } else {
        data.tutorialTip = '⛔ Boss 蓄力或出招时浑身霸体，先拉开或等 ✦ 金光按【空格】见切！';
      }
      data.tutorialTipKind = 'warn';
      this.syncHud(mg);
    } else if (ev === 'damaged') {
      if (lesson.id === 'dodge_unblockable') {
        data.tutorialTip = '💡 被红区扫到了（特训免死）！看到红【危】字立刻往红区外按左键或 WASD 移出去！';
      } else if (lesson.id === 'mikiri_parry') {
        data.tutorialTip = '💡 没按到见切（特训免死）！盯紧 Boss：亮起 ✦ 金色闪光、画面变慢时立刻按【空格】！';
      } else if (lesson.id === 'cut_blades') {
        data.tutorialTip = '💡 被飞刃擦到了（特训免死）！刀气靠近时按【右键】挥砍或【左键】直接穿过去就能切碎！';
      } else {
        data.tutorialTip = '💡 被击中了（特训免死）！先用【空格】见切或等破绽再反击！';
      }
      data.tutorialTipKind = 'warn';
      this.syncHud(mg);
    }
  }

  // ---------------- 分课推进逻辑 ----------------
  if (lesson.id === 'weak_strike') {
    boss.vulnerable = true;
    var slashes = (data.tutorialSlashCount || 0) - (data.tutorialBaseSlash || 0);
    if (slashes !== data.tutorialProgress) {
      data.tutorialProgress = Math.min(lesson.target, slashes);
      if (data.tutorialProgress === 1) {
        data.tutorialTip = '✓ 干得好（1/2）！再补 1 刀，观察砍满 2 刀后 Boss 立刻撤步拉开的机制！';
        data.tutorialTipKind = 'good';
      } else if (data.tutorialProgress >= lesson.target) {
        this._completeLesson(mg, '🎉 第 1 课通过！记住：破绽期砍 2 刀就收手，别贪第 3 刀！');
      }
      this.syncHud(mg);
    }

  } else if (lesson.id === 'dodge_unblockable') {
    if (boss.state === 'action') {
      data.tutorialWasAction = true;
    }
    if (data.tutorialWasAction && (boss.state === 'recover' || boss.state === 'idle')) {
      data.tutorialWasAction = false;
      if (!data.tutorialStepHit) {
        data.tutorialProgress = Math.min(lesson.target, data.tutorialProgress + 1);
        SFX.play('victory');
        FX.floatText(Player.x, Player.y - 38, '✓ 完美闪避危字杀招 (' + data.tutorialProgress + '/' + lesson.target + ')', '#34d399', 1.45);
        if (data.tutorialProgress >= lesson.target) {
          this._completeLesson(mg, '🎉 第 2 课通过！红【危】字一定不可弹反，第一时间闪出红区！');
          return;
        } else {
          data.tutorialTip = '✓ 躲得漂亮（1/2）！再来 1 次【危】字十字斩，稳稳闪出红区！';
          data.tutorialTipKind = 'good';
          this.syncHud(mg);
        }
      }
      data.tutorialCastCooldown = 1.05;
    }
    if (boss.state === 'idle' || boss.state === 'recover') {
      data.tutorialCastCooldown -= dt;
      if (data.tutorialCastCooldown <= 0) {
        this._castTutorialCrossCut(boss, mg);
      }
    }

  } else if (lesson.id === 'mikiri_parry') {
    var parries = (data.parryCount || 0) - (data.tutorialBaseParry || 0);
    if (parries > data.tutorialProgress) {
      data.tutorialProgress = Math.min(lesson.target, parries);
      if (data.tutorialProgress >= lesson.target) {
        this._completeLesson(mg, '🎉 第 3 课通过！✦ 金光空格见切就是宿敌战的灵魂！');
        return;
      } else {
        data.tutorialTip = '⚡ 完美见切（1/2）！手感来了吧？再来 1 次，盯紧 ✦ 金光按【空格】！';
        data.tutorialTipKind = 'good';
        data.tutorialCastCooldown = 1.25;
        this.syncHud(mg);
      }
    }
    if (boss.state === 'idle' || boss.state === 'recover') {
      data.tutorialCastCooldown -= dt;
      if (data.tutorialCastCooldown <= 0) {
        this._castTutorialParryDraw(boss, mg);
      }
    }

  } else if (lesson.id === 'cut_blades') {
    var cut = (data.tutorialBladesCut || 0) - (data.tutorialBaseBlades || 0);
    if (cut !== data.tutorialProgress) {
      data.tutorialProgress = Math.min(lesson.target, cut);
      if (data.tutorialProgress >= lesson.target) {
        this._completeLesson(mg, '🎉 第 4 课通过！飞刃能直接斩碎，满屏弹幕也不用慌！');
        return;
      } else {
        data.tutorialTip = '✂ 斩碎刀气（' + data.tutorialProgress + '/' + lesson.target + '）！继续用左键穿透或右键切碎！';
        data.tutorialTipKind = 'good';
        this.syncHud(mg);
      }
    }
    // 保持中距离持续发射慢速飞刃
    boss.state = 'idle';
    boss.stateDur = 999;
    data.tutorialCastCooldown -= dt;
    if (data.tutorialCastCooldown <= 0) {
      this._castTutorialBlades(boss, mg);
      data.tutorialCastCooldown = 1.75;
    }

  } else if (lesson.id === 'execute_finish') {
    var execs = (data.execCount || 0) - (data.tutorialBaseExec || 0);
    if (execs >= 1) {
      data.tutorialProgress = 1;
      data.tutorialTip = '🏆 居合处决达成！宿敌战全部 5 课核心心法你已完全掌握！';
      data.tutorialTipKind = 'good';
      data.tutorialAdvanceTimer = 1.05;
      this.syncHud(mg);
      return;
    }
    if (boss.state === 'broken') {
      if (data.tutorialTipKind !== 'good') {
        data.tutorialTip = '⚡ 架势已破防！立刻把准星指着跪地的 Boss，点【左键】穿透发动【居合处决】！';
        data.tutorialTipKind = 'good';
        this.syncHud(mg);
      }
    } else {
      // 确保架势不会衰减回零，且定期出一次金光招方便玩家一击破防
      boss.posture = Math.max(boss.posture, Math.floor(boss.maxPosture * 0.84));
      boss.postureDecayDelay = 999;
      if (boss.state === 'idle' || boss.state === 'recover') {
        data.tutorialCastCooldown -= dt;
        if (data.tutorialCastCooldown <= 0) {
          this._castTutorialParryDraw(boss, mg);
          data.tutorialCastCooldown = 1.8;
        }
      }
    }
  }
};

IaijutsuModeBossTutorial._completeLesson = function (mg, msg) {
  var data = mg.iaijutsuData;
  data.tutorialTip = msg;
  data.tutorialTipKind = 'good';
  data.tutorialAdvanceTimer = 1.45;
  if (data.boss) {
    data.boss.blades.length = 0;
    data.boss.hazards.length = 0;
    data.boss.action = null;
    data.boss.state = 'idle';
    data.boss.stateDur = 999;
  }
  SFX.play('victory');
  FX.floatText(Player.x, Player.y - 44, '✓ 本课达成！', '#34d399', 1.6);
  this.syncHud(mg);
};

// --------------------------------------------------------------------------
// 场景内实时引导绘制（箭头 / 绿色安全区 / 巨型空格见切提示 / 处决信标）
// --------------------------------------------------------------------------
IaijutsuModeBossTutorial.render = function (ctx, mg) {
  IAIJUTSU_BOSS_TUTORIAL_BASE.render.call(this, ctx, mg);

  var data = mg.iaijutsuData;
  var boss = data && data.boss;
  if (!data || !boss || data.tutorialDone) return;

  var lesson = this.LESSONS[data.tutorialStep] || this.LESSONS[0];
  var pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);

  ctx.save();

  // 第 1 课：指向金色弱点的引导线与聚焦圈
  if (lesson.id === 'weak_strike' && boss.weak && boss.weak.length) {
    var wp = window.IaijutsuBoss.getWeakPos(boss, 0);
    ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.45 + pulse * 0.45) + ')';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(Player.x, Player.y);
    ctx.lineTo(wp.x, wp.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(wp.x, wp.y, 22 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    this._drawWorldPill(ctx, wp.x, wp.y - 34, '🎯 瞄准金色弱点 · 左键突进', '#fde047', '#0f172a');
  }

  // 第 2 课：红【危】字十字斩期间，在红区外标出明显的绿色安全区！
  if (lesson.id === 'dodge_unblockable' && boss.state === 'telegraph' && boss.hazards && boss.hazards.length) {
    var hz = boss.hazards[0];
    var rx = mg.room.worldX, ry = mg.room.worldY;
    var candidates = [
      { x: hz.cx, y: hz.cy - 120 },
      { x: hz.cx, y: hz.cy + 120 },
      { x: hz.cx - 140, y: hz.cy },
      { x: hz.cx + 140, y: hz.cy }
    ];
    for (var i = 0; i < candidates.length; i++) {
      var sx = Utils.clamp(candidates[i].x, rx + 75, rx + CFG.W - 75);
      var sy = Utils.clamp(candidates[i].y, ry + 115, ry + CFG.H - 95);
      if (Utils.dist(sx, sy, hz.cx, hz.cy) < 85) continue;
      ctx.beginPath();
      ctx.arc(sx, sy, 26 + pulse * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, ' + (0.65 + pulse * 0.35) + ')';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (i < 2) {
        this._drawWorldPill(ctx, sx, sy, '✓ 安全区', '#6ee7b7', '#064e3b');
      }
    }
  }

  // 第 3 课 & 第 5 课：✦ 金光慢放窗口内画出醒目的【按空格见切！】大提示
  if ((lesson.id === 'mikiri_parry' || lesson.id === 'execute_finish') && data.tutorialParrySlow) {
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 30 + pulse * 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.stroke();

    this._drawWorldPill(ctx, boss.x, boss.y - boss.r - 68, '⚡ ✦ 金光！立刻按【空格】见切！', '#fef08a', '#7c2d12', 15);
  }

  // 第 4 课：指向最近飞刃的斩碎提示
  if (lesson.id === 'cut_blades' && boss.blades && boss.blades.length) {
    var nearest = boss.blades[0];
    var bestD = 99999;
    for (var bIdx = 0; bIdx < boss.blades.length; bIdx++) {
      var dd = Utils.dist(boss.blades[bIdx].x, boss.blades[bIdx].y, Player.x, Player.y);
      if (dd < bestD) { bestD = dd; nearest = boss.blades[bIdx]; }
    }
    if (nearest) {
      ctx.beginPath();
      ctx.arc(nearest.x, nearest.y, 20 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      this._drawWorldPill(ctx, nearest.x, nearest.y - 28, '✂ 左/右键斩碎', '#7dd3fc', '#0c4a6e');
    }
  }

  // 第 5 课：Boss 破防跪地时画出巨型【居合处决】聚焦信标
  if (lesson.id === 'execute_finish' && boss.state === 'broken') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 22 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(Player.x, Player.y);
    ctx.lineTo(boss.x, boss.y);
    ctx.stroke();
    ctx.setLineDash([]);

    this._drawWorldPill(ctx, boss.x, boss.y - boss.r - 66, '⚡ 架势已破！左键穿透【居合处决】！', '#fef08a', '#713f12', 15);
  }

  ctx.restore();
};

IaijutsuModeBossTutorial._drawWorldPill = function (ctx, x, y, text, fg, bg, fontSize) {
  var fs = fontSize || 12;
  ctx.save();
  ctx.font = 'bold ' + fs + 'px "Microsoft YaHei", sans-serif';
  var tw = ctx.measureText(text).width;
  var pw = tw + 18;
  var ph = fs + 12;
  ctx.fillStyle = bg || 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = fg || '#fde047';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 7);
  else ctx.rect(x - pw / 2, y - ph / 2, pw, ph);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg || '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
};

window.IaijutsuModeBossTutorial = IaijutsuModeBossTutorial;
