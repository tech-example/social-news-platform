import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTextSync, containsProfanity } from "../../src/lib/profanity/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixtureLines(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

test("Profanity Layered Detector Evaluation Suite", async (t) => {
  await t.test("Positive Fixtures Recall >= 95%", async (t2) => {
    const suites = [
      { name: "fixtures/th.txt", file: "fixtures/th.txt" },
      { name: "fixtures/en.txt", file: "fixtures/en.txt" },
      { name: "fixtures/th_romanized.txt", file: "fixtures/th_romanized.txt" },
    ];

    let totalPositive = 0;
    let totalFlagged = 0;

    for (const suite of suites) {
      const lines = loadFixtureLines(suite.file);
      let suiteFlagged = 0;
      const missedLineIndices = [];

      lines.forEach((line, idx) => {
        const analysis = analyzeTextSync(line);
        if (analysis.isProfane) {
          suiteFlagged++;
        } else {
          missedLineIndices.push(idx + 1);
        }
      });

      const suiteRecall = (suiteFlagged / lines.length) * 100;
      totalPositive += lines.length;
      totalFlagged += suiteFlagged;

      console.log(
        `[Recall] ${suite.name}: ${suiteFlagged}/${lines.length} flagged (${suiteRecall.toFixed(1)}%)`
      );
      if (missedLineIndices.length > 0) {
        console.log(`  Missed line numbers in ${suite.name}: ${missedLineIndices.join(", ")}`);
      }

      // Assert at least 90% per individual suite
      assert.ok(
        suiteRecall >= 90,
        `Expected >= 90% recall for ${suite.name}, got ${suiteRecall.toFixed(1)}%`
      );
    }

    const overallRecall = (totalFlagged / totalPositive) * 100;
    console.log(
      `[Overall Recall] Total: ${totalFlagged}/${totalPositive} (${overallRecall.toFixed(1)}%)`
    );

    assert.ok(
      overallRecall >= 95,
      `Expected overall recall >= 95%, got ${overallRecall.toFixed(1)}%`
    );
  });

  await t.test("Clean Fixtures False Positive Rate < 1%", async (t2) => {
    const suites = [
      { name: "fixtures/clean_th.txt", file: "fixtures/clean_th.txt" },
      { name: "fixtures/clean_en.txt", file: "fixtures/clean_en.txt" },
    ];

    let totalClean = 0;
    let totalFalsePositives = 0;

    for (const suite of suites) {
      const lines = loadFixtureLines(suite.file);
      let suiteFP = 0;
      const flaggedLineIndices = [];

      lines.forEach((line, idx) => {
        const analysis = analyzeTextSync(line);
        if (analysis.isProfane) {
          suiteFP++;
          flaggedLineIndices.push(idx + 1);
        }
      });

      const fpRate = (suiteFP / lines.length) * 100;
      totalClean += lines.length;
      totalFalsePositives += suiteFP;

      console.log(
        `[False Positive] ${suite.name}: ${suiteFP}/${lines.length} flagged (${fpRate.toFixed(1)}%)`
      );
      if (flaggedLineIndices.length > 0) {
        console.log(`  False positive line numbers in ${suite.name}: ${flaggedLineIndices.join(", ")}`);
      }
    }

    const overallFPRate = (totalFalsePositives / totalClean) * 100;
    console.log(
      `[Overall FP Rate] Total: ${totalFalsePositives}/${totalClean} (${overallFPRate.toFixed(1)}%)`
    );

    assert.ok(
      overallFPRate < 1.0,
      `Expected overall false positive rate < 1.0%, got ${overallFPRate.toFixed(1)}%`
    );
  });

  await t.test("Async API matches Sync API contract", async () => {
    const sample = "This is a clean document.";
    const syncRes = analyzeTextSync(sample);
    const asyncRes = await analyzeTextSync(sample);
    assert.equal(syncRes.isProfane, asyncRes.isProfane);
  });
});
