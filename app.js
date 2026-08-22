const api = require('./utils/api.js');

App({
  onLaunch() {
    let appId = '';
    try {
      const account = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
      appId = account && account.miniProgram ? account.miniProgram.appId : '';
    } catch (err) {}

    // touristappid 只能跑本地演示，强行初始化云开发会持续产生 cloud init error。
    const canUseCloud = !!(wx.cloud && appId && appId !== 'touristappid');
    this.globalData = { env: canUseCloud ? 'cloud' : 'mock', user: null, ready: false };

    // 云开发初始化
    if (canUseCloud) {
      try {
        wx.cloud.init({
          env: 'cloud1-d7go7jgw96a38c2af',
          traceUser: true
        });
      } catch (err) {
        this.globalData.env = 'mock';
      }
    }

    // 无论当前是本地演示还是真云环境，都走同一登录契约。
    // 页面不再各自猜用户状态；失败时仍允许离线体验 A 稿交互。
    api.login().then(res => {
      this.globalData.user = res && res.user ? res.user : null;
      this.globalData.ready = true;
    }).catch(() => {
      this.globalData.ready = true;
    });
  },
  globalData: {}
});
