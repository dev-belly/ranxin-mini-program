// ============================================================
// 归属：B｜核心交互 Owner
// 纹样渲染引擎：为 DIY / 游戏球 / 纹样缩略图生成扎染风格图案
// 仅在前端 Canvas 2D 运行，不访问后端
// ============================================================

const DYE_COLORS = {
  板蓝根: { main: '#1E4D8C', light: '#5B8EC6', dark: '#0F2E57' },
  靛青: { main: '#2E5AAC', light: '#6A9BD8', dark: '#15366B' },
  紫草: { main: '#6B3FA0', light: '#A67BC6', dark: '#3E2063' },
  茜草: { main: '#B83B3B', light: '#D97A7A', dark: '#721E1E' },
  栀子黄: { main: '#D99E2B', light: '#EAC469', dark: '#8F6513' }
};

// 正念 DIY 文档中的染液名称映射到内部染料
const DYE_LABELS = {
  '板蓝根靛蓝': '板蓝根',
  '姜黄': '栀子黄',
  '茜草红': '茜草'
};

// 主题对齐：以白族扎染正统纹样为基准（蝴蝶纹/团花纹/水波纹/山水纹/几何纹/卷草纹）
const PATTERN_CATALOG = [
  { id: 'hudie', name: '蝴蝶纹', tags: '多子多福', type: 'butterfly', petals: 2, cat: '白族传统' },
  { id: 'tuan', name: '团花纹', tags: '团圆美满', type: 'radial', petals: 8, cat: '白族传统' },
  { id: 'shui', name: '水波纹', tags: '风调雨顺', type: 'wave', petals: 6, cat: '自然' },
  { id: 'cang', name: '山水纹', tags: '乐山乐水', type: 'mountain', petals: 1, cat: '自然' },
  { id: 'ling', name: '菱形纹', tags: '秩序稳定', type: 'diamond', petals: 4, cat: '几何' },
  { id: 'he', name: '卷草纹', tags: '生生不息', type: 'vine', petals: 10, cat: '白族传统' }
];

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  const bigint = parseInt(s, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgba(hex, alpha) {
  const c = hexToRgb(hex);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function randomSeed(seed) {
  let s = seed || 1;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function lerpChannel(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = lerpChannel(a.r, b.r, t);
  const g = lerpChannel(a.g, b.g, t);
  const bl = lerpChannel(a.b, b.b, t);
  return `rgb(${r},${g},${bl})`;
}

// 在矩形画布上绘制扎染纹样
function renderTieDye(ctx, width, height, opts) {
  const {
    type = 'radial',
    petals = 8,
    tightness = 0.5,    // 0~1，越紧边缘越清晰
    whitespace = 0.4,   // 0~1，留白越多
    rotation = 0,       // 角度
    dyeName = '板蓝根',
    concentration = 0.6, // 0~1
    seed = 42
  } = opts || {};

  const palette = DYE_COLORS[dyeName] || DYE_COLORS['板蓝根'];
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.48;
  const rand = randomSeed(seed);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  // 底色：米白
  ctx.fillStyle = '#F8F6F2';
  ctx.fillRect(0, 0, width, height);

  // 外层晕染
  const outer = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * (1.1 - whitespace * 0.3));
  outer.addColorStop(0, rgba(palette.main, concentration * 0.85));
  outer.addColorStop(0.4 + whitespace * 0.4, rgba(palette.light, concentration * 0.45));
  outer.addColorStop(1, rgba(palette.main, 0));
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();

  // 按类型绘制花瓣/纹样单元
  const n = petals || 1;
  const step = (Math.PI * 2) / n;
  const unitR = maxR * (0.55 + tightness * 0.25);

  for (let i = 0; i < n; i++) {
    const angle = i * step;
    const ux = cx + Math.cos(angle) * unitR * 0.35;
    const uy = cy + Math.sin(angle) * unitR * 0.35;
    const grd = ctx.createRadialGradient(ux, uy, 0, ux, uy, unitR * (1.1 - whitespace * 0.4));
    grd.addColorStop(0, rgba(palette.dark, concentration * (0.7 + rand() * 0.2)));
    grd.addColorStop(0.3 + tightness * 0.4, rgba(palette.main, concentration * (0.5 + rand() * 0.15)));
    grd.addColorStop(1, rgba(palette.light, 0));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = grd;
    ctx.globalCompositeOperation = 'multiply';
    ctx.beginPath();
    if (type === 'wave') {
      ctx.ellipse(cx + unitR * 0.25, cy, unitR * 0.55, unitR * 0.18, 0, 0, Math.PI * 2);
    } else if (type === 'butterfly') {
      ctx.ellipse(cx + unitR * 0.2, cy - unitR * 0.05, unitR * 0.45, unitR * 0.28, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + unitR * 0.2, cy + unitR * 0.05, unitR * 0.45, unitR * 0.28, -0.2, 0, Math.PI * 2);
    } else if (type === 'diamond') {
      ctx.moveTo(cx + unitR, cy);
      ctx.lineTo(cx, cy - unitR * 0.6);
      ctx.lineTo(cx - unitR, cy);
      ctx.lineTo(cx, cy + unitR * 0.6);
      ctx.closePath();
    } else if (type === 'mountain') {
      ctx.moveTo(cx - unitR * 0.5, cy + unitR * 0.2);
      ctx.lineTo(cx, cy - unitR * 0.5);
      ctx.lineTo(cx + unitR * 0.5, cy + unitR * 0.2);
      ctx.lineTo(cx + unitR * 0.2, cy + unitR * 0.2);
      ctx.lineTo(cx, cy - unitR * 0.1);
      ctx.lineTo(cx - unitR * 0.2, cy + unitR * 0.2);
      ctx.closePath();
    } else if (type === 'feather') {
      ctx.ellipse(cx + unitR * 0.35, cy, unitR * 0.5, unitR * 0.12, 0, 0, Math.PI * 2);
    } else if (type === 'vine') {
      // 卷草：沿螺旋排布的小珠串，模拟卷草纹
      for (let t = 0; t <= Math.PI * 3; t += 0.3) {
        const rr = (t / (Math.PI * 3)) * unitR * 0.55;
        const px = cx + unitR * 0.15 + Math.cos(t) * rr;
        const py = cy + Math.sin(t) * rr;
        ctx.moveTo(px, py);
        ctx.arc(px, py, unitR * 0.1, 0, Math.PI * 2);
      }
    } else {
      // radial / tuan
      ctx.ellipse(cx + unitR * 0.2, cy, unitR * 0.42, unitR * 0.22, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // 再次叠加细碎纹理
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(palette.main, 0.08 + rand() * 0.08);
    for (let k = 0; k < 6; k++) {
      const rx = cx + (rand() - 0.5) * unitR * 1.6;
      const ry = cy + (rand() - 0.5) * unitR * 1.2;
      const rr = (0.03 + rand() * 0.06) * unitR;
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 中心核
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * (0.15 + whitespace * 0.25));
  core.addColorStop(0, rgba(palette.dark, concentration));
  core.addColorStop(1, rgba(palette.dark, 0));
  ctx.fillStyle = core;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * (0.18 + whitespace * 0.15), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================================
// 正念 DIY 新增渲染：折叠、染缸、氧化、拆展
// ============================================================

// 绘制折叠/捆扎后的布料
function renderFoldedFabric(ctx, width, height, opts) {
  const { foldType = 'symmetric', tightness = 3, fabricColor = '#F8F6F2' } = opts || {};
  const cx = width / 2, cy = height / 2;
  const size = Math.min(width, height) * 0.62;
  ctx.save();
  ctx.fillStyle = '#EFEBE5';
  ctx.fillRect(0, 0, width, height);

  if (foldType === 'symmetric') {
    const folds = 4 + Math.round(tightness);
    const step = size / folds;
    const amp = size * 0.08 * (tightness / 3);
    ctx.beginPath();
    ctx.moveTo(cx - size / 2, cy - size / 2);
    for (let i = 0; i <= folds; i++) {
      const x = cx - size / 2 + i * step;
      const y = cy - size / 2 + (i % 2 === 0 ? 0 : amp);
      ctx.lineTo(x, y);
    }
    for (let i = folds; i >= 0; i--) {
      const x = cx - size / 2 + i * step;
      const y = cy + size / 2 - (i % 2 === 0 ? 0 : amp);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fabricColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < folds; i++) {
      const x = cx - size / 2 + i * step;
      ctx.beginPath(); ctx.moveTo(x, cy - size / 2); ctx.lineTo(x, cy + size / 2); ctx.stroke();
    }
  } else if (foldType === 'fan') {
    const sectors = 5 + Math.round(tightness);
    const r = size * 0.55;
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6);
    ctx.closePath();
    ctx.fillStyle = fabricColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= sectors; i++) {
      const a = -Math.PI / 2 - 0.6 + (1.2 * i / sectors);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
    }
    ctx.translate(-cx, -cy);
  } else {
    // random
    ctx.beginPath();
    ctx.moveTo(cx - size / 2, cy - size / 2);
    ctx.lineTo(cx + size / 3, cy - size / 2 + 10);
    ctx.lineTo(cx + size / 2, cy - size / 5);
    ctx.lineTo(cx + size / 2 - 10, cy + size / 3);
    ctx.lineTo(cx, cy + size / 2);
    ctx.lineTo(cx - size / 3, cy + size / 2 - 15);
    ctx.lineTo(cx - size / 2, cy + size / 4);
    ctx.closePath();
    ctx.fillStyle = fabricColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size / 3, cy - size / 2); ctx.lineTo(cx + size / 4, cy + size / 2);
    ctx.moveTo(cx + size / 2, cy - size / 4); ctx.lineTo(cx - size / 4, cy - size / 4);
    ctx.stroke();
  }

  // 捆扎绳/橡皮筋
  const bands = Math.max(2, Math.round(tightness) + 1);
  ctx.strokeStyle = 'rgba(80,60,50,0.55)';
  ctx.lineWidth = 2 + tightness;
  for (let i = 0; i < bands; i++) {
    const t = (i + 1) / (bands + 1);
    ctx.beginPath();
    ctx.ellipse(cx, cy - size / 2 + t * size, size * 0.36, size * 0.04, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// 绘制染缸中浸泡的布料
function renderDyeBath(ctx, width, height, opts) {
  const { dyeName = '板蓝根', concentration = 0.6, fabricColor = '#F8F6F2' } = opts || {};
  const palette = DYE_COLORS[dyeName] || DYE_COLORS['板蓝根'];
  const cx = width / 2, cy = height / 2;
  const size = Math.min(width, height) * 0.6;
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, rgba(palette.light, 0.25));
  bg.addColorStop(1, rgba(palette.main, 0.75));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // 缸沿
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - size * 0.7, cy - size * 0.55, size * 1.4, size * 0.12);
  // 布料
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.5, size * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = fabricColor;
  ctx.fill();
  // 染料渗透
  ctx.globalCompositeOperation = 'multiply';
  const soak = ctx.createRadialGradient(cx, cy + size * 0.1, 0, cx, cy, size * 0.5);
  soak.addColorStop(0, rgba(palette.main, concentration));
  soak.addColorStop(1, rgba(palette.main, 0));
  ctx.fillStyle = soak;
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.5, size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  // 气泡
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 12; i++) {
    const bx = cx + Math.sin(i * 1.7) * size * 0.35;
    const by = cy + Math.cos(i * 2.3) * size * 0.3 - (i % 3) * 10;
    const br = 2 + (i % 4);
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 绘制氧化过程：布料由黄绿向靛蓝转变
function renderOxidation(ctx, width, height, opts) {
  const { dyeName = '板蓝根', concentration = 0.6, progress = 0, fabricColor = '#F8F6F2' } = opts || {};
  const palette = DYE_COLORS[dyeName] || DYE_COLORS['板蓝根'];
  const cx = width / 2, cy = height / 2;
  const size = Math.min(width, height) * 0.6;
  const unoxidized = '#C8D66A';
  const current = lerpColor(unoxidized, palette.main, progress);
  ctx.save();
  ctx.fillStyle = '#E8E6E2';
  ctx.fillRect(0, 0, width, height);
  // 布料
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.5, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = fabricColor;
  ctx.fill();
  // 氧化色变
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  grad.addColorStop(0, rgba(current, 0.7 + progress * 0.25));
  grad.addColorStop(1, rgba(current, 0));
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.5, size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  // 空气波纹
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(palette.main, 0.12);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const r = size * 0.2 + i * size * 0.08 + progress * size * 0.15;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// 拆开展示最终纹样：progress 0..1，折痕逐渐消失
function renderUnfold(ctx, width, height, opts) {
  const { progress = 0, ...tieOpts } = opts || {};
  renderTieDye(ctx, width, height, tieOpts);
  const cx = width / 2, cy = height / 2;
  const maxR = Math.min(width, height) * 0.5;
  ctx.save();
  const alpha = 0.45 * (1 - progress);
  if (alpha > 0.01) {
    ctx.strokeStyle = `rgba(60,50,40,${alpha})`;
    ctx.lineWidth = 2;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI + progress * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * maxR * 0.2, cy + Math.sin(a) * maxR * 0.2);
      ctx.lineTo(cx + Math.cos(a) * maxR * 0.9, cy + Math.sin(a) * maxR * 0.9);
      ctx.stroke();
    }
  }
  if (progress > 0.85) {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    glow.addColorStop(0, 'rgba(255,255,255,0.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 绘制游戏球：圆形裁剪后的扎染球
function renderBallPattern(ctx, x, y, r, opts) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  renderTieDye(ctx, r * 2, r * 2, { ...opts, seed: opts.level || 1 });
  ctx.translate(x - r, y - r);
  // 高光
  ctx.globalCompositeOperation = 'screen';
  const hl = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x - r * 0.3, y - r * 0.3, r * 0.6);
  hl.addColorStop(0, 'rgba(255,255,255,0.35)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getPatternById(id) {
  return PATTERN_CATALOG.find(p => p.id === id) || PATTERN_CATALOG[2];
}

function getDyeColor(name) {
  return DYE_COLORS[name] || DYE_COLORS['板蓝根'];
}

function resolveDyeName(label) {
  return DYE_LABELS[label] || label;
}

module.exports = {
  DYE_COLORS,
  DYE_LABELS,
  PATTERN_CATALOG,
  renderTieDye,
  renderFoldedFabric,
  renderDyeBath,
  renderOxidation,
  renderUnfold,
  renderBallPattern,
  getPatternById,
  getDyeColor,
  resolveDyeName
};
