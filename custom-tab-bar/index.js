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
      const url = this.data.list[idx].pagePath;
      this.setData({ selected: idx });
      wx.switchTab({ url });
    }
  }
});