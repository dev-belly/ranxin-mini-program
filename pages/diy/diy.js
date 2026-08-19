// 归属：B｜核心交互 Owner（按 A 设计稿：2.1选布料 / 2.2选择纹样 / 2.3diy扎染）
const engine = require('../../utils/pattern-engine.js');
const api = require('../../utils/api.js');

const STEPS = ['选布料', '选纹样', '扎结', '入染', '氧化', '拆结'];

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
    '没有“错”的花纹——只有你的花纹。',
    '拆开褶皱，让惊喜绽放。'
  ]
};

const FABRICS = [
  { id: 'bag', name: '帆布袋', tag: '挺括', desc: '纹样边缘更清晰' },
  { id: 'scarf', name: '方巾', tag: '轻柔', desc: '颜色扩散自然' },
  { id: 'pillow', name: '抱枕', tag: '柔软', desc: '适合大面积纹样' }
];

// 每个纹样对应的代表染液（用于生成缩略图与配色）
const PATTERN_DYE = {
  hudie: '紫草', tuan: '板蓝根', shui: '靛青', cang: '板蓝根', ling: '板蓝根', he: '靛青'
};

const CATS = ['全部', '白族传统', '自然', '几何'];

Page({
  data: {
    stage: 'mood',        // mood → fabric → pattern → craft → result
    steps: STEPS,
    step: 0,
    stepperActive: 0,
    // 扎结阶段子标签：结构/对称/松紧/留白/旋转
    diyTab: '结构',
    diyTabs: ['结构', '对称', '松紧', '留白', '旋转'],
    // 更丰富的扎染参数
    whitespace: 35,
    rotation: 0,
    // 入染方式
    dyeMethod: '整体浸染',
    dyeMethods: [
      { id: 'full', name: '整体浸染', desc: '将布料完全浸入染液中，适合基础图案', recommend: false },
      { id: 'local', name: '局部入染', desc: '仅浸入局部区域，适合创造层次效果', recommend: true },
      { id: 'drop', name: '点滴滴落', desc: '适合创造自然随性的纹样效果', recommend: false }
    ],
    // 氧化时长（分钟）
    oxidationMinutes: 3,
    // 拆结方式
    unfoldMethod: 'hand',
    moods: MOODS,
    mood: 'quiet',
    fabrics: FABRICS,
    fabric: 'scarf',
    cats: CATS,
    catFilter: '全部',
    patterns: [],          // 由引擎目录构建，含 dye / tint / thumb
    visiblePatterns: [],
    patternId: 'tuan',
    selPattern: null,
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
    quote: '',
    soundOn: false,
    soundHint: '白噪音：洱海水声、扎花布料声、苍山风声',
    showResult: false,
    showStory: false,
    storyPattern: null,
    liveChanging: false,
    mindfulNote: '',
    result: null,
    reviewMode: false,
    reviewPhase: '',
    reviewProgress: 0
  },

  onLoad() {
    const patterns = engine.PATTERN_CATALOG.map(p => {
      const dye = PATTERN_DYE[p.id] || '板蓝根';
      return {
        id: p.id, name: p.name, desc: p.tags, cat: p.cat, story: p.story,
        dye,
        thumb: '/assets/patterns/' + p.id + '.png',
        tint: engine.getDyeColor(dye).main
      };
    });
    this.setData({ patterns, quote: this.randomQuote(0) }, () => {
      this.updateVisible();
      const init = patterns.find(p => p.id === this.data.patternId) || patterns[0];
      this.setData({ selPattern: init });
    });
    const prefill = wx.getStorageSync('ranxin_diy_prefill');
    if (prefill && engine.getPatternById(prefill)) {
      this.setData({ patternId: prefill });
      wx.removeStorageSync('ranxin_diy_prefill');
    }
  },

  onReady() {
    this.genThumbs();
    if (this.data.stage === 'craft') {
      wx.nextTick(() => this.initCanvasById('diy-canvas'));
    }
  },

  onUnload() {
    this.stopOxidation();
    if (this.reviewTimer) { clearInterval(this.reviewTimer); this.reviewTimer = null; }
    if (this._live) clearTimeout(this._live);
    if (this.audioCtx) { this.audioCtx.destroy(); this.audioCtx = null; }
  },

  randomQuote(stepIdx) {
    const list = QUOTES[stepIdx] || QUOTES[0];
    return list[Math.floor(Math.random() * list.length)];
  },

  updateVisible() {
    const { patterns, catFilter } = this.data;
    const visible = catFilter === '全部' ? patterns : patterns.filter(p => p.cat === catFilter);
    this.setData({ visiblePatterns: visible });
  },

  setCat(e) {
    this.setData({ catFilter: e.currentTarget.dataset.cat }, () => this.updateVisible());
  },

  openStory(e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.patterns.find(x => x.id === id);
    if (p) this.setData({ showStory: true, storyPattern: p });
  },
  closeStory() {
    this.setData({ showStory: false, storyPattern: null });
  },
  noop() {},

  // 运行时用引擎为每个纹样生成真实扎染缩略图（即使缺素材图也好看）
  genThumbs() {
    const q = wx.createSelectorQuery();
    q.select('#thumb-canvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      canvas.width = 220; canvas.height = 220;
      const ctx = canvas.getContext('2d');
      const list = this.data.patterns;
      const drawOne = (i) => {
        if (i >= list.length) return;
        const p = list[i];
        ctx.clearRect(0, 0, 220, 220);
        engine.renderTieDye(ctx, 220, 220, {
          type: p.type || 'radial', petals: p.petals || 8, tightness: 0.62,
          whitespace: 0.4, rotation: 0, dyeName: p.dye, concentration: 0.72, seed: 42
        });
        wx.canvasToTempFilePath({
          canvas, x: 0, y: 0, width: 220, height: 220, destWidth: 220, destHeight: 220,
          success: r => {
            const patterns = this.data.patterns.slice();
            const idx = patterns.findIndex(x => x.id === p.id);
            if (idx >= 0) patterns[idx] = Object.assign({}, patterns[idx], { thumb: r.tempFilePath });
            this.setData({ patterns }, () => { this.updateVisible(); drawOne(i + 1); });
          },
          fail: () => drawOne(i + 1)
        });
      };
      drawOne(0);
    });
  },

  // —— 前置流程：状态 / 布料 / 纹样 ——
  chooseMood(e) {
    this.setData({ mood: e.currentTarget.dataset.id, stepperActive: 0 }, () => {
      this.setData({ stage: 'fabric' });
    });
  },
  chooseFabric(e) {
    this.setData({ fabric: e.currentTarget.dataset.id, stepperActive: 1 }, () => {
      this.setData({ stage: 'pattern' });
    });
  },
  choosePattern(e) {
    const id = e.currentTarget.dataset.id;
    const sp = this.data.patterns.find(p => p.id === id);
    this.setData({ patternId: id, selPattern: sp, showStory: false, stage: 'craft', step: 0, stepperActive: 2, quote: this.randomQuote(0) }, () => {
      wx.nextTick(() => this.initCanvasById('diy-canvas'));
    });
  },

  initCanvasById(id) {
    const query = wx.createSelectorQuery();
    query.select('#' + id).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
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

  drawCurrent(ctx, w, h) {
    ctx = ctx || this.ctx;
    if (!ctx) return;
    const { step, patternId, foldType, tightness, dyeName, concentration, oxidationSeconds, oxidationTotal, unfoldProgress, whitespace, rotation } = this.data;
    const pattern = engine.getPatternById(patternId);
    if (w == null) w = this.canvasW;
    if (h == null) h = this.canvasH;
    const engineTightness = 0.25 + (tightness / 5) * 0.65;
    const engineConc = concentration / 100;
    const engineWhitespace = Math.max(0.1, Math.min(0.9, whitespace / 100));
    const engineRotation = rotation;

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
        whitespace: engineWhitespace,
        rotation: engineRotation,
        dyeName,
        concentration: engineConc,
        progress: unfoldProgress / 100,
        seed: 42
      });
    }
  },

  // 滑块/选项变动时的“实时变化”高亮（对齐 A .live-changing 玻璃辉光）
  flashLive() {
    this.setData({ liveChanging: true });
    if (this._live) clearTimeout(this._live);
    this._live = setTimeout(() => this.setData({ liveChanging: false }), 260);
  },

  afterStepChange() {
    const step = this.data.step;
    this.setData({ quote: this.randomQuote(step) });
    wx.nextTick(() => this.initCanvasById('diy-canvas'));
    if (step === 2) {
      const oxidationTotal = Math.max(30, this.data.oxidationMinutes * 60);
      this.setData({ oxidationTotal });
      if (!this.data.oxidationDone && this.data.oxidationSeconds === 0) {
        this.startOxidation();
      }
    }
    if (step !== 2) {
      this.stopOxidation();
    }
  },

  // Step 0: 扎
  switchDiyTab(e) { this.setData({ diyTab: e.currentTarget.dataset.tab }); },
  chooseFold(e) {
    this.setData({ foldType: e.currentTarget.dataset.id }, () => { this.flashLive(); this.drawCurrent(); });
  },
  onTightnessChange(e) {
    this.setData({ tightness: e.detail.value }, () => { this.flashLive(); this.drawCurrent(); });
  },
  onWhitespaceChange(e) {
    this.setData({ whitespace: e.detail.value }, () => { this.flashLive(); this.drawCurrent(); });
  },
  onRotationChange(e) {
    this.setData({ rotation: e.detail.value }, () => { this.flashLive(); this.drawCurrent(); });
  },

  // Step 1: 染
  chooseDye(e) {
    this.setData({ dyeName: e.currentTarget.dataset.name }, () => { this.flashLive(); this.drawCurrent(); });
  },
  chooseDyeMethod(e) {
    this.setData({ dyeMethod: e.currentTarget.dataset.id });
  },
  onConcentrationChange(e) {
    this.setData({ concentration: e.detail.value }, () => { this.flashLive(); this.drawCurrent(); });
  },

  // Step 2: 等（氧化）
  onOxidationMinutesChange(e) {
    const val = e.detail && typeof e.detail.value === 'number' ? e.detail.value : Number(e.currentTarget.dataset.value);
    const minutes = Math.max(1, Math.min(5, val));
    this.setData({ oxidationMinutes: minutes, oxidationTotal: minutes * 60 });
  },
  startOxidation() {
    if (this.oxiTimer) return;
    this.setData({ oxidizing: true });
    this.oxiTimer = setInterval(() => {
      let s = this.data.oxidationSeconds + 1;
      if (s > this.data.oxidationTotal) s = this.data.oxidationTotal;
      const done = s >= this.data.oxidationTotal;
      this.setData({ oxidationSeconds: s, oxidationDone: done, oxidizing: !done }, () => {
        this.drawCurrent();
        if (this.data.soundOn && s % 4 === 0) wx.vibrateShort({ type: 'light' });
      });
      if (done) this.stopOxidation();
    }, 1000);
  },
  stopOxidation() {
    if (this.oxiTimer) { clearInterval(this.oxiTimer); this.oxiTimer = null; }
    this.setData({ oxidizing: false });
  },

  toggleSound() {
    const soundOn = !this.data.soundOn;
    this.setData({ soundOn });
    if (soundOn) {
      if (!this.audioCtx) {
        this.audioCtx = wx.createInnerAudioContext();
        this.audioCtx.src = '/assets/audio/ambient.mp3';
        this.audioCtx.loop = true;
        this.audioCtx.onError(() => {
          wx.showToast({ title: '白噪音资源待补充', icon: 'none' });
          this.setData({ soundOn: false });
        });
      }
      this.audioCtx.play();
    } else if (this.audioCtx) {
      this.audioCtx.pause();
    }
  },

  // Step 3: 拆
  chooseUnfoldMethod(e) {
    this.setData({ unfoldMethod: e.currentTarget.dataset.id });
  },
  onUnfoldChange(e) {
    this.setData({ unfoldProgress: e.detail.value }, () => { this.flashLive(); this.drawCurrent(); });
  },

  // 扎染等拆导航
  next() {
    if (this.data.step < 3) {
      const step = this.data.step + 1;
      this.setData({ step, stepperActive: step + 2 }, () => this.afterStepChange());
    }
  },
  prev() {
    if (this.data.step > 0) {
      const step = this.data.step - 1;
      this.setData({ step, stepperActive: step + 2 }, () => this.afterStepChange());
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
    const fabricLabel = FABRICS.find(f => f.id === fabric).name;
    const moodLabel = (MOODS.find(m => m.id === mood) || {}).label || '';
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
      fabric: fabricLabel,
      mood: moodLabel,
      mindfulNote,
      source: 'diy',
      createdAt: new Date().toISOString()
    };
    const captureAndPersist = () => {
      this.unlockPattern(patternId);
      api.saveWork(work).then(() => {
        this.setData({ showResult: true, result: work });
      }).catch(() => {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      });
    };
    if (this.canvas) {
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        x: 0, y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
        destWidth: this.canvas.width,
        destHeight: this.canvas.height,
        success: (res) => {
          work.thumb = res.tempFilePath;
          wx.setStorageSync('ranxin_last_pattern_name', pattern.name);
          wx.setStorageSync('ranxin_last_pattern_image', res.tempFilePath);
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

  goToProduct() {
    const r = this.data.result;
    if (r && r.thumb) {
      wx.setStorageSync('ranxin_last_pattern_name', r.patternName);
      wx.setStorageSync('ranxin_last_pattern_image', r.thumb);
    }
    wx.navigateTo({ url: '/pages/product/product' });
  },

  // 分享海报（对齐 A：1.1分享海报）
  makePoster() {
    const r = this.data.result;
    if (!r) return;
    const query = wx.createSelectorQuery();
    query.select('#diy-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !this.canvas) { wx.showToast({ title: '海报生成失败', icon: 'none' }); return; }
      const W = 320, H = 440;
      const canvas = this.canvas;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fbfdff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#153e7f'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('染心 · 我的扎染', W / 2, 48);
      this.drawCurrent(ctx, W, H);
      ctx.fillStyle = '#153e7f'; ctx.font = '18px sans-serif';
      ctx.fillText(r.patternName + ' · ' + r.fabric, W / 2, H - 64);
      ctx.fillStyle = '#59709e'; ctx.font = '14px sans-serif';
      const note = (r.mindfulNote || r.story).slice(0, 20);
      ctx.fillText(note, W / 2, H - 36);
      wx.canvasToTempFilePath({
        canvas,
        x: 0, y: 0, width: W, height: H,
        destWidth: W, destHeight: H,
        success: (res2) => {
          wx.saveImageToPhotosAlbum({
            filePath: res2.tempFilePath,
            success: () => wx.showToast({ title: '已存到相册', icon: 'success' }),
            fail: () => wx.showToast({ title: '请授权相册', icon: 'none' })
          });
        }
      });
    });
  },

  // 15 秒创作回溯：canvas 复现 扎→染→等→拆
  startReview() {
    if (!this.data.result) return;
    this.setData({ reviewMode: true, reviewProgress: 0, reviewPhase: '扎', showResult: false }, () => {
      wx.nextTick(() => this.initReviewCanvas());
    });
  },
  initReviewCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#review-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const { width, height } = res[0];
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      this.rcanvas = canvas; this.rcanvasW = width; this.rcanvasH = height;
      this.rctx = canvas.getContext('2d'); this.rctx.scale(dpr, dpr);
      this.runReview();
    });
  },
  runReview() {
    if (this.reviewTimer) clearInterval(this.reviewTimer);
    const totalMs = 15000, tick = 100;
    let elapsed = 0;
    this.reviewTimer = setInterval(() => {
      elapsed += tick;
      const p = Math.min(100, Math.round(elapsed / totalMs * 100));
      this.applyReview(p);
      if (p >= 100) { clearInterval(this.reviewTimer); this.reviewTimer = null; }
    }, tick);
  },
  applyReview(p) {
    let step, oxidationSeconds = 0, unfoldProgress = 0, phase = '扎';
    if (p < 25) { step = 0; phase = '扎'; }
    else if (p < 50) { step = 1; phase = '染'; }
    else if (p < 75) { step = 2; oxidationSeconds = Math.round((p - 50) / 25 * 30); phase = '等'; }
    else { step = 3; unfoldProgress = Math.round((p - 75) / 25 * 100); phase = '拆'; }
    this.setData({ step, oxidationSeconds, unfoldProgress, reviewPhase: phase, reviewProgress: p, quote: (QUOTES[step] || QUOTES[0])[0] }, () => {
      this.drawCurrent(this.rctx, this.rcanvasW, this.rcanvasH);
    });
  },
  exitReview() {
    if (this.reviewTimer) { clearInterval(this.reviewTimer); this.reviewTimer = null; }
    this.setData({
      reviewMode: false, reviewProgress: 0, reviewPhase: '',
      step: 3, oxidationSeconds: 30, oxidationDone: true, unfoldProgress: 100, showResult: true
    });
  },

  replay() {
    this.setData({
      stage: 'mood', step: 0, stepperActive: 0,
      oxidationSeconds: 0, oxidationDone: false, oxidationMinutes: 3,
      unfoldProgress: 0, showResult: false, mindfulNote: '',
      diyTab: '结构', whitespace: 35, rotation: 0,
      dyeMethod: '整体浸染', unfoldMethod: 'hand',
      quote: this.randomQuote(0)
    }, () => {
      this.stopOxidation();
    });
  }
});
