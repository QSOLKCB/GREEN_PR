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
