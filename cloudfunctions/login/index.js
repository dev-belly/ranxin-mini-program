// 接口 1/8：login —— 登录，返回用户信息（Owner: C）
// 真实实现：用 cloud.getWXContext().OPENID 识别用户，首次登录写入 users 集合
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { user: null }
  }

  const users = db.collection('users')
  const res = await users.where({ _openid: OPENID }).limit(1).get()

  if (res.data.length > 0) {
    const user = res.data[0]
    return { user: Object.assign({ id: OPENID }, user) }
  }

  const now = Date.now()
  // 云函数内写入不会自动带 _openid，必须手动补，否则下次登录按 _openid 查不到（每次都会新建用户）
  const newUser = { nickname: '扎染旅人', createdAt: now, _openid: OPENID }
  await users.add({ data: newUser })
  return { user: Object.assign({ id: OPENID }, newUser) }
}
