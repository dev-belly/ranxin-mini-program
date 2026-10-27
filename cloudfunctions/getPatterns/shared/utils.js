// ============================================================
// 归属：C｜云函数共享工具
// 职责：数据库初始化、公共查询函数
// ============================================================
const { MOCK_PATTERNS } = require('./patterns.js');

// 为 patterns 集合补齐 story 字段后作为种子数据
const SEED_PATTERNS = MOCK_PATTERNS.map(p => {
  const storyMap = {
    hudie: '象征自由与蜕变',
    tuan:  '象征圆满与团圆',
    shui:  '象征流动与生命力',
    cang:  '象征山河壮丽',
    ling:  '象征秩序与韵律',
    he:    '象征生生不息'
  };
  return Object.assign({}, p, { story: storyMap[p.id] || '' });
});

// 补齐缺少的种子纹样；已有业务 id 的记录（包括旧的随机 _id）保持不变。
async function seedPatterns(db) {
  const patterns = db.collection('patterns');
  for (const p of SEED_PATTERNS) {
    const existing = await patterns.where({ id: p.id }).limit(1).get();
    if (existing.data.length === 0) {
      // 固定 _id 使并发首次请求写入同一记录，避免 add 生成重复纹样。
      await patterns.doc(`seed-${p.id}`).set({ data: p });
    }
  }
  // 失败向上传递，不能把不完整目录当作成功；下次请求会继续补齐。
}

// 按 id 查询单个纹样
async function getPattern(db, patternId) {
  const res = await db.collection('patterns').where({ id: patternId }).limit(1).get();
  return res.data[0] || null;
}

// 获取某用户已解锁的纹样 id 列表
async function getUnlockedPatternIds(db, openid) {
  const res = await db.collection('user_patterns').where({ _openid: openid }).get();
  return res.data.map(item => item.patternId);
}

module.exports = {
  SEED_PATTERNS,
  seedPatterns,
  getPattern,
  getUnlockedPatternIds
};
