import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as lucideIcons from "lucide-react";

const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);
const iconImportRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
const usedIcons = new Set();
let failed = false;

function scanDir(dir) {
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(name)) {
        scanDir(fullPath);
      }
      continue;
    }
    if (![...exts].some((e) => name.endsWith(e))) continue;

    const content = readFileSync(fullPath, "utf8");
    let match;
    while ((match = iconImportRegex.exec(content)) !== null) {
      const names = match[1]
        .split(",")
        .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      for (const iconName of names) {
        usedIcons.add({ name: iconName, file: fullPath });
      }
    }
  }
}

try {
  scanDir("src");
} catch (err) {
  console.error("Failed to scan directory:", err);
  process.exit(1);
}

for (const { name, file } of usedIcons) {
  if (!(name in lucideIcons)) {
    console.error(`Missing Lucide icon "${name}" imported in ${file}`);
    failed = true;
  }
}

if (failed) {
  console.error("Check icons failed. Ensure all imported icons exist in the pinned lucide-react package.");
  process.exit(1);
} else {
  console.log(`Check icons passed. Verified ${usedIcons.size} icon imports against lucide-react.`);
}
