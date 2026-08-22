// 合成大染缸 · 落球合成（无限模式，对齐 合成大染缸版本2.html）
// 引擎：canvas type=2d + requestAnimationFrame 主循环 + WebAudio 音效 + fitPage 自适应缩放
// 玩法：拖动落球合成，无通关上限；分数跨过 1000/2000/.../6000 里程碑解锁纹样，
//       合成出「大染缸」(level 5) 额外奖励纹样；堆叠超过警戒线则结束。
// 染心桥接：结算上报 submitGame；里程碑 0~3 解锁 染心 纹样 (shui→cang→ling→he)。

const DESIGN_W = 947;
const DESIGN_H = 2048;
const CW = 857;
const CH = 985;
const CANVAS_DESIGN_LEFT = 31 + 14;   // 45
const CANVAS_DESIGN_TOP = 392 + 18;   // 410

// ---------------- 关卡定义（与 HTML 完全一致）----------------
const LEVEL_DEFS = [
  { key: 'leaf', name: '板蓝根叶', r: 58, score: 0 },
  { key: 'dye', name: '靛蓝染料', r: 72, score: 20 },
  { key: 'flower', name: '扎花布片', r: 88, score: 50 },
  { key: 'pattern', name: '传统纹样', r: 106, score: 100 },
  { key: 'cloth', name: '完整扎染作品', r: 128, score: 220 },
  { key: 'vat', name: '大染缸', r: 160, score: 480 }
];
const SPRITE_SRC = {
  // Canvas 2D 在部分 iOS 真机上无法稳定解码本地 WebP。这里统一使用带透明
  // 通道的 PNG；图片组件与 Canvas 共用同一套真机兼容素材。
  leaf: '/packageGame/assets/game/merge/leaf.png', dye: '/packageGame/assets/game/merge/dye.png', flower: '/packageGame/assets/game/merge/flower.png',
  pattern: '/packageGame/assets/game/merge/pattern.png', cloth: '/packageGame/assets/game/merge/cloth.png', vat: '/packageGame/assets/game/merge/vat.png'
};

// 分数里程碑奖励（纹样）
const REWARDS = [
  { score: 1000, name: '水波初绽' },
  { score: 2000, name: '云涡回旋' },
  { score: 3000, name: '苍山花影' },
  { score: 4000, name: '靛蓝星芒' },
  { score: 5000, name: '海潮团花' },
  { score: 6000, name: '大理盛放' }
];
const VAT_REWARD_NAMES = ['染缸花印', '蓝釉回澜', '缸影团花', '苍洱染心', '靛波盛放', '大理蓝韵', '云水缸纹', '花漾染痕'];

// 染心纹样解锁阶梯（里程碑 0~3 映射到此，保持 染心 画廊进度）
const UNLOCK_LADDER = ['shui', 'cang', 'ling', 'he'];

// ---------------- 物理常量（与 HTML 完全一致）----------------
const GRAVITY = 1750, WALL_BOUNCE = .43, PIECE_BOUNCE = .36, FLOOR_BOUNCE = .23, FRICTION = .34, SUBSTEPS = 5;
const LEFT = 33, RIGHT = 824, FLOOR = 946, SPAWN_Y = 118, DANGER_Y = 195;
const LIMIT_WARNING_DISTANCE = 120;

const api = require('../../../utils/api.js');

Page({
  data: {
    pageScale: 1, pageOffsetX: 0, pageOffsetY: 0,
    canvasDisplayLeft: CANVAS_DESIGN_LEFT, canvasDisplayTop: CANVAS_DESIGN_TOP,
    canvasDisplayWidth: CW, canvasDisplayHeight: CH,
    scoreDisplay: '0', nextImg: '/packageGame/assets/game/merge/leaf.png',
    rerollsText: '×3', removalsText: '×3', muteLabel: '静音',
    rewardHint: '下一纹样：1,000 分',
    toastVisible: false, toastText: '',
    overVisible: false, overTitle: '超过堆叠上限', overText: '',
    rewardModalVisible: false, rewardBundleTitle: '', rewardThreshold: '', rewardGridClass: '',
    rewardItems: []
  },

  onLoad() {
    this.fitPage();
    this._resizeHandler = () => this.fitPage();
    if (wx.onWindowResize) wx.onWindowResize(this._resizeHandler);
    this.resetRuntimeState();
  },
  onReady() { this.initCanvas(); },
  onUnload() {
    this.running = false;
    this._canvasDisposed = true;
    if (this._spriteRetryTimer) clearTimeout(this._spriteRetryTimer);
    if (this.canvas && this._raf && this.canvas.cancelAnimationFrame) this.canvas.cancelAnimationFrame(this._raf);
    if (wx.offWindowResize && this._resizeHandler) wx.offWindowResize(this._resizeHandler);
  },

  goBack() {
    try {
      const pages = getCurrentPages();
      if (pages && pages.length > 1) {
        wx.navigateBack();
        return;
      }
    } catch (e) {}
    wx.reLaunch({ url: '/pages/index/index' });
  },

  fitPage() {
    let info;
    try { info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); } catch (e) { info = { windowWidth: 375, windowHeight: 812 }; }
    const vw = Number(info.windowWidth) || 375, vh = Number(info.windowHeight) || 812;
    const s = Math.min(vw / DESIGN_W, vh / DESIGN_H);
    this.setData({
      pageScale: s,
      pageOffsetX: (vw - DESIGN_W * s) / 2,
      pageOffsetY: (vh - DESIGN_H * s) / 2,
      canvasDisplayLeft: (vw - DESIGN_W * s) / 2 + CANVAS_DESIGN_LEFT * s,
      canvasDisplayTop: (vh - DESIGN_H * s) / 2 + CANVAS_DESIGN_TOP * s,
      canvasDisplayWidth: CW * s,
      canvasDisplayHeight: CH * s
    });
  },

  resetRuntimeState() {
    this.pieces = []; this.current = null; this.nextLevel = 0; this.score = 0;
    this.rerolls = 3; this.removals = 3; this.muted = false; this.ended = false;
    this.pointerHeld = false; this.limitWarning = false; this.activeId = null;
    this.stableFrames = 0; this.activeAge = 0; this.lastTime = Date.now(); this.uid = 1;
    this.unlockedRewards = []; this.vatRewardCount = 0; this.rewardPaused = false;
    this._startTime = Date.now();
    this.setData({
      scoreDisplay: '0', rerollsText: '×3', removalsText: '×3', muteLabel: '静音',
      overVisible: false, rewardModalVisible: false, rewardItems: [], toastVisible: false
    });
    this.updateRewardHint();
  },

  initCanvas() {
    this._canvasDisposed = false;
    const query = wx.createSelectorQuery().in(this);
    query.select('#playCanvas').fields({ node: true, size: true }).exec(res => {
      const item = res && res[0]; if (!item || !item.node) return;
      const canvas = item.node, ctx = canvas.getContext('2d');
      let info; try { info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); } catch (e) { info = { pixelRatio: 2 }; }
      const dpr = info.pixelRatio || 2;
      // Canvas 已在 WXML 中移出 transform 设计稿层；这里用它的真实显示
      // 尺寸建立 backing store，再映射回 HTML 的 857×985 坐标系。
      const displayWidth = Number(item.width) || CW;
      const displayHeight = Number(item.height) || CH;
      canvas.width = Math.max(1, Math.round(displayWidth * dpr));
      canvas.height = Math.max(1, Math.round(displayHeight * dpr));
      ctx.scale(dpr * displayWidth / CW, dpr * displayHeight / CH);
      this.canvas = canvas; this.ctx = ctx; this.dpr = dpr; this.spriteImages = {};
      Promise.all(LEVEL_DEFS.map(d => this.loadCanvasImage(d.key, SPRITE_SRC[d.key]))).then(() => {
        if (this._canvasDisposed) return;
        this.nextLevel = this.weightedRandomLevel();
        this.spawnCurrent();
        this.running = true; this.lastTime = Date.now(); this.loop();
        this.retryMissingSpriteImages(1);
      });
    });
  },

  loadCanvasImage(key, src) {
    return new Promise(resolve => {
      if (!this.canvas || this._canvasDisposed) { resolve(false); return; }
      // wx.getImageInfo 在分包页面中不能稳定识别以“/packageGame/”开头的
      // 本地绝对路径，会把它再次拼到当前页面目录后。转换成相对当前页的
      // ../../assets/...，避免出现 gameMerge/packageGame/assets 的重复路径。
      const infoSrc = src.indexOf('/packageGame/') === 0
        ? ('../..' + src.slice('/packageGame'.length))
        : src;
      let finished = false;
      let timeoutId = null;
      const finish = image => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (image && !this._canvasDisposed) this.spriteImages[key] = image;
        resolve(!!image);
      };
      const tryImageInfo = () => {
        if (!wx.getImageInfo) { finish(null); return; }
        wx.getImageInfo({
          src: infoSrc,
          success: info => assignImage(info && info.path ? info.path : '', false),
          fail: () => finish(null)
        });
      };
      const assignImage = (path, fallbackToImageInfo) => {
        if (!path || !this.canvas || this._canvasDisposed) { finish(null); return; }
        const image = this.canvas.createImage();
        image.onload = () => finish(image);
        image.onerror = () => {
          if (fallbackToImageInfo) tryImageInfo();
          else finish(null);
        };
        image.src = path;
      };

      // PNG 的包内路径在 Canvas 中可直接解码，优先走这条无额外 IO 的路径。
      // 仅当个别真机直接解码失败时，再用 getImageInfo 换取临时路径兜底；
      // 这样也避开开发者工具把分包绝对路径重复拼接产生的 500 噪声。
      timeoutId = setTimeout(() => finish(null), 3200);
      assignImage(src, true);
    });
  },

  retryMissingSpriteImages(attempt) {
    if (this._canvasDisposed || attempt > 2) return;
    const missing = LEVEL_DEFS.filter(item => !this.spriteImages[item.key]);
    if (!missing.length) return;
    this._spriteRetryTimer = setTimeout(() => {
      Promise.all(missing.map(item => this.loadCanvasImage(item.key, SPRITE_SRC[item.key]))).then(() => {
        if (!this._canvasDisposed) this.retryMissingSpriteImages(attempt + 1);
      });
    }, attempt * 500);
  },

  // ---------------- 奖励系统 ----------------
  updateRewardHint() {
    const next = REWARDS.find(r => this.score < r.score);
    const hint = next ? ('下一纹样：' + next.score.toLocaleString() + ' 分') : '全部纹样已解锁 · 继续挑战高分';
    this.setData({ rewardHint: hint });
  },

  collectScoreRewards() {
    const gained = [];
    REWARDS.forEach((r, index) => {
      if (this.score >= r.score && !this.unlockedRewards.includes(index)) {
        this.unlockedRewards.push(index);
        gained.push({ name: r.name, pattern: index, source: '达到 ' + r.score.toLocaleString() + ' 分' });
        // 染心桥接：里程碑 0~3 解锁 染心 纹样
        if (index < UNLOCK_LADDER.length) {
          try { api.unlockPattern(UNLOCK_LADDER[index], { sourceType: 'game', sourceId: 'gameMerge' }).catch(() => {}); } catch (e) {}
        }
      }
    });
    this.updateRewardHint();
    return gained;
  },

  collectVatReward() {
    const index = this.vatRewardCount++;
    return {
      name: VAT_REWARD_NAMES[index % VAT_REWARD_NAMES.length],
      pattern: (index + 2) % 6,
      source: '成功合成大染缸'
    };
  },

  showRewardBundle(items) {
    if (!items || !items.length) return;
    this.rewardPaused = true;
    this.setData({
      rewardItems: items,
      rewardBundleTitle: '你获得了 ' + items.length + ' 个纹样',
      rewardGridClass: 'rewardGrid' + (items.length === 1 ? ' single' : (items.length >= 3 ? ' many' : '')),
      rewardModalVisible: true
    });
    const hasVat = items.some(x => x.source === '成功合成大染缸');
    const scoreCount = items.filter(x => x.source.indexOf('达到 ') === 0).length;
    let threshold;
    if (hasVat && scoreCount > 0) threshold = '大染缸合成奖励 + 分数里程碑同时达成';
    else if (hasVat) threshold = '合成出大染缸，立即奖励 1 个纹样';
    else threshold = '分数里程碑奖励';
    this.setData({ rewardThreshold: threshold });
    this.tone(650 + Math.min(items.length, 4) * 35, .18);
  },

  checkRewards() {
    const gained = this.collectScoreRewards();
    if (gained.length) this.showRewardBundle(gained);
    return gained;
  },

  // ---------------- 掉落 / 合成 ----------------
  weightedRandomLevel() { const x = Math.random(); return x < .62 ? 0 : (x < .91 ? 1 : 2); },
  setNext() { this.nextLevel = this.weightedRandomLevel(); this.setData({ nextImg: SPRITE_SRC[LEVEL_DEFS[this.nextLevel].key] }); },
  spawnCurrent() {
    if (this.ended) return;
    const d = LEVEL_DEFS[this.nextLevel];
    this.current = { level: this.nextLevel, x: CW / 2, y: SPAWN_Y, r: d.r, falling: false };
    this.stableFrames = 0; this.activeAge = 0; this.setNext();
  },
  clampX(x, r) { return Math.max(LEFT + r, Math.min(RIGHT - r, x)); },
  mass(p) { return p.r * p.r; },

  dropCurrent() {
    if (this.ended || this.rewardPaused || !this.current) return;
    const p = { id: this.uid++, level: this.current.level, x: this.current.x, y: this.current.y, r: this.current.r, vx: 0, vy: 45, active: true };
    this.pieces.push(p); this.activeId = p.id; this.current = null;
    this.stableFrames = 0; this.activeAge = 0; this.pointerHeld = false;
    this.tone(230, .05);
  },

  wallFloorCollision(p) {
    if (p.x - p.r < LEFT) { p.x = LEFT + p.r; if (p.vx < 0) p.vx = -p.vx * WALL_BOUNCE; }
    if (p.x + p.r > RIGHT) { p.x = RIGHT - p.r; if (p.vx > 0) p.vx = -p.vx * WALL_BOUNCE; }
    if (p.y + p.r > FLOOR) {
      p.y = FLOOR - p.r; if (p.vy > 0) p.vy = -p.vy * FLOOR_BOUNCE; p.vx *= .965;
      if (Math.abs(p.vy) < 12) p.vy = 0; if (Math.abs(p.vx) < 4) p.vx = 0;
    }
  },

  resolvePair(a, b) {
    let dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), minDist = a.r + b.r;
    if (dist >= minDist) return false; if (dist < .001) { dx = .01; dy = -.01; dist = Math.hypot(dx, dy); }
    const nx = dx / dist, ny = dy / dist, penetration = minDist - dist, ma = this.mass(a), mb = this.mass(b), invA = 1 / ma, invB = 1 / mb, invSum = invA + invB;
    const corr = Math.max(0, penetration - .15) * .92 / invSum;
    a.x -= nx * corr * invA; a.y -= ny * corr * invA; b.x += nx * corr * invB; b.y += ny * corr * invB;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy, velNormal = rvx * nx + rvy * ny;
    if (velNormal < 0) {
      const j = -(1 + PIECE_BOUNCE) * velNormal / invSum, ix = j * nx, iy = j * ny;
      a.vx -= ix * invA; a.vy -= iy * invA; b.vx += ix * invB; b.vy += iy * invB;
      const tx = -ny, ty = nx, velT = rvx * tx + rvy * ty; let jt = -velT / invSum; const maxF = Math.abs(j) * FRICTION;
      jt = Math.max(-maxF, Math.min(maxF, jt)); a.vx -= jt * tx * invA; a.vy -= jt * ty * invA; b.vx += jt * tx * invB; b.vy += jt * ty * invB;
    }
    return true;
  },

  getHighestSettledTop() {
    let top = Infinity;
    for (const p of this.pieces) {
      const speed = Math.hypot(p.vx || 0, p.vy || 0), settledEnough = !p.active || speed < 70 || p.y > FLOOR - p.r * 2.2;
      if (!settledEnough) continue; const t = p.y - p.r; if (t < top) top = t;
    }
    return top;
  },
  updateLimitWarning() {
    const top = this.getHighestSettledTop();
    this.limitWarning = Number.isFinite(top) && top >= DANGER_Y && (top - DANGER_Y) <= LIMIT_WARNING_DISTANCE;
  },
  stackExceededLimit() { return this.pieces.some(p => (p.y - p.r) < DANGER_Y && p.y > SPAWN_Y + 20); },

  mergeOnce() {
    for (let i = 0; i < this.pieces.length; i++) for (let j = i + 1; j < this.pieces.length; j++) {
      const a = this.pieces[i], b = this.pieces[j];
      if (a.level !== b.level || a.level >= LEVEL_DEFS.length - 1) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r + 2.5) continue;
      const nl = a.level + 1, nd = LEVEL_DEFS[nl], wasActive = (a.id === this.activeId || b.id === this.activeId), ma = this.mass(a), mb = this.mass(b), mt = ma + mb;
      const merged = {
        id: this.uid++, level: nl, r: nd.r,
        x: this.clampX((a.x * ma + b.x * mb) / mt, nd.r),
        y: Math.max(SPAWN_Y + nd.r * .15, (a.y * ma + b.y * mb) / mt - nd.r * .18),
        vx: (a.vx * ma + b.vx * mb) / mt * .55, vy: Math.min(-55, (a.vy * ma + b.vy * mb) / mt - 80), active: wasActive
      };
      this.pieces.splice(j, 1); this.pieces.splice(i, 1); this.pieces.push(merged);
      if (wasActive) { this.activeId = merged.id; this.stableFrames = 0; }
      this.score += nd.score; this.setData({ scoreDisplay: this.score.toLocaleString() });

      const gainedRewards = [];
      if (nl === 5) gainedRewards.push(this.collectVatReward());
      // 微信开发者工具的分包编译器会把数组展开改写为 Babel runtime
      // helper，但该 helper 不一定随分包下发，最终会造成游戏页白屏。
      this.collectScoreRewards().forEach(reward => gainedRewards.push(reward));
      if (gainedRewards.length) this.showRewardBundle(gainedRewards);

      this.showToast(nl === 5 ? '合成大染缸 · 获得纹样奖励' : ('合成 ' + nd.name + '  +' + nd.score));
      this.tone(360 + nl * 80, .12);
      return true;
    }
    return false;
  },

  simulate(dt) {
    if (this.ended || this.rewardPaused) return;
    const h = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const p of this.pieces) { p.vy += GRAVITY * h; p.x += p.vx * h; p.y += p.vy * h; p.vx *= .999; this.wallFloorCollision(p); }
      for (let iter = 0; iter < 3; iter++) { for (let i = 0; i < this.pieces.length; i++) for (let j = i + 1; j < this.pieces.length; j++) this.resolvePair(this.pieces[i], this.pieces[j]); for (const p of this.pieces) this.wallFloorCollision(p); }
    }
    let merges = 0; while (this.mergeOnce() && merges < 4) merges++;
    if (this.activeId !== null) {
      this.activeAge += dt; const p = this.pieces.find(x => x.id === this.activeId);
      if (p) {
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 15 && p.y > SPAWN_Y + 55) this.stableFrames++; else this.stableFrames = 0;
        if (this.stableFrames > 14 || (this.activeAge > 2.4 && speed < 34)) {
          p.active = false; this.activeId = null; this.stableFrames = 0; this.activeAge = 0;
          if (this.stackExceededLimit()) this.endGame(); else this.spawnCurrent();
        }
      } else { this.activeId = null; this.spawnCurrent(); }
    }
    this.updateLimitWarning();
    if (!this.ended && this.activeId === null && !this.current && this.stackExceededLimit()) this.endGame();
  },

  drawSprite(p) {
    const im = this.spriteImages[LEVEL_DEFS[p.level].key]; const s = p.r * 2.28, ctx = this.ctx;
    if (im) {
      ctx.save(); ctx.shadowColor = 'rgba(8,31,87,.28)'; ctx.shadowBlur = Math.max(5, p.r * .14); ctx.shadowOffsetY = Math.max(3, p.r * .07); ctx.drawImage(im, p.x - s / 2, p.y - s / 2, s, s); ctx.restore();
      return;
    }
    // 极端情况下素材仍未就绪时，先绘制靛蓝扎染纹章；不再出现与主题脱节的
    // 纯色圆球。图片稍后重试成功后，下一帧会自动替换为正式纹样。
    this.drawFallbackMotif(p);
  },
  drawFallbackMotif(p) {
    const ctx = this.ctx;
    const level = Math.max(0, Math.min(LEVEL_DEFS.length - 1, p.level || 0));
    const petals = 5 + level;
    const outer = p.r * .92;
    const inner = p.r * (.34 + level * .018);
    ctx.save();
    ctx.shadowColor = 'rgba(8,31,87,.30)';
    ctx.shadowBlur = Math.max(5, p.r * .14);
    ctx.shadowOffsetY = Math.max(3, p.r * .07);
    const base = ctx.createRadialGradient(p.x - p.r * .25, p.y - p.r * .28, p.r * .08, p.x, p.y, p.r);
    base.addColorStop(0, '#f7fbff');
    base.addColorStop(.42, level < 2 ? '#d8e8ff' : '#c9dcff');
    base.addColorStop(.74, level < 3 ? '#5c84d6' : '#3f65bd');
    base.addColorStop(1, '#173d88');
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .98, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, p.r * .035);
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, p.r * .022);
    ctx.strokeStyle = 'rgba(18,61,138,.78)';
    ctx.beginPath(); ctx.arc(p.x, p.y, outer, 0, Math.PI * 2); ctx.stroke();

    for (let i = 0; i < petals; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / petals;
      const cx = p.x + Math.cos(a) * inner;
      const cy = p.y + Math.sin(a) * inner;
      const pr = p.r * (.24 + level * .008);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.78)' : 'rgba(215,232,255,.86)';
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#17458f';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.88)';
    ctx.lineWidth = Math.max(1.5, p.r * .025);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },
  roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr); ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr); ctx.lineTo(x + rr, y + h); ctx.arcTo(x, y + h, x, y + h - rr, rr); ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr);
  },
  draw() {
    const ctx = this.ctx; if (!ctx) return; ctx.clearRect(0, 0, CW, CH);
    const pulse = this.limitWarning ? (0.35 + 0.65 * Math.abs(Math.sin(Date.now() / 105))) : 0;
    ctx.save(); ctx.shadowColor = this.limitWarning ? `rgba(135,92,255,${0.65 + 0.35 * pulse})` : 'rgba(120,92,245,.58)'; ctx.shadowBlur = this.limitWarning ? 20 + 22 * pulse : 12; ctx.strokeStyle = this.limitWarning ? `rgba(133,87,255,${0.62 + 0.38 * pulse})` : 'rgba(119,91,240,.82)'; ctx.lineWidth = this.limitWarning ? 7 + 3 * pulse : 5; ctx.setLineDash([18, 10]); ctx.beginPath(); ctx.moveTo(LEFT + 8, DANGER_Y); ctx.lineTo(RIGHT - 8, DANGER_Y); ctx.stroke();
    ctx.shadowBlur = this.limitWarning ? 12 + 8 * pulse : 6; ctx.strokeStyle = this.limitWarning ? `rgba(255,255,255,${0.72 + 0.28 * pulse})` : 'rgba(255,255,255,.92)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(LEFT + 8, DANGER_Y); ctx.lineTo(RIGHT - 8, DANGER_Y); ctx.stroke();
    const labelW = 150, labelH = 38, labelX = CW / 2 - labelW / 2, labelY = DANGER_Y - labelH / 2; ctx.setLineDash([]); ctx.shadowColor = this.limitWarning ? `rgba(126,84,255,${0.60 + 0.40 * pulse})` : 'rgba(108,82,232,.42)'; ctx.shadowBlur = this.limitWarning ? 16 + 18 * pulse : 9; const grad = ctx.createLinearGradient(labelX, labelY, labelX + labelW, labelY + labelH); grad.addColorStop(0, this.limitWarning ? '#7858ff' : '#7566ef'); grad.addColorStop(1, this.limitWarning ? '#a16cff' : '#8c72f1'); ctx.fillStyle = grad; ctx.beginPath(); this.roundRectPath(ctx, labelX, labelY, labelW, labelH, 19); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.limitWarning ? '⚠ 接近上限' : '堆叠上限', CW / 2, DANGER_Y + 1); ctx.restore();
    this.pieces.forEach(p => this.drawSprite(p));
    if (this.current) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.setLineDash([8, 9]); ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(this.current.x, this.current.y + this.current.r + 5); ctx.lineTo(this.current.x, FLOOR - 5); ctx.stroke(); ctx.restore(); this.drawSprite(this.current); }
  },
  loop() {
    if (!this.running || !this.canvas) return;
    const now = Date.now(), dt = Math.min(.034, (now - this.lastTime) / 1000); this.lastTime = now;
    this.simulate(dt); this.draw();
    this._raf = this.canvas.requestAnimationFrame(() => this.loop());
  },

  touchToCanvasX(e) {
    const list = (e.touches && e.touches.length ? e.touches : e.changedTouches) || []; const t = list[0]; if (!t) return null;
    const clientX = t.clientX != null ? t.clientX : (t.pageX != null ? t.pageX : t.x); if (clientX == null) return null;
    const scale = this.data.pageScale || 1, ox = this.data.pageOffsetX || 0;
    const x = (clientX - ox) / scale - CANVAS_DESIGN_LEFT;
    if (!isFinite(x)) return null;
    return x;
  },
  moveCurrentToTouch(e) { const x = this.touchToCanvasX(e); if (x == null || this.ended || this.rewardPaused || !this.current) return; this.current.x = this.clampX(x, this.current.r); },
  onCanvasTouchStart(e) { if (this.ended || this.rewardPaused || !this.current) return; this.pointerHeld = true; this.moveCurrentToTouch(e); },
  onCanvasTouchMove(e) { if (!this.pointerHeld) return; this.moveCurrentToTouch(e); },
  onCanvasTouchEnd(e) { if (!this.pointerHeld || this.ended || this.rewardPaused || !this.current) return; this.moveCurrentToTouch(e); this.pointerHeld = false; this.dropCurrent(); },
  onCanvasTouchCancel() { this.pointerHeld = false; },

  showToast(msg) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.setData({ toastVisible: true, toastText: msg });
    this._toastTimer = setTimeout(() => this.setData({ toastVisible: false }), 1350);
  },
  tone(freq, dur) {
    if (this.muted) return;
    try {
      if (!this.audioCtx && wx.createWebAudioContext) this.audioCtx = wx.createWebAudioContext();
      const ac = this.audioCtx; if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(.04, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
    } catch (e) { }
  },
  vibrate(type) {
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: type || 'light', fail: () => { } });
      else if (wx.vibrateLong) wx.vibrateLong({ fail: () => { } });
    } catch (e) { }
  },

  // ---------------- 结算 ----------------
  endGame() {
    if (this.ended) return;
    this.ended = true; this.current = null; this.activeId = null;
    this.setData({ overVisible: true, overTitle: '超过堆叠上限', overText: '堆叠高度超过警戒线，游戏结束 · 本次得分 ' + this.score.toLocaleString() });
    this.tone(150, .28); this.vibrate('heavy');
    // 染心桥接：上报成绩（失败仅记录，不阻断）
    try {
      api.submitGame({ score: this.score, duration: Math.round((Date.now() - this._startTime) / 1000) }).catch(() => { });
    } catch (e) { }
  },

  onRewardCollect() {
    this.rewardPaused = false;
    this.setData({ rewardModalVisible: false });
  },

  onRestart() {
    this.resetRuntimeState();
    this.nextLevel = this.weightedRandomLevel();
    this.spawnCurrent();
    this.running = true; this.lastTime = Date.now();
    if (!this._raf && this.canvas) this.loop();
  },
  onReroll() {
    if (this.ended || this.rewardPaused) return;
    if (this.rerolls <= 0) return this.showToast('换一次次数已用完');
    if (!this.current || this.activeId !== null) return this.showToast('物品正在运动');
    this.rerolls--; this.current.level = this.weightedRandomLevel(); this.current.r = LEVEL_DEFS[this.current.level].r;
    this.setData({ rerollsText: '×' + this.rerolls }); this.showToast('已更换当前物品');
  },
  onRemove() {
    if (this.ended || this.rewardPaused) return;
    if (this.removals <= 0) return this.showToast('消除次数已用完');
    if (this.activeId !== null) return this.showToast('物品正在运动');
    if (!this.pieces.length) return this.showToast('染缸里还没有物品');
    let idx = 0; for (let i = 1; i < this.pieces.length; i++) if (this.pieces[i].y - this.pieces[i].r < this.pieces[idx].y - this.pieces[idx].r) idx = i;
    this.pieces.splice(idx, 1); this.removals--; this.setData({ removalsText: '×' + this.removals }); this.showToast('已消除一个物品'); this.tone(190, .07);
  },
  onToggleMute() { this.muted = !this.muted; this.setData({ muteLabel: this.muted ? '开声' : '静音' }); this.showToast(this.muted ? '已静音' : '声音已开启'); }
});
