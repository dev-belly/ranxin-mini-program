// ============================================================
// 归属：C｜后端与技术 Owner —— 其他人（A/B）请勿修改本文件。
// 这里先放 Mock 骨架，C 后续替换为云函数 / 真实 API 调用。
// A/B 开发时直接 import 使用，待真实接口就绪即可无缝切换。
// ============================================================
const USE_MOCK = true; // C 接好后端后改为 false

const MOCK_PATTERNS = [
  { id: 'p1', name: '缠枝纹', thumb: '/assets/mock/p1.png' },
  { id: 'p2', name: '云雷纹', thumb: '/assets/mock/p2.png' }
];

function getPatterns() {
  if (USE_MOCK) return Promise.resolve(MOCK_PATTERNS);
  // TODO(C): 调用云函数或 request 获取纹样列表
  return Promise.resolve([]);
}

function saveWork(work) {
  if (USE_MOCK) return Promise.resolve({ ok: true, id: 'mock_' + Date.now() });
  // TODO(C): 写入云数据库
  return Promise.resolve({});
}

function getWork(id) {
  if (USE_MOCK) return Promise.resolve({ id, title: '示例作品' });
  // TODO(C): 从云数据库读取
  return Promise.resolve(null);
}

module.exports = { getPatterns, saveWork, getWork };
