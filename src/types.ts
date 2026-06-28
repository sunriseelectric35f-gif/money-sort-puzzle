// Money Sort: Merge Puzzle — core types
// Merge-Sort hybrid: pour same-tier runs between wallets; MERGE_N contiguous
// notes of a tier fuse into one note of the next tier (cash denomination ladder).

export interface RawLevel {
  level: number;
  capacity: number;    // notes per wallet (tube depth)
  tiers: number;       // distinct denomination tiers in play (TOP+1)
  mergeN: number;      // notes that fuse into the next tier
  wallets: number[][]; // tier indices, bottom -> top
  par: number;         // BFS-verified shortest solution length (3-star baseline)
}

export interface Denomination {
  tier: number;        // 0..N index into DENOMS
  label: string;       // "$1", "$5" ...
  emoji: string;       // color-blind-safe distinct glyph
  color: string;       // fill color (theme can override)
  value: number;       // cash value of one note (for vault accounting)
}

export interface Wallet {
  index: number;
  notes: number[];     // tier indices, bottom -> top
  banked: boolean;     // full uniform / completed -> collected
}

export type Phase = 'playing' | 'victory' | 'paused';

export interface Move {
  from: number;
  to: number;
  count: number;       // notes moved (top run)
}

// A merge event surfaced to the UI for animation/sfx (set transiently on state).
export interface MergeFx {
  wallet: number;      // wallet index where the fuse happened
  toTier: number;      // resulting tier
  chain: number;       // how many cascade steps in this pour
}

export interface GameState {
  levelIndex: number;
  capacity: number;
  tiers: number;
  mergeN: number;
  wallets: Wallet[];
  selected: number | null;    // wallet index picked as source
  moves: number;              // moves used this level
  par: number;
  history: SnapshotItem[][];  // undo stack (wallet note arrays)
  bankedHistory: boolean[][];
  score: number;              // this-level score
  vault: number;              // lifetime banked cash (meta-currency, persisted)
  combo: number;              // consecutive-bank multiplier
  stars: number;
  phase: Phase;
  hintMove: Move | null;
  freeWalletsUsed: number;
  hintsUsed: number;
  lastMerges: MergeFx[];      // merges produced by the most recent move (UI fx)
  lastBank: number | null;    // wallet index that banked on the most recent move
}

export type SnapshotItem = number[];

// ---- persisted meta progression ----
export interface SaveData {
  vault: number;                 // spendable + lifetime cash
  stars: Record<number, number>; // levelIndex -> best stars (0..3)
  unlockedTheme: string[];       // owned theme ids
  activeTheme: string;           // current theme id
  highestUnlocked: number;       // furthest level index reachable
  soundOn: boolean;
  hapticsOn: boolean;
  dailyLastISO: string | null;   // last daily-challenge claim date
}
