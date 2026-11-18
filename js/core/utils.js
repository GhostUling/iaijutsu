// ===== 工具函数 =====
var Utils = {
  rand: function (min, max) { return min + Math.random() * (max - min); },
  randInt: function (min, max) { return Math.floor(Utils.rand(min, max + 1)); },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  lerp: function (a, b, t) { return a + (b - a) * t; },

  dist: function (ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  },

  distSq: function (ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  },

  angleTo: function (ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  },

  // 把角度归一化到 [-PI, PI]
  normalizeAngle: function (a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  },

  // 圆与矩形的碰撞
  circleRect: function (cx, cy, cr, rx, ry, rw, rh) {
    var nx = Utils.clamp(cx, rx, rx + rw);
    var ny = Utils.clamp(cy, ry, ry + rh);
    return Utils.distSq(cx, cy, nx, ny) < cr * cr;
  },

  // 两个圆是否相交
  circleCircle: function (ax, ay, ar, bx, by, br) {
    var r = ar + br;
    return Utils.distSq(ax, ay, bx, by) < r * r;
  },

  // 点到线段的最短距离
  distToSegment: function (px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Utils.dist(px, py, x1, y1);
    var t = Utils.clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    var projX = x1 + t * dx, projY = y1 + t * dy;
    return Utils.dist(px, py, projX, projY);
  },

  distPointToLine: function (px, py, x1, y1, x2, y2) {
    return Utils.distToSegment(px, py, x1, y1, x2, y2);
  },
};
