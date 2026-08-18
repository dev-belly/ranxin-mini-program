// 接口 2/8：getPatterns —— 获取纹样列表（Owner: C）
// 真实实现：从 patterns 集合读取，支持 category / unlockedOnly 过滤
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { seedPatterns, getUnlockedPatternIds } = require('./shared/utils.js')

exports.main = async (event) => {
  // 自动初始化纹样主数据（幂等）
  await seedPatterns(db)

  const { OPENID } = cloud.getWXContext()
  let list = (await db.collection('patterns').get()).data || []

  if (event.category) {
    list = list.filter(p => p.category === event.category)
  }

  if (event.unlockedOnly && OPENID) {
    const unlockedIds = await getUnlockedPatternIds(db, OPENID)
    list = list.filter(p => p.unlockedByDefault || unlockedIds.indexOf(p.id) >= 0)
  }

  return list
}
