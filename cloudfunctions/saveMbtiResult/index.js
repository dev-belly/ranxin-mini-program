// 接口 4/8：saveMbtiResult —— 保存 MBTI 测试结果（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const payload = event.payload || {}
  const data = {
    answers: payload.answers || [],
    mbtiType: payload.mbtiType || '',
    patternId: payload.patternId || '',
    createdAt: Date.now(),
    // 云函数内写入不会自动带 _openid，必须手动补
    _openid: OPENID || ''
  }
  const res = await db.collection('mbti_results').add({ data })
  return { resultId: res._id }
}
