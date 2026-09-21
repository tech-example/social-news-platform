import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const targetDir = join(process.cwd(), ".next", "static");

if (!existsSync(targetDir)) {
  console.log("No .next/static directory found. Skipping check-secrets.");
  process.exit(0);
}

const forbiddenStrings = [
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey && serviceKey.length > 20) {
  forbiddenStrings.push(serviceKey);
}

let failed = false;

function scanDir(dir) {
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
      continue;
    }
    if (!file.endsWith(".js") && !file.endsWith(".json")) continue;

    const content = readFileSync(fullPath, "utf8");
    for (const pattern of forbiddenStrings) {
      if (content.includes(pattern)) {
        console.error(`Leaked secret or server identifier "${pattern}" found in browser bundle: ${fullPath}`);
        failed = true;
      }
    }
  }
}

scanDir(targetDir);

if (failed) {
  console.error("CI Secret Guard failed. Server secrets detected in static browser bundles!");
  process.exit(1);
} else {
  console.log("CI Secret Guard passed. Zero client secrets detected in static bundles.");
}
