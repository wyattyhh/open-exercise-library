// Generate embed-data.js AND embed-data/<slug>.json from the exercises dataset.
//
// Language versions: ?lang= on the embed page loads a translated steps
// file, embed-data/<lang>/<slug>.json, for every dataset language except
// English (English is the plain embed-data/<slug>.json file). The embed
// page falls back to the English file when a translation is missing, and
// exercises that exist only in embed-custom.js have no translation at all,
// so they always render in English. Exercise names, target and equipment
// stay English in every language — only the steps are translated, exactly
// as the dataset provides them (its name field is English-only).
//
// This file is the ONLY place embed-data.js comes from. Never edit
// embed-data.js by hand — your edits will be lost the next time this runs.
//
// Why two outputs? The embed page used to load the whole ~1 MB
// embed-data.js for every single exercise, which made a Notion page with
// many embeds feel very slow. Now it loads only one tiny per-exercise
// file (embed-data/<slug>.json, ~1-2 KB) plus the small embed-custom.js.
// embed-data.js is still written as a fallback (for ?id= lookups and any
// other consumer), and embed-data/index.json maps dataset id -> slug.
//
// Usage:
//   node scripts/generate-embed-data.mjs
//     Fetches the dataset from the backup fork (jsDelivr mirror of
//     wyattyhh/exercises-dataset, data/exercises.json).
//
//   node scripts/generate-embed-data.mjs --input <url-or-local-file>
//     Use a different dataset source, e.g. the original repo or a local
//     exercises.json download.
//
//   node scripts/generate-embed-data.mjs --output <path>
//     Write somewhere else instead of embed-data.js next to this script's
//     parent directory.
//
// Output shape (one entry per exercise, English steps only):
//   window.EMBED_EXERCISES = {
//     "push-up": { name, id, target, body_part, equipment,
//                  gif_file, steps, cue: null, mistake: null }, ...
//   }
//
// Hand-written content does NOT live here. It lives in embed-custom.js
// (exercises the dataset does not have, substitute GIFs, and any
// form cues / common mistakes kept in the project). The embed page merges
// the two, with embed-custom.js winning on a slug clash. Cues and mistakes
// can also be passed per-embed via ?cue= and ?mistake= URL parameters,
// which win over both files — see the README.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEFAULT_INPUT =
  "https://cdn.jsdelivr.net/gh/wyattyhh/exercises-dataset@main/data/exercises.json";

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const input = getArg("--input") || DEFAULT_INPUT;
const output =
  getArg("--output") || path.join(scriptDir, "..", "embed-data.js");

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function loadDataset(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`fetch ${source} -> HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(await readFile(source, "utf8"));
}

const dataset = await loadDataset(input);
if (!Array.isArray(dataset)) throw new Error("dataset is not an array");

const LANGS = ["es", "fr", "hi", "it", "ko", "pl", "ru", "tr", "zh"];
const out = {};
const translated = {}; // lang -> slug -> entry (same shape, translated steps)
for (const lang of LANGS) translated[lang] = {};
for (const e of dataset) {
  const gifFile = e.gif_url ? e.gif_url.split("/").pop() : null;
  const entry = {
    name: e.name,
    id: e.id ?? null,
    target: e.target ?? null,
    body_part: e.body_part ?? null,
    equipment: e.equipment ?? null,
    gif_file: gifFile,
    steps: e.instruction_steps?.en ?? [],
    cue: null,
    mistake: null,
  };
  const s = slug(e.name);
  const key = s in out ? `${s}-${e.id}` : s;
  out[key] = entry;
  // Same key in every language, so ?id= and slug lookups work identically.
  for (const lang of LANGS) {
    const steps = e.instruction_steps?.[lang];
    if (Array.isArray(steps) && steps.length > 0) {
      translated[lang][key] = { ...entry, steps };
    }
  }
}

const header = `// GENERATED — do not edit by hand.\n// Source: ${input}\n// Regenerate with: node scripts/generate-embed-data.mjs\n`;
await writeFile(
  output,
  header + `window.EMBED_EXERCISES = ${JSON.stringify(out, null, 1)};\n`,
  "utf8",
);
console.log(`wrote ${output}: ${Object.keys(out).length} entries from ${dataset.length} dataset records`);

// Per-exercise files: embed-data/<slug>.json, plus an id -> slug index.
// The embed page loads only the one file it needs. Old per-exercise files
// are removed first, so a renamed exercise does not leave a stale file.
const repoRoot = path.join(scriptDir, "..");
const perDir = path.join(repoRoot, "embed-data");
await rm(perDir, { recursive: true, force: true });
await mkdir(perDir, { recursive: true });
const index = {};
for (const [key, entry] of Object.entries(out)) {
  await writeFile(
    path.join(perDir, `${key}.json`),
    JSON.stringify(entry),
    "utf8",
  );
  if (entry.id) index[entry.id] = key;
}
await writeFile(
  path.join(perDir, "index.json"),
  JSON.stringify(index),
  "utf8",
);
console.log(`wrote ${perDir}: ${Object.keys(out).length} per-exercise files + index.json (${Object.keys(index).length} ids)`);
for (const lang of LANGS) {
  const langDir = path.join(perDir, lang);
  await mkdir(langDir, { recursive: true });
  for (const [key, entry] of Object.entries(translated[lang])) {
    await writeFile(path.join(langDir, `${key}.json`), JSON.stringify(entry), "utf8");
  }
  console.log(`wrote ${langDir}: ${Object.keys(translated[lang]).length} files`);
}
