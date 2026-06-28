// Money Sort: Merge Puzzle — core types
// Cash-sort (Ball-Sort core) with merge/bank payoff.

export interface RawLevel {
  level: number;
  capacity: number;   // notes per wallet (tube depth)
  colors: number;     // distinct denominations in play
  wallets: number[][]; // denomination indices, bottom -> top
  par: number;        // BFS-verified shortest solution length (star baseline)
}

export interface Denomination {
  id: number;        // 0..N index into DENOMS
  label: string;     // "$1", "$5" ...
  emoji: string;     // color-blind-safe distinct glyph
  color: string;
}

export interface Wallet {
  index: number;
  notes: number[];   // denom indices, bottom -> top
  banked: boolean;   // filled uniform -> collected
}

export type Phase = 'playing' | 'victory' | 'paused';

export interface Move {
  from: number;
  to: number;
  count: number;     // notes moved (top run)
}

export interface GameState {
  levelIndex: number;
  capacity: number;
  wallets: Wallet[];
  selected: number | null;   // wallet index picked as source
  moves: number;             // moves used this level
  par: number;
  history: SnapshotItem[][]; // undo stack (wallet note arrays)
  bankedHistory: boolean[][];
  score: number;             // this-level score
  vault: number;             // lifetime banked cash (meta)
  combo: number;             // consecutive-bank multiplier
  stars: number;
  phase: Phase;
  hintMove: Move | null;
  freeWalletsUsed: number;
  hintsUsed: number;
}

export type SnapshotItem = number[];
