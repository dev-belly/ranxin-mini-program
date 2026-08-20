// 接口 6/8：saveWork —— 保存/发布作品（Owner: C/B）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
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
    // 云函数内写入不会自动带 _openid，必须手动补，否则 getMyWorks 按 _openid 查不到
    _openid: OPENID || '',
    // 用 ISO 字符串：前端 works.js 用 .slice(0,10) 取日期，数字时间戳会崩
    createdAt: new Date().toISOString()
  }
  const res = await db.collection('works').add({ data })
  return { workId: res._id }
}
