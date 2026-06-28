# COMPETITOR_REFERENCE.md — Money Sort: Merge Puzzle clone

**Clone target:** Money Sort: Merge Puzzle (`com.loop.moneysort`, appid 6758149135)
Loop Games — NEW entrant #92 top_free_games (radar score 59, 2026-06-28 tick).
Genre: hypercasual **sort-and-merge** puzzle (cash-themed Ball-Sort variant).

> Note: ipatool is not authenticated on this VPS (keyring empty) → no FairPlay
> IPA pull this tick. Build is a faithful genre reconstruction from the
> mechanic + real Pinterest/itch.io design references (28 + 10 covers in
> `design/`), not ripped binaries. Recorded as `re_blocked` in built.json.

## The mechanic (genre-standard)
Cash notes of several **denominations** (color tiers) are stacked in **wallets**
(tubes). You move the top run of matching notes from one wallet to another
(onto empty or a matching top). Fill a wallet with one uniform denomination →
it **banks** (clears with a merge/collect pop). Clear the whole board to win.
This is the Ball-Sort core with a money skin — exactly the proven hypercasual
loop Loop Games shipped.

## Direct competitors scanned

| Game | Studio | What they do well | Weakness |
|---|---|---|---|
| **Ball Sort Puzzle** | Various | Tight core loop, instant restart, undo | No progression/meta, ad-heavy |
| **Water Sort Puzzle** | IEC Global | Huge level count, color-blind mode | Repetitive, no scoring depth |
| **Cash Sort / Money Sort clones** | Loop & others | Satisfying "bank" payoff, juicy SFX | Shallow, no skill expression |
| **2048 / merge games** | Ketchapp et al. | Merge dopamine, number-go-up | Different input model |

## COMBINE the best
- Ball-Sort's **guaranteed-solvable** levels (we generate by reverse-move +
  BFS-verify → every level provably clearable; no dead ends).
- Water-Sort's **deep level ladder** (120 validated levels, difficulty curve).
- Cash-Sort's **"bank" payoff** juice (merge-collapse animation + cash counter).
- Merge games' **tier progression** vibe (denomination ladder $1→$100).

## OUR differentiating features (added on top)
1. **Undo stack** — full move history revert (most free clones gate this behind ads).
2. **Smart Hint** — runs the real BFS solver to surface a guaranteed-progress
   move on demand (no other sorter computes an actual solution path).
3. **+Wallet booster** — inject a temporary free tube to escape tight boards.
4. **Combo scoring + star rating** — back-to-back banks chain a multiplier;
   3-star = solved at/under the par move count (adds skill expression to a genre
   that usually has none).
5. **Vault meta-counter** — total banked cash persists across levels as a
   lifetime score (light meta-progression hook).
6. **Color-blind-safe** — every denomination has a distinct emoji + label, not
   color alone.
7. **No forced ads / no dark patterns** — undo & hints are free.

## Solvability guarantee (engineering)
Levels are generated solved, then scrambled by a sequence of **legal forward
moves** (each reversible) → the scrambled state is always solvable. A bounded
BFS solver double-checks every generated level and powers the Hint button.
`src/levels.json` is real validated data, not placeholders.
