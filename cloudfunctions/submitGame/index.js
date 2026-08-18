// 接口 8/8：submitGame —— 提交游戏成绩（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { MOCK_PATTERNS } = require('../shared/patterns.js')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  // TODO(C) D2：await db.collection('game_scores').add({ data: { openid: OPENID, score: event.score, duration: event.duration } })
  const pattern = MOCK_PATTERNS.find(p => p.id === 'shui') || null
  return {
    reward: {
      patternId: 'shui', // Mock：完成游戏固定解锁水波纹
      pattern,
      score: event.score || 0
    }
  }
}
