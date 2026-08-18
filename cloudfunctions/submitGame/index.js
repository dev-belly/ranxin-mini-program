// 接口 8/8：submitGame —— 提交游戏成绩（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { getPattern, getUnlockedPatternIds, SEED_PATTERNS } = require('./shared/utils.js')

// 游戏解锁顺序：分数≥100 时按顺序解锁下一个未解锁纹样
const UNLOCK_ORDER = ['shui', 'cang', 'ling', 'he']

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const score = Number(event.score) || 0
  const duration = Number(event.duration) || 0

  // 1. 记录成绩
  await db.collection('game_scores').add({
    data: { score, duration, createdAt: Date.now() }
  })

  // 2. 分数不足 100：只记录成绩，不奖励纹样
  if (score < 100 || !OPENID) {
    return { reward: { patternId: '', pattern: null, score } }
  }

  // 3. 分数≥100：解锁下一个未解锁纹样
  const unlockedIds = await getUnlockedPatternIds(db, OPENID)
  const defaultUnlocked = SEED_PATTERNS.filter(p => p.unlockedByDefault).map(p => p.id)
  const allUnlocked = Array.from(new Set([...defaultUnlocked, ...unlockedIds]))
  const nextId = UNLOCK_ORDER.find(id => allUnlocked.indexOf(id) < 0)

  if (!nextId) {
    return { reward: { patternId: '', pattern: null, score } }
  }

  const exist = await db.collection('user_patterns')
    .where({ _openid: OPENID, patternId: nextId })
    .limit(1)
    .get()

  if (exist.data.length === 0) {
    await db.collection('user_patterns').add({
      data: {
        patternId: nextId,
        source: { sourceType: 'game' },
        createdAt: Date.now()
      }
    })
  }

  const pattern = await getPattern(db, nextId)
  return { reward: { patternId: nextId, pattern, score } }
}
