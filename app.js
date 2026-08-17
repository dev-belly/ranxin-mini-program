App({
  onLaunch() {
    // 全局初始化：env 可切 'mock' / 'cloud'
    this.globalData = { env: 'mock' };
  },
  globalData: {}
});
