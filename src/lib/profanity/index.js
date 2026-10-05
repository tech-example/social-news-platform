/**
 * Layered Profanity Detector for Thai and English
 *
 * Implements:
 * 1. Multi-pass normalization (Unicode NFKC, zero-width strip, tone collapse, Leetspeak, separator joining)
 * 2. Multi-source dictionaries (glin-profanity + @sit-sandbox/thai-bad-words + LDNOOBW)
 * 3. Romanized Thai layer (Latin-typed phonetics)
 * 4. Database-managed block/allow lists (cached with 60s TTL)
 * 5. Thai segmentation & false-positive guard (Intl.Segmenter + word masking)
 * 6. Severity classification (mild, moderate, severe)
 */

import { generateNormalizedPasses, stripThaiTones } from "./normalize.js";
import { ROMANIZED_THAI_MAP } from "./romanized.js";
import {
  computeThaiWordBoundaries,
  isThaiWordBoundaryAligned,
  THAI_ALLOW_LIST,
  ENGLISH_ALLOW_LIST,
} from "./thai-guard.js";
import { getDictionarySources } from "./sources.js";
import { getDatabaseTerms } from "./db-layer.js";
import { PROFANITY_EXTRA_WORDS, PROFANITY_ALLOW_LIST } from "../constants.js";

// Severity rank comparator: severe > moderate > mild
const SEVERITY_RANK = {
  mild: 1,
  moderate: 2,
  severe: 3,
};

function getHigherSeverity(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (SEVERITY_RANK[b] || 0) > (SEVERITY_RANK[a] || 0) ? b : a;
}

/**
 * Mask known allow-listed words from the text so that innocent substrings
 * (e.g. "เหี้ย" in "เหี้ยมหาญ", "หอย" in "หอยทอด", "ass" in "pass") are not falsely flagged.
 *
 * @param {string} text
 * @param {Set<string>} customAllowList
 * @returns {string}
 */
function maskAllowListed(text, customAllowList = new Set()) {
  if (!text) return "";
  let masked = text;

  // Mask Thai allow-list
  for (const allow of THAI_ALLOW_LIST) {
    if (masked.includes(allow)) {
      masked = masked.replaceAll(allow, " ".repeat(allow.length));
    }
  }

  // Mask English allow-list (word boundary aware)
  for (const allow of ENGLISH_ALLOW_LIST) {
    const regex = new RegExp(`\\b${allow}\\b`, "gi");
    masked = masked.replace(regex, " ".repeat(allow.length));
  }

  // Mask custom DB & config allow-lists
  for (const allow of customAllowList) {
    if (!allow) continue;
    if (/[^\x00-\x7F]/.test(allow)) {
      if (masked.includes(allow)) {
        masked = masked.replaceAll(allow, " ".repeat(allow.length));
      }
    } else {
      const regex = new RegExp(`\\b${allow}\\b`, "gi");
      masked = masked.replace(regex, " ".repeat(allow.length));
    }
  }

  if (Array.isArray(PROFANITY_ALLOW_LIST)) {
    for (const allow of PROFANITY_ALLOW_LIST) {
      if (!allow) continue;
      if (/[^\x00-\x7F]/.test(allow)) {
        if (masked.includes(allow)) {
          masked = masked.replaceAll(allow, " ".repeat(allow.length));
        }
      } else {
        const regex = new RegExp(`\\b${allow}\\b`, "gi");
        masked = masked.replace(regex, " ".repeat(allow.length));
      }
    }
  }

  return masked;
}

/**
 * Core text evaluation across all passes and dictionary layers.
 *
 * @param {string} text
 * @param {{ blockedTerms?: Map<string, { language: string, severity: string }>, allowList?: Set<string> }} [dbData]
 * @returns {{ flagged: boolean, severity: 'mild' | 'moderate' | 'severe' | null, matchCount: number }}
 */
export function analyzeTextInternal(text, dbData = {}) {
  if (!text || typeof text !== "string") {
    return { flagged: false, severity: null, matchCount: 0 };
  }

  const staticSources = getDictionarySources();
  const dbBlocked = dbData.blockedTerms || new Map();
  const dbAllow = dbData.allowList || new Set();
  const extraWords = (PROFANITY_EXTRA_WORDS || []).map((w) => w.toLowerCase());

  // Mask allow-listed phrases first to eliminate false-positive substrings
  const cleanInput = maskAllowListed(text, dbAllow);

  // Generate multi-pass normalized variants
  const passes = generateNormalizedPasses(cleanInput);

  let highestSeverity = null;
  const matchedTokens = new Set();

  /**
   * Scan text variant against dictionaries
   */
  const scanPass = (variantText, isLoosePass = false) => {
    if (!variantText || !variantText.trim()) return;

    // Compute boundaries specifically for this variant
    const boundaries = computeThaiWordBoundaries(variantText);

    // 1. Check Thai static sources
    const thaiWords = staticSources.thai.all;
    for (const badWord of thaiWords) {
      const targetWord = isLoosePass ? stripThaiTones(badWord) : badWord;
      if (!targetWord || targetWord.length < 2) continue;
      if (isLoosePass && (targetWord === "หา" || targetWord === "หลัง" || (targetWord.length < 3 && badWord !== targetWord))) {
        continue;
      }

      let searchIndex = 0;
      while ((searchIndex = variantText.indexOf(targetWord, searchIndex)) !== -1) {
        const isAlwaysBlock = staticSources.alwaysBlock.thai.has(badWord);
        const isBoundaryAligned = isThaiWordBoundaryAligned(searchIndex, targetWord.length, boundaries);

        if (isAlwaysBlock || isBoundaryAligned) {
          matchedTokens.add(`th:${badWord}`);
          const sev = staticSources.thai.severe.has(badWord)
            ? "severe"
            : staticSources.thai.mild.has(badWord)
            ? "mild"
            : "moderate";
          highestSeverity = getHigherSeverity(highestSeverity, sev);
        }
        searchIndex += targetWord.length;
      }
    }

    // 2. Check English static sources (requires word boundaries)
    const englishWords = staticSources.english.all;
    for (const badWord of englishWords) {
      if (!badWord || badWord.length < 2) continue;

      const escaped = badWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gu");

      let match;
      while ((match = regex.exec(variantText)) !== null) {
        matchedTokens.add(`en:${badWord}`);
        const sev = staticSources.english.severe.has(badWord)
          ? "severe"
          : staticSources.english.mild.has(badWord)
          ? "mild"
          : "moderate";
        highestSeverity = getHigherSeverity(highestSeverity, sev);
      }
    }

    // 3. Check Romanized Thai layer
    for (const [romanizedWord, severity] of ROMANIZED_THAI_MAP.entries()) {
      const escaped = romanizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gu");

      if (regex.test(variantText)) {
        matchedTokens.add(`th_rom:${romanizedWord}`);
        highestSeverity = getHigherSeverity(highestSeverity, severity);
      }
    }

    // 4. Check Database-managed terms
    for (const [dbTerm, meta] of dbBlocked.entries()) {
      if (!dbTerm || dbTerm.length < 2) continue;

      if (meta.language === "th") {
        const targetWord = isLoosePass ? stripThaiTones(dbTerm) : dbTerm;
        const idx = variantText.indexOf(targetWord);
        if (idx !== -1) {
          const isAligned = isThaiWordBoundaryAligned(idx, targetWord.length, boundaries);
          if (meta.severity === "severe" || isAligned) {
            matchedTokens.add(`db:${dbTerm}`);
            highestSeverity = getHigherSeverity(highestSeverity, meta.severity);
          }
        }
      } else {
        const escaped = dbTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gu");
        if (regex.test(variantText)) {
          matchedTokens.add(`db:${dbTerm}`);
          highestSeverity = getHigherSeverity(highestSeverity, meta.severity);
        }
      }
    }

    // 5. Check project extra words
    for (const extraWord of extraWords) {
      if (variantText.includes(extraWord)) {
        matchedTokens.add(`extra:${extraWord}`);
        highestSeverity = getHigherSeverity(highestSeverity, "moderate");
      }
    }
  };

  // Run passes:
  // Pass 1: Strict normalized text
  scanPass(passes.strict, false);

  // Pass 2: Loose normalized text (Thai tone marks removed)
  scanPass(passes.loose, true);

  // Pass 3: Leetspeak normalized text
  scanPass(passes.leet, false);

  // Pass 4: Joined separated runs (e.g. "f u c k", "ค ว ย")
  scanPass(passes.joined, false);

  // Pass 5: Combined (Leetspeak + Joined + Loose)
  scanPass(passes.combined, true);

  const matchCount = matchedTokens.size;

  return {
    flagged: matchCount > 0,
    isProfane: matchCount > 0,
    severity: highestSeverity,
    matchCount,
  };
}

/**
 * Synchronous text analyzer (evaluates using built-in dictionaries, Romanized Thai, and cached DB terms).
 *
 * @param {string} text
 * @returns {{ flagged: boolean, severity: 'mild' | 'moderate' | 'severe' | null, matchCount: number }}
 */
export function analyzeTextSync(text) {
  return analyzeTextInternal(text);
}

/**
 * Primary asynchronous analyzer that retrieves database terms before evaluation.
 *
 * @param {string} text
 * @returns {Promise<{ flagged: boolean, severity: 'mild' | 'moderate' | 'severe' | null, matchCount: number }>}
 */
export async function analyzeText(text) {
  let dbData = {};
  try {
    dbData = await getDatabaseTerms();
  } catch (err) {
    // Graceful fallback to static dictionary
  }
  return analyzeTextInternal(text, dbData);
}

/**
 * Backwards-compatible profanity check for existing Server Actions & DAL callers.
 *
 * @param {string} text
 * @returns {{ flagged: boolean, matchCount: number }}
 */
export function containsProfanity(text) {
  const result = analyzeTextSync(text);
  return {
    flagged: result.flagged,
    matchCount: result.matchCount,
  };
}
