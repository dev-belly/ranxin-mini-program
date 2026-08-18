// 归属：A｜产品前端 Owner
Page({
  data: {
    slogan: '以蓝染，寄情绪',
    features: [
      { key: 'collection', name: '纹样库', desc: '六种白族扎染纹样与寓意', tab: 'true', url: '/pages/collection/collection' },
      { key: 'diy', name: '正念DIY', desc: '七步沉浸式扎染创作', tab: 'true', url: '/pages/diy/diy' },
      { key: 'game', name: '合成大染缸', desc: '玩着解锁新纹样', tab: 'false', url: '/pages/game/game' },
      { key: 'works', name: '我的作品', desc: '保存与管理你的染作', tab: 'true', url: '/pages/works/works' }
    ]
  },
  goMbti() {
    wx.navigateTo({ url: '/pages/mbti/index' });
  },
  go(e) {
    const { url, tab } = e.currentTarget.dataset;
    if (tab === 'true') wx.switchTab({ url });
    else wx.navigateTo({ url });
  }
});
