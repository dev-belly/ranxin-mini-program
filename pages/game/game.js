// 归属：B｜核心交互 Owner
// 合成大染缸·情绪疗愈版（对齐染心第二章「合成大染缸」玩法）
// 机制：顶部落扎染球 → 重力下落 → 同级相碰合并升级 → 终极「大染缸」
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');
const { LEVELS, MAX_LEVEL, DANGER_Y, PhysicsWorld } = require('./game-physics.js');

const QUOTES = [
  '不急，一块布有一块布的节奏。',
  '此刻，只关注落下的位置。',
  '每一缸，都有自己的呼吸。',
  '慢一点，颜色会更稳。',
  '两个相同，便合成新的样子。',
  '你做的，已经足够好。'
];

// 玩得越高级，解锁越多纹样
const UNLOCK_BY_LEVEL = { 2: 'hudie', 3: 'tuan', 4: 'shui', 5: 'cang', 6: 'ling', 7: 'he' };

Page({
  data: {
    score: 0,
    best: 0,
    topName: '染珠',
    topLevel: 0,
    gameOver: false,
    muted: false,
    ready: false,
    quote: '',
    quoteVisible: false,
    result: {}
  },

  onLoad() {
    this._lastScore = 0;
    this._lastMax = 0;
    this._lastQuote = 0;
    this._startTime = Date.now();
    this.setData({ best: wx.getStorageSync('ranxin_game_best') || 0 });
  },

  onReady() {
    this._initCanvas(0);
  },

  _initCanvas(retry) {
    retry = retry || 0;
    const query = wx.createSelectorQuery();
    query.select('#game-canvas').fields({ node: true, size: true }).exec((res) => {
      // 节点未就绪或尺寸为 0 时重试，最多 8 次，避免画布空白无法游玩
      if (!res[0] || !res[0].node || !res[0].width || !res[0].height) {
        if (retry < 8) setTimeout(() => this._initCanvas(retry + 1), 80);
        return;
      }
      const canvas = res[0].node;
      const { width, height } = res[0];
      const dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.scale(dpr, dpr);
      this.boardW = width;
      this.boardH = height;
      this.world = new PhysicsWorld(width, height);
      this.setData({ ready: true });
      this._last = 0;
      this._loop();
    });
  },

  onUnload() {
    this._stop = true;
    if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
  },

  _loop() {
    if (this._stop) return;
    const now = Date.now();
    const dt = this._last ? (now - this._last) / 1000 : 0;
    this._last = now;
    const w = this.world;
    if (w && !this.data.gameOver) {
      w.step(dt);
      // 分数/最高级变化才 setData，避免每帧刷新掉帧
      if (w.score !== this._lastScore || w.maxLevel !== this._lastMax) {
        this._lastScore = w.score;
        this._lastMax = w.maxLevel;
        this.setData({
          score: w.score,
          topName: LEVELS[w.maxLevel].name,
          topLevel: w.maxLevel
        });
      }
      // 合成时偶发正念提示
      if (w.score > this._lastQuote && Math.random() < 0.5) {
        this._lastQuote = w.score;
        this.showQuote();
      }
      if (w.over) this._endGame();
    }
    this.draw();
    // RAF 兼容：canvas 自带 > 全局 > setTimeout 兜底
    const raf = (this.canvas && typeof this.canvas.requestAnimationFrame === 'function')
      ? this.canvas.requestAnimationFrame.bind(this.canvas)
      : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16));
    this._raf = raf(() => this._loop());
  },

  // ---- 输入：移动瞄准 + 松手投放 ----
  onTouchMove(e) {
    if (!this.world || this.data.gameOver) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return;
    const x = t.x != null ? t.x : (t.clientX != null ? t.clientX - this.boardLeft : this.boardW / 2);
    this.world.setAim(x);
  },

  onTouchEnd(e) {
    if (!this.world || this.data.gameOver) return;
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    let x = this.world.aimX;
    if (t) x = t.x != null ? t.x : (t.clientX != null ? t.clientX - this.boardLeft : x);
    this.world.drop(x);
  },

  // ---- 绘制 ----
  draw() {
    const w = this.world;
    if (!w || !this.ctx) return;
    const ctx = this.ctx, W = this.boardW, H = this.boardH;
    ctx.clearRect(0, 0, W, H);

    // 玻璃底
    ctx.save();
    ctx.fillStyle = 'rgba(30, 77, 140, 0.10)';
    this.roundRect(ctx, 0, 0, W, H, 20); ctx.fill();
    ctx.restore();

    // 顶部红色警戒线
    ctx.save();
    ctx.strokeStyle = 'rgba(230,80,80,0.7)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke();
    ctx.restore();

    // 球
    for (const b of w.balls) {
      const cfg = LEVELS[b.level];
      engine.renderBallPattern(ctx, b.x, b.y, cfg.r, {
        type: cfg.type, petals: cfg.petals, tightness: cfg.tightness,
        dyeName: cfg.dye, concentration: cfg.concentration, level: b.level + 1, whitespace: 0.3
      });
      if (b.level === MAX_LEVEL) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,211,107,0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, cfg.r + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // 合成扩散特效
    for (const ef of w.effects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ef.life);
      ctx.strokeStyle = 'rgba(255,211,107,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r + (1 - ef.life) * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 预览球 + 落点指示线
    if (!this.data.gameOver && !w.over) {
      const lv = w.spawnLevel;
      const cfg = LEVELS[lv];
      const px = w.aimX;
      ctx.save();
      ctx.globalAlpha = 0.55;
      engine.renderBallPattern(ctx, px, cfg.r + 2, cfg.r, {
        type: cfg.type, petals: cfg.petals, tightness: cfg.tightness,
        dyeName: cfg.dye, concentration: cfg.concentration, level: lv + 1, whitespace: 0.3
      });
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, cfg.r * 2 + 6); ctx.lineTo(px, H - 4); ctx.stroke();
      ctx.restore();
    }
  },

  showQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    this.setData({ quote: q, quoteVisible: true });
    if (this._quoteTimer) clearTimeout(this._quoteTimer);
    this._quoteTimer = setTimeout(() => this.setData({ quoteVisible: false }), 2200);
  },

  toggleMute() { this.setData({ muted: !this.data.muted }); },

  // ---- 结束 ----
  _endGame() {
    if (this.data.gameOver) return;
    const w = this.world;
    const score = w.score;
    const best = Math.max(score, this.data.best);
    wx.setStorageSync('ranxin_game_best', best);
    // 按最高等级解锁纹样（本地，不依赖后端）
    const unlockedNow = [];
    for (const lv in UNLOCK_BY_LEVEL) {
      if (w.maxLevel >= Number(lv)) {
        const id = UNLOCK_BY_LEVEL[lv];
        if (this.unlockPattern(id)) unlockedNow.push(id);
      }
    }
    const unlockedPatterns = (wx.getStorageSync('ranxin_unlocked_patterns') || [])
      .slice(-3).reverse()
      .map(id => {
        const p = engine.PATTERN_CATALOG.find(x => x.id === id);
        return p ? { id, name: p.name, thumb: '/assets/patterns/' + id + '.png' } : null;
      })
      .filter(Boolean);
    const defaults = engine.PATTERN_CATALOG.slice(0, 3).map(p => ({ id: p.id, name: p.name, thumb: '/assets/patterns/' + p.id + '.png' }));
    while (unlockedPatterns.length < 3 && defaults.length) {
      const d = defaults.shift();
      if (!unlockedPatterns.find(u => u.id === d.id)) unlockedPatterns.push(d);
    }
    const seconds = Math.floor((Date.now() - this._startTime) / 1000);
    const minutes = Math.max(1, Math.floor(seconds / 60));
    const percent = Math.min(99, 30 + Math.floor(score / 60));
    const win = w.maxLevel >= MAX_LEVEL;
    this._startTime = this._startTime || Date.now();
    const createdCount = Math.max(1, Math.floor(score / 60) + 5);
    const eliminatedCount = Math.max(1, Math.floor(score / 30) + 8);
    const topId = UNLOCK_BY_LEVEL[w.maxLevel] || (unlockedPatterns[0] && unlockedPatterns[0].id);
    const topP = engine.PATTERN_CATALOG.find(x => x.id === topId);
    const topPattern = topP ? { id: topP.id, name: topP.name, thumb: '/assets/patterns/' + topP.id + '.png', story: topP.story } : null;
    this.setData({
      gameOver: true,
      best,
      result: {
        score, time: seconds, timeMinutes: minutes, percent,
        topLevel: w.maxLevel, topName: LEVELS[w.maxLevel].name,
        topPattern, unlockedNow, unlockedPatterns, win,
        createdCount, eliminatedCount,
        quote: QUOTES[Math.floor(Math.random() * QUOTES.length)]
      }
    });
    // 上报成绩（Mock 下幂等无害）
    if (typeof api !== 'undefined' && api.submitGame) {
      api.submitGame({ score, duration: seconds }).catch(() => {});
    }
  },

  unlockPattern(id) {
    const list = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    if (list.indexOf(id) >= 0) return false;
    list.push(id);
    wx.setStorageSync('ranxin_unlocked_patterns', list);
    return true;
  },

  viewCollection() { wx.navigateTo({ url: '/pages/collection/collection' }); },
  viewRank() { wx.navigateTo({ url: '/pages/rank/rank' }); },

  replay() {
    if (!this.world) return;
    this.world = new PhysicsWorld(this.boardW, this.boardH);
    this._lastScore = 0;
    this._lastMax = 0;
    this._lastQuote = 0;
    this._startTime = Date.now();
    this.setData({
      score: 0, topName: '染珠', topLevel: 0,
      gameOver: false, result: {}, quoteVisible: false
    });
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
