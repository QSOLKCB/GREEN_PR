# GREEN PR — AI Context

## Purpose

GREEN PR is a zero-network, dependency-free browser prediction game. It satirises the uncertainty of waiting for a Codex pull-request review without representing itself as a real review model.

## Runtime architecture

1. `game-core.js` is a UMD module shared by the browser and Node tests.
2. `generateRound(seed, roundIndex)` produces the complete dossier, hidden probability, outcome roll, verdict, and possible findings before player input.
3. `script.js` owns DOM state, review pacing, accessibility announcements, local-best persistence, and optional Web Audio cues.
4. `index.html` and `styles.css` provide a single responsive game surface that works when opened directly from disk.

## Constitutional invariants

- The runtime performs no network request.
- The same `(seed, roundIndex)` pair produces the same complete round.
- Player input cannot alter or reroll an already generated verdict.
- The probability and full six-decimal review roll are revealed after resolution.
- Generated findings cannot contradict evidence already disclosed in the dossier.
- A `review-33` signal and the displayed pass number always agree.
- The game never claims to model actual Codex behaviour or real PR risk.
- All generated copy enters the DOM through `textContent` or node construction, never `innerHTML`.
- The browser build has no package or build step.
- A `.yml` file is not treated as inert documentation merely because someone calls it “config.”
- Every eight-round campaign deterministically contains exactly one forced `.yml` boss dossier.

## Extension rules

- Add deterministic content to the catalogues in `game-core.js`.
- Keep randomness behind `createRng`; do not use `Math.random()` for rounds or verdicts.
- Keep external URLs, CDNs, hosted fonts, telemetry, and network clients out of the playable files.
- Preserve keyboard controls, focus states, live announcements, and reduced-motion behaviour.
- Update tests when scoring, probability bounds, or runtime file relationships change.
- Declare direct signal contradictions in each finding's `conflictsWithSignals` list.

## Verification

Run `npm test` or `node --test`. No dependency installation is required.
