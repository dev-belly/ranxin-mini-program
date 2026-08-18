// 接口 3/8：unlockPattern —— 解锁一个纹样（Owner: C）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { getPattern } = require('./shared/utils.js')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const patternId = event.patternId

  if (!OPENID || !patternId) {
    return { isNew: false, pattern: null }
  }

  const pattern = await getPattern(db, patternId)
  const exist = await db.collection('user_patterns')
    .where({ _openid: OPENID, patternId })
    .limit(1)
    .get()

  if (exist.data.length > 0) {
    return { isNew: false, pattern }
  }

  await db.collection('user_patterns').add({
    data: {
      patternId,
      source: event.source || {},
      createdAt: Date.now()
    }
  })

  return { isNew: true, pattern }
}
