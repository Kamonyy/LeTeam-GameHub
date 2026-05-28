/**
 * Prune games/mafia/mafia.css to rules referenced by mf-* classes in TSX.
 * Writes games/mafia/mafia-theme.css
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");
const mafiaDir = path.join(frontendRoot, "games", "mafia");

const SKIP_CLASSES = new Set([
  "mf-atmosphere--",
  "mf-team--",
  "mf-fade-rise_var",
  "mf-drift",
  "mf-lift",
  "mf-duration-medium",
  "mf-ease-out",
  "mf-entry-index",
  "mf-decree-title",
  "mf-btn-royal",
  "mf-btn-ghost",
  "mf-field",
  "mf-field__label",
  "mf-field__control",
  "mf-input",
  "mf-input--mono",
]);

function collectUsedClasses() {
  const used = new Set();
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".tsx")) {
        const t = fs.readFileSync(p, "utf8");
        for (const m of t.matchAll(/mf-[a-zA-Z0-9_-]+/g)) {
          const c = m[0];
          if (!SKIP_CLASSES.has(c)) used.add(c);
        }
      }
    }
  }
  for (const root of ["games/mafia", "app/mafia"]) {
    walk(path.join(frontendRoot, root));
  }
  return used;
}

function extractMfClasses(selector) {
  const out = [];
  for (const m of selector.matchAll(/\.(mf-[a-zA-Z0-9_-]+)/g)) out.push(m[1]);
  return out;
}

function selectorMatches(selector, used) {
  const classes = extractMfClasses(selector);
  if (classes.length === 0) {
    if (selector.includes(".mf-shell") || selector.includes(":root")) return true;
    return false;
  }
  for (const cls of classes) {
    if (used.has(cls)) return true;
    for (const u of used) {
      if (u.startsWith(cls + "-") || u.startsWith(cls + "__")) return true;
      if (cls.startsWith(u + "-") || cls.startsWith(u + "__")) return true;
    }
  }
  return false;
}

function splitRules(css) {
  const rules = [];
  let i = 0;
  const len = css.length;

  while (i < len) {
    while (i < len && /\s/.test(css[i])) i++;
    if (i >= len) break;

    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }

    const start = i;
    if (css.slice(i, i + 6) === "@import") {
      const semi = css.indexOf(";", i);
      rules.push({ kind: "import", text: css.slice(start, semi + 1) });
      i = semi + 1;
      continue;
    }

    if (css[i] === "@") {
      const brace = css.indexOf("{", i);
      const prelude = css.slice(i, brace).trim();
      let depth = 0;
      let j = brace;
      while (j < len) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
        j++;
      }
      rules.push({ kind: "at", prelude, text: css.slice(start, j) });
      i = j;
      continue;
    }

    const brace = css.indexOf("{", i);
    if (brace === -1) break;
    const selector = css.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    while (j < len) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
      j++;
    }
    const body = css.slice(brace + 1, j - 1);
    rules.push({ kind: "rule", selector, body, text: css.slice(start, j) });
    i = j;
  }
  return rules;
}

function pruneAtBlock(text, used, keyframesNeeded) {
  const innerStart = text.indexOf("{") + 1;
  const innerEnd = text.lastIndexOf("}");
  const prelude = text.slice(0, innerStart - 1).trim();
  const inner = text.slice(innerStart, innerEnd);
  const innerRules = splitRules(inner);
  const kept = [];
  for (const r of innerRules) {
    if (r.kind === "rule") {
      const selectors = r.selector.split(",").map((s) => s.trim());
      if (selectors.some((s) => selectorMatches(s, used))) kept.push(r.text);
    } else if (r.kind === "at") {
      const pruned = pruneAtBlock(r.text, used, keyframesNeeded);
      if (pruned) kept.push(pruned);
    }
  }
  if (prelude.startsWith("@keyframes")) {
    const name = prelude.match(/@keyframes\s+([\w-]+)/)?.[1];
    if (name && keyframesNeeded.has(name)) return text;
    return null;
  }
  if (kept.length === 0) return null;
  return `${prelude} {\n${kept.join("\n\n")}\n}`;
}

function collectKeyframes(css) {
  const names = new Set();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) names.add(m[1]);
  for (const m of css.matchAll(/animation:\s*([\w-]+)/g)) names.add(m[1]);
  for (const m of css.matchAll(/animate-\[([\w-]+)/g)) names.add(m[1]);
  return names;
}

const used = collectUsedClasses();
const raw = fs.readFileSync(path.join(mafiaDir, "mafia.css"), "utf8");
const imports = [];
const topRules = splitRules(raw);
const keptRules = [];
const keyframesNeeded = collectKeyframes(raw);

for (const r of topRules) {
  if (r.kind === "import") {
    imports.push(r.text);
    continue;
  }
  if (r.kind === "at") {
    if (r.prelude.startsWith("@keyframes")) {
      const name = r.prelude.match(/@keyframes\s+([\w-]+)/)?.[1];
      if (name && keyframesNeeded.has(name)) keptRules.push(r.text);
      continue;
    }
    const pruned = pruneAtBlock(r.text, used, keyframesNeeded);
    if (pruned) keptRules.push(pruned);
    continue;
  }
  if (r.kind === "rule") {
    const selectors = r.selector.split(",").map((s) => s.trim());
    if (selectors.some((s) => selectorMatches(s, used))) keptRules.push(r.text);
  }
}

const themeHeader = `/* Mafia component theme — classes referenced from TSX */\n`;
const themeBody = keptRules.join("\n\n");
fs.writeFileSync(
  path.join(mafiaDir, "mafia-theme.css"),
  themeHeader + themeBody + "\n",
  "utf8"
);

const shellCss = `@import url("https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@500;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap");
@import "./mafia-atmosphere.css";
@import "./mafia-atmosphere-themes.css";
@import "./mafia-tokens.css";
@import "./mafia-theme.css";

/* Prefer Tailwind font-cinzel; alias for legacy mf-* markup */
.mf-shell .mf-font-display,
.mf-shell .mf-display {
  font-family: "Cinzel", Georgia, serif;
}
`;

fs.writeFileSync(path.join(mafiaDir, "mafia.css"), shellCss, "utf8");

const lines = themeBody.split("\n").length + shellCss.split("\n").length;
console.log("Used classes:", used.size);
console.log("Theme rules kept:", keptRules.length);
console.log("Approx total lines:", lines);
