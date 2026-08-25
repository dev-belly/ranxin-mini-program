// 2.7 DIY海报记录 · 作品海报页（对齐 HTML：作品海报展示 + 保存海报 + 分享 + 把作品变成实物）
// 数据来源：ranxin_works[0]（最新作品）或 ranxin_last_work；海报用 canvas 按 2.7 版式合成
const api = require('../../utils/api.js');
const engine = require('../../utils/pattern-engine.js');

// 海报画布逻辑尺寸（对齐 HTML poster 795×1632，等比例缩放到 320×656）
const PW = 320, PH = 656;

Page({
  data: {
    work: null,
    posterImage: '',
    posterError: false,
    title: '作品海报',
    patternName: '',
    meta: '',
    story: '',
    code: '',
    date: '',
    saving: false,
    showRealModal: false,
    navBarStyle: 'padding-top:20px;height:32px;',
    navControlStyle: 'top:36px;',
    shareButtonStyle: 'right:0;top:36px;',
    products: [
      { id: 'scarf',  label: '方巾',   image: '/assets/patterns/scarf.png' },
      { id: 'pillow', label: '抱枕',   image: '/assets/patterns/pillow.png' },
      { id: 'bag',    label: '帆布袋', image: '/assets/patterns/bag.png' },
      { id: 'cloth',  label: '茶席',   image: '/assets/patterns/cloth.png' }
    ],
    selectedProduct: 'scarf'
  },

  onLoad(opts) {
    opts = opts || {};
    const navigationLayout = this._buildNavigationLayout();
    let work = null;
    try {
      const list = wx.getStorageSync('ranxin_works') || [];
      if (list && list.length) work = list[0];
    } catch (e) {}
    if (!work) {
      try { work = wx.getStorageSync('ranxin_last_work') || null; } catch (e) {}
    }
    if (!work) {
      work = {
        title: '海潮花影 · 方巾',
        patternName: '海潮花影',
        patternId: 'hudie',
        story: '蝴蝶的振翅，化作靛蓝里的花影。',
        dyeName: '板蓝根',
        concentration: 60,
        fabric: '方巾',
        createdAt: new Date().toISOString()
      };
    }
    const pattern = engine.getPatternById(work.patternId);
    const name = work.patternName || (pattern ? pattern.name : '');
    const story = work.story || (pattern ? pattern.story : '') || '每一块布，都有自己的呼吸。';
    const date = this._formatDate(work.createdAt);
    const code = this._buildCode(work, date);
    this._work = work;
    this.setData({
      work,
      patternName: name,
      meta: (work.dyeName || '板蓝根') + ' · 浓度' + (work.concentration || 60) + '% · ' + (work.fabric || '方巾'),
      story,
      code,
      date,
      navBarStyle: navigationLayout.navBarStyle,
      navControlStyle: navigationLayout.navControlStyle,
      shareButtonStyle: navigationLayout.shareButtonStyle,
      selectedProduct: opts.type || (work.carrierId || 'scarf')
    });
    // 若指定了载体，直接预填
    if (opts.type && this.data.products.some(p => p.id === opts.type)) {
      this.setData({ selectedProduct: opts.type });
    }
  },

  onReady() {
    this._posterRetryTimer = setTimeout(() => this._renderPoster(0), 80);
  },

  onResize() {
    this.setData(this._buildNavigationLayout());
  },

  onUnload() {
    if (this._posterRetryTimer) clearTimeout(this._posterRetryTimer);
  },

  _buildNavigationLayout() {
    let windowInfo = { windowWidth: 375 };
    try {
      windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {}
    const windowWidth = Number(windowInfo.windowWidth) || 375;
    const rpx = windowWidth / 750;
    const pageGutter = 32 * rpx;
    const buttonWidth = 56 * rpx;
    const capsuleGap = 16 * rpx;
    const maxLeft = Math.max(0, windowWidth - pageGutter * 2 - buttonWidth);
    let left = maxLeft;
    let controlTop = Number(windowInfo.statusBarHeight) || 20;
    let controlHeight = 64 * rpx;
    try {
      const capsule = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (capsule && Number.isFinite(Number(capsule.left)) && Number(capsule.left) > 0) {
        // 胶囊坐标相对视口；按钮 left 相对去掉 32rpx 页面边距后的 nav-bar。
        left = Number(capsule.left) - capsuleGap - buttonWidth - pageGutter;
      }
      if (capsule && Number.isFinite(Number(capsule.top)) && Number(capsule.top) >= 0) {
        controlTop = Number(capsule.top);
      }
      if (capsule && Number.isFinite(Number(capsule.height)) && Number(capsule.height) > 0) {
        controlHeight = Number(capsule.height);
      }
    } catch (e) {}
    left = Math.max(0, Math.min(maxLeft, left));
    const round = (value) => Math.round(value * 10) / 10;
    const centerY = controlTop + controlHeight / 2;
    return {
      navBarStyle: 'padding-top:' + round(controlTop) + 'px;height:' + round(controlHeight) + 'px;',
      navControlStyle: 'top:' + round(centerY) + 'px;',
      shareButtonStyle: 'left:' + round(left) + 'px;top:' + round(centerY) + 'px;'
    };
  },

  _formatDate(t) {
    try {
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) return '';
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const yy = d.getFullYear().toString().slice(-2);
      return mm + '.' + dd + '.' + yy;
    } catch (e) { return ''; }
  },

  _buildCode(work, date) {
    // 作品编码 RX-ZR-YYYYMMDD-NNN（对齐 HTML 示例 RX-ZR-20260808-017）
    const d = work.createdAt ? new Date(work.createdAt) : new Date();
    let ymd = '';
    try {
      if (!Number.isNaN(d.getTime())) {
        ymd = d.getFullYear() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
      }
    } catch (e) {}
    if (!ymd) ymd = '20260821';
    const seed = (work.workId || work._id || String(Math.floor(Math.random() * 900) + 100));
    let num = 0;
    for (let i = 0; i < String(seed).length; i++) num = (num * 31 + String(seed).charCodeAt(i)) % 900;
    return 'RX-ZR-' + ymd + '-' + (num + 100).toString().padStart(3, '0');
  },

  // ---------- 海报合成（对齐 2.7 版式：纸感底 + 纹样图 + 标题/寓意/编码） ----------
  _renderPoster(attempt) {
    const retry = Number(attempt) || 0;
    this.setData({ posterError: false });
    const q = wx.createSelectorQuery().in(this);
    q.select('#poster-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        if (retry < 10) {
          this._posterRetryTimer = setTimeout(() => this._renderPoster(retry + 1), 120 + retry * 40);
        } else {
          this.setData({ posterError: true });
        }
        return;
      }
      const canvas = res[0].node;
      const dpr = Math.min(3, (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2) || 2);
      canvas.width = PW * dpr;
      canvas.height = PH * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.setData({ posterError: true });
        return;
      }
      ctx.scale(dpr, dpr);
      this._posterCanvas = canvas;
      this._posterDpr = dpr;
      try {
        this._paintPoster(ctx, canvas, () => {
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width: canvas.width, height: canvas.height,
          destWidth: canvas.width, destHeight: canvas.height,
          success: (r) => this.setData({ posterImage: r.tempFilePath, posterError: false }),
          fail: () => this.setData({ posterError: true })
        });
        });
      } catch (error) {
        this.setData({ posterError: true });
      }
    });
  },

  retryPoster() {
    if (this._posterRetryTimer) clearTimeout(this._posterRetryTimer);
    this.setData({ posterImage: '', posterError: false }, () => this._renderPoster(0));
  },

  onPosterPreviewError() {
    this.retryPoster();
  },

  _roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  _ellipsizeText(ctx, value, maxWidth) {
    const source = String(value || '');
    if (!ctx.measureText || ctx.measureText(source).width <= maxWidth) return source;
    let result = source;
    while (result && ctx.measureText(result + '…').width > maxWidth) result = result.slice(0, -1);
    return result + '…';
  },

  _wrapText(ctx, value, maxWidth, maxLines) {
    const source = String(value || '').replace(/\s+/g, ' ').trim();
    if (!source) return [];
    const lines = [];
    let current = '';
    for (let i = 0; i < source.length; i++) {
      const next = current + source[i];
      if (current && ctx.measureText && ctx.measureText(next).width > maxWidth) {
        lines.push(current);
        current = source[i];
        if (lines.length === maxLines) break;
      } else {
        current = next;
      }
    }
    if (lines.length < maxLines && current) lines.push(current);
    const consumed = lines.join('').length;
    if (consumed < source.length && lines.length) {
      lines[lines.length - 1] = this._ellipsizeText(ctx, lines[lines.length - 1] + source.slice(consumed), maxWidth);
    }
    return lines.slice(0, maxLines);
  },

  _paintPoster(ctx, canvas, done) {
    const w = this._work || {};
    const d = this.data;
    // 纸感底 + 受控的蓝紫角落晕染。所有装饰固定在安全区，避免文字与背景相互覆盖。
    const bg = ctx.createLinearGradient(0, 0, PW, PH);
    bg.addColorStop(0, '#fdfdff');
    bg.addColorStop(0.55, '#fbfcff');
    bg.addColorStop(1, '#f7f9ff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, PW, PH);

    // 角落水彩光晕
    const glow = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    glow(PW - 18, 22, 62, 'rgba(140,171,244,.24)');
    glow(12, PH * 0.56, 64, 'rgba(173,191,232,.12)');
    glow(PW - 22, PH - 18, 68, 'rgba(146,168,240,.14)');

    ctx.save();
    this._roundedRect(ctx, 12, 12, PW - 24, PH - 24, 20);
    ctx.strokeStyle = 'rgba(121,139,203,.13)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 顶部装饰
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b8a7f5';
    ctx.font = '13px sans-serif';
    ctx.fillText('✦', PW / 2, 25);
    ctx.fillStyle = '#4a63b8';
    ctx.font = 'bold 18px "Songti SC","STSong","SimSun",serif';
    ctx.fillText('染 心 · 作 品 海 报', PW / 2, 51);

    // 纹样主图（居中，圆角窗）
    this._drawArtwork(ctx, canvas, (boxX, boxY, boxW, boxH) => {
      ctx.save();
      this._roundedRect(ctx, boxX - 4, boxY - 4, boxW + 8, boxH + 8, 18);
      ctx.strokeStyle = 'rgba(120,140,210,.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 作品名
      ctx.fillStyle = '#17396e';
      ctx.font = 'bold 22px "Songti SC","STSong","SimSun",serif';
      ctx.fillText(this._ellipsizeText(ctx, d.patternName || '我的扎染作品', 260), PW / 2, 86);

      // 染料信息
      ctx.fillStyle = '#6476a0';
      ctx.font = '14px sans-serif';
      ctx.fillText(this._ellipsizeText(ctx, d.meta, 274), PW / 2, boxY + boxH + 26);

      // 文化寓意按海报安全宽度折行，最多两行，不再伸出画布。
      ctx.fillStyle = '#4f5f8c';
      ctx.font = '13px sans-serif';
      const storyLines = this._wrapText(ctx, '“' + d.story + '”', 276, 2);
      storyLines.forEach((line, index) => ctx.fillText(line, PW / 2, boxY + boxH + 53 + index * 20));

      // 分隔线
      ctx.strokeStyle = 'rgba(120,140,210,.30)';
      ctx.beginPath();
      ctx.moveTo(PW / 2 - 60, boxY + boxH + 101);
      ctx.lineTo(PW / 2 + 60, boxY + boxH + 101);
      ctx.stroke();

      // 日期 + 编码
      ctx.fillStyle = '#8a94b0';
      ctx.font = '12px sans-serif';
      ctx.fillText(this._ellipsizeText(ctx, d.date + ' · ' + d.code, 274), PW / 2, boxY + boxH + 127);

      // 底部小星
      ctx.fillStyle = '#b8a7f5';
      ctx.font = '14px sans-serif';
      ctx.fillText('✦  ✦  ✦', PW / 2, PH - 25);
      done();
    });
  },

  // 绘制纹样主图：优先作品缩略图，失败回退到 pattern-engine 程序化绘制
  _drawArtwork(ctx, canvas, after) {
    const boxW = 250, boxH = 320;
    const boxX = (PW - boxW) / 2, boxY = 116;
    const w = this._work || {};
    const drawFallback = () => {
      const pattern = engine.getPatternById(w.patternId);
      if (pattern) {
        ctx.save();
        this._roundedRect(ctx, boxX, boxY, boxW, boxH, 16);
        ctx.clip();
        ctx.translate(boxX, boxY);
        engine.renderTieDye(ctx, boxW, boxH, {
          type: pattern.type,
          petals: pattern.petals,
          tightness: 0.45,
          whitespace: 0.3,
          dyeName: w.dyeName || '板蓝根',
          concentration: Number(w.concentration) / 100 || 0.6
        });
        ctx.restore();
      } else {
        ctx.fillStyle = '#eef2fb';
        this._roundedRect(ctx, boxX, boxY, boxW, boxH, 16);
        ctx.fill();
      }
      after(boxX, boxY, boxW, boxH);
    };
    const src = w.thumb || w.finalImage || '';
    if (!src || !canvas.createImage) { drawFallback(); return; }
    const img = canvas.createImage();
    img.onload = () => {
      const sw = img.width || 1, sh = img.height || 1;
      const scale = Math.max(boxW / sw, boxH / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save();
      this._roundedRect(ctx, boxX, boxY, boxW, boxH, 16);
      ctx.clip();
      ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
      ctx.restore();
      after(boxX, boxY, boxW, boxH);
    };
    img.onerror = drawFallback;
    img.src = src;
  },

  // ---------- 保存海报 ----------
  savePoster() {
    if (this.data.saving) return;
    if (!this.data.posterImage) {
      this.retryPoster();
      wx.showToast({ title: '正在重新生成海报', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterImage,
      success: () => {
        this.setData({ saving: false });
        wx.showToast({ title: '海报已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        this.setData({ saving: false });
        const message = String(err && err.errMsg || '');
        if (/auth|authorize|deny/i.test(message)) {
          wx.showModal({
            title: '需要相册权限',
            content: '请允许“保存到相册”，生成好的海报不会丢失。',
            confirmText: '去设置',
            success: (m) => { if (m.confirm) wx.openSetting(); }
          });
        } else {
          wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
        }
      }
    });
  },

  // ---------- 分享 ----------
  sharePoster() {
    const code = this.data.code;
    wx.setClipboardData({
      data: '我的扎染作品《' + (this.data.patternName || '我的作品') + '》已经完成，作品编码 ' + code + '。',
      success: () => wx.showToast({ title: '作品信息已复制', icon: 'none' })
    });
  },

  onShareAppMessage() {
    return {
      title: '我的扎染作品《' + (this.data.patternName || '我的作品') + '》',
      path: '/pages/works/works',
      imageUrl: this.data.posterImage || ''
    };
  },

  // ---------- 把作品变成实物 ----------
  selectProduct(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.products.some(p => p.id === id)) this.setData({ selectedProduct: id });
  },

  openRealModal() {
    this.setData({ showRealModal: true });
  },

  closeRealModal() {
    this.setData({ showRealModal: false });
  },

  continueCustomize() {
    const w = this._work || {};
    try {
      wx.setStorageSync('ranxin_last_pattern_name', w.patternName || this.data.patternName || '海潮花影');
      if (w.thumb || w.finalImage) wx.setStorageSync('ranxin_last_pattern_image', w.thumb || w.finalImage);
      wx.setStorageSync('ranxin_product_prefill', {
        workId: w.workId || w._id || '',
        workIdentity: w.workIdentity || (w.workId || w._id ? 'work:' + String(w.workId || w._id) : ''),
        patternId: w.patternId || '',
        patternName: w.patternName || this.data.patternName,
        previewImage: w.thumb || w.finalImage,
        thumb: w.thumb || w.finalImage,
        finalImage: w.finalImage || w.thumb,
        createdAt: w.createdAt || '',
        type: this.data.selectedProduct
      });
    } catch (e) {}
    this.setData({ showRealModal: false });
    wx.navigateTo({ url: '/pages/product/product?type=' + this.data.selectedProduct });
  },

  goBack() {
    wx.navigateBack();
  },

  noop() {}
});
