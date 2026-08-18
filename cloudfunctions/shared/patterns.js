// 共享 Mock 纹样数据（与 utils/api.js 的 MOCK_PATTERNS 保持一致）
// C 接真后端后，这里的 id/name/thumb/story 应与 patterns 集合同步。
const MOCK_PATTERNS = [
  { id: 'hudie', name: '蝴蝶纹', category: '白族传统', thumb: '/assets/patterns/hudie.png', unlockedByDefault: true,  story: '象征自由与蜕变' },
  { id: 'tuan',  name: '团花纹', category: '白族传统', thumb: '/assets/patterns/tuan.png',  unlockedByDefault: true,  story: '象征圆满与团圆' },
  { id: 'shui',  name: '水波纹', category: '自然',     thumb: '/assets/patterns/shui.png',  unlockedByDefault: false, story: '象征流动与生命力' },
  { id: 'cang',  name: '山水纹', category: '自然',     thumb: '/assets/patterns/cang.png',  unlockedByDefault: false, story: '象征山河壮丽' },
  { id: 'ling',  name: '菱形纹', category: '几何',     thumb: '/assets/patterns/ling.png',  unlockedByDefault: false, story: '象征秩序与韵律' },
  { id: 'he',    name: '卷草纹', category: '白族传统', thumb: '/assets/patterns/he.png',    unlockedByDefault: false, story: '象征生生不息' }
]

module.exports = { MOCK_PATTERNS }
