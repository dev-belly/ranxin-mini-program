/* A 稿：把数字作品做成真的。当前保留本地演示数据，交互与价格状态均可用。 */
Page({
  data: {
    patternName: '雨落苍山',
    previewImage: '/assets/patterns/pillow.png',
    optionGroups: [
      {
        key: 'type',
        label: '做成什么？',
        choices: [
          { id: 'bag', label: '帆布袋', price: 139, image: '/assets/patterns/bag.png' },
          { id: 'pillow', label: '抱枕', price: 139, image: '/assets/patterns/pillow.png' },
          { id: 'scarf', label: '方巾', price: 129, image: '/assets/patterns/scarf.png' },
          { id: 'cloth', label: '茶席', price: 159, image: '/assets/patterns/cloth.png' }
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
    price: 169,
    makingDays: '7-12 天',
    artworkImage: '',
    hasCustomArtwork: false
  },

  onLoad(opts) {
    opts = opts || {};
    const prefill = wx.getStorageSync('ranxin_product_prefill') || {};
    const storedName = wx.getStorageSync('ranxin_last_pattern_name');
    const patternName = opts.patternName || prefill.patternName || storedName || '雨落苍山';
    const artworkImage = opts.previewImage || prefill.finalImage || prefill.thumb || prefill.previewImage || wx.getStorageSync('ranxin_last_pattern_image') || '';
    // 大图展示实物载体，小图展示本次 DIY 成品；切换载体时纹样不会丢失。
    const requestedType = opts.type || prefill.type || this.data.selected.type;
    const defaultType = this.data.optionGroups[0].choices.find(c => c.id === requestedType)
      || this.data.optionGroups[0].choices.find(c => c.id === this.data.selected.type);
    const previewImage = (defaultType && defaultType.image) || '/assets/patterns/pillow.png';
    this.setData({
      patternName,
      previewImage,
      artworkImage,
      hasCustomArtwork: Boolean(artworkImage),
      'selected.type': defaultType ? defaultType.id : this.data.selected.type
    }, () => this.calcPrice());
  },

  selectOption(e) {
    const { group, id } = e.currentTarget.dataset;
    const next = { [`selected.${group}`]: id };
    if (group === 'type') {
      const item = this.data.optionGroups[0].choices.find(c => c.id === id);
      if (item && item.image) next.previewImage = item.image;
    }
    this.setData(next);
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
    const { patternName, previewImage, artworkImage, selected, optionGroups, price, makingDays } = this.data;
    const typeItem = optionGroups[0].choices.find(c => c.id === selected.type);
    const matItem = optionGroups[1].choices.find(c => c.id === selected.material);
    const sizeItem = optionGroups[2].choices.find(c => c.id === selected.size);
    return {
      id: 'o_' + Date.now(),
      patternName,
      previewImage,
      artworkImage,
      type: typeItem ? typeItem.label : '抱枕',
      material: matItem ? matItem.label : '棉麻',
      size: sizeItem ? sizeItem.label : 'M',
      price,
      makingDays,
      createdAt: new Date().toISOString(),
      statusIndex: 2,
      status: 'making'
    };
  },

  confirmOrder() {
    const order = this.buildOrder();
    wx.setStorageSync('ranxin_last_order', order);
    wx.showToast({ title: '作品已确认', icon: 'success' });
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
      artworkImage: order.artworkImage,
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
