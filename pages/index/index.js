// 归属：A｜产品前端 Owner（B 按设计稿 1首页.html 重制）
Page({
  data: {
    musicOn: false,
    selectedEmotion: 'anxious',
    // 情绪胶囊（对齐 A：焦躁/疲惫/平静/开心/有点乱）
    emotions: [
      { key: 'anxious', label: '焦躁', active: true },
      { key: 'tired', label: '疲惫', active: false },
      { key: 'calm', label: '平静', active: false },
      { key: 'happy', label: '开心', active: false },
      { key: 'messy', label: '有点乱', active: false }
    ],
    relaxDays: 0,
    relaxCount: 0,
    // 今日染力榜（对齐 A 稿 image1）
    lbTab: 'user',
    lbList: [
      { rank: 1, name: '@inkblue27', score: '128,432', avatar: '/assets/patterns/tuan.jpg' },
      { rank: 2, name: '@cloud_dye', score: '97,310', avatar: '/assets/patterns/shui.jpg' },
      { rank: 3, name: '@xiao_ran77', score: '86,540', avatar: '/assets/patterns/cang.jpg' }
    ],
    // 一分钟非遗三卡（对齐 A：浅底深蓝标题 + 底部图区）
    knowledge: [
      { id: 'why-blue', art: 'why-blue', tag: '为什么不是蓝色？', title: '刚出缸的布，为何不蓝？', lead: '明明染的是板蓝根，为什么捞出来却是黄绿色？', img: '/assets/patterns/cang.jpg' },
      { id: 'oxidation', art: 'oxidation', tag: '氧化的魔法', title: '板蓝根染液', lead: '为什么会从无色慢慢变成靛蓝？一场时间的魔法。', img: '/assets/patterns/shui.jpg' },
      { id: 'pattern', art: 'pattern', tag: '纹样的秘密', title: '不同扎结方式', lead: '扎、缝、夹、缠，每一种都留下独一无二的纹样。', img: '/assets/patterns/tuan.jpg' }
    ],
    featuredKnowledge: { id: 'why-blue', art: 'why-blue', tag: '一分钟非遗', title: '刚从染缸里取出的布，为什么不是蓝色？', lead: '板蓝根染液接触空气后，会经历一场缓慢的氧化变色。', img: '/assets/patterns/cang.jpg' }
  },

  onLoad() {
    try {
      const days = wx.getStorageSync('ranxin_relax_days');
      const today = wx.getStorageSync('ranxin_relax_today');
      if (days) this.setData({ relaxDays: days });
      if (typeof today === 'number') this.setData({ relaxCount: today });
      const storedEmotion = wx.getStorageSync('ranxin_current_emotion');
      const selectedEmotion = typeof storedEmotion === 'string'
        ? storedEmotion
        : (storedEmotion && storedEmotion.id);
      if (selectedEmotion && this.data.emotions.some(it => it.key === selectedEmotion)) {
        this.setData({
          selectedEmotion,
          emotions: this.data.emotions.map(it => ({ ...it, active: it.key === selectedEmotion }))
        });
      }
    } catch (e) {}
  },

  onShow() {
    try { wx.hideLoading(); } catch (e) {}
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setData) tabBar.setData({ selected: 0 });
  },

  toggleMusic() {
    const musicOn = !this.data.musicOn;
    this.setData({ musicOn });
    wx.showToast({ title: musicOn ? '沉浸音效已开启' : '沉浸音效已关闭', icon: 'none' });
  },

  selectEmotion(e) {
    const { key } = e.currentTarget.dataset;
    const emotions = this.data.emotions.map(it => ({ ...it, active: it.key === key }));
    this.setData({ emotions, selectedEmotion: key });
    try { wx.setStorageSync('ranxin_current_emotion', key); } catch (err) {}
  },

  goMbti() {
    wx.navigateTo({ url: '/pages/mbti/index' });
  },

  goDiy() {
    wx.showLoading({ title: '正在打开工坊', mask: true });
    wx.switchTab({
      url: '/pages/diy/diy',
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '工坊加载失败，请重试', icon: 'none' });
      }
    });
  },

  goGame() {
    // 首页只保留一个游戏总入口；进入后由玩家选择经典三消或落球合成。
    wx.navigateTo({ url: '/packageGame/pages/gameHub/gameHub' });
  },

  goRelax() {
    wx.navigateTo({ url: '/pages/relax/relax' });
  },

  goKnowledge() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge' });
  },

  switchLbTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const list = tab === 'user'
      ? [
        { rank: 1, name: '@inkblue27', score: '128,432', avatar: '/assets/patterns/tuan.jpg' },
        { rank: 2, name: '@cloud_dye', score: '97,310', avatar: '/assets/patterns/shui.jpg' },
        { rank: 3, name: '@xiao_ran77', score: '86,540', avatar: '/assets/patterns/cang.jpg' }
      ]
      : [
        { rank: 1, name: '@blue_mori', score: '632,110', avatar: '/assets/patterns/he.jpg' },
        { rank: 2, name: '@nightindigo', score: '543,221', avatar: '/assets/patterns/ling.jpg' },
        { rank: 3, name: '@dyewave', score: '487,652', avatar: '/assets/patterns/he.jpg' }
      ];
    this.setData({ lbTab: tab, lbList: list });
  },

  goRank() {
    wx.navigateTo({ url: '/pages/rank/rank' });
  },

  goArticle(e) {
    const { art } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article/article?type=' + art });
  }
});
