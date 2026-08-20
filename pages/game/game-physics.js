// 归属：B｜核心交互 Owner
// 合成大染缸 · 纯物理引擎（无 wx / canvas 依赖，可 node 单测）
// 机制参考 GitHub 上合成大西瓜 / suika 类实现：
//   落球 → 重力下落 → 圆碰撞分离 → 同级相碰合并升级 → 堆过顶部红色警戒线判负。
//   合成坐标采用加权中心插值（X=(A.x+B.x)/2, Y=(A.y+B.y)/2），视觉自然。
// 关键改进（相对旧版）：
//   1) 投放只出最小两级(0,1)，保证可上手、可玩到高级；
//   2) 提供 dropLevel / nextLevel，支持「下一颗」预览球；
//   3) 连击 combo：短时间内连续合成叠加得分倍率，强正反馈；
//   4) 合成事件 events[] 回调给视图层做飘分 / 粒子 / 音效；
//   5) 出生宽限时间，避免刚落下的球在顶部误判负；
//   6) 子步 NSUB=6 提升堆叠稳定性，防穿透 / 抖动。
// 终极目标：合成出最高级「大染缸」（level 7）。

const LEVELS = [
  { level: 0, name: '染珠',   r: 16, dye: '板蓝根', type: 'spiral',   petals: 6,  tightness: 0.40, concentration: 0.60, score: 10 },
  { level: 1, name: '染露',   r: 21, dye: '栀子黄', type: 'radial',   petals: 8,  tightness: 0.45, concentration: 0.60, score: 20 },
  { level: 2, name: '染芽',   r: 27, dye: '茜草',   type: 'radial',   petals: 6,  tightness: 0.50, concentration: 0.65, score: 30 },
  { level: 3, name: '染苞',   r: 33, dye: '靛青',   type: 'wave',     petals: 6,  tightness: 0.50, concentration: 0.70, score: 45 },
  { level: 4, name: '染朵',   r: 40, dye: '紫草',   type: 'butterfly',petals: 2,  tightness: 0.55, concentration: 0.70, score: 65 },
  { level: 5, name: '染团',   r: 48, dye: '板蓝根', type: 'diamond',  petals: 4,  tightness: 0.60, concentration: 0.75, score: 90 },
  { level: 6, name: '染瓮',   r: 56, dye: '靛青',   type: 'vine',     petals: 10, tightness: 0.60, concentration: 0.80, score: 130 },
  { level: 7, name: '大染缸', r: 66, dye: '紫草',   type: 'radial',   petals: 12, tightness: 0.65, concentration: 0.85, score: 200 }
];

const MAX_LEVEL = LEVELS.length - 1;
const GRAVITY = 2000;      // px/s^2
const RESTITUTION = 0.2;   // 弹性系数
const FRICTION = 0.92;     // 地面水平摩擦阻尼
const NSUB = 6;            // 子步数：提升堆叠稳定性，防穿透 / 抖动
// 顶部警戒线（y 小于此值且静止即危险）。默认 150：余量适中——
// 随手乱堆会顶到判负（有张力/分数目标），会凑对则能长期玩下去（疗愈不惩罚）。
// 可用环境变量 DANGER 临时覆盖（仅 Node 调参用）。
const DANGER_Y = (typeof process !== 'undefined' && process.env.DANGER)
  ? Number(process.env.DANGER)
  : 150;
// 投放池：只出最小三级（对齐 suika「只投最小几级」）。开局更易凑对、前几秒就上头，
// 又保留「偶尔会输」的轻挑战；可用环境变量 SPAWN 临时覆盖（仅 Node 调参用，小程序走默认）。
const SPAWN_LEVELS = (typeof process !== 'undefined' && process.env.SPAWN)
  ? process.env.SPAWN.split(',').map(Number)
  : [0, 1, 2];
const BORN_GRACE = 0.6;    // 出生宽限：刚落下的球 0.6s 内不计入判负
const COMBO_WINDOW = 1.2;  // 连击有效窗口（秒）

function rand(a, b) { return a + Math.random() * (b - a); }

class PhysicsWorld {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.balls = [];
    this.effects = [];        // 合成扩散环特效（视图用）
    this.events = [];         // 合成事件（视图层消费：飘分 / 音效 / 粒子）
    this.score = 0;
    this.maxLevel = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.over = false;
    this.overTimer = 0;
    this.time = 0;
    this._id = 1;
    this.dropLevel = this._pickSpawn();
    this.nextLevel = this._pickSpawn();
    this.aimX = W / 2;
    this._merges = [];
  }

  get currentLevel() { return this.dropLevel; }

  _pickSpawn() {
    return SPAWN_LEVELS[Math.floor(Math.random() * SPAWN_LEVELS.length)];
  }

  // 在 x 处投放当前预览球；投放后 dropLevel ← nextLevel，并刷新 nextLevel
  drop(x) {
    if (this.over) return;
    const lv = this.dropLevel;
    const r = LEVELS[lv].r;
    const cx = Math.max(r + 2, Math.min(this.W - r - 2, x));
    this.balls.push({ id: this._id++, x: cx, y: r + 4, vx: 0, vy: 0, level: lv, merging: false, born: this.time });
    this.dropLevel = this.nextLevel;
    this.nextLevel = this._pickSpawn();
  }

  setAim(x) {
    const r = LEVELS[this.dropLevel].r;
    this.aimX = Math.max(r + 2, Math.min(this.W - r - 2, x));
  }

  step(dt) {
    if (this.over) return;
    this.time += dt;
    dt = Math.min(dt, 1 / 30);
    const sub = dt / NSUB;
    for (let s = 0; s < NSUB; s++) this._substep(sub);
    this._resolveMerges();
    this._updateEffects(dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    this._checkOver(dt);
  }

  _substep(dt) {
    const W = this.W, H = this.H, balls = this.balls;
    // 1) 积分 + 边界
    for (const b of balls) {
      if (b.merging) continue;
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const r = LEVELS[b.level].r;
      if (b.x < r) { b.x = r; b.vx = -b.vx * RESTITUTION; }
      if (b.x > W - r) { b.x = W - r; b.vx = -b.vx * RESTITUTION; }
      if (b.y > H - r) {
        b.y = H - r;
        if (b.vy > 0) b.vy = -b.vy * RESTITUTION;
        if (Math.abs(b.vy) < 30) b.vy = 0;
        b.vx *= FRICTION;
      }
    }
    // 2) 球-球碰撞：分离 + 速度 + 合并
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        if (a.merging || c.merging) continue;
        const ra = LEVELS[a.level].r, rc = LEVELS[c.level].r;
        let dx = c.x - a.x, dy = c.y - a.y;
        let dist = Math.hypot(dx, dy);
        const min = ra + rc;
        if (dist === 0) { dx = 0.01; dy = 0.01; dist = 0.014; }
        const touching = dist < min * 1.08;
        if (dist < min) {
          const overlap = min - dist;
          const nx = dx / dist, ny = dy / dist;
          const ma = ra * ra, mc = rc * rc, tot = ma + mc;
          // 按质量加权分离（重的少动）
          a.x -= nx * overlap * (mc / tot); a.y -= ny * overlap * (mc / tot);
          c.x += nx * overlap * (ma / tot); c.y += ny * overlap * (ma / tot);
          // 沿法线弹性速度交换
          const rvx = c.vx - a.vx, rvy = c.vy - a.vy;
          const relN = rvx * nx + rvy * ny;
          if (relN < 0) {
            const jimp = -(1 + RESTITUTION) * relN / (1 / ma + 1 / mc);
            const ix = nx * jimp, iy = ny * jimp;
            a.vx -= ix / ma; a.vy -= iy / ma;
            c.vx += ix / mc; c.vy += iy / mc;
          }
        }
        // 同级接触即合并
        if (a.level === c.level && touching) this._queueMerge(a, c);
      }
    }
  }

  _queueMerge(a, c) {
    if (a.merging || c.merging) return;
    if (a.level >= MAX_LEVEL) return; // 满级不再合成
    a.merging = true;
    c.merging = true;
    this._merges.push([a, c]);
  }

  _resolveMerges() {
    if (!this._merges.length) return;
    for (const [a, c] of this._merges) {
      const nl = a.level + 1;
      const nx = (a.x + c.x) / 2;
      const ny = (a.y + c.y) / 2;
      const i1 = this.balls.indexOf(a);
      const i2 = this.balls.indexOf(c);
      if (i1 < 0 || i2 < 0) continue;
      const hi = Math.max(i1, i2), lo = Math.min(i1, i2);
      this.balls.splice(hi, 1);
      this.balls.splice(lo, 1);
      this.balls.push({ id: this._id++, x: nx, y: ny, vx: 0, vy: 0, level: nl, merging: false, born: this.time });
      // 连击：窗口内连续合成叠加倍率
      if (this.comboTimer > 0) this.combo += 1; else this.combo = 1;
      this.comboTimer = COMBO_WINDOW;
      const base = LEVELS[nl].score;
      const gained = Math.round(base * (1 + 0.25 * Math.max(0, this.combo - 1)));
      this.score += gained;
      if (nl > this.maxLevel) this.maxLevel = nl;
      this.effects.push({ x: nx, y: ny, r: LEVELS[nl].r, level: nl, life: 1 });
      this.events.push({ x: nx, y: ny, score: gained, combo: this.combo, level: nl });
    }
    this._merges = [];
  }

  _updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt * 1.6;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
  }

  _checkOver(dt) {
    let danger = false;
    for (const b of this.balls) {
      if (b.merging) continue;
      if (this.time - b.born < BORN_GRACE) continue; // 出生宽限
      const r = LEVELS[b.level].r;
      const speed = Math.hypot(b.vx, b.vy);
      if (b.y - r < DANGER_Y && speed < 14) { danger = true; break; }
    }
    if (danger) {
      this.overTimer += dt;
      if (this.overTimer > 1.0) this.over = true;
    } else {
      this.overTimer = Math.max(0, this.overTimer - dt * 2);
    }
  }
}

module.exports = { LEVELS, MAX_LEVEL, DANGER_Y, PhysicsWorld };
