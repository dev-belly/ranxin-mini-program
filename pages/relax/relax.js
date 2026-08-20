// 归属：B｜核心交互 Owner
Page({
  data: {
    started: false,
    phase: 'ready', // ready | inhale | hold | exhale
    hint: '跟随圆圈的起伏，慢慢呼吸',
    cycle: 0,
    maxCycles: 3,
    finished: false,
    dots: [0, 1, 2]
  },

  timer: null,

  onLoad() {
    // 页面加载后短暂提示，然后自动开始
    setTimeout(() => this.startBreath(), 600);
  },

  onUnload() {
    this.clearTimer();
  },

  startBreath() {
    this.setData({ started: true, phase: 'inhale', hint: '吸气…' });
    this.runCycle();
  },

  runCycle() {
    this.clearTimer();
    // 4-7-8 呼吸：吸气 4s，屏息 7s，呼气 8s
    this.timer = setTimeout(() => {
      this.setData({ phase: 'hold', hint: '屏住呼吸…' });
      this.timer = setTimeout(() => {
        this.setData({ phase: 'exhale', hint: '缓缓呼气…' });
        this.timer = setTimeout(() => {
          const next = this.data.cycle + 1;
          if (next >= this.data.maxCycles) {
            this.setData({ finished: true, phase: 'done', hint: '已完成今日放松' });
            this.finishRelax();
          } else {
            this.setData({ cycle: next, phase: 'inhale', hint: '吸气…' });
            this.runCycle();
          }
        }, 8000);
      }, 7000);
    }, 4000);
  },

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  finishRelax() {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let days = wx.getStorageSync('ranxin_relax_days') || 0;
    let todayCount = wx.getStorageSync('ranxin_relax_today') || 0;
    const lastDate = wx.getStorageSync('ranxin_relax_last_date') || '';

    if (lastDate !== todayKey) {
      todayCount = 0;
      days += 1;
    }
    todayCount += 1;

    wx.setStorageSync('ranxin_relax_days', days);
    wx.setStorageSync('ranxin_relax_today', todayCount);
    wx.setStorageSync('ranxin_relax_last_date', todayKey);

    wx.showToast({ title: `已坚持 ${days} 天`, icon: 'none', duration: 1500 });
  },

  onDone() {
    wx.navigateBack();
  }
});
