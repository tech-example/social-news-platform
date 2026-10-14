/**
 * English Profanity Matcher using Obscenity
 *
 * Integrates:
 * 1. Obscenity built-in English dataset (englishDataset)
 * 2. Custom JSON dataset (profanity-en.json) with roots, variants, and compound terms
 * 3. LDNOOBW English baseline
 * 4. Whitelist/Allow-lists to prevent false positives (Scunthorpe problem)
 */

import { createRequire } from "module";
import {
  DataSet,
  englishDataset,
  parseRawPattern,
  RegExpMatcher,
  englishRecommendedTransformers,
} from "obscenity";
import { LDNOOBW_ENGLISH_TERMS, ENGLISH_ALWAYS_BLOCK } from "./sources.js";
import { ENGLISH_ALLOW_LIST } from "./thai-guard.js";

const require = createRequire(import.meta.url);
const customWordList = require("./profanity-en.json");

/**
 * Escapes characters with special syntactic meaning in obscenity patterns
 * (\, [, ], ?, |) and wraps in boundary assertions if boundary is true.
 *
 * @param {string} str
 * @param {boolean} [boundary=true]
 * @returns {import("obscenity").ParsedPattern}
 */
export function safePattern(str, boundary = true) {
  const escaped = str.replace(/[\\\[\]?|]/g, "\\$&");
  return boundary ? parseRawPattern("|" + escaped + "|") : parseRawPattern(escaped);
}

let cachedMatcher = null;
let cachedDataset = null;

/**
 * Initializes and builds the unified English profanity dataset and matcher.
 */
export function getEnglishMatcher() {
  if (cachedMatcher && cachedDataset) {
    return { matcher: cachedMatcher, dataset: cachedDataset };
  }

  const dataset = new DataSet().addAll(englishDataset);

  // 1. Ingest custom JSON entries (roots, variants, compound terms)
  if (Array.isArray(customWordList?.entries)) {
    for (const entry of customWordList.entries) {
      const root = entry.root?.trim().toLowerCase();
      if (!root || root.length < 2) continue;

      const sev =
        entry.severity === "high"
          ? "severe"
          : entry.severity === "low"
          ? "mild"
          : "moderate";

      dataset.addPhrase((phrase) => {
        phrase.setMetadata({ severity: sev, originalWord: root });
        phrase.addPattern(safePattern(root, true));

        for (const v of entry.variants || []) {
          const variant = v?.trim().toLowerCase();
          if (!variant) continue;
          phrase.addPattern(safePattern(variant, true));

          // If variant is a concatenated compound word without spaces, also match as substring
          // to ensure unbroken strings (e.g. "fuckyou", "fuckoff", "fuckup") are detected
          if (variant.length > root.length && !variant.includes(" ")) {
            phrase.addPattern(safePattern(variant, false));
          }
        }
        return phrase;
      });
    }
  }

  // 2. Ingest LDNOOBW English baseline terms
  for (const term of LDNOOBW_ENGLISH_TERMS) {
    const t = term.trim().toLowerCase();
    if (!t || t.length < 2) continue;

    const sev = ENGLISH_ALWAYS_BLOCK.has(t)
      ? "severe"
      : ["damn", "crap", "piss", "boob", "boobs", "butt"].includes(t)
      ? "mild"
      : "moderate";

    dataset.addPhrase((phrase) => {
      phrase.setMetadata({ severity: sev, originalWord: t });
      phrase.addPattern(safePattern(t, true));
      return phrase;
    });
  }

  const built = dataset.build();

  // Combine whitelists from obscenity, custom JSON, and thai-guard
  const fullWhitelist = new Set([
    ...built.whitelistedTerms,
    ...(customWordList.whitelist || []),
    ...ENGLISH_ALLOW_LIST,
  ]);

  const matcher = new RegExpMatcher({
    blacklistedTerms: built.blacklistedTerms,
    whitelistedTerms: Array.from(fullWhitelist),
    ...englishRecommendedTransformers,
  });

  cachedMatcher = matcher;
  cachedDataset = dataset;

  return { matcher: cachedMatcher, dataset: cachedDataset };
}

/**
 * Evaluates an input string against the English profanity matcher.
 *
 * @param {string} text
 * @returns {Array<{ word: string, severity: 'mild' | 'moderate' | 'severe' }>}
 */
export function scanEnglishProfanity(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return [];
  }

  const { matcher, dataset } = getEnglishMatcher();
  const rawMatches = matcher.getAllMatches(text);

  if (!rawMatches || rawMatches.length === 0) {
    return [];
  }

  const results = [];
  for (const m of rawMatches) {
    const payload = dataset.getPayloadWithPhraseMetadata(m);
    const meta = payload.phraseMetadata;

    let word = meta?.originalWord || "profane";
    let severity = meta?.severity;

    if (!severity) {
      if (ENGLISH_ALWAYS_BLOCK.has(word)) {
        severity = "severe";
      } else if (["damn", "crap", "piss", "boob", "boobs", "butt"].includes(word)) {
        severity = "mild";
      } else {
        severity = "moderate";
      }
    }

    results.push({ word, severity });
  }

  return results;
}
