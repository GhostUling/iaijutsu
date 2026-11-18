// ============================================================================
// 异靶乱舞 · 靶型扩展包（独立文件，不改动原版 iaijutsu_targets.js）
// ============================================================================
// 通过原型继承复用原版三种靶（普通/黄金/飞梭），只新增四种"读法不同"的靶：
//   💣 诱饵雷  斩中扣 1 命 —— 惩罚无脑锁最近
//   🗿 铁壁靶  要斩两刀   —— 第一刀崩甲并刷新 CD
//   🪞 分裂靶  斩中裂成 2 个小靶（2.2s，不扣命）
//   🔗 连锁靶  斩中拉出 0.55s 连锁线，限时补刀 +3 连斩
// 另有 🎇 小靶（分裂产物）作为内部类型。
//
// 关键约束：原版靶子超时会扣命，这里新增靶一律标记 noTimeout（由本文件的
// ownLife 自行收场），避免"诱饵/碎靶自然消失反而扣玩家一条命"。

var IAIJUTSU_TARGETS_BASE = window.IaijutsuTargets;

var IaijutsuTargetsEx = Object.create(IAIJUTSU_TARGETS_BASE);

IaijutsuTargetsEx.TYPE_DECOY = 'decoy';
IaijutsuTargetsEx.TYPE_ARMOR = 'armor';
IaijutsuTargetsEx.TYPE_SPLIT = 'split';
IaijutsuTargetsEx.TYPE_CHAIN = 'chain';
IaijutsuTargetsEx.TYPE_MINI = 'mini';

// 每种新靶的静态参数（半径 / 显示时限 / 自行退场时间 / 时限是否扣命）
IaijutsuTargetsEx.SPEC = {
  decoy: { r: 22, time: 6.0, ownLife: 9.0, noTimeout: true },
  armor: { r: 26, time: 7.0, ownLife: 12.0, noTimeout: true },
  split: { r: 25, time: 5.2, ownLife: 0, noTimeout: false },
  chain: { r: 23, time: 6.0, ownLife: 0, noTimeout: false },
  mini: { r: 14, time: 2.2, ownLife: 2.2, noTimeout: true }
};

IaijutsuTargetsEx.createDummy = function (room, player, opts) {
  opts = opts || {};
  var t = opts.type || this.TYPE_NORMAL;

  // 原版三种靶直接交给原版实现（普通 / 黄金 / 飞梭）
  if (t === this.TYPE_NORMAL || t === this.TYPE_SPECIAL || t === this.TYPE_SHUTTLE) {
    return IAIJUTSU_TARGETS_BASE.createDummy.call(this, room, player, opts);
  }

  // 先用普通靶的生成逻辑拿到位置（同样的 90~330px 环形分布 + 边界钳制），再改写类型字段
  var dm = IAIJUTSU_TARGETS_BASE.createDummy.call(this, room, player, {
    type: this.TYPE_NORMAL,
    x: opts.x,
    y: opts.y
  });

  var spec = this.SPEC[t] || this.SPEC.mini;
  dm.type = t;
  dm.r = spec.r;
  dm.time = spec.time;
  dm.maxTime = spec.time;
  dm.noTimeout = !!spec.noTimeout;
  dm.ownLife = spec.ownLife;
  dm.expired = false;
  dm.hitFlash = 0;

  if (t === this.TYPE_DECOY) dm.isDecoy = true;
  if (t === this.TYPE_ARMOR) { dm.isArmor = true; dm.armorLeft = 2; }
  if (t === this.TYPE_SPLIT) dm.isSplit = true;
  if (t === this.TYPE_CHAIN) dm.isChain = true;
  if (t === this.TYPE_MINI) dm.isMini = true;

  return dm;
};

IaijutsuTargetsEx.updateDummy = function (dummy, dt, room, particles) {
  IAIJUTSU_TARGETS_BASE.updateDummy.call(this, dummy, dt, room, particles);

  if (dummy.hitFlash > 0) dummy.hitFlash -= dt;

  // 不扣命的新靶：把 time 钉在满值让原版的超时判定永不触发，自己用 ownLife 收场
  if (dummy.noTimeout) {
    dummy.time = dummy.maxTime;
    if (dummy.ownLife > 0) {
      dummy.ownLife -= dt;
      if (dummy.ownLife <= 0) dummy.expired = true;
    }
  }

  // 诱饵雷：闪烁式警戒环（用 pulse 驱动，已有字段）
  // 分裂靶：核心两颗小光点绕转（纯绘制，不消耗随机数）
};

IaijutsuTargetsEx.drawDummy = function (ctx, d, skin) {
  var t = d.type;
  if (t !== this.TYPE_DECOY && t !== this.TYPE_ARMOR && t !== this.TYPE_SPLIT &&
      t !== this.TYPE_CHAIN && t !== this.TYPE_MINI) {
    IAIJUTSU_TARGETS_BASE.drawDummy.call(this, ctx, d, skin);
    return;
  }

  var progress = Math.max(0, Math.min(1, d.time / d.maxTime));
  ctx.save();

  if (t === this.TYPE_DECOY) {
    var dp = 0.5 + 0.5 * Math.sin(d.pulse * 1.6);
    ctx.fillStyle = 'rgba(244, 63, 94, ' + (0.16 + dp * 0.12).toFixed(3) + ')';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 外侧警戒虚线环（旋转）
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.pulse * 0.8);
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.45 + dp * 0.35).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(0, 0, d.r + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', d.x, d.y);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#fda4af';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText('💣 诱饵·勿斩', d.x, d.y + d.r + 16);

  } else if (t === this.TYPE_ARMOR) {
    var cracked = d.armorLeft <= 1;
    var flash = d.hitFlash > 0 ? d.hitFlash / 0.25 : 0;
    ctx.fillStyle = cracked ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.30)';
    ctx.strokeStyle = cracked ? '#f59e0b' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.shadowColor = cracked ? '#f59e0b' : '#94a3b8';
    ctx.shadowBlur = 12 + flash * 18;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 两层护甲弧：remaining 用实线，破掉的一层用虚线残影
    for (var ai = 0; ai < 2; ai++) {
      var alive = ai < d.armorLeft;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 7 + ai * 5, -Math.PI * 0.85, Math.PI * 0.85);
      ctx.setLineDash(alive ? [] : [5, 6]);
      ctx.lineWidth = alive ? 3 : 1.5;
      ctx.strokeStyle = alive ? (ai === 0 ? '#e2e8f0' : '#94a3b8') : 'rgba(148,163,184,0.35)';
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗿', d.x, d.y);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = cracked ? '#fbbf24' : '#cbd5e1';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText(cracked ? '🗿 铁壁·再一刀' : '🗿 铁壁·需两刀', d.x, d.y + d.r + 16);

  } else if (t === this.TYPE_SPLIT) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.20)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 内部两颗待分裂的小核
    for (var si = 0; si < 2; si++) {
      var sa = d.pulse * 1.2 + si * Math.PI;
      ctx.beginPath();
      ctx.arc(d.x + Math.cos(sa) * 9, d.y + Math.sin(sa) * 9, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e9d5ff';
      ctx.fill();
    }

    ctx.strokeStyle = progress > 0.3 ? '#c084fc' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 7, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪞', d.x, d.y);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#e9d5ff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText('🪞 分裂', d.x, d.y + d.r + 15);

  } else if (t === this.TYPE_CHAIN) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = progress > 0.3 ? '#67e8f9' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 7, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔗', d.x, d.y);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#a5f3fc';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText('🔗 连锁', d.x, d.y + d.r + 15);

  } else if (t === this.TYPE_MINI) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = progress > 0.35 ? '#fbbf24' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 4, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎇', d.x, d.y);
  }

  ctx.restore();
};

// 分裂产物：从父靶位置向两侧弹出，位置钳在竞技场内
IaijutsuTargetsEx.spawnSplitChildren = function (parent, room, mg) {
  if (!room) return;
  var pad = 60;
  var rx = room.worldX, ry = room.worldY;
  var w = room.w || CFG.W, h = room.h || CFG.H;
  var out = [];

  for (var i = 0; i < 2; i++) {
    var ang = (i === 0 ? Math.PI * 0.5 : -Math.PI * 0.5) + (parent.pulse % 1) * 0.5;
    var px = Utils.clamp(parent.x + Math.cos(ang) * 58, rx + pad, rx + w - pad);
    var py = Utils.clamp(parent.y + Math.sin(ang) * 58, ry + pad, ry + h - pad);
    out.push(this.createDummy(room, Player, { type: this.TYPE_MINI, x: px, y: py }));
  }
  return out;
};

window.IaijutsuTargetsEx = IaijutsuTargetsEx;
