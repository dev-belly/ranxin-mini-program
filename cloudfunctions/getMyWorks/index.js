// 接口 7/8：getMyWorks —— 我的作品列表（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { list: [], hasMore: false }
  const page = event.page === undefined ? 1 : event.page
  const pageSize = event.pageSize === undefined ? 10 : event.pageSize
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize)
      || pageSize < 1 || pageSize > 100 || !Number.isSafeInteger(page * pageSize)) {
    throw new Error('分页参数无效：page 必须为正整数，pageSize 必须为 1—100 的整数')
  }
  const where = { _openid: OPENID }

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
