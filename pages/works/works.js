// 归属：A｜产品前端 Owner（B 按染心第二章 2.3 增强）
// Tab 3 我的作品与商城：作品档案（寓意/日志/筛选）+ 分享卡 + 定制实物/商城入口
const api = require('../../utils/api.js');
const engine = require('../../utils/pattern-engine.js');

Page({
  data: {
    loading: true,
    list: [],
    displayList: [],
    filter: 'all',
    filterOptions: [{ id: 'all', name: '全部' }]
  },

  onShow() {
    this.load();
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setData) tabBar.setData({ selected: 2 });
  },

  load() {
    this.setData({ loading: true });
    api.getMyWorks({ page: 1, pageSize: 50 }).then(res => {
      const seen = {};
      const list = (res.list || []).map(w => {
        const p = engine.getPatternById(w.patternId);
        const date = (w.createdAt || w.date || '').slice(0, 10);
        if (w.patternId && !seen[w.patternId]) {
          seen[w.patternId] = true;
        }
        return {
          workId: w.workId,
          title: w.title || (p ? p.name + ' 作品' : '未命名作品'),
          patternId: w.patternId,
          patternName: p ? p.name : (w.patternId || ''),
          story: p ? p.story : '',
          mindfulNote: w.mindfulNote || '',
          date,
          fabric: w.fabric || '',
          dyeName: w.dyeName || '',
          thumb: w.thumb || ''
        };
      });
      const filterOptions = [{ id: 'all', name: '全部' }].concat(
        Object.keys(seen).map(id => {
          const p = engine.getPatternById(id);
          return { id, name: p ? p.name : id };
        })
      );
      this.setData({ list, displayList: list, loading: false, filterOptions });
    }).catch(() => this.setData({ list: [], displayList: [], loading: false }));
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.id;
    const displayList = filter === 'all'
      ? this.data.list
      : this.data.list.filter(w => w.patternId === filter);
    this.setData({ filter, displayList });
  },

  // 生成作品分享卡并保存相册
  shareWork(e) {
    const w = this.data.displayList[e.currentTarget.dataset.i];
    if (!w) return;
    const query = wx.createSelectorQuery();
    query.select('#share-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) { wx.showToast({ title: '生成失败', icon: 'none' }); return; }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const W = 320, H = 420;
      canvas.width = W; canvas.height = H;
      ctx.fillStyle = '#fbfaf8'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#173d79'; ctx.textAlign = 'center';
      ctx.font = 'bold 22px sans-serif'; ctx.fillText('染心 · 我的作品', W / 2, 46);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#347af0';
      ctx.fillText(w.title, W / 2, 82);
      const p = engine.getPatternById(w.patternId);
      if (p) engine.renderBallPattern(ctx, W / 2, 210, 100, {
        type: p.type, petals: p.petals, tightness: 0.45, whitespace: 0.32,
        rotation: 0, dyeName: w.dyeName || '板蓝根', concentration: 0.7, seed: 7
      });
      ctx.fillStyle = '#173d79'; ctx.font = '15px sans-serif';
      ctx.fillText(w.patternName, W / 2, 350);
      if (w.mindfulNote) {
        ctx.fillStyle = '#4f5f7a'; ctx.font = '13px sans-serif';
        ctx.fillText('“' + w.mindfulNote.slice(0, 16) + '”', W / 2, 384);
      }
      wx.canvasToTempFilePath({
        canvas,
        x: 0, y: 0, width: W, height: H,
        destWidth: W, destHeight: H,
        success: (r2) => wx.saveImageToPhotosAlbum({
          filePath: r2.tempFilePath,
          success: () => wx.showToast({ title: '已存到相册', icon: 'success' }),
          fail: () => wx.showToast({ title: '请授权相册', icon: 'none' })
        }),
        fail: () => wx.showToast({ title: '生成失败', icon: 'none' })
      });
    });
  },

  // C2M 实物定制（C 后端职责，前端入口）
  customize(e) {
    const i = e.currentTarget.dataset.i;
    const w = (i != null && this.data.displayList[i]) ? this.data.displayList[i] : null;
    if (w) {
      wx.setStorageSync('ranxin_last_pattern_name', w.patternName || w.title || '雨落苍山');
      if (w.thumb) wx.setStorageSync('ranxin_last_pattern_image', w.thumb);
    }
    wx.navigateTo({ url: '/pages/product/product' });
  },
  openMall() {
    wx.navigateTo({ url: '/pages/product/product' });
  },

  goDiy() { wx.switchTab({ url: '/pages/diy/diy' }); }
});
