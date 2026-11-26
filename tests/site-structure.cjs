"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const markup = html.split(/<script\b/i)[0];

assert.match(markup, /<!doctype html>/i, "HTML5 doctype is required");
assert.match(markup, /<html[^>]+lang=["']fr["']/i, "Document language must be declared as French");
assert.match(markup, /name=["']viewport["']/i, "Responsive viewport metadata is required");
assert.match(markup, /<main\b/i, "A main landmark is required");
assert.match(markup, /<nav\b[^>]*aria-label=/i, "Primary navigation must have an accessible name");
assert.match(markup, /<footer\b/i, "Footer landmark is required");

const ids = [...markup.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], "Static HTML IDs must be unique");

const labels = [...markup.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map(match => match[0]);
const controls = [...markup.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)];
const unlabeled = [];
for (const match of controls) {
  const attrs = match[2];
  const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1];
  if (!id) { unlabeled.push(match[0]); continue; }
  const hasAriaName = /\baria-label=|\baria-labelledby=/i.test(attrs);
  const hasLabel = labels.some(label =>
    label.includes('for="' + id + '"') || label.includes("for='" + id + "'") ||
    label.includes('id="' + id + '"') || label.includes("id='" + id + "'")
  );
  if (!hasAriaName && !hasLabel) unlabeled.push(id);
}
assert.deepEqual(unlabeled, [], "Every static form control must have an accessible label");

const views = [...markup.matchAll(/data-view=["']([^"']+)["']/g)].map(match => match[1]);
for (const view of views) {
  assert.ok(markup.includes('id="view-' + view + '"') || markup.includes("id='view-" + view + "'"), "Navigation target is missing: " + view);
}
assert.equal(new Set(views).size, views.length, "Navigation view identifiers must be unique");
assert.match(markup, /aria-current=["']page["']/, "Initial navigation state must be exposed to assistive technology");
assert.match(markup, /prefers-reduced-motion\s*:\s*reduce/i, "Reduced-motion preference must be respected");
assert.match(markup, /@media\s*\(max-width:\s*900px\)/i, "Tablet layout breakpoint is required");
assert.match(markup, /@media\s*\(max-width:\s*600px\)/i, "Mobile layout breakpoint is required");

const unsafeLinks = [...markup.matchAll(/<a\b([^>]*)>/gi)].filter(match =>
  /target=["']_blank["']/i.test(match[1]) && !/rel=["'][^"']*noopener/i.test(match[1])
);
assert.equal(unsafeLinks.length, 0, "External tabs must use rel=noopener");

console.log("Site structure/accessibility: PASS — unique IDs, labeled controls, landmarks, navigation, responsive and reduced-motion rules.");
