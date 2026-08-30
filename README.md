# GREEN PR

**Will the Codex review come back green—or full of bugs?**

GREEN PR turns the strange suspense of waiting for an automated pull-request review into an offline prediction game. Read the PR dossier, inspect the signals, call the verdict, and decide how much confidence to stake on it.

No installation, server, account, API, or network connection is required.

## Play

Play the hosted build at [qsolkcb.github.io/GREEN_PR](https://qsolkcb.github.io/GREEN_PR/).

To play fully offline:

1. Download or clone the repository.
2. Open `index.html` in a modern browser.
3. Survive eight simulated pull requests with your review reputation intact.

Keyboard controls:

- `G` — predict a green review
- `B` — predict bugs
- `1`, `2`, or `3` — choose 55%, 70%, or 85% confidence
- `Enter` — submit the prediction or advance to the next PR

## How it works

Every campaign has a visible seed. Each round is derived from that seed and its round number, so replaying a seed produces the same dossiers and verdicts.

The review outcome is fixed when the dossier is generated—before the player chooses a prediction. After each result, the game reveals both the green-review probability and the deterministic review roll.

Confidence changes the stakes:

| Confidence | Correct | Wrong |
| --- | ---: | ---: |
| 55% | +90 | −70 |
| 70% | +150 | −170 |
| 85% | +260 | −380 |

Correct streaks add a bonus. Calibration uses the Brier score for the probability assigned to the observed verdict.

And yes: every campaign contains one guaranteed boss round called “I only changed one `.yml` config file.” It is correctly classified as a danger signal.

## Offline contract

The playable runtime consists of four local files:

- `index.html` — semantic game interface
- `styles.css` — responsive industrial-phosphor presentation
- `game-core.js` — deterministic generator and scoring rules
- `script.js` — browser interaction, optional synthesized sound, and local best score

There are no remote fonts, libraries, images, analytics, network clients, or runtime dependencies. The optional sound effects are synthesized with the browser's Web Audio API. The only persisted value is the best score in local browser storage.

## Test

Node.js 22 or newer is recommended for the repository checks:

```sh
npm test
```

The dependency-free test suite verifies deterministic generation, scoring, outcome transparency, accessibility hooks, and the no-network runtime contract.

## Deployment

GitHub Actions validates the same four-file offline runtime on every pull request. A successful push to `main` packages only those files and deploys them to the `github-pages` environment; manual deployments are also restricted to `main`.

Fittingly, that policy lives in `.github/workflows/pages.yml`: one more `.yml` config file with real consequences.

## Important non-claim

GREEN PR is a parody simulation. It does not call Codex, inspect a real repository, estimate actual review quality, or predict real review outcomes. Simulated findings are fictionalised software-review patterns.

## License

Apache License 2.0. See `LICENSE`.
