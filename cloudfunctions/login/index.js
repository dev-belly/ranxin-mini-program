// 接口 1/8：login —— 登录，返回用户信息（Owner: C）
// 真实实现：用 cloud.getWXContext().OPENID 识别用户，写入/读取 users 集合
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  // TODO(C) D2：const user = await db.collection('users').where({ openid: OPENID }).get()
  return {
    user: { id: OPENID || 'mock_user_001', nickname: '测试用户', createdAt: Date.now() }
  }
}
