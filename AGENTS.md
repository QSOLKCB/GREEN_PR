# AGENTS.md

These instructions apply to the entire repository.

1. Preserve the zero-network, direct-from-disk browser contract.
2. Preserve seeded verdict determinism: outcome generation happens before prediction input.
3. Do not introduce remote assets, dependencies, build requirements, telemetry, or real Codex claims.
4. Treat workflow YAML as executable policy, not documentation.
5. Use safe DOM construction; do not insert generated content with `innerHTML`.
6. Run `node --test` before proposing a change.
7. Keep `README.md` human-facing and `README4AI.md` as the machine-oriented architecture contract.
8. Never emit a simulated finding that contradicts a signal disclosed to the player.
9. CI must check out and attest the pull-request head, not GitHub's synthetic merge commit.
