#!/usr/bin/env python3
"""Money Sort: Merge Puzzle — level generator + BFS solver.
Generates guaranteed-solvable cash-sort levels (ball-sort core) and writes
real validated data to src/levels.json. Each level is BFS-verified solvable;
solution length becomes the par-move count for star rating.
Deterministic (seeded) so the shipped data is stable."""
import json, random, os
from collections import deque

def top_run(w):
    if not w: return (None, 0)
    t = w[-1]; r = 0
    for x in reversed(w):
        if x == t: r += 1
        else: break
    return (t, r)

def uniform(w):
    return len(w) <= 1 or all(x == w[0] for x in w)

def is_win(state):
    return all(uniform(list(w)) for w in state)

def legal_moves(state, cap):
    moves = []
    n = len(state)
    for i in range(n):
        wi = state[i]
        if not wi: continue
        ti, ri = top_run(list(wi))
        # skip pouring an already-complete (full uniform) stack
        if uniform(list(wi)) and len(wi) == cap: continue
        for j in range(n):
            if i == j: continue
            wj = state[j]
            space = cap - len(wj)
            if space <= 0: continue
            if len(wj) == 0:
                # don't pour a fully-uniform source into empty (no progress)
                if uniform(list(wi)): continue
                moves.append((i, j))
            elif wj[-1] == ti:
                moves.append((i, j))
    return moves

def apply_move(state, i, j, cap):
    s = [list(w) for w in state]
    ti, ri = top_run(s[i])
    space = cap - len(s[j])
    k = min(ri, space)
    for _ in range(k):
        s[j].append(s[i].pop())
    return tuple(tuple(w) for w in s)

def bfs_solve(state, cap, node_cap=400000):
    """Return shortest solution length, or None if unsolvable within budget."""
    if is_win(state): return 0
    start = state
    seen = {start}
    q = deque([(start, 0)])
    nodes = 0
    while q:
        cur, d = q.popleft()
        nodes += 1
        if nodes > node_cap:
            return None
        for (i, j) in legal_moves(cur, cap):
            nxt = apply_move(cur, i, j, cap)
            if nxt in seen: continue
            if is_win(nxt):
                return d + 1
            seen.add(nxt)
            q.append((nxt, d + 1))
    return None

def gen_board(K, C, F, rng):
    """Random distribution of K colors x C notes across K+F wallets (cap C)."""
    W = K + F
    notes = []
    for t in range(K):
        notes += [t] * C
    rng.shuffle(notes)
    wallets = [[] for _ in range(W)]
    for note in notes:
        choices = [w for w in wallets if len(w) < C]
        rng.choice(choices).append(note)
    return tuple(tuple(w) for w in wallets)

def curve(level):
    """Difficulty curve: returns (K colors, C capacity, F free wallets)."""
    if level <= 20:   return (2 + (level > 10), 3, 2)
    if level <= 50:   return (3 + ((level - 20) // 15), 4, 2)
    if level <= 90:   return (4 + ((level - 50) // 20), 4, 2 if level <= 70 else 1)
    return (5 + ((level - 90) // 15), 5, 2 if level <= 105 else 1)

def main():
    rng = random.Random(424242)
    levels = []
    n = 120
    for lvl in range(1, n + 1):
        K, C, F = curve(lvl)
        K = min(K, 6)
        best = None
        for _attempt in range(400):
            board = gen_board(K, C, F, rng)
            if is_win(board):
                continue
            par = bfs_solve(board, C)
            if par is not None and par >= 3:
                best = (board, par)
                break
        if best is None:
            # fallback: smaller scramble guaranteed solvable
            K2, C2, F2 = max(2, K - 1), C, F + 1
            while best is None:
                board = gen_board(K2, C2, F2, rng)
                if is_win(board): continue
                par = bfs_solve(board, C2)
                if par is not None and par >= 3:
                    best = (board, par); C = C2
                    break
        board, par = best
        levels.append({
            "level": lvl,
            "capacity": C,
            "colors": len(set(x for w in board for x in w)),
            "wallets": [list(w) for w in board],
            "par": par,
        })
        if lvl % 20 == 0:
            print(f"  generated {lvl}/{n} levels (last: K={K} C={C} par={par})")
    out = os.path.join(os.path.dirname(__file__), "..", "src", "levels.json")
    out = os.path.abspath(out)
    with open(out, "w") as f:
        json.dump(levels, f, separators=(",", ":"))
    print(f"WROTE {len(levels)} validated levels -> {out}")
    print(f"  par range: {min(l['par'] for l in levels)}-{max(l['par'] for l in levels)}")

if __name__ == "__main__":
    main()
