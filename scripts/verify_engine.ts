// Standalone verification: load the TS engine + levels.json, then for every
// level repeatedly apply solveNext()'s move until win — proving the PORTED
// engine (not just the Python prototype) can clear all 120 levels and that
// tap/apply/cascade/bank all agree with the BFS solver.
import { initLevel, solveNext, applyMove, LEVEL_COUNT, levelMeta } from '../src/engine';

let failures = 0;
let totalMoves = 0;
let worstMoves = 0;
const parDelta: number[] = [];

for (let i = 0; i < LEVEL_COUNT; i++) {
  let g = initLevel(i, 0);
  let guard = 0;
  const cap = 400;
  while (g.phase !== 'victory' && guard < cap) {
    const m = solveNext(g);
    if (!m) break;
    g = applyMove(g, m.from, m.to);
    guard++;
  }
  if (g.phase !== 'victory') {
    console.error(`❌ Level ${i + 1} UNSOLVED after ${guard} moves (par ${levelMeta(i).par})`);
    failures++;
  } else {
    totalMoves += g.moves;
    worstMoves = Math.max(worstMoves, g.moves);
    parDelta.push(g.moves - g.par);
  }
}

const solved = LEVEL_COUNT - failures;
console.log(`\nSolved ${solved}/${LEVEL_COUNT} levels`);
console.log(`avg moves ${(totalMoves / Math.max(solved, 1)).toFixed(1)}, worst ${worstMoves}`);
const avgDelta = parDelta.reduce((a, b) => a + b, 0) / Math.max(parDelta.length, 1);
console.log(`avg (solver moves - par) = ${avgDelta.toFixed(2)} (0 = solver finds optimal)`);

if (failures > 0) { console.error(`\nFAIL: ${failures} unsolved`); process.exit(1); }
console.log('\n✅ ALL LEVELS SOLVABLE BY PORTED ENGINE');
