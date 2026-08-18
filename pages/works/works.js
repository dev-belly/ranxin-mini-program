// 归属：A｜产品前端 Owner
const api = require('../../utils/api.js');

const PATTERN_NAMES = {
  hudie: '蝴蝶纹', tuan: '团花纹', shui: '水波纹',
  cang: '山水纹', ling: '菱形纹', he: '卷草纹'
};

Page({
  data: { list: [], loading: true },
  onShow() { this.load(); },
  load() {
    this.setData({ loading: true });
    api.getMyWorks({ page: 1, pageSize: 50 }).then(res => {
      const list = (res.list || []).map(w => ({
        workId: w.workId,
        title: w.title || '未命名作品',
        patternId: w.patternId,
        patternName: PATTERN_NAMES[w.patternId] || w.patternId,
        date: (w.createdAt || '').slice(0, 10)
      }));
      this.setData({ list, loading: false });
    }).catch(() => this.setData({ list: [], loading: false }));
  },
  goDiy() {
    wx.switchTab({ url: '/pages/diy/diy' });
  }
});
