// 归属：B｜核心交互 Owner
// 正念 DIY：情绪 → 布料 → 纹样 → 参数化编辑 → 入染 → 氧化 → 拆结 → 保存
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');

const STEPS = ['情绪', '布料', '纹样', '纹样DIY', '入染', '氧化', '拆结'];

const MOODS = [
  { id: 'anxious', label: '有点焦躁', emoji: '😣', color: '#F4A8A8' },
  { id: 'tired', label: '有些疲惫', emoji: '😔', color: '#A8C4F4' },
  { id: 'messy', label: '脑子很乱', emoji: '😵', color: '#C9A8F4' },
  { id: 'quiet', label: '需要安静', emoji: '😌', color: '#A8D8F4' },
  { id: 'calm', label: '很平静', emoji: '😊', color: '#A8E0D0' },
  { id: 'good', label: '今天不错', emoji: '😄', color: '#F4D18C' }
];

const FABRICS = [
  { id: 'bag', name: '帆布袋', tag: '挺括', desc: '纹样边缘更清晰' },
  { id: 'scarf', name: '方巾', tag: '轻柔', desc: '颜色扩散自然' },
  { id: 'pillow', name: '抱枕', tag: '柔软', desc: '适合大面积纹样' },
  { id: 'mat', name: '茶席', tag: '雅致', desc: '留白更有禅意' }
];

const DYES = ['板蓝根', '靛青', '紫草', '茜草', '栀子黄'];
const DYE_METHODS = [
  { id: 'full', name: '整体浸染', desc: '将布料完全浸入染液，适合基础图案' },
  { id: 'partial', name: '局部入染', desc: '仅浸入局部区域，适合创造层次', badge: '推荐' },
  { id: 'drop', name: '点染滴落', desc: '适合创造自然随性的纹样效果' }
];
const UNTIE_METHODS = [
  { id: 'hand', name: '手工拆结', desc: '轻柔拆解，保留细节' },
  { id: 'scissor', name: '剪刀辅助', desc: '更快速，适合较紧结扣' }
];

Page({
  data: {
    steps: STEPS,
    step: 0,
    moods: MOODS,
    fabrics: FABRICS,
    dyes: DYES,
    dyeMethods: DYE_METHODS,
    untieMethods: UNTIE_METHODS,
    catalog: engine.PATTERN_CATALOG,
    cats: ['推荐', '自然', '几何', '白族传统'],
    currentCat: '推荐',
    filteredCatalog: engine.PATTERN_CATALOG,
    mood: 'quiet',
    fabric: 'scarf',
    patternId: 'tuan',
    activeTab: '结构',
    params: {
      petals: 8,
      tightness: 50,
      whitespace: 40,
      rotation: 15
    },
    dyeName: '板蓝根',
    concentration: 60,
    dyeMethod: 'partial',
    oxidationTime: 3,
    untieMethod: 'hand',
    tip: '',
    dyeColors: {
      '板蓝根': '#1E4D8C',
      '靛青': '#2E5AAC',
      '紫草': '#6B3FA0',
      '茜草': '#B83B3B',
      '栀子黄': '#D99E2B'
    }
  },

  onLoad() {
    this.setData({ tip: this.randomTip(), filteredCatalog: engine.PATTERN_CATALOG });
    // 接受「情绪测试」页推荐的预填纹样（A 的 mbti 页写入）
    const prefill = wx.getStorageSync('ranxin_diy_prefill');
    if (prefill && engine.getPatternById(prefill)) {
      this.setData({ patternId: prefill });
      wx.removeStorageSync('ranxin_diy_prefill');
    }
  },

  onReady() {
    // 画布在 step>=3 才出现，由 afterStepChange 按需初始化
  },

  // 按当前步骤的画布 id 初始化并绘制（每步画布 id 唯一）
  initCanvasById(id) {
    const query = wx.createSelectorQuery();
    query.select('#' + id).fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      this.canvas = canvas;
      this.canvasW = width;
      this.canvasH = height;
      this.ctx = canvas.getContext('2d');
      this.ctx.scale(dpr, dpr);
      if (id === 'diy-preview') {
        // 编辑器画布需要记录屏幕坐标，用于拖拽旋转
        query.select('#diy-preview').boundingClientRect(rect => {
          this.previewRect = rect;
        }).exec();
      }
      this.drawPreview();
    });
  },

  onEditorTouch(e) {
    if (!this.previewRect) return;
    const t = e.touches[0];
    const cx = this.previewRect.left + this.canvasW / 2;
    const cy = this.previewRect.top + this.canvasH / 2;
    let deg = Math.atan2(t.clientY - cy, t.clientX - cx) * 180 / Math.PI;
    deg = Math.max(-180, Math.min(180, Math.round(deg)));
    this.setData({ 'params.rotation': deg, activeTab: '旋转' }, () => this.drawPreview());
  },

  randomTip() {
    const tips = [
      '扎得更紧，染色边界会更清晰。',
      '入染时间越长，颜色越深。',
      '氧化过程中，靛蓝色会随着空气接触逐渐加深。',
      '保持布料湿润并通风，有助于获得更均匀的蓝色效果。'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  },

  drawPreview() {
    if (!this.ctx) return;
    const { patternId, params, dyeName, concentration, step, oxidationTime } = this.data;
    const pattern = engine.getPatternById(patternId);
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    // 氧化步骤：氧化时长越长，靛蓝越深（视觉反馈）
    let conc = concentration / 100;
    if (step === 5) {
      conc = Math.min(1, conc + (oxidationTime - 1) * 0.06);
    }
    engine.renderTieDye(this.ctx, w, h, {
      type: pattern.type,
      petals: params.petals,
      tightness: params.tightness / 100,
      whitespace: params.whitespace / 100,
      rotation: params.rotation,
      dyeName,
      concentration: conc,
      seed: 42
    });
  },

  chooseMood(e) {
    const mood = e.currentTarget.dataset.id;
    const rec = this.moodToPattern(mood);
    this.setData({
      mood,
      patternId: rec.id,
      'params.petals': rec.petals,
      tip: this.randomTip()
    }, () => this.drawPreview());
  },

  moodToPattern(mood) {
    const map = {
      anxious: { id: 'shui', petals: 6 },
      tired: { id: 'cang', petals: 1 },
      messy: { id: 'ling', petals: 4 },
      quiet: { id: 'tuan', petals: 8 },
      calm: { id: 'he', petals: 12 },
      good: { id: 'hudie', petals: 2 }
    };
    return map[mood] || { id: 'tuan', petals: 8 };
  },

  chooseFabric(e) {
    this.setData({ fabric: e.currentTarget.dataset.id });
  },

  choosePattern(e) {
    const patternId = e.currentTarget.dataset.id;
    const pattern = engine.getPatternById(patternId);
    this.setData({ patternId, 'params.petals': pattern.petals }, () => this.drawPreview());
  },

  setCat(e) {
    const cat = e.currentTarget.dataset.cat;
    const list = cat === '推荐' ? engine.PATTERN_CATALOG : engine.PATTERN_CATALOG.filter(p => p.cat === cat);
    this.setData({ currentCat: cat, filteredCatalog: list }, () => this.renderPatternThumbs());
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onParamChange(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    this.setData({ [`params.${key}`]: val }, () => this.drawPreview());
  },

  chooseDye(e) {
    this.setData({ dyeName: e.currentTarget.dataset.name }, () => this.drawPreview());
  },

  onConcentrationChange(e) {
    this.setData({ concentration: e.detail.value }, () => this.drawPreview());
  },

  chooseDyeMethod(e) {
    this.setData({ dyeMethod: e.currentTarget.dataset.id });
  },

  onOxidationChange(e) {
    this.setData({ oxidationTime: e.detail.value }, () => this.drawPreview());
  },

  chooseUntieMethod(e) {
    this.setData({ untieMethod: e.currentTarget.dataset.id });
  },

  next() {
    if (this.data.step < STEPS.length - 1) {
      this.setData({ step: this.data.step + 1 }, () => {
        this.afterStepChange();
      });
    }
  },

  prev() {
    if (this.data.step > 0) {
      this.setData({ step: this.data.step - 1 }, () => {
        this.afterStepChange();
      });
    }
  },

  afterStepChange() {
    const step = this.data.step;
    if (step === 3) {
      wx.nextTick(() => this.initCanvasById('diy-preview'));
    } else if (step === 4) {
      wx.nextTick(() => this.initCanvasById('dye-preview'));
    } else if (step === 5) {
      wx.nextTick(() => this.initCanvasById('oxi-preview'));
    } else if (step === 6) {
      wx.nextTick(() => this.initCanvasById('untie-preview'));
    } else if (step === 2) {
      wx.nextTick(() => this.renderPatternThumbs());
    }
  },

  renderPatternThumbs() {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    engine.PATTERN_CATALOG.forEach(p => {
      wx.createSelectorQuery().select('#pat-' + p.id).fields({ node: true, size: true }).exec(res => {
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
          tightness: 0.45,
          whitespace: 0.35,
          rotation: 0,
          dyeName: '板蓝根',
          concentration: 0.65,
          seed: 42
        });
      });
    });
  },

  saveWork() {
    const { patternId, params, fabric, dyeName, concentration, oxidationTime, untieMethod, mood } = this.data;
    const pattern = engine.getPatternById(patternId);
    const work = {
      id: 'diy_' + Date.now(),
      title: pattern.name + ' · ' + FABRICS.find(f => f.id === fabric).name,
      patternId,
      params: { ...params },
      fabric,
      dyeName,
      concentration,
      oxidationTime,
      untieMethod,
      mood,
      source: 'diy',
      createdAt: new Date().toISOString()
    };
    // 生成缩略图
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: (res) => {
        work.thumb = res.tempFilePath;
        let works = wx.getStorageSync('ranxin_works') || [];
        works.unshift(work);
        wx.setStorageSync('ranxin_works', works);
        // 同时解锁纹样
        this.unlockPattern(patternId);
        api.saveWork(work).then(() => {
          wx.showToast({ title: '作品已保存', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1200);
        });
      }
    });
  },

  unlockPattern(id) {
    let unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      wx.setStorageSync('ranxin_unlocked_patterns', unlocked);
    }
  }
});
