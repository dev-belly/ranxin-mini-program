// 归属：B｜核心交互 Owner
// 《1.2 合成大染缸游戏》三消规则引擎。
// 纯数据实现，不依赖 wx / DOM，可直接用 Node 做回归测试。

const ROWS = 7;
const COLS = 6;
const TILE_TYPES = ['blue', 'pink', 'green', 'purple', 'orange', 'cyan'];
const TARGET_SCORE = 2400;
const INITIAL_SCORE = 0;
const INITIAL_MOVES = 25;

const INITIAL_BOARD = [
  ['blue', 'purple', 'cyan', 'pink', 'green', 'purple'],
  ['purple', 'green', 'orange', 'purple', 'blue', 'green'],
  ['pink', 'blue', 'purple', 'blue', 'orange', 'pink'],
  ['green', 'cyan', 'blue', 'cyan', 'purple', 'purple'],
  ['pink', 'purple', 'purple', 'blue', 'pink', 'green'],
  ['purple', 'blue', 'green', 'pink', 'blue', 'orange'],
  ['blue', 'pink', 'blue', 'pink', 'green', 'purple']
];

function cloneBoard(board) { return board.map(row => row.slice()); }
function indexOfCell(row, col) { return row * COLS + col; }
function cellFromIndex(index) { return { row: Math.floor(index / COLS), col: index % COLS }; }
function adjacent(a, b) { return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1; }

function swapCells(board, a, b) {
  const next = cloneBoard(board);
  const value = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = value;
  return next;
}

function findMatches(board) {
  const matched = new Set();
  for (let row = 0; row < ROWS; row++) {
    let start = 0;
    for (let col = 1; col <= COLS; col++) {
      if (col < COLS && board[row][col] === board[row][start]) continue;
      if (col - start >= 3) for (let cursor = start; cursor < col; cursor++) matched.add(indexOfCell(row, cursor));
      start = col;
    }
  }
  for (let col = 0; col < COLS; col++) {
    let start = 0;
    for (let row = 1; row <= ROWS; row++) {
      if (row < ROWS && board[row][col] === board[start][col]) continue;
      if (row - start >= 3) for (let cursor = start; cursor < row; cursor++) matched.add(indexOfCell(cursor, col));
      start = row;
    }
  }
  return matched;
}

function matchesForSwap(board, a, b) {
  if (!adjacent(a, b)) return null;
  if (board[a.row][a.col] === board[b.row][b.col]) return null;
  const swapped = swapCells(board, a, b);
  const matches = findMatches(swapped);
  if (!matches.has(indexOfCell(a.row, a.col)) && !matches.has(indexOfCell(b.row, b.col))) return null;
  return { board: swapped, matches };
}

function randomType(randomFn = Math.random) {
  const value = Math.max(0, Math.min(0.999999, Number(randomFn()) || 0));
  return TILE_TYPES[Math.floor(value * TILE_TYPES.length)];
}

function collapseMatches(board, matches, randomFn = Math.random) {
  const next = cloneBoard(board);
  const spawned = [];
  for (let col = 0; col < COLS; col++) {
    const survivors = [];
    for (let row = ROWS - 1; row >= 0; row--) if (!matches.has(indexOfCell(row, col))) survivors.push(board[row][col]);
    let targetRow = ROWS - 1;
    for (const value of survivors) next[targetRow--][col] = value;
    while (targetRow >= 0) {
      const value = randomType(randomFn);
      next[targetRow][col] = value;
      spawned.push(indexOfCell(targetRow, col));
      targetRow--;
    }
  }
  return { board: next, spawned };
}

function scoreForMatch(count, combo) {
  return Math.max(0, Number(count) || 0) * 60 * Math.max(1, Number(combo) || 1);
}

function hasPossibleMove(board) {
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const here = { row, col };
    if (col + 1 < COLS && matchesForSwap(board, here, { row, col: col + 1 })) return true;
    if (row + 1 < ROWS && matchesForSwap(board, here, { row: row + 1, col })) return true;
  }
  return false;
}

function generateBoard(randomFn = Math.random) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill('blue'));
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      let candidates = TILE_TYPES.filter(type => {
        const horizontal = col >= 2 && board[row][col - 1] === type && board[row][col - 2] === type;
        const vertical = row >= 2 && board[row - 1][col] === type && board[row - 2][col] === type;
        return !horizontal && !vertical;
      });
      if (!candidates.length) candidates = TILE_TYPES.slice();
      const value = Math.max(0, Math.min(0.999999, Number(randomFn()) || 0));
      board[row][col] = candidates[Math.floor(value * candidates.length)];
    }
    if (hasPossibleMove(board)) return board;
  }
  return cloneBoard(INITIAL_BOARD);
}

function shuffleBoard(board, randomFn = Math.random) {
  const original = board.flat();
  for (let attempt = 0; attempt < 100; attempt++) {
    const flat = original.slice();
    for (let index = flat.length - 1; index > 0; index--) {
      const value = Math.max(0, Math.min(0.999999, Number(randomFn()) || 0));
      const target = Math.floor(value * (index + 1));
      [flat[index], flat[target]] = [flat[target], flat[index]];
    }
    const candidate = Array.from({ length: ROWS }, (_, row) => flat.slice(row * COLS, row * COLS + COLS));
    if (!findMatches(candidate).size && hasPossibleMove(candidate)) return candidate;
  }
  return generateBoard(randomFn);
}

module.exports = {
  ROWS, COLS, TILE_TYPES, TARGET_SCORE, INITIAL_SCORE, INITIAL_MOVES, INITIAL_BOARD,
  cloneBoard, indexOfCell, cellFromIndex, adjacent, swapCells,
  findMatches, matchesForSwap, collapseMatches, scoreForMatch,
  hasPossibleMove, generateBoard, shuffleBoard
};
