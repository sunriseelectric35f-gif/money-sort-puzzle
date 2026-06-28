// Money Sort: Merge Puzzle — game engine
// Ball-Sort core: move the top run of matching notes between wallets.
// A wallet filled with one uniform denomination (== capacity) BANKS.
// Pure reducers (immutable) — App.tsx drives via setGame(g => fn(g)).
import { GameState, Wallet, Move, RawLevel } from './types';
import { DENOM_VALUE } from './items';
import levelsRaw from './levels.json';

const LEVELS = levelsRaw as unknown as RawLevel[];
export const LEVEL_COUNT = LEVELS.length;
export const BASE_FREE_WALLETS = 0; // extra wallets are a booster, not default

// ── helpers ──────────────────────────────────────────────────────────────────
function clone(wallets: Wallet[]): Wallet[] {
  return wallets.map(w => ({ index: w.index, notes: [...w.notes], banked: w.banked }));
}

function topRun(notes: number[]): { val: number | null; run: number } {
  if (notes.length === 0) return { val: null, run: 0 };
  const t = notes[notes.length - 1];
  let r = 0;
  for (let k = notes.length - 1; k >= 0; k--) {
    if (notes[k] === t) r++; else break;
  }
  return { val: t, run: r };
}

function isUniform(notes: number[]): boolean {
  return notes.length <= 1 || notes.every(n => n === notes[0]);
}

// A wallet "banks" when it is full AND uniform.
function checkBank(w: Wallet, capacity: number): boolean {
  return !w.banked && w.notes.length === capacity && isUniform(w.notes);
}

export function canMove(g: GameState, from: number, to: number): boolean {
  if (from === to) return false;
  const wf = g.wallets[from], wt = g.wallets[to];
  if (!wf || !wt || wf.banked || wt.banked) return false;
  if (wf.notes.length === 0) return false;
  if (isUniform(wf.notes) && wf.notes.length === g.capacity) return false; // already done
  if (wt.notes.length >= g.capacity) return false;
  if (wt.notes.length === 0) {
    // disallow pouring a fully-uniform stack into empty (no progress)
    return !isUniform(wf.notes);
  }
  const { val } = topRun(wf.notes);
  return wt.notes[wt.notes.length - 1] === val;
}

export function legalMoves(g: GameState): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < g.wallets.length; i++) {
    for (let j = 0; j < g.wallets.length; j++) {
      if (canMove(g, i, j)) {
        const { run } = topRun(g.wallets[i].notes);
        const space = g.capacity - g.wallets[j].notes.length;
        out.push({ from: i, to: j, count: Math.min(run, space) });
      }
    }
  }
  return out;
}

// ── init ─────────────────────────────────────────────────────────────────────
export function initLevel(levelIndex: number, vault = 0): GameState {
  const lvl = LEVELS[levelIndex % LEVELS.length];
  const wallets: Wallet[] = lvl.wallets.map((notes, index) => ({
    index, notes: [...notes], banked: false,
  }));
  // bank any wallets that already start complete (rare)
  wallets.forEach(w => { if (checkBank(w, lvl.capacity)) w.banked = true; });
  return {
    levelIndex,
    capacity: lvl.capacity,
    wallets,
    selected: null,
    moves: 0,
    par: lvl.par,
    history: [],
    bankedHistory: [],
    score: 0,
    vault,
    combo: 0,
    stars: 0,
    phase: 'playing',
    hintMove: null,
    freeWalletsUsed: 0,
    hintsUsed: 0,
  };
}

// ── win/stars ────────────────────────────────────────────────────────────────
function isWin(g: GameState): boolean {
  return g.wallets.every(w => w.notes.length === 0 || (isUniform(w.notes) && (w.banked || w.notes.length === g.capacity)));
}

function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.4)) return 2;
  return 1;
}

// ── core interaction: tap a wallet ───────────────────────────────────────────
// First tap selects a source; second tap attempts to pour into target.
export function tapWallet(g: GameState, index: number): GameState {
  if (g.phase !== 'playing') return g;
  const w = g.wallets[index];
  if (!w) return g;

  // no source selected yet
  if (g.selected === null) {
    if (w.notes.length === 0 || w.banked) return g; // nothing to pick
    if (isUniform(w.notes) && w.notes.length === g.capacity) return g;
    return { ...g, selected: index, hintMove: null };
  }

  // tapping the same wallet deselects
  if (g.selected === index) {
    return { ...g, selected: null };
  }

  // attempt move selected -> index
  if (canMove(g, g.selected, index)) {
    return applyMove(g, g.selected, index);
  }
  // invalid target: re-select if it has notes, else clear
  if (w.notes.length > 0 && !w.banked && !(isUniform(w.notes) && w.notes.length === g.capacity)) {
    return { ...g, selected: index };
  }
  return { ...g, selected: null };
}

export function applyMove(g: GameState, from: number, to: number): GameState {
  if (!canMove(g, from, to)) return { ...g, selected: null };
  const wallets = clone(g.wallets);
  const snapshot = g.wallets.map(w => [...w.notes]);
  const bankedSnap = g.wallets.map(w => w.banked);

  const src = wallets[from], dst = wallets[to];
  const { val, run } = topRun(src.notes);
  const space = g.capacity - dst.notes.length;
  const k = Math.min(run, space);
  for (let n = 0; n < k; n++) dst.notes.push(val as number);
  src.notes.splice(src.notes.length - k, k);

  // bank check on destination
  let score = g.score;
  let vault = g.vault;
  let combo = g.combo;
  if (checkBank(dst, g.capacity)) {
    dst.banked = true;
    const cash = DENOM_VALUE[(val as number) % DENOM_VALUE.length] * g.capacity;
    combo = combo + 1;
    const gain = cash * (1 + (combo - 1) * 0.5); // combo multiplier on consecutive banks
    score += Math.round(gain);
    vault += cash;
  } else {
    combo = 0; // a non-banking move breaks the combo chain
  }

  let ng: GameState = {
    ...g,
    wallets,
    selected: null,
    moves: g.moves + 1,
    score,
    vault,
    combo,
    hintMove: null,
    history: [...g.history, snapshot].slice(-50),
    bankedHistory: [...g.bankedHistory, bankedSnap].slice(-50),
  };

  if (isWin(ng)) {
    const stars = starsFor(ng.moves, ng.par);
    const clearBonus = Math.round((ng.par / Math.max(ng.moves, 1)) * 200);
    ng = { ...ng, phase: 'victory', stars, score: ng.score + clearBonus };
  }
  return ng;
}

// ── boosters / differentiators ───────────────────────────────────────────────
export function undo(g: GameState): GameState {
  if (g.history.length === 0 || g.phase !== 'playing') return g;
  const prev = g.history[g.history.length - 1];
  const prevBanked = g.bankedHistory[g.bankedHistory.length - 1];
  const wallets: Wallet[] = prev.map((notes, index) => ({
    index, notes: [...notes], banked: prevBanked[index],
  }));
  return {
    ...g,
    wallets,
    selected: null,
    moves: Math.max(0, g.moves - 1),
    history: g.history.slice(0, -1),
    bankedHistory: g.bankedHistory.slice(0, -1),
    hintMove: null,
    combo: 0,
  };
}

// +Wallet booster — append a temporary empty wallet to escape tight boards.
export function addFreeWallet(g: GameState): GameState {
  if (g.phase !== 'playing' || g.freeWalletsUsed >= 2) return g;
  const wallets = clone(g.wallets);
  wallets.push({ index: wallets.length, notes: [], banked: false });
  return { ...g, wallets, freeWalletsUsed: g.freeWalletsUsed + 1, hintMove: null };
}

// ── BFS solver — powers Smart Hint AND guarantees levels are solvable ─────────
type SState = number[][];

function serialize(s: SState): string {
  return s.map(w => w.join(',')).sort().join('|');
}
function sWin(s: SState, cap: number): boolean {
  return s.every(w => w.length === 0 || (w.every(n => n === w[0]) && w.length <= cap));
}
function sLegal(s: SState, cap: number): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let i = 0; i < s.length; i++) {
    const wi = s[i];
    if (wi.length === 0) continue;
    const uni = wi.every(n => n === wi[0]);
    if (uni && wi.length === cap) continue;
    const t = wi[wi.length - 1];
    for (let j = 0; j < s.length; j++) {
      if (i === j) continue;
      const wj = s[j];
      if (wj.length >= cap) continue;
      if (wj.length === 0) { if (!uni) moves.push([i, j]); }
      else if (wj[wj.length - 1] === t) moves.push([i, j]);
    }
  }
  return moves;
}
function sApply(s: SState, i: number, j: number, cap: number): SState {
  const ns = s.map(w => [...w]);
  const t = ns[i][ns[i].length - 1];
  let run = 0;
  for (let k = ns[i].length - 1; k >= 0 && ns[i][k] === t; k--) run++;
  const space = cap - ns[j].length;
  const k = Math.min(run, space);
  for (let n = 0; n < k; n++) { ns[j].push(t); ns[i].pop(); }
  return ns;
}

// BFS for the next move on a shortest solution path. Bounded for runtime safety.
export function solveNext(g: GameState, nodeCap = 60000): Move | null {
  const start: SState = g.wallets.map(w => [...w.notes]);
  const cap = g.capacity;
  if (sWin(start, cap)) return null;
  const startKey = serialize(start);
  const seen = new Set([startKey]);
  // queue holds [state, firstMove]
  const q: Array<[SState, [number, number] | null]> = [[start, null]];
  let nodes = 0;
  while (q.length) {
    const [cur, first] = q.shift()!;
    nodes++;
    if (nodes > nodeCap) break;
    for (const [i, j] of sLegal(cur, cap)) {
      const nxt = sApply(cur, i, j, cap);
      const key = serialize(nxt);
      if (seen.has(key)) continue;
      const fm = first ?? [i, j];
      if (sWin(nxt, cap)) {
        const [a, b] = fm;
        const { run } = topRun(g.wallets[a].notes);
        return { from: a, to: b, count: Math.min(run, cap - g.wallets[b].notes.length) };
      }
      seen.add(key);
      q.push([nxt, fm]);
    }
  }
  // fallback: any legal move that makes progress
  const lm = legalMoves(g);
  return lm.length ? lm[0] : null;
}

export function hint(g: GameState): GameState {
  if (g.phase !== 'playing') return g;
  const m = solveNext(g);
  return { ...g, hintMove: m, selected: m ? m.from : g.selected, hintsUsed: g.hintsUsed + 1 };
}
