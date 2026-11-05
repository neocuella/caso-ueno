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
const allDates = [...events.map(e => e.date), ...sources.map(s => s.published)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
// updated: día en que se generó la página (hora de Asunción), o sea cuándo se actualizó el archivo;
// latest: la publicación más reciente que incluye
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const META = { updated: today, latest: allDates.sort().at(-1), repo };

const js = (name, v) => `const ${name} = ${JSON.stringify(v)};`;
const data = [
  "/* Datos generados por scripts/build.js desde data/*.csv. No editar a mano. */",
  js("META", META), js("THREADS", THREADS), js("TOPICS", TOPICS), js("PEOPLE", PEOPLE),
  "const EVENTS = [\n" + EVENTS.map(e => JSON.stringify(e)).join(",\n") + "\n];"
].join("\n");

const tpl = fs.readFileSync(path.join(root, "site", "template.html"), "utf8");
if (!tpl.includes("/*__DATA__*/")) throw new Error("site/template.html no contiene el marcador /*__DATA__*/");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const page = tpl.replace("/*__DATA__*/", () => data);
// artifact.html: fragmento para publicar como Artifact (la plataforma agrega el esqueleto).
fs.writeFileSync(path.join(root, "dist", "artifact.html"), page);
// cabecera del documento: título, descripción, íconos, tarjetas para redes y datos estructurados (schema.org)
const SITE = (pkg.homepage || "").replace(/\/$/, "");
const attr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const TITLE = "El caso ueno: cronología de lo publicado sobre ueno bank";
const DESC = `Cronología visual de lo publicado sobre ueno bank, desde sus orígenes hasta su resolución por el BCP: ${EVENTS.length} hechos, ${sources.length} fuentes y datos abiertos.`;
const OG_DESC = "Cronología visual de lo publicado por medios, legisladores y autoridades sobre ueno bank, desde sus orígenes hasta su resolución. Cada diario es una publicación real, con su enlace.";
const OG_IMG = `${SITE}/assets/og.png`;
const ldDataset = {
  "@context": "https://schema.org", "@type": "Dataset",
  name: "El caso ueno: cronología pública del caso ueno bank",
  description: `Entradas fechadas y fuentes públicas (notas, videos, publicaciones en redes y documentos oficiales) sobre ueno bank, el Banco Central del Paraguay y el Gobierno, desde 2019 hasta la resolución del banco en noviembre de 2026. ${EVENTS.length} hechos y ${sources.length} fuentes.`,
  url: SITE + "/", sameAs: repo || undefined, inLanguage: "es",
  license: "https://creativecommons.org/licenses/by/4.0/", isAccessibleForFree: true,
  creator: { "@type": "Person", name: "Ricardo Ovelar", url: "https://x.com/mendigodetokens" },
  keywords: ["ueno bank", "Banco Central del Paraguay", "BCP", "Paraguay", "cronología", "datos abiertos", "prensa"],
  temporalCoverage: `2019/${META.latest.slice(0, 4)}`, spatialCoverage: { "@type": "Place", name: "Paraguay" },
  dateModified: META.updated,
  distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data.json` }]
};
const HEAD = [
  `<title>${attr(TITLE)}</title>`,
  `<meta name="description" content="${attr(DESC)}">`,
  `<meta name="author" content="Ricardo Ovelar">`,
  `<meta name="theme-color" content="#FFFFFF">`,
  SITE && `<link rel="canonical" href="${SITE}/">`,
  `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`,
  `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">`,
  `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="El caso ueno">`,
  `<meta property="og:locale" content="es_PY">`,
  `<meta property="og:title" content="El caso ueno">`,
  `<meta property="og:description" content="${attr(OG_DESC)}">`,
  SITE && `<meta property="og:url" content="${SITE}/">`,
  SITE && `<meta property="og:image" content="${OG_IMG}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="El caso ueno: una pila de diarios con el titular «BCP dispone resolución de ueno bank por insuficiencia severa».">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:creator" content="@mendigodetokens">`,
  `<meta name="twitter:title" content="El caso ueno">`,
  `<meta name="twitter:description" content="${attr(OG_DESC)}">`,
  SITE && `<meta name="twitter:image" content="${OG_IMG}">`,
  `<script type="application/ld+json">${JSON.stringify(ldDataset).replace(/</g, "\\u003c")}</script>`
].filter(Boolean).join("\n");

// index.html: documento completo para cualquier hosting estático (GitHub Pages, Netlify, etc.).
fs.writeFileSync(path.join(root, "dist", "index.html"),
  `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${HEAD}\n` +
  `<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
// al publicar dist/ en Cloudflare, el fragmento artifact.html no se sube (solo sirve para Artifacts)
fs.writeFileSync(path.join(root, "dist", ".assetsignore"), "artifact.html\n");
const assets = path.join(root, "site", "assets");
if (fs.existsSync(assets)) {
  fs.mkdirSync(path.join(root, "dist", "assets"), { recursive: true });
  for (const f of fs.readdirSync(assets)) {
    if (/\.(jpe?g|png|webp|svg|ico|woff2?)$/i.test(f)) fs.copyFileSync(path.join(assets, f), path.join(root, "dist", "assets", f));
  }
  // los navegadores piden /favicon.ico en la raíz aunque la página no lo declare
  if (fs.existsSync(path.join(assets, "favicon.ico"))) fs.copyFileSync(path.join(assets, "favicon.ico"), path.join(root, "dist", "favicon.ico"));
}
// para buscadores: permiso para indexar todo y mapa del sitio con la fecha de actualización
if (SITE) {
  fs.writeFileSync(path.join(root, "dist", "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.writeFileSync(path.join(root, "dist", "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${META.updated}</lastmod></url>\n</urlset>\n`);
}
if (process.argv.includes("--json")) {
  fs.writeFileSync(path.join(root, "dist", "data.json"), JSON.stringify({ meta: META, threads, topics, events, sources, people, mentions }, (k, v) => (k === "_line" ? undefined : v), 2));
}
console.log(`dist/index.html: ${EVENTS.length} entradas, ${sources.length} fuentes, datos actualizados al ${META.updated} (publicación más reciente: ${META.latest}).`);
