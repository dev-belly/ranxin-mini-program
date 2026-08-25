// 一次性清理云函数：删除没有 _openid 的旧测试数据
// patterns（纹样内容库）是全局共享数据，绝不动它！
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 需要清理的用户数据集合（不含 patterns）
const COLLECTIONS = ['users', 'user_patterns', 'mbti_results', 'game_records', 'drafts', 'works']

exports.main = async (event) => {
  const dryRun = event && event.dryRun === true // 传 { "dryRun": true } 只统计不删除
  const report = {}

  for (const name of COLLECTIONS) {
    try {
      const where = { _openid: db.command.exists(false) }
      const countRes = await db.collection(name).where(where).count()
      const total = countRes.total

      if (dryRun || total === 0) {
        report[name] = { count: total, deleted: 0 }
        continue
      }

      // 分批删除（每批最多删 100 条，循环直到删完）
      let deleted = 0
      while (true) {
        const res = await db.collection(name).where(where).remove()
        const n = res.stats ? res.stats.removed : 0
        deleted += n
        if (n < 100) break // 删不到 100 条说明删完了
      }
      report[name] = { count: total, deleted: deleted }
    } catch (err) {
      // 集合可能不存在（比如 game_records 还没建）
      report[name] = { count: 0, deleted: 0, note: '集合不存在或跳过: ' + (err.errMsg || err.message) }
    }
  }

  return {
    mode: dryRun ? '预览模式（未删除任何数据）' : '正式删除',
    result: report,
    hint: dryRun ? '确认数字无误后，再用 {} 参数运行一次即可真删' : '清理完成'
  }
}
