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

  await t.test("Recall per Evasion Category >= 95%", async () => {
    const categories = {
      plain: [
        "What the fuck is wrong with this code",
        "Shut up you bitch",
        "Get out of here asshole",
        "This is total bullshit",
        "What a dumb motherfucker",
        "You are a piece of shit",
        "ทำไมทำตัวแบบนี้วะไอ้เหี้ย",
        "ไปตายซะควย",
        "มึงพูดจาหมาไม่แหลกวะสัส",
        "มึงจะเอาอะไรนักหนาวะไอ้หน้าหี",
        "สัสเอ๊ย",
        "ไอ้สัตว์นรก",
      ],
      spacing: [
        "f u c k",
        "s h i t",
        "b i t c h",
        "a s s h o l e",
        "f.u.c.k",
        "s-h-i-t",
        "b.i.t.c.h",
        "f_u_c_k",
        "ค ว ย",
        "เ หี้ ย",
        "เ ย็ ด",
        "ค-ว-ย",
        "ค.ว.ย",
        "เ.หี้.ย",
        "ไอ้ สั ส",
        "เ ย็ ด แ ม่",
        "ค_ว_ย",
        "เย็_ด",
        "k u a y",
        "y e d",
        "k.u.a.y",
      ],
      repeated_characters: [
        "fuuuuuck",
        "shiiiit",
        "biiiiiitch",
        "เหี้ยยยยย",
        "ควยยยย",
        "เย็ดดดด",
        "ไอ้เหี้ยยยยยยเอ๊ย",
      ],
      tone_mark_changes: [
        "เหีย",
        "เหียก",
        "เยดแม่",
      ],
      leetspeak: [
        "fuk",
        "sh!t",
        "b!tch",
        "@sshole",
        "a$$hole",
        "b1tch",
        "f*u*c*k",
        "c*u*n*t",
        "d!ck",
        "b.i.t.c.h.e.s",
        "ค*ว*ย",
      ],
      mixed_language: [
        "ไอ้ kuay",
        "ไอ้ hie",
      ],
      zero_width: [
        "f\u200Bu\u200Bc\u200Bk",
        "s\u200Bh\u200Bi\u200Bt",
        "ค\u200Bว\u200Bย",
        "เ\u200Bหี้\u200Bย",
      ],
      romanized_thai: [
        "kuay",
        "kuy",
        "hee",
        "hie",
        "yed",
        "kwaay",
        "ai-hie",
        "e-hie",
        "tham kuay rai",
        "ai hie nee",
        "kuay jing jing",
        "phuak hie",
        "yed mae",
      ],
    };

    console.log("\n[Category Breakdown]");
    for (const [cat, lines] of Object.entries(categories)) {
      let flagged = 0;
      for (const line of lines) {
        const res = analyzeTextSync(line);
        if (res.isProfane) flagged++;
      }
      const rate = (flagged / lines.length) * 100;
      console.log(`  - ${cat}: ${flagged}/${lines.length} (${rate.toFixed(1)}%)`);
      assert.ok(rate >= 95, `Category ${cat} recall was ${rate.toFixed(1)}%, expected >= 95%`);
    }
  });

  await t.test("Async API matches Sync API contract", async () => {
    const sample = "This is a clean document.";
    const syncRes = analyzeTextSync(sample);
    const asyncRes = await analyzeTextSync(sample);
    assert.equal(syncRes.isProfane, asyncRes.isProfane);
  });
});

