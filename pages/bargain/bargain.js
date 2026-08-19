/* 好友砍价大厅（前端 mock）
 * TODO: 接入 C 后端：拉取我的砍价列表 / 更新帮砍记录
 */
const MOCK_ONGOING = [
  {
    id: 'b_1',
    patternName: '雨落苍山',
    type: '方巾',
    previewImage: '/assets/patterns/cang.png',
    originalPrice: 169,
    currentPrice: 123,
    targetPrice: 89,
    cutTotal: 46,
    needCut: 34,
    helpers: [1, 2, 3, 4],
    status: 'ongoing'
  },
  {
    id: 'b_2',
    patternName: '云见之蓝',
    type: '抱枕',
    previewImage: '/assets/patterns/shui.png',
    originalPrice: 129,
    currentPrice: 99,
    targetPrice: 79,
    cutTotal: 30,
    needCut: 20,
    helpers: [1, 2, 3],
    status: 'ongoing'
  },
  {
    id: 'b_3',
    patternName: '水波轻响',
    type: '茶席',
    previewImage: '/assets/patterns/tuan.png',
    originalPrice: 199,
    currentPrice: 166,
    targetPrice: 129,
    cutTotal: 33,
    needCut: 37,
    helpers: [1, 2, 3, 4, 5],
    status: 'ongoing'
  }
];

const MOCK_COMPLETED = [
  {
    id: 'b_4',
    patternName: '栀子朝阳',
    type: '帆布袋',
    previewImage: '/assets/patterns/ling.png',
    originalPrice: 149,
    currentPrice: 99,
    targetPrice: 99,
    cutTotal: 50,
    needCut: 0,
    helpers: [1, 2, 3, 4],
    status: 'completed',
    result: '已下单制作'
  }
];

Page({
  data: {
    tabs: [
      { key: 'ongoing', label: '正在进行' },
      { key: 'completed', label: '已完成' }
    ],
    activeTab: 'ongoing',
    ongoingList: [],
    completedList: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const storageList = wx.getStorageSync('ranxin_bargain_list') || [];
    // 合并本地 mock + storage
    const ongoing = [...storageList.filter(x => x.status === 'ongoing'), ...MOCK_ONGOING];
    const completed = [...storageList.filter(x => x.status === 'completed'), ...MOCK_COMPLETED];
    // 去重
    const dedup = (arr) => {
      const seen = new Set();
      return arr.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };
    this.setData({
      ongoingList: dedup(ongoing),
      completedList: dedup(completed)
    });
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/bargainDetail/bargainDetail?id=' + id });
  },

  goBack() {
    wx.navigateBack();
  }
});
