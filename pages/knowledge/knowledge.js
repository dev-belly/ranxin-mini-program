// 归属：B｜核心交互 Owner（按 A 设计稿：非遗小知识 hub）
Page({
  data: {
    articles: [
      { type: 'oxidation', tag: '氧化的魔法', title: '板蓝根染液为什么会变蓝？', desc: '了解氧化背后的科学与自然。', icon: '🧪' },
      { type: 'pattern', tag: '纹样的秘密', title: '不同扎结方式，会形成怎样的纹样？', desc: '扎、缝、夹、缠，每一种都是自然印记。', icon: '🪡' },
      { type: 'why-blue', tag: '为什么不是蓝色？', title: '刚出缸的布，为何不蓝？', desc: '板蓝根靛蓝在空气中被氧化的奇妙变化。', icon: '💧' }
    ]
  },
  goArticle(e) {
    const { type } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article/article?type=' + type });
  }
});
