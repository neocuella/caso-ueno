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
const SITE = (pkg.homepage || "").replace(/\/$/, "");
// site: dirección pública, para armar los enlaces para compartir cada hecho (/hecho/<id>)
const META = { updated: today, latest: allDates.sort().at(-1), repo, site: SITE };

const js = (name, v) => `const ${name} = ${JSON.stringify(v)};`;
const data = [
  "/* Datos generados por scripts/build.js desde data/*.csv. No editar a mano. */",
  js("META", META), js("THREADS", THREADS), js("TOPICS", TOPICS), js("PEOPLE", PEOPLE),
  "const EVENTS = [\n" + EVENTS.map(e => JSON.stringify(e)).join(",\n") + "\n];"
].join("\n");

/* Tipografías y textura con nombre por contenido: assets/v/<nombre>.<resumen>.<ext>. Como el nombre cambia cuando
   cambia el archivo, se sirven con caché de un año sin volver a preguntar (ver _headers, más abajo). Las referencias
   "assets/<archivo>" de la plantilla se reescriben con el nombre nuevo. Íconos y og.png mantienen su dirección fija. */
const crypto = require("crypto");
const assets = path.join(root, "site", "assets");
const HASHED = /\.(woff2|webp)$/i;
const VERSIONED = {};
for (const f of fs.existsSync(assets) ? fs.readdirSync(assets) : []) {
  if (!HASHED.test(f)) continue;
  const h = crypto.createHash("sha256").update(fs.readFileSync(path.join(assets, f))).digest("hex").slice(0, 10);
  VERSIONED[f] = `assets/v/${f.replace(/(\.[^.]+)$/, `.${h}$1`)}`;
}
const versioned = s => s.replace(/assets\/([\w.-]+\.(?:woff2|webp))\b/g, (m, f) => {
  if (!VERSIONED[f]) throw new Error(`site/template.html usa assets/${f}, que no está en site/assets/`);
  return VERSIONED[f];
});

const tpl = versioned(fs.readFileSync(path.join(root, "site", "template.html"), "utf8"));
if (!tpl.includes("/*__DATA__*/")) throw new Error("site/template.html no contiene el marcador /*__DATA__*/");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const page = tpl.replace("/*__DATA__*/", () => data);
// artifact.html: fragmento para publicar como Artifact (la plataforma agrega el esqueleto).
fs.writeFileSync(path.join(root, "dist", "artifact.html"), page);
// cabecera del documento: título, descripción, íconos, tarjetas para redes y datos estructurados (schema.org)
const attr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const TITLE = "El caso ueno: cronología de lo publicado sobre ueno bank";
// descripción para buscadores y redes: 125 caracteres como máximo, sin cifras que cambian con cada carga de datos
const DESC = "Cronología visual de lo publicado sobre ueno bank, desde sus orígenes hasta su resolución por el BCP. Datos abiertos.";
const OG_DESC = DESC;
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
const html =
  `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${HEAD}\n` +
  `<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n${page}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(root, "dist", "index.html"), html);
// cabeceras de seguridad para Cloudflare (Workers con archivos estáticos lee dist/_headers).
// La página solo carga archivos propios; el script en línea se autoriza por su hash, que se recalcula en cada build.
// Cloudflare inyecta el script de Web Analytics, que se carga de static.cloudflareinsights.com y envía datos a
// cloudflareinsights.com. La inyección es de toda la zona rickovelar.com y reescribe la respuesta, así que la portada
// sale sin ETag y no revalida con 304. No ponerlo a mano en el <head> (Cloudflare lo inyecta igual y queda dos veces)
// ni frenar la inyección con Cache-Control: no-transform (Cloudflare tampoco comprime: ~175 kB pasan a 671 kB).
const sha = s => `'sha256-${crypto.createHash("sha256").update(s).digest("base64")}'`;
const scriptHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => sha(m[1]));

/* Una página chica por hecho, para compartirlo: /hecho/<id>. Tiene su propio título, descripción y tarjeta para redes
   (las redes no leen lo que va después de "#", así que un enlace a /#e-<id> mostraría la tarjeta general), y al abrirla
   lleva a la pila del hecho en la cronología. El script es el mismo en todas, así que alcanza con un solo hash. */
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fecha = d => { const [y, m, dd] = d.split("-"); return dd ? `${+dd} de ${MESES[m - 1]} de ${y}` : m ? `${MESES[m - 1]} de ${y}` : y; };
const cut = (t, n) => t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[\s,;:.]+$/, "") + "…";
const GO = 'location.replace("/#e-" + location.pathname.split("/").pop().replace(/\\.html$/, ""));';
scriptHashes.push(sha(GO));
fs.rmSync(path.join(root, "dist", "hecho"), { recursive: true, force: true });
fs.mkdirSync(path.join(root, "dist", "hecho"), { recursive: true });
for (const e of EVENTS) {
  if (!/^[a-z0-9-]+$/.test(e.id)) continue;
  // la misma publicación que la página pone al frente: la primera con titular, por fecha
  const s = e.src.map((x, i) => ({ ...x, i })).sort((a, b) => (b.h ? 1 : 0) - (a.h ? 1 : 0) || (a.d || "9999").localeCompare(b.d || "9999") || a.i - b.i)[0];
  if (!s) continue;
  const headline = s.h || events.find(x => x.id === e.id).title;
  const when = fecha(s.d || e.d), where = s.o.replace(/\s*\(.*\)\s*$/, "");
  const desc = cut(`${when} · ${where}. ${s.l || "Una de las publicaciones de la cronología del caso ueno bank."}`, 200);
  const url = `${SITE}/hecho/${e.id}`, to = `/#e-${e.id}`;
  const n = e.src.length, extra = n > 1 ? ` y ${n - 1} ${n === 2 ? "publicación más" : "publicaciones más"}` : "";
  fs.writeFileSync(path.join(root, "dist", "hecho", `${e.id}.html`), [
    `<!doctype html>`, `<html lang="es">`, `<head>`, `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${attr(headline)} · El caso ueno</title>`,
    `<meta name="description" content="${attr(desc)}">`,
    SITE && `<link rel="canonical" href="${url}">`,
    `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`,
    `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="El caso ueno">`,
    `<meta property="og:locale" content="es_PY">`,
    `<meta property="og:title" content="${attr(headline)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    SITE && `<meta property="og:url" content="${url}">`,
    SITE && `<meta property="og:image" content="${OG_IMG}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="El caso ueno: cronología de lo publicado sobre ueno bank.">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:creator" content="@mendigodetokens">`,
    `<meta name="twitter:title" content="${attr(headline)}">`,
    `<meta name="twitter:description" content="${attr(desc)}">`,
    SITE && `<meta name="twitter:image" content="${OG_IMG}">`,
    `<script>${GO}</script>`,
    `<style>body{margin:0;padding:40px 20px;font:16px/1.5 system-ui,sans-serif;color:#141413;background:#FFFFFF}main{max-width:560px;margin:0 auto}small{color:#5B6370}h1{font:700 24px/1.2 Georgia,serif;margin:6px 0 12px}a{color:#141413;font-weight:600}</style>`,
    `</head>`, `<body>`, `<main>`,
    // se ve solo si el navegador no corre scripts: el hecho y los enlaces
    `<small>${attr(when)} · ${attr(where)}${attr(extra)}</small>`,
    `<h1>${attr(headline)}</h1>`,
    s.l ? `<p>${attr(s.l)}</p>` : "",
    `<p><a href="${attr(to)}">Ver el hecho en la cronología</a> · <a href="${attr(s.u)}" rel="noopener noreferrer">Leer la publicación en ${attr(where)}</a></p>`,
    `</main>`, `</body>`, `</html>`, ""
  ].filter(Boolean).join("\n"));
}
const CSP = [
  "default-src 'none'",
  `script-src ${scriptHashes.join(" ")} https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");
fs.writeFileSync(path.join(root, "dist", "_headers"), [
  "/*",
  `  Content-Security-Policy: ${CSP}`,
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "  X-Frame-Options: DENY",
  "  Cross-Origin-Opener-Policy: same-origin",
  // solo los archivos con nombre por contenido: si cambian, cambia su nombre, así que no hace falta volver a preguntar
  "/assets/v/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  ""
].join("\n"));
// al publicar dist/ en Cloudflare, el fragmento artifact.html no se sube (solo sirve para Artifacts)
fs.writeFileSync(path.join(root, "dist", ".assetsignore"), "artifact.html\n");
if (fs.existsSync(assets)) {
  // se vacía antes de copiar, para que no se acumulen versiones viejas de los archivos con resumen en el nombre
  fs.rmSync(path.join(root, "dist", "assets"), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "dist", "assets", "v"), { recursive: true });
  for (const f of fs.readdirSync(assets)) {
    if (VERSIONED[f]) fs.copyFileSync(path.join(assets, f), path.join(root, "dist", VERSIONED[f]));
    else if (/\.(jpe?g|png|svg|ico)$/i.test(f)) fs.copyFileSync(path.join(assets, f), path.join(root, "dist", "assets", f));
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
