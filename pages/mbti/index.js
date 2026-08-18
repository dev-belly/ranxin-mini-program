// 归属：A｜产品前端 Owner
const api = require('../../utils/api.js');

const PATTERNS = {
  hudie: { name: '蝴蝶纹', story: '轻盈展翅，寓意破茧新生，适合需要力量的时刻。' },
  tuan:  { name: '团花纹', story: '圆满聚合，如花开当庭，带来安定与归属感。' },
  shui:  { name: '水波纹', story: '连续折叠形成自然流线，象征流动、松弛与不过度控制。' },
  cang:  { name: '山水纹', story: '苍山洱海入布，寓意乐山乐水、道法自然。' },
  ling:  { name: '菱形纹', story: '菱形秩序，象征稳定与清晰，适合整理思绪。' },
  he:    { name: '卷草纹', story: '卷草绵延，象征生生不息，于流转中见韧性。' }
};

Page({
  data: {
    step: 0,
    result: null,
    answers: [],
    questions: [
      {
        title: '你现在最想……',
        options: [
          { label: '自由舒展', pid: 'hudie' },
          { label: '团聚安定', pid: 'tuan' },
          { label: '松弛流动', pid: 'shui' },
          { label: '静看山水', pid: 'cang' },
          { label: '理清秩序', pid: 'ling' },
          { label: '温柔生长', pid: 'he' }
        ]
      },
      {
        title: '你的情绪底色偏……',
        options: [
          { label: '轻盈', pid: 'hudie' },
          { label: '温暖', pid: 'tuan' },
          { label: '平静', pid: 'shui' },
          { label: '悠然', pid: 'cang' },
          { label: '冷静', pid: 'ling' },
          { label: '柔软', pid: 'he' }
        ]
      },
      {
        title: '想送给未来的自己……',
        options: [
          { label: '一次新生', pid: 'hudie' },
          { label: '一份圆满', pid: 'tuan' },
          { label: '事事顺遂', pid: 'shui' },
          { label: '自在如风', pid: 'cang' },
          { label: '思路清晰', pid: 'ling' },
          { label: '柔韧不拔', pid: 'he' }
        ]
      }
    ]
  },
  choose(e) {
    const q = e.currentTarget.dataset.q;
    const pid = e.currentTarget.dataset.pid;
    const answers = this.data.answers.slice();
    answers[q] = pid;
    const step = this.data.step + 1;
    this.setData({ answers, step });
    if (step >= this.data.questions.length) this.finish();
  },
  finish() {
    const counts = {};
    this.data.answers.forEach(pid => { counts[pid] = (counts[pid] || 0) + 1; });
    let best = this.data.answers[0], max = -1;
    Object.keys(counts).forEach(k => { if (counts[k] > max) { max = counts[k]; best = k; } });
    const p = PATTERNS[best];
    const result = { id: best, name: p.name, story: p.story, thumb: '/assets/patterns/' + best + '.png' };
    api.saveMbtiResult({ answers: this.data.answers, mbtiType: best, patternId: best }).then(() => {
      wx.setStorageSync('ranxin_diy_prefill', best);
      this.setData({ result });
    });
  },
  goDiy() { wx.switchTab({ url: '/pages/diy/diy' }); },
  restart() { this.setData({ step: 0, answers: [], result: null }); }
});
