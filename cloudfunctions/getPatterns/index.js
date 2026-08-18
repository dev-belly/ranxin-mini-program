// 接口 2/8：getPatterns —— 获取纹样列表（Owner: C）
// 真实实现：db.collection('patterns').get()，支持 category / unlockedOnly 过滤
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { MOCK_PATTERNS } = require('../shared/patterns.js')

exports.main = async (event) => {
  let list = MOCK_PATTERNS.slice()
  if (event.category) list = list.filter(p => p.category === event.category)
  if (event.unlockedOnly) {
    // TODO(C) D2：改为查询 user_patterns 集合拿到该用户已解锁的 id 再过滤
    list = list.filter(p => p.unlockedByDefault)
  }
  // TODO(C) D2：return (await db.collection('patterns').get()).data
  return list
}
