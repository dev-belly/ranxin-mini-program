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

// 主题对齐：以白族扎染正统纹样为基准，并保留 DIY 奖励使用的鹤翎纹。
const PATTERN_CATALOG = [
  { id: 'hudie', name: '蝴蝶纹', tags: '多子多福', type: 'butterfly', petals: 2, cat: '白族传统', story: '轻盈展翅，寓意破茧新生，适合需要力量的时刻。' },
  { id: 'tuan', name: '团花纹', tags: '团圆美满', type: 'radial', petals: 8, cat: '白族传统', story: '圆满聚合，如花开当庭，带来安定与归属感。' },
  { id: 'shui', name: '水波纹', tags: '风调雨顺', type: 'wave', petals: 6, cat: '自然', story: '连续折叠与扎结会形成自然流线，象征流动、松弛与不过度控制。' },
  { id: 'cang', name: '山水纹', tags: '乐山乐水', type: 'mountain', petals: 1, cat: '自然', story: '苍山洱海入布，寓意乐山乐水、道法自然。' },
  { id: 'ling', name: '菱形纹', tags: '秩序稳定', type: 'diamond', petals: 4, cat: '几何', story: '菱形秩序，象征稳定与清晰，适合整理思绪。' },
  { id: 'he', name: '卷草纹', tags: '生生不息', type: 'vine', petals: 10, cat: '白族传统', story: '卷草绵延，象征生生不息，于流转中见韧性。' },
  { id: 'heling', name: '鹤翎纹', tags: '舒展自由', type: 'vine', petals: 12, cat: '白族传统', story: '鹤羽向外舒展，寓意自由、轻盈与从容呼吸。' }
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

const DIY_SYMMETRIES = [4, 6, 8, 10, 12, 16];
const DIY_DEFAULT_RADII = [208, 208, 208, 208, 208, 208, 208, 208];

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
}

function normalizeDiySymmetry(value) {
  const target = clampNumber(value, 4, 16, 8);
  return DIY_SYMMETRIES.reduce((best, item) => (
    Math.abs(item - target) < Math.abs(best - target) ? item : best
  ), 8);
}

function normalizeDiyRadii(value) {
  const source = Array.isArray(value) ? value : DIY_DEFAULT_RADII;
  return DIY_DEFAULT_RADII.map((fallback, index) => (
    clampNumber(source[index], 118, 285, fallback)
  ));
}

function normalizeConcentration(value, fallback) {
  let n = Number(value);
  if (!Number.isFinite(n)) n = fallback;
  if (n > 1) n /= 100;
  return Math.max(0.1, Math.min(1, n));
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(value => (
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  )).join('');
}

function shadeHex(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  const color = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  return rgbToHex(
    color.r + (target - color.r) * ratio,
    color.g + (target - color.g) * ratio,
    color.b + (target - color.b) * ratio
  );
}

function resolveDiyPalette(opts) {
  const named = DYE_COLORS[opts.dyeName] || DYE_COLORS['板蓝根'];
  const explicit = opts.dyeColor || opts.color;
  if (!/^#[0-9a-f]{6}$/i.test(explicit || '')) return named;
  return {
    main: explicit,
    light: shadeHex(explicit, 0.38),
    dark: shadeHex(explicit, -0.45)
  };
}

function sampleDiyRadius(radii, lobeIndex, symmetry) {
  const position = (lobeIndex / symmetry) * radii.length;
  // 少于八瓣时，一个花瓣吸收相邻多个节点的影响；多于八瓣时则在
  // 相邻节点间平滑插值。这样六种对称设置下八个节点都不是“假控件”。
  const support = Math.max(1.01, radii.length / symmetry);
  let weighted = 0;
  let total = 0;
  radii.forEach((radius, index) => {
    let distance = Math.abs(index - position);
    distance = Math.min(distance, radii.length - distance);
    const linear = Math.max(0, 1 - distance / support);
    const weight = linear * linear;
    weighted += radius * weight;
    total += weight;
  });
  return total ? weighted / total : radii[Math.round(position) % radii.length];
}

function traceDiyLobe(ctx, type, length, halfWidth, index) {
  ctx.moveTo(0, 0);
  if (type === 'diamond') {
    ctx.lineTo(length * 0.53, -halfWidth);
    ctx.lineTo(length, 0);
    ctx.lineTo(length * 0.53, halfWidth);
    ctx.closePath();
    return;
  }
  if (type === 'mountain') {
    ctx.lineTo(length * 0.30, -halfWidth * 0.42);
    ctx.lineTo(length * 0.62, -halfWidth);
    ctx.lineTo(length, 0);
    ctx.lineTo(length * 0.58, halfWidth * 0.78);
    ctx.lineTo(length * 0.25, halfWidth * 0.35);
    ctx.closePath();
    return;
  }
  if (type === 'wave') {
    const bend = index % 2 ? -1 : 1;
    ctx.bezierCurveTo(
      length * 0.22, -halfWidth * (0.72 + bend * 0.12),
      length * 0.70, -halfWidth * (0.82 - bend * 0.14),
      length, bend * halfWidth * 0.12
    );
    ctx.bezierCurveTo(
      length * 0.70, halfWidth * (0.84 + bend * 0.10),
      length * 0.22, halfWidth * (0.64 - bend * 0.10),
      0, 0
    );
    ctx.closePath();
    return;
  }
  if (type === 'vine') {
    ctx.bezierCurveTo(length * 0.22, -halfWidth, length * 0.62, -halfWidth * 0.45, length, 0);
    ctx.bezierCurveTo(length * 0.68, halfWidth * 0.25, length * 0.31, halfWidth, 0, 0);
    ctx.closePath();
    return;
  }
  const fullness = type === 'butterfly' ? 1.32 : 1;
  ctx.bezierCurveTo(
    length * 0.18, -halfWidth * fullness,
    length * 0.72, -halfWidth * fullness,
    length, 0
  );
  ctx.bezierCurveTo(
    length * 0.72, halfWidth * fullness,
    length * 0.18, halfWidth * fullness,
    0, 0
  );
  ctx.closePath();
}

// 纹样 DIY 主画面：八个径向节点决定各方向花瓣长度。
// 参数与 A 稿一致：symmetry 仅允许 4/6/8/10/12/16；其余参数使用 0~100 或角度值。
function renderDiyPattern(ctx, width, height, opts) {
  opts = opts || {};
  if (!ctx || !(width > 0) || !(height > 0)) return null;

  const symmetry = normalizeDiySymmetry(
    opts.symmetry == null ? opts.petals : opts.symmetry
  );
  const tightness = clampNumber(opts.tightness, 0, 100, 80);
  const whitespace = clampNumber(opts.whitespace, 0, 100, 58);
  const rotation = clampNumber(opts.rotation, -180, 180, 15);
  const radii = normalizeDiyRadii(opts.radii);
  const concentration = normalizeConcentration(opts.concentration, 0.72);
  const palette = resolveDiyPalette(opts);
  const type = opts.type || 'radial';
  const tightN = tightness / 100;
  const blankN = whitespace / 100;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const baseReach = minSide * 0.365;
  const step = (Math.PI * 2) / symmetry;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#F8FAF7';
  ctx.fillRect(0, 0, width, height);

  const fabricWash = ctx.createRadialGradient(cx, cy, minSide * 0.02, cx, cy, minSide * 0.62);
  fabricWash.addColorStop(0, rgba(palette.light, concentration * (0.13 + tightN * 0.08)));
  fabricWash.addColorStop(0.66, rgba(palette.main, concentration * (0.09 + tightN * 0.08)));
  fabricWash.addColorStop(1, rgba(palette.main, 0));
  ctx.fillStyle = fabricWash;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);

  for (let i = 0; i < symmetry; i++) {
    const radius = sampleDiyRadius(radii, i, symmetry);
    const length = baseReach * (radius / 208);
    const angularWidth = Math.sin(Math.PI / symmetry) * length;
    const halfWidth = Math.max(
      minSide * 0.025,
      angularWidth * (0.70 + (1 - tightN) * 0.20)
    );

    ctx.save();
    ctx.rotate(-Math.PI / 2 + i * step);
    const pigment = ctx.createRadialGradient(
      length * 0.58, 0, Math.max(1, halfWidth * 0.05),
      length * 0.56, 0, length * (0.62 + (1 - tightN) * 0.13)
    );
    pigment.addColorStop(0, rgba(palette.dark, concentration * (0.78 + tightN * 0.18)));
    pigment.addColorStop(0.42, rgba(palette.main, concentration * (0.63 + tightN * 0.23)));
    pigment.addColorStop(0.70 + tightN * 0.20, rgba(palette.light, concentration * (0.32 + tightN * 0.18)));
    pigment.addColorStop(1, rgba(palette.light, 0));

    ctx.beginPath();
    traceDiyLobe(ctx, type, length, halfWidth, i);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = pigment;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(palette.dark, concentration * (0.05 + tightN * 0.22));
    ctx.lineWidth = 0.7 + tightN * 2.1;
    ctx.stroke();

    // 扎结留白沿每瓣中轴展开；留白越多，白色阻染通道越宽。
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255,255,255,${0.10 + blankN * 0.55})`;
    ctx.lineWidth = 1 + blankN * minSide * 0.018;
    ctx.beginPath();
    ctx.moveTo(length * 0.08, 0);
    ctx.bezierCurveTo(length * 0.35, halfWidth * 0.08, length * 0.68, -halfWidth * 0.08, length * 0.96, 0);
    ctx.stroke();
    ctx.restore();
  }

  // 八个原始扎结位置留下阻染结点，使节点半径变化有第二层直观反馈。
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < radii.length; i++) {
    const angle = -Math.PI / 2 + (i / radii.length) * Math.PI * 2;
    const reach = baseReach * (radii[i] / 208);
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach;
    const knotR = minSide * (0.012 + blankN * 0.025);
    const knot = ctx.createRadialGradient(x, y, 0, x, y, knotR * 2.2);
    knot.addColorStop(0, `rgba(255,255,255,${0.34 + tightN * 0.42})`);
    knot.addColorStop(0.50, `rgba(255,255,255,${0.12 + blankN * 0.28})`);
    knot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = knot;
    ctx.beginPath();
    ctx.arc(x, y, knotR * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const coreR = minSide * (0.025 + blankN * 0.085);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2.2);
  core.addColorStop(0, `rgba(255,255,255,${0.48 + blankN * 0.38})`);
  core.addColorStop(0.55, rgba(palette.light, concentration * 0.12));
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 很轻的织物纤维，避免结果看起来像纯矢量花瓣。
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = rgba(palette.dark, 0.025 + tightN * 0.012);
  ctx.lineWidth = 0.55;
  const fiberGap = Math.max(8, Math.round(minSide / 70));
  for (let y = fiberGap / 2; y < height; y += fiberGap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.28, y + 1.2, width * 0.72, y - 1.2, width, y);
    ctx.stroke();
  }
  ctx.restore();

  return {
    symmetry,
    tightness,
    whitespace,
    rotation,
    radii: radii.slice(),
    concentration,
    type,
    dyeName: opts.dyeName || '板蓝根'
  };
}

function normalizeDyeMethod(method) {
  const aliases = {
    full: 'full', local: 'local', drop: 'drop',
    '整体浸染': 'full', '局部入染': 'local', '点染滴落': 'drop'
  };
  return aliases[method] || 'full';
}

function traceDropMask(ctx, width, height) {
  const spots = [
    [0.22, 0.24, 0.19, 0.24],
    [0.68, 0.27, 0.17, 0.21],
    [0.49, 0.57, 0.22, 0.28],
    [0.79, 0.75, 0.15, 0.20],
    [0.20, 0.78, 0.14, 0.18]
  ];
  spots.forEach(([nx, ny, rx, ry], index) => {
    const x = nx * width;
    const y = ny * height;
    const radius = Math.min(width * rx, height * ry);
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const dripWidth = Math.max(3, radius * 0.16);
    const dripLength = radius * (0.55 + (index % 3) * 0.28);
    ctx.rect(x - dripWidth / 2, y, dripWidth, dripLength);
    ctx.moveTo(x + dripWidth, y + dripLength);
    ctx.arc(x, y + dripLength, dripWidth, 0, Math.PI * 2);
  });
}

// 入染效果预览：在同一 DIY 纹样上应用整体、斜向局部或确定性点染遮罩。
function renderDyePreview(ctx, width, height, opts) {
  opts = opts || {};
  if (!ctx || !(width > 0) || !(height > 0)) return null;
  const method = normalizeDyeMethod(opts.method);
  let concentrationPercent = Number(opts.concentration);
  if (!Number.isFinite(concentrationPercent)) concentrationPercent = 60;
  if (concentrationPercent >= 0 && concentrationPercent <= 1) concentrationPercent *= 100;
  concentrationPercent = clampNumber(concentrationPercent, 10, 100, 60);
  const palette = resolveDiyPalette(opts);
  const patternOpts = Object.assign({}, opts, { concentration: concentrationPercent });

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const fabric = ctx.createLinearGradient(0, 0, width, height);
  fabric.addColorStop(0, '#fbfaf6');
  fabric.addColorStop(0.55, '#f2f1ed');
  fabric.addColorStop(1, '#e8e8e5');
  ctx.fillStyle = fabric;
  ctx.fillRect(0, 0, width, height);

  if (method === 'full') {
    renderDiyPattern(ctx, width, height, patternOpts);
  } else if (method === 'local') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.78, 0);
    ctx.lineTo(width * 0.38, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.clip();
    renderDiyPattern(ctx, width, height, patternOpts);
    ctx.restore();

    // 斜向入染边缘的自然渗化水线。
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = rgba(palette.main, 0.08 + concentrationPercent / 1000);
    ctx.lineWidth = Math.max(5, Math.min(width, height) * 0.035);
    ctx.beginPath();
    ctx.moveTo(width * 0.78, 0);
    ctx.lineTo(width * 0.38, height);
    ctx.stroke();
    ctx.restore();
  } else {
    // 先画低透明度晕圈，再裁剪真实纹样，形成点染与向下滴落。
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba(palette.main, 0.07 + concentrationPercent / 850);
    const halos = [[0.22, 0.24, 0.16], [0.68, 0.27, 0.15], [0.49, 0.57, 0.19], [0.79, 0.75, 0.13], [0.20, 0.78, 0.12]];
    halos.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x * width, y * height, r * Math.min(width, height) * 1.18, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    traceDropMask(ctx, width, height);
    ctx.clip();
    renderDiyPattern(ctx, width, height, patternOpts);
    ctx.restore();
  }

  // 统一叠加布面高光，三种方式仍保有相同材质感。
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glaze = ctx.createLinearGradient(0, 0, width, height);
  glaze.addColorStop(0, 'rgba(255,255,255,0.12)');
  glaze.addColorStop(0.52, 'rgba(255,255,255,0)');
  glaze.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = glaze;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  ctx.restore();

  return {
    method,
    concentration: concentrationPercent,
    dyeName: opts.dyeName || '板蓝根'
  };
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
  // 先平移，使 renderTieDye 在其局部坐标系 (0,0)~(2r,2r) 绘制到球中心 (x,y)
  ctx.translate(x - r, y - r);
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();
  renderTieDye(ctx, r * 2, r * 2, { ...opts, seed: opts.level || 1 });
  // 高光（在球局部坐标内）
  ctx.globalCompositeOperation = 'screen';
  const hl = ctx.createRadialGradient(r * 0.7, r * 0.7, 0, r * 0.7, r * 0.7, r * 0.6);
  hl.addColorStop(0, 'rgba(255,255,255,0.35)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(r * 0.7, r * 0.7, r * 0.6, 0, Math.PI * 2);
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
  renderDiyPattern,
  renderDyePreview,
  renderFoldedFabric,
  renderDyeBath,
  renderOxidation,
  renderUnfold,
  renderBallPattern,
  getPatternById,
  getDyeColor,
  resolveDyeName
};
