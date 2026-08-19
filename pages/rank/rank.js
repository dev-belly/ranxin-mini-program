const MOCK_USERS = [
  { rank: 1, name: '@inkblue27', score: 1284320, avatar: '/assets/patterns/tuan.png', label: '今日累计解压' },
  { rank: 2, name: '@cloud_dye', score: 987654, avatar: '/assets/patterns/shui.png' },
  { rank: 3, name: '@xiao_ran77', score: 765432, avatar: '/assets/patterns/cang.png' },
  { rank: 4, name: '@blue_mori', score: 632110, avatar: '/assets/patterns/he.png' },
  { rank: 5, name: '@nightindigo', score: 543221, avatar: '/assets/patterns/ling.png' },
  { rank: 6, name: '@dyewave', score: 487652, avatar: '/assets/patterns/die.png' }
];

Page({
  data: {
    topTab: 'user', // user | city
    subTab: 'today', // today | week | all
    topUser: MOCK_USERS[0],
    list: MOCK_USERS.slice(1),
    myRank: { name: '@ranxin_me', score: 284320, avatar: '/assets/patterns/die.png', rank: 12 }
  },
  switchTop(e) { this.setData({ topTab: e.currentTarget.dataset.tab }); },
  switchSub(e) { this.setData({ subTab: e.currentTarget.dataset.tab }); },
  goBack() { wx.navigateBack(); }
});
