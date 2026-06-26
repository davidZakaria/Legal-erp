import fs from "fs";
import path from "path";

const skip = new Set([
  "app/actions/auth/login.ts",
  "app/actions/auth/updateInitialPassword.ts",
  "app/actions/auth/signOutUser.ts",
]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".ts")) files.push(p.split(path.sep).join("/"));
  }
  return files;
}

const blockA =
  /const session = await auth\(\);\s*\n\s*if \(!session\?\.user\) \{\s*\n\s*return \{ success: false, error: "Unauthorized" \};\s*\n\s*\}/g;

const blockB =
  /const session = await auth\(\);\s*\n\s*if \(!session\?\.user\) return \{ success: false, error: "Unauthorized" \};/g;

const replacementA = `const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;`;

const replacementB = `const gate = await requireAuthenticatedSession();
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;`;

let count = 0;
for (const file of walk("app/actions")) {
  const rel = file.replace(/\\/g, "/");
  if (skip.has(rel)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("await auth()")) continue;
  if (src.includes("requireAuthenticatedSession")) continue;

  const orig = src;
  if (src.includes('from "@/lib/auth"')) {
    src = src.replace(
      /import \{ auth \} from "@\/lib\/auth";/,
      'import { auth } from "@/lib/auth";\nimport { requireAuthenticatedSession } from "@/lib/auth-guards";'
    );
  }
  src = src.replace(blockA, replacementA);
  src = src.replace(blockB, replacementB);

  if (src !== orig) {
    fs.writeFileSync(file, src);
    count++;
    console.log("updated", rel);
  }
}

console.log("total", count);
