(function attachGreenPRCore(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.GreenPRCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGreenPRCore() {
  "use strict";

  const VERSION = "1.0.0";
  const TOTAL_ROUNDS = 8;
  const CONFIDENCE_LEVELS = Object.freeze([0.55, 0.7, 0.85]);

  const CHANGE_TYPES = Object.freeze([
    {
      id: "docs",
      label: "Documentation repair",
      title: "Make the human and AI contracts agree",
      branch: "docs/contract-alignment",
      baseRisk: 7,
      tags: ["docs", "contract"],
    },
    {
      id: "feature",
      label: "Feature implementation",
      title: "Add the one feature that became eleven files",
      branch: "feat/definitely-contained",
      baseRisk: 18,
      tags: ["feature", "code"],
    },
    {
      id: "refactor",
      label: "Core refactor",
      title: "Simplify the machinery without changing behaviour",
      branch: "refactor/what-could-go-wrong",
      baseRisk: 25,
      tags: ["refactor", "code"],
    },
    {
      id: "security",
      label: "Security boundary",
      title: "Harden the probe containment envelope",
      branch: "hardening/one-last-boundary",
      baseRisk: 38,
      tags: ["security", "code"],
    },
    {
      id: "formal",
      label: "Formal proof batch",
      title: "Freeze four observations against the exact head",
      branch: "lean/observation-batch",
      baseRisk: 28,
      tags: ["formal", "contract"],
    },
    {
      id: "workflow",
      label: "One YAML config file",
      title: "Change one tiny .yml config file",
      branch: "ci/one-tiny-yml-file",
      baseRisk: 31,
      tags: ["workflow", "security"],
    },
    {
      id: "schema",
      label: "Schema migration",
      title: "Preserve old and new identities during migration",
      branch: "schema/compatible-in-theory",
      baseRisk: 34,
      tags: ["schema", "contract"],
    },
    {
      id: "projection",
      label: "Generated projection",
      title: "Regenerate the deterministic public-site bundle",
      branch: "data/the-builder-was-run",
      baseRisk: 24,
      tags: ["projection", "workflow"],
    },
  ]);

  const SIZES = Object.freeze([
    { id: "surgical", label: "Surgical", min: 6, max: 48, risk: -9 },
    { id: "contained", label: "Contained", min: 49, max: 240, risk: 0 },
    { id: "substantial", label: "Substantial", min: 241, max: 920, risk: 12 },
    { id: "boss-fight", label: "Boss fight", min: 921, max: 2400, risk: 23 },
  ]);

  const SIGNALS = Object.freeze([
    {
      id: "exact-head",
      label: "Evidence is bound to the exact commit head",
      detail: "The attestation and tested SHA agree byte-for-byte.",
      tone: "good",
      risk: -15,
      tags: ["contract", "security", "formal", "workflow"],
      group: "evidence",
    },
    {
      id: "full-suite",
      label: "Full suite green on two runtimes",
      detail: "Nothing is skipped, quarantined, or marked informational.",
      tone: "good",
      risk: -12,
      tags: ["code", "workflow", "schema", "projection", "formal"],
      group: "tests",
    },
    {
      id: "property-tests",
      label: "Property and adversarial tests were added",
      detail: "The tests attack the contract instead of admiring the happy path.",
      tone: "good",
      risk: -10,
      tags: ["code", "security", "schema", "formal"],
      group: "tests",
    },
    {
      id: "fresh-projection",
      label: "Generated artifacts match a clean rebuild",
      detail: "The checked-in projection is reproducible from source inputs.",
      tone: "good",
      risk: -14,
      tags: ["projection", "workflow"],
      group: "generated",
    },
    {
      id: "invariants-updated",
      label: "Invariants changed before implementation",
      detail: "The new behaviour has an explicit, reviewable contract.",
      tone: "good",
      risk: -9,
      tags: ["contract", "formal", "schema", "security"],
      group: "contract",
    },
    {
      id: "deterministic-replay",
      label: "Deterministic replay agrees across clean runs",
      detail: "Hashes, ordering, and canonical bytes remain stable.",
      tone: "good",
      risk: -11,
      tags: ["projection", "schema", "code", "formal"],
      group: "determinism",
    },
    {
      id: "human-reread",
      label: "A human reread the final diff",
      detail: "This rare ritual has historically improved survival rates.",
      tone: "good",
      risk: -6,
      tags: ["all"],
      group: "ritual",
    },
    {
      id: "tiny-diff",
      label: "Everyone keeps saying, “It is only a tiny diff”",
      detail: "No one has explained why that should be reassuring.",
      tone: "warn",
      risk: 7,
      tags: ["all"],
      group: "ritual",
    },
    {
      id: "boundary-change",
      label: "The patch changes a trust boundary",
      detail: "A locally correct line may still weaken the system contract.",
      tone: "bad",
      risk: 16,
      tags: ["security", "workflow", "schema"],
      group: "boundary",
    },
    {
      id: "stale-generated",
      label: "A source registry changed; projections did not",
      detail: "The builder may have been invoked spiritually rather than literally.",
      tone: "bad",
      risk: 21,
      tags: ["projection", "workflow"],
      group: "generated",
    },
    {
      id: "shell-shape",
      label: "Workflow shell syntax changed shape",
      detail: "Block, flow, inherited, and aliased forms do not always parse alike.",
      tone: "bad",
      risk: 16,
      tags: ["workflow", "security"],
      group: "parser",
    },
    {
      id: "one-yml",
      label: "It is only one .yml config file",
      detail: "Historical evidence does not support the word “only.”",
      tone: "bad",
      risk: 15,
      tags: ["workflow"],
      group: "scope",
    },
    {
      id: "lockfile-drift",
      label: "Dependency metadata moved without the lockfile",
      detail: "The resolver has been left a small interpretive dance.",
      tone: "bad",
      risk: 13,
      tags: ["code", "workflow"],
      group: "dependencies",
    },
    {
      id: "unknown-abi",
      label: "The native-path test ignores a compatibility ABI",
      detail: "One alternate syscall namespace is standing behind the curtain.",
      tone: "bad",
      risk: 20,
      tags: ["security", "code"],
      group: "boundary",
    },
    {
      id: "mutable-class",
      label: "Append validation compares payloads, not classification",
      detail: "History may be immutable while its meaning quietly changes clothes.",
      tone: "bad",
      risk: 18,
      tags: ["schema", "contract"],
      group: "identity",
    },
    {
      id: "timestamp",
      label: "A wall-clock timestamp entered canonical output",
      detail: "Replay determinism is now negotiating with linear time.",
      tone: "bad",
      risk: 17,
      tags: ["projection", "schema", "code"],
      group: "determinism",
    },
    {
      id: "alias-parser",
      label: "The parser accepts more aliases than the validator sees",
      detail: "Equivalent syntax has created non-equivalent enforcement.",
      tone: "bad",
      risk: 17,
      tags: ["workflow", "schema", "security"],
      group: "parser",
    },
    {
      id: "review-33",
      label: "This is review pass thirty-three",
      detail: "Statistically impressive. Emotionally ambiguous.",
      tone: "warn",
      risk: 4,
      tags: ["all"],
      group: "ritual",
    },
    {
      id: "docs-only",
      label: "The author swears this is docs-only",
      detail: "A workflow file is visible in the changed-file list.",
      tone: "warn",
      risk: 11,
      tags: ["docs", "workflow"],
      group: "scope",
    },
    {
      id: "clean-room",
      label: "A clean-room run reproduced the claimed evidence",
      detail: "No warm cache or untracked file was required.",
      tone: "good",
      risk: -13,
      tags: ["all"],
      group: "evidence",
    },
    {
      id: "one-untracked-file",
      label: "There is one unexplained untracked fixture",
      detail: "It is almost certainly nothing. Almost.",
      tone: "warn",
      risk: 9,
      tags: ["code", "formal", "projection", "schema"],
      group: "scope",
    },
  ]);

  const FINDINGS = Object.freeze([
    {
      id: "x32-bypass",
      severity: "P1",
      title: "Reject compatibility syscall numbers before the native table",
      body: "The alternate ABI reaches a path the allowlist never evaluates.",
      tags: ["security", "code"],
    },
    {
      id: "mutable-record-class",
      severity: "P1",
      title: "Keep record classification immutable across append checks",
      body: "The payload is stable, but its evidence class can be relabelled.",
      tags: ["schema", "contract"],
    },
    {
      id: "stale-projection",
      severity: "P1",
      title: "Regenerate the checked-in site projection",
      body: "Source inputs changed while the deterministic output remained stale.",
      tags: ["projection", "workflow"],
    },
    {
      id: "shell-bypass",
      severity: "P1",
      title: "Handle flow-style inherited shell defaults",
      body: "The policy sees block syntax but misses its semantically equivalent form.",
      tags: ["workflow", "security"],
    },
    {
      id: "yaml-merge-key",
      severity: "P1",
      title: "Expand YAML anchors before enforcing workflow policy",
      body: "The .yml file is syntactically tiny and semantically several different files in a trench coat.",
      tags: ["workflow", "security"],
    },
    {
      id: "head-binding",
      severity: "P1",
      title: "Bind the graduation claim to the reviewed head",
      body: "Green evidence from an earlier commit cannot attest the current tree.",
      tags: ["contract", "formal", "security"],
    },
    {
      id: "lockfile",
      severity: "P2",
      title: "Commit the lockfile produced by the dependency change",
      body: "Fresh installs do not reproduce the environment used by the patch.",
      tags: ["code", "workflow"],
    },
    {
      id: "timestamp-replay",
      severity: "P1",
      title: "Exclude wall-clock state from canonical serialization",
      body: "Two equivalent runs produce different bytes and therefore different IDs.",
      tags: ["projection", "schema", "code"],
    },
    {
      id: "unknown-major",
      severity: "P1",
      title: "Reject unknown schema majors before migration",
      body: "The fallback path treats an incompatible contract as additive metadata.",
      tags: ["schema", "contract"],
    },
    {
      id: "vacuous-proof",
      severity: "P2",
      title: "Strengthen the theorem precondition to rule out the empty witness",
      body: "The statement is true, but only because the interesting case is unreachable.",
      tags: ["formal", "contract"],
    },
    {
      id: "docs-workflow",
      severity: "P2",
      title: "Do not classify executable policy as documentation",
      body: "The changed workflow affects enforcement even if the prose is correct.",
      tags: ["docs", "workflow"],
    },
    {
      id: "ordering",
      severity: "P2",
      title: "Canonicalize map ordering before hashing",
      body: "Insertion order leaks into an identifier claimed to be deterministic.",
      tags: ["projection", "schema", "code"],
    },
    {
      id: "signal-delivery",
      severity: "P1",
      title: "Deny signal-delivery syscalls from the probe",
      body: "Protecting only the harness PID leaves other host processes reachable.",
      tags: ["security"],
    },
    {
      id: "fixture-gap",
      severity: "P2",
      title: "Add a language-neutral fixture for this edge case",
      body: "The reference implementation passes, but consumers can disagree silently.",
      tags: ["schema", "contract", "code"],
    },
    {
      id: "race",
      severity: "P1",
      title: "Make the evidence write atomic",
      body: "Concurrent runs can publish a manifest paired with the wrong artifact.",
      tags: ["workflow", "projection", "code"],
    },
  ]);

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function hashSeed(value) {
    const text = String(value);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed) || 0x6d2b79f5;

    return function nextRandom() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInteger(rng, minimum, maximum) {
    return Math.floor(rng() * (maximum - minimum + 1)) + minimum;
  }

  function pick(rng, values) {
    return values[Math.floor(rng() * values.length)];
  }

  function shuffle(rng, values) {
    const copy = values.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  function matchesTags(item, tags) {
    return item.tags.includes("all") || item.tags.some((tag) => tags.includes(tag));
  }

  function selectSignals(rng, changeType, desiredCount, excludedIds) {
    const excluded = new Set(excludedIds || []);
    const candidates = shuffle(
      rng,
      SIGNALS.filter(
        (signal) => !excluded.has(signal.id) && matchesTags(signal, changeType.tags.concat(changeType.id)),
      ),
    );
    const selected = [];
    const usedGroups = new Set();

    for (const signal of candidates) {
      if (!usedGroups.has(signal.group)) {
        selected.push(signal);
        usedGroups.add(signal.group);
      }

      if (selected.length === desiredCount) {
        break;
      }
    }

    return selected;
  }

  function selectFindings(rng, tags, count) {
    const relevant = shuffle(
      rng,
      FINDINGS.filter((finding) => matchesTags(finding, tags)),
    );
    const fallback = shuffle(
      rng,
      FINDINGS.filter((finding) => !relevant.includes(finding)),
    );

    return relevant.concat(fallback).slice(0, count);
  }

  function hexadecimal(rng, length) {
    let output = "";
    const alphabet = "0123456789abcdef";

    for (let index = 0; index < length; index += 1) {
      output += alphabet[Math.floor(rng() * alphabet.length)];
    }

    return output;
  }

  function generateRound(seed, roundIndex) {
    if (!Number.isInteger(roundIndex) || roundIndex < 0) {
      throw new TypeError("roundIndex must be a non-negative integer");
    }

    const normalizedSeed = String(seed);
    const rng = createRng(`${normalizedSeed}::round::${roundIndex}`);
    const yamlBossRound = hashSeed(`${normalizedSeed}::yaml-boss`) % TOTAL_ROUNDS;
    const ordinaryChangeTypes = CHANGE_TYPES.filter((candidate) => candidate.id !== "workflow");
    const changeType = roundIndex === yamlBossRound
      ? CHANGE_TYPES.find((candidate) => candidate.id === "workflow")
      : pick(rng, ordinaryChangeTypes);
    const size = pick(rng, SIZES);
    const additions = randomInteger(rng, size.min, size.max);
    const deletions = randomInteger(rng, Math.max(1, Math.floor(size.min / 5)), Math.max(2, Math.floor(size.max / 3)));
    const files = randomInteger(rng, Math.max(1, Math.ceil(additions / 180)), Math.max(2, Math.ceil(additions / 55)));
    const signalCount = randomInteger(rng, 3, 4);
    let signals = selectSignals(
      rng,
      changeType,
      signalCount,
      roundIndex === yamlBossRound ? [] : ["one-yml"],
    );
    if (roundIndex === yamlBossRound && !signals.some((signal) => signal.id === "one-yml")) {
      const yamlSignal = SIGNALS.find((signal) => signal.id === "one-yml");
      signals = [yamlSignal, ...signals.filter((signal) => signal.group !== yamlSignal.group)].slice(0, signalCount);
    }
    const signalRisk = signals.reduce((total, signal) => total + signal.risk, 0);
    const hiddenNoise = randomInteger(rng, -8, 8);
    const risk = clamp(18 + changeType.baseRisk + size.risk + signalRisk + hiddenNoise, 8, 92);
    const greenChance = Number((1 - risk / 100).toFixed(2));
    const outcomeRoll = Number(rng().toFixed(6));
    const outcome = outcomeRoll < greenChance ? "green" : "bugs";
    const maximumFindings = greenChance < 0.35 ? 5 : greenChance < 0.6 ? 4 : 3;
    const findingCount = outcome === "bugs" ? randomInteger(rng, 1, maximumFindings) : 0;
    const findings = selectFindings(rng, changeType.tags.concat(changeType.id), findingCount);
    const tests = randomInteger(rng, 18, 540);
    const passNumber = rng() < 0.18 ? randomInteger(rng, 20, 44) : randomInteger(rng, 1, 9);

    return Object.freeze({
      id: `${hashSeed(`${seed}:${roundIndex}`).toString(16).padStart(8, "0")}`,
      number: 1 + roundIndex,
      passNumber,
      changeType,
      size,
      title: changeType.title,
      branch: changeType.branch,
      commit: hexadecimal(rng, 10),
      additions,
      deletions,
      files,
      tests,
      signals,
      risk,
      greenChance,
      outcomeRoll,
      outcome,
      findings,
    });
  }

  function validatePrediction(prediction, confidence) {
    if (prediction !== "green" && prediction !== "bugs") {
      throw new TypeError('prediction must be either "green" or "bugs"');
    }

    if (!CONFIDENCE_LEVELS.includes(confidence)) {
      throw new TypeError("confidence must be one of the supported levels");
    }
  }

  function scorePrediction(prediction, outcome, confidence, currentStreak) {
    validatePrediction(prediction, confidence);

    if (outcome !== "green" && outcome !== "bugs") {
      throw new TypeError('outcome must be either "green" or "bugs"');
    }

    const tier = CONFIDENCE_LEVELS.indexOf(confidence);
    const correct = prediction === outcome;
    const rewards = [90, 150, 260];
    const penalties = [70, 170, 380];
    const safeStreak = Number.isFinite(currentStreak) ? Math.max(0, Math.floor(currentStreak)) : 0;
    const streakBonus = correct ? Math.min(safeStreak, 4) * 25 : 0;
    const delta = correct ? rewards[tier] + streakBonus : -penalties[tier];
    const probabilityGreen = prediction === "green" ? confidence : 1 - confidence;
    const observedGreen = outcome === "green" ? 1 : 0;
    const brier = Number(((probabilityGreen - observedGreen) ** 2).toFixed(4));
    const calibration = Math.round((1 - brier) * 100);

    return Object.freeze({
      correct,
      delta,
      streakBonus,
      brier,
      calibration,
      probabilityGreen,
    });
  }

  function summarizeCampaign(predictions, finalScore) {
    const safePredictions = Array.isArray(predictions) ? predictions : [];
    const correct = safePredictions.filter((entry) => entry.correct).length;
    const accuracy = safePredictions.length === 0 ? 0 : correct / safePredictions.length;
    const averageBrier = safePredictions.length === 0
      ? 1
      : safePredictions.reduce((total, entry) => total + entry.brier, 0) / safePredictions.length;
    const calibration = Math.round((1 - averageBrier) * 100);
    let grade = "PENDING REVIEW";
    let epitaph = "No prophecy was submitted.";

    if (safePredictions.length > 0) {
      if (accuracy >= 0.875 && calibration >= 80) {
        grade = "EXACT-HEAD ORACLE";
        epitaph = "Codex blinks first.";
      } else if (accuracy >= 0.625) {
        grade = "REVIEW WHISPERER";
        epitaph = "Suspiciously good at smelling a P1.";
      } else if (accuracy >= 0.375) {
        grade = "CI WEATHER SERVICE";
        epitaph = "Patchy green with localised bug storms.";
      } else {
        grade = "MERGE BUTTON MENACE";
        epitaph = "Confidence was abundant. Evidence was seasonal.";
      }
    }

    return Object.freeze({
      correct,
      total: safePredictions.length,
      accuracy,
      calibration,
      finalScore: Math.round(Number(finalScore) || 0),
      grade,
      epitaph,
    });
  }

  return Object.freeze({
    VERSION,
    TOTAL_ROUNDS,
    CONFIDENCE_LEVELS,
    clamp,
    hashSeed,
    createRng,
    generateRound,
    scorePrediction,
    summarizeCampaign,
  });
});
