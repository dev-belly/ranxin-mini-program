// 接口 6/8：saveWork —— 保存/发布作品（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const payload = event.payload || {}
  const data = {
    title: payload.title || '',
    patternId: payload.patternId || '',
    thumb: payload.thumb || '',
    carrier: payload.carrier || '',
    mood: payload.mood || '',
    dyeName: payload.dyeName || '',
    concentration: payload.concentration || '',
    oxidationTime: payload.oxidationTime || '',
    untieMethod: payload.untieMethod || '',
    mindfulNote: payload.mindfulNote || '',
    createdAt: Date.now()
  }
  const res = await db.collection('works').add({ data })
  return { workId: res._id }
}
