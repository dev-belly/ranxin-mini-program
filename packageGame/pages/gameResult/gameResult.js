const RESULT_KEY = 'ranxin_game_result';

const GAME_ROUTES = {
  match3: '/packageGame/pages/game/game',
  merge: '/packageGame/pages/gameMerge/gameMerge'
};

const PATTERN_CATALOG = [
  { id: 'shui', name: '水波纹', thumb: '/packageGame/assets/patterns/shui.jpg' },
  { id: 'cang', name: '苍山纹', thumb: '/packageGame/assets/patterns/cang.jpg' },
  { id: 'ling', name: '菱形纹', thumb: '/packageGame/assets/patterns/ling.jpg' },
  { id: 'heling', name: '鹤翎纹', thumb: '/packageGame/assets/patterns/heling.jpg' },
  { id: 'tuan', name: '团花纹', thumb: '/packageGame/assets/patterns/tuan.jpg' },
  { id: 'hudie', name: '蝴蝶纹', thumb: '/packageGame/assets/patterns/hudie.jpg' }
];

function getPattern(id) {
  return PATTERN_CATALOG.find(item => item.id === id) || PATTERN_CATALOG[0];
}

function rememberPattern(id) {
  if (!id) return;
  try {
    const saved = wx.getStorageSync('ranxin_unlocked_patterns');
    const unlocked = Array.isArray(saved) ? saved.slice() : [];
    if (unlocked.indexOf(id) < 0) unlocked.push(id);
    wx.setStorageSync('ranxin_unlocked_patterns', unlocked);
  } catch (e) {}
}

Page({
  data: {
    source: 'match3',
    gameName: '经典三消',
    eyebrow: '游戏通关',
    title: '奖励收获',
    subtitle: '你的灵魂扎染之旅又多了一份美好印记',
    scoreDisplay: '0',
    stats: [],
    rewardLabel: '恭喜你获得',
    rewardId: 'shui',
    rewardName: '水波纹',
    rewardThumb: '/packageGame/assets/patterns/shui.jpg',
    rewardStory: '水波流转，让心绪慢慢松开。',
    message: '每一次专注与选择，都在靠近更真实的自己。',
    library: [],
    libraryTotal: 0
  },

  onLoad() {
    let result = null;
    try { result = wx.getStorageSync(RESULT_KEY); } catch (e) {}
    result = result && typeof result === 'object' ? result : {};

    const reward = Object.assign({}, getPattern(result.rewardId), result.reward || {});
    const score = Number(result.score) || 0;
    const stats = Array.isArray(result.stats) ? result.stats.slice(0, 3) : [];
    const libraryState = this._loadLibrary(reward.id || result.rewardId || 'shui');
    this.setData({
      source: GAME_ROUTES[result.source] ? result.source : 'match3',
      gameName: result.gameName || '经典三消',
      eyebrow: result.eyebrow || '游戏通关',
      title: result.title || '奖励收获',
      subtitle: result.subtitle || '你的灵魂扎染之旅又多了一份美好印记',
      scoreDisplay: score.toLocaleString(),
      stats,
      rewardLabel: result.rewardLabel || '恭喜你获得',
      rewardId: reward.id || result.rewardId || 'shui',
      rewardName: reward.name || '水波纹',
      rewardThumb: reward.thumb || '/packageGame/assets/patterns/shui.jpg',
      rewardStory: reward.story || '水波流转，让心绪慢慢松开。',
      message: result.message || '每一次专注与选择，都在靠近更真实的自己。',
      library: libraryState.items,
      libraryTotal: libraryState.total
    });
  },

  _loadLibrary(currentId) {
    let unlocked = [];
    try {
      const saved = wx.getStorageSync('ranxin_unlocked_patterns');
      unlocked = Array.isArray(saved) ? saved.slice() : [];
    } catch (e) {}
    if (unlocked.indexOf(currentId) < 0) unlocked.push(currentId);
    const items = unlocked.map(getPattern).filter((item, index, list) =>
      list.findIndex(candidate => candidate.id === item.id) === index
    );
    return { items: items.slice(-3), total: items.length };
  },

  goDiy() {
    const patternId = this.data.rewardId || 'shui';
    rememberPattern(patternId);
    try { wx.setStorageSync('ranxin_diy_prefill', patternId); } catch (e) {}
    wx.redirectTo({
      url: '/packageDiy/pages/flow/flow?stage=pattern&pattern=' + encodeURIComponent(patternId),
      fail: () => wx.switchTab({
        url: '/pages/diy/diy',
        fail: () => wx.showToast({ title: '正念 DIY 打开失败，请重试', icon: 'none' })
      })
    });
  },

  replay() {
    const route = GAME_ROUTES[this.data.source] || GAME_ROUTES.match3;
    wx.redirectTo({
      url: route,
      fail: () => wx.showToast({ title: '游戏打开失败，请重试', icon: 'none' })
    });
  },

  goRank() {
    wx.navigateTo({
      url: '/pages/rank/rank',
      fail: () => wx.showToast({ title: '排行榜打开失败，请重试', icon: 'none' })
    });
  },

  goGameHub() {
    wx.redirectTo({
      url: '/packageGame/pages/gameHub/gameHub',
      fail: () => wx.reLaunch({ url: '/pages/index/index' })
    });
  },

  onShareAppMessage() {
    return {
      title: '我在染心「' + this.data.gameName + '」获得了 ' + this.data.scoreDisplay + ' 分',
      path: '/pages/index/index'
    };
  }
});
