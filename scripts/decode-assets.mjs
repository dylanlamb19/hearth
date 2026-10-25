// Binary assets are stored as base64 text (*.b64) because our push tooling only carries text.
// This decodes each public/**/*.b64 next to itself before dev/build. Safe to re-run.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".b64")) {
      writeFileSync(p.slice(0, -4), Buffer.from(readFileSync(p, "utf8"), "base64"));
    }
  }
}
walk("public");
