// 归属：B｜核心交互 Owner
// 合成大染缸·情绪疗愈版：三消/连连看（对齐染心第二章 2.1.1）
// 玩法：交换相邻纹样元素，3+ 同色消除；稀有「残片」降至底部收集解锁纹样；
//       每次消除浮现正念提示语；限步数（3—5 分钟碎片场景）。
const engine = require('../../utils/pattern-engine.js');

const TYPES = ['hudie', 'tuan', 'shui', 'cang', 'ling', 'he'];
const COLS = 8;
const ROWS = 8;
const MOVES_TOTAL = 28;
const SPECIAL_RATE = 0.08; // 补充时生成残片的概率

// 稀有纹样残片：收集后解锁对应纹样
const SPECIALS = [
  { key: 'hudie', name: '蝴蝶纹残片', unlock: 'hudie' },
  { key: 'wanzi', name: '万字纹残片', unlock: 'tuan' }
];

const QUOTES = [
  '不急，一块布有一块布的节奏。',
  '此刻，只关注落下的位置。',
  '每一块布，都有自己的呼吸。',
  '慢一点，颜色会更稳。',
  '你做的，已经足够好。'
];

function randType() { return Math.floor(Math.random() * TYPES.length); }

function makeTile() {
  let t = { type: randType(), special: null };
  if (Math.random() < SPECIAL_RATE) {
    t.special = SPECIALS[Math.floor(Math.random() * SPECIALS.length)].key;
  }
  return t;
}

Page({
  data: {
    score: 0,
    best: 0,
    moves: MOVES_TOTAL,
    movesTotal: MOVES_TOTAL,
    selected: null, // {r,c}
    quote: '',
    quoteVisible: false,
    gameOver: false,
    muted: false,
    fragments: { hudie: 0, wanzi: 0 }, // 本局已收集残片数
    result: {}
  },

  onLoad() {
    this.board = [];
    this.busy = false;
    this.fragments = { hudie: 0, wanzi: 0 };
    this.unlockedThisGame = [];
    this.startTime = Date.now();
    this.setData({
      best: wx.getStorageSync('ranxin_game_best') || 0,
      fragments: { hudie: 0, wanzi: 0 }
    });
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#game-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.scale(dpr, dpr);
      this.boardW = width;
      this.boardH = height;
      this.cell = width / COLS;
      wx.createSelectorQuery().select('.board-wrap').boundingClientRect(rect => {
        this.boardLeft = rect ? rect.left : 0;
        this.boardTop = rect ? rect.top : 0;
      }).exec();
      this.buildBoard();
      this.draw();
    });
  },

  onUnload() { this.busy = true; },

  // ---- 棋盘构建 ----
  buildBoard() {
    const board = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        let type;
        do { type = randType(); }
        while (this.wouldMatchAt(board, r, c, type));
        board[r][c] = { type, special: null };
      }
    }
    this.board = board;
    if (!this.hasPossibleMove()) this.shuffle();
  },

  wouldMatchAt(board, r, c, type) {
    // 左两格
    if (c >= 2 && board[r][c - 1] && board[r][c - 2] &&
        board[r][c - 1].type === type && board[r][c - 2].type === type) return true;
    // 上两格
    if (r >= 2 && board[r - 1] && board[r - 2] &&
        board[r - 1][c] && board[r - 2][c] &&
        board[r - 1][c].type === type && board[r - 2][c].type === type) return true;
    return false;
  },

  // ---- 匹配检测 ----
  findMatches() {
    const b = this.board;
    const clear = {};
    const mark = (r, c) => { clear[r + '_' + c] = true; };
    // 横向
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        const same = c < COLS && b[r][c] && b[r][c - 1] && b[r][c].type === b[r][c - 1].type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = c - run; k < c; k++) mark(r, k);
          run = 1;
        }
      }
    }
    // 纵向
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        const same = r < ROWS && b[r][c] && b[r - 1][c] && b[r][c].type === b[r - 1][c].type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = r - run; k < r; k++) mark(k, c);
          run = 1;
        }
      }
    }
    return Object.keys(clear).map(k => {
      const [r, c] = k.split('_').map(Number);
      return { r, c };
    });
  },

  // ---- 重力 + 补充 + 残片收集 ----
  applyGravity() {
    for (let c = 0; c < COLS; c++) {
      const stack = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r][c]) stack.push(this.board[r][c]);
      }
      const newCol = new Array(ROWS).fill(null);
      for (let i = 0; i < stack.length; i++) newCol[ROWS - 1 - i] = stack[i];
      // 底部残片收集
      const bottom = newCol[ROWS - 1];
      if (bottom && bottom.special) {
        this.collectFragment(bottom.special);
        newCol[ROWS - 1] = null;
      }
      // 顶部补充
      for (let r = 0; r < ROWS; r++) {
        if (!newCol[r]) newCol[r] = makeTile();
      }
      for (let r = 0; r < ROWS; r++) this.board[r][c] = newCol[r];
    }
  },

  collectFragment(key) {
    this.fragments[key] = (this.fragments[key] || 0) + 1;
    const spec = SPECIALS.find(s => s.key === key);
    if (spec && !this.unlockedThisGame.includes(spec.unlock)) {
      this.unlockedThisGame.push(spec.unlock);
      this.unlockPattern(spec.unlock);
    }
    this.setData({ fragments: Object.assign({}, this.fragments) });
  },

  // ---- 交换与连锁 ----
  swap(r1, c1, r2, c2) {
    const t = this.board[r1][c1];
    this.board[r1][c1] = this.board[r2][c2];
    this.board[r2][c2] = t;
  },

  attemptSwap(r1, c1, r2, c2) {
    if (this.busy || this.data.gameOver) return;
    this.busy = true;
    this.swap(r1, c1, r2, c2);
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.swap(r1, c1, r2, c2); // 无匹配，换回
      this.busy = false;
      this.draw();
      wx.showToast({ title: '这两块凑不成，换一对', icon: 'none' });
      return;
    }
    // 有效移动，扣步数
    let moves = this.data.moves - 1;
    this.setData({ moves, selected: null });
    let combo = 1;
    let total = 0;
    while (matches.length) {
      total += matches.length * 10 * combo;
      this.showQuote();
      for (const m of matches) this.board[m.r][m.c] = null;
      this.applyGravity();
      const next = this.findMatches();
      combo++;
      matches.length = 0;
      next.forEach(m => matches.push(m));
    }
    if (!this.data.muted) wx.vibrateShort({ type: 'light' });
    this.setData({ score: this.data.score + total });
    if (!this.hasPossibleMove()) this.shuffle();
    this.busy = false;
    this.draw();
    if (moves <= 0) this.gameOver();
  },

  hasPossibleMove() {
    const b = this.board;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 右
        if (c + 1 < COLS) {
          this.swap(r, c, r, c + 1);
          const ok = this.findMatches().length > 0;
          this.swap(r, c, r, c + 1);
          if (ok) return true;
        }
        // 下
        if (r + 1 < ROWS) {
          this.swap(r, c, r + 1, c);
          const ok = this.findMatches().length > 0;
          this.swap(r, c, r + 1, c);
          if (ok) return true;
        }
      }
    }
    return false;
  },

  shuffle() {
    const flat = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(this.board[r][c]);
    do {
      for (let i = flat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flat[i], flat[j]] = [flat[j], flat[i]];
      }
      let k = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.board[r][c] = flat[k++];
    } while (this.findMatches().length > 0 || !this.hasPossibleMove());
  },

  // ---- 输入 ----
  onBoardTap(e) {
    if (this.busy || this.data.gameOver || !this.canvas) return;
    const t = (e.changedTouches && e.changedTouches[0]) || e.detail || {};
    const x = (t.x != null ? t.x : (t.clientX != null ? t.clientX - this.boardLeft : 0));
    const y = (t.y != null ? t.y : (t.clientY != null ? t.clientY - this.boardTop : 0));
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const sel = this.data.selected;
    if (!sel) { this.setData({ selected: { r, c } }); this.draw(); return; }
    if (sel.r === r && sel.c === c) { this.setData({ selected: null }); this.draw(); return; }
    const adjacent = Math.abs(sel.r - r) + Math.abs(sel.c - c) === 1;
    if (adjacent) {
      this.attemptSwap(sel.r, sel.c, r, c);
    } else {
      this.setData({ selected: { r, c } }); this.draw();
    }
  },

  // ---- 绘制 ----
  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx, w = this.boardW, h = this.boardH, cell = this.cell;
    ctx.clearRect(0, 0, w, h);
    // 棋盘玻璃底
    ctx.save();
    ctx.fillStyle = 'rgba(30, 77, 140, 0.10)';
    this.roundRect(ctx, 0, 0, w, h, 20); ctx.fill();
    ctx.restore();
    // 网格线
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
    }
    ctx.restore();
    // 选中高亮
    const sel = this.data.selected;
    if (sel) {
      ctx.save();
      ctx.strokeStyle = '#ffd36b';
      ctx.lineWidth = 4;
      this.roundRect(ctx, sel.c * cell + 4, sel.r * cell + 4, cell - 8, cell - 8, 12); ctx.stroke();
      ctx.restore();
    }
    // 纹样块
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r][c];
        if (!tile) continue;
        const cx = c * cell + cell / 2;
        const cy = r * cell + cell / 2;
        const p = engine.getPatternById(TYPES[tile.type]);
        engine.renderBallPattern(ctx, cx, cy, cell * 0.42, {
          type: p ? p.type : 'spiral',
          petals: p ? p.petals : 6,
          tightness: 0.45,
          whitespace: 0.32,
          rotation: 0,
          dyeName: ['板蓝根', '栀子黄', '茜草', '靛青', '紫草', '板蓝根'][tile.type % 6],
          concentration: 0.7,
          seed: tile.type + 1
        });
        if (tile.special) {
          const spec = SPECIALS.find(s => s.key === tile.special);
          ctx.save();
          ctx.strokeStyle = '#ffd36b';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 2;
          this.roundRect(ctx, c * cell + 3, r * cell + 3, cell - 6, cell - 6, 12); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255,211,107,0.92)';
          ctx.font = (cell * 0.22) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('残', cx, cy + cell * 0.34);
          ctx.restore();
        }
      }
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
  gameOver() {
    const score = this.data.score;
    const best = Math.max(score, this.data.best);
    wx.setStorageSync('ranxin_game_best', best);
    const unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    const unlockedPatterns = unlocked.slice(-3).reverse().map(id => {
      const p = engine.PATTERN_CATALOG.find(x => x.id === id);
      return p ? { id, name: p.name, thumb: '/assets/patterns/' + id + '.png' } : null;
    }).filter(Boolean);
    const defaults = engine.PATTERN_CATALOG.filter(p => p.unlockedByDefault).map(p => ({
      id: p.id, name: p.name, thumb: '/assets/patterns/' + p.id + '.png'
    }));
    while (unlockedPatterns.length < 3 && defaults.length) {
      const d = defaults.shift();
      if (!unlockedPatterns.find(u => u.id === d.id)) unlockedPatterns.push(d);
    }
    const percent = Math.min(99, 40 + Math.floor(score / 80));
    const seconds = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.max(1, Math.floor(seconds / 60));
    this.setData({
      gameOver: true,
      best,
      result: {
        score,
        time: seconds,
        timeMinutes: minutes,
        percent,
        fragments: this.fragments,
        unlockedCount: unlocked.length || 1,
        unlockedPatterns
      }
    });
  },

  collectPattern() {
    wx.showToast({ title: '纹样已收入库', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/works/works' }), 600);
  },

  viewCollection() { wx.navigateTo({ url: '/pages/collection/collection' }); },
  viewRank() { wx.showToast({ title: '排行榜由 C 接入', icon: 'none' }); },

  replay() {
    this.board = [];
    this.busy = false;
    this.fragments = { hudie: 0, wanzi: 0 };
    this.unlockedThisGame = [];
    this.startTime = Date.now();
    this.setData({
      score: 0, moves: MOVES_TOTAL, selected: null,
      gameOver: false, result: {}, fragments: { hudie: 0, wanzi: 0 }
    });
    this.buildBoard();
    this.draw();
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
