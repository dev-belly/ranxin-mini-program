// ============================================================
// 归属：C｜后端与技术 Owner —— 其他人（A/B）请勿修改本文件。
// 阶段：D1（Mock 版）—— 让 A/B 前端能调通数据，先不连真后端。
// 协议：遵循《研发规范 V1.0》附录 A 的 8 个冻结接口。
// 切换：C 接好云函数后，把 USE_MOCK 改为 false 即可无缝切换。
// 注意：字段 / 签名变更必须提前通知 A/B。
// ============================================================
const USE_MOCK = true;

// ------------------------------------------------------------
// Mock 数据区
// 纹样 id 与 B 的 assets/patterns/manifest.json 命名保持一致
// ------------------------------------------------------------
const MOCK_PATTERNS = [
  { id: 'hudie', name: '蝴蝶纹', category: 'natural',   thumb: '/assets/patterns/hudie.png', unlockedByDefault: true  },
  { id: 'tuan',  name: '团花纹', category: 'natural',   thumb: '/assets/patterns/tuan.png',  unlockedByDefault: true  },
  { id: 'shui',  name: '水波纹', category: 'natural',   thumb: '/assets/patterns/shui.png',  unlockedByDefault: false },
  { id: 'cang',  name: '苍山纹', category: 'landscape', thumb: '/assets/patterns/cang.png',  unlockedByDefault: false },
  { id: 'ling',  name: '菱形纹', category: 'geometric', thumb: '/assets/patterns/ling.png',  unlockedByDefault: false },
  { id: 'he',    name: '荷花纹', category: 'natural',   thumb: '/assets/patterns/he.png',    unlockedByDefault: false }
];

// 模拟网络延迟，让前端体验接近真实请求（200ms）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms || 200));
}

// 兼容 Node 测试环境：小程序里用 wx 本地存储，Node 里用空数组兜底
function readStorage(key) {
  if (typeof wx !== 'undefined') return wx.getStorageSync(key) || [];
  return [];
}
function writeStorage(key, value) {
  if (typeof wx !== 'undefined') wx.setStorageSync(key, value);
}

// ============================================================
// 接口 1/8：login —— 登录，返回用户信息（Owner: C）
// 输入：{}
// 输出：{ user: { id, nickname, createdAt } }
// ============================================================
function login() {
  if (!USE_MOCK) {
    // TODO(C): D2 起改为 wx.cloud.callFunction({ name: 'login' })
    return Promise.resolve({ user: null });
  }
  return delay().then(() => ({
    user: { id: 'mock_user_001', nickname: '测试用户', createdAt: Date.now() }
  }));
}

// ============================================================
// 接口 2/8：getPatterns —— 获取纹样列表（Owner: C）
// 输入：{ category?, unlockedOnly? }
// 输出：纹样数组（元素含 id / name / category / thumb / unlockedByDefault）
// 注：规范附录 A 写作 { list }，为兼容 B 已使用的裸数组形式，
//     Mock 阶段直接返回数组；D2 切云函数时与 A/B 确认统一格式。
// ============================================================
function getPatterns(params) {
  params = params || {};
  if (!USE_MOCK) {
    // TODO(C): D2 起改为云函数调用
    return Promise.resolve([]);
  }
  return delay().then(() => {
    let list = MOCK_PATTERNS.slice();
    if (params.category) {
      list = list.filter(p => p.category === params.category);
    }
    if (params.unlockedOnly) {
      const unlocked = readStorage('ranxin_unlocked_patterns');
      list = list.filter(p => p.unlockedByDefault || unlocked.indexOf(p.id) >= 0);
    }
    return list;
  });
}

// ============================================================
// 接口 3/8：unlockPattern —— 解锁一个纹样（Owner: C）
// 输入：patternId, source { sourceType?, sourceId? }
// 输出：{ isNew: Boolean, pattern: Object|null }
// ============================================================
function unlockPattern(patternId, source) {
  source = source || {};
  if (!USE_MOCK) {
    // TODO(C): D2 起改为云函数调用
    return Promise.resolve({ isNew: false, pattern: null });
  }
  return delay().then(() => {
    const pattern = MOCK_PATTERNS.find(p => p.id === patternId) || null;
    const unlocked = readStorage('ranxin_unlocked_patterns');
    const isNew = unlocked.indexOf(patternId) < 0;
    if (isNew && pattern) {
      unlocked.push(patternId);
      writeStorage('ranxin_unlocked_patterns', unlocked);
    }
    return { isNew, pattern };
  });
}

// ============================================================
// 接口 4/8：saveMbtiResult —— 保存 MBTI 测试结果（Owner: C/A）
// 输入：payload { answers, mbtiType, patternId }
// 输出：{ resultId }
// ============================================================
function saveMbtiResult(payload) {
  payload = payload || {};
  if (!USE_MOCK) {
    // TODO(C): D2 起改为云函数调用
    return Promise.resolve({ resultId: '' });
  }
  return delay().then(() => ({ resultId: 'mbti_' + Date.now() }));
}

// ============================================================
// 接口 5/8：saveDraft —— 保存创作草稿（Owner: C/B）
// 输入：payload { carrier, patternId, diyParams, dyeParams }
// 输出：{ draftId }
// ============================================================
function saveDraft(payload) {
  payload = payload || {};
  if (!USE_MOCK) {
    // TODO(C): D3 起改为云函数调用
    return Promise.resolve({ draftId: '' });
  }
  return delay().then(() => ({ draftId: 'draft_' + Date.now() }));
}

// ============================================================
// 接口 6/8：saveWork —— 保存/发布作品（Owner: C/B）
// 输入：payload { draftId | finalPayload }
// 输出：{ workId }
// ============================================================
function saveWork(payload) {
  payload = payload || {};
  if (!USE_MOCK) {
    // TODO(C): D3 起改为云函数调用
    return Promise.resolve({ workId: '' });
  }
  return delay().then(() => {
    const works = readStorage('ranxin_works');
    const workId = 'work_' + Date.now();
    const record = Object.assign({}, payload, { workId });
    // 移除旧格式记录（页面手动写入、无 workId 的），避免重复；
    // Mock 阶段由 api.js 统一负责“落库”，D3 切云函数后语义一致。
    const clean = works.filter(w => w && w.workId);
    clean.unshift(record);
    writeStorage('ranxin_works', clean);
    return { workId };
  });
}

// ============================================================
// 接口 7/8：getMyWorks —— 我的作品列表（Owner: C/A）
// 输入：{ page?, pageSize? }
// 输出：{ list, hasMore }
// ============================================================
function getMyWorks(params) {
  params = params || {};
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  if (!USE_MOCK) {
    // TODO(C): D3 起改为云函数调用
    return Promise.resolve({ list: [], hasMore: false });
  }
  return delay().then(() => {
    const local = readStorage('ranxin_works');
    const start = (page - 1) * pageSize;
    const list = local.slice(start, start + pageSize);
    return { list, hasMore: start + pageSize < local.length };
  });
}

// ============================================================
// 接口 8/8：submitGame —— 提交游戏成绩（Owner: C/B）
// 输入：payload { score, duration }
// 输出：{ reward: { patternId, pattern, score } }
// ============================================================
function submitGame(payload) {
  payload = payload || {};
  if (!USE_MOCK) {
    // TODO(C): D2 起改为云函数调用
    return Promise.resolve({ reward: null });
  }
  return delay().then(() => {
    const pattern = MOCK_PATTERNS.find(p => p.id === 'shui') || null;
    return {
      reward: {
        patternId: 'shui', // Mock：完成游戏固定解锁水波纹
        pattern: pattern,
        score: payload.score || 0
      }
    };
  });
}

// ------------------------------------------------------------
// 统一导出（8 个冻结接口）
// ------------------------------------------------------------
module.exports = {
  login,            // 1/8
  getPatterns,      // 2/8
  unlockPattern,    // 3/8
  saveMbtiResult,   // 4/8
  saveDraft,        // 5/8
  saveWork,         // 6/8
  getMyWorks,       // 7/8
  submitGame        // 8/8
};
