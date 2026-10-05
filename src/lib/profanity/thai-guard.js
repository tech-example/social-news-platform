/**
 * Thai Segmentation & False-Positive Guard
 *
 * Utilizes ECMAScript Intl.Segmenter with "th" locale to detect natural word boundaries,
 * preventing false positives caused by innocent compound words containing offensive substrings.
 */

// Initialize Thai word segmenter (standard in Node.js 16+ and modern browsers)
const thaiSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
  ? new Intl.Segmenter("th", { granularity: "word" })
  : null;

/**
 * Curated allow-list of innocent Thai words that contain vulgar or offensive substrings.
 */
export const THAI_ALLOW_LIST = [
  // Words containing "เหี้ย"
  "เหี้ยม",
  "เหี้ยมหาญ",
  "ความเหี้ยม",
  "อำมหิตเหี้ยมโหด",
  "ความเหี้ยมโหด",

  // Words containing "หอย"
  "หอยทอด",
  "หอยนางรม",
  "หอยลาย",
  "หอยแครง",
  "หอยเชลล์",
  "หอยสังข์",
  "เปลือกหอย",
  "เลี้ยงหอย",

  // Words containing "กะปิ" / "หลั่ง" / "หลัง"
  "กะปิ",
  "น้ำพริกกะปิ",
  "ข้าวคลุกกะปิ",
  "หลั่ง",
  "หลั่งไหล",
  "หลั่งสาร",
  "น้ำตาหลั่ง",
  "หลังอาหาร",
  "ข้างหลัง",
  "ภายหลัง",

  // Words containing "ฟัก"
  "ฟักทอง",
  "ฟักเขียว",
  "ฟักไข่",
  "แกงฟัก",
  "ต้มฟัก",

  // Words containing "ตูด" / "สัด" / "สัส"
  "สัจจะ",
  "สัจธรรม",
  "สัดส่วน",
  "จัดสรร",
  "ศัตรู",
  "ทัศนะ",
  "ทัศนคติ",

  // Common place names and terms
  "ตลาดพลู",
  "ขวนขวาย",
  "ทองหล่อ",
  "บางกอก",
  "บางนา",
  "พญาไท",
  "กุมภาพันธ์",
  "พฤษภาคม",
  "มีนาคม",
  "พระราม",
];

/**
 * Curated allow-list of innocent English words that contain offensive substrings (Scunthorpe problem).
 */
export const ENGLISH_ALLOW_LIST = [
  "pass",
  "password",
  "passage",
  "passenger",
  "passport",
  "compass",
  "bypass",
  "class",
  "classic",
  "classify",
  "classroom",
  "assume",
  "assumption",
  "assembly",
  "assemble",
  "assist",
  "assistant",
  "associate",
  "association",
  "grass",
  "glass",
  "bass",
  "mass",
  "brass",
  "asset",
  "cassette",
  "basement",
  "hello",
  "shell",
  "cocktail",
  "peacock",
  "shuttlecock",
  "scunthorpe",
  "penistone",
  "lightwater",
  "dickens",
  "analyze",
  "analysis",
  "analyst",
  "canal",
  "document",
  "circumstance",
  "title",
  "entitle",
  "butter",
  "button",
];

// Set lookups for rapid checks
const THAI_ALLOW_SET = new Set(THAI_ALLOW_LIST.map((w) => w.toLowerCase()));
const ENGLISH_ALLOW_SET = new Set(ENGLISH_ALLOW_LIST.map((w) => w.toLowerCase()));

/**
 * Computes word start and end boundaries for Thai text using Intl.Segmenter.
 *
 * @param {string} text
 * @returns {{ starts: Set<number>, ends: Set<number>, segments: string[] }}
 */
export function computeThaiWordBoundaries(text) {
  const starts = new Set();
  const ends = new Set();
  const segments = [];

  if (!thaiSegmenter || !text) {
    return { starts, ends, segments };
  }

  try {
    const iter = thaiSegmenter.segment(text);
    for (const item of iter) {
      if (item.isWordLike) {
        starts.add(item.index);
        ends.add(item.index + item.segment.length);
        segments.push(item.segment);
      }
    }
  } catch (err) {
    console.error("Thai segmentation error:", err);
  }

  return { starts, ends, segments };
}

/**
 * Verifies if a match span in Thai aligns with natural word boundaries.
 *
 * @param {number} matchStart - Code unit start index
 * @param {number} matchLength - Match length in code units
 * @param {{ starts: Set<number>, ends: Set<number> }} boundaries
 * @returns {boolean}
 */
export function isThaiWordBoundaryAligned(matchStart, matchLength, boundaries) {
  if (!boundaries.starts.size) return true; // Fallback if segmenter unavailable
  const matchEnd = matchStart + matchLength;
  return boundaries.starts.has(matchStart) && boundaries.ends.has(matchEnd);
}

/**
 * Checks whether an extracted token is explicitly protected by allow-lists.
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isAllowListed(token) {
  if (!token) return false;
  const lower = token.toLowerCase();
  return THAI_ALLOW_SET.has(lower) || ENGLISH_ALLOW_SET.has(lower);
}
