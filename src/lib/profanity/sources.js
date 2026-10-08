/**
 * Multi-Source Profanity Dictionaries
 *
 * Integrates:
 * 1. @sit-sandbox/thai-bad-words (741 Thai terms, MIT)
 * 2. LDNOOBW Thai and English curated lists (CC-BY 4.0)
 * 3. Base high-priority slurs and always-block terms
 */

import { getBadWords as getSitBadWords } from "@sit-sandbox/thai-bad-words";
import { Filter as GlinFilter } from "glin-profanity";

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

// Full LDNOOBW English baseline
export const LDNOOBW_ENGLISH_TERMS = [
  "2g1c", "2 girls 1 cup", "acrotomophilia", "alabama hot pocket", "alaskan pipeline",
  "anal", "anilingus", "anus", "apeshit", "arsehole", "ass", "asshole", "assmunch",
  "auto erotic", "autoerotic", "babeland", "baby batter", "baby juice", "ball gag",
  "ball gravy", "ball kicking", "ball licking", "ball sack", "ball sucking", "bangbros",
  "bangbus", "bareback", "barely legal", "barenaked", "bastard", "bastardo", "bastinado",
  "bbw", "bdsm", "beaner", "beaners", "beaver cleaver", "beaver lips", "beastiality",
  "bestiality", "big black", "big breasts", "big knockers", "big tits", "bimbos",
  "birdlock", "bitch", "bitches", "black cock", "blonde action", "blonde on blonde action",
  "blowjob", "blow job", "blow your load", "blue waffle", "blumpkin", "bollocks",
  "bondage", "boner", "boob", "boobs", "booty call", "brown showers", "brunette action",
  "bukkake", "bulldyke", "bullet vibe", "bullshit", "bung hole", "bunghole", "busty",
  "butt", "buttcheeks", "butthole", "camel toe", "camgirl", "camslut", "camwhore",
  "carpet muncher", "carpetmuncher", "chocolate rosebuds", "cialis", "circlejerk",
  "cleveland steamer", "clit", "clitoris", "clover clamps", "clusterfuck", "cock",
  "cocks", "cocksucker", "coprolagnia", "coprophilia", "cornhole", "coon", "coons",
  "creampie", "cum", "cumming", "cumshot", "cumshots", "cunnilingus", "cunt",
  "darkie", "date rape", "daterape", "deep throat", "deepthroat", "dendrophilia",
  "dick", "dickhead", "dildo", "dingleberry", "dingleberries", "dirty pillows",
  "dirty sanchez", "doggie style", "doggiestyle", "doggy style", "doggystyle",
  "dog style", "dolcett", "domination", "dominatrix", "dommes", "donkey punch",
  "double dong", "double penetration", "douchebag", "dp action", "dry hump", "dvda",
  "dumbass", "dyke", "eat my ass", "ecchi", "ejaculation", "erotic", "erotism",
  "escort", "eunuch", "fag", "faggot", "fecal", "feck", "felch", "fellatio", "feltch",
  "female squirting", "femdom", "figging", "fingerbang", "fingering", "fisting",
  "flange", "foot fetish", "footjob", "foreskin", "frotting", "fuck", "fuck buttons",
  "fuckin", "fucking", "fucker", "fucktards", "fudge packer", "fudgepacker",
  "futanari", "gangbang", "gang bang", "gay sex", "genitals", "giant cock",
  "girl on", "girl on top", "girls gone wild", "goatcx", "goatse", "god damn",
  "gokkun", "golden shower", "goodpoop", "goo girl", "goregasm", "grope",
  "group sex", "g-spot", "guro", "hand job", "handjob", "hard core", "hardcore",
  "hentai", "hitler", "homo", "homoerotic", "honkey", "hooker", "horny",
  "hot carl", "hot chick", "jerk", "jerk off", "jizz", "labia", "masturbate",
  "milf", "motherfucker", "nazi", "nigger", "nigga", "orgasm", "penis", "piss",
  "porn", "porno", "prick", "pussy", "rape", "retard", "scrotum", "semen", "sex",
  "shit", "shite", "shitty", "skank", "slut", "smegma", "spastic", "spunk",
  "testicle", "tit", "tits", "titties", "tosser", "twat", "vagina", "vulva",
  "wank", "wanker", "whore"
];

// Full LDNOOBW Thai baseline
export const LDNOOBW_THAI_TERMS = [
  "กระดอ", "กระเด้า", "กระหรี่", "กะปิ", "กู", "ขี้", "ควย", "จิ๋ม", "จู๋", "เจ๊ก", "เจี๊ยว",
  "ดอกทอง", "ตอแหล", "ตูด", "น้ำแตก", "น้ําแตก", "มึง", "แม่ง", "เย็ด", "รูตูด", "ล้างตู้เย็น",
  "ส้นตีน", "สัด", "เสือก", "หญิงชาติชั่ว", "หลั่ง", "ห่า", "หำ", "หํา", "หี", "เหี้ย",
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
      const trimmed = w.trim().toLowerCase().normalize("NFKC");
      if (!trimmed) continue;
      if (THAI_ALWAYS_BLOCK.has(trimmed) || THAI_ALWAYS_BLOCK.has(w.trim())) {
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
    const trimmed = w.trim().toLowerCase().normalize("NFKC");
    if (!trimmed) continue;
    if (THAI_ALWAYS_BLOCK.has(trimmed) || THAI_ALWAYS_BLOCK.has(w.trim())) {
      thaiSevere.add(trimmed);
    } else {
      thaiModerate.add(trimmed);
    }
  }

  // 3. Ingest LDNOOBW English words
  for (const w of LDNOOBW_ENGLISH_TERMS) {
    const trimmed = w.trim().toLowerCase().normalize("NFKC");
    if (!trimmed) continue;
    if (ENGLISH_ALWAYS_BLOCK.has(trimmed)) {
      englishSevere.add(trimmed);
    } else if (["damn", "crap", "piss", "boob", "boobs", "butt"].includes(trimmed)) {
      englishMild.add(trimmed);
    } else {
      englishModerate.add(trimmed);
    }
  }

  // 4. Ingest glin-profanity words (Thai + English + Leetspeak)
  try {
    const glin = new GlinFilter({ languages: ["thai", "english"] });
    for (const [term] of glin.words.entries()) {
      const trimmed = term.trim().toLowerCase().normalize("NFKC");
      if (!trimmed || trimmed.length < 2) continue;
      if (/[\u0E00-\u0E7F]/.test(trimmed)) {
        if (THAI_ALWAYS_BLOCK.has(trimmed) || THAI_ALWAYS_BLOCK.has(term.trim())) {
          thaiSevere.add(trimmed);
        } else {
          thaiModerate.add(trimmed);
        }
      } else {
        if (ENGLISH_ALWAYS_BLOCK.has(trimmed)) {
          englishSevere.add(trimmed);
        } else if (["damn", "crap", "piss"].includes(trimmed)) {
          englishMild.add(trimmed);
        } else {
          englishModerate.add(trimmed);
        }
      }
    }
  } catch (err) {
    console.error("Failed to load glin-profanity terms:", err);
  }

  // Ensure always-block words are in severe sets in both forms
  for (const w of THAI_ALWAYS_BLOCK) {
    thaiSevere.add(w.normalize("NFKC"));
    thaiSevere.add(w);
  }
  for (const w of ENGLISH_ALWAYS_BLOCK) {
    englishSevere.add(w.normalize("NFKC"));
    englishSevere.add(w);
  }

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
