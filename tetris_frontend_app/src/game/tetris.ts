export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Point = { x: number; y: number };

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type ActivePiece = {
  type: TetrominoType;
  rotation: number; // 0..3
  pos: Point; // top-left of 4x4 matrix in board coordinates
};

export type GameStatus = "idle" | "playing" | "paused" | "gameover";

export type GameState = {
  status: GameStatus;
  board: Cell[][];
  active: ActivePiece | null;
  next: TetrominoType;
  score: number;
  lines: number;
  level: number;
  highScore: number;
  dropIntervalMs: number;
};

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINO_COLORS: Record<Cell, string> = {
  0: "transparent",
  1: "#3b82f6", // I - primary
  2: "#06b6d4", // O - success accent
  3: "#64748b", // T - secondary
  4: "#22c55e", // S
  5: "#EF4444", // Z - error
  6: "#a855f7", // J
  7: "#f59e0b", // L
};

/**
 * 4x4 matrices for each tetromino. We rotate these matrices (clockwise).
 * We encode cells with a non-zero index (1..7) for coloring.
 */
const SHAPES: Record<TetrominoType, Cell[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 0, 0, 0],
    [0, 2, 2, 0],
    [0, 2, 2, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 0, 0, 0],
    [0, 3, 0, 0],
    [3, 3, 3, 0],
    [0, 0, 0, 0],
  ],
  S: [
    [0, 0, 0, 0],
    [0, 4, 4, 0],
    [4, 4, 0, 0],
    [0, 0, 0, 0],
  ],
  Z: [
    [0, 0, 0, 0],
    [5, 5, 0, 0],
    [0, 5, 5, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [0, 0, 0, 0],
    [6, 0, 0, 0],
    [6, 6, 6, 0],
    [0, 0, 0, 0],
  ],
  L: [
    [0, 0, 0, 0],
    [0, 0, 7, 0],
    [7, 7, 7, 0],
    [0, 0, 0, 0],
  ],
};

const BAG: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as Cell),
  );
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.slice()) as Cell[][];
}

function rotateMatrixCW(m: Cell[][]): Cell[][] {
  const n = m.length;
  const out: Cell[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0 as Cell),
  );
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      out[x]![n - 1 - y] = m[y]![x]!;
    }
  }
  return out;
}

function getRotatedShape(type: TetrominoType, rotation: number): Cell[][] {
  let shape = SHAPES[type];
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) {
    shape = rotateMatrixCW(shape);
  }
  return shape;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function computeDropIntervalMs(level: number): number {
  // Faster with level; clamp to avoid absurd speeds.
  const base = 800;
  const step = 60;
  return Math.max(120, base - (level - 1) * step);
}

function scoreForClears(cleared: number, level: number): number {
  // Classic-ish scoring: 1=100,2=300,3=500,4=800 times level
  const table = [0, 100, 300, 500, 800];
  return (table[cleared] ?? 0) * level;
}

export function getSpawnPosition(): Point {
  // Spawn in the middle, slightly above the visible board depending on shape.
  // Using a 4x4 matrix, top-left is x=3 generally for 10-wide.
  const x = 3;
  // y=0 works since collisions allow some empty rows.
  return { x, y: 0 };
}

/**
 * Check whether a piece at a given position/rotation collides with the board boundaries or placed cells.
 */
export function hasCollision(board: Cell[][], piece: ActivePiece): boolean {
  const shape = getRotatedShape(piece.type, piece.rotation);
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const cell = shape[sy]![sx]!;
      if (cell === 0) continue;
      const x = piece.pos.x + sx;
      const y = piece.pos.y + sy;

      if (x < 0 || x >= BOARD_WIDTH) return true;
      if (y < 0) continue; // allow above top
      if (y >= BOARD_HEIGHT) return true;

      if (board[y]![x]! !== 0) return true;
    }
  }
  return false;
}

/**
 * Merge the active piece into the board (i.e., lock it).
 */
export function mergePiece(board: Cell[][], piece: ActivePiece): Cell[][] {
  const out = cloneBoard(board);
  const shape = getRotatedShape(piece.type, piece.rotation);
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const cell = shape[sy]![sx]!;
      if (cell === 0) continue;
      const x = piece.pos.x + sx;
      const y = piece.pos.y + sy;
      if (y < 0) continue;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        out[y]![x] = cell;
      }
    }
  }
  return out;
}

/**
 * Clear full lines and return new board + cleared count.
 */
export function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const remaining: Cell[][] = [];
  let cleared = 0;

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const row = board[y]!;
    const full = row.every((c) => c !== 0);
    if (full) cleared++;
    else remaining.push(row);
  }

  while (remaining.length < BOARD_HEIGHT) {
    remaining.unshift(Array.from({ length: BOARD_WIDTH }, () => 0 as Cell));
  }

  return { board: remaining as Cell[][], cleared };
}

export type Move = "left" | "right" | "down";

/**
 * Attempt to move a piece by dx/dy. Returns the moved piece if valid, else original.
 */
export function tryMove(board: Cell[][], piece: ActivePiece, move: Move): ActivePiece {
  const delta =
    move === "left"
      ? { x: -1, y: 0 }
      : move === "right"
        ? { x: 1, y: 0 }
        : { x: 0, y: 1 };

  const next: ActivePiece = { ...piece, pos: { x: piece.pos.x + delta.x, y: piece.pos.y + delta.y } };
  return hasCollision(board, next) ? piece : next;
}

/**
 * Attempt rotation with simple wall kicks: try (0,0), (-1,0), (1,0), (-2,0), (2,0), (0,-1)
 */
export function tryRotate(board: Cell[][], piece: ActivePiece): ActivePiece {
  const rotated: ActivePiece = { ...piece, rotation: (piece.rotation + 1) % 4 };
  const kicks: Point[] = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -1 },
  ];

  for (const k of kicks) {
    const candidate: ActivePiece = { ...rotated, pos: { x: rotated.pos.x + k.x, y: rotated.pos.y + k.y } };
    if (!hasCollision(board, candidate)) return candidate;
  }

  return piece;
}

/**
 * Compute a ghost piece position (hard drop landing) without changing the board.
 */
export function computeGhost(board: Cell[][], piece: ActivePiece): ActivePiece {
  let p = piece;
  while (true) {
    const next = tryMove(board, p, "down");
    if (next === p) return p;
    p = next;
  }
}

/**
 * Hard drop a piece: move to ghost position and return it.
 */
export function hardDrop(board: Cell[][], piece: ActivePiece): ActivePiece {
  return computeGhost(board, piece);
}

export type BagState = {
  bag: TetrominoType[];
};

/**
 * Create a new 7-bag.
 */
export function newBag(): BagState {
  const bag = BAG.slice();
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return { bag };
}

export function drawFromBag(bagState: BagState): { bagState: BagState; value: TetrominoType } {
  if (bagState.bag.length === 0) {
    bagState = newBag();
  }
  const value = bagState.bag[0]!;
  return { bagState: { bag: bagState.bag.slice(1) }, value };
}

/**
 * Create a fresh game state.
 */
export function createInitialState(highScore: number): { state: GameState; bag: BagState } {
  let bag = newBag();
  const a = drawFromBag(bag);
  bag = a.bagState;
  const b = drawFromBag(bag);
  bag = b.bagState;

  const active: ActivePiece = { type: a.value, rotation: 0, pos: getSpawnPosition() };

  const state: GameState = {
    status: "idle",
    board: createEmptyBoard(),
    active,
    next: b.value,
    score: 0,
    lines: 0,
    level: 1,
    highScore,
    dropIntervalMs: computeDropIntervalMs(1),
  };

  return { state, bag };
}

export type StepResult = {
  state: GameState;
  bag: BagState;
  locked: boolean;
  cleared: number;
};

/**
 * Advance the game by one gravity tick: move down; if blocked, lock + clear + spawn next.
 */
export function stepGravity(state: GameState, bag: BagState): StepResult {
  if (state.status !== "playing" || !state.active) return { state, bag, locked: false, cleared: 0 };

  const moved = tryMove(state.board, state.active, "down");
  if (moved !== state.active) {
    return { state: { ...state, active: moved }, bag, locked: false, cleared: 0 };
  }

  // Lock
  const merged = mergePiece(state.board, state.active);
  const clearedRes = clearLines(merged);

  const newLines = state.lines + clearedRes.cleared;
  const newLevel = Math.max(1, Math.floor(newLines / 10) + 1);
  const newScore = state.score + scoreForClears(clearedRes.cleared, state.level);

  // Spawn next
  const nextActive: ActivePiece = { type: state.next, rotation: 0, pos: getSpawnPosition() };
  const draw = drawFromBag(bag);
  const newNext = draw.value;
  bag = draw.bagState;

  const nextStateBase: GameState = {
    ...state,
    board: clearedRes.board,
    active: nextActive,
    next: newNext,
    lines: newLines,
    level: newLevel,
    score: newScore,
    dropIntervalMs: computeDropIntervalMs(newLevel),
  };

  // Game over if new piece collides immediately
  const gameover = hasCollision(nextStateBase.board, nextActive);
  const finalState: GameState = gameover
    ? {
        ...nextStateBase,
        status: "gameover",
        active: null,
        highScore: Math.max(nextStateBase.highScore, newScore),
      }
    : nextStateBase;

  return { state: finalState, bag, locked: true, cleared: clearedRes.cleared };
}

/**
 * Overlay active piece onto board for rendering (does not mutate state.board).
 */
export function getRenderBoard(state: GameState): Cell[][] {
  const base = cloneBoard(state.board);
  if (!state.active) return base;

  const shape = getRotatedShape(state.active.type, state.active.rotation);
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const cell = shape[sy]![sx]!;
      if (cell === 0) continue;
      const x = state.active.pos.x + sx;
      const y = state.active.pos.y + sy;
      if (y < 0) continue;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        base[y]![x] = cell;
      }
    }
  }
  return base;
}

/**
 * Compute a list of ghost cells for rendering (y,x positions).
 */
export function getGhostCells(board: Cell[][], piece: ActivePiece): Point[] {
  const ghost = computeGhost(board, piece);
  const shape = getRotatedShape(ghost.type, ghost.rotation);
  const cells: Point[] = [];
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const cell = shape[sy]![sx]!;
      if (cell === 0) continue;
      const x = ghost.pos.x + sx;
      const y = ghost.pos.y + sy;
      if (y < 0) continue;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

/**
 * Utility: preview matrix for the "next" piece (4x4).
 */
export function getNextPreview(type: TetrominoType): Cell[][] {
  return getRotatedShape(type, 0);
}

/**
 * Utility: random type (fallback usage only; main game uses 7-bag).
 */
export function randomType(): TetrominoType {
  return randomFrom(BAG);
}
