/**
 * Multi-Source Profanity Dictionaries
 *
 * Integrates:
 * 1. @sit-sandbox/thai-bad-words (741 Thai terms, MIT)
 * 2. LDNOOBW Thai and English curated lists (CC-BY 4.0)
 * 3. Base high-priority slurs and always-block terms
 */

import { getBadWords as getSitBadWords } from "@sit-sandbox/thai-bad-words";

// Always-block Thai words (severe anatomical insults, extreme profanity that should trigger even inside compound words)
export const THAI_ALWAYS_BLOCK = new Set([
  "ควย",
  "เย็ด",
  "หี",
  "กระดอ",
  "กระเด้า",
  "เย็ดแม่",
  "เย็ดเป็ด",
  "ดอกทอง",
  "ระยำ",
]);

// Always-block English words (severe slurs and explicit vulgarities)
export const ENGLISH_ALWAYS_BLOCK = new Set([
  "fuck",
  "fuk",
  "fucking",
  "fucker",
  "shit",
  "bullshit",
  "bitch",
  "cunt",
  "dick",
  "pussy",
  "whore",
  "slut",
  "bastard",
  "nigger",
  "faggot",
]);

// Curated LDNOOBW English baseline
export const LDNOOBW_ENGLISH_TERMS = [
  "2g1c", "anal", "anus", "apeshit", "arsehole", "ass", "asshole", "assmunch",
  "bastard", "bdsm", "beastiality", "bestiality", "bitch", "bitches", "blowjob",
  "bollocks", "boner", "boob", "boobs", "bullshit", "carpet muncher", "circlejerk",
  "clit", "clitoris", "cock", "cocksucker", "coon", "crap", "creampie", "cunt",
  "damn", "dick", "dickhead", "dildo", "douchebag", "dumbass", "dyke", "ejaculation",
  "fag", "faggot", "feck", "felch", "fellatio", "flange", "foreskin", "fuck",
  "fucker", "fucking", "gangbang", "handjob", "hitler", "homo", "horny", "jerk",
  "jerk off", "jizz", "labia", "masturbate", "milf", "motherfucker", "nazi",
  "nigger", "nigga", "orgasm", "penis", "piss", "porn", "porno", "prick", "pussy",
  "rape", "retard", "scrotum", "semen", "sex", "shit", "shite", "shitty", "skank",
  "slut", "smegma", "spastic", "spunk", "testicle", "tit", "tits", "titties",
  "tosser", "twat", "vagina", "vulva", "wank", "wanker", "whore"
];

// Curated LDNOOBW Thai baseline
export const LDNOOBW_THAI_TERMS = [
  "กระดอ", "กระเด้า", "กระหรี่", "ควย", "จิ๋ม", "จู๋", "เจ๊ก", "เจี๊ยว",
  "ดอกทอง", "ตอแหล", "ตูด", "น้ำแตก", "แม่ง", "เย็ด", "รูตูด", "ล้างตู้เย็น",
  "ส้นตีน", "สัด", "เสือก", "หญิงชาติชั่ว", "ห่า", "หำ", "หี", "เหี้ย",
  "อมนกเขา", "ไอ้ควาย"
];

/**
 * Initializes and deduplicates all dictionary sources.
 * Returns maps categorized by language and severity.
 */
let cachedDictionaries = null;

export function getDictionarySources() {
  if (cachedDictionaries) {
    return cachedDictionaries;
  }

  const thaiSevere = new Set();
  const thaiModerate = new Set();
  const thaiMild = new Set();

  const englishSevere = new Set();
  const englishModerate = new Set();
  const englishMild = new Set();

  // 1. Ingest SIT-SandBox Thai bad words
  try {
    const sitWords = getSitBadWords() || [];
    for (const w of sitWords) {
      const trimmed = w.trim().toLowerCase();
      if (!trimmed) continue;
      if (THAI_ALWAYS_BLOCK.has(trimmed)) {
        thaiSevere.add(trimmed);
      } else {
        thaiModerate.add(trimmed);
      }
    }
  } catch (err) {
    console.error("Failed to load @sit-sandbox/thai-bad-words:", err);
  }

  // 2. Ingest LDNOOBW Thai words
  for (const w of LDNOOBW_THAI_TERMS) {
    const trimmed = w.trim().toLowerCase();
    if (!trimmed) continue;
    if (THAI_ALWAYS_BLOCK.has(trimmed)) {
      thaiSevere.add(trimmed);
    } else {
      thaiModerate.add(trimmed);
    }
  }

  // 3. Ingest LDNOOBW English words
  for (const w of LDNOOBW_ENGLISH_TERMS) {
    const trimmed = w.trim().toLowerCase();
    if (!trimmed) continue;
    if (ENGLISH_ALWAYS_BLOCK.has(trimmed)) {
      englishSevere.add(trimmed);
    } else if (["damn", "crap", "piss", "boob", "boobs", "butt"].includes(trimmed)) {
      englishMild.add(trimmed);
    } else {
      englishModerate.add(trimmed);
    }
  }

  // Ensure always-block words are in severe sets
  for (const w of THAI_ALWAYS_BLOCK) thaiSevere.add(w);
  for (const w of ENGLISH_ALWAYS_BLOCK) englishSevere.add(w);

  cachedDictionaries = {
    thai: {
      severe: thaiSevere,
      moderate: thaiModerate,
      mild: thaiMild,
      all: new Set([...thaiSevere, ...thaiModerate, ...thaiMild]),
    },
    english: {
      severe: englishSevere,
      moderate: englishModerate,
      mild: englishMild,
      all: new Set([...englishSevere, ...englishModerate, ...englishMild]),
    },
    alwaysBlock: {
      thai: THAI_ALWAYS_BLOCK,
      english: ENGLISH_ALWAYS_BLOCK,
    },
  };

  return cachedDictionaries;
}
