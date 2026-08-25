/* 自定义 tabBar 组件：半透明玻璃胶囊，透出底层流动极光
   三个 tab 与 app.json tabBar.list 对应 */

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '情绪染坊' },
      { pagePath: '/pages/diy/diy',     text: '正念DIY' },
      { pagePath: '/pages/works/works', text: '我的作品' }
    ]
  },

  methods: {
    switchTab(e) {
      const idx = Number(e.currentTarget.dataset.index);
      const item = this.data.list[idx];
      if (!item) return;
      const url = item.pagePath;
      this.setData({ selected: idx });
      wx.showLoading({ title: '正在切换页面', mask: true });
      wx.switchTab({
        url,
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '页面加载失败，请重试', icon: 'none' });
        }
      });
    }
  }
});
