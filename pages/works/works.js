// 归属：A｜产品前端 Owner（B 按染心第二章 2.3 增强）
// Tab 3 我的作品与商城：作品档案（寓意/日志/筛选）+ 分享卡 + 定制实物/商城入口
const api = require('../../utils/api.js');
const engine = require('../../utils/pattern-engine.js');

Page({
  data: {
    loading: true,
    loadError: false,
    list: [],
    displayList: [],
    filter: 'all',
    filterOptions: [{ id: 'all', name: '全部' }],
    userName: '染心用户',
    unlockedCount: 0,
    expandedWorkId: ''
  },

  onShow() {
    try { wx.hideLoading(); } catch (error) {}
    this.load();
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setData) tabBar.setData({ selected: 2 });
  },

  load() {
    this.setData({ loading: true, loadError: false });
    let userName = '染心用户';
    try {
      const user = wx.getStorageSync('ranxin_user') || {};
      userName = user.nickname || user.nickName || userName;
    } catch (err) {}
    Promise.all([
      api.getMyWorks({ page: 1, pageSize: 50 }),
      api.getPatterns({ unlockedOnly: true }).catch(() => [])
    ]).then(([res, unlockedPatterns]) => {
      const seen = {};
      const list = (res.list || []).map((w, index) => {
        const p = engine.getPatternById(w.patternId);
        const t = w.createdAt || w.date;
        const date = (typeof t === 'number')
          ? new Date(t).toISOString().slice(0, 10)
          : String(t || '').slice(0, 10);
        if (w.patternId && !seen[w.patternId]) {
          seen[w.patternId] = true;
        }
        const fallbackThumb = w.patternId ? '/assets/patterns/' + w.patternId + '.jpg' : '/assets/patterns/tuan.jpg';
        const dyeName = w.dyeName || '板蓝根';
        return {
          workId: w.workId || w._id || ('local_work_' + index),
          title: w.title || (p ? p.name + ' 作品' : '未命名作品'),
          patternId: w.patternId,
          patternName: w.patternName || (p ? p.name : (w.patternId || '')),
          story: w.story || (p ? p.story : ''),
          mindfulNote: w.mindfulNote || '',
          date,
          shortDate: date ? date.slice(5).replace('-', '.') : '',
          fabric: w.fabric || w.carrier || '',
          dyeName,
          filterId: 'dye:' + dyeName,
          thumb: w.thumb || '',
          fallbackThumb,
          displayThumb: w.thumb || fallbackThumb,
          orderStatus: w.orderStatus || '',
          statusLabel: w.orderStatus ? '制作中' : '可制作'
        };
      });
      const filterOptions = [{ id: 'all', name: '全部' }].concat(
        Array.from(new Set(list.map(w => w.dyeName))).map(name => ({ id: 'dye:' + name, name }))
      );
      this.setData({
        list,
        displayList: list,
        loading: false,
        loadError: false,
        filter: 'all',
        filterOptions,
        userName,
        unlockedCount: (unlockedPatterns || []).length,
        expandedWorkId: ''
      });
    }).catch(() => this.setData({ list: [], displayList: [], loading: false, loadError: true, userName }));
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.id;
    const displayList = filter === 'all'
      ? this.data.list
      : this.data.list.filter(w => w.filterId === filter);
    this.setData({ filter, displayList });
  },

  retryLoad() { this.load(); },

  toggleWorkActions(e) {
    const workId = e.currentTarget.dataset.id;
    this.setData({ expandedWorkId: this.data.expandedWorkId === workId ? '' : workId });
  },

  onThumbError(e) {
    const workId = e.currentTarget.dataset.id;
    const displayIndex = this.data.displayList.findIndex(w => w.workId === workId);
    const listIndex = this.data.list.findIndex(w => w.workId === workId);
    const target = displayIndex >= 0 ? this.data.displayList[displayIndex] : null;
    if (!target || target.displayThumb === target.fallbackThumb) return;
    const patch = {};
    patch[`displayList[${displayIndex}].displayThumb`] = target.fallbackThumb;
    if (listIndex >= 0) patch[`list[${listIndex}].displayThumb`] = target.fallbackThumb;
    this.setData(patch);
  },

  findWorkFromEvent(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
    const workId = dataset.id;
    if (workId) return this.data.list.find(w => w.workId === workId);
    const i = dataset.i;
    return i != null ? this.data.displayList[i] : null;
  },

  drawPosterArtwork(canvas, ctx, w, done) {
    const fallback = () => {
      const p = engine.getPatternById(w.patternId);
      if (p) engine.renderBallPattern(ctx, 160, 210, 112, {
        type: p.type, petals: p.petals, tightness: 0.45, whitespace: 0.32,
        rotation: 0, dyeName: w.dyeName || '板蓝根', concentration: 0.7, seed: 7
      });
      done();
    };
    if (!w.displayThumb || !canvas.createImage) { fallback(); return; }
    const img = canvas.createImage();
    img.onload = () => {
      const sw = img.width || 1;
      const sh = img.height || 1;
      const boxX = 38, boxY = 100, boxW = 244, boxH = 220;
      const scale = Math.max(boxW / sw, boxH / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.clip();
      ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
      ctx.restore();
      done();
    };
    img.onerror = fallback;
    img.src = w.displayThumb;
  },

  // 使用真实作品缩略图生成分享卡并保存相册
  shareWork(e) {
    const w = this.findWorkFromEvent(e);
    if (!w) return;
    this._shareTarget = w;
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
      this.drawPosterArtwork(canvas, ctx, w, () => {
        ctx.fillStyle = '#173d79'; ctx.font = '15px sans-serif';
        ctx.fillText((w.patternName || '专属纹样') + ' · ' + (w.shortDate || ''), W / 2, 350);
        if (w.mindfulNote) {
          ctx.fillStyle = '#4f5f7a'; ctx.font = '13px sans-serif';
          ctx.fillText('“' + w.mindfulNote.slice(0, 16) + '”', W / 2, 384);
        }
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width: W, height: H,
          destWidth: W, destHeight: H,
          success: (r2) => {
            this._lastPosterPath = r2.tempFilePath;
            wx.saveImageToPhotosAlbum({
              filePath: r2.tempFilePath,
              success: () => wx.showToast({ title: '已存到相册', icon: 'success' }),
              fail: () => wx.showToast({ title: '请在设置中允许保存相册', icon: 'none' })
            });
          },
          fail: () => wx.showToast({ title: '生成失败', icon: 'none' })
        });
      });
    });
  },

  rememberShareTarget(e) {
    this._shareTarget = this.findWorkFromEvent(e);
  },

  onShareAppMessage(e) {
    const w = (e && e.from === 'button') ? this.findWorkFromEvent(e) : this._shareTarget;
    return {
      title: w ? '这是我在染心创作的「' + w.title + '」' : '来看看我的扎染作品',
      path: '/pages/works/works',
      imageUrl: (w && w.displayThumb) || this._lastPosterPath || ''
    };
  },

  // C2M 实物定制（C 后端职责，前端入口）
  customize(e) {
    // 卡片按钮用指定作品；底部“定制我的作品”没有 id，默认取最新一件。
    const w = this.findWorkFromEvent(e) || this.data.list[0];
    if (w) {
      wx.setStorageSync('ranxin_last_pattern_name', w.patternName || w.title || '雨落苍山');
      if (w.displayThumb) wx.setStorageSync('ranxin_last_pattern_image', w.displayThumb);
    }
    wx.navigateTo({ url: '/pages/product/product' });
  },
  openMall() {
    wx.navigateTo({ url: '/pages/product/product' });
  },

  goDiy() { wx.switchTab({ url: '/pages/diy/diy' }); }
});
