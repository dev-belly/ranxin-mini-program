const DRAFT_KEY = 'ranxin_diy_draft';
const EMOTION_KEY = 'ranxin_current_emotion';
const WORKS_KEY = 'ranxin_works';
const FLOW_URL = '/packageDiy/pages/flow/flow';

const STAGE_LABELS = {
  fabric: '选择布料',
  pattern: '选择纹样',
  craft: '纹样 DIY',
  dye: '入染',
  oxidation: '氧化',
  unfold: '拆结'
};

const MOODS = [
  { id: 'anxious', label: '有点焦躁', desc: '让水波把紧绷慢慢带走' },
  { id: 'tired', label: '有些疲惫', desc: '把今天的重量放在布上' },
  { id: 'messy', label: '脑子很乱', desc: '在重复与秩序里安静下来' },
  { id: 'quiet', label: '需要安静', desc: '留一点空白给自己呼吸' },
  { id: 'calm', label: '很平静', desc: '把此刻的安稳染下来' },
  { id: 'good', label: '今天不错', desc: '让轻盈的颜色继续绽放' }
];

function readStorage(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === undefined || value === null || value === '' ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

Page({
  data: {
    moods: MOODS,
    selectedMoodId: 'quiet',
    selectedMood: MOODS[3],
    steps: ['选布料', '选纹样', '纹样DIY', '入染', '氧化', '拆结'],
    hasDraft: false,
    draftStageLabel: '',
    latestWork: null,
    latestWorkImage: '/assets/diy/entry-tuan.jpg'
  },

  onShow() {
    try { wx.hideLoading(); } catch (error) {}
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setData) tabBar.setData({ selected: 1 });

    const draft = readStorage(DRAFT_KEY, {});
    const works = readStorage(WORKS_KEY, []);
    const latestWork = Array.isArray(works) && works.length ? works[0] : null;
    const hasDraft = Boolean(draft && draft.sessionId && STAGE_LABELS[draft.stage] && !draft.savedWorkId);
    this.setData({
      hasDraft,
      draftStageLabel: hasDraft ? STAGE_LABELS[draft.stage] : '',
      latestWork,
      latestWorkImage: latestWork && (latestWork.thumb || latestWork.finalImage)
        ? (latestWork.thumb || latestWork.finalImage)
        : '/assets/diy/entry-tuan.jpg'
    });
  },

  chooseMood(event) {
    const id = event.currentTarget.dataset.id;
    const selectedMood = MOODS.find(item => item.id === id);
    if (!selectedMood) return;
    this.setData({ selectedMoodId: id, selectedMood });
  },

  goBack() {
    const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (stack.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.switchTab({ url: '/pages/index/index' })
      });
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },

  startNew() {
    const mood = this.data.selectedMood || MOODS[3];
    try {
      wx.removeStorageSync(DRAFT_KEY);
      // 与首页共用同一种 string 数据结构，避免对象被直接当作文字渲染。
      wx.setStorageSync(EMOTION_KEY, mood.id);
    } catch (error) {}
    wx.showLoading({ title: '正在准备染布', mask: true });
    wx.navigateTo({
      url: FLOW_URL,
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '创作页加载失败，请重试', icon: 'none' });
      }
    });
  },

  resumeFlow() {
    wx.showLoading({ title: '正在打开草稿', mask: true });
    wx.navigateTo({
      url: FLOW_URL,
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '草稿加载失败，请重试', icon: 'none' });
      }
    });
  },

  goWorks() {
    wx.switchTab({ url: '/pages/works/works' });
  },

  goPoster() {
    if (!this.data.latestWork) {
      this.startNew();
      return;
    }
    try { wx.setStorageSync('ranxin_last_work', this.data.latestWork); } catch (error) {}
    wx.navigateTo({ url: '/pages/poster/poster' });
  }
});
