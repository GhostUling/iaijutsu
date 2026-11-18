// ===== 统一物理与碰撞引擎（碰撞算法与 game4 逐行一致） =====
var Physics = {
  // 当前竞技场（居合斩独立版只有一个房间）
  getActiveRoom: function () {
    if (window.MiniGames && MiniGames.active && MiniGames.room) return MiniGames.room;
    return null;
  },

  getRoomBounds: function (room) {
    var rm = room || this.getActiveRoom();
    if (!rm) {
      return { x: 0, y: 0, w: CFG.W, h: CFG.H, colliders: [] };
    }
    var x = (rm.worldX !== undefined) ? rm.worldX : (rm.x !== undefined ? rm.x : 0);
    var y = (rm.worldY !== undefined) ? rm.worldY : (rm.y !== undefined ? rm.y : 0);
    var w = rm.w || rm.width || CFG.W;
    var h = rm.h || rm.height || CFG.H;
    return { x: x, y: y, w: w, h: h, colliders: rm.colliders || [] };
  },

  resolveWallCollision: function (entity, colliders, radius) {
    if (!entity || !colliders || !colliders.length) return;
    var r = radius || entity.radius || 16;

    var rmBounds = null;
    if (this.getActiveRoom) {
      var actRoom = this.getActiveRoom();
      if (actRoom) rmBounds = this.getRoomBounds(actRoom);
    }

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        if (!c || c.w <= 0 || c.h <= 0) continue;

        var insideX = (entity.x >= c.x && entity.x <= c.x + c.w);
        var insideY = (entity.y >= c.y && entity.y <= c.y + c.h);

        if (insideX && insideY) {
          var isOuterLeft = rmBounds && Math.abs(c.x - rmBounds.x) < 2;
          var isOuterRight = rmBounds && Math.abs((c.x + c.w) - (rmBounds.x + rmBounds.w)) < 2;
          var isOuterTop = rmBounds && Math.abs(c.y - rmBounds.y) < 2;
          var isOuterBottom = rmBounds && Math.abs((c.y + c.h) - (rmBounds.y + rmBounds.h)) < 2;

          var dLeft = isOuterLeft ? 999999 : (entity.x - c.x);
          var dRight = isOuterRight ? 999999 : ((c.x + c.w) - entity.x);
          var dTop = isOuterTop ? 999999 : (entity.y - c.y);
          var dBottom = isOuterBottom ? 999999 : ((c.y + c.h) - entity.y);

          var minD = Math.min(dLeft, dRight, dTop, dBottom);
          if (minD > 900000) {
            var rcx = rmBounds ? (rmBounds.x + rmBounds.w / 2) : (c.x + c.w / 2);
            var rcy = rmBounds ? (rmBounds.y + rmBounds.h / 2) : (c.y + c.h / 2);
            if (Math.abs(entity.x - rcx) > Math.abs(entity.y - rcy)) {
              minD = entity.x < rcx ? dRight : dLeft;
            } else {
              minD = entity.y < rcy ? dBottom : dTop;
            }
          }

          if (minD === dLeft) {
            entity.x = c.x - r;
            if (entity.vx && entity.vx > 0) entity.vx = 0;
          } else if (minD === dRight) {
            entity.x = c.x + c.w + r;
            if (entity.vx && entity.vx < 0) entity.vx = 0;
          } else if (minD === dTop) {
            entity.y = c.y - r;
            if (entity.vy && entity.vy > 0) entity.vy = 0;
          } else {
            entity.y = c.y + c.h + r;
            if (entity.vy && entity.vy < 0) entity.vy = 0;
          }
        } else {
          var nx = Utils.clamp(entity.x, c.x, c.x + c.w);
          var ny = Utils.clamp(entity.y, c.y, c.y + c.h);
          var dx = entity.x - nx;
          var dy = entity.y - ny;
          var dSq = dx * dx + dy * dy;

          if (dSq < r * r) {
            var d = Math.sqrt(dSq);
            if (d > 0.0001) {
              var overlap = r - d;
              entity.x += (dx / d) * overlap;
              entity.y += (dy / d) * overlap;
            } else {
              if (rmBounds) {
                entity.x += entity.x < (rmBounds.x + rmBounds.w / 2) ? r : -r;
              } else {
                entity.x += r;
              }
            }
          }
        }
      }
    }
  },

  clampToBounds: function (entity, roomBounds, padding) {
    if (!entity) return;
    var bounds = this.getRoomBounds(roomBounds);
    var r = entity.radius || 16;
    var wallThick = (typeof CFG !== 'undefined' && CFG.wall && CFG.wall.thickness) ? CFG.wall.thickness : 28;
    var pad = (padding !== undefined) ? padding : (wallThick + r);

    var minX = bounds.x + pad;
    var minY = bounds.y + pad;
    var maxX = bounds.x + bounds.w - pad;
    var maxY = bounds.y + bounds.h - pad;

    if (maxX < minX) maxX = minX;
    if (maxY < minY) maxY = minY;

    entity.x = Utils.clamp(entity.x, minX, maxX);
    entity.y = Utils.clamp(entity.y, minY, maxY);
  },

  checkCircleOverlap: function (e1, e2) {
    var r1 = e1.radius || e1.r || 16;
    var r2 = e2.radius || e2.r || 16;
    return Utils.distSq(e1.x, e1.y, e2.x, e2.y) < (r1 + r2) * (r1 + r2);
  },

  checkSegmentOverlap: function (x1, y1, x2, y2, target, extraRadius) {
    var tr = (target.radius || target.r || 16) + (extraRadius || 0);
    var dist = Utils.distToSegment(target.x, target.y, x1, y1, x2, y2);
    return dist <= tr;
  },

  checkSectorOverlap: function (originX, originY, aimAngle, range, arcAngle, target) {
    var tr = target.radius || target.r || 16;
    var d = Utils.dist(originX, originY, target.x, target.y);
    if (d > range + tr) return false;
    var angToTarget = Math.atan2(target.y - originY, target.x - originX);
    var diff = Math.abs(Utils.normalizeAngle(angToTarget - aimAngle));
    return diff <= (arcAngle / 2);
  },
};
