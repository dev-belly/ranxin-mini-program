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

module.exports = {
  DYE_COLORS,
  PATTERN_CATALOG,
  renderTieDye,
  renderBallPattern,
  getPatternById,
  getDyeColor
};
