/* 制作进度（前端 mock）
 * TODO: 接入 C 后端：根据订单号拉取真实制作节点
 */
const STEPS = [
  { key: 'confirm', label: '作品确认', desc: '作品已确认，准备安排制作' },
  { key: 'sent', label: '已发送至合作工坊', desc: '作品已发送至云南大理合作工坊' },
  { key: 'tie', label: '正在扎结', desc: '今天，师傅正在给你的方巾扎结，每一针每一线都倾注着专注与心意。' },
  { key: 'dye', label: '植物染色', desc: '靛蓝天然植物染料，正慢慢渗透布料纤维。' },
  { key: 'dry', label: '清洗晾晒', desc: '清洗浮色后自然晾晒，等待阳光和风。' },
  { key: 'qc', label: '完成质检', desc: '质检师傅会检查每一处纹样细节。' },
  { key: 'ship', label: '寄出', desc: '作品已包装好，即将奔向你的手中。' }
];

Page({
  data: {
    order: null,
    steps: []
  },

  onLoad() {
    const order = wx.getStorageSync('ranxin_last_order') || {
      patternName: '雨落苍山',
      type: '方巾',
      previewImage: '/assets/patterns/cang.png',
      material: '棉麻',
      makingDays: '7-12 天'
    };
    // 模拟当前进度：前三个节点已完成，第4个进行中
    const activeIndex = 2;
    const steps = STEPS.map((s, i) => ({
      ...s,
      done: i <= activeIndex,
      active: i === activeIndex,
      date: i <= activeIndex ? this.mockDate(i) : '等待中'
    }));
    this.setData({ order, steps });
  },

  mockDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() - (2 - offset));
    return (d.getMonth() + 1).toString().padStart(2, '0') + '.' + d.getDate().toString().padStart(2, '0');
  },

  goWorks() {
    wx.switchTab({ url: '/pages/works/works' });
  },

  goBack() {
    wx.navigateBack();
  }
});
