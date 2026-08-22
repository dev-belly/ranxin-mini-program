// 合成大染缸 · 双玩法入口选择页
// 玩法一：经典三消（交换相邻方块消除）→ pages/game/game
// 玩法二：落球合成（大西瓜式物理合成）→ pages/gameMerge/gameMerge
Page({
  data: {
    gameCount: 0,
    propsHint: ''
  },

  onShow() {
    let clears = 0;
    try { clears = Number(wx.getStorageSync('ranxin_game_clears')) || 0; } catch (e) {}
    let props = {};
    try { props = wx.getStorageSync('ranxin_game_props') || {}; } catch (e) {}
    const extras = (Number(props.swap) || 0) + (Number(props.clear) || 0) + (Number(props.shuffle) || 0);
    this.setData({
      gameCount: clears,
      propsHint: clears > 0 ? '已通关 ' + clears + ' 次 · 道具加成 +' + extras : '首次体验，选择一种玩法开始吧'
    });
  },

  goClassic() {
    wx.navigateTo({ url: '/packageGame/pages/game/game' });
  },

  goMerge() {
    wx.navigateTo({ url: '/packageGame/pages/gameMerge/gameMerge' });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.switchTab({ url: '/pages/index/index' })
      });
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  }
});
