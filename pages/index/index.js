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
    wx.navigateTo({ url: '/pages/collection/collection' });
  },

  switchLeaderboardTab(e) {
    const { tab } = e.currentTarget.dataset;
    const leaderboard = { ...this.data.leaderboard, active: tab };
    this.setData({ leaderboard });
  }
});
