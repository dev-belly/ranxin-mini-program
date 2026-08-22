// 归属：B｜核心交互 Owner
// 合成大染缸 · 三消版（玩法：交换相邻方块，横竖 3+ 同纹样消除、下落补齐、可连锁）
// 规则引擎：game-physics.js（纯函数，7×6 棋盘 / 6 纹样 / 目标 2400 / 25 步）
// 奖励体系：通关计 ranxin_game_clears → 阶梯解锁纹样；ranxin_game_props 道具永久累积
const engine = require('./game-physics.js');
const api = require('../../../utils/api.js');

const TILE_IMG = {
  blue: '/packageGame/assets/game/tile-blue.png',
  pink: '/packageGame/assets/game/tile-pink.png',
  green: '/packageGame/assets/game/tile-green.png',
  purple: '/packageGame/assets/game/tile-purple.png',
  orange: '/packageGame/assets/game/tile-orange.png',
  cyan: '/packageGame/assets/game/tile-cyan.png'
};

// 纹样解锁阶梯（与「我的作品 / 纹样库」一致）
const REWARDS = [
  { key: 'shui', name: '水波纹', thumb: '/packageGame/assets/patterns/shui.jpg', story: '水波不兴，心绪随之沉静。' },
  { key: 'cang', name: '山水纹', thumb: '/packageGame/assets/patterns/cang.jpg', story: '远山近水，胸中自有丘壑。' },
  { key: 'ling', name: '菱形纹', thumb: '/packageGame/assets/patterns/ling.jpg', story: '菱花层叠，秩序而生美感。' },
  { key: 'he',   name: '卷草纹', thumb: '/packageGame/assets/patterns/he.jpg',   story: '卷草缠绕，生生不息。' }
];

Page({
  data: {
    tiles: [],
    scoreDisplay: '0',
    targetDisplay: String(engine.TARGET_SCORE),
    moves: engine.INITIAL_MOVES,
    progressStyle: '',
    swapLeft: 1,
    clearLeft: 1,
    shuffleLeft: 1,
    clearMode: false,
    musicOn: false,
    toastVisible: false,
    toastText: '',
    ghosts: [],
    winVisible: false,
    winScore: '0',
    winStars: 0,
    winDuration: '0',
    winMoves: '0',
    rewardName: '',
    rewardThumb: '',
    rewardStory: '',
    winProps: '',
    collectProgress: '',
    nextRewardName: '',
    nextRewardThumb: ''
  },

  onLoad() {
    // 道具：初始 = 常量(1) + 历史永久累积
    let props = {};
    try { props = wx.getStorageSync('ranxin_game_props') || {}; } catch (e) {}
    this.setData({
      swapLeft: 1 + (Number(props.swap) || 0),
      clearLeft: 1 + (Number(props.clear) || 0),
      shuffleLeft: 1 + (Number(props.shuffle) || 0)
    });
    this._propsBase = {
      swap: Number(props.swap) || 0,
      clear: Number(props.clear) || 0,
      shuffle: Number(props.shuffle) || 0
    };
    this._loadRewardPreview();
    this._startTime = Date.now();
    // 初始化棋盘布局 rect（滑动交换终点坐标换算依赖）
    this._boardRect = null;
    this._moveCell = null;
    setTimeout(() => this._refreshBoardRect(), 100);
    this._newGame();
  },

  _loadRewardPreview() {
    try {
      const clears = Number(wx.getStorageSync('ranxin_game_clears')) || 0;
      const next = REWARDS[clears];
      if (next) this.setData({ nextRewardName: next.name, nextRewardThumb: next.thumb });
      else this.setData({ collectProgress: '限定纹样 4/4 已集齐' });
    } catch (e) {}
  },

  _newGame() {
    // 开局死局兜底：无可行交换则重排
    let board = engine.generateBoard();
    if (!engine.hasPossibleMove(board)) board = engine.shuffleBoard(board);
    this._board = board;
    this._score = 0;
    this._moves = engine.INITIAL_MOVES;
    this._combo = 0;
    this._busy = false;
    this._clearMode = false;
    this.setData({
      tiles: this._renderTiles(board),
      scoreDisplay: '0',
      moves: engine.INITIAL_MOVES,
      progressStyle: 'width:0%',
      winVisible: false,
      ghosts: [],
      clearMode: false,
      toastVisible: false
    });
  },

  _renderTiles(board) {
    const tiles = [];
    for (let row = 0; row < engine.ROWS; row++) {
      for (let col = 0; col < engine.COLS; col++) {
        const type = board[row][col];
        tiles.push({
          index: engine.indexOfCell(row, col),
          type,
          src: TILE_IMG[type] || TILE_IMG.blue,
          selected: false,
          clearing: false,
          spawned: false,
          hidden: false
        });
      }
    }
    return tiles;
  },

  _updateProgress() {
    const pct = Math.min(100, Math.round(this._score / engine.TARGET_SCORE * 100));
    this.setData({ progressStyle: 'width:' + pct + '%' });
  },

  _toast(msg) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.setData({ toastVisible: true, toastText: msg });
    this._toastTimer = setTimeout(() => this.setData({ toastVisible: false }), 1400);
  },

  // ---------- 交换消除 ----------
  _cellFromEvent(e) {
    const index = Number(e.currentTarget.dataset.index);
    return engine.cellFromIndex(index);
  },

  // 滑动交换：起点用 dataset（touchstart 可靠），终点用坐标实时换算（touchend dataset 不可靠）
  // 触摸点坐标（touches/changedTouches 的 clientX/Y 是页面坐标）→ 棋盘局部坐标 → 行列
  _cellFromPoint(x, y) {
    const rect = this._boardRect;
    if (!rect || !rect.width || !rect.height) return null;
    const col = Math.floor((x - rect.left) / rect.width * engine.COLS);
    const row = Math.floor((y - rect.top) / rect.height * engine.ROWS);
    if (row < 0 || row >= engine.ROWS || col < 0 || col >= engine.COLS) return null;
    return { row, col };
  },

  _pointFromEvent(e) {
    const t = (e && e.touches && e.touches[0]) || (e && e.changedTouches && e.changedTouches[0]);
    if (!t) return null;
    // 优先 clientX/Y（页面坐标）；部分环境用 x/y
    const x = (t.clientX != null ? t.clientX : t.x);
    const y = (t.clientY != null ? t.clientY : t.y);
    if (x == null || y == null) return null;
    return { x, y };
  },

  // 刷新棋盘 rect（用于坐标→格子换算）
  _refreshBoardRect(cb) {
    try {
      const q = wx.createSelectorQuery();
      q.select('.board').boundingClientRect();
      q.exec((res) => {
        if (res && res[0] && res[0].width) this._boardRect = res[0];
        if (cb) cb();
      });
    } catch (e) {
      if (cb) cb();
    }
  },

  // 手指按下：记录起点格
  onTileTouchStart(e) {
    if (this._busy) return;
    // 消除道具模式：点哪格消哪格
    if (this._clearMode || this.data.clearMode) {
      this._doClearTile(this._cellFromEvent(e));
      return;
    }
    // 先刷新棋盘 rect（滑动终点换算依赖它）
    this._refreshBoardRect(() => {
      const cell = this._cellFromEvent(e);
      this._selected = cell;
      this._markSelected(cell);
    });
  },

  // 手指滑动：用坐标实时换算当前指向的格子，相邻则高亮预览
  onTileTouchMove(e) {
    if (this._busy || this._clearMode || this.data.clearMode) return;
    if (!this._selected) return;
    const pt = this._pointFromEvent(e);
    if (!pt) return;
    const cell = this._cellFromPoint(pt.x, pt.y);
    if (!cell) return;
    this._moveCell = cell;
    if (engine.adjacent(this._selected, cell)) {
      this._markPreview(cell);
    }
  },

  // 手指松开：若滑动到相邻格则交换
  onTileTouchEnd(e) {
    if (this._busy) return;
    if (this._clearMode || this.data.clearMode) {
      return;
    }
    const first = this._selected;
    if (!first) return;
    // 终点：优先用滑动时记录的格子，其次用坐标换算
    let second = this._moveCell || null;
    if (!second) {
      const pt = this._pointFromEvent(e);
      if (pt) second = this._cellFromPoint(pt.x, pt.y);
    }
    this._selected = null;
    this._moveCell = null;
    this._markSelected(null);
    if (!second) return;
    if (first.row === second.row && first.col === second.col) return;
    if (!engine.adjacent(first, second)) {
      // 滑到远处：改选为新格（用户可能想从这里再滑）
      this._selected = second;
      this._markSelected(second);
      return;
    }
    this._trySwap(first, second);
  },

  onTileTouchCancel() {
    this._selected = null;
    this._moveCell = null;
    this._markSelected(null);
  },

  // 高亮预览目标格（不改变选中状态）
  _markPreview(cell) {
    const tiles = this.data.tiles.slice();
    tiles.forEach(t => { t.selected = false; });
    const index = engine.indexOfCell(cell.row, cell.col);
    if (tiles[index]) tiles[index].selected = true;
    this.setData({ tiles });
  },

  _markSelected(cell) {
    const tiles = this.data.tiles.slice();
    tiles.forEach(t => { t.selected = false; });
    if (cell) {
      const index = engine.indexOfCell(cell.row, cell.col);
      if (tiles[index]) tiles[index].selected = true;
    }
    this.setData({ tiles });
  },

  _trySwap(a, b) {
    const result = engine.matchesForSwap(this._board, a, b);
    if (!result) {
      this._toast('这样换没有消除组合');
      return;
    }
    this._busy = true;
    this._board = result.board;
    this._moves--;
    this._combo = 0;
    this._playSwapAnimation(a, b, () => {
      this._resolveChain(result.matches);
    });
  },

  _playSwapAnimation(a, b, done) {
    const tiles = this.data.tiles.slice();
    const ai = engine.indexOfCell(a.row, a.col);
    const bi = engine.indexOfCell(b.row, b.col);
    // 直接交换渲染
    const tmp = tiles[ai].type;
    tiles[ai].type = tiles[bi].type;
    tiles[bi].type = tmp;
    tiles[ai].src = TILE_IMG[tiles[ai].type] || TILE_IMG.blue;
    tiles[bi].src = TILE_IMG[tiles[bi].type] || TILE_IMG.blue;
    this.setData({ tiles });
    setTimeout(done, 180);
  },

  _resolveChain(matches) {
    // 消除 + 计分（计分 = 消除格数 × 60 × 连锁倍率）
    const combo = this._combo + 1;
    this._combo = combo;
    const gain = engine.scoreForMatch(matches.size, combo);
    this._score += gain;
    this.setData({ scoreDisplay: this._score.toLocaleString(), moves: this._moves });
    this._updateProgress();
    this._toast('消除 ' + matches.size + ' 格  +' + gain + (combo > 1 ? '  连锁×' + combo : ''));

    const tiles = this.data.tiles.slice();
    tiles.forEach((t, i) => {
      if (matches.has(i)) t.clearing = true;
    });
    this.setData({ tiles });

    setTimeout(() => {
      // 下落补齐
      const collapsed = engine.collapseMatches(this._board, matches);
      this._board = collapsed.board;
      this._animateCollapse(matches, collapsed.spawned, () => {
        // 连锁：新棋盘若仍有消除，继续
        const nextMatches = engine.findMatches(this._board);
        if (nextMatches.size > 0) {
          this._resolveChain(nextMatches);
        } else {
          this._finishMove();
        }
      });
    }, 260);
  },

  _animateCollapse(matches, spawned, done) {
    // 直接重渲染（保持与引擎一致），ghost 下落动画仅保留最终状态
    const tiles = this._renderTiles(this._board);
    const spawnedSet = new Set(spawned);
    tiles.forEach(t => {
      if (spawnedSet.has(t.index)) t.spawned = true;
    });
    this.setData({ tiles });
    setTimeout(done, 220);
  },

  _finishMove() {
    this._busy = false;
    // 死局兜底：无可行交换自动打乱一次
    if (!engine.hasPossibleMove(this._board)) {
      this._board = engine.shuffleBoard(this._board);
      this.setData({ tiles: this._renderTiles(this._board) });
      this._toast('无可消除组合，已自动重排');
    }
    if (this._score >= engine.TARGET_SCORE) {
      this._win();
    } else if (this._moves <= 0) {
      this._lose();
    }
  },

  // ---------- 道具 ----------
  useSwapTool() {
    if (this._busy || this.data.swapLeft <= 0) return;
    // 换一换：寻找第一对可产生消除的相邻格子并交换
    const board = this._board;
    let found = null;
    for (let row = 0; row < engine.ROWS; row++) {
      for (let col = 0; col < engine.COLS; col++) {
        const here = { row, col };
        if (col + 1 < engine.COLS) {
          const right = { row, col: col + 1 };
          if (engine.matchesForSwap(board, here, right)) { found = [here, right]; break; }
        }
        if (row + 1 < engine.ROWS) {
          const down = { row: row + 1, col };
          if (engine.matchesForSwap(board, here, down)) { found = [here, down]; break; }
        }
      }
      if (found) break;
    }
    if (!found) return this._toast('当前没有可换的组合');
    this.setData({ swapLeft: this.data.swapLeft - 1 });
    this._trySwap(found[0], found[1]);
  },

  beginClearTool() {
    if (this._busy) return;
    if (this.data.clearLeft <= 0) return this._toast('消除道具已用完');
    this.setData({ clearMode: !this.data.clearMode });
    if (this.data.clearMode) this._toast('点击任意格子消除');
  },

  _doClearTile(cell) {
    if (this.data.clearLeft <= 0) return;
    // 消除：将该格替换为新的随机纹样
    const board = engine.cloneBoard(this._board);
    const type = engine.randomType();
    board[cell.row][cell.col] = type;
    this._board = board;
    this.setData({ clearLeft: this.data.clearLeft - 1, clearMode: false, tiles: this._renderTiles(board) });
    // 消除后可能出现新消除，直接结算
    const nextMatches = engine.findMatches(board);
    if (nextMatches.size > 0) {
      this._combo = 0;
      this._resolveChain(nextMatches);
    } else {
      this._toast('已消除一格');
    }
  },

  useShuffleTool() {
    if (this._busy) return;
    if (this.data.shuffleLeft <= 0) return this._toast('打乱道具已用完');
    this._board = engine.shuffleBoard(this._board);
    this.setData({ shuffleLeft: this.data.shuffleLeft - 1, tiles: this._renderTiles(this._board) });
    this._toast('已打乱棋盘');
  },

  toggleMusic() {
    this.setData({ musicOn: !this.data.musicOn });
    this._toast(this.data.musicOn ? '音乐开启' : '音乐已关');
  },

  // ---------- 结算 ----------
  _win() {
    this._busy = true;
    const duration = Math.round((Date.now() - this._startTime) / 1000);
    const stars = this._moves >= 15 ? 3 : (this._moves >= 8 ? 2 : 1);
    this._submitWin(stars, duration);
  },

  _lose() {
    this._busy = true;
    this._toast('步数用完了，再试一次吧');
    setTimeout(() => this._newGame(), 900);
  },

  _submitWin(stars, duration) {
    let clears = 0;
    try { clears = Number(wx.getStorageSync('ranxin_game_clears')) || 0; } catch (e) {}
    const newClears = clears + 1;
    try { wx.setStorageSync('ranxin_game_clears', newClears); } catch (e) {}

    // 道具补给：3星→换一换+1/打乱+1；2星→打乱+1；1星→换一换+1
    const props = Object.assign({}, this._propsBase);
    const propDesc = [];
    if (stars >= 3) { props.swap += 1; props.shuffle += 1; propDesc.push('换一换 +1', '打乱 +1'); }
    else if (stars === 2) { props.shuffle += 1; propDesc.push('打乱 +1'); }
    else { props.swap += 1; propDesc.push('换一换 +1'); }
    try { wx.setStorageSync('ranxin_game_props', props); } catch (e) {}
    this._propsBase = props;

    // 纹样解锁（后端失败不阻断，console.error 可见）
    let reward = { name: '', thumb: '', story: '' };
    if (newClears <= REWARDS.length) {
      reward = REWARDS[newClears - 1];
    }
    api.unlockPattern && api.unlockPattern(reward.key, 'game').catch((err) => { console.error('unlockPattern 失败', err); });
    api.submitGame && api.submitGame({ score: this._score, duration, clears: newClears }).catch((err) => { console.error('submitGame 失败', err); });

    const collect = newClears >= REWARDS.length ? '限定纹样 4/4 已集齐' : '限定纹样 ' + newClears + '/4 已收集';

    this.setData({
      winVisible: true,
      winScore: this._score.toLocaleString(),
      winStars: stars,
      winDuration: String(duration),
      winMoves: String(this._moves),
      rewardName: reward.name,
      rewardThumb: reward.thumb,
      rewardStory: reward.story,
      winProps: '本局奖励：' + propDesc.join('、'),
      collectProgress: collect,
      nextRewardName: newClears < REWARDS.length ? REWARDS[newClears].name : '',
      nextRewardThumb: newClears < REWARDS.length ? REWARDS[newClears].thumb : ''
    });
  },

  continuePlay() {
    this._startTime = Date.now();
    this._newGame();
  },

  goBack() {
    wx.navigateBack();
  }
});
