// 归属：B｜核心交互 Owner
// 纹样收集 / 我的纹样库
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');
const assets = require('../../utils/assets.js');
const DEFAULT_UNLOCKED = ['hudie', 'tuan'];
const VALID_IDS = engine.PATTERN_CATALOG.map(p => p.id);
const FALLBACK_ASSET_MAP = engine.PATTERN_CATALOG.reduce((map, p) => {
  map[p.id] = { file: null, hasImage: false };
  return map;
}, {});

const STORIES = {
  shui: '连续折叠与扎结会形成自然流线，象征流动、松弛与不过度控制。',
  hudie: '轻盈展翅，寓意破茧新生，适合需要力量的时刻。',
  tuan: '圆满聚合，如花开当庭，带来安定与归属感。',
  ling: '菱形秩序，象征稳定与清晰，适合整理思绪。',
  cang: '苍山洱海入布，寓意乐山乐水、道法自然。',
  he: '卷草绵延，象征生生不息，于流转中见韧性。'
};

Page({
  data: {
    catalog: engine.PATTERN_CATALOG,
    viewList: [],
    unlocked: [],
    unlockedCount: 0,
    total: engine.PATTERN_CATALOG.length,
    filter: 'all',
    detail: null,
    assetMap: FALLBACK_ASSET_MAP,
    loading: true,
    loadError: false
  },

  onLoad() {
    // 先解析资源就绪状态（真实图片优先），再渲染缩略图
    // 兜底 map：保证每个纹样 id 都有 {file,hasImage} 占位，避免模板 assetMap[id].hasImage 访问 undefined 报错
    assets.resolvePatternAssets(engine.PATTERN_CATALOG).then(map => {
      this.setData({ assetMap: Object.assign({}, FALLBACK_ASSET_MAP, map || {}) }, () => this.loadUnlocked());
    }).catch(() => {
      this.setData({ assetMap: FALLBACK_ASSET_MAP }, () => this.loadUnlocked());
    });
  },

  onShow() {
    this.loadUnlocked();
  },

  loadUnlocked() {
    const localRaw = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    const local = Array.isArray(localRaw) ? localRaw.filter(id => VALID_IDS.indexOf(id) >= 0) : [];
    const toViewList = (ids) => engine.PATTERN_CATALOG.map(p => ({ ...p, unlocked: ids.indexOf(p.id) >= 0 }));
    const seq = (this._unlockLoadSeq || 0) + 1;
    this._unlockLoadSeq = seq;
    this.setData({ loading: true, loadError: false });
    // 只请求“已解锁”数据。旧代码请求了全量目录并把每个 id 都当作已解锁，
    // 导致纹样库首次打开就是 6/6；这里严格区分目录与用户解锁记录。
    api.getPatterns({ unlockedOnly: true }).then(list => {
      if (seq !== this._unlockLoadSeq) return;
      const remoteIds = Array.isArray(list)
        ? list.map(p => p && p.id).filter(id => VALID_IDS.indexOf(id) >= 0)
        : [];
      const merged = Array.from(new Set(DEFAULT_UNLOCKED.concat(local, remoteIds)));
      wx.setStorageSync('ranxin_unlocked_patterns', merged);
      const view = toViewList(merged);
      this.setData({
        unlocked: merged,
        viewList: view,
        unlockedCount: view.filter(v => v.unlocked).length,
        loading: false,
        loadError: false
      }, () => this.renderThumbs());
    }).catch(() => {
      if (seq !== this._unlockLoadSeq) return;
      const safeLocal = Array.from(new Set(DEFAULT_UNLOCKED.concat(local)));
      const view = toViewList(safeLocal);
      this.setData({
        unlocked: safeLocal,
        viewList: view,
        unlockedCount: view.filter(v => v.unlocked).length,
        loading: false,
        loadError: true
      }, () => this.renderThumbs());
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/index/index' });
  },

  goGame() {
    this.setData({ detail: null });
    wx.navigateTo({ url: '/packageGame/pages/gameHub/gameHub' });
  },

  renderThumbs() {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const catalog = this.data.catalog;
    const assetMap = this.data.assetMap || {};
    wx.nextTick(() => {
      catalog.forEach(p => {
        // 已有真实图片则交由 <image> 渲染，跳过 Canvas
        if (assetMap[p.id] && assetMap[p.id].hasImage) return;
        wx.createSelectorQuery().select('#col-' + p.id).fields({ node: true, size: true }).exec(res => {
          if (!res[0]) return;
          const canvas = res[0].node;
          const { width, height } = res[0];
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          engine.renderTieDye(ctx, width, height, {
            type: p.type,
            petals: p.petals,
            tightness: 0.5,
            whitespace: 0.3,
            rotation: 0,
            dyeName: '板蓝根',
            concentration: 0.7,
            seed: 42
          });
        });
      });
    });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.key }, () => this.renderThumbs());
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const p = engine.getPatternById(id);
    const a = (this.data.assetMap || {})[id] || {};
    const unlocked = this.data.unlocked.indexOf(id) >= 0;
    this.setData({
      detail: {
        ...p,
        story: STORIES[id] || '这是一款独特的扎染纹样，承载着你的手作情绪。',
        file: a.file,
        hasImage: a.hasImage,
        unlocked
      }
    }, () => {
      wx.nextTick(() => this.renderDetailCanvas());
    });
  },

  renderDetailCanvas() {
    if (!this.data.detail) return;
    if (this.data.detail.hasImage) return; // 真实图片优先
    const dpr = wx.getSystemInfoSync().pixelRatio;
    wx.createSelectorQuery().select('#detail-canvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      engine.renderTieDye(ctx, width, height, {
        type: this.data.detail.type,
        petals: this.data.detail.petals,
        tightness: 0.5,
        whitespace: 0.3,
        rotation: 0,
        dyeName: '板蓝根',
        concentration: 0.75,
        seed: 42
      });
    });
  },

  closeDetail() {
    this.setData({ detail: null });
  },

  noop() {},

  usePattern() {
    const detail = this.data.detail;
    if (!detail || !detail.unlocked) return;
    wx.setStorageSync('ranxin_diy_prefill', detail.id);
    this.setData({ detail: null });
    wx.switchTab({ url: '/pages/diy/diy' });
  }
});
