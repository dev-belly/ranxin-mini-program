App({
  onLaunch() {
    // 全局初始化：env 可切 'mock' / 'cloud'
    this.globalData = { env: 'mock' };

    // 云开发初始化（D1 Mock 阶段不实际调用云函数，先就绪 SDK）
    // 环境 ID 由 C 提供：cloud1-d7go7jgw96a38c2af
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d7go7jgw96a38c2af',
        traceUser: true
      });
    }
  },
  globalData: {}
});
