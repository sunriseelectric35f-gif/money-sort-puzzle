// Money Sort: Merge Puzzle — game engine (MERGE-SORT hybrid)
// Pour the top run of equal-tier notes between wallets. When a wallet
// accumulates MERGE_N contiguous notes of a tier t (< TOP), they FUSE into one
// note of tier t+1 (cascades upward). A wallet that is full & uniform BANKS.
// Pure reducers (immutable) — screens drive via setGame(g => fn(g)).
import { GameState, Wallet, Move, RawLevel, MergeFx } from './types';
import { tierValue, TOP_TIER } from './items';
import levelsRaw from './levels.json';

const LEVELS = levelsRaw as unknown as RawLevel[];
export const LEVEL_COUNT = LEVELS.length;
export const MAX_FREE_WALLETS = 2;

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

// Fuse MERGE_N contiguous top notes of tier t (< TOP) into one tier t+1.
// Mutates `notes`, returns the number of cascade steps that fired.
function cascade(notes: number[], mergeN: number): number {
  let chain = 0;
  let changed = true;
  while (changed) {
    changed = false;
    if (notes.length >= mergeN) {
      const t = notes[notes.length - 1];
      if (t < TOP_TIER) {
        let run = 0;
        for (let k = notes.length - 1; k >= 0; k--) {
          if (notes[k] === t) run++; else break;
        }
        if (run >= mergeN) {
          notes.splice(notes.length - mergeN, mergeN);
          notes.push(t + 1);
          chain++;
          changed = true;
        }
      }
    }
  }
  return chain;
}

// A wallet is "sorted" when it's empty or holds one tier only. This is the
// win predicate per-wallet and matches the generator/BFS solver contract.
function isSorted(notes: number[]): boolean {
  return notes.length === 0 || isUniform(notes);
}

export function canMove(g: GameState, from: number, to: number): boolean {
  if (from === to) return false;
  const wf = g.wallets[from], wt = g.wallets[to];
  if (!wf || !wt) return false;
  if (wf.notes.length === 0) return false;
  if (isUniform(wf.notes) && wf.notes.length === g.capacity) return false; // locked: uniform & full
  if (wt.notes.length >= g.capacity) return false;
  if (wt.notes.length === 0) {
    return !isUniform(wf.notes); // no progress pouring a uniform stack into empty
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
  return {
    levelIndex,
    capacity: lvl.capacity,
    tiers: lvl.tiers,
    mergeN: lvl.mergeN,
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
    lastMerges: [],
    lastBank: null,
  };
}

// ── win/stars ────────────────────────────────────────────────────────────────
// Win = every wallet empty or holding a single denomination (matches solver).
function isWin(g: GameState): boolean {
  return g.wallets.every(w => isSorted(w.notes));
}

function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.4)) return 2;
  return 1;
}

// ── core interaction: tap a wallet ───────────────────────────────────────────
export function tapWallet(g: GameState, index: number): GameState {
  if (g.phase !== 'playing') return g;
  const w = g.wallets[index];
  if (!w) return g;

  if (g.selected === null) {
    if (w.notes.length === 0) return g;
    if (isUniform(w.notes) && w.notes.length === g.capacity) return g;
    return { ...g, selected: index, hintMove: null, lastMerges: [], lastBank: null };
  }

  if (g.selected === index) {
    return { ...g, selected: null };
  }

  if (canMove(g, g.selected, index)) {
    return applyMove(g, g.selected, index);
  }
  if (w.notes.length > 0 && !(isUniform(w.notes) && w.notes.length === g.capacity)) {
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

  // merge cascade on destination
  const chain = cascade(dst.notes, g.mergeN);
  const merges: MergeFx[] = [];
  if (chain > 0) {
    merges.push({ wallet: to, toTier: dst.notes[dst.notes.length - 1], chain });
  }

  // banking + scoring. A wallet "banks" (locks + pays out immediately) when it
  // becomes uniform AND full. Sorted-but-not-full wallets settle at win.
  let score = g.score;
  let vault = g.vault;
  let combo = g.combo;
  let lastBank: number | null = null;
  const dstBanks = isUniform(dst.notes) && dst.notes.length === g.capacity;
  if (dstBanks) {
    dst.banked = true;
    lastBank = to;
    const cash = tierValue(dst.notes[0]) * dst.notes.length;
    combo = combo + 1;
    const gain = cash * (1 + (combo - 1) * 0.5);
    score += Math.round(gain);
    vault += cash;
  } else if (chain === 0) {
    combo = 0; // a plain non-merge non-bank move breaks the chain
  }
  // merges themselves award a small bonus + keep combo alive
  if (chain > 0) {
    score += chain * 25;
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
    lastMerges: merges,
    lastBank,
    history: [...g.history, snapshot].slice(-80),
    bankedHistory: [...g.bankedHistory, bankedSnap].slice(-80),
  };

  if (isWin(ng)) {
    // settle every sorted wallet that didn't formally bank during play
    let settled = ng.vault;
    let settledScore = ng.score;
    const finalWallets = ng.wallets.map(w => {
      if (!w.banked && w.notes.length > 0 && isUniform(w.notes)) {
        const cash = tierValue(w.notes[0]) * w.notes.length;
        settled += cash;
        settledScore += cash;
        return { ...w, banked: true };
      }
      return w;
    });
    const stars = starsFor(ng.moves, ng.par);
    const clearBonus = Math.round((ng.par / Math.max(ng.moves, 1)) * 250);
    ng = { ...ng, wallets: finalWallets, vault: settled, phase: 'victory', stars, score: settledScore + clearBonus };
  }
  return ng;
}

// ── boosters ─────────────────────────────────────────────────────────────────
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
    lastMerges: [],
    lastBank: null,
  };
}

export function addFreeWallet(g: GameState): GameState {
  if (g.phase !== 'playing' || g.freeWalletsUsed >= MAX_FREE_WALLETS) return g;
  const wallets = clone(g.wallets);
  wallets.push({ index: wallets.length, notes: [], banked: false });
  return { ...g, wallets, freeWalletsUsed: g.freeWalletsUsed + 1, hintMove: null };
}

// ── BFS solver — powers Smart Hint AND verifies levels ───────────────────────
type SState = number[][];

function sSerialize(s: SState): string {
  return s.map(w => w.join(',')).sort().join('|');
}
function sWin(s: SState): boolean {
  // each wallet empty OR uniform (merge mechanic: completion = uniform stack)
  return s.every(w => w.length === 0 || w.every(n => n === w[0]));
}
function sCascade(notes: number[], mergeN: number): void {
  let changed = true;
  while (changed) {
    changed = false;
    if (notes.length >= mergeN) {
      const t = notes[notes.length - 1];
      if (t < TOP_TIER) {
        let run = 0;
        for (let k = notes.length - 1; k >= 0; k--) {
          if (notes[k] === t) run++; else break;
        }
        if (run >= mergeN) {
          notes.splice(notes.length - mergeN, mergeN);
          notes.push(t + 1);
          changed = true;
        }
      }
    }
  }
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
function sApply(s: SState, i: number, j: number, cap: number, mergeN: number): SState {
  const ns = s.map(w => [...w]);
  const t = ns[i][ns[i].length - 1];
  let run = 0;
  for (let k = ns[i].length - 1; k >= 0 && ns[i][k] === t; k--) run++;
  const space = cap - ns[j].length;
  const k = Math.min(run, space);
  for (let n = 0; n < k; n++) { ns[j].push(t); ns[i].pop(); }
  sCascade(ns[j], mergeN);
  return ns;
}

export function solveNext(g: GameState, nodeCap = 80000): Move | null {
  const start: SState = g.wallets.map(w => [...w.notes]);
  const cap = g.capacity, mergeN = g.mergeN;
  if (sWin(start)) return null;
  const seen = new Set([sSerialize(start)]);
  const q: Array<[SState, [number, number] | null]> = [[start, null]];
  let nodes = 0;
  while (q.length) {
    const [cur, first] = q.shift()!;
    nodes++;
    if (nodes > nodeCap) break;
    for (const [i, j] of sLegal(cur, cap)) {
      const nxt = sApply(cur, i, j, cap, mergeN);
      const key = sSerialize(nxt);
      if (seen.has(key)) continue;
      const fm = first ?? [i, j];
      if (sWin(nxt)) {
        const [a, b] = fm;
        const { run } = topRun(g.wallets[a].notes);
        return { from: a, to: b, count: Math.min(run, cap - g.wallets[b].notes.length) };
      }
      seen.add(key);
      q.push([nxt, fm]);
    }
  }
  const lm = legalMoves(g);
  return lm.length ? lm[0] : null;
}

export function hint(g: GameState): GameState {
  if (g.phase !== 'playing') return g;
  const m = solveNext(g);
  return { ...g, hintMove: m, selected: m ? m.from : g.selected, hintsUsed: g.hintsUsed + 1 };
}

// Expose level meta for the level-select map.
export function levelMeta(i: number): RawLevel {
  return LEVELS[i % LEVELS.length];
}
