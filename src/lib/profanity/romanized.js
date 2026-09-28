/**
 * Romanized Thai Profanity Layer
 *
 * Detects Thai offensive terms typed in Latin characters (Karaoke / phonetic transliterations).
 * Stored as an independent module so it can be reviewed and maintained separately.
 */

export const ROMANIZED_THAI_TERMS = [
  // Severe Tier (explicit anatomical & sexual insults)
  { term: "kway", severity: "severe" },
  { term: "kwaay", severity: "severe" },
  { term: "kuay", severity: "severe" },
  { term: "kuy", severity: "severe" },
  { term: "khuay", severity: "severe" },
  { term: "kwai", severity: "severe" },
  { term: "kuai", severity: "severe" },
  { term: "kwaaii", severity: "severe" },
  { term: "yed", severity: "severe" },
  { term: "yhed", severity: "severe" },
  { term: "yetmae", severity: "severe" },
  { term: "yedmae", severity: "severe" },
  { term: "yedped", severity: "severe" },
  { term: "hee", severity: "severe" },
  { term: "krador", severity: "severe" },
  { term: "kradore", severity: "severe" },
  { term: "kradao", severity: "severe" },
  { term: "kradaw", severity: "severe" },
  { term: "dorkthong", severity: "severe" },
  { term: "dokthong", severity: "severe" },
  { term: "dorgthong", severity: "severe" },

  // Moderate Tier (general curses, animal slurs, intense insults)
  { term: "ai-hear", severity: "moderate" },
  { term: "aihear", severity: "moderate" },
  { term: "ai-hia", severity: "moderate" },
  { term: "aihia", severity: "moderate" },
  { term: "hear", severity: "moderate" },
  { term: "hia", severity: "moderate" },
  { term: "hiah", severity: "moderate" },
  { term: "hie", severity: "moderate" },
  { term: "sus", severity: "moderate" },
  { term: "suss", severity: "moderate" },
  { term: "sud", severity: "moderate" },
  { term: "sut", severity: "moderate" },
  { term: "sat", severity: "moderate" },
  { term: "satt", severity: "moderate" },
  { term: "sas", severity: "moderate" },
  { term: "sass", severity: "moderate" },
  { term: "chibhai", severity: "moderate" },
  { term: "chiphai", severity: "moderate" },
  { term: "shibhai", severity: "moderate" },
  { term: "karee", severity: "moderate" },
  { term: "kraree", severity: "moderate" },
  { term: "sonteen", severity: "moderate" },
  { term: "son-teen", severity: "moderate" },
  { term: "sontin", severity: "moderate" },
  { term: "toelae", severity: "moderate" },
  { term: "torlae", severity: "moderate" },
  { term: "tor-lae", severity: "moderate" },
  { term: "suak", severity: "moderate" },
  { term: "sueak", severity: "moderate" },
  { term: "seuak", severity: "moderate" },

  // Mild Tier (impolite/vulgar colloquialisms)
  { term: "mang", severity: "mild" },
  { term: "maeng", severity: "mild" },
  { term: "mung", severity: "mild" },
  { term: "mueang", severity: "mild" },
  { term: "guu", severity: "mild" },
  { term: "goo", severity: "mild" },
  { term: "haa", severity: "mild" },
];

// Fast lookup map for Romanized Thai terms
export const ROMANIZED_THAI_MAP = new Map(
  ROMANIZED_THAI_TERMS.map((item) => [item.term.toLowerCase(), item.severity])
);
