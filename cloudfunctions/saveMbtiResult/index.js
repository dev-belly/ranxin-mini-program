// 接口 4/8：saveMbtiResult —— 保存 MBTI 测试结果（Owner: C/A）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const payload = Object.assign({}, event.payload, { openid: OPENID, createdAt: Date.now() })
  // TODO(C) D2：const res = await db.collection('mbti_results').add({ data: payload }); return { resultId: res._id }
  return { resultId: 'mbti_' + Date.now() }
}
