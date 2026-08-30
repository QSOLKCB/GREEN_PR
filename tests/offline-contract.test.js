"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("the browser entrypoint uses only local runtime assets", () => {
  const html = read("index.html");

  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script src="game-core\.js" defer><\/script>/);
  assert.match(html, /<script src="script\.js" defer><\/script>/);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /<script[^>]+src="\/\//i);
});

test("runtime code contains no network clients", () => {
  const runtime = `${read("game-core.js")}\n${read("script.js")}`;
  const banned = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /\bnavigator\.sendBeacon\b/,
    /\bimportScripts\s*\(/,
  ];

  for (const pattern of banned) {
    assert.doesNotMatch(runtime, pattern);
  }
});

test("every JavaScript ID selector resolves to an HTML element", () => {
  const html = read("index.html");
  const script = read("script.js");
  const selectorMatches = script.matchAll(/querySelector\("#([A-Za-z][\w-]*)"\)/g);
  const selectors = Array.from(selectorMatches, (match) => match[1]);

  assert.ok(selectors.length > 20);
  for (const id of selectors) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
  }
});

test("the game exposes keyboard, reduced-motion, and live-region support", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /class="skip-link"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(script, /document\.addEventListener\("keydown"/);
});

test("result disclosure and the narrowest ledger preserve their information", () => {
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(script, /outcomeRoll\.toFixed\(6\)/);
  assert.match(
    css,
    /@media \(max-width: 470px\)[\s\S]*?\.ledger-list\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
});

test("CI attests the pull-request head instead of the synthetic merge commit", () => {
  const workflow = read(".github/workflows/ci.yml");
  const exactHeadExpression = "${{ github.event.pull_request.head.sha || github.sha }}";

  assert.match(workflow, /- name: Check out exact head/);
  assert.equal(workflow.split(exactHeadExpression).length - 1, 2);
  assert.match(workflow, /run: test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
});

test("focused native controls receive Enter before the global shortcut", () => {
  const script = read("script.js");
  const guard = script.indexOf("if (ownsNativeEnterActivation(event.target))");
  const submission = script.indexOf('if (elements.stage.dataset.state === "briefing"', guard);

  assert.match(script, /function ownsNativeEnterActivation\(target\)/);
  assert.match(script, /target\.closest\('button, a\[href\], input, select, textarea, summary, \[role="button"\]'\)/);
  assert.ok(guard >= 0, "native Enter guard must exist");
  assert.ok(submission > guard, "native Enter guard must run before global submission");
});
