// 接口 5/8：saveDraft —— 保存创作草稿（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const payload = Object.assign({}, event.payload, { openid: OPENID, createdAt: Date.now() })
  // TODO(C) D3：const res = await db.collection('drafts').add({ data: payload }); return { draftId: res._id }
  return { draftId: 'draft_' + Date.now() }
}
