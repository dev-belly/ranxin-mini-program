/* A 稿：把数字作品做成真的。当前保留本地演示数据，交互与价格状态均可用。 */
function normalizeIdentityPart(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function canonicalProductPart(kind, value) {
  const normalized = normalizeIdentityPart(value);
  const aliases = {
    type: {
      '帆布袋': 'bag', '扎染帆布袋': 'bag', bag: 'bag',
      '抱枕': 'pillow', '扎染抱枕': 'pillow', pillow: 'pillow',
      '方巾': 'scarf', '扎染方巾': 'scarf', scarf: 'scarf',
      '茶席': 'cloth', '扎染茶席': 'cloth', cloth: 'cloth'
    },
    material: { '棉': 'cotton', cotton: 'cotton', '棉麻': 'linen', linen: 'linen', '亚麻': 'pure-linen', 'pure-linen': 'pure-linen' },
    size: { s: 's', m: 'm', l: 'l' }
  };
  return (aliases[kind] && aliases[kind][normalized]) || normalized;
}

function stableHash(value) {
  const source = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function resolveWorkIdentity(source) {
  const data = source || {};
  if (data.workIdentity) return String(data.workIdentity);
  if (data.workId || data._id) return 'work:' + String(data.workId || data._id);
  const artwork = data.artworkImage || data.finalImage || data.thumb || '';
  return 'work:legacy-' + stableHash([
    data.patternId || '',
    data.patternName || '',
    artwork,
    data.workCreatedAt || ''
  ].map(normalizeIdentityPart).join('|'));
}

function buildBargainIdentity(order) {
  const workIdentity = resolveWorkIdentity(order);
  const productIdentity = [
    order.productTypeId || order.type,
    order.materialId || order.material,
    order.sizeId || order.size
  ].map(normalizeIdentityPart).join('|');
  return {
    workIdentity,
    productIdentity,
    identityKey: 'bargain:v1:' + stableHash(workIdentity + '|' + productIdentity)
  };
}

function sameLegacyWork(existing, order) {
  const aExplicit = existing.workIdentity || existing.workId || existing.sourceWorkId;
  const bExplicit = order.workIdentity || order.workId || order.sourceWorkId;
  if (aExplicit && bExplicit) return String(aExplicit) === String(bExplicit);

  const aArtwork = existing.artworkImage || existing.finalImage || existing.thumb || '';
  const bArtwork = order.artworkImage || order.finalImage || order.thumb || '';
  if (aArtwork && bArtwork) return String(aArtwork) === String(bArtwork);

  return normalizeIdentityPart(existing.patternName) === normalizeIdentityPart(order.patternName);
}

function sameLegacyProduct(existing, order) {
  const sameType = canonicalProductPart('type', existing.productTypeId || existing.type)
    === canonicalProductPart('type', order.productTypeId || order.type);
  if (!sameType) return false;
  const pairs = [
    ['material', existing.materialId || existing.material, order.materialId || order.material],
    ['size', existing.sizeId || existing.size, order.sizeId || order.size]
  ];
  return pairs.every(([kind, a, b]) => !a || !b || canonicalProductPart(kind, a) === canonicalProductPart(kind, b));
}

function findOngoingDuplicate(list, order) {
  const identity = buildBargainIdentity(order);
  return (Array.isArray(list) ? list : []).find(item => {
    if (!item || item.status !== 'ongoing') return false;
    if (item.identityKey) return item.identityKey === identity.identityKey;
    return sameLegacyWork(item, order) && sameLegacyProduct(item, order);
  }) || null;
}

Page({
  data: {
    patternName: '雨落苍山',
    previewImage: '/assets/product/pillow-clean.jpg',
    optionGroups: [
      {
        key: 'type',
        label: '做成什么？',
        choices: [
          { id: 'bag', label: '帆布袋', price: 139, image: '/assets/patterns/bag.png' },
          { id: 'pillow', label: '抱枕', price: 139, image: '/assets/product/pillow-clean.jpg' },
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
    hasCustomArtwork: false,
    workId: '',
    workIdentity: '',
    patternId: '',
    workCreatedAt: '',
    showDuplicateDialog: false,
    duplicateBargain: null
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
    const previewImage = (defaultType && defaultType.image) || '/assets/product/pillow-clean.jpg';
    const workId = opts.workId || prefill.workId || '';
    const patternId = opts.patternId || prefill.patternId || '';
    const workCreatedAt = prefill.createdAt || '';
    const workIdentity = resolveWorkIdentity({
      workIdentity: opts.workIdentity || prefill.workIdentity,
      workId,
      patternId,
      patternName,
      artworkImage,
      workCreatedAt
    });
    this.setData({
      patternName,
      previewImage,
      artworkImage,
      hasCustomArtwork: Boolean(artworkImage),
      workId,
      workIdentity,
      patternId,
      workCreatedAt,
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
    const { patternName, previewImage, artworkImage, selected, optionGroups, price, makingDays,
      workId, workIdentity, patternId, workCreatedAt } = this.data;
    const typeItem = optionGroups[0].choices.find(c => c.id === selected.type);
    const matItem = optionGroups[1].choices.find(c => c.id === selected.material);
    const sizeItem = optionGroups[2].choices.find(c => c.id === selected.size);
    return {
      id: 'o_' + Date.now(),
      patternName,
      previewImage,
      artworkImage,
      workId,
      sourceWorkId: workId,
      workIdentity,
      patternId,
      workCreatedAt,
      type: typeItem ? typeItem.label : '抱枕',
      productTypeId: selected.type,
      material: matItem ? matItem.label : '棉麻',
      materialId: selected.material,
      size: sizeItem ? sizeItem.label : 'M',
      sizeId: selected.size,
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
    const list = wx.getStorageSync('ranxin_bargain_list') || [];
    const duplicate = findOngoingDuplicate(list, order);
    if (duplicate) {
      this._pendingBargainOrder = order;
      this.setData({ showDuplicateDialog: true, duplicateBargain: duplicate });
      return;
    }
    this.createBargain(order);
  },

  createBargain(order) {
    if (!order) return;
    const identity = buildBargainIdentity(order);
    const stored = wx.getStorageSync('ranxin_bargain_list');
    const list = Array.isArray(stored) ? stored : [];
    const idBase = 'b_' + Date.now();
    let id = idBase;
    let suffix = 1;
    while (list.some(item => item && item.id === id)) id = idBase + '_' + suffix++;
    const bargain = {
      id,
      identityVersion: 1,
      identityKey: identity.identityKey,
      workIdentity: identity.workIdentity,
      productIdentity: identity.productIdentity,
      sourceWorkId: order.sourceWorkId || order.workId || '',
      patternId: order.patternId || '',
      patternName: order.patternName,
      previewImage: order.previewImage,
      artworkImage: order.artworkImage,
      type: order.type,
      productTypeId: order.productTypeId,
      material: order.material,
      materialId: order.materialId,
      size: order.size,
      sizeId: order.sizeId,
      originalPrice: order.price,
      currentPrice: order.price,
      targetPrice: Math.round(order.price * 0.7),
      cutTotal: 0,
      needInvites: 2,
      helpers: [],
      status: 'ongoing',
      createdAt: order.createdAt
    };
    list.unshift(bargain);
    wx.setStorageSync('ranxin_bargain_list', list);
    wx.setStorageSync('ranxin_current_bargain', bargain);
    wx.navigateTo({ url: '/pages/bargain/bargain' });
  },

  continueExistingBargain() {
    const bargain = this.data.duplicateBargain;
    if (!bargain) return this.closeDuplicateDialog();
    this._pendingBargainOrder = null;
    this.setData({ showDuplicateDialog: false, duplicateBargain: null });
    wx.setStorageSync('ranxin_current_bargain', bargain);
    wx.navigateTo({ url: '/pages/bargainDetail/bargainDetail?id=' + encodeURIComponent(bargain.id) });
  },

  createAnotherBargain() {
    const order = this._pendingBargainOrder;
    this._pendingBargainOrder = null;
    this.setData({ showDuplicateDialog: false, duplicateBargain: null }, () => this.createBargain(order));
  },

  closeDuplicateDialog() {
    this._pendingBargainOrder = null;
    this.setData({ showDuplicateDialog: false, duplicateBargain: null });
  },

  noop() {},

  goBack() {
    wx.navigateBack();
  }
});
