(function runGreenPR() {
  "use strict";

  const core = window.GreenPRCore;

  if (!core) {
    throw new Error("GREEN PR core failed to load");
  }

  const BEST_SCORE_KEY = "green-pr-best-score-v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reviewDelay = reducedMotion ? 90 : 470;

  const elements = {
    stage: document.querySelector("#stage"),
    roundNumber: document.querySelector("#roundNumber"),
    scoreValue: document.querySelector("#scoreValue"),
    streakValue: document.querySelector("#streakValue"),
    seedValue: document.querySelector("#seedValue"),
    prTitle: document.querySelector("#prTitle"),
    prBadge: document.querySelector("#prBadge"),
    branchValue: document.querySelector("#branchValue"),
    commitValue: document.querySelector("#commitValue"),
    changeTypeValue: document.querySelector("#changeTypeValue"),
    additionsValue: document.querySelector("#additionsValue"),
    deletionsValue: document.querySelector("#deletionsValue"),
    filesValue: document.querySelector("#filesValue"),
    testsValue: document.querySelector("#testsValue"),
    passValue: document.querySelector("#passValue"),
    signalList: document.querySelector("#signalList"),
    latencyValue: document.querySelector("#latencyValue"),
    reviewCore: document.querySelector("#reviewCore"),
    coreGlyph: document.querySelector("#coreGlyph"),
    reactorKicker: document.querySelector("#reactorKicker"),
    reactorTitle: document.querySelector("#reactorTitle"),
    reactorBody: document.querySelector("#reactorBody"),
    pipelineSteps: Array.from(document.querySelectorAll("#pipeline li")),
    resultPanel: document.querySelector("#resultPanel"),
    verdictStamp: document.querySelector("#verdictStamp"),
    scoreDelta: document.querySelector("#scoreDelta"),
    resultTitle: document.querySelector("#resultTitle"),
    resultBody: document.querySelector("#resultBody"),
    chanceReveal: document.querySelector("#chanceReveal"),
    rollReveal: document.querySelector("#rollReveal"),
    calibrationValue: document.querySelector("#calibrationValue"),
    findingList: document.querySelector("#findingList"),
    nextButton: document.querySelector("#nextButton"),
    predictionButtons: Array.from(document.querySelectorAll("[data-prediction]")),
    confidenceButtons: Array.from(document.querySelectorAll("[data-confidence]")),
    positionValue: document.querySelector("#positionValue"),
    submitPrediction: document.querySelector("#submitPrediction"),
    ledgerList: document.querySelector("#ledgerList"),
    recordValue: document.querySelector("#recordValue"),
    soundToggle: document.querySelector("#soundToggle"),
    briefingDialog: document.querySelector("#briefingDialog"),
    startButton: document.querySelector("#startButton"),
    summaryDialog: document.querySelector("#summaryDialog"),
    summaryTitle: document.querySelector("#summaryTitle"),
    summaryEpitaph: document.querySelector("#summaryEpitaph"),
    summaryScore: document.querySelector("#summaryScore"),
    summaryAccuracy: document.querySelector("#summaryAccuracy"),
    summaryCalibration: document.querySelector("#summaryCalibration"),
    summaryBest: document.querySelector("#summaryBest"),
    newCampaignButton: document.querySelector("#newCampaignButton"),
    replayCampaignButton: document.querySelector("#replayCampaignButton"),
    announcer: document.querySelector("#announcer"),
  };

  let campaign;
  let currentRound;
  let selectedPrediction = null;
  let selectedConfidence = null;
  let reviewToken = 0;
  let soundEnabled = false;
  let audioContext = null;

  function formatNumber(value) {
    return new Intl.NumberFormat("en").format(value);
  }

  function readBestScore() {
    try {
      return core.parseStoredScore(window.localStorage.getItem(BEST_SCORE_KEY));
    } catch (_error) {
      return null;
    }
  }

  function writeBestScore(score) {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
    } catch (_error) {
      // Storage can be unavailable under strict file:// privacy settings.
    }
  }

  function generateSeed() {
    const values = new Uint32Array(1);

    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(values);
    } else {
      values[0] = core.hashSeed(`${Date.now()}:${performance.now()}`);
    }

    return values[0].toString(16).padStart(8, "0").toUpperCase();
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
      if (dialog.open) {
        dialog.close();
      }
    } else {
      dialog.removeAttribute("open");
    }
  }

  function announce(message) {
    elements.announcer.textContent = "";
    window.setTimeout(() => {
      elements.announcer.textContent = message;
    }, 30);
  }

  function ownsNativeEnterActivation(target) {
    return Boolean(
      target
      && typeof target.closest === "function"
      && target.closest('button, a[href], input, select, textarea, summary, [role="button"]'),
    );
  }

  function setInteractive(enabled) {
    for (const button of elements.predictionButtons.concat(elements.confidenceButtons)) {
      button.disabled = !enabled;
    }

    elements.submitPrediction.disabled = !enabled || !selectedPrediction || !selectedConfidence;
  }

  function updatePosition() {
    if (!selectedPrediction && !selectedConfidence) {
      elements.positionValue.textContent = "UNCOMMITTED";
    } else if (!selectedPrediction) {
      elements.positionValue.textContent = `${Math.round(selectedConfidence * 100)}% / VERDICT NEEDED`;
    } else if (!selectedConfidence) {
      elements.positionValue.textContent = `${selectedPrediction.toUpperCase()} / CONFIDENCE NEEDED`;
    } else {
      elements.positionValue.textContent = `${selectedPrediction.toUpperCase()} @ ${Math.round(selectedConfidence * 100)}%`;
    }

    elements.submitPrediction.disabled = !selectedPrediction || !selectedConfidence || elements.stage.dataset.state !== "briefing";
  }

  function selectPrediction(prediction) {
    if (elements.stage.dataset.state !== "briefing") {
      return;
    }

    selectedPrediction = prediction;
    for (const button of elements.predictionButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.prediction === prediction));
    }
    updatePosition();
    playCue("select");
  }

  function selectConfidence(confidence) {
    if (elements.stage.dataset.state !== "briefing") {
      return;
    }

    selectedConfidence = confidence;
    for (const button of elements.confidenceButtons) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.confidence) === confidence));
    }
    updatePosition();
    playCue("select");
  }

  function renderSignals(signals) {
    const fragment = document.createDocumentFragment();

    for (const signal of signals) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const detail = document.createElement("small");

      item.className = "signal-item";
      item.dataset.tone = signal.tone;
      title.textContent = signal.label;
      detail.textContent = signal.detail;
      item.append(title, detail);
      fragment.append(item);
    }

    elements.signalList.replaceChildren(fragment);
  }

  function resetPipeline() {
    for (const step of elements.pipelineSteps) {
      delete step.dataset.status;
    }
  }

  function updateScoreboard() {
    elements.roundNumber.textContent = String(campaign.roundIndex + 1);
    elements.scoreValue.textContent = formatNumber(campaign.score);
    elements.streakValue.textContent = String(campaign.streak);
    elements.seedValue.textContent = campaign.seed;

    const best = readBestScore();
    elements.recordValue.textContent = `LOCAL BEST: ${best === null ? "—" : formatNumber(best)}`;
  }

  function resetChoices() {
    selectedPrediction = null;
    selectedConfidence = null;

    for (const button of elements.predictionButtons.concat(elements.confidenceButtons)) {
      button.setAttribute("aria-pressed", "false");
    }

    elements.positionValue.textContent = "UNCOMMITTED";
  }

  function renderRound() {
    reviewToken += 1;
    currentRound = core.generateRound(campaign.seed, campaign.roundIndex);
    resetChoices();
    resetPipeline();
    updateScoreboard();

    elements.stage.dataset.state = "briefing";
    elements.prTitle.textContent = currentRound.title;
    elements.prBadge.textContent = `PR #${currentRound.number}`;
    elements.branchValue.textContent = currentRound.branch;
    elements.commitValue.textContent = currentRound.commit;
    elements.changeTypeValue.textContent = currentRound.changeType.label;
    elements.additionsValue.textContent = `+${formatNumber(currentRound.additions)}`;
    elements.deletionsValue.textContent = `−${formatNumber(currentRound.deletions)}`;
    elements.filesValue.textContent = String(currentRound.files);
    elements.testsValue.textContent = formatNumber(currentRound.tests);
    elements.passValue.textContent = `PASS ${String(currentRound.passNumber).padStart(2, "0")}`;
    renderSignals(currentRound.signals);

    elements.reviewCore.dataset.verdict = "pending";
    elements.coreGlyph.textContent = "?";
    elements.latencyValue.textContent = "QUEUE: ARMED";
    elements.reactorKicker.textContent = "AWAITING PROPHECY";
    elements.reactorTitle.textContent = "Will the review come back green?";
    elements.reactorBody.textContent = "Read the evidence. Distrust the vibes. Then commit to a prediction.";
    elements.resultPanel.hidden = true;
    elements.resultPanel.removeAttribute("data-outcome");
    elements.findingList.replaceChildren();
    elements.nextButton.textContent = campaign.roundIndex === core.TOTAL_ROUNDS - 1 ? "VIEW CAMPAIGN REPORT" : "LOAD NEXT PR";
    setInteractive(true);
    announce(`Round ${campaign.roundIndex + 1}. ${currentRound.changeType.label}. Predict the review verdict.`);
  }

  function renderLedger() {
    if (campaign.predictions.length === 0) {
      const empty = document.createElement("li");
      empty.className = "ledger-empty";
      empty.textContent = "No reviews completed. The optimism remains technically undefeated.";
      elements.ledgerList.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const entry of campaign.predictions) {
      const item = document.createElement("li");
      const round = document.createElement("span");
      const verdict = document.createElement("strong");
      const detail = document.createElement("small");

      item.className = "ledger-entry";
      item.dataset.outcome = entry.outcome;
      item.dataset.correct = String(entry.correct);
      round.textContent = `PR ${String(entry.round).padStart(2, "0")}`;
      verdict.textContent = entry.outcome === "green" ? "GREEN" : `${entry.findingCount} BUG${entry.findingCount === 1 ? "" : "S"}`;
      detail.textContent = `${entry.correct ? "RIGHT" : "WRONG"} · ${entry.delta > 0 ? "+" : ""}${entry.delta}`;
      item.append(round, verdict, detail);
      fragment.append(item);
    }

    elements.ledgerList.replaceChildren(fragment);
  }

  function renderFindings(findings) {
    const fragment = document.createDocumentFragment();

    for (const finding of findings) {
      const item = document.createElement("li");
      const severity = document.createElement("span");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const body = document.createElement("small");

      severity.className = "severity";
      severity.textContent = finding.severity;
      title.textContent = finding.title;
      body.textContent = finding.body;
      copy.append(title, body);
      item.append(severity, copy);
      fragment.append(item);
    }

    elements.findingList.replaceChildren(fragment);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function runReview() {
    if (!selectedPrediction || !selectedConfidence || elements.stage.dataset.state !== "briefing") {
      return;
    }

    const token = ++reviewToken;
    elements.stage.dataset.state = "reviewing";
    setInteractive(false);
    elements.positionValue.textContent = `${selectedPrediction.toUpperCase()} @ ${Math.round(selectedConfidence * 100)}% / LOCKED`;
    elements.coreGlyph.textContent = "…";
    elements.latencyValue.textContent = "QUEUE: RUNNING";
    elements.reactorKicker.textContent = "REVIEW IN PROGRESS";
    elements.reactorTitle.textContent = "Codex has entered the diff";
    elements.reactorBody.textContent = "Tests are green. This has been noted and may or may not matter.";
    announce("Prediction locked. Review in progress.");
    playCue("submit");

    const statusCopy = [
      ["Reading the exact head", "The commit exists. A promising beginning."],
      ["Interrogating the test suite", `${formatNumber(currentRound.tests)} green witnesses are being cross-examined.`],
      ["Comparing the invariants", "The prose and the behaviour are now in the same room."],
      ["Codex is thinking", "Somewhere, a tiny .yml file has become extremely nervous."],
    ];

    for (let index = 0; index < elements.pipelineSteps.length; index += 1) {
      if (token !== reviewToken) {
        return;
      }

      if (index > 0) {
        elements.pipelineSteps[index - 1].dataset.status = "done";
      }
      elements.pipelineSteps[index].dataset.status = "active";
      elements.reactorTitle.textContent = statusCopy[index][0];
      elements.reactorBody.textContent = statusCopy[index][1];
      playCue("tick", index);
      await wait(reviewDelay);
    }

    if (token !== reviewToken) {
      return;
    }

    elements.pipelineSteps[elements.pipelineSteps.length - 1].dataset.status = "done";
    await wait(reducedMotion ? 60 : 300);

    if (token === reviewToken) {
      revealResult();
    }
  }

  function revealResult() {
    const scored = core.scorePrediction(
      selectedPrediction,
      currentRound.outcome,
      selectedConfidence,
      campaign.streak,
    );

    campaign.score += scored.delta;
    campaign.streak = scored.correct ? campaign.streak + 1 : 0;
    campaign.predictions.push({
      round: campaign.roundIndex + 1,
      prediction: selectedPrediction,
      confidence: selectedConfidence,
      outcome: currentRound.outcome,
      findingCount: currentRound.findings.length,
      correct: scored.correct,
      delta: scored.delta,
      brier: scored.brier,
    });

    elements.stage.dataset.state = "resolved";
    elements.reviewCore.dataset.verdict = currentRound.outcome;
    elements.resultPanel.dataset.outcome = currentRound.outcome;
    elements.resultPanel.hidden = false;
    elements.verdictStamp.textContent = currentRound.outcome === "green" ? "GREEN" : "BUGS";
    elements.scoreDelta.textContent = `${scored.delta > 0 ? "+" : ""}${scored.delta}`;
    elements.scoreDelta.dataset.negative = String(scored.delta < 0);
    elements.chanceReveal.textContent = `${Math.round(currentRound.greenChance * 100)}%`;
    elements.rollReveal.textContent = currentRound.outcomeRoll.toFixed(6);
    elements.calibrationValue.textContent = `${scored.calibration}%`;

    if (currentRound.outcome === "green") {
      elements.coreGlyph.textContent = "✓";
      elements.latencyValue.textContent = "VERDICT: CLEAN";
      elements.reactorKicker.textContent = "THE DOOR OPENS";
      elements.reactorTitle.textContent = "Green. Against all available drama.";
      elements.reactorBody.textContent = "The exact head survives. Merge-button temperature is nominal.";
      elements.resultTitle.textContent = "Codex Review: Didn't find any major issues. 🎉";
      elements.resultBody.textContent = scored.correct
        ? "You called the clean review correctly. Suspicion and evidence reached a temporary truce."
        : "The review was clean. Your defensive pessimism will be documented but not prosecuted.";
      elements.findingList.replaceChildren();
      playCue("green");
    } else {
      const count = currentRound.findings.length;
      elements.coreGlyph.textContent = "!";
      elements.latencyValue.textContent = `VERDICT: ${count} FINDING${count === 1 ? "" : "S"}`;
      elements.reactorKicker.textContent = "THE DIFF HAS TEETH";
      elements.reactorTitle.textContent = `${count} issue${count === 1 ? "" : "s"}. Of course.`;
      elements.reactorBody.textContent = "The tests remain green and are declining further comment.";
      elements.resultTitle.textContent = `Codex Review: Found ${count} issue${count === 1 ? "" : "s"}.`;
      elements.resultBody.textContent = scored.correct
        ? "You smelled the bug storm before the first P1 made landfall."
        : "Your confidence has been converted into a reproducible learning artifact.";
      renderFindings(currentRound.findings);
      playCue("bugs");
    }

    updateScoreboard();
    renderLedger();
    elements.nextButton.focus({ preventScroll: true });
    announce(`${currentRound.outcome === "green" ? "Green review" : `${currentRound.findings.length} findings`}. Prediction ${scored.correct ? "correct" : "incorrect"}. Score change ${scored.delta}.`);
  }

  function showSummary() {
    const summary = core.summarizeCampaign(campaign.predictions, campaign.score);
    const previousBest = readBestScore();
    const best = previousBest === null ? summary.finalScore : Math.max(previousBest, summary.finalScore);

    if (previousBest === null || best > previousBest) {
      writeBestScore(best);
    }

    elements.summaryTitle.textContent = summary.grade;
    elements.summaryEpitaph.textContent = summary.epitaph;
    elements.summaryScore.textContent = formatNumber(summary.finalScore);
    elements.summaryAccuracy.textContent = `${summary.correct}/${summary.total}`;
    elements.summaryCalibration.textContent = `${summary.calibration}%`;
    elements.summaryBest.textContent = formatNumber(best);
    elements.recordValue.textContent = `LOCAL BEST: ${formatNumber(best)}`;
    openDialog(elements.summaryDialog);
    playCue("summary");
  }

  function advanceRound() {
    if (elements.stage.dataset.state !== "resolved") {
      return;
    }

    if (campaign.roundIndex >= core.TOTAL_ROUNDS - 1) {
      showSummary();
      return;
    }

    campaign.roundIndex += 1;
    renderRound();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function beginCampaign(seed) {
    closeDialog(elements.briefingDialog);
    closeDialog(elements.summaryDialog);
    campaign = {
      seed: seed || generateSeed(),
      roundIndex: 0,
      score: 1000,
      streak: 0,
      predictions: [],
    };
    renderLedger();
    renderRound();
    playCue("start");
  }

  function createAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext = new AudioContext();
      }
    }
    return audioContext;
  }

  function tone(frequency, duration, offset, waveform, volume) {
    const context = createAudioContext();
    if (!soundEnabled || !context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + (offset || 0);
    const stop = start + duration;

    oscillator.type = waveform || "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.035, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  }

  function playCue(name, index) {
    if (!soundEnabled) {
      return;
    }

    if (name === "select") {
      tone(180, 0.045, 0, "square", 0.018);
    } else if (name === "submit") {
      tone(110, 0.12, 0, "sawtooth", 0.025);
      tone(165, 0.1, 0.08, "square", 0.018);
    } else if (name === "tick") {
      tone(145 + Number(index || 0) * 35, 0.065, 0, "square", 0.018);
    } else if (name === "green") {
      tone(220, 0.16, 0, "triangle", 0.035);
      tone(330, 0.18, 0.1, "triangle", 0.03);
      tone(440, 0.24, 0.2, "triangle", 0.028);
    } else if (name === "bugs") {
      tone(125, 0.28, 0, "sawtooth", 0.04);
      tone(73, 0.38, 0.08, "square", 0.032);
    } else if (name === "summary") {
      tone(165, 0.12, 0, "triangle", 0.025);
      tone(220, 0.2, 0.12, "triangle", 0.025);
    } else if (name === "start") {
      tone(110, 0.08, 0, "square", 0.02);
      tone(220, 0.12, 0.09, "square", 0.018);
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    elements.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    elements.soundToggle.textContent = soundEnabled ? "SOUND  ON" : "SOUND  OFF";

    if (soundEnabled) {
      const context = createAudioContext();
      if (context && context.state === "suspended") {
        context.resume();
      }
      playCue("start");
    }
  }

  for (const button of elements.predictionButtons) {
    button.addEventListener("click", () => selectPrediction(button.dataset.prediction));
  }

  for (const button of elements.confidenceButtons) {
    button.addEventListener("click", () => selectConfidence(Number(button.dataset.confidence)));
  }

  elements.submitPrediction.addEventListener("click", runReview);
  elements.nextButton.addEventListener("click", advanceRound);
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.startButton.addEventListener("click", () => beginCampaign(campaign.seed));
  elements.newCampaignButton.addEventListener("click", () => beginCampaign(generateSeed()));
  elements.replayCampaignButton.addEventListener("click", () => beginCampaign(campaign.seed));

  document.addEventListener("keydown", (event) => {
    if (elements.briefingDialog.open) {
      if (event.key === "Enter") {
        event.preventDefault();
        beginCampaign(campaign.seed);
      }
      return;
    }

    if (elements.summaryDialog.open || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "g") {
      selectPrediction("green");
    } else if (key === "b") {
      selectPrediction("bugs");
    } else if (["1", "2", "3"].includes(key)) {
      selectConfidence(core.CONFIDENCE_LEVELS[Number(key) - 1]);
    } else if (key === "enter") {
      if (ownsNativeEnterActivation(event.target)) {
        return;
      }

      if (elements.stage.dataset.state === "briefing" && !elements.submitPrediction.disabled) {
        event.preventDefault();
        runReview();
      } else if (elements.stage.dataset.state === "resolved") {
        event.preventDefault();
        advanceRound();
      }
    }
  });

  campaign = {
    seed: generateSeed(),
    roundIndex: 0,
    score: 1000,
    streak: 0,
    predictions: [],
  };
  renderLedger();
  renderRound();
  openDialog(elements.briefingDialog);
})();
