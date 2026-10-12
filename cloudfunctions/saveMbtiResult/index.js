// 接口 4/8：saveMbtiResult —— 保存 MBTI 测试结果（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('需要微信用户身份')
  const payload = event.payload || {}
  const data = {
    _openid: OPENID,
    answers: payload.answers || [],
    mbtiType: payload.mbtiType || '',
    patternId: payload.patternId || '',
    createdAt: Date.now()
  }
  const res = await db.collection('mbti_results').add({ data })
  return { resultId: res._id }
}
