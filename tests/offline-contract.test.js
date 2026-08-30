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
  assert.match(workflow, /persist-credentials: false/);
});

test("Pages validates the exact four-file runtime and deploys only main", () => {
  const workflow = read(".github/workflows/pages.yml");
  const exactHeadExpression = "${{ github.event.pull_request.head.sha || github.sha }}";
  const runtimeFiles = ["index.html", "styles.css", "game-core.js", "script.js"];

  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.equal(workflow.split(exactHeadExpression).length - 1, 2);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /run: node --test/);

  for (const file of runtimeFiles) {
    assert.match(workflow, new RegExp(`(?:install|printf)[^\\n]*${file.replace(".", "\\.")}`));
  }

  assert.match(workflow, /diff -u \/tmp\/expected-pages-files \/tmp\/actual-pages-files/);
  assert.match(workflow, /path: _site/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(workflow, /name: github-pages/);
  assert.match(workflow, /url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
});

test("workflow dependencies are pinned to reviewed immutable revisions", () => {
  const workflows = `${read(".github/workflows/ci.yml")}\n${read(".github/workflows/pages.yml")}`;
  const approvedActions = [
    "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1",
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0",
    "actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0",
    "actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0",
    "actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0",
  ];

  for (const action of approvedActions) {
    assert.ok(workflows.includes(action), `missing approved action pin: ${action}`);
  }

  assert.doesNotMatch(workflows, /uses:\s+[^@\s]+@v\d+(?:\s|$)/m);
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
