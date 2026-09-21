import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EMOJI = /\p{Extended_Pictographic}/u;
const exts = new Set([".js", ".jsx", ".css", ".html", ".md", ".json", ".sql", ".svg"]);
let failed = false;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(name)) {
        walk(path);
      }
      continue;
    }
    if (![...exts].some((e) => name.endsWith(e))) continue;
    readFileSync(path, "utf8").split("\n").forEach((line, i) => {
      if (EMOJI.test(line)) {
        console.error(`${path}:${i + 1} contains emoji: ${line.trim()}`);
        failed = true;
      }
    });
  }
}

["src", "public", "supabase"].forEach((d) => {
  try {
    walk(d);
  } catch {}
});

if (failed) {
  console.error("No-emoji check failed. Emoji characters are forbidden in UI copy, strings, and database seed.");
  process.exit(1);
} else {
  console.log("No-emoji check passed.");
}
