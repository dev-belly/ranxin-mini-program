// 染心 DIY 六阶段流程控制器。
// 页面视觉由 flow.wxml / flow.wxss 负责；本文件只维护状态、交互、草稿与数据交接。
const engine = require('../../../utils/pattern-engine.js');
const api = require('../../../utils/api.js');

const DRAFT_KEY = 'ranxin_diy_draft';
const PREFILL_KEY = 'ranxin_diy_prefill';
const WORKS_KEY = 'ranxin_works';
const DRAFT_VERSION = 2;
const MAX_LOCAL_WORKS = 24;
const PATTERNS_PER_PAGE = 6;
const MIN_NODE_RADIUS = 118;
const MAX_NODE_RADIUS = 285;
const CRAFT_COORD_SIZE = 630;
const CRAFT_CENTER = CRAFT_COORD_SIZE / 2;
const FINAL_THUMB = '/packageDiy/assets/unfold-final.jpg';
// 主包页面冷启动时不能依赖 DIY 分包已经加载，成品保存前会复制到持久文件目录。
// 文件名含当前资源摘要前缀；以后替换成品图时不会误复用旧缓存。
const PERSISTENT_FINAL_FILE = 'ranxin-diy-final-cfbe764f6582.jpg';

const STAGES = [
  { id: 'fabric', label: '选布料', title: '选择布料' },
  { id: 'pattern', label: '选纹样', title: '选择纹样' },
  { id: 'craft', label: '纹样DIY', title: '纹样 DIY' },
  { id: 'dye', label: '入染', title: '入染' },
  { id: 'oxidation', label: '氧化', title: '氧化' },
  { id: 'unfold', label: '拆结', title: '拆结' }
];

const FABRICS = [
  { id: 'bag', name: '帆布袋', tag: '挺括', desc: '纹样边缘更清晰', thumb: '/assets/patterns/bag.png' },
  { id: 'scarf', name: '方巾', tag: '轻柔', desc: '颜色扩散自然', thumb: '/assets/patterns/scarf.png' },
  { id: 'pillow', name: '抱枕', tag: '柔软', desc: '适合大面积纹样', thumb: '/assets/patterns/pillow.png' }
];

// 前八枚随 DIY 默认开放；后四枚仅接受 ranxin_unlocked_patterns 的真实解锁记录。
const PATTERN_DEFS = [
  { id: 'shui', name: '水波纹', category: '自然', type: 'wave', desc: '自然 · 流动', story: '连续折叠与扎结会形成自然流线，象征流动、松弛与不过度控制。' },
  { id: 'hudie', name: '蝴蝶纹', category: '白族传统', type: 'butterfly', desc: '轻盈 · 新生', story: '以对称扎结形成展开的蝶翼，寓意轻盈、变化与新生。' },
  { id: 'tuan', name: '团花纹', category: '白族传统', type: 'radial', desc: '圆满 · 聚合', story: '由中心向外反复扎结形成团花，寓意团圆、聚合与内在完整。' },
  { id: 'ling', name: '菱形纹', category: '几何', type: 'diamond', desc: '秩序 · 稳定', story: '规则折叠让染色沿几何轴线展开，象征秩序、稳定与清晰边界。' },
  { id: 'cang', name: '苍山纹', category: '自然', type: 'mountain', desc: '层叠 · 坚定', story: '层层折叠与留白塑造远山起伏，寓意坚定、沉静和向上生长。' },
  { id: 'heling', name: '鹤翎纹', category: '白族传统', type: 'vine', desc: '舒展 · 自由', story: '由中心向外放射的扎染纹理像展开的鹤羽，寓意舒展、自由与轻盈呼吸。' },
  { id: 'lianyi', name: '涟漪纹', category: '自然', type: 'wave', desc: '轻荡 · 回响', story: '旋转折叠让水波般的纹理向外扩散，寓意回应、柔韧与继续前行。' },
  { id: 'xuelun', name: '雪轮纹', category: '几何', type: 'radial', desc: '纯净 · 开展', story: '由团花结构继续旋转展开，像雪轮向外舒展，寓意清透与新的开始。' },
  { id: 'dieying', name: '蝶影纹', category: '白族传统', type: 'butterfly', desc: '蜕变 · 轻盈', story: '蝶翼的叠影记录蜕变与轻盈，等待你在后续体验中解锁。' },
  { id: 'xingling', name: '星菱纹', category: '几何', type: 'diamond', desc: '清晰 · 守序', story: '星芒与菱格彼此呼应，象征清晰、秩序和稳定边界。' },
  { id: 'yuguang', name: '羽光纹', category: '自然', type: 'vine', desc: '舒展 · 远行', story: '羽毛般的光纹向外舒展，寓意自由呼吸与勇敢远行。' },
  { id: 'dieling', name: '叠岭纹', category: '自然', type: 'mountain', desc: '沉静 · 坚韧', story: '层叠山岭在留白中显现，象征沉静、坚韧和持续生长。' }
].map((item, index) => Object.assign({}, item, {
  thumb: '/packageDiy/assets/pattern-' + item.id + '.jpg',
  defaultUnlocked: index < 8
}));

const PATTERN_IDS = PATTERN_DEFS.map(item => item.id);
const DEFAULT_UNLOCKED_IDS = PATTERN_DEFS.slice(0, 8).map(item => item.id);
const PATTERN_CATEGORIES = ['为你推荐', '自然', '几何', '白族传统'];

// A 稿的五组精确主色。
const DYES = [
  { id: 'banlangen', name: '板蓝根', color: '#244b9c', desc: '大理白族经典靛蓝' },
  { id: 'dianqing', name: '靛青', color: '#1f5fb5', desc: '深邃沉稳的靛蓝' },
  { id: 'zicao', name: '紫草', color: '#7c3295', desc: '温润柔和的草木紫' },
  { id: 'qiancao', name: '茜草', color: '#c83d32', desc: '明暖有力的草木红' },
  { id: 'zhizihuang', name: '栀子黄', color: '#e6a20e', desc: '清亮温暖的植物黄' }
];

const DYE_METHODS = [
  { id: 'full', name: '整体浸染', desc: '将布料完全浸入染液中，适合基础图案' },
  { id: 'local', name: '局部入染', desc: '只浸入局部区域，形成自然层次' },
  { id: 'drop', name: '点染滴落', desc: '让染液自由滴落，形成随性肌理' }
];

const UNFOLD_METHODS = [
  {
    id: 'hand',
    name: '手工拆结',
    desc: '轻柔拆解，保留细节',
    note: '手工拆结更温和，适合保留纹样细节。',
    videoTitle: '手工拆结演示',
    videoCaption: '轻柔沿结扣方向松开，尽量保留纹样细节。',
    video: '/packageDiy/assets/unfold-hand.mp4'
  },
  {
    id: 'scissor',
    name: '剪刀辅助',
    desc: '更快速，适合较紧结扣',
    note: '剪刀辅助更快速，适合处理较紧的结扣。',
    videoTitle: '剪刀拆结演示',
    videoCaption: '针对较紧结扣，用剪刀辅助剪开束缚，再缓慢展开布料。',
    video: '/packageDiy/assets/unfold-scissor.mp4'
  }
];

const DEFAULT_RADII = Array(8).fill(208);
const DEFAULT_CRAFT = {
  symmetry: 8,
  tightness: 80,
  whitespace: 58,
  rotation: 15,
  radii: DEFAULT_RADII
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRotation(value) {
  let next = Number(value) || 0;
  next = ((next + 180) % 360 + 360) % 360 - 180;
  return Math.round(next * 10) / 10;
}

// 参考 HTML 用 1–5 分钟表达氧化深度，实际等待进度映射到演示视频时长。
const OXIDATION_CLOCK_GRACE_MS = 18;

function formatSeconds(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function eventValue(event, fallback) {
  if (event && event.detail && event.detail.value !== undefined) return Number(event.detail.value);
  const dataset = event && event.currentTarget && event.currentTarget.dataset;
  if (dataset) {
    if (dataset.value !== undefined) return Number(dataset.value);
    if (dataset.id !== undefined && !Number.isNaN(Number(dataset.id))) return Number(dataset.id);
  }
  return Number(fallback);
}

function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === undefined || value === null || value === '' ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function safeRemove(key) {
  try { wx.removeStorageSync(key); } catch (error) {}
}

function normalizePatternId(id) {
  return id === 'he' ? 'heling' : id;
}

function emotionLabel(emotion) {
  if (!emotion) return '';
  if (typeof emotion === 'string') return emotion;
  return emotion.label || emotion.name || emotion.text || emotion.id || '';
}

function ensureRadii(count, source) {
  // A 稿始终只有八个可拖动节点；symmetry 只改变生成花瓣数。
  count = 8;
  const current = Array.isArray(source) ? source : [];
  const valid = current.map(value => clamp(value, MIN_NODE_RADIUS, MAX_NODE_RADIUS));
  const fill = valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : 208;
  return Array.from({ length: count }, (_, index) => Math.round(valid[index % Math.max(1, valid.length)] || fill));
}

function craftNodes(symmetry, radii, rotation) {
  const list = ensureRadii(8, radii);
  const count = list.length;
  const base = (Number(rotation) || 0) * Math.PI / 180;
  return list.map((radius, index) => {
    const angle = base + index * Math.PI * 2 / count;
    return {
      index,
      radius,
      angle: angle * 180 / Math.PI,
      x: Math.round((CRAFT_CENTER + Math.cos(angle) * radius) * 10) / 10,
      y: Math.round((CRAFT_CENTER + Math.sin(angle) * radius) * 10) / 10
    };
  });
}

function oxidationVisual(minutes, progress) {
  const minuteRatio = (clamp(minutes, 1, 5) - 1) / 4;
  const videoRatio = clamp(progress || 0, 0, 1);
  const depth = Math.min(1, minuteRatio * 0.72 + videoRatio * 0.42);
  const saturation = 0.78 + depth * 0.54;
  const contrast = 0.88 + depth * 0.36;
  const brightness = 1.09 - depth * 0.19;
  const opacity = 0.80 + depth * 0.20;
  const filter = 'saturate(' + saturation.toFixed(2) + ') contrast(' + contrast.toFixed(2) + ') brightness(' + brightness.toFixed(2) + ')';
  return {
    oxidationPreviewFilter: filter,
    oxidationPreviewOpacity: opacity.toFixed(2),
    oxidationPreviewStyle: 'filter:' + filter + ';opacity:' + opacity.toFixed(2) + ';'
  };
}

Page({
  data: {
    stages: STAGES,
    stage: 'fabric',
    stageIndex: 0,
    stepperActive: 0,
    pageTitle: '选择布料',

    emotion: '',
    emotionLabel: '',
    sessionId: '',

    fabrics: FABRICS,
    selectedFabricId: 'scarf',
    selectedFabric: FABRICS[1],

    patternCategories: PATTERN_CATEGORIES,
    activeCategory: '为你推荐',
    patterns: [],
    patternPage: 0,
    patternPageCount: 2,
    currentPatterns: [],
    visiblePatterns: [],
    canPatternPrev: false,
    canPatternNext: true,
    selectedPatternId: 'shui',
    selectedPattern: null,
    showPatternStory: false,
    storyPattern: null,
    unlockedPatternIds: DEFAULT_UNLOCKED_IDS,

    symmetryOptions: [4, 6, 8, 10, 12, 16],
    guideLines: Array.from({ length: 8 }, (_, index) => ({
      index,
      style: 'transform:rotate(' + (15 + index * 45) + 'deg);'
    })),
    symmetry: 8,
    tightness: 80,
    whitespace: 58,
    rotation: 15,
    radii: DEFAULT_RADII,
    craftNodes: craftNodes(8, DEFAULT_RADII, 15),
    nodePoints: craftNodes(8, DEFAULT_RADII, 15).map(node => Object.assign({}, node, { left: node.x, top: node.y })),
    craftCanvasSize: CRAFT_COORD_SIZE,
    craftCenter: CRAFT_CENTER,
    minNodeRadius: MIN_NODE_RADIUS,
    maxNodeRadius: MAX_NODE_RADIUS,
    canUndo: false,
    canRedo: false,
    showCraftConfirm: false,

    dyes: DYES,
    dyeMethods: DYE_METHODS,
    dyeName: '板蓝根',
    dyeColor: '#244b9c',
    concentration: 60,
    dyeMethod: 'full',
    selectedDye: DYES[0],
    selectedDyeMethod: DYE_METHODS[0],
    showDyeConfirm: false,
    showDyeVideo: false,
    dyeVideoSrc: '/packageDiy/assets/oxidation.mp4',
    dyeVideoTitle: '整体浸染演示',
    dyeVideoCaption: '将布料缓慢浸入染液，让颜色均匀进入纤维。',
    dyeVideoTag: '整体浸染视频',
    dyeVideoPlaying: false,
    dyeVideoError: false,

    oxidationMinutes: 3,
    oxidationProgress: 0,
    oxidationRemainingSeconds: 180,
    oxidationCountdown: '3:00',
    oxidationStatus: '等待开始',
    oxidationStarted: false,
    oxidationRunning: false,
    oxidationPaused: false,
    oxidationDone: false,
    oxidationError: false,
    showOxidationVideo: false,
    oxidationVideoSrc: '/packageDiy/assets/oxidation.mp4',
    colorScale: [0.24, 0.38, 0.52, 0.68, 0.84, 1],
    oxidationPreviewFilter: oxidationVisual(3, 0).oxidationPreviewFilter,
    oxidationPreviewOpacity: oxidationVisual(3, 0).oxidationPreviewOpacity,
    oxidationPreviewStyle: oxidationVisual(3, 0).oxidationPreviewStyle,

    unfoldMethods: UNFOLD_METHODS,
    unfoldMethod: 'hand',
    unfoldMethodNote: UNFOLD_METHODS[0].note,
    showUnfoldVideo: false,
    unfoldVideoSrc: UNFOLD_METHODS[0].video,
    unfoldVideoTitle: UNFOLD_METHODS[0].videoTitle,
    unfoldVideoCaption: UNFOLD_METHODS[0].videoCaption,
    unfoldVideoTag: '手工拆结视频',
    unfoldVideoPlaying: false,
    unfoldVideoEnded: false,
    unfoldVideoError: false,
    finalImage: FINAL_THUMB,

    workSaved: false,
    savedWorkId: '',
    savingPhysical: false
  },

  onLoad() {
    try { wx.hideLoading(); } catch (error) {}
    this._undoStack = [];
    this._redoStack = [];
    this._sliderStarts = {};
    this._canvas = {};
    this._canvasRect = {};
    this._savePromise = null;
    this._savedWork = null;

    const storedUnlocks = safeGet('ranxin_unlocked_patterns', []);
    const extraUnlocks = Array.isArray(storedUnlocks)
      ? storedUnlocks.map(normalizePatternId).filter(id => PATTERN_IDS.indexOf(id) >= 0)
      : [];
    const unlockedPatternIds = Array.from(new Set(DEFAULT_UNLOCKED_IDS.concat(extraUnlocks)));
    const patterns = PATTERN_DEFS.map(item => Object.assign({}, item, {
      unlocked: unlockedPatternIds.indexOf(item.id) >= 0
    }));

    const draft = this._sanitizeDraft(safeGet(DRAFT_KEY, {}));
    const storedEmotion = safeGet('ranxin_current_emotion', draft.emotion || '');
    const currentEmotion = typeof storedEmotion === 'string'
      ? storedEmotion
      : ((storedEmotion && storedEmotion.id) || draft.emotion || '');
    let selectedPatternId = normalizePatternId(draft.selectedPatternId || 'shui');
    if (unlockedPatternIds.indexOf(selectedPatternId) < 0) selectedPatternId = 'shui';

    const prefillRaw = safeGet(PREFILL_KEY, '');
    const prefill = normalizePatternId(typeof prefillRaw === 'string' ? prefillRaw : (prefillRaw && prefillRaw.id));
    if (PATTERN_IDS.indexOf(prefill) >= 0 && unlockedPatternIds.indexOf(prefill) >= 0) {
      selectedPatternId = prefill;
      safeRemove(PREFILL_KEY);
    }

    let stage = STAGES.some(item => item.id === draft.stage) ? draft.stage : 'fabric';
    if (stage === 'unfold' && !draft.oxidationDone) stage = 'oxidation';
    const patternIndex = Math.max(0, PATTERN_IDS.indexOf(selectedPatternId));
    const patternPage = Math.floor(patternIndex / PATTERNS_PER_PAGE);
    const symmetry = [4, 6, 8, 10, 12, 16].indexOf(draft.symmetry) >= 0 ? draft.symmetry : 8;
    const radii = ensureRadii(8, draft.radii || DEFAULT_RADII);
    const oxidationMinutes = clamp(draft.oxidationMinutes || 3, 1, 5);
    const oxidationDone = Boolean(draft.oxidationDone);
    const unfoldMethod = UNFOLD_METHODS.some(item => item.id === draft.unfoldMethod) ? draft.unfoldMethod : 'hand';
    const savedWork = this._findSavedWork(draft.savedWorkId, draft.sessionId);

    const initial = Object.assign({
      stage,
      emotion: currentEmotion,
      emotionLabel: emotionLabel(currentEmotion),
      sessionId: draft.sessionId || ('diy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      patterns,
      unlockedPatternIds,
      selectedFabricId: FABRICS.some(item => item.id === draft.selectedFabricId) ? draft.selectedFabricId : 'scarf',
      selectedPatternId,
      patternPage,
      activeCategory: PATTERN_CATEGORIES.indexOf(draft.activeCategory) >= 0 ? draft.activeCategory : '为你推荐',
      symmetry,
      tightness: clamp(draft.tightness === undefined ? 80 : draft.tightness, 0, 100),
      whitespace: clamp(draft.whitespace === undefined ? 58 : draft.whitespace, 0, 100),
      rotation: normalizeRotation(draft.rotation === undefined ? 15 : draft.rotation),
      radii,
      dyeName: DYES.some(item => item.name === draft.dyeName) ? draft.dyeName : '板蓝根',
      concentration: clamp(draft.concentration === undefined ? 60 : draft.concentration, 10, 100),
      dyeMethod: DYE_METHODS.some(item => item.id === draft.dyeMethod) ? draft.dyeMethod : 'full',
      oxidationMinutes,
      oxidationProgress: oxidationDone ? 100 : 0,
      oxidationRemainingSeconds: oxidationDone ? 0 : oxidationMinutes * 60,
      oxidationCountdown: oxidationDone ? '0:00' : formatSeconds(oxidationMinutes * 60),
      oxidationStatus: oxidationDone ? '氧化完成' : '等待开始',
      oxidationStarted: oxidationDone,
      oxidationRunning: false,
      oxidationPaused: false,
      oxidationDone,
      unfoldMethod,
      finalImage: draft.finalImage || FINAL_THUMB,
      workSaved: Boolean(savedWork),
      savedWorkId: savedWork ? savedWork.workId : (draft.savedWorkId || '')
    }, oxidationVisual(oxidationMinutes, oxidationDone ? 1 : 0));
    Object.assign(initial, this._derived(initial));

    this._savedWork = savedWork || null;
    this.setData(initial, () => {
      this._persistDraft();
      this._renderForStage();
    });
  },

  onReady() {
    this._renderForStage();
  },

  onShow() {
    if (this.data.patterns.length) this._refreshUnlocks();
  },

  onUnload() {
    this._clearOxidationFallback();
    this._oxidationDeadline = null;
    this._persistDraft();
    ['dyeDemoVideo', 'oxidationVideo', 'unfoldVideo'].forEach(id => {
      const context = this._videoContext(id);
      if (context && context.pause) {
        try { context.pause(); } catch (error) {}
      }
    });
  },

  _sanitizeDraft(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const craft = raw.craft || raw.diyParams || {};
    const dye = raw.dye || raw.dyeParams || {};
    const oxidation = raw.oxidation || raw.oxidationParams || {};
    const unfold = raw.unfold || raw.unfoldParams || {};
    return {
      version: raw.version,
      stage: raw.stage,
      emotion: raw.emotion || raw.mood,
      sessionId: raw.sessionId || raw.draftId,
      selectedFabricId: raw.selectedFabricId || raw.fabricId || raw.fabric,
      selectedPatternId: raw.selectedPatternId || raw.patternId,
      activeCategory: raw.activeCategory,
      symmetry: raw.symmetry === undefined ? craft.symmetry : raw.symmetry,
      tightness: raw.tightness === undefined ? craft.tightness : raw.tightness,
      whitespace: raw.whitespace === undefined ? craft.whitespace : raw.whitespace,
      rotation: raw.rotation === undefined ? craft.rotation : raw.rotation,
      radii: raw.radii || craft.radii,
      dyeName: raw.dyeName || dye.dyeName,
      concentration: raw.concentration === undefined ? dye.concentration : raw.concentration,
      dyeMethod: raw.dyeMethod || dye.method,
      oxidationMinutes: raw.oxidationMinutes || oxidation.minutes,
      oxidationDone: raw.oxidationDone === undefined ? oxidation.done : raw.oxidationDone,
      unfoldMethod: raw.unfoldMethod || unfold.method,
      finalImage: raw.finalImage,
      savedWorkId: raw.savedWorkId,
      saveAttempted: raw.saveAttempted
    };
  },

  _derived(source) {
    const state = Object.assign({}, this.data || {}, source || {});
    const stageIndex = Math.max(0, STAGES.findIndex(item => item.id === state.stage));
    const selectedPattern = (state.patterns || []).find(item => item.id === state.selectedPatternId) || (state.patterns || [])[0] || null;
    const selectedFabric = FABRICS.find(item => item.id === state.selectedFabricId) || FABRICS[1];
    const selectedDye = DYES.find(item => item.name === state.dyeName) || DYES[0];
    const selectedDyeMethod = DYE_METHODS.find(item => item.id === state.dyeMethod) || DYE_METHODS[0];
    const selectedUnfold = UNFOLD_METHODS.find(item => item.id === state.unfoldMethod) || UNFOLD_METHODS[0];
    const page = clamp(state.patternPage || 0, 0, 1);
    // 分类仅表达当前高亮，不参与卡片过滤；每一页始终稳定展示六枚。
    const currentPatterns = (state.patterns || []).slice(page * PATTERNS_PER_PAGE, (page + 1) * PATTERNS_PER_PAGE);
    const nodes = craftNodes(state.symmetry, state.radii, state.rotation);
    return {
      stageIndex,
      stepperActive: stageIndex,
      pageTitle: STAGES[stageIndex].title,
      selectedPattern,
      selectedFabric,
      selectedDye,
      dyeColor: selectedDye.color,
      selectedDyeMethod,
      patternPage: page,
      currentPatterns,
      visiblePatterns: currentPatterns,
      canPatternPrev: page > 0,
      canPatternNext: page < 1,
      craftNodes: nodes,
      nodePoints: nodes.map(node => Object.assign({}, node, {
        left: node.x,
        top: node.y,
        style: 'left:' + node.x + 'rpx;top:' + node.y + 'rpx;'
      })),
      guideLines: Array.from({ length: 8 }, (_, index) => ({
        index,
        style: 'transform:rotate(' + (Number(state.rotation || 0) + index * 45) + 'deg);'
      })),
      unfoldMethodNote: selectedUnfold.note,
      unfoldVideoSrc: selectedUnfold.video,
      unfoldVideoTitle: selectedUnfold.videoTitle,
      unfoldVideoCaption: selectedUnfold.videoCaption,
      unfoldVideoTag: selectedUnfold.name + '视频'
    };
  },

  _apply(patch, options) {
    const opts = options || {};
    const merged = Object.assign({}, this.data, patch || {});
    const next = Object.assign({}, patch || {}, this._derived(merged));
    this.setData(next, () => {
      if (opts.persist !== false) this._persistDraft();
      if (opts.render === 'craft') this.renderCraftPreview();
      if (opts.render === 'dye') this.renderDyePreview();
      if (opts.render === 'stage') this._renderForStage();
      if (typeof opts.done === 'function') opts.done();
    });
  },

  _persistDraft() {
    if (!this.data || !this.data.sessionId) return;
    const previous = safeGet(DRAFT_KEY, {});
    safeSet(DRAFT_KEY, {
      version: DRAFT_VERSION,
      stage: this.data.stage,
      emotion: this.data.emotion,
      sessionId: this.data.sessionId,
      selectedFabricId: this.data.selectedFabricId,
      selectedPatternId: this.data.selectedPatternId,
      activeCategory: this.data.activeCategory,
      craft: this._craftSnapshot(),
      dye: {
        dyeName: this.data.dyeName,
        color: this.data.dyeColor,
        concentration: this.data.concentration,
        method: this.data.dyeMethod
      },
      oxidation: {
        minutes: this.data.oxidationMinutes,
        done: this.data.oxidationDone,
        completedAt: this.data.oxidationDone ? (previous.oxidation && previous.oxidation.completedAt) || new Date().toISOString() : ''
      },
      unfold: { method: this.data.unfoldMethod },
      finalImage: this.data.finalImage || FINAL_THUMB,
      savedWorkId: this.data.savedWorkId || '',
      saveAttempted: Boolean(previous.saveAttempted)
    });
  },

  _refreshUnlocks() {
    const stored = safeGet('ranxin_unlocked_patterns', []);
    const extras = Array.isArray(stored) ? stored.map(normalizePatternId) : [];
    const unlockedPatternIds = Array.from(new Set(DEFAULT_UNLOCKED_IDS.concat(extras.filter(id => PATTERN_IDS.indexOf(id) >= 0))));
    const patterns = PATTERN_DEFS.map(item => Object.assign({}, item, { unlocked: unlockedPatternIds.indexOf(item.id) >= 0 }));
    let selectedPatternId = this.data.selectedPatternId;
    if (unlockedPatternIds.indexOf(selectedPatternId) < 0) selectedPatternId = 'shui';
    this._apply({ patterns, unlockedPatternIds, selectedPatternId }, { persist: false });
  },

  // ---------- 六阶段导航 ----------
  enterStage(stage) {
    if (!STAGES.some(item => item.id === stage)) return;
    if (this.data.oxidationRunning && stage !== 'oxidation') {
      this._toast('氧化正在进行，请先停止氧化');
      return;
    }
    if (stage === 'unfold' && !this.data.oxidationDone) {
      this._toast('氧化完成后才能进入拆结');
      return;
    }
    this._apply({ stage }, { render: 'stage' });
  },

  goBack() {
    if (this.data.oxidationRunning || (this.data.stage === 'oxidation' && this.data.oxidationStarted && !this.data.oxidationDone)) {
      this._toast('请先在氧化弹层中停止氧化');
      return;
    }
    const index = STAGES.findIndex(item => item.id === this.data.stage);
    if (index > 0) {
      this.enterStage(STAGES[index - 1].id);
      return;
    }
    try {
      const pages = getCurrentPages();
      if (pages && pages.length > 1) wx.navigateBack();
      else wx.switchTab({ url: '/pages/diy/diy' });
    } catch (error) {
      wx.navigateBack();
    }
  },
  back() { this.goBack(); },
  onBack() { this.goBack(); },

  nextStage() {
    if (this.data.stage === 'fabric') this.continueToPattern();
    else if (this.data.stage === 'pattern') this.continueToCraft();
    else if (this.data.stage === 'craft') this.openCraftConfirm();
    else if (this.data.stage === 'dye') this.openDyeConfirm();
    else if (this.data.stage === 'oxidation') this.continueToUnfold();
    else if (this.data.stage === 'unfold') this.makePhysical();
  },

  // ---------- 布料 ----------
  selectFabric(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = dataset.id || dataset.fabric;
    if (!FABRICS.some(item => item.id === id)) return;
    this._apply({ selectedFabricId: id });
  },
  chooseFabric(event) { this.selectFabric(event); },
  continueToPattern() { this.enterStage('pattern'); },
  goFabricNext() { this.continueToPattern(); },

  // ---------- 纹样：固定两页，每页六枚 ----------
  selectPatternCategory(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const category = dataset.category || dataset.cat || dataset.id;
    if (PATTERN_CATEGORIES.indexOf(category) < 0) return;
    this._apply({ activeCategory: category });
  },
  setPatternCategory(event) { this.selectPatternCategory(event); },
  setCat(event) { this.selectPatternCategory(event); },

  selectPattern(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = normalizePatternId(dataset.id || dataset.pattern);
    const pattern = this.data.patterns.find(item => item.id === id);
    if (!pattern) return;
    if (!pattern.unlocked) {
      this._toast('这枚纹样尚未解锁');
      return;
    }
    this._apply({ selectedPatternId: id });
  },
  choosePattern(event) { this.selectPattern(event); },
  openPatternStory(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = normalizePatternId(dataset.id || dataset.pattern || this.data.selectedPatternId);
    const pattern = this.data.patterns.find(item => item.id === id) || this.data.selectedPattern;
    if (pattern) this.setData({ showPatternStory: true, storyPattern: pattern });
  },
  closePatternStory() { this.setData({ showPatternStory: false, storyPattern: null }); },

  setPatternPage(page) {
    this._apply({ patternPage: clamp(page, 0, 1) });
  },
  prevPatternPage() { this.setPatternPage(this.data.patternPage - 1); },
  nextPatternPage() { this.setPatternPage(this.data.patternPage + 1); },
  goPatternPrev() { this.prevPatternPage(); },
  goPatternNext() { this.nextPatternPage(); },
  onPatternPageChange(event) { this.setPatternPage(eventValue(event, this.data.patternPage)); },
  onPatternTouchStart(event) {
    const touch = event && event.touches && event.touches[0];
    if (!touch) return;
    this._patternSwipe = { x: touch.clientX === undefined ? touch.pageX : touch.clientX, y: touch.clientY === undefined ? touch.pageY : touch.clientY };
  },
  onPatternTouchEnd(event) {
    if (!this._patternSwipe) return;
    const touch = event && event.changedTouches && event.changedTouches[0];
    const start = this._patternSwipe;
    this._patternSwipe = null;
    if (!touch) return;
    const x = touch.clientX === undefined ? touch.pageX : touch.clientX;
    const y = touch.clientY === undefined ? touch.pageY : touch.clientY;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) this.nextPatternPage();
    else this.prevPatternPage();
  },
  continueToCraft() {
    const pattern = this.data.patterns.find(item => item.id === this.data.selectedPatternId);
    if (!pattern || !pattern.unlocked) {
      this._toast('请选择已解锁的纹样');
      return;
    }
    this.enterStage('craft');
  },
  beginCraft() {
    this.setData({ showPatternStory: false, storyPattern: null });
    this.continueToCraft();
  },

  // ---------- 纹样 DIY ----------
  _craftSnapshot() {
    return {
      symmetry: Number(this.data.symmetry),
      tightness: Number(this.data.tightness),
      whitespace: Number(this.data.whitespace),
      rotation: Number(this.data.rotation),
      radii: (this.data.radii || []).slice()
    };
  },
  _sameCraft(a, b) { return JSON.stringify(a) === JSON.stringify(b); },
  _pushCraftHistory(before) {
    const after = this._craftSnapshot();
    if (!before || this._sameCraft(before, after)) return;
    this._undoStack.push(clone(before));
    if (this._undoStack.length > 50) this._undoStack.shift();
    this._redoStack = [];
    this.setData({ canUndo: true, canRedo: false });
  },
  _restoreCraft(snapshot) {
    if (!snapshot) return;
    const symmetry = [4, 6, 8, 10, 12, 16].indexOf(Number(snapshot.symmetry)) >= 0 ? Number(snapshot.symmetry) : 8;
    this._apply({
      symmetry,
      tightness: clamp(snapshot.tightness, 0, 100),
      whitespace: clamp(snapshot.whitespace, 0, 100),
      rotation: normalizeRotation(snapshot.rotation),
      radii: ensureRadii(8, snapshot.radii)
    }, { render: 'craft' });
  },
  undoCraft() {
    if (!this._undoStack.length) return;
    const current = this._craftSnapshot();
    const previous = this._undoStack.pop();
    this._redoStack.push(current);
    this._restoreCraft(previous);
    this.setData({ canUndo: this._undoStack.length > 0, canRedo: true });
  },
  redoCraft() {
    if (!this._redoStack.length) return;
    const current = this._craftSnapshot();
    const next = this._redoStack.pop();
    this._undoStack.push(current);
    this._restoreCraft(next);
    this.setData({ canUndo: true, canRedo: this._redoStack.length > 0 });
  },
  resetCraft() {
    const before = this._craftSnapshot();
    this._apply({
      symmetry: DEFAULT_CRAFT.symmetry,
      tightness: DEFAULT_CRAFT.tightness,
      whitespace: DEFAULT_CRAFT.whitespace,
      rotation: DEFAULT_CRAFT.rotation,
      radii: DEFAULT_CRAFT.radii.slice()
    }, { render: 'craft', done: () => this._pushCraftHistory(before) });
  },
  undo() { this.undoCraft(); },
  redo() { this.redoCraft(); },
  reset() { this.resetCraft(); },

  selectSymmetry(event) {
    const value = eventValue(event, this.data.symmetry);
    if ([4, 6, 8, 10, 12, 16].indexOf(value) < 0 || value === this.data.symmetry) return;
    const before = this._craftSnapshot();
    this._apply({ symmetry: value, radii: ensureRadii(8, this.data.radii) }, {
      render: 'craft', done: () => this._pushCraftHistory(before)
    });
  },
  chooseSymmetry(event) { this.selectSymmetry(event); },
  setSymmetry(event) { this.selectSymmetry(event); },
  onSymmetryChange(event) { this.selectSymmetry(event); },

  _setCraftSlider(key, value, changing) {
    const limits = key === 'rotation' ? [-180, 180] : [0, 100];
    const next = key === 'rotation' ? normalizeRotation(value) : clamp(value, limits[0], limits[1]);
    if (!this._sliderStarts[key]) this._sliderStarts[key] = this._craftSnapshot();
    this._apply({ [key]: next }, { persist: !changing, render: 'craft', done: () => {
      if (!changing) {
        const before = this._sliderStarts[key];
        delete this._sliderStarts[key];
        this._pushCraftHistory(before);
      }
    } });
  },
  onTightnessChanging(event) { this._setCraftSlider('tightness', eventValue(event, this.data.tightness), true); },
  onTightnessChange(event) { this._setCraftSlider('tightness', eventValue(event, this.data.tightness), event && event.type === 'changing'); },
  onWhitespaceChanging(event) { this._setCraftSlider('whitespace', eventValue(event, this.data.whitespace), true); },
  onWhitespaceChange(event) { this._setCraftSlider('whitespace', eventValue(event, this.data.whitespace), event && event.type === 'changing'); },
  onRotationChanging(event) { this._setCraftSlider('rotation', eventValue(event, this.data.rotation), true); },
  onRotationChange(event) { this._setCraftSlider('rotation', eventValue(event, this.data.rotation), event && event.type === 'changing'); },

  _touchPoint(touch) {
    return {
      x: Number(touch.clientX === undefined ? (touch.pageX === undefined ? touch.x : touch.pageX) : touch.clientX),
      y: Number(touch.clientY === undefined ? (touch.pageY === undefined ? touch.y : touch.pageY) : touch.clientY)
    };
  },
  _touchAngle(touches) {
    const first = this._touchPoint(touches[0]);
    const second = this._touchPoint(touches[1]);
    return Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI;
  },
  _nodeIndexFromEvent(event, point) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    let index = Number(dataset.index === undefined ? dataset.nodeIndex : dataset.index);
    if (Number.isInteger(index) && index >= 0 && index < this.data.radii.length) return index;
    const rect = this._canvasRect.craftLayer || this._canvasRect.craft;
    if (!rect || !point) return -1;
    const scale = CRAFT_COORD_SIZE / rect.width;
    const x = (point.x - rect.left) * scale;
    const y = (point.y - rect.top) * scale;
    let nearest = -1;
    let distance = Infinity;
    this.data.craftNodes.forEach(node => {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < distance) { distance = d; nearest = node.index; }
    });
    return distance <= 55 ? nearest : -1;
  },
  onCraftTouchStart(event) {
    const touches = event && event.touches || [];
    if (!touches.length) return;
    this._gestureBefore = this._craftSnapshot();
    this._gestureChanged = false;
    if (touches.length >= 2) {
      this._craftGesture = { mode: 'rotate', angle: this._touchAngle(touches), rotation: this.data.rotation };
      return;
    }
    const point = this._touchPoint(touches[0]);
    const index = this._nodeIndexFromEvent(event, point);
    if (index >= 0) this._craftGesture = { mode: 'node', index };
  },
  onCraftTouchMove(event) {
    const touches = event && event.touches || [];
    if (!touches.length || !this._craftGesture) return;
    if (touches.length >= 2) {
      if (this._craftGesture.mode !== 'rotate') {
        this._craftGesture = { mode: 'rotate', angle: this._touchAngle(touches), rotation: this.data.rotation };
      }
      const delta = this._touchAngle(touches) - this._craftGesture.angle;
      this._gestureChanged = true;
      this._apply({ rotation: normalizeRotation(this._craftGesture.rotation + delta) }, { persist: false, render: 'craft' });
      return;
    }
    if (this._craftGesture.mode !== 'node') return;
    const rect = this._canvasRect.craftLayer || this._canvasRect.craft;
    if (!rect || !rect.width) return;
    const point = this._touchPoint(touches[0]);
    const scale = CRAFT_COORD_SIZE / rect.width;
    const x = (point.x - rect.left) * scale - CRAFT_CENTER;
    const y = (point.y - rect.top) * scale - CRAFT_CENTER;
    const radius = Math.round(clamp(Math.hypot(x, y), MIN_NODE_RADIUS, MAX_NODE_RADIUS));
    const radii = this.data.radii.slice();
    if (radii[this._craftGesture.index] === radius) return;
    radii[this._craftGesture.index] = radius;
    this._gestureChanged = true;
    this._apply({ radii }, { persist: false, render: 'craft' });
  },
  onCraftTouchEnd() {
    if (this._gestureChanged) this._pushCraftHistory(this._gestureBefore);
    this._gestureBefore = null;
    this._gestureChanged = false;
    this._craftGesture = null;
    this._persistDraft();
  },
  onNodeTouchStart(event) { this.onCraftTouchStart(event); },
  onNodeTouchMove(event) { this.onCraftTouchMove(event); },
  onNodeTouchEnd(event) { this.onCraftTouchEnd(event); },
  onCanvasTouchStart(event) { this.onCraftTouchStart(event); },

  openCraftConfirm() {
    if (this.data.showCraftConfirm) return;
    this._craftConfirming = false;
    // Canvas 2D 与 cover-view 在 iOS 上都是原生层。弹窗出现前丢弃旧引用，
    // WXML 会同步卸载它们，确保普通 view 弹窗完整位于最上层。
    if (this._canvas) this._canvas.craft = null;
    if (this._canvasRect) {
      this._canvasRect.craft = null;
      this._canvasRect.craftLayer = null;
    }
    this.setData({ showCraftConfirm: true });
  },
  cancelCraftConfirm() {
    this._craftConfirming = false;
    this.setData({ showCraftConfirm: false }, () => {
      // “继续调整”会重新挂载 Canvas，需要重新取得节点并绘制当前纹样。
      if (this.data.stage === 'craft') this._renderForStage();
    });
  },
  closeCraftConfirm() { this.cancelCraftConfirm(); },
  confirmCraft() {
    if (this._craftConfirming) return;
    this._craftConfirming = true;
    // 真机上的 cover-view 属于原生层；先完整卸载弹层和原生操作层，再切换阶段，
    // 可避免同一次触摸被底部节点层截获或重复触发。
    this.setData({ showCraftConfirm: false }, () => {
      this.enterStage('dye');
      this._craftConfirming = false;
    });
  },
  confirmCraftAndContinue() { this.confirmCraft(); },

  // ---------- 入染：颜色、浓度、方法三参数实时预览 ----------
  selectDye(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = dataset.id;
    const name = dataset.name || dataset.dye;
    const selected = DYES.find(item => item.id === id || item.name === name);
    if (!selected) return;
    this._apply({ dyeName: selected.name }, { render: 'dye' });
  },
  chooseDye(event) { this.selectDye(event); },
  onConcentrationChanging(event) {
    this._apply({ concentration: clamp(eventValue(event, this.data.concentration), 10, 100) }, { render: 'dye' });
  },
  onConcentrationChange(event) { this.onConcentrationChanging(event); },
  selectDyeMethod(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = dataset.id || dataset.method;
    if (!DYE_METHODS.some(item => item.id === id)) return;
    this._apply({ dyeMethod: id }, { render: 'dye' });
  },
  chooseDyeMethod(event) { this.selectDyeMethod(event); },
  showConcentrationInfo() { this._toast('浓度越高，颜色越深；可在 10%–100% 间调整'); },

  openDyeConfirm() { this.setData({ showDyeConfirm: true }); },
  cancelDyeConfirm() { this.setData({ showDyeConfirm: false }); },
  closeDyeConfirm() { this.cancelDyeConfirm(); },
  startDyeing() { this.openDyeConfirm(); },
  confirmDyePlan() {
    const method = DYE_METHODS.find(item => item.id === this.data.dyeMethod) || DYE_METHODS[0];
    const captions = {
      full: '将布料缓慢浸入染液，让颜色均匀进入纤维。',
      local: '控制入染范围，让布料形成深浅相间的自然层次。',
      drop: '让染液逐滴落下，在布面留下自然随性的痕迹。'
    };
    this.setData({
      showDyeConfirm: false,
      showDyeVideo: true,
      dyeVideoPlaying: false,
      dyeVideoError: false,
      dyeVideoTitle: method.name + '演示',
      dyeVideoCaption: captions[method.id],
      dyeVideoTag: method.name + '视频'
    }, () => {
      const video = this._videoContext('dyeDemoVideo');
      if (video) {
        try { video.seek(0); video.play(); } catch (error) {}
      }
    });
  },
  openDyeVideo() { this.confirmDyePlan(); },
  closeDyeVideo() {
    const video = this._videoContext('dyeDemoVideo');
    if (video) {
      try { video.pause(); video.seek(0); } catch (error) {}
    }
    this.setData({ showDyeVideo: false, dyeVideoPlaying: false });
  },
  onDyeVideoPlay() { this.setData({ dyeVideoPlaying: true, dyeVideoError: false }); },
  onDyeVideoPause() { this.setData({ dyeVideoPlaying: false }); },
  onDyeVideoEnded() { this.setData({ dyeVideoPlaying: false }); },
  onDyeVideoError() {
    this.setData({ dyeVideoPlaying: false, dyeVideoError: true });
    this._toast('示范视频暂时无法播放，可继续下一步');
  },
  confirmDyeAndContinue() {
    if (this._capturingFinal) return;
    this._capturingFinal = true;
    this.closeDyeVideo();
    this.setData({ showDyeConfirm: false });
    // 离开入染前保存这次真实生成的画布，后续拆结、作品和定制页都使用同一张图。
    this._captureDyePreview().catch(() => FINAL_THUMB).then(() => {
      this._capturingFinal = false;
      // A 稿在方案确认后直接进入氧化，不增加额外的强制计时门禁。
      this.enterStage('oxidation');
    });
  },
  confirmDye() { this.confirmDyeAndContinue(); },
  finishDyeDemo() { this.confirmDyeAndContinue(); },
  continueToOxidation() { this.confirmDyeAndContinue(); },

  // ---------- 氧化：真实时间倒计时，视频仅作为显色演示 ----------
  setOxidationMinutes(value) {
    if (this.data.oxidationRunning || this.data.oxidationStarted) {
      this._toast('氧化开始后不能调整时长');
      return;
    }
    const minutes = clamp(Math.round(value), 1, 5);
    const patch = Object.assign({
      oxidationMinutes: minutes,
      oxidationProgress: 0,
      oxidationRemainingSeconds: minutes * 60,
      oxidationCountdown: formatSeconds(minutes * 60),
      oxidationDone: false,
      oxidationError: false,
      oxidationStatus: '等待开始'
    }, oxidationVisual(minutes, 0));
    this._apply(patch);
  },
  onOxidationMinutesChange(event) { this.setOxidationMinutes(eventValue(event, this.data.oxidationMinutes)); },
  showOxidationInfo() { this._toast('建议 1–5 分钟，时间越久颜色越深'); },
  decreaseOxidationMinutes() { this.setOxidationMinutes(this.data.oxidationMinutes - 1); },
  increaseOxidationMinutes() { this.setOxidationMinutes(this.data.oxidationMinutes + 1); },
  minusOxidationMinute() { this.decreaseOxidationMinutes(); },
  plusOxidationMinute() { this.increaseOxidationMinutes(); },
  oxidationMinus() { this.decreaseOxidationMinutes(); },
  oxidationPlus() { this.increaseOxidationMinutes(); },
  onOxidationChange(event) { this.onOxidationMinutesChange(event); },

  startOxidation() {
    if (this.data.oxidationRunning) return;
    const minutes = this.data.oxidationMinutes;
    this._oxidationDeadline = Date.now() + minutes * 60 * 1000;
    const patch = Object.assign({
      showOxidationVideo: true,
      oxidationStarted: true,
      oxidationRunning: true,
      oxidationPaused: false,
      oxidationDone: false,
      oxidationError: false,
      oxidationProgress: 0,
      oxidationRemainingSeconds: minutes * 60,
      oxidationCountdown: formatSeconds(minutes * 60),
      oxidationStatus: '正在氧化'
    }, oxidationVisual(minutes, 0));
    this._apply(patch, { done: () => {
      this._startOxidationClock();
      const video = this._videoContext('oxidationVideo');
      if (video) {
        try { video.seek(0); video.play(); } catch (error) {}
      }
    } });
  },
  openOxidation() { this.startOxidation(); },
  onOxidationPlay() {
    if (this.data.oxidationDone) return;
    this.setData({ oxidationRunning: true, oxidationPaused: false, oxidationStatus: '正在氧化' });
  },
  onOxidationPause() {
    if (this.data.oxidationDone || !this.data.oxidationStarted) return;
    // 氧化是现实中的持续过程：暂停演示视频不会让真实倒计时跳秒或停止。
    this.setData({ oxidationRunning: true, oxidationPaused: false, oxidationStatus: '氧化计时中' });
  },
  onOxidationWaiting() {
    if (!this.data.oxidationDone) this.setData({ oxidationStatus: '视频缓冲中' });
  },
  onOxidationTimeUpdate(event) {
    if (!this.data.oxidationStarted || this.data.oxidationDone) return;
    // 演示视频只负责画面，不再用几秒钟的视频比例冒充几分钟倒计时。
  },
  handleOxidationTimeUpdate(event) { this.onOxidationTimeUpdate(event); },
  onOxidationEnded() {
    if (!this.data.oxidationStarted || this.data.oxidationDone) return;
    const video = this._videoContext('oxidationVideo');
    if (video) {
      try { video.seek(0); video.play(); } catch (error) {}
    }
    this.setData({ oxidationStatus: '氧化计时中' });
  },
  _completeOxidation() {
    this._clearOxidationFallback();
    this._oxidationDeadline = null;
    const patch = Object.assign({
      oxidationProgress: 100,
      oxidationRemainingSeconds: 0,
      oxidationCountdown: '0:00',
      oxidationStatus: '氧化完成',
      oxidationStarted: true,
      oxidationRunning: false,
      oxidationPaused: false,
      oxidationDone: true,
      // 若正在走显色动画兜底，完成后继续保留成品预览，不切回失败的黑色视频。
      oxidationError: this.data.oxidationError
    }, oxidationVisual(this.data.oxidationMinutes, 1));
    this._apply(patch);
  },
  handleOxidationEnded() { this.onOxidationEnded(); },
  onOxidationError() {
    if (!this.data.oxidationStarted || this.data.oxidationDone) return;
    this._clearOxidationFallback();
    this._apply({
      oxidationError: true,
      oxidationStatus: '显色动画进行中'
    });
    this._toast('视频暂不可用，已切换为显色动画');
    this._startOxidationFallback();
  },
  _startOxidationFallback() {
    this._startOxidationClock();
  },
  _startOxidationClock() {
    this._clearOxidationFallback();
    const totalSeconds = Math.max(1, this.data.oxidationMinutes * 60);
    if (!this._oxidationDeadline) {
      this._oxidationDeadline = Date.now() + Math.max(0, this.data.oxidationRemainingSeconds) * 1000;
    }
    const tick = () => {
      if (!this.data.oxidationStarted || this.data.oxidationDone || !this.data.showOxidationVideo) {
        this._clearOxidationFallback();
        return;
      }
      const diff = Math.max(0, this._oxidationDeadline - Date.now());
      const remaining = Math.max(0, Math.ceil(diff / 1000));
      const ratio = clamp((totalSeconds - remaining) / totalSeconds, 0, 1);
      const patch = Object.assign({
        oxidationProgress: Math.round(ratio * 1000) / 10,
        oxidationRemainingSeconds: remaining,
        oxidationCountdown: formatSeconds(remaining),
        oxidationRunning: ratio < 1,
        oxidationStatus: ratio < 1 ? (this.data.oxidationError ? '显色动画进行中' : '正在氧化') : '氧化完成'
      }, oxidationVisual(this.data.oxidationMinutes, ratio));
      if (remaining !== this.data.oxidationRemainingSeconds || remaining === 0) this.setData(patch);
      if (ratio >= 1) {
        this._completeOxidation();
        return;
      }
      const nextSecondDelay = diff - Math.max(0, remaining - 1) * 1000 + OXIDATION_CLOCK_GRACE_MS;
      this._oxidationFallbackTimer = setTimeout(tick, Math.max(120, Math.min(1018, nextSecondDelay)));
    };
    tick();
  },
  _clearOxidationFallback() {
    if (!this._oxidationFallbackTimer) return;
    clearTimeout(this._oxidationFallbackTimer);
    this._oxidationFallbackTimer = null;
  },
  stopOxidation() {
    this._clearOxidationFallback();
    this._oxidationDeadline = null;
    const video = this._videoContext('oxidationVideo');
    if (video) {
      try { video.pause(); video.seek(0); } catch (error) {}
    }
    const minutes = this.data.oxidationMinutes;
    const patch = Object.assign({
      showOxidationVideo: false,
      oxidationStarted: false,
      oxidationRunning: false,
      oxidationPaused: false,
      oxidationDone: false,
      oxidationError: false,
      oxidationProgress: 0,
      oxidationRemainingSeconds: minutes * 60,
      oxidationCountdown: formatSeconds(minutes * 60),
      oxidationStatus: '已停止'
    }, oxidationVisual(minutes, 0));
    this._apply(patch);
  },
  closeOxidationVideo() {
    if (this.data.oxidationRunning || (this.data.oxidationStarted && !this.data.oxidationDone)) {
      this._toast('请先停止氧化');
      return;
    }
    this.setData({ showOxidationVideo: false });
  },
  continueToUnfold() {
    if (!this.data.oxidationDone) {
      this._toast('真实倒计时完成后才能进入拆结');
      return;
    }
    const video = this._videoContext('oxidationVideo');
    if (video) {
      try { video.pause(); } catch (error) {}
    }
    this.setData({ showOxidationVideo: false });
    this.enterStage('unfold');
  },
  finishOxidation() { this.continueToUnfold(); },
  confirmOxidationComplete() { this.continueToUnfold(); },

  // ---------- 拆结：选方式即播放相应演示，无展开滑块 ----------
  selectUnfoldMethod(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset || {};
    const id = dataset.id || dataset.method;
    if (!UNFOLD_METHODS.some(item => item.id === id)) return;
    this._apply({ unfoldMethod: id }, { done: () => this.openUnfoldVideo(id) });
  },
  chooseUnfoldMethod(event) { this.selectUnfoldMethod(event); },
  openUnfoldVideo(methodId) {
    const selected = UNFOLD_METHODS.find(item => item.id === methodId) || UNFOLD_METHODS.find(item => item.id === this.data.unfoldMethod) || UNFOLD_METHODS[0];
    this.setData({
      unfoldMethod: selected.id,
      unfoldMethodNote: selected.note,
      unfoldVideoSrc: selected.video,
      unfoldVideoTitle: selected.videoTitle,
      unfoldVideoCaption: selected.videoCaption,
      unfoldVideoTag: selected.name + '视频',
      showUnfoldVideo: true,
      unfoldVideoPlaying: false,
      unfoldVideoEnded: false,
      unfoldVideoError: false
    }, () => {
      const video = this._videoContext('unfoldVideo');
      if (video) {
        try { video.seek(0); video.play(); } catch (error) {}
      }
    });
  },
  closeUnfoldVideo() {
    const video = this._videoContext('unfoldVideo');
    if (video) {
      try { video.pause(); video.seek(0); } catch (error) {}
    }
    this.setData({ showUnfoldVideo: false, unfoldVideoPlaying: false, unfoldVideoEnded: false });
  },
  onUnfoldVideoPlay() { this.setData({ unfoldVideoPlaying: true, unfoldVideoError: false }); },
  onUnfoldVideoPause() { this.setData({ unfoldVideoPlaying: false }); },
  onUnfoldVideoEnded() { this.setData({ unfoldVideoPlaying: false, unfoldVideoEnded: true }); },
  onUnfoldVideoError() {
    this.setData({ unfoldVideoPlaying: false, unfoldVideoError: true });
    this._toast('拆结视频暂时无法播放');
  },

  // ---------- Canvas ----------
  _renderForStage() {
    if (this.data.stage === 'craft') this._initCanvas('craft', ['#craftCanvas', '#craft-canvas', '#diyCanvas', '#diy-canvas']);
    if (this.data.stage === 'dye') this._initCanvas('dye', ['#dyeCanvas', '#dye-canvas', '#dyePreviewCanvas']);
  },
  _initCanvas(kind, selectors, retry) {
    retry = retry || 0;
    if (typeof wx === 'undefined' || !wx.createSelectorQuery) return;
    const query = wx.createSelectorQuery();
    if (query.in) query.in(this);
    selectors.forEach(selector => query.select(selector).fields({ node: true, size: true, rect: true }));
    query.exec(results => {
      const result = (results || []).find(item => item && item.node && item.width && item.height);
      if (!result) {
        if (retry < 6) setTimeout(() => this._initCanvas(kind, selectors, retry + 1), 70);
        return;
      }
      const canvas = result.node;
      const dpr = this._pixelRatio();
      canvas.width = result.width * dpr;
      canvas.height = result.height * dpr;
      const context = canvas.getContext('2d');
      context.scale(dpr, dpr);
      this._canvas[kind] = { node: canvas, context, width: result.width, height: result.height };
      this._canvasRect[kind] = { left: result.left || 0, top: result.top || 0, width: result.width, height: result.height };
      if (kind === 'craft') {
        this._initCraftLayerRect();
        this.renderCraftPreview();
      }
      if (kind === 'dye') this.renderDyePreview();
    });
  },
  _initCraftLayerRect() {
    if (typeof wx === 'undefined' || !wx.createSelectorQuery) return;
    const query = wx.createSelectorQuery();
    if (query.in) query.in(this);
    query.select('#node-layer').fields({ rect: true, size: true }).exec(results => {
      const result = results && results[0];
      if (!result || !result.width) return;
      this._canvasRect.craftLayer = {
        left: result.left || 0,
        top: result.top || 0,
        width: result.width,
        height: result.height
      };
    });
  },
  _pixelRatio() {
    try {
      if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 1;
      return wx.getSystemInfoSync().pixelRatio || 1;
    } catch (error) { return 1; }
  },
  _craftRenderOptions() {
    const pattern = this.data.selectedPattern || PATTERN_DEFS[0];
    return {
      patternId: this.data.selectedPatternId,
      type: pattern.type || 'radial',
      symmetry: this.data.symmetry,
      radii: this.data.radii.slice(),
      tightness: this.data.tightness,
      tightnessRatio: this.data.tightness / 100,
      whitespace: this.data.whitespace,
      whitespaceRatio: this.data.whitespace / 100,
      rotation: this.data.rotation,
      seed: 42
    };
  },
  renderCraftPreview() {
    const target = this._canvas.craft;
    if (!target) return;
    try {
      if (typeof engine.renderDiyPattern === 'function') {
        engine.renderDiyPattern(target.context, target.width, target.height, this._craftRenderOptions());
      } else {
        engine.renderTieDye(target.context, target.width, target.height, {
          type: 'radial',
          petals: this.data.symmetry,
          tightness: this.data.tightness / 100,
          whitespace: this.data.whitespace / 100,
          rotation: this.data.rotation,
          dyeName: this.data.dyeName,
          concentration: this.data.concentration / 100,
          seed: 42
        });
      }
    } catch (error) {
      console.warn('renderDiyPattern failed', error);
    }
  },
  renderDyePreview() {
    const target = this._canvas.dye;
    if (!target) return;
    const options = Object.assign({}, this._craftRenderOptions(), {
      dyeName: this.data.dyeName,
      dyeColor: this.data.dyeColor,
      concentration: this.data.concentration,
      concentrationRatio: this.data.concentration / 100,
      method: this.data.dyeMethod,
      dyeMethod: this.data.dyeMethod
    });
    try {
      if (typeof engine.renderDyePreview === 'function') {
        engine.renderDyePreview(target.context, target.width, target.height, options);
      } else {
        engine.renderTieDye(target.context, target.width, target.height, {
          type: 'radial',
          petals: this.data.symmetry,
          tightness: this.data.tightness / 100,
          whitespace: this.data.whitespace / 100,
          rotation: this.data.rotation,
          dyeName: this.data.dyeName,
          concentration: this.data.concentration / 100,
          seed: 42
        });
      }
    } catch (error) {
      console.warn('renderDyePreview failed', error);
    }
  },
  initCraftCanvas() { this._initCanvas('craft', ['#craftCanvas', '#craft-canvas', '#diyCanvas', '#diy-canvas']); },
  initDyeCanvas() { this._initCanvas('dye', ['#dyeCanvas', '#dye-canvas', '#dyePreviewCanvas']); },

  // ---------- 成品保存 / 作品页 / 实物应用 ----------
  _captureDyePreview() {
    const target = this._canvas && this._canvas.dye;
    if (!target || !target.node || typeof wx.canvasToTempFilePath !== 'function') {
      return Promise.resolve(this.data.finalImage || FINAL_THUMB);
    }
    return new Promise(resolve => {
      let settled = false;
      const finish = imagePath => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const finalImage = imagePath || FINAL_THUMB;
        if (finalImage !== FINAL_THUMB) this._persistentFinalImage = finalImage;
        this.setData({ finalImage }, () => {
          this._persistDraft();
          resolve(finalImage);
        });
      };
      const timer = setTimeout(() => finish(this.data.finalImage || FINAL_THUMB), 1600);
      wx.canvasToTempFilePath({
        canvas: target.node,
        x: 0,
        y: 0,
        width: target.width,
        height: target.height,
        destWidth: Math.max(640, Math.round(target.width * 2)),
        destHeight: Math.max(460, Math.round(target.height * 2)),
        fileType: 'jpg',
        quality: 0.88,
        success: result => {
          let stablePath = result && result.tempFilePath;
          const userDataPath = wx.env && wx.env.USER_DATA_PATH;
          if (stablePath && userDataPath && typeof wx.getFileSystemManager === 'function') {
            const safeSession = String(this.data.sessionId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
            const destination = userDataPath.replace(/\/$/, '') + '/ranxin-diy-' + safeSession + '.jpg';
            try {
              const fs = wx.getFileSystemManager();
              fs.copyFileSync(stablePath, destination);
              stablePath = destination;
            } catch (error) {}
          }
          finish(stablePath);
        },
        fail: () => finish(this.data.finalImage || FINAL_THUMB)
      }, this);
    });
  },

  _findSavedWork(workId, sessionId) {
    const works = safeGet(WORKS_KEY, []);
    if (!Array.isArray(works)) return null;
    return works.find(item => item && ((workId && item.workId === workId) || (sessionId && item.sourceDraftId === sessionId))) || null;
  },
  _ensurePersistentFinalImage() {
    if (this._persistentFinalImage) return this._persistentFinalImage;
    const hasWx = typeof wx !== 'undefined';
    const userDataPath = hasWx && wx.env && wx.env.USER_DATA_PATH;
    if (!userDataPath || typeof wx.getFileSystemManager !== 'function') return FINAL_THUMB;

    let fs;
    try { fs = wx.getFileSystemManager(); } catch (error) { return FINAL_THUMB; }
    if (!fs) return FINAL_THUMB;
    const destination = userDataPath.replace(/\/$/, '') + '/' + PERSISTENT_FINAL_FILE;
    const isReadable = path => {
      try {
        if (typeof fs.statSync === 'function') {
          const stat = fs.statSync(path);
          return !stat || typeof stat.size !== 'number' || stat.size > 0;
        }
        if (typeof fs.accessSync === 'function') fs.accessSync(path);
        return true;
      } catch (error) {
        return false;
      }
    };

    const generatedImage = this.data && this.data.finalImage;
    if (generatedImage && generatedImage !== FINAL_THUMB && isReadable(generatedImage)) {
      this._persistentFinalImage = generatedImage;
      return generatedImage;
    }

    if (isReadable(destination)) {
      this._persistentFinalImage = destination;
      return destination;
    }

    // 文件系统 API 读取代码包资源时通常使用无前导斜杠路径；保留第二种写法兼容旧基础库。
    const sources = [FINAL_THUMB.replace(/^\//, ''), FINAL_THUMB];
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      try {
        if (typeof fs.copyFileSync === 'function') {
          fs.copyFileSync(source, destination);
        } else if (typeof fs.readFileSync === 'function' && typeof fs.writeFileSync === 'function') {
          fs.writeFileSync(destination, fs.readFileSync(source));
        } else {
          continue;
        }
        if (isReadable(destination)) {
          this._persistentFinalImage = destination;
          return destination;
        }
      } catch (error) {}
    }
    // 极旧基础库或文件系统异常时仍允许保存，并由作品页自己的主包纹样图兜底。
    return FINAL_THUMB;
  },
  _buildWork(workId, finalImage) {
    const pattern = this.data.selectedPattern || PATTERN_DEFS[0];
    const fabric = this.data.selectedFabric || FABRICS[1];
    const now = new Date().toISOString();
    const stableFinalImage = finalImage || FINAL_THUMB;
    return {
      workId,
      sourceDraftId: this.data.sessionId,
      source: 'diy-flow',
      title: pattern.name + ' · ' + fabric.name,
      patternId: pattern.id,
      patternName: pattern.name,
      story: pattern.story,
      fabric: fabric.name,
      carrier: fabric.name,
      fabricId: fabric.id,
      emotion: this.data.emotionLabel,
      dyeName: this.data.dyeName,
      concentration: this.data.concentration,
      dyeMethod: this.data.dyeMethod,
      symmetry: this.data.symmetry,
      petals: this.data.symmetry,
      tightness: this.data.tightness,
      whitespace: this.data.whitespace,
      rotation: this.data.rotation,
      oxidationMinutes: this.data.oxidationMinutes,
      unfoldMethod: this.data.unfoldMethod,
      thumb: stableFinalImage,
      finalImage: stableFinalImage,
      diyParams: this._craftSnapshot(),
      dyeParams: {
        dyeName: this.data.dyeName,
        color: this.data.dyeColor,
        concentration: this.data.concentration,
        method: this.data.dyeMethod
      },
      oxidationParams: {
        minutes: this.data.oxidationMinutes,
        videoEnded: Boolean(this.data.oxidationDone),
        completedAt: now
      },
      unfoldParams: { method: this.data.unfoldMethod },
      createdAt: now,
      updatedAt: now
    };
  },
  _upsertLocalWork(work) {
    const stored = safeGet(WORKS_KEY, []);
    const works = Array.isArray(stored) ? stored : [];
    const clean = works.filter(item => item && item.workId && item.workId !== work.workId && item.sourceDraftId !== work.sourceDraftId);
    const combined = [work].concat(clean);
    const next = combined.slice(0, MAX_LOCAL_WORKS);
    safeSet(WORKS_KEY, next);
    this._removeExpiredWorkFiles(combined.slice(MAX_LOCAL_WORKS), next);
  },
  _removeExpiredWorkFiles(expired, kept) {
    if (!expired.length || !wx.env || !wx.env.USER_DATA_PATH || typeof wx.getFileSystemManager !== 'function') return;
    const base = wx.env.USER_DATA_PATH.replace(/\/$/, '') + '/ranxin-diy-';
    const keptPaths = new Set();
    kept.forEach(item => {
      if (item && item.thumb) keptPaths.add(item.thumb);
      if (item && item.finalImage) keptPaths.add(item.finalImage);
    });
    let fs;
    try { fs = wx.getFileSystemManager(); } catch (error) { return; }
    const removed = new Set();
    expired.forEach(item => {
      [item && item.thumb, item && item.finalImage].forEach(filePath => {
        if (!filePath || filePath.indexOf(base) !== 0 || keptPaths.has(filePath) || removed.has(filePath)) return;
        try { fs.unlinkSync(filePath); removed.add(filePath); } catch (error) {}
      });
    });
  },
  _dedupeSyncedWork(work, result) {
    const canonical = Object.assign({}, work, result && result.workId && result.workId !== work.workId ? { serverWorkId: result.workId } : {});
    this._upsertLocalWork(canonical);
    this._savedWork = canonical;
  },
  ensureWorkSaved() {
    if (!this.data.oxidationDone) return Promise.reject(new Error('氧化尚未完成'));
    if (this._savedWork) return Promise.resolve(this._savedWork);
    if (this._savePromise) return this._savePromise;

    const existing = this._findSavedWork(this.data.savedWorkId, this.data.sessionId);
    if (existing) {
      const stableFinalImage = this._ensurePersistentFinalImage();
      const migrated = stableFinalImage !== FINAL_THUMB &&
        (existing.thumb === FINAL_THUMB || existing.finalImage === FINAL_THUMB)
        ? Object.assign({}, existing, { thumb: stableFinalImage, finalImage: stableFinalImage })
        : existing;
      if (migrated !== existing) this._upsertLocalWork(migrated);
      this._savedWork = migrated;
      this.setData({ workSaved: true, savedWorkId: migrated.workId });
      return Promise.resolve(migrated);
    }

    const workId = this.data.savedWorkId || ('work_' + this.data.sessionId);
    const work = this._buildWork(workId, this._ensurePersistentFinalImage());
    this._upsertLocalWork(work);
    this._savedWork = work;
    this.setData({ workSaved: true, savedWorkId: workId });

    const draft = safeGet(DRAFT_KEY, {});
    draft.savedWorkId = workId;
    const shouldSync = !draft.saveAttempted;
    draft.saveAttempted = true;
    safeSet(DRAFT_KEY, draft);

    this._savePromise = Promise.resolve(work);
    if (shouldSync && api && typeof api.saveWork === 'function') {
      Promise.resolve(api.saveWork(work)).then(result => {
        this._dedupeSyncedWork(work, result || {});
      }).catch(() => {
        // 本机作品已经可靠保存；云端失败不阻断用户进入作品或实物应用。
        this._dedupeSyncedWork(work, null);
      });
    }
    return this._savePromise;
  },
  makePhysical() {
    if (this.data.savingPhysical) return;
    this.setData({ savingPhysical: true });
    this.ensureWorkSaved().then(work => {
      const prefill = {
        workId: work.workId,
        title: work.title,
        patternId: work.patternId,
        patternName: work.patternName,
        fabric: work.fabric,
        carrier: work.carrier,
        thumb: work.thumb,
        finalImage: work.finalImage,
        diyParams: clone(work.diyParams),
        dyeParams: clone(work.dyeParams),
        oxidationParams: clone(work.oxidationParams),
        unfoldParams: clone(work.unfoldParams)
      };
      safeSet('ranxin_last_work', work);
      safeSet('ranxin_product_prefill', prefill);
      // 兼容现有产品页读取方式。
      safeSet('ranxin_last_pattern_name', work.patternName);
      safeSet('ranxin_last_pattern_image', work.thumb);
      this.setData({ savingPhysical: false });
      wx.navigateTo({ url: '/pages/product/product' });
    }).catch(() => {
      this.setData({ savingPhysical: false });
      this._toast('作品保存失败，请重试');
    });
  },
  saveAndViewWorks() {
    if (this.data.savingPhysical) return;
    this.setData({ savingPhysical: true });
    this.ensureWorkSaved().then(() => {
      this.setData({ savingPhysical: false });
      wx.showLoading({ title: '正在整理作品', mask: true });
      wx.switchTab({
        url: '/pages/works/works',
        fail: () => {
          wx.hideLoading();
          this._toast('作品页加载失败，请重试');
        }
      });
    }).catch(() => {
      this.setData({ savingPhysical: false });
      this._toast('作品保存失败，请重试');
    });
  },
  goToProduct() { this.makePhysical(); },
  viewMyWorks() { this.saveAndViewWorks(); },

  // 2.7 作品海报记录：保存作品后跳转海报页
  goToPoster() {
    if (this.data.savingPhysical) return;
    this.setData({ savingPhysical: true });
    this.ensureWorkSaved().then(() => {
      this.setData({ savingPhysical: false });
      wx.navigateTo({ url: '/pages/poster/poster' });
    }).catch(() => {
      this.setData({ savingPhysical: false });
      this._toast('作品保存失败，请重试');
    });
  },

  _videoContext(id) {
    try { return wx.createVideoContext ? wx.createVideoContext(id, this) : null; } catch (error) { return null; }
  },
  _toast(title) {
    if (wx && wx.showToast) wx.showToast({ title, icon: 'none' });
  },
  noop() {}
});
