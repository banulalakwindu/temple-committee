import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(root, "..", "release");

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

try {
  // Remove lock leftovers from a failed / in-use pack
  for (const name of ["win-unpacked", "win-unpacked.tmp", "builder-debug.yml"]) {
    rmrf(path.join(releaseDir, name));
  }
  // Also clear other temp dirs electron-builder may leave
  if (fs.existsSync(releaseDir)) {
    for (const entry of fs.readdirSync(releaseDir)) {
      if (entry.endsWith(".tmp") || entry.includes("unpacked.tmp")) {
        rmrf(path.join(releaseDir, entry));
      }
    }
  }
  console.log("Cleaned release staging folders.");
} catch (err) {
  console.error(
    "Could not clean release/. Close Temple Community / File Explorer windows using that folder, then retry.",
  );
  console.error(String(err));
  process.exit(1);
}
