// 归属：A｜产品前端 Owner（B 按设计稿 1首页.html 重制）
Page({
  data: {
    musicOn: false,
    // 情绪胶囊（对齐 A：焦躁/疲惫/平静/开心/有点乱）
    emotions: [
      { key: 'anxious', label: '焦躁', active: true },
      { key: 'tired', label: '疲惫', active: false },
      { key: 'calm', label: '平静', active: false },
      { key: 'happy', label: '开心', active: false },
      { key: 'messy', label: '有点乱', active: false }
    ],
    relaxDays: 3,
    relaxCount: 0,
    // 一分钟非遗三卡（对齐 A：浅底深蓝标题 + 底部图区）
    knowledge: [
      { id: 'why-blue', art: 'why-blue', tag: '为什么不是蓝色？', title: '刚出缸的布，为何不蓝？', lead: '明明染的是板蓝根，为什么捞出来却是黄绿色？', img: '/assets/patterns/cang.png' },
      { id: 'oxidation', art: 'oxidation', tag: '氧化的魔法', title: '板蓝根染液', lead: '为什么会从无色慢慢变成靛蓝？一场时间的魔法。', img: '/assets/patterns/shui.png' },
      { id: 'pattern', art: 'pattern', tag: '纹样的秘密', title: '不同扎结方式', lead: '扎、缝、夹、缠，每一种都留下独一无二的纹样。', img: '/assets/patterns/tuan.png' }
    ]
  },

  onLoad() {
    try {
      const days = wx.getStorageSync('ranxin_relax_days');
      const today = wx.getStorageSync('ranxin_relax_today');
      if (days) this.setData({ relaxDays: days });
      if (typeof today === 'number') this.setData({ relaxCount: today });
    } catch (e) {}
  },

  toggleMusic() {
    const musicOn = !this.data.musicOn;
    this.setData({ musicOn });
    if (musicOn) wx.showToast({ title: '背景音乐播放中', icon: 'none' });
  },

  selectEmotion(e) {
    const { key } = e.currentTarget.dataset;
    const emotions = this.data.emotions.map(it => ({ ...it, active: it.key === key }));
    this.setData({ emotions });
  },

  goMbti() {
    wx.navigateTo({ url: '/pages/mbti/index' });
  },

  goDiy() {
    wx.navigateTo({ url: '/pages/diy/diy' });
  },

  goKnowledge() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge' });
  },

  goArticle(e) {
    const { art } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article/article?type=' + art });
  }
});
