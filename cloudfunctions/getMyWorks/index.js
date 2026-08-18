// 接口 7/8：getMyWorks —— 我的作品列表（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const where = OPENID ? { _openid: OPENID } : {}

  const totalRes = await db.collection('works').where(where).count()
  const total = totalRes.total || 0

  const listRes = await db.collection('works')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data || [],
    hasMore: page * pageSize < total
  }
}
