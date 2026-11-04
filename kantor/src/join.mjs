// Rebuild kantor/src/app.js from kantor/src/parts/cNN.js.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const partDir = join(here, "parts");
const names = readdirSync(partDir)
  .filter((name) => /^c\d+\.js$/.test(name))
  .sort();

function payload(text, name) {
  const single = text.match(/^export default "([A-Za-z0-9+/=]*)";\n$/);
  if (single) return single[1];
  const multi = text.match(/^export default \[\n([\s\S]*)\]\.join\(""\);\n$/);
  if (!multi) throw new Error("Unexpected part file " + name);
  const parts = [...multi[1].matchAll(/"([A-Za-z0-9+/=]*)"/g)].map((m) => m[1]);
  if (!parts.length) throw new Error("Empty part file " + name);
  return parts.join("");
}

let b64 = "";
for (const name of names) {
  const text = readFileSync(join(partDir, name), "utf8");
  b64 += payload(text, name);
}
writeFileSync(join(here, "app.js"), Buffer.from(b64, "base64"));
console.log("Wrote kantor/src/app.js from " + names.length + " parts");
