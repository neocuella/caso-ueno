// Genera dist/index.html a partir de site/template.html y los CSV de data/.
// Uso: node scripts/build.js            (valida y construye)
//      node scripts/build.js --json     (además escribe dist/data.json)
"use strict";
const fs = require("fs");
const path = require("path");
const { readTable } = require("./lib/csv");
const { TYPE_TO_PAGE } = require("./lib/schema");
const { validate } = require("./validate");

const root = path.join(__dirname, "..");
const D = p => path.join(root, "data", p);

const { errors, warnings } = validate(root);
warnings.forEach(w => console.warn("aviso: " + w));
if (errors.length) {
  errors.forEach(e => console.error("error: " + e));
  console.error(`\nNo se construyó la página: ${errors.length} error(es). Corregí los datos y volvé a ejecutar.`);
  process.exit(1);
}

const threads = readTable(D("threads.csv")).records;
const topics = readTable(D("topics.csv")).records;
const events = readTable(D("events.csv")).records;
const sources = readTable(D("sources.csv")).records;
const deposits = readTable(D("series/deposits.csv")).records;
const people = fs.existsSync(D("people.csv")) ? readTable(D("people.csv")).records : [];
const mentions = fs.existsSync(D("mentions.csv")) ? readTable(D("mentions.csv")).records : [];
// personas nombradas por publicación; "~" = nombrada solo en el texto de la nota, no en titular ni copete
const named = {};
for (const m of mentions) (named[m.url] ||= []).push(m.where === "body" ? "~" + m.person : m.person);
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const repo = (pkg.repository && (pkg.repository.url || pkg.repository)) || "";

const byEvent = {};
sources.forEach(s => (byEvent[s.event_id] ||= []).push(s));

const THREADS = Object.fromEntries(threads.map(t => [t.id, { label: t.label, c: `--t-${t.id}` }]));
const TOPICS = Object.fromEntries(topics.map(t => [t.id, t.label]));
const EVENTS = events.map(e => {
  // Solo lo que la página muestra: title, summary y note son internos y no se incluyen.
  const o = { id: e.id, d: e.date, th: e.thread };
  if (e.order) o.o = Number(e.order);
  if (e.topics) o.st = e.topics.split(";");
  if (e.milestone === "true") o.key = true;
  o.src = (byEvent[e.id] || []).map(s => {
    const x = { o: s.outlet, u: s.url, k: TYPE_TO_PAGE[s.type] };
    if (s.headline) x.h = s.headline;
    if (s.lede) x.l = s.lede;
    if (s.published) x.d = s.published;
    if (named[s.url]) x.n = named[s.url];
    if (s.archive_url) x.a = s.archive_url; // copia archivada, por si el enlace original deja de abrir
    return x;
  });
  return o;
});
const usedPeople = new Set(mentions.map(m => m.person));
// nombre visible y otras formas en que lo escriben los medios (para la búsqueda)
const PEOPLE = Object.fromEntries(people.filter(p => usedPeople.has(p.id)).map(p => [p.id, [p.name, ...p.aliases.split(";").filter(Boolean)]]));
const DEPOSITS = deposits.map(r => [r.period, Number(r.value)]);
const allDates = [...events.map(e => e.date), ...sources.map(s => s.published)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
// updated: día en que se generó la página (hora de Asunción), o sea cuándo se actualizó el archivo;
// latest: la publicación más reciente que incluye
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const META = { updated: today, latest: allDates.sort().at(-1), repo };

const js = (name, v) => `const ${name} = ${JSON.stringify(v)};`;
const data = [
  "/* Datos generados por scripts/build.js desde data/*.csv. No editar a mano. */",
  js("META", META), js("THREADS", THREADS), js("TOPICS", TOPICS), js("PEOPLE", PEOPLE),
  "const EVENTS = [\n" + EVENTS.map(e => JSON.stringify(e)).join(",\n") + "\n];",
  js("DEPOSITS", DEPOSITS)
].join("\n");

const tpl = fs.readFileSync(path.join(root, "site", "template.html"), "utf8");
if (!tpl.includes("/*__DATA__*/")) throw new Error("site/template.html no contiene el marcador /*__DATA__*/");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const page = tpl.replace("/*__DATA__*/", () => data);
// artifact.html: fragmento para publicar como Artifact (la plataforma agrega el esqueleto).
fs.writeFileSync(path.join(root, "dist", "artifact.html"), page);
// index.html: documento completo para cualquier hosting estático (GitHub Pages, Netlify, etc.).
fs.writeFileSync(path.join(root, "dist", "index.html"),
  `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  `<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
// al publicar dist/ en Cloudflare, el fragmento artifact.html no se sube (solo sirve para Artifacts)
fs.writeFileSync(path.join(root, "dist", ".assetsignore"), "artifact.html\n");
const assets = path.join(root, "site", "assets");
if (fs.existsSync(assets)) {
  fs.mkdirSync(path.join(root, "dist", "assets"), { recursive: true });
  for (const f of fs.readdirSync(assets)) {
    if (/\.(jpe?g|png|webp|svg|woff2?)$/i.test(f)) fs.copyFileSync(path.join(assets, f), path.join(root, "dist", "assets", f));
  }
}
if (process.argv.includes("--json")) {
  fs.writeFileSync(path.join(root, "dist", "data.json"), JSON.stringify({ meta: META, threads, topics, events, sources, people, mentions }, (k, v) => (k === "_line" ? undefined : v), 2));
}
console.log(`dist/index.html: ${EVENTS.length} entradas, ${sources.length} fuentes, datos actualizados al ${META.updated} (publicación más reciente: ${META.latest}).`);
