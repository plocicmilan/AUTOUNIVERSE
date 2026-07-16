/* AUTO UNIVERSE — Test runner
   Poziva sve test fajlove u tests/ i sabira rezultate.
   Run: npm test  (ili: node tests/run-all.js)                 */
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const TESTS_DIR = __dirname;
const files = fs.readdirSync(TESTS_DIR)
  .filter(f => f.endsWith(".test.js"))
  .sort();

if (files.length === 0) {
  console.error("Nema test fajlova u tests/");
  process.exit(1);
}

let failed = 0;
console.log(`\n=== AUTO UNIVERSE — pokretanje ${files.length} test fajlova ===\n`);

for (const f of files) {
  try {
    execSync(`node ${path.join(TESTS_DIR, f)}`, { stdio: "inherit" });
  } catch (e) {
    failed++;
    console.error(`\n❌ ${f} — FAIL`);
  }
}

console.log(`\n=== Rezultat: ${files.length - failed}/${files.length} test fajlova prošlo ===\n`);
process.exit(failed === 0 ? 0 : 1);
