// 归属：A｜产品前端 Owner（B 按染心第二章 2.1.1 实现算法逻辑）
// MBTI 扎染灵魂色彩测试：12 道情境题 → 加权标签重合度 → 匹配 16 型 → 推荐纹样+色彩
const api = require('../../utils/api.js');
const engine = require('../../utils/pattern-engine.js');

// 16 型 → 推荐纹样 + 色彩组合 + 文化寓意
const TYPE_TABLE = {
  INTJ: { name: '战略建筑师', pattern: 'cang', color: '蓝白冷色', story: '理性、结构化，如苍山雪纹般秩序而清冷。' },
  INTP: { name: '逻辑解构者', pattern: 'ling', color: '靛蓝单色', story: '独立思考，菱形纹的秩序感正合你。' },
  ENTJ: { name: '远见统帅', pattern: 'ling', color: '蓝金撞色', story: '掌控与远见，棱角分明的你。' },
  ENTP: { name: '点子发动机', pattern: 'hudie', color: '多色彩', story: '自由创意导向，蝴蝶纹随你飞舞。' },
  INFJ: { name: '温柔理想家', pattern: 'cang', color: '蓝紫渐变', story: '内心有光，山水之间见温柔。' },
  INFP: { name: '灵魂诗人', pattern: 'he', color: '柔彩晕染', story: '内心小世界，卷草纹生生不息。' },
  ENFJ: { name: '燃灯者', pattern: 'tuan', color: '暖色彩', story: '照亮他人，团花聚合如你。' },
  ENFP: { name: '自由精灵', pattern: 'hudie', color: '多色彩', story: '外向、创意导向，蝴蝶纹最自由。' },
  ISTJ: { name: '稳健守序者', pattern: 'ling', color: '靛蓝', story: '可靠踏实，菱形纹的秩序美。' },
  ISFJ: { name: '细心守护者', pattern: 'tuan', color: '暖蓝', story: '温柔守护，团花圆满。' },
  ESTJ: { name: '可靠安排者', pattern: 'ling', color: '蓝', story: '把一切安排妥当的人。' },
  ESFJ: { name: '温暖纽带', pattern: 'tuan', color: '暖彩', story: '人际里的温度，团花向心。' },
  ISTP: { name: '冷静手艺人', pattern: 'shui', color: '青蓝', story: '动手即静心，水波纹自在流动。' },
  ISFP: { name: '安静艺术家', pattern: 'he', color: '柔彩', story: '用感受作画，卷草纹温柔生长。' },
  ESTP: { name: '行动派', pattern: 'shui', color: '鲜蓝', story: '先做再说，水波灵动。' },
  ESFP: { name: '现场快乐源', pattern: 'hudie', color: '亮彩', story: '把快乐带到现场，蝴蝶般轻盈。' }
};

// 12 题：每选项推动一个维度（ei / sn / tf / jp）
const QUESTIONS = [
  { title: '周末理想的充电方式？', options: [
    { label: '约朋友出门热闹', w: { ei: 1 } },
    { label: '一个人安静待着', w: { ei: -1 } },
    { label: '去没去过的地方瞎逛', w: { sn: 1 } },
    { label: '按清单把待办清空', w: { jp: 1 } }
  ]},
  { title: '面对不确定的结果，你更倾向于？', options: [
    { label: '先行动再调整', w: { jp: -1 } },
    { label: '想清楚再动手', w: { jp: 1 } },
    { label: '相信直觉和感觉', w: { sn: 1 } },
    { label: '多听听别人意见', w: { tf: 1 } }
  ]},
  { title: '做决定时你更看重？', options: [
    { label: '逻辑和利弊', w: { tf: -1 } },
    { label: '感受和氛围', w: { tf: 1 } },
    { label: '已有的经验', w: { sn: -1 } },
    { label: '未来的可能性', w: { sn: 1 } }
  ]},
  { title: '朋友找你倾诉，你通常？', options: [
    { label: '先共情陪着', w: { tf: 1 } },
    { label: '帮 ta 分析问题', w: { tf: -1 } },
    { label: '带 ta 出去转转', w: { ei: 1 } },
    { label: '给个具体计划', w: { jp: 1 } }
  ]},
  { title: '你更常被哪种吸引？', options: [
    { label: '新奇的点子', w: { sn: 1 } },
    { label: '踏实能落地的事', w: { sn: -1 } },
    { label: '热闹的圈子', w: { ei: 1 } },
    { label: '一个人深度投入', w: { ei: -1 } }
  ]},
  { title: '一项任务，你偏好？', options: [
    { label: '列清单逐步推进', w: { jp: 1 } },
    { label: '随状态灵活推进', w: { jp: -1 } },
    { label: '和别人一起做', w: { ei: 1 } },
    { label: '自己琢磨透再做', w: { ei: -1 } }
  ]},
  { title: '你眼中的"靠谱"更接近？', options: [
    { label: '有计划有交代', w: { jp: 1 } },
    { label: '能随机应变', w: { jp: -1 } },
    { label: '对人温柔体谅', w: { tf: 1 } },
    { label: '把事想明白', w: { tf: -1 } }
  ]},
  { title: '学习新东西，你更爱？', options: [
    { label: '抓大框架和联系', w: { sn: 1 } },
    { label: '一步步记细节', w: { sn: -1 } },
    { label: '边做边学', w: { jp: -1 } },
    { label: '先系统学理论', w: { jp: 1 } }
  ]},
  { title: '人群里你一般？', options: [
    { label: '主动热场', w: { ei: 1 } },
    { label: '安静观察', w: { ei: -1 } },
    { label: '跟熟人扎堆', w: { tf: 1 } },
    { label: '找目标高效社交', w: { tf: -1 } }
  ]},
  { title: '一件作品打动你的是？', options: [
    { label: '巧思与想象', w: { sn: 1 } },
    { label: '质感与细节', w: { sn: -1 } },
    { label: '温度与故事', w: { tf: 1 } },
    { label: '结构与秩序', w: { tf: -1 } }
  ]},
  { title: '对"计划赶不上变化"的态度？', options: [
    { label: '正常，顺其自然', w: { jp: -1 } },
    { label: '有点烦，重排', w: { jp: 1 } },
    { label: '顺便看看新机会', w: { sn: 1 } },
    { label: '先稳住情绪', w: { tf: 1 } }
  ]},
  { title: '结束时你更想？', options: [
    { label: '约下一顿', w: { ei: 1 } },
    { label: '独处回血', w: { ei: -1 } },
    { label: '复盘收获', w: { tf: -1 } },
    { label: '记一笔感受', w: { tf: 1 } }
  ]}
];

Page({
  data: {
    step: 0,
    total: QUESTIONS.length,
    questions: QUESTIONS,
    answers: [], // 每题选中的 weight 向量
    result: null,
    posterPath: ''
  },

  choose(e) {
    const q = e.currentTarget.dataset.q;
    const w = QUESTIONS[q].options[e.currentTarget.dataset.o].w;
    const answers = this.data.answers.slice();
    answers[q] = w;
    const step = this.data.step + 1;
    this.setData({ answers, step });
    if (step >= QUESTIONS.length) this.finish();
  },

  finish() {
    const sum = { ei: 0, sn: 0, tf: 0, jp: 0 };
    this.data.answers.forEach(w => {
      if (!w) return;
      for (const k in w) sum[k] += w[k];
    });
    const type = (sum.ei > 0 ? 'E' : 'I') + (sum.sn > 0 ? 'N' : 'S') +
                 (sum.tf > 0 ? 'F' : 'T') + (sum.jp > 0 ? 'P' : 'J');
    const t = TYPE_TABLE[type] || TYPE_TABLE.INFP;
    const p = engine.getPatternById(t.pattern);
    const result = {
      type,
      name: t.name,
      patternId: t.pattern,
      patternName: p ? p.name : t.pattern,
      color: t.color,
      story: t.story,
      thumb: '/assets/patterns/' + t.pattern + '.png'
    };
    api.saveMbtiResult({ answers: this.data.answers, mbtiType: type, patternId: t.pattern }).then(() => {
      wx.setStorageSync('ranxin_diy_prefill', t.pattern);
      this.unlockPattern(t.pattern);
      this.setData({ result });
    });
  },

  unlockPattern(id) {
    let unlocked = wx.getStorageSync('ranxin_unlocked_patterns') || [];
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      wx.setStorageSync('ranxin_unlocked_patterns', unlocked);
    }
  },

  // 生成分享海报并保存相册
  makePoster() {
    const r = this.data.result;
    if (!r) return;
    const query = wx.createSelectorQuery();
    query.select('#share-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) { wx.showToast({ title: '海报生成失败', icon: 'none' }); return; }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const W = 300, H = 400;
      canvas.width = W; canvas.height = H;
      ctx.fillStyle = '#f4f6fb'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1a2b4d';
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('染心 · 灵魂扎染', W / 2, 44);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#4b6ee6';
      ctx.fillText('我是 ' + r.type + ' · ' + r.name, W / 2, 78);
      const p = engine.getPatternById(r.patternId);
      if (p) engine.renderBallPattern(ctx, W / 2, 200, 90, {
        type: p.type, petals: p.petals, tightness: 0.45, whitespace: 0.32,
        rotation: 0, dyeName: '板蓝根', concentration: 0.7, seed: 3
      });
      ctx.fillStyle = '#1a2b4d'; ctx.font = '15px sans-serif';
      ctx.fillText(r.patternName + ' · ' + r.color, W / 2, 330);
      ctx.fillStyle = '#6b7a99'; ctx.font = '12px sans-serif';
      ctx.fillText(r.story.slice(0, 18), W / 2, 358);
      wx.canvasToTempFilePath({
        canvas,
        x: 0, y: 0, width: W, height: H,
        destWidth: W, destHeight: H,
        success: (res2) => {
          this.setData({ posterPath: res2.tempFilePath });
          wx.saveImageToPhotosAlbum({
            filePath: res2.tempFilePath,
            success: () => wx.showToast({ title: '已存到相册', icon: 'success' }),
            fail: () => wx.showToast({ title: '请授权相册', icon: 'none' })
          });
        }
      });
    });
  },

  goDiy() { wx.switchTab({ url: '/pages/diy/diy' }); },
  restart() { this.setData({ step: 0, answers: [], result: null, posterPath: '' }); }
});
