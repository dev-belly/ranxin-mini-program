/* 砍价详情（前端 mock）
 * TODO: 接入 C 后端：帮砍 / 分享 / 支付
 */
Page({
  data: {
    bargain: null,
    leftAmount: 0,
    progressPercent: 0,
    needInvites: 2,
    shareMessage: ''
  },

  onLoad(opts) {
    this.loadBargain(opts.id);
  },

  onShow() {
    const id = this.data.bargain ? this.data.bargain.id : '';
    if (id) this.loadBargain(id);
  },

  loadBargain(id) {
    const storageList = wx.getStorageSync('ranxin_bargain_list') || [];
    let item = storageList.find(x => x.id === id);
    if (!item) item = wx.getStorageSync('ranxin_current_bargain');
    if (!item) {
      wx.showToast({ title: '砍价不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.updateComputed(item);
  },

  updateComputed(item) {
    const helperSeeds = [
      { name: '小王', time: '刚刚帮砍', amount: -4.28 },
      { name: 'Linda', time: '2 分钟前帮砍', amount: -6.71 },
      { name: '阿哲', time: '10 分钟前帮砍', amount: -3.52 },
      { name: '小棠', time: '30 分钟前帮砍', amount: -7.89 }
    ];
    const helpers = (item.helpers || []).map((helper, index) => {
      const h = (helper && typeof helper === 'object') ? helper : helperSeeds[index % helperSeeds.length];
      const amount = Number(h.amount || 0);
      return { ...h, amount, amountText: Math.abs(amount).toFixed(2) };
    });
    item = { ...item, helpers };
    const totalCut = item.originalPrice - item.targetPrice;
    const leftAmount = Math.max(0, item.currentPrice - item.targetPrice);
    const progressPercent = totalCut > 0 ? ((item.originalPrice - item.currentPrice) / totalCut) * 100 : 0;
    const avgCut = item.helpers && item.helpers.length ? (item.originalPrice - item.currentPrice) / item.helpers.length : 12;
    const needInvites = avgCut > 0 ? Math.max(1, Math.ceil(leftAmount / avgCut)) : 2;
    this.setData({
      bargain: item,
      leftAmount: Number(leftAmount.toFixed(2)),
      progressPercent,
      needInvites,
      shareMessage: `再邀 ${needInvites} 位好友，立减 ¥${leftAmount} 带走`
    });
  },

  inviteHelp() {
    wx.showShareMenu({ withShareTicket: true });
    wx.showToast({ title: '请点击右上角转发', icon: 'none' });
  },

  buyNow() {
    const bargain = this.data.bargain || {};
    const order = {
      ...bargain,
      price: bargain.currentPrice,
      makingDays: bargain.makingDays || '7-12 天',
      material: bargain.material || '棉麻',
      createdAt: bargain.createdAt || new Date().toISOString(),
      statusIndex: 2,
      status: 'making'
    };
    wx.setStorageSync('ranxin_last_order', order);
    wx.showToast({ title: '已按当前价下单', icon: 'success' });
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/orderProgress/orderProgress' });
    }, 600);
  },

  saveBargain(bargain) {
    wx.setStorageSync('ranxin_current_bargain', bargain);
    const list = wx.getStorageSync('ranxin_bargain_list') || [];
    const idx = list.findIndex(x => x.id === bargain.id);
    if (idx >= 0) list[idx] = bargain; else list.unshift(bargain);
    wx.setStorageSync('ranxin_bargain_list', list);
  },

  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    const b = this.data.bargain || {};
    return {
      title: this.data.shareMessage || '帮我砍一刀，把扎染作品带回家',
      path: '/pages/bargainDetail/bargainDetail?id=' + b.id
    };
  },

  onShareTimeline() {
    const b = this.data.bargain || {};
    return {
      title: this.data.shareMessage || '帮我把这件扎染作品带回家',
      query: 'id=' + (b.id || '')
    };
  }
});
