# Open Exercise Library

A searchable browser for **1,324 exercises**, plus a minimal single-exercise page
designed to be embedded (for example, in a Notion workout plan).

- **Live browser:** https://wyattyhh.github.io/open-exercise-library/
- **Embed page:** https://wyattyhh.github.io/open-exercise-library/embed.html
- **Source repo:** https://github.com/wyattyhh/open-exercise-library

## Data source and credits

All exercises, GIF animations and step-by-step instructions come from the
[exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) on GitHub.
GIF media © Gym Visual.

A clean backup fork of that dataset lives at
https://github.com/wyattyhh/exercises-dataset. It is a backup only — do not
develop in it. All development happens in this repo (`open-exercise-library`).
The fork is also the live data source: the generator reads its
`data/exercises.json`, and GIFs load from it via jsDelivr mirrors. The fork
stays in sync with the original automatically — a workflow in the fork repo
(`.github/workflows/sync-upstream.yml`, manual / weekly) calls GitHub's
merge-upstream API. This only ever works cleanly because the fork is kept
clean, with no edits in it, so merges are fast-forwards with no conflicts.

## The browser (`index.html`)

Open the live site and you can:

- **Search** by exercise name (English, or Chinese when the language is set to Chinese).
- **Filter** by body part (10), target muscle (19) and equipment (28). Filters
  appear as removable chips.
- **Open a detail view** for any exercise: GIF animation, numbered steps,
  primary and secondary muscles.
- **Surprise me** for a random exercise, and **Show more** to load more results.
- Switch **light / dark mode**.
- Switch **language** with the language selector at the top of the toolbar.
  Instructions are translated into 10 languages (en, es, fr, hi, it, ko, pl,
  ru, tr, zh) from the dataset itself. Exercise names are English-only in the
  dataset, except Chinese names, which were authored separately for this
  project. Changing the language sets `?lang=<code>` in the URL and reloads the
  page, so a language-specific link can be shared, e.g.
  `https://wyattyhh.github.io/open-exercise-library/?lang=zh`.

GIFs load from the backup fork (see "Data source and credits" above) via
jsDelivr CDN mirrors first (`cdn`, `gcore`, `fastly`), falling back to
`raw.githubusercontent.com`. If a GIF does not load, the page shows a
placeholder with a Retry button and an "open animation" link.

### Files

| File | What it is |
| --- | --- |
| `index.html` | The browser itself (search, filters, detail view, language switcher). |
| `assets/i18n/<code>.js` | Instruction translations, loaded on demand per language (`es`, `fr`, `hi`, `it`, `ko`, `pl`, `ru`, `tr`, `zh`). English is built in. Chinese exercise names and facet translations are embedded in `index.html` itself (there is no separate `names-zh.js` file). |
| `embed.html` | The single-exercise embed page (see below). |
| `embed-data.js` | **Generated** data for the embed page: all 1,324 exercises in English. Never edit by hand — see "Regenerating embed data" below. Kept as a fallback; the embed page normally loads only its own per-exercise file. |
| `embed-data/<slug>.json` | **Generated** one tiny file per exercise (~1 KB). This is what the embed page loads — so one embed does not have to download the whole dataset. `embed-data/index.json` maps dataset id → slug for `?id=` lookups. |
| `embed-data/<lang>/<slug>.json` | **Generated** translated steps for one exercise, for `es`, `fr`, `hi`, `it`, `ko`, `pl`, `ru`, `tr`, `zh`. The embed page loads these when `?lang=` is set (see below). Names, target and equipment stay English; custom-only exercises have no translation and fall back to English. |
| `embed-custom.js` | Hand-written entries the generator never touches: exercises the dataset does not have, substitute GIFs, and form cues / common mistakes kept in this project. |
| `scripts/generate-embed-data.mjs` | The generator script. |
| `.github/workflows/generate-embed-data.yml` | GitHub Action that runs the generator (manual, weekly, or when the script changes) and commits the result. |

## The embed page (`embed.html`)

A deliberately bare page for embedding **one exercise at a time**: no search,
no filters, no navigation — just the exercise name, target/equipment, an
optional session box (sets / reps / rest, from URL parameters), GIF,
steps, and (where available) a form cue and a common mistake. It is made to
fit inside a Notion embed block, but any iframe/embed container works.
Each embed loads only its own tiny data file (see below), so a page with
many embeds does not have to download the whole dataset for each one.

### URL format

```
https://wyattyhh.github.io/open-exercise-library/embed.html?ex=<slug>
```

- `<slug>` is the exercise name lowercased, with every run of non-letters/
  non-digits replaced by a single hyphen, e.g.:
  - `Push-up` → `?ex=push-up`
  - `3/4 sit-up` → `?ex=3-4-sit-up`
  - `Dumbbell lateral raise` → `?ex=dumbbell-lateral-raise`
- **Unambiguous alternative:** `?id=<dataset id>`, e.g. `?id=0662` for Push-up.
  Use this when two exercises share a name (8 names in the dataset occur
  twice); the slug form returns the first one, the id form returns the exact one.
- Without `?ex=` or `?id=`, the page shows a short "exercise not found" note.

### Session parameters (sets, reps, rest, …)

Add session info to the URL and the embed renders it as a highlighted box
above the GIF, so a workout plan does not need to repeat the numbers in its
own text:

| Parameter | Meaning | Example |
| --- | --- | --- |
| `session` | A ready-made session line, shown verbatim | `session=3×30–45s · Rest 60–90s` |
| `sets` | Number of sets | `sets=3` |
| `reps` | Reps per set | `reps=10-15` |
| `work` | Work per set, when reps do not apply | `work=30m at 70-80%` |
| `duration` | Hold time per set (alias for `work`) | `duration=30-45s` |
| `rest` | Rest between sets | `rest=60-90s` |
| `note` | Extra note, appended to the line | `note=walk back between runs` |

If `session` is given, it wins. Otherwise the page composes a line from
`sets` + (`reps` / `work` / `duration`) + `rest` + `note`, skipping any that
are missing. With no session parameters at all, no session box is shown.

Coaching notes work the same way, as parameters: `?cue=` and `?mistake=`
win over anything stored in the project files, so a plan can give the same
exercise different notes without a repo change — useful when another
person's AI is building a plan from this project. Example:

```
embed.html?ex=3-4-sit-up&cue=Keep your lower back on the floor&mistake=Rushing the reps
```

Examples (URL-encode spaces and special characters):

```
# Structured — renders "3 sets · × 10-15 · Rest 60-90s"
embed.html?ex=push-up&sets=3&reps=10-15&rest=60-90s

# Ready-made — renders the string exactly as written
embed.html?ex=pull-up&session=4× as many good reps as you can (aim 5–8) · Rest 60–90s

# Timed hold
embed.html?ex=plank&session=3×30–45s · Rest 60–90s
```

### Embed language: `?lang=`

Add `?lang=` to an embed URL to get the steps in another language, e.g.
`embed.html?ex=push-up&lang=zh`. Supported codes are the dataset's
languages other than English: `es`, `fr`, `hi`, `it`, `ko`, `pl`, `ru`, `tr`,
`zh`. The embed loads `embed-data/<lang>/<slug>.json` — the dataset's own
translation, not the English custom entry — and its small UI labels
(Steps, Form cue, Common mistake, Equipment) switch to that language too.
An unknown code falls back to English, and a missing translation (for
example a custom-only exercise like dead-hang) falls back to the English
entry. `?cue=` / `?mistake=` still win over everything, so a cue in the
embed's own language can be passed that way.

### Embedding in Notion

1. In a Notion page, add an **Embed** block.
2. Paste the full embed URL (including `?ex=` and any session parameters).
3. One embed block per exercise. A plan page can be just day headings plus
   embed blocks — the embed already shows the exercise name and session info,
   so repeating them as text above each embed is redundant.

## Making a new exercise plan with this project

This section is written for an AI assistant (or a human) building a plan for
someone else from this repo. No personal data about any plan's owner is stored
in this repo — use only what the person asking for the plan tells you.

1. **Find exercises in the browser.** Search by name or filter by body part,
   target muscle and equipment. Prefer exercises whose equipment matches what
   the person actually has at home (e.g. body weight only).
2. **Check the detail view** for each candidate: GIF, steps, muscles worked,
   and whether it is a reef-free, joint-friendly, beginner-suitable choice for
   that person's level. When in doubt, prefer the simpler, lower-impact
   variant.
3. **Build one embed URL per exercise**, with session parameters for that
   person's sets, reps and rest (see the table above). Use `?id=` when a name
   is ambiguous.
4. **Put the URLs in the plan** as one embed block per exercise, grouped under
   day headings. Do not also write the exercise name and reps as text above
   each embed — the embed already renders both.
5. **Keep the plan short.** The plan itself should be day headings + embeds
   (+ a warm-up / rest note if needed). Detailed guidance lives in the embed.

### Regenerating embed data

`embed-data.js`, `embed-data/<slug>.json` and `embed-data/<lang>/<slug>.json`
are all generated, never hand-edited:

```sh
node scripts/generate-embed-data.mjs
```

By default it fetches the dataset from the backup fork
(`cdn.jsdelivr.net/gh/wyattyhh/exercises-dataset@main/data/exercises.json`);
pass `--input <url-or-local-file>` to use another source, or `--output <path>`
to write the full file elsewhere (per-exercise and translated files always
go to `embed-data/` next to it). The same script runs in GitHub Actions —
manually from the Actions tab, weekly on Sundays, or when the script or the
workflow itself changes — and commits the generated files back to main only
if they actually changed. Pushing to main triggers a GitHub Pages rebuild
automatically. Note the fork's own sync workflow
(`.github/workflows/sync-upstream.yml`) lives in the fork repo, not here.

### Adding a form cue or a common mistake to an exercise

Two ways, in priority order:

1. **As URL parameters (preferred for a single plan):** add `?cue=` and/or
   `?mistake=` to that embed's URL. No repo change needed, and different
   plans can give the same exercise different notes.
2. **In the project (for a reusable default):** add or edit the exercise's
   entry in `embed-custom.js` — never in `embed-data.js`, or the next
   regeneration will wipe it. Push the change; GitHub Pages rebuilds and
   every embed using that exercise picks it up without a URL change.

Most dataset exercises have no cue/mistake, and the embed simply hides
those sections when none is provided.

Entry shape:

```js
"push-up": {
  "name": "Push-up",
  "id": "0662",
  "target": "Chest, triceps",
  "body_part": null,
  "equipment": "None",
  "gif_file": "0662-I4hDWkc.gif",
  "steps": ["Feet shoulder-width apart, …"],
  "cue": "…",
  "mistake": "…"
}
```

For a **new custom exercise** that is not in the dataset (e.g. a text-only
move with no GIF), add a new entry to `embed-custom.js` (never to the
generated `embed-data.js`) with `"gif_file": null` and your own steps;
the embed shows a "no animation" note instead of a broken image. Never invent
a dataset id or GIF filename — use the exact values from the dataset, or
`null` when there is none.

### A note on "Exact" vs "Substitute"

Some plan exercises use a dataset GIF that is close to, but not exactly, the
planned move (for example, a squat shown with a squat-to-overhead-reach GIF).
In those cases the first step in the entry must say so plainly, e.g.
"Note: GIF is a squat to overhead reach — for a plain squat, skip the reach."
Do not present a substitute GIF as if it were the exact move.

## Contributing / updating

- Browser changes go in `index.html` (and `assets/i18n/` for translations).
- Embed changes go in `embed.html`, `embed-custom.js`, or the generator (`scripts/generate-embed-data.mjs`) — never by hand in `embed-data.js` or any file under `embed-data/`.
- Push updates to this repo; do not use the Muse share link for updates, and
  do not edit the dataset fork. After pushing, check that the GitHub Pages
  build finished and that the live site serves the new files before calling
  an update done.
