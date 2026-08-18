// 归属：B｜核心交互 Owner
// 合成大染缸：类合成大西瓜的染球合并解压小游戏
const engine = require('../../utils/pattern-engine.js');

const LEVELS = [
  { r: 18, score: 10, name: '初染', dye: '栀子黄' },
  { r: 24, score: 20, name: '晕染', dye: '茜草' },
  { r: 30, score: 40, name: '流纹', dye: '紫草' },
  { r: 36, score: 80, name: '云纹', dye: '靛青' },
  { r: 44, score: 160, name: '团花', dye: '板蓝根' },
  { r: 54, score: 320, name: '苍山', dye: '板蓝根' },
  { r: 66, score: 640, name: '鹤翎', dye: '靛青' },
  { r: 80, score: 1280, name: '雨落', dye: '板蓝根' }
];

const G = 0.45;
const RESTITUTION = 0.25;
const FRICTION = 0.98;
const MERGE_SPEED = 1.8;
const TOP_LINE = 140;

Page({
  data: {
    score: 0,
    best: 0,
    nextLevel: 0,
    powerChange: 3,
    powerRemove: 3,
    muted: false,
    gameOver: false,
    result: {},
    removeMode: false
  },

  onLoad() {
    this.balls = [];
    this.merges = 0;
    this.eliminated = 0;
    this.startTime = Date.now();
    this.nextLevel = Math.floor(Math.random() * 3);
    this.setData({ nextLevel: this.nextLevel, best: wx.getStorageSync('ranxin_game_best') || 0 });
  },

  onReady() {
    const sys = wx.getSystemInfoSync();
    this.dpr = sys.pixelRatio;
    const query = wx.createSelectorQuery();
    query.select('#game-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      canvas.width = width * this.dpr;
      canvas.height = height * this.dpr;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.scale(this.dpr, this.dpr);
      this.boardW = width;
      this.boardH = height;
      wx.createSelectorQuery().select('.board-wrap').boundingClientRect(rect => {
        this.boardLeft = rect ? rect.left : 0;
        this.boardTop = rect ? rect.top : 0;
      }).exec();
      this.startLoop();
    });
  },

  onUnload() {
    this.stopLoop();
  },

  startLoop() {
    this.loopId = setInterval(() => this.tick(), 16);
  },

  stopLoop() {
    if (this.loopId) clearInterval(this.loopId);
  },

  tick() {
    if (this.data.gameOver) return;
    this.updatePhysics();
    this.draw();
    this.checkGameOver();
  },

  updatePhysics() {
    const balls = this.balls;
    // 1) 积分 + 边界约束
    for (let b of balls) {
      b.vy += G;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      // 速度钳制，避免穿透加速
      b.vx = Math.max(-20, Math.min(20, b.vx));
      b.vy = Math.max(-20, Math.min(20, b.vy));
      b.x += b.vx;
      b.y += b.vy;

      if (b.y + b.r > this.boardH) {
        b.y = this.boardH - b.r;
        b.vy *= -RESTITUTION;
        if (Math.abs(b.vy) < 0.4) b.vy = 0;
      }
      if (b.x - b.r < 0) {
        b.x = b.r;
        b.vx *= -RESTITUTION;
      }
      if (b.x + b.r > this.boardW) {
        b.x = this.boardW - b.r;
        b.vx *= -RESTITUTION;
      }
    }

    // 2) 合并判定：同级且足够接近即合并（每帧至多一次）
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.level !== b.level || a.level >= LEVELS.length - 1) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (a.r + b.r) * 0.82) {
          this.mergeBalls(i, j);
          return;
        }
      }
    }

    // 3) 分离迭代：避免不同级球体互相嵌入与抖动
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) { dx = 0.01; dy = 0; dist = 0.01; }
          const minDist = a.r + b.r;
          if (dist < minDist) {
            const nx = dx / dist, ny = dy / dist;
            const sep = (minDist - dist) * 0.5;
            a.x -= nx * sep; a.y -= ny * sep;
            b.x += nx * sep; b.y += ny * sep;
          }
        }
      }
    }
  },

  mergeBalls(i, j) {
    const a = this.balls[i];
    const b = this.balls[j];
    const newLevel = a.level + 1;
    const newBall = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      vx: 0,
      vy: 0,
      r: LEVELS[newLevel].r,
      level: newLevel,
      pattern: this.randomPattern()
    };
    this.balls.splice(j, 1);
    this.balls.splice(i, 1);
    this.balls.push(newBall);
    this.merges++;
    this.eliminated += 1;
    if (!this.data.muted) wx.vibrateShort({ type: 'light' });
    const add = LEVELS[newLevel].score;
    this.setData({ score: this.data.score + add });
  },

  randomPattern() {
    const list = engine.PATTERN_CATALOG;
    return list[Math.floor(Math.random() * list.length)];
  },

  draw() {
    const ctx = this.ctx;
    const w = this.boardW;
    const h = this.boardH;
    ctx.clearRect(0, 0, w, h);

    // 背景容器
    ctx.save();
    ctx.fillStyle = 'rgba(30, 77, 140, 0.12)';
    this.roundRect(ctx, 16, 16, w - 32, h - 32, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 顶部死亡线
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 90, 90, 0.5)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(24, TOP_LINE);
    ctx.lineTo(w - 24, TOP_LINE);
    ctx.stroke();
    ctx.restore();

    // 球
    for (let b of this.balls) {
      const lvl = LEVELS[b.level];
      engine.renderBallPattern(ctx, b.x, b.y, b.r, {
        type: b.pattern.type,
        petals: b.pattern.petals,
        tightness: 0.45,
        whitespace: 0.35,
        rotation: 0,
        dyeName: lvl.dye,
        concentration: 0.7,
        seed: b.level + 1
      });
      // 层级小标
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lvl.name, b.x, b.y + 4);
    }

    // 待落线
    if (this.pendingX !== undefined && !this.data.gameOver) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.pendingX, 24);
      ctx.lineTo(this.pendingX, TOP_LINE);
      ctx.stroke();
      ctx.restore();
    }
  },

  checkGameOver() {
    for (let b of this.balls) {
      if (b.y - b.r < TOP_LINE && Math.abs(b.vy) < 0.5 && Math.abs(b.vx) < 0.5) {
        this.gameOver();
        break;
      }
    }
  },

  onBoardTap(e) {
    if (this.data.gameOver) return;
    const pt = this.tapPoint(e);
    if (this.data.removeMode) return this.removeBallAt(pt.x, pt.y);
    const clamped = Math.max(LEVELS[this.nextLevel].r, Math.min(this.boardW - LEVELS[this.nextLevel].r, pt.x));
    this.spawnBall(clamped);
  },

  tapPoint(e) {
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e.detail || {};
    let x, y;
    if (t.clientX != null) {
      x = t.clientX - (this.boardLeft || 0);
      y = t.clientY - (this.boardTop || 0);
    } else {
      x = t.x != null ? t.x : 0;
      y = t.y != null ? t.y : 0;
    }
    return { x, y };
  },

  onBoardMove(e) {
    if (this.data.gameOver || this.data.removeMode) return;
    const x = e.touches[0].clientX - (this.boardLeft || 0);
    this.pendingX = Math.max(24, Math.min(this.boardW - 24, x));
  },

  spawnBall(x) {
    const lvl = this.nextLevel;
    this.balls.push({
      x,
      y: LEVELS[lvl].r + 30,
      vx: 0,
      vy: 0,
      r: LEVELS[lvl].r,
      level: lvl,
      pattern: this.randomPattern()
    });
    this.nextLevel = Math.floor(Math.random() * 3);
    this.setData({ nextLevel: this.nextLevel });
    this.pendingX = x;
  },

  removeBallAt(x, y) {
    let idx = -1;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      const dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy <= b.r * b.r) { idx = i; break; }
    }
    if (idx < 0) {
      wx.showToast({ title: '点准要消除的球哦', icon: 'none' });
      return;
    }
    this.balls.splice(idx, 1);
    this.eliminated++;
    this.setData({ powerRemove: this.data.powerRemove - 1, removeMode: false });
    if (!this.data.muted) wx.vibrateShort({ type: 'light' });
  },

  useChange() {
    if (this.data.gameOver || this.data.powerChange <= 0) return;
    this.nextLevel = Math.floor(Math.random() * 3);
    this.setData({ powerChange: this.data.powerChange - 1, nextLevel: this.nextLevel });
  },

  useRemove() {
    if (this.data.gameOver || this.data.powerRemove <= 0) return;
    this.setData({ removeMode: true });
    wx.showToast({ title: '点击消除一个球', icon: 'none' });
  },

  toggleMute() {
    this.setData({ muted: !this.data.muted });
  },

  gameOver() {
    this.stopLoop();
    const score = this.data.score;
    const best = Math.max(score, this.data.best);
    wx.setStorageSync('ranxin_game_best', best);
    const unlock = this.pickUnlockPattern(score);
    if (unlock) unlock.thumb = '/assets/patterns/' + unlock.id + '.png';
    this.setData({
      gameOver: true,
      best,
      result: {
        score,
        merges: this.merges,
        time: Math.floor((Date.now() - this.startTime) / 1000),
        eliminated: this.eliminated,
        unlock
      }
    });
    if (unlock) this.unlockPattern(unlock.id);
  },

  pickUnlockPattern(score) {
    const unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    const candidates = engine.PATTERN_CATALOG.filter(p => !unlocked.includes(p.id));
    if (score > 1000 && candidates.length) return candidates[0];
    if (score > 500 && candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    return null;
  },

  unlockPattern(id) {
    let unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      wx.setStorageSync('ranxin_unlocked_patterns', unlocked);
    }
  },

  collectPattern() {
    wx.showToast({ title: '纹样已收入库', icon: 'success' });
    setTimeout(() => this.replay(), 800);
  },

  replay() {
    this.balls = [];
    this.merges = 0;
    this.eliminated = 0;
    this.startTime = Date.now();
    this.nextLevel = Math.floor(Math.random() * 3);
    this.setData({
      score: 0,
      nextLevel: this.nextLevel,
      gameOver: false,
      result: {},
      removeMode: false,
      powerChange: 3,
      powerRemove: 3
    });
    this.startLoop();
  },

  viewRank() {
    wx.showToast({ title: '排行榜由 C 接入', icon: 'none' });
  },

  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
});
