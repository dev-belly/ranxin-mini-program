const AVATARS = {
  tuan: '/assets/patterns/tuan.jpg',
  shui: '/assets/patterns/shui.jpg',
  cang: '/assets/patterns/cang.jpg',
  he: '/assets/patterns/he.jpg',
  ling: '/assets/patterns/ling.jpg',
  hudie: '/assets/patterns/hudie.jpg'
};

// 当前版本尚未接入线上榜单接口，用分组展示数据保证每个榜单都有独立内容。
// 后续接入云端后，只需保持 rows / mine 的数据形状即可替换。
const RANKING_DATA = {
  user: {
    today: {
      rows: [
        { name: '@inkblue27', score: '128,432', avatar: AVATARS.tuan, label: '今日累计染力' },
        { name: '@cloud_dye', score: '97,310', avatar: AVATARS.shui },
        { name: '@xiao_ran77', score: '86,540', avatar: AVATARS.cang },
        { name: '@blue_mori', score: '73,280', avatar: AVATARS.he },
        { name: '@nightindigo', score: '68,910', avatar: AVATARS.ling },
        { name: '@dyewave', score: '61,752', avatar: AVATARS.hudie }
      ],
      mine: { name: '@ranxin_me', score: '28,432', avatar: AVATARS.ling, rank: 12 }
    },
    week: {
      rows: [
        { name: '@lanran_note', score: '482,760', avatar: AVATARS.shui, label: '本周累计染力' },
        { name: '@tie_dye_moon', score: '436,920', avatar: AVATARS.tuan },
        { name: '@slow_blue', score: '395,610', avatar: AVATARS.he },
        { name: '@wind_and_dye', score: '354,880', avatar: AVATARS.hudie },
        { name: '@cangshan_day', score: '328,450', avatar: AVATARS.cang },
        { name: '@quiet_stitch', score: '306,120', avatar: AVATARS.ling }
      ],
      mine: { name: '@ranxin_me', score: '163,280', avatar: AVATARS.ling, rank: 18 }
    },
    all: {
      rows: [
        { name: '@indigo_master', score: '3,286,420', avatar: AVATARS.cang, label: '累计染力总值' },
        { name: '@bai_tie_dye', score: '2,975,860', avatar: AVATARS.tuan },
        { name: '@blue_memory', score: '2,664,210', avatar: AVATARS.shui },
        { name: '@needle_flower', score: '2,438,900', avatar: AVATARS.he },
        { name: '@dali_breeze', score: '2,197,650', avatar: AVATARS.hudie },
        { name: '@mountain_dye', score: '1,986,320', avatar: AVATARS.ling }
      ],
      mine: { name: '@ranxin_me', score: '728,430', avatar: AVATARS.ling, rank: 31 }
    }
  },
  city: {
    today: {
      rows: [
        { name: '大理市', score: '326,840', avatar: AVATARS.cang, label: '今日城市染力' },
        { name: '昆明市', score: '298,760', avatar: AVATARS.shui },
        { name: '杭州市', score: '276,510', avatar: AVATARS.hudie },
        { name: '成都市', score: '251,880', avatar: AVATARS.tuan },
        { name: '上海市', score: '239,450', avatar: AVATARS.he },
        { name: '北京市', score: '218,320', avatar: AVATARS.ling }
      ],
      mine: { name: '大理市', score: '326,840', avatar: AVATARS.cang, rank: 1 }
    },
    week: {
      rows: [
        { name: '杭州市', score: '1,482,600', avatar: AVATARS.hudie, label: '本周城市染力' },
        { name: '大理市', score: '1,436,900', avatar: AVATARS.cang },
        { name: '成都市', score: '1,395,400', avatar: AVATARS.tuan },
        { name: '南京市', score: '1,354,800', avatar: AVATARS.he },
        { name: '昆明市', score: '1,328,500', avatar: AVATARS.shui },
        { name: '广州市', score: '1,306,100', avatar: AVATARS.ling }
      ],
      mine: { name: '大理市', score: '1,436,900', avatar: AVATARS.cang, rank: 2 }
    },
    all: {
      rows: [
        { name: '成都市', score: '9,286,400', avatar: AVATARS.tuan, label: '城市累计染力' },
        { name: '杭州市', score: '8,975,800', avatar: AVATARS.hudie },
        { name: '上海市', score: '8,664,200', avatar: AVATARS.he },
        { name: '大理市', score: '8,438,900', avatar: AVATARS.cang },
        { name: '北京市', score: '8,197,600', avatar: AVATARS.ling },
        { name: '昆明市', score: '7,986,300', avatar: AVATARS.shui }
      ],
      mine: { name: '大理市', score: '8,438,900', avatar: AVATARS.cang, rank: 4 }
    }
  }
};

function rankingView(topTab, subTab) {
  const group = RANKING_DATA[topTab][subTab];
  return {
    topUser: { ...group.rows[0], rank: 1 },
    list: group.rows.slice(1).map((item, index) => ({ ...item, rank: index + 2 })),
    myRank: { ...group.mine }
  };
}

Page({
  data: {
    topTab: 'user', // user | city
    subTab: 'today', // today | week | all
    ...rankingView('user', 'today')
  },

  applyRanking(topTab, subTab) {
    this.setData({ topTab, subTab, ...rankingView(topTab, subTab) });
  },

  switchTop(event) {
    const topTab = event.currentTarget.dataset.tab;
    if (!RANKING_DATA[topTab]) return;
    this.applyRanking(topTab, this.data.subTab);
  },

  switchSub(event) {
    const subTab = event.currentTarget.dataset.tab;
    if (!RANKING_DATA[this.data.topTab][subTab]) return;
    this.applyRanking(this.data.topTab, subTab);
  },

  goBack() { wx.navigateBack(); }
});
