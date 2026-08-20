/* 把它做成真的 - 实物定制页（前端 mock）
 * TODO: 接入 C 后端：创建订单 / 计算价格 / 发起砍价
 */
Page({
  data: {
    patternName: '雨落苍山',
    previewImage: '/assets/patterns/tuan.png',
    optionGroups: [
      {
        key: 'type',
        label: '做成什么？',
        choices: [
          { id: 'bag', label: '帆布袋', price: 169 },
          { id: 'pillow', label: '抱枕', price: 149 },
          { id: 'scarf', label: '方巾', price: 129 },
          { id: 'cloth', label: '茶席', price: 189 }
        ]
      },
      {
        key: 'material',
        label: '材质',
        choices: [
          { id: 'cotton', label: '棉', factor: 0 },
          { id: 'linen', label: '棉麻', factor: 20 },
          { id: 'pure-linen', label: '亚麻', factor: 40 }
        ]
      },
      {
        key: 'size',
        label: '尺寸',
        choices: [
          { id: 'S', label: 'S', factor: 0 },
          { id: 'M', label: 'M', factor: 10 },
          { id: 'L', label: 'L', factor: 20 }
        ]
      }
    ],
    selected: { type: 'pillow', material: 'linen', size: 'M' },
    price: 179,
    makingDays: '7-12 天'
  },

  onLoad(opts) {
    const patternName = opts.patternName || wx.getStorageSync('ranxin_last_pattern_name') || '雨落苍山';
    const previewImage = opts.previewImage || wx.getStorageSync('ranxin_last_pattern_image') || '/assets/patterns/tuan.png';
    this.setData({ patternName, previewImage });
    this.calcPrice();
  },

  selectOption(e) {
    const { group, id } = e.currentTarget.dataset;
    this.setData({ [`selected.${group}`]: id });
    this.calcPrice();
  },

  calcPrice() {
    const { selected, optionGroups } = this.data;
    const typeItem = optionGroups[0].choices.find(c => c.id === selected.type);
    const matItem = optionGroups[1].choices.find(c => c.id === selected.material);
    const sizeItem = optionGroups[2].choices.find(c => c.id === selected.size);
    const price = (typeItem ? typeItem.price : 169) + (matItem ? matItem.factor : 0) + (sizeItem ? sizeItem.factor : 0);
    this.setData({ price });
  },

  buildOrder() {
    const { patternName, previewImage, selected, optionGroups, price, makingDays } = this.data;
    const typeItem = optionGroups[0].choices.find(c => c.id === selected.type);
    const matItem = optionGroups[1].choices.find(c => c.id === selected.material);
    const sizeItem = optionGroups[2].choices.find(c => c.id === selected.size);
    return {
      id: 'o_' + Date.now(),
      patternName,
      previewImage,
      type: typeItem ? typeItem.label : '抱枕',
      material: matItem ? matItem.label : '棉麻',
      size: sizeItem ? sizeItem.label : 'M',
      price,
      makingDays,
      createdAt: new Date().toISOString()
    };
  },

  confirmOrder() {
    const order = this.buildOrder();
    wx.setStorageSync('ranxin_last_order', order);
    wx.showToast({ title: '已确认定制', icon: 'success' });
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/orderProgress/orderProgress' });
    }, 600);
  },

  inviteBargain() {
    const order = this.buildOrder();
    const bargain = {
      id: 'b_' + Date.now(),
      patternName: order.patternName,
      previewImage: order.previewImage,
      type: order.type,
      material: order.material,
      size: order.size,
      originalPrice: order.price,
      currentPrice: order.price,
      targetPrice: Math.round(order.price * 0.7),
      cutTotal: 0,
      needInvites: 2,
      helpers: [],
      status: 'ongoing',
      createdAt: order.createdAt
    };
    const list = wx.getStorageSync('ranxin_bargain_list') || [];
    list.unshift(bargain);
    wx.setStorageSync('ranxin_bargain_list', list);
    wx.setStorageSync('ranxin_current_bargain', bargain);
    wx.navigateTo({ url: '/pages/bargain/bargain' });
  },

  goBack() {
    wx.navigateBack();
  }
});
