// 归属：B｜核心交互 Owner
// 纹样收集 / 我的纹样库
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');

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
    unlocked: [],
    filter: 'all',
    detail: null
  },

  onLoad() {
    this.loadUnlocked();
  },

  onShow() {
    this.loadUnlocked();
  },

  onReady() {
    this.renderThumbs();
  },

  loadUnlocked() {
    const local = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    api.getPatterns().then(list => {
      const remoteIds = list.map(p => p.id);
      const merged = Array.from(new Set([...local, ...remoteIds]));
      this.setData({ unlocked: merged }, () => this.renderThumbs());
    }).catch(() => {
      this.setData({ unlocked: local }, () => this.renderThumbs());
    });
  },

  renderThumbs() {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const catalog = this.data.catalog;
    wx.nextTick(() => {
      catalog.forEach(p => {
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
    this.setData({ detail: { ...p, story: STORIES[id] || '这是一款独特的扎染纹样，承载着你的手作情绪。' } }, () => {
      wx.nextTick(() => this.renderDetailCanvas());
    });
  },

  renderDetailCanvas() {
    if (!this.data.detail) return;
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
