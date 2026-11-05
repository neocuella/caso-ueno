// Valida los CSV de data/. Errores bloquean la construcción; avisos no.
// Uso: node scripts/validate.js
"use strict";
const fs = require("fs");
const path = require("path");
const { readTable } = require("./lib/csv");
const { EVENT_COLUMNS, SOURCE_COLUMNS, SOURCE_TYPES, RE, LIMITS, countWords, validDate } = require("./lib/schema");

function validate(root) {
  const errors = [], warnings = [];
  const D = p => path.join(root, "data", p);
  const load = (file, columns) => {
    try {
      const t = readTable(D(file));
      if (columns) {
        const missing = columns.filter(c => !t.header.includes(c));
        const extra = t.header.filter(c => !columns.includes(c));
        if (missing.length) errors.push(`${file}: faltan columnas: ${missing.join(", ")}`);
        if (extra.length) errors.push(`${file}: columnas desconocidas: ${extra.join(", ")}`);
      }
      return t.records;
    } catch (e) { errors.push(e.message); return []; }
  };

  const threads = load("threads.csv", ["id", "label", "description"]);
  const topics = load("topics.csv", ["id", "label", "description"]);
  const events = load("events.csv", EVENT_COLUMNS);
  const sources = load("sources.csv", SOURCE_COLUMNS);
  const series = fs.existsSync(D("series/deposits.csv")) ? load("series/deposits.csv", ["period", "value", "unit", "source_url", "note"]) : [];

  const threadIds = new Set(), topicIds = new Set();
  for (const [list, set, file] of [[threads, threadIds, "threads.csv"], [topics, topicIds, "topics.csv"]]) {
    for (const r of list) {
      const at = `${file}:${r._line}`;
      if (!RE.slug.test(r.id)) errors.push(`${at}: id “${r.id}” debe ser minúsculas, números y guiones`);
      if (set.has(r.id)) errors.push(`${at}: id repetido “${r.id}”`);
      if (!r.label) errors.push(`${at}: falta label`);
      set.add(r.id);
    }
  }

  const eventIds = new Set();
  const usedTopics = new Set();
  for (const e of events) {
    const at = `events.csv:${e._line} (${e.id || "sin id"})`;
    if (!RE.id.test(e.id)) errors.push(`${at}: id debe ser “fecha-titulo-corto”, p. ej. 2026-11-03-bcp-inicia-resolucion`);
    else if (!e.id.startsWith(e.date + "-")) warnings.push(`${at}: el id no empieza con la fecha ${e.date}; no cambies ids existentes, pero revisá si es un error`);
    if (eventIds.has(e.id)) errors.push(`${at}: id repetido`);
    eventIds.add(e.id);
    if (!validDate(e.date)) errors.push(`${at}: date “${e.date}” debe ser AAAA, AAAA-MM o AAAA-MM-DD válida`);
    if (e.order && !RE.int.test(e.order)) errors.push(`${at}: order debe ser un entero`);
    if (!threadIds.has(e.thread)) errors.push(`${at}: thread “${e.thread}” no existe en threads.csv`);
    for (const t of e.topics ? e.topics.split(";") : []) {
      if (!topicIds.has(t)) errors.push(`${at}: topic “${t}” no existe en topics.csv (separá varios con “;”)`);
      usedTopics.add(t);
    }
    if (!e.topics) warnings.push(`${at}: sin topics`);
    if (!RE.bool.test(e.milestone)) errors.push(`${at}: milestone debe ser true o false`);
    for (const f of ["title", "summary"]) if (!e[f].trim()) errors.push(`${at}: falta ${f}`);
    for (const f of ["title", "summary", "note"]) {
      if (e[f].length > LIMITS[f]) errors.push(`${at}: ${f} tiene ${e[f].length} caracteres (máximo ${LIMITS[f]})`);
      if (/\s{2,}|^\s|\s$/.test(e[f])) warnings.push(`${at}: ${f} tiene espacios de más`);
    }
    if (e.revealed && !validDate(e.revealed)) errors.push(`${at}: revealed “${e.revealed}” no es una fecha válida`);
    if (e.revealed && e.revealed < e.date) errors.push(`${at}: revealed no puede ser anterior a date`);
    if (e.chart && e.chart !== "deposits") errors.push(`${at}: chart “${e.chart}” no existe (solo “deposits”)`);
  }
  for (const t of topicIds) if (!usedTopics.has(t)) warnings.push(`topics.csv: el tema “${t}” no tiene entradas`);

  const perEvent = {};
  const urlEvents = {};
  for (const s of sources) {
    const at = `sources.csv:${s._line}`;
    if (!eventIds.has(s.event_id)) errors.push(`${at}: event_id “${s.event_id}” no existe en events.csv`);
    if (!RE.url.test(s.url)) errors.push(`${at}: url inválida “${s.url}”`);
    if (/[?&](utm_[a-z]+|fbclid|gclid|igshid)=/.test(s.url)) warnings.push(`${at}: la url tiene parámetros de rastreo; quitalos`);
    const key = s.event_id + " " + s.url;
    if ((perEvent[s.event_id] ||= new Set()).has(s.url)) errors.push(`${at}: url repetida en la misma entrada`);
    perEvent[s.event_id].add(s.url);
    (urlEvents[s.url] ||= new Set()).add(s.event_id);
    if (!s.outlet.trim()) errors.push(`${at}: falta outlet`);
    if (s.outlet.length > LIMITS.outlet) errors.push(`${at}: outlet demasiado largo`);
    if (!SOURCE_TYPES.includes(s.type)) errors.push(`${at}: type “${s.type}” debe ser ${SOURCE_TYPES.join(", ")}`);
    if (s.headline.length > LIMITS.headline) errors.push(`${at}: headline demasiado largo`);
    if (s.lede.length > LIMITS.lede) errors.push(`${at}: lede tiene ${s.lede.length} caracteres (máximo ${LIMITS.lede})`);
    if (countWords(s.lede) > LIMITS.ledeWords) errors.push(`${at}: lede tiene ${countWords(s.lede)} palabras (máximo ${LIMITS.ledeWords})`);
    if (!s.headline.trim()) errors.push(`${at}: falta headline (titular tal como fue publicado; es lo que muestra la página)`);
    if (s.published && !RE.day.test(s.published)) errors.push(`${at}: published “${s.published}” debe ser AAAA-MM-DD`);
    if (s.published && !validDate(s.published)) errors.push(`${at}: published no es una fecha real`);
    if (s.archive_url && !RE.url.test(s.archive_url)) errors.push(`${at}: archive_url inválida`);
    if (s.last_checked && !RE.day.test(s.last_checked)) errors.push(`${at}: last_checked debe ser AAAA-MM-DD`);
    void key;
  }
  // una entrada agrupa publicaciones cercanas: ninguna más de 90 días después de la primera (regla 11)
  const dated = {};
  for (const s of sources) if (s.published && validDate(s.published)) (dated[s.event_id] ||= []).push(s);
  for (const [id, list] of Object.entries(dated)) {
    const first = list.reduce((a, b) => (b.published < a ? b.published : a), list[0].published);
    for (const s of list) {
      const days = Math.round((Date.parse(s.published) - Date.parse(first)) / 864e5);
      if (days > LIMITS.spreadDays) errors.push(`sources.csv:${s._line}: publicada ${days} días después de la primera fuente de “${id}” (${first}); va en una entrada propia, en su fecha (máximo ${LIMITS.spreadDays} días)`);
    }
  }
  for (const id of eventIds) if (!perEvent[id]) errors.push(`events.csv: la entrada “${id}” no tiene ninguna fuente en sources.csv`);

  for (const r of series) {
    const at = `series/deposits.csv:${r._line}`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period)) errors.push(`${at}: period debe ser AAAA-MM`);
    if (!/^\d+(\.\d+)?$/.test(r.value)) errors.push(`${at}: value debe ser numérico (punto decimal)`);
    if (!RE.url.test(r.source_url)) errors.push(`${at}: source_url inválida`);
  }

  // cada publicación va en una sola entrada (regla 10 de CONTRIBUTING.md)
  for (const [url, ids] of Object.entries(urlEvents))
    if (ids.size > 1) errors.push(`sources.csv: la misma publicación aparece en ${ids.size} entradas (${[...ids].join(", ")}): ${url}`);

  // personas nombradas (data/people.csv y data/mentions.csv, opcionales)
  const people = fs.existsSync(D("people.csv")) ? load("people.csv", ["id", "name", "aliases"]) : [];
  const mentions = fs.existsSync(D("mentions.csv")) ? load("mentions.csv", ["url", "person", "forms", "where"]) : [];
  const personIds = new Set(), aliasOwner = {};
  const fold = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[“”"«»‘’']/g, "").replace(/\s+/g, " ").trim();
  for (const p of people) {
    const at = `people.csv:${p._line}`;
    if (!RE.slug.test(p.id)) errors.push(`${at}: id “${p.id}” debe ser minúsculas, números y guiones`);
    if (personIds.has(p.id)) errors.push(`${at}: id repetido “${p.id}”`);
    personIds.add(p.id);
    if (!p.name.trim()) errors.push(`${at}: falta name`);
    for (const a of [p.name, ...p.aliases.split(";").filter(Boolean)]) {
      const k = fold(a);
      if (aliasOwner[k] && aliasOwner[k] !== p.id) errors.push(`${at}: “${a}” ya es nombre o alias de “${aliasOwner[k]}”`);
      aliasOwner[k] = p.id;
    }
  }
  const byUrl = Object.fromEntries(sources.map(s => [s.url, s]));
  const seenMention = new Set(), mentioned = new Set();
  for (const m of mentions) {
    const at = `mentions.csv:${m._line}`;
    const s = byUrl[m.url];
    if (!s) errors.push(`${at}: la url no está en sources.csv: ${m.url}`);
    if (!personIds.has(m.person)) errors.push(`${at}: persona “${m.person}” no existe en people.csv`);
    if (seenMention.has(m.url + " " + m.person)) errors.push(`${at}: mención repetida`);
    seenMention.add(m.url + " " + m.person); mentioned.add(m.person);
    const forms = m.forms.split(";").filter(Boolean), where = m.where.split(";").filter(Boolean);
    if (!forms.length) errors.push(`${at}: faltan forms (el nombre tal como aparece en la publicación)`);
    if (!where.length || where.some(w => !["headline", "lede", "body"].includes(w))) errors.push(`${at}: where debe ser headline, lede y/o body`);
    // lo que dice estar en el titular o el copete se puede comprobar acá mismo
    if (s) for (const [w, text] of [["headline", s.headline], ["lede", s.lede]])
      if (where.includes(w) && !forms.some(f => text.includes(f))) errors.push(`${at}: ninguna forma de “${m.person}” aparece literalmente en el ${w === "headline" ? "titular" : "copete"}`);
  }
  for (const id of personIds) if (!mentioned.has(id)) warnings.push(`people.csv: “${id}” no tiene menciones`);

  const counts = { people: people.length, mentions: mentions.length, threads: threads.length, topics: topics.length, events: events.length, sources: sources.length,
    sharedUrls: Object.values(urlEvents).filter(s => s.size > 1).length };
  return { errors, warnings, counts };
}

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const { errors, warnings, counts } = validate(root);
  const quiet = process.argv.includes("--quiet");
  if (!quiet) warnings.forEach(w => console.warn("aviso: " + w));
  errors.forEach(e => console.error("error: " + e));
  console.log(`\n${counts.events} entradas, ${counts.sources} fuentes, ${counts.topics} temas, ${counts.threads} hilos, ${counts.people} personas, ${counts.mentions} menciones. ` +
    `${errors.length} error(es), ${warnings.length} aviso(s).`);
  process.exit(errors.length ? 1 : 0);
}

module.exports = { validate };
