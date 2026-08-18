// 归属：B｜核心交互 Owner
// 纹样收集 / 我的纹样库
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');
const assets = require('../../utils/assets.js');

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
    filter: 'all',
    detail: null,
    assetMap: {}
  },

  onLoad() {
    // 先解析资源就绪状态（真实图片优先），再渲染缩略图
    assets.resolvePatternAssets(engine.PATTERN_CATALOG).then(map => {
      this.setData({ assetMap: map }, () => this.loadUnlocked());
    }).catch(() => {
      this.loadUnlocked();
    });
  },

  onShow() {
    this.loadUnlocked();
  },

  loadUnlocked() {
    const local = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    const toViewList = (ids) => engine.PATTERN_CATALOG.map(p => ({ ...p, unlocked: ids.indexOf(p.id) >= 0 }));
    api.getPatterns().then(list => {
      const remoteIds = list.map(p => p.id);
      const merged = Array.from(new Set([...local, ...remoteIds]));
      this.setData({ unlocked: merged, viewList: toViewList(merged) }, () => this.renderThumbs());
    }).catch(() => {
      this.setData({ unlocked: local, viewList: toViewList(local) }, () => this.renderThumbs());
    });
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
    this.setData({ filter: e.currentTarget.dataset.key });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const p = engine.getPatternById(id);
    const a = (this.data.assetMap || {})[id] || {};
    this.setData({
      detail: {
        ...p,
        story: STORIES[id] || '这是一款独特的扎染纹样，承载着你的手作情绪。',
        file: a.file,
        hasImage: a.hasImage
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
  }
});
