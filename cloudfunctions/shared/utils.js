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

// 自动初始化 patterns 集合（幂等：已有记录则跳过）
async function seedPatterns(db) {
  try {
    const { total } = await db.collection('patterns').count();
    if (total > 0) return; // 已经初始化过
    for (const p of SEED_PATTERNS) {
      await db.collection('patterns').add({ data: p });
    }
  } catch (e) {
    console.error('[seedPatterns] error:', e);
    // 忽略并发重复初始化导致的异常
  }
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
