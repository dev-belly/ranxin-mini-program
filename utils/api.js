// ============================================================
// 归属：C｜后端与技术 Owner —— 其他人（A/B）请勿修改本文件。
// 阶段：D2（真实云函数版）—— 已接入微信云开发。
// 协议：遵循《研发规范 V1.0》附录 A 的 8 个冻结接口。
// 切换：如需回退到 Mock 调试，把 USE_MOCK 改为 true 即可。
// 注意：字段 / 签名变更必须提前通知 A/B。
// ------------------------------------------------------------
// 注：本文件由 B 在整合阶段自 origin/c 合入 main，并统一了纹样显示名
//     （cang=山水纹 / he=卷草纹），与 B 的 utils/pattern-engine.js 及
//     assets/patterns/manifest.json 保持一致。
// ============================================================
const USE_MOCK = false;

// ------------------------------------------------------------
// Mock 数据区（保留，用于 USE_MOCK = true 时本地调试）
// 纹样 id 与 B 的 assets/patterns/manifest.json 命名保持一致
// ------------------------------------------------------------
const MOCK_PATTERNS = [
  { id: 'hudie', name: '蝴蝶纹', category: '白族传统', thumb: '/assets/patterns/hudie.png', unlockedByDefault: true },
  { id: 'tuan',  name: '团花纹', category: '白族传统', thumb: '/assets/patterns/tuan.png',  unlockedByDefault: true },
  { id: 'shui',  name: '水波纹', category: '自然',     thumb: '/assets/patterns/shui.png',  unlockedByDefault: false },
  { id: 'cang',  name: '山水纹', category: '自然',     thumb: '/assets/patterns/cang.png',  unlockedByDefault: false },
  { id: 'ling',  name: '菱形纹', category: '几何',     thumb: '/assets/patterns/ling.png',  unlockedByDefault: false },
  { id: 'he',    name: '卷草纹', category: '白族传统', thumb: '/assets/patterns/he.png',    unlockedByDefault: false }
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

// 统一调用云函数
function callCloud(name, data) {
  if (typeof wx === 'undefined') {
    return Promise.reject(new Error('wx.cloud 仅在小程序环境可用'));
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: data || {},
      success: res => resolve(res.result),
      fail: reject
    });
  });
}

// ============================================================
// 接口 1/8：login —— 登录，返回用户信息（Owner: C）
// 输入：{}
// 输出：{ user: { id, nickname, createdAt } }
// ============================================================
function login() {
  if (USE_MOCK) {
    return delay().then(() => ({
      user: { id: 'mock_user_001', nickname: '测试用户', createdAt: Date.now() }
    }));
  }
  return callCloud('login');
}

// ============================================================
// 接口 2/8：getPatterns —— 获取纹样列表（Owner: C）
// 输入：{ category?, unlockedOnly? }
// 输出：纹样数组（元素含 id / name / category / thumb / unlockedByDefault）
// ============================================================
function getPatterns(params) {
  params = params || {};
  if (USE_MOCK) {
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
  return callCloud('getPatterns', params);
}

// ============================================================
// 接口 3/8：unlockPattern —— 解锁一个纹样（Owner: C）
// 输入：patternId, source { sourceType?, sourceId? }
// 输出：{ isNew: Boolean, pattern: Object|null }
// ============================================================
function unlockPattern(patternId, source) {
  source = source || {};
  if (USE_MOCK) {
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
  return callCloud('unlockPattern', { patternId, source });
}

// ============================================================
// 接口 4/8：saveMbtiResult —— 保存 MBTI 测试结果（Owner: C/A）
// 输入：payload { answers, mbtiType, patternId }
// 输出：{ resultId }
// ============================================================
function saveMbtiResult(payload) {
  payload = payload || {};
  if (USE_MOCK) {
    return delay().then(() => ({ resultId: 'mbti_' + Date.now() }));
  }
  return callCloud('saveMbtiResult', { payload });
}

// ============================================================
// 接口 5/8：saveDraft —— 保存创作草稿（Owner: C/B）
// 输入：payload { carrier, patternId, diyParams, dyeParams }
// 输出：{ draftId }
// ============================================================
function saveDraft(payload) {
  payload = payload || {};
  if (USE_MOCK) {
    return delay().then(() => ({ draftId: 'draft_' + Date.now() }));
  }
  return callCloud('saveDraft', { payload });
}

// ============================================================
// 接口 6/8：saveWork —— 保存/发布作品（Owner: C/B）
// 输入：payload { draftId | finalPayload }
// 输出：{ workId }
// ============================================================
function saveWork(payload) {
  payload = payload || {};
  if (USE_MOCK) {
    return delay().then(() => {
      const works = readStorage('ranxin_works');
      const workId = 'work_' + Date.now();
      const record = Object.assign({}, payload, { workId });
      // 移除旧格式记录（页面手动写入、无 workId 的），避免重复
      const clean = works.filter(w => w && w.workId);
      clean.unshift(record);
      writeStorage('ranxin_works', clean);
      return { workId };
    });
  }
  return callCloud('saveWork', { payload });
}

// ============================================================
// 接口 7/8：getMyWorks —— 我的作品列表（Owner: C/A）
// 输入：{ page?, pageSize? }
// 输出：{ list, hasMore }
// ============================================================
function getMyWorks(params) {
  params = params || {};
  if (USE_MOCK) {
    return delay().then(() => {
      const local = readStorage('ranxin_works');
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const start = (page - 1) * pageSize;
      const list = local.slice(start, start + pageSize);
      return { list, hasMore: start + pageSize < local.length };
    });
  }
  return callCloud('getMyWorks', params);
}

// ============================================================
// 接口 8/8：submitGame —— 提交游戏成绩（Owner: C/B）
// 输入：payload { score, duration }
// 输出：{ reward: { patternId, pattern, score } }
// ============================================================
function submitGame(payload) {
  payload = payload || {};
  if (USE_MOCK) {
    return delay().then(() => {
      const pattern = MOCK_PATTERNS.find(p => p.id === 'shui') || null;
      return {
        reward: {
          patternId: 'shui',
          pattern,
          score: payload.score || 0
        }
      };
    });
  }
  return callCloud('submitGame', {
    score: payload.score,
    duration: payload.duration
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
