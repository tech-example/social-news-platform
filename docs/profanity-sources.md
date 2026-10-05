# Profanity Detection Sources and Architecture

This document records all external libraries, datasets, and design methodologies used in the layered profanity detector for SocialNews.

---

## 1. External Libraries and Word Lists

### 1.1 `glin-profanity`
- **Version:** `3.3.0` (pinned)
- **License:** MIT License
- **Repository:** [https://github.com/Glin-AI/glin-profanity](https://github.com/Glin-AI/glin-profanity)
- **Coverage:** English, Thai, and multi-language profanity detection with Leetspeak support and customizable language filtering.

### 1.2 `@sit-sandbox/thai-bad-words`
- **Version:** `1.1.9` (pinned)
- **License:** MIT License
- **Repository:** [https://github.com/SIT-SandBox/thai-bad-words](https://github.com/SIT-SandBox/thai-bad-words)
- **Coverage:** Curated dictionary of 741 Thai profanity and abusive terms, maintainable without heavy native or wasm dependencies.

### 1.3 `LDNOOBW` (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
- **Source:** [https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Author:** Shutterstock / Robert J. Gabriel & community contributors
- **Coverage:** Curated multilingual baseline for Thai (`th`) and English (`en`), normalized and deduplicated into the base block list.

### 1.4 Merged Term Counts (Baseline)
| Source | Language | Raw Terms | Merged / Deduplicated Role |
|---|---|---|---|
| `@sit-sandbox/thai-bad-words` | Thai | 741 | Primary Thai vulgarity lexicon |
| `glin-profanity` | Thai | 31 | Thai base profanity |
| `glin-profanity` | English / Leetspeak | 415 | Primary English & obfuscated profanity |
| `LDNOOBW` (Thai) | Thai | 26 | Core Thai slurs & idioms |
| `LDNOOBW` (English) | English | 75 | Core English vulgarities |
| `ROMANIZED_THAI_MAP` | Thai (Latin script) | 25+ | Phonetic transliterations (`kuay`, `yed`, `hee`) |
| `profanity_terms` (Supabase DB) | Dynamic (all) | 0 (initially) | Admin/moderator managed custom block/allow terms |
| **Merged Deduplicated Total** | **Thai: 746 \| English: 415** | **1,288 raw** | **1,161 unique static terms** |

---

## 2. Detection Pipeline Architecture

The detection engine in `src/lib/profanity/` uses a 6-stage layered pipeline:

```
Raw Input Text
      │
      ▼
Stage 1: Normalization (NFKC, zero-width strip, lowercase, collapse repeats)
      │
      ├── Pass 1A: Strict Form (original Thai diacritics + normalized English)
      ├── Pass 1B: Loose Form (stripped Thai tone marks to defeat evasion)
      ├── Pass 1C: Leetspeak Form (mapped Latin numerals/symbols to vowels/consonants)
      └── Pass 1D: Joined Form (short separated runs collapsed, e.g. "f u c k", "ค ว ย")
      │
      ▼
Stage 2: Library & Curated Dictionaries
      (glin-profanity + @sit-sandbox/thai-bad-words + LDNOOBW)
      │
      ▼
Stage 3: Romanized Thai Layer
      (Phonetic transliterations of Thai profanity typed in Latin alphabet)
      │
      ▼
Stage 4: Database-Managed Custom Layer
      (Dynamic terms from `profanity_terms` table, cached in-memory with 60s TTL)
      │
      ▼
Stage 5: Thai Segmentation & False-Positive Guard
      (Word boundaries checked via `Intl.Segmenter(th)` + False-Positive Allow List)
      │
      ▼
Stage 6: Severity Aggregation
      (Returns { flagged: boolean, severity: 'mild'|'moderate'|'severe'|null, matchCount: number })
```

---

## 3. Thai False-Positive Guard & Limitations

### 3.1 Challenge
Because written Thai lacks whitespace delimiters between words, sub-string matching often causes false positives when an innocent compound word contains letter sequences that resemble vulgar terms (e.g. "เหี้ยมหาญ" [brave/resolute], "หอยทอด" [crispy oyster omelet], or "ฟักทอง" [pumpkin]).

### 3.2 Mitigation
1. **Intl.Segmenter Boundary Alignment:** The engine runs `new Intl.Segmenter("th", { granularity: "word" })` to compute valid word-start and word-end boundaries. A candidate term in the moderate/mild tiers is only counted if it aligns with segmentation boundaries.
2. **Always-Block Tier:** High-severity explicit slurs and direct vulgarities (e.g. severe anatomical insults) trigger matching regardless of segmentation boundaries to prevent evasion via concatenated words.
3. **Allow List (False-Positive Guard):** A curated allow-list of innocent Thai and English words containing known substrings is checked before matching, ensuring legitimate posts and comments are not incorrectly suppressed.

### 3.3 Known Limitations
- Obscure regional dialects or newly coined internet slang may require administrative addition to `profanity_terms`.
- Heavily mixed scripts or intentional sentence-wide anagramming may evade deterministic matching without human report escalation.
