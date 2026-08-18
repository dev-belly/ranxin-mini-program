// 接口 3/8：unlockPattern —— 解锁一个纹样（Owner: C）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { MOCK_PATTERNS } = require('../shared/patterns.js')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const patternId = event.patternId
  const pattern = MOCK_PATTERNS.find(p => p.id === patternId) || null
  // TODO(C) D2：await db.collection('user_patterns').add({ data: { openid: OPENID, patternId, source: event.source || {} } })
  return { isNew: true, pattern }
}
