/**
 * Database-Managed Profanity Layer
 *
 * Fetches dynamic blocked words and allow-listed words from the `profanity_terms` table.
 * Caches in-memory per server instance with a 60-second TTL and programmatic invalidation.
 */

let memoryCache = {
  blockedTerms: new Map(), // term -> { language, severity }
  allowList: new Set(),    // Set of allow-listed terms
  lastFetched: 0,
};

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate the memory cache (called when admins insert/update/delete terms).
 */
export function invalidateProfanityCache() {
  memoryCache = {
    blockedTerms: new Map(),
    allowList: new Set(),
    lastFetched: 0,
  };
}

/**
 * Get dynamic terms from the database with in-memory TTL caching.
 * Gracefully falls back to empty sets if the database table is not yet created.
 *
 * @returns {Promise<{ blockedTerms: Map<string, { language: string, severity: string }>, allowList: Set<string> }>}
 */
export async function getDatabaseTerms() {
  const now = Date.now();
  if (memoryCache.lastFetched && now - memoryCache.lastFetched < CACHE_TTL_MS) {
    return {
      blockedTerms: memoryCache.blockedTerms,
      allowList: memoryCache.allowList,
    };
  }

  try {
    // Dynamic import to avoid client-side bundling issues
    const { getAdminClient } = await import("@/server/admin-client");
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("profanity_terms")
      .select("term, language, severity, kind, is_active")
      .eq("is_active", true);

    if (error) {
      // 42P01 = undefined_table (table not yet migrated)
      if (error.code !== "42P01") {
        console.error("Error reading profanity_terms from DB:", error);
      }
      return {
        blockedTerms: memoryCache.blockedTerms,
        allowList: memoryCache.allowList,
      };
    }

    const newBlocked = new Map();
    const newAllow = new Set();

    for (const row of data || []) {
      const term = (row.term || "").trim().toLowerCase();
      if (!term) continue;

      if (row.kind === "allow") {
        newAllow.add(term);
      } else {
        newBlocked.set(term, {
          language: row.language || "other",
          severity: row.severity || "moderate",
        });
      }
    }

    memoryCache = {
      blockedTerms: newBlocked,
      allowList: newAllow,
      lastFetched: now,
    };

    return {
      blockedTerms: newBlocked,
      allowList: newAllow,
    };
  } catch (err) {
    // If running outside Next.js server context (e.g. unit tests or scripts)
    return {
      blockedTerms: memoryCache.blockedTerms,
      allowList: memoryCache.allowList,
    };
  }
}
