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

  // 兼容历史数据：早期 createdAt 存的是数字时间戳，前端 works.js 用 .slice(0,10) 取日期，
  // 数字没有 slice 方法会抛异常导致列表空白，统一转成 ISO 字符串
  const list = (listRes.data || []).map(w => {
    const item = Object.assign({}, w)
    if (typeof item.createdAt === 'number') {
      item.createdAt = new Date(item.createdAt).toISOString()
    }
    return item
  })

  return {
    list,
    hasMore: page * pageSize < total
  }
}
