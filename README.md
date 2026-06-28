# 💰 Money Sort: Merge Puzzle

A polished hypercasual **cash-sort puzzle** for iOS — sort stacked banknotes between
wallets, fill a wallet with one denomination to **bank** it, clear the board to win.

Built by an autonomous RE→clone pipeline that detects rising App Store games, picks a
fresh target, and ships a 1:1-mechanic replica as a sideloadable iOS IPA.

## Gameplay
- Tap a wallet to pick it up, tap another to pour the top run of matching notes.
- A wallet filled with one uniform denomination **banks** (collect + combo payoff).
- Clear every wallet to complete the level. 120 hand-verified levels.

## Features (beyond the genre standard)
- **120 BFS-verified-solvable levels** — every board is provably clearable, no dead ends.
- **Smart Hint** — runs a real BFS solver to surface a guaranteed-progress move.
- **Full Undo stack** — free, no ad gate.
- **+Wallet booster** — inject a temporary tube to escape tight boards.
- **Combo scoring + 3-star rating** — chain banks for multipliers; beat par for 3 stars.
- **Vault meta-counter** — lifetime banked cash persists across levels.
- **Color-blind-safe** — every denomination has a distinct emoji + label.
- **No forced ads / no dark patterns.**

## Tech
- Expo SDK 56 · React Native 0.85 · React 19 · TypeScript (strict, typecheck-clean)
- Pure immutable reducer engine (`src/engine.ts`) with an embedded BFS solver
- Levels generated + validated offline (`scripts/gen_levels.py`)

## Build (unsigned IPA)
Push to `main` (or run the workflow manually) → GitHub Actions builds an **unsigned IPA**
on `macos-latest`. Download from the run's **Artifacts**. Sideload via AltStore / Sideloadly
(free Apple ID, 7-day expiry) or sign with your provisioning profile for permanent install.

## Design references
Mood board in `design/` — sourced from Pinterest + itch.io (cash-sort / ball-sort UI).

---
*Genre reconstruction inspired by the rising title "Money Sort: Merge Puzzle". Original code
and assets; no third-party binaries or copyrighted assets included.*
