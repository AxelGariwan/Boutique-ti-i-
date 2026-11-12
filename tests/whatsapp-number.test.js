const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "script.js"),
  "utf8"
);

const match = source.match(
  /function normalizeWhatsAppDigits\([\s\S]*?\n}\s*/
);

assert.ok(match, "normalizeWhatsAppDigits must exist in script.js");

const sandbox = {};
vm.runInNewContext(
  match[0] + "\nglobalThis.normalizeWhatsAppDigits = normalizeWhatsAppDigits;",
  sandbox
);

const normalize = sandbox.normalizeWhatsAppDigits;

test("normalizes an international number with punctuation", () => {
  assert.equal(normalize("+221 77 123 45 67", "Sénégal"), "221771234567");
});

test("normalizes 00 international prefix", () => {
  assert.equal(normalize("00237 6 70 12 34 56", "Cameroun"), "237670123456");
});

test("adds the selected African country code to a local number", () => {
  assert.equal(normalize("077 123 45 67", "Sénégal"), "221771234567");
  assert.equal(normalize("70 12 34 56", "République centrafricaine"), "23670123456");
});

test("accepts an international number without plus when it already has the country code", () => {
  assert.equal(normalize("221771234567", "Sénégal"), "221771234567");
});

test("rejects empty, too short, too long, and unknown-country local numbers", () => {
  assert.equal(normalize("", "Sénégal"), "");
  assert.equal(normalize("12345", "Sénégal"), "");
  assert.equal(normalize("+2217712345678901", "Sénégal"), "");
  assert.equal(normalize("771234567", "Pays inconnu"), "");
});