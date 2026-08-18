// 归属：B｜核心交互 Owner
// 正念 DIY 工坊：扎 → 染 → 等（氧化） → 拆（展开）
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');

const STEPS = ['扎', '染', '等', '拆'];

const FOLD_TYPES = [
  { id: 'symmetric', name: '对称折叠', desc: '规整图案，秩序之美' },
  { id: 'fan', name: '扇形折叠', desc: '放射纹路，如扇轻展' },
  { id: 'random', name: '随机折叠', desc: '不可预测的自然肌理' }
];

const DYES = [
  { label: '板蓝根靛蓝', name: '板蓝根', desc: '大理白族经典靛蓝', color: '#1E4D8C' },
  { label: '姜黄', name: '栀子黄', desc: '温暖明亮的植物黄', color: '#D99E2B' },
  { label: '茜草红', name: '茜草', desc: '取自茜草的赤红', color: '#B83B3B' }
];

const MOODS = [
  { id: 'anxious', label: '有点焦躁', pattern: 'shui' },
  { id: 'tired', label: '有些疲惫', pattern: 'cang' },
  { id: 'messy', label: '脑子很乱', pattern: 'ling' },
  { id: 'quiet', label: '需要安静', pattern: 'tuan' },
  { id: 'calm', label: '很平静', pattern: 'he' },
  { id: 'good', label: '今天不错', pattern: 'hudie' }
];

const QUOTES = {
  0: [
    '此刻，只关注你手里的线与布。',
    '这一针的力度，决定了布的未来。',
    '扎得越紧，留白的边界越清晰。'
  ],
  1: [
    '你已做了你能做的，剩下的，交给缸。',
    '急也没有用——它有自己的节奏。',
    '染料会找到它该去的地方。'
  ],
  2: [
    '有些变化，看不见，但正在发生。',
    '30秒，在数字时代，这可能是你唯一主动选择的等待。',
    '空气正在替你把颜色固定下来。'
  ],
  3: [
    '无论你看到什么——它都是唯一的那一块。',
    '没有"错"的花纹——只有你的花纹。',
    '拆开褶皱，让惊喜绽放。'
  ]
};

const FABRICS = [
  { id: 'bag', name: '帆布袋' },
  { id: 'scarf', name: '方巾' },
  { id: 'pillow', name: '抱枕' },
  { id: 'mat', name: '茶席' }
];

Page({
  data: {
    steps: STEPS,
    step: 0,
    foldTypes: FOLD_TYPES,
    foldType: 'symmetric',
    tightness: 3,
    dyes: DYES,
    dyeName: '板蓝根',
    concentration: 70,
    oxidationSeconds: 0,
    oxidationTotal: 30,
    oxidizing: false,
    oxidationDone: false,
    unfoldProgress: 0,
    patternId: 'tuan',
    fabric: 'scarf',
    fabrics: FABRICS,
    moods: MOODS,
    mood: 'quiet',
    quote: '',
    soundOn: false,
    soundHint: '白噪音：洱海水声、扎花布料声、苍山风声',
    showResult: false,
    mindfulNote: '',
    result: null
  },

  onLoad() {
    const quote = this.randomQuote(0);
    this.setData({ quote });
    // 接受「情绪测试」页推荐的预填纹样
    const prefill = wx.getStorageSync('ranxin_diy_prefill');
    if (prefill && engine.getPatternById(prefill)) {
      this.setData({ patternId: prefill });
      wx.removeStorageSync('ranxin_diy_prefill');
    }
  },

  onReady() {
    wx.nextTick(() => this.initCanvasById('diy-canvas'));
  },

  onUnload() {
    this.stopOxidation();
  },

  randomQuote(stepIdx) {
    const list = QUOTES[stepIdx] || QUOTES[0];
    return list[Math.floor(Math.random() * list.length)];
  },

  initCanvasById(id) {
    const query = wx.createSelectorQuery();
    query.select('#' + id).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
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
      this.drawCurrent();
    });
  },

  drawCurrent() {
    if (!this.ctx) return;
    const { step, patternId, foldType, tightness, dyeName, concentration, oxidationSeconds, oxidationTotal, unfoldProgress } = this.data;
    const pattern = engine.getPatternById(patternId);
    const w = this.canvasW, h = this.canvasH;
    const engineTightness = 0.25 + (tightness / 5) * 0.65;
    const engineConc = concentration / 100;

    if (step === 0) {
      engine.renderFoldedFabric(this.ctx, w, h, { foldType, tightness });
    } else if (step === 1) {
      engine.renderDyeBath(this.ctx, w, h, { dyeName, concentration: engineConc });
    } else if (step === 2) {
      engine.renderOxidation(this.ctx, w, h, { dyeName, concentration: engineConc, progress: oxidationSeconds / oxidationTotal });
    } else if (step === 3) {
      engine.renderUnfold(this.ctx, w, h, {
        type: pattern.type,
        petals: pattern.petals,
        tightness: engineTightness,
        whitespace: 0.35,
        rotation: 0,
        dyeName,
        concentration: engineConc,
        progress: unfoldProgress / 100,
        seed: 42
      });
    }
  },

  afterStepChange() {
    const step = this.data.step;
    this.setData({ quote: this.randomQuote(step) });
    wx.nextTick(() => this.initCanvasById('diy-canvas'));
    if (step === 2 && !this.data.oxidationDone && this.data.oxidationSeconds === 0) {
      this.startOxidation();
    }
    if (step !== 2) {
      this.stopOxidation();
    }
  },

  // Step 0: 扎
  chooseFold(e) {
    this.setData({ foldType: e.currentTarget.dataset.id }, () => this.drawCurrent());
  },

  onTightnessChange(e) {
    this.setData({ tightness: e.detail.value }, () => this.drawCurrent());
  },

  // Step 1: 染
  chooseDye(e) {
    this.setData({ dyeName: e.currentTarget.dataset.name }, () => this.drawCurrent());
  },

  onConcentrationChange(e) {
    this.setData({ concentration: e.detail.value }, () => this.drawCurrent());
  },

  // Step 2: 等（氧化）
  startOxidation() {
    if (this.oxiTimer) return;
    this.setData({ oxidizing: true });
    this.oxiTimer = setInterval(() => {
      let s = this.data.oxidationSeconds + 1;
      if (s > this.data.oxidationTotal) s = this.data.oxidationTotal;
      const done = s >= this.data.oxidationTotal;
      this.setData({ oxidationSeconds: s, oxidationDone: done, oxidizing: !done }, () => {
        this.drawCurrent();
        if (this.data.soundOn && s % 4 === 0) {
          wx.vibrateShort({ type: 'light' });
        }
      });
      if (done) this.stopOxidation();
    }, 1000);
  },

  stopOxidation() {
    if (this.oxiTimer) {
      clearInterval(this.oxiTimer);
      this.oxiTimer = null;
    }
    this.setData({ oxidizing: false });
  },

  toggleSound() {
    const soundOn = !this.data.soundOn;
    this.setData({ soundOn });
    if (soundOn) {
      // 音频资源待补充：此处仅做触觉/视觉反馈
      wx.showToast({ title: '白噪音资源待补充', icon: 'none' });
    }
  },

  // Step 3: 拆
  onUnfoldChange(e) {
    this.setData({ unfoldProgress: e.detail.value }, () => this.drawCurrent());
  },

  // 导航
  next() {
    if (this.data.step < STEPS.length - 1) {
      this.setData({ step: this.data.step + 1 }, () => this.afterStepChange());
    }
  },

  prev() {
    if (this.data.step > 0) {
      this.setData({ step: this.data.step - 1 }, () => this.afterStepChange());
    }
  },

  // 保存
  saveWork() {
    if (this.data.unfoldProgress < 80) {
      wx.showToast({ title: '再展开一点，让纹样完全呈现', icon: 'none' });
      return;
    }
    const { patternId, dyeName, concentration, foldType, tightness, fabric, mood, mindfulNote } = this.data;
    const pattern = engine.getPatternById(patternId);
    const foldLabel = FOLD_TYPES.find(f => f.id === foldType).name;
    const work = {
      workId: 'work_' + Date.now(),
      title: pattern.name + ' · ' + foldLabel,
      patternName: pattern.name,
      story: pattern.story,
      patternId,
      dyeName,
      concentration,
      foldType,
      tightness,
      fabric,
      mood,
      mindfulNote,
      source: 'diy',
      createdAt: new Date().toISOString()
    };
    const captureAndPersist = () => {
      this.unlockPattern(patternId);
      api.saveWork(work).then(() => {
        this.setData({
          showResult: true,
          result: work
        });
      }).catch(() => {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      });
    };
    if (this.canvas) {
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: (res) => {
          work.thumb = res.tempFilePath;
          captureAndPersist();
        },
        fail: () => captureAndPersist()
      });
    } else {
      captureAndPersist();
    }
  },

  onMindfulNoteInput(e) {
    this.setData({ mindfulNote: e.detail.value });
  },

  unlockPattern(id) {
    let unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      wx.setStorageSync('ranxin_unlocked_patterns', unlocked);
    }
  },

  closeResult() {
    this.setData({ showResult: false });
    wx.switchTab({ url: '/pages/works/works' });
  },

  replay() {
    this.setData({
      step: 0,
      oxidationSeconds: 0,
      oxidationDone: false,
      unfoldProgress: 0,
      showResult: false,
      mindfulNote: '',
      quote: this.randomQuote(0)
    }, () => {
      this.stopOxidation();
      this.afterStepChange();
    });
  }
});
