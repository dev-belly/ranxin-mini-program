// 接口 6/8：saveWork —— 保存/发布作品（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const payload = Object.assign({}, event.payload, { openid: OPENID, createdAt: Date.now() })
  // TODO(C) D3：const res = await db.collection('works').add({ data: payload }); return { workId: res._id }
  return { workId: 'work_' + Date.now() }
}
