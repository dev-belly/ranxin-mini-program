// 接口 5/8：saveDraft —— 保存创作草稿（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const payload = event.payload || {}
  const data = {
    carrier: payload.carrier || '',
    patternId: payload.patternId || '',
    diyParams: payload.diyParams || {},
    dyeParams: payload.dyeParams || {},
    createdAt: Date.now()
  }
  const res = await db.collection('drafts').add({ data })
  return { draftId: res._id }
}
