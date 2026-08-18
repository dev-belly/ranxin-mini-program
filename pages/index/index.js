// 归属：A｜产品前端 Owner（B 按设计稿重制首页）
Page({
  data: {
    // 顶部情绪标签（与设计稿 image1 对齐）
    emotions: [
      { key: 'anxious', label: '焦躁', active: true },
      { key: 'tired', label: '疲惫', active: false },
      { key: 'calm', label: '平静', active: false },
      { key: 'happy', label: '开心', active: false },
      { key: 'messy', label: '有点乱', active: false }
    ],
    todayBest: 3280,
    // 一分钟非遗（对齐 A：三张知识卡）
    knowledge: [
      { id: 'why-blue', tag: '为什么不是蓝色？', title: '刚出缸的布，为何不蓝？', desc: '板蓝根染液接触空气后，会经历一场缓慢的氧化变色。', art: 'oxidation' },
      { id: 'oxidation', tag: '氧化的魔法', title: '板蓝根染液为什么会变蓝？', desc: '从无色到微绿，再到蓝色，氧化像一场时间的魔法。', art: 'oxidation' },
      { id: 'pattern', tag: '纹样的秘密', title: '不同扎结方式，会形成怎样的纹样？', desc: '扎、缝、夹、缠，每一种都是独一无二的自然印记。', art: 'pattern' }
    ],
    leaderboard: {
      active: 'user',
      scope: 'today',
      list: [
        { rank: 1, name: '@inkblue27', score: 128432, avatar: '/assets/patterns/hudie.png' },
        { rank: 2, name: '@cloud_dye', score: 97310, avatar: '/assets/patterns/tuan.png' },
        { rank: 3, name: '@xiao_ran77', score: 86540, avatar: '/assets/patterns/shui.png' }
      ]
    }
  },

  onLoad() {
    // 若本地保存了今日最高分则读取
    try {
      const best = wx.getStorageSync('ranxin_game_best');
      if (best) this.setData({ todayBest: best });
    } catch (e) {}
  },

  toggleMusic() {
    wx.showToast({ title: '背景音乐播放中', icon: 'none' });
  },

  selectEmotion(e) {
    const { key } = e.currentTarget.dataset;
    const emotions = this.data.emotions.map(item => ({ ...item, active: item.key === key }));
    this.setData({ emotions });
  },

  goMbti() {
    wx.navigateTo({ url: '/pages/mbti/index' });
  },

  goGame() {
    wx.navigateTo({ url: '/pages/game/game' });
  },

  goLeaderboard() {
    wx.navigateTo({ url: '/pages/game/game?scene=leaderboard' });
  },

  goKnowledge() {
    wx.navigateTo({ url: '/pages/knowledge/knowledge' });
  },

  goArticle(e) {
    const { art } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article/article?type=' + art });
  },

  switchLeaderboardTab(e) {
    const { tab } = e.currentTarget.dataset;
    const leaderboard = { ...this.data.leaderboard, active: tab };
    this.setData({ leaderboard });
  }
});
