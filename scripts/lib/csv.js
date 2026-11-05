// Lector y escritor CSV (RFC 4180) sin dependencias.
"use strict";
const fs = require("fs");

function parse(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", i = 0, quoted = false;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === "") { quoted = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (quoted) throw new Error("CSV: comillas sin cerrar al final del archivo");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ""));
}

function readTable(path) {
  const rows = parse(fs.readFileSync(path, "utf8"));
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0];
  const records = rows.slice(1).map((r, n) => {
    if (r.length !== header.length) {
      throw new Error(`${path}: la fila ${n + 2} tiene ${r.length} columnas y el encabezado ${header.length}`);
    }
    const o = { _line: n + 2 };
    header.forEach((h, j) => (o[h] = r[j]));
    return o;
  });
  return { header, records };
}

const cell = v => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

function stringify(header, records) {
  return [header, ...records.map(r => header.map(h => r[h]))]
    .map(row => row.map(cell).join(","))
    .join("\n") + "\n";
}

function writeTable(path, header, records) {
  fs.writeFileSync(path, stringify(header, records));
}

module.exports = { parse, readTable, stringify, writeTable };
