"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../game-core.js");

test("the same seed and round always produce the same review", () => {
  const first = core.generateRound("DEADBEEF", 3);
  const second = core.generateRound("DEADBEEF", 3);

  assert.deepEqual(second, first);
  assert.equal(first.outcome, second.outcome);
  assert.equal(first.outcomeRoll, second.outcomeRoll);
});

test("different round coordinates produce varied dossiers", () => {
  const rounds = Array.from({ length: core.TOTAL_ROUNDS }, (_, index) => core.generateRound("CAFEF00D", index));
  const identities = new Set(rounds.map((round) => round.id));
  const commits = new Set(rounds.map((round) => round.commit));

  assert.equal(identities.size, core.TOTAL_ROUNDS);
  assert.equal(commits.size, core.TOTAL_ROUNDS);
});

test("every campaign contains the one tiny YAML config boss", () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const rounds = Array.from(
      { length: core.TOTAL_ROUNDS },
      (_, index) => core.generateRound(`yaml-seed-${seed}`, index),
    );
    const yamlBosses = rounds.filter((round) => round.signals.some((signal) => signal.id === "one-yml"));

    assert.equal(yamlBosses.length, 1);
    assert.equal(yamlBosses[0].changeType.id, "workflow");
    assert.match(yamlBosses[0].title, /\.yml/);
  }
});

test("generated reviews obey the probability and dossier bounds", () => {
  for (let seed = 0; seed < 250; seed += 1) {
    const round = core.generateRound(`seed-${seed}`, seed % core.TOTAL_ROUNDS);

    assert.ok(round.greenChance >= 0.08 && round.greenChance <= 0.92);
    assert.ok(round.outcomeRoll >= 0 && round.outcomeRoll < 1);
    assert.ok(["green", "bugs"].includes(round.outcome));
    assert.ok(round.signals.length >= 3 && round.signals.length <= 4);
    assert.equal(new Set(round.signals.map((signal) => signal.group)).size, round.signals.length);
    assert.equal(round.findings.length === 0, round.outcome === "green");
    assert.ok(round.additions > 0);
    assert.ok(round.deletions > 0);
    assert.ok(round.files > 0);
  }
});

test("findings never contradict evidence disclosed in the dossier", () => {
  for (let seed = 0; seed < 500; seed += 1) {
    for (let roundIndex = 0; roundIndex < core.TOTAL_ROUNDS; roundIndex += 1) {
      const round = core.generateRound(String(seed), roundIndex);
      const signalIds = new Set(round.signals.map((signal) => signal.id));

      for (const finding of round.findings) {
        for (const conflict of finding.conflictsWithSignals || []) {
          assert.equal(
            signalIds.has(conflict),
            false,
            `seed ${seed}, round ${roundIndex + 1}: ${finding.id} contradicts ${conflict}`,
          );
        }
      }
    }
  }
});

test("the review-33 signal always displays pass 33", () => {
  let observed = 0;

  for (let seed = 0; seed < 500; seed += 1) {
    for (let roundIndex = 0; roundIndex < core.TOTAL_ROUNDS; roundIndex += 1) {
      const round = core.generateRound(String(seed), roundIndex);
      if (round.signals.some((signal) => signal.id === "review-33")) {
        observed += 1;
        assert.equal(round.passNumber, 33);
      }
    }
  }

  assert.ok(observed > 0, "test sample must exercise review-33");
});

test("the outcome is decided by the disclosed chance and roll", () => {
  for (let index = 0; index < 100; index += 1) {
    const round = core.generateRound("transparent-verdict", index);
    const expected = round.outcomeRoll < round.greenChance ? "green" : "bugs";
    assert.equal(round.outcome, expected);
  }
});

test("six-decimal outcome rolls never round up to one", () => {
  const regression = core.generateRound("rare-3013090", 2);

  assert.equal(regression.outcomeRoll, 0.999999);
  assert.ok(regression.outcomeRoll < 1);

  for (let index = 0; index < 1000; index += 1) {
    const round = core.generateRound(`micro-unit-${index}`, index % core.TOTAL_ROUNDS);
    const microUnits = round.outcomeRoll * 1_000_000;
    assert.ok(Math.abs(microUnits - Math.round(microUnits)) < 1e-6);
    assert.ok(round.outcomeRoll >= 0 && round.outcomeRoll < 1);
  }
});

test("confidence increases both reward and punishment", () => {
  const cautiousCorrect = core.scorePrediction("green", "green", 0.55, 0);
  const certainCorrect = core.scorePrediction("green", "green", 0.85, 0);
  const cautiousWrong = core.scorePrediction("green", "bugs", 0.55, 0);
  const certainWrong = core.scorePrediction("green", "bugs", 0.85, 0);

  assert.ok(certainCorrect.delta > cautiousCorrect.delta);
  assert.ok(certainWrong.delta < cautiousWrong.delta);
  assert.ok(certainCorrect.calibration > cautiousCorrect.calibration);
  assert.ok(certainWrong.calibration < cautiousWrong.calibration);
});

test("a correct streak earns a capped bonus", () => {
  assert.equal(core.scorePrediction("bugs", "bugs", 0.7, 0).streakBonus, 0);
  assert.equal(core.scorePrediction("bugs", "bugs", 0.7, 3).streakBonus, 75);
  assert.equal(core.scorePrediction("bugs", "bugs", 0.7, 100).streakBonus, 100);
  assert.equal(core.scorePrediction("bugs", "green", 0.7, 100).streakBonus, 0);
});

test("campaign summaries classify strong and weak forecasting", () => {
  const strong = Array.from({ length: 8 }, () => ({ correct: true, brier: 0.0225 }));
  const weak = Array.from({ length: 8 }, () => ({ correct: false, brier: 0.7225 }));

  assert.equal(core.summarizeCampaign(strong, 2000).grade, "EXACT-HEAD ORACLE");
  assert.equal(core.summarizeCampaign(weak, -400).grade, "MERGE BUTTON MENACE");
});

test("invalid predictions fail closed", () => {
  assert.throws(() => core.scorePrediction("maybe", "green", 0.7, 0), TypeError);
  assert.throws(() => core.scorePrediction("green", "green", 0.99, 0), TypeError);
  assert.throws(() => core.generateRound("seed", -1), TypeError);
});

test("stored score parsing preserves zero and negative records", () => {
  assert.equal(core.parseStoredScore(null), null);
  assert.equal(core.parseStoredScore(""), null);
  assert.equal(core.parseStoredScore("not-a-score"), null);
  assert.equal(core.parseStoredScore("0"), 0);
  assert.equal(core.parseStoredScore("-450"), -450);
  assert.equal(core.parseStoredScore("123.9"), 123);
});
