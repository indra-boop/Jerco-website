// Rebuild kantor/src/app.js from kantor/src/parts/cNN.js.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const partDir = join(here, "parts");
const names = readdirSync(partDir)
  .filter((name) => /^c\d+\.js$/.test(name))
  .sort();
let b64 = "";
for (const name of names) {
  const text = readFileSync(join(partDir, name), "utf8");
  const match = text.match(/^export default "([A-Za-z0-9+/=]*)";\n$/);
  if (!match) throw new Error("Unexpected part file " + name);
  b64 += match[1];
}
writeFileSync(join(here, "app.js"), Buffer.from(b64, "base64"));
console.log("Wrote kantor/src/app.js from " + names.length + " parts");
