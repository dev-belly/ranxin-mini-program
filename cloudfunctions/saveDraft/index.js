// 接口 5/8：saveDraft —— 保存创作草稿（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const payload = event.payload || {}
  const data = {
    carrier: payload.carrier || '',
    patternId: payload.patternId || '',
    diyParams: payload.diyParams || {},
    dyeParams: payload.dyeParams || {},
    createdAt: Date.now(),
    // 云函数内写入不会自动带 _openid，必须手动补
    _openid: OPENID || ''
  }
  const res = await db.collection('drafts').add({ data })
  return { draftId: res._id }
}
