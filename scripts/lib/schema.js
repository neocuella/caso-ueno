// Definición compartida de columnas, valores permitidos y reglas de formato.
"use strict";

const EVENT_COLUMNS = ["id", "date", "order", "thread", "topics", "milestone", "title", "summary", "note", "revealed"];
const SOURCE_COLUMNS = ["event_id", "url", "outlet", "type", "headline", "lede", "published", "archive_url", "last_checked", "notes"];

const SOURCE_TYPES = ["article", "social", "video", "document"];
const TYPE_FROM_LEGACY = { nota: "article", red: "social", video: "video", oficial: "document" };
const TYPE_TO_PAGE = { article: "nota", social: "red", video: "video", document: "oficial" };

const RE = {
  id: /^\d{4}(-\d{2}){0,2}-[a-z0-9]+(-[a-z0-9]+)*$/,
  slug: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  date: /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/,
  day: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  url: /^https?:\/\/[^\s"<>]+$/,
  bool: /^(true|false)$/,
  int: /^\d+$/
};

const LIMITS = { title: 120, summary: 700, note: 300, headline: 300, lede: 500, ledeWords: 25, outlet: 80, spreadDays: 90 };

function countWords(text) {
  const normalized = String(text || "").trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function slugify(text, words = 6) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
    .filter(w => !["el", "la", "los", "las", "de", "del", "y", "a", "en", "un", "una", "que", "por", "con", "al"].includes(w))
    .slice(0, words).join("-");
}

function validDate(s) {
  if (!RE.date.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (!d) return true;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

module.exports = { EVENT_COLUMNS, SOURCE_COLUMNS, SOURCE_TYPES, TYPE_FROM_LEGACY, TYPE_TO_PAGE, RE, LIMITS, countWords, slugify, validDate };
