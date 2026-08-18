App({
  onLaunch() {
    // 全局初始化：D2 已切真实云函数
    this.globalData = { env: 'cloud' };

    // 云开发初始化
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d7go7jgw96a38c2af',
        traceUser: true
      });
    }
  },
  globalData: {}
});
