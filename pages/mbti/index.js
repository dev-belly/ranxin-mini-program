// 归属：B｜核心交互 Owner（按 A 设计稿：30 道情境题 · A/B/C/D）
// MBTI 扎染灵魂色彩测试：30 题 → 加权 ei/sn/tf/jp → 匹配 16 型 → 推荐纹样+色彩
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

// 30 道情境题，每题 4 选项（A/B/C/D），每个选项推动一个维度（ei/sn/tf/jp，+1/-1）
const QUESTIONS = [
  { title: '周末理想的充电方式？', options: [
    { label: '约上三五好友出门热闹', w: { ei: 1 } },
    { label: '一个人安静待着回血', w: { ei: -1 } },
    { label: '去没去过的小巷瞎逛', w: { sn: 1 } },
    { label: '按清单把待办一件件清空', w: { sn: -1 } }
  ]},
  { title: '看到一片意外的晚霞，你更可能？', options: [
    { label: '联想到某个未完成的计划', w: { sn: 1 } },
    { label: '注意到云层颜色和光线细节', w: { sn: -1 } },
    { label: '想立刻分享给在意的人', w: { tf: 1 } },
    { label: '默默记下发呆就好', w: { tf: -1 } }
  ]},
  { title: '朋友找你吐槽工作，你通常？', options: [
    { label: '先共情陪着 ta', w: { tf: 1 } },
    { label: '帮 ta 拆逻辑想解法', w: { tf: -1 } },
    { label: '顺手列个应对步骤', w: { jp: 1 } },
    { label: '陪 ta 先放松再说', w: { jp: -1 } }
  ]},
  { title: '面对一份新任务，你偏好？', options: [
    { label: '先列计划和时间表', w: { jp: 1 } },
    { label: '先看整体方向再灵活推进', w: { jp: -1 } },
    { label: '拉上同事一起头脑风暴', w: { ei: 1 } },
    { label: '自己先琢磨透了再动手', w: { ei: -1 } }
  ]},
  { title: '旅行你更爱？', options: [
    { label: '跟团热热闹闹', w: { ei: 1 } },
    { label: '独自深度游', w: { ei: -1 } },
    { label: '随性探索陌生角落', w: { sn: 1 } },
    { label: '打卡知名景点按计划走', w: { sn: -1 } }
  ]},
  { title: '一件作品打动你的是？', options: [
    { label: '巧思与想象空间', w: { sn: 1 } },
    { label: '质感与细节', w: { sn: -1 } },
    { label: '温度与故事', w: { tf: 1 } },
    { label: '结构与秩序', w: { tf: -1 } }
  ]},
  { title: '对"计划赶不上变化"，你更？', options: [
    { label: '先稳住对方情绪', w: { tf: 1 } },
    { label: '理性评估再调整', w: { tf: -1 } },
    { label: '重新排期', w: { jp: 1 } },
    { label: '顺其自然', w: { jp: -1 } }
  ]},
  { title: '聚会结束你更想？', options: [
    { label: '约下一顿', w: { ei: 1 } },
    { label: '独处回血', w: { ei: -1 } },
    { label: '复盘今晚收获', w: { jp: 1 } },
    { label: '记一笔感受就睡', w: { jp: -1 } }
  ]},
  { title: '学新东西你更爱？', options: [
    { label: '边聊边学', w: { ei: 1 } },
    { label: '自己啃', w: { ei: -1 } },
    { label: '抓大框架和联系', w: { sn: 1 } },
    { label: '一步步记细节', w: { sn: -1 } }
  ]},
  { title: '你眼中的"靠谱"更接近？', options: [
    { label: '总有新点子', w: { sn: 1 } },
    { label: '把事做扎实', w: { sn: -1 } },
    { label: '对人温柔体谅', w: { tf: 1 } },
    { label: '把事想明白', w: { tf: -1 } }
  ]},
  { title: '做决定时你更看重？', options: [
    { label: '感受和氛围', w: { tf: 1 } },
    { label: '逻辑和利弊', w: { tf: -1 } },
    { label: '有计划有交代', w: { jp: 1 } },
    { label: '能随机应变', w: { jp: -1 } }
  ]},
  { title: '一项任务，你偏好？', options: [
    { label: '列清单逐步推进', w: { jp: 1 } },
    { label: '随状态灵活推进', w: { jp: -1 } },
    { label: '和别人一起做', w: { ei: 1 } },
    { label: '自己琢磨透再做', w: { ei: -1 } }
  ]},
  { title: '人群里你一般？', options: [
    { label: '主动热场', w: { ei: 1 } },
    { label: '安静观察', w: { ei: -1 } },
    { label: '跟着灵感找新鲜', w: { sn: 1 } },
    { label: '跟着目标高效社交', w: { sn: -1 } }
  ]},
  { title: '写给未来的信，你更可能写？', options: [
    { label: '一堆奇思妙想', w: { sn: 1 } },
    { label: '具体的当下细节', w: { sn: -1 } },
    { label: '对重要的人说的话', w: { tf: 1 } },
    { label: '自己的思考梳理', w: { tf: -1 } }
  ]},
  { title: '室友熬夜吵到你，你会？', options: [
    { label: '委婉提醒顾及感受', w: { tf: 1 } },
    { label: '直接讲规则', w: { tf: -1 } },
    { label: '约法三章定规矩', w: { jp: 1 } },
    { label: '戴耳塞算了随它', w: { jp: -1 } }
  ]},
  { title: '周末计划被打乱，你？', options: [
    { label: '快速重排', w: { jp: 1 } },
    { label: '干脆躺平', w: { jp: -1 } },
    { label: '找人出去玩', w: { ei: 1 } },
    { label: '自己找点事做', w: { ei: -1 } }
  ]},
  { title: '你更常被哪种吸引？', options: [
    { label: '热闹的圈子', w: { ei: 1 } },
    { label: '一个人深度投入', w: { ei: -1 } },
    { label: '新奇的点子', w: { sn: 1 } },
    { label: '踏实能落地的事', w: { sn: -1 } }
  ]},
  { title: '选礼物你更看重？', options: [
    { label: '创意和惊喜感', w: { sn: 1 } },
    { label: '实用和品质', w: { sn: -1 } },
    { label: '对方喜不喜欢', w: { tf: 1 } },
    { label: '性价比和逻辑', w: { tf: -1 } }
  ]},
  { title: '团队里你更像？', options: [
    { label: '黏合关系的那个人', w: { tf: 1 } },
    { label: '指出问题的那个人', w: { tf: -1 } },
    { label: '推进节奏的人', w: { jp: 1 } },
    { label: '灵活补位的人', w: { jp: -1 } }
  ]},
  { title: '放假你更想？', options: [
    { label: '安排满满的行程', w: { jp: 1 } },
    { label: '留白随便过', w: { jp: -1 } },
    { label: '约朋友浪', w: { ei: 1 } },
    { label: '宅家独处', w: { ei: -1 } }
  ]},
  { title: '刷到有趣内容你会？', options: [
    { label: '立刻转发给好友', w: { ei: 1 } },
    { label: '默默收藏', w: { ei: -1 } },
    { label: '联想到别的事', w: { sn: 1 } },
    { label: '记住具体信息', w: { sn: -1 } }
  ]},
  { title: '你更相信？', options: [
    { label: '直觉和可能性', w: { sn: 1 } },
    { label: '经验和事实', w: { sn: -1 } },
    { label: '人和人之间的温度', w: { tf: 1 } },
    { label: '客观的判断', w: { tf: -1 } }
  ]},
  { title: '帮人你更倾向？', options: [
    { label: '陪伴和倾听', w: { tf: 1 } },
    { label: '给方案', w: { tf: -1 } },
    { label: '定个计划一起做', w: { jp: 1 } },
    { label: '看情况再帮', w: { jp: -1 } }
  ]},
  { title: '新环境你通常？', options: [
    { label: '先摸清规则和流程', w: { jp: 1 } },
    { label: '先感受氛围再说', w: { jp: -1 } },
    { label: '主动认识人', w: { ei: 1 } },
    { label: '先观察不开口', w: { ei: -1 } }
  ]},
  { title: '表达观点你更爱？', options: [
    { label: '聊出来碰撞', w: { ei: 1 } },
    { label: '写下来想清楚', w: { ei: -1 } },
    { label: '用比喻和画面', w: { sn: 1 } },
    { label: '用事实和条列', w: { sn: -1 } }
  ]},
  { title: '你更享受？', options: [
    { label: '头脑风暴的发散', w: { sn: 1 } },
    { label: '把事做细的踏实', w: { sn: -1 } },
    { label: '被人需要的感觉', w: { tf: 1 } },
    { label: '把事想透的清晰', w: { tf: -1 } }
  ]},
  { title: '冲突时你更？', options: [
    { label: '先照顾对方情绪', w: { tf: 1 } },
    { label: '先讲清楚对错', w: { tf: -1 } },
    { label: '定个解决步骤', w: { jp: 1 } },
    { label: '冷一冷再说', w: { jp: -1 } }
  ]},
  { title: '项目启动你更想？', options: [
    { label: '定目标和节点', w: { jp: 1 } },
    { label: '先试试看', w: { jp: -1 } },
    { label: '拉团队对齐', w: { ei: 1 } },
    { label: '自己先跑通', w: { ei: -1 } }
  ]},
  { title: '你理想的下班后？', options: [
    { label: '约人吃饭', w: { ei: 1 } },
    { label: '一个人静静', w: { ei: -1 } },
    { label: '尝试新鲜事', w: { sn: 1 } },
    { label: '做固定的 routine', w: { sn: -1 } }
  ]},
  { title: '你更想成为？', options: [
    { label: '点子很多的人', w: { sn: 1 } },
    { label: '做事很稳的人', w: { sn: -1 } },
    { label: '让人安心的人', w: { tf: 1 } },
    { label: '看得很透的人', w: { tf: -1 } }
  ]}
];

const LETTERS = ['A', 'B', 'C', 'D'];

Page({
  data: {
    step: 0,
    total: QUESTIONS.length,
    questions: QUESTIONS,
    letters: LETTERS,
    answers: [],
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
      ctx.fillStyle = '#fbfaf8'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#173d79';
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('染心 · 灵魂扎染', W / 2, 44);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#2a44c1';
      ctx.fillText('我是 ' + r.type + ' · ' + r.name, W / 2, 78);
      const p = engine.getPatternById(r.patternId);
      if (p) engine.renderBallPattern(ctx, W / 2, 200, 90, {
        type: p.type, petals: p.petals, tightness: 0.45, whitespace: 0.32,
        rotation: 0, dyeName: '板蓝根', concentration: 0.7, seed: 3
      });
      ctx.fillStyle = '#173d79'; ctx.font = '15px sans-serif';
      ctx.fillText(r.patternName + ' · ' + r.color, W / 2, 330);
      ctx.fillStyle = '#4f5f7a'; ctx.font = '12px sans-serif';
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
