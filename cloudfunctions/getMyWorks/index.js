// 接口 7/8：getMyWorks —— 我的作品列表（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const page = event.page || 1
  const pageSize = event.pageSize || 10
  // TODO(C) D3：从 works 集合按 openid 查询并分页：
  // const res = await db.collection('works').where({ openid: OPENID })
  //   .skip((page - 1) * pageSize).limit(pageSize).orderBy('createdAt', 'desc').get()
  // return { list: res.data, hasMore: (page * pageSize) < res.total }
  return { list: [], hasMore: false }
}
