/**
 * Normalization utilities for profanity detection in Thai and English.
 */

// Zero-width characters (ZWSP, ZWNJ, ZWJ, BOM) and soft hyphens
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD]/g;

// Repeated characters: 3 or more of any identical character collapsed to 1
const REPEAT_COLLAPSE_REGEX = /(.)\1{2,}/gu;

// Thai combining marks, vowels and tone marks:
// Mai Taikhu (\u0E47), Mai Ek to Mai Chattawa (\u0E48-\u0E4B), Thanthakhat (\u0E4C), Nikhahit (\u0E4D), Yamakkan (\u0E4E)
const THAI_TONE_DIACRITICS_REGEX = /[\u0E47-\u0E4E]/gu;
const THAI_VOWEL_REPEAT_REGEX = /([\u0E30-\u0E3A\u0E47-\u0E4E])\1+/gu;

// Separators used for character-spacing evasion in short runs (spaces, dots, dashes, underscores, asterisks)
// Matches runs of 2 to 10 single characters/clusters separated by symbols, e.g. "f u c k", "s.h.i.t", "ค ว ย", "สั ส", "เย็_ด"
const SEPARATOR_EVASION_REGEX = /(?<=^|[\s,;!?()[\]{}])((?:[a-zA-Z]|[\u0E00-\u0E7F]{1,3})(?:[\s._\-*]+(?:[a-zA-Z]|[\u0E00-\u0E7F]{1,3})){1,10})(?=$|[\s,;!?()[\]{}])/gu;

// Leetspeak mapping table
const LEET_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};
const LEET_REGEX = /[013457@$!]/g;

/**
 * Basic Unicode and casing normalization:
 * - Unicode NFKC normalization
 * - Strip zero-width and soft-hyphen characters
 * - Lowercase Latin characters
 * - Collapse 3+ repeated characters (and Thai vowel repeats)
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeBasic(text) {
  if (!text || typeof text !== "string") return "";

  let res = text.normalize("NFKC");
  res = res.replace(ZERO_WIDTH_REGEX, "");
  res = res.toLowerCase();
  res = res.replace(REPEAT_COLLAPSE_REGEX, "$1");
  res = res.replace(THAI_VOWEL_REPEAT_REGEX, "$1");

  return res.trim();
}

/**
 * Remove Thai tone marks and combining marks for "loose" evasion checking.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripThaiTones(text) {
  if (!text) return "";
  return text.replace(THAI_TONE_DIACRITICS_REGEX, "");
}

/**
 * Map common Leetspeak substitutions to standard Latin characters.
 *
 * @param {string} text
 * @returns {string}
 */
export function mapLeetspeak(text) {
  if (!text) return "";
  return text.replace(LEET_REGEX, (ch) => LEET_MAP[ch] || ch);
}

/**
 * Join short runs of isolated single letters separated by spaces, dots, dashes, underscores, or asterisks.
 * Does not join full words across spaces, preserving standard sentences.
 *
 * @param {string} text
 * @returns {string}
 */
export function joinSeparatedRuns(text) {
  if (!text) return "";
  return text.replace(SEPARATOR_EVASION_REGEX, (match) => {
    return match.replace(/[\s._\-*]+/g, "");
  });
}

/**
 * Generates all normalized variants of an input string for multi-pass matching:
 * 1. strict: normalized, original tone marks
 * 2. loose: normalized, tone marks removed
 * 3. leet: normalized, leetspeak mapped
 * 4. joined: normalized, separated character runs collapsed
 * 5. joinedLooseLeet: combined transformations
 *
 * @param {string} rawText
 * @returns {{ strict: string, loose: string, leet: string, joined: string, combined: string }}
 */
export function generateNormalizedPasses(rawText) {
  const strict = normalizeBasic(rawText);
  const loose = stripThaiTones(strict);
  const leet = mapLeetspeak(strict);
  const joined = joinSeparatedRuns(strict);
  const combined = joinSeparatedRuns(mapLeetspeak(stripThaiTones(strict)));

  return {
    strict,
    loose,
    leet,
    joined,
    combined,
  };
}
