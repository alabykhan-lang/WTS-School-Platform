import { NextRequest } from "next/server";
import path from "node:path";
import * as XLSX from "xlsx";
import { createWorker } from "tesseract.js";
import { workspaceSessionFromRequest } from "../../workspace-session/_lib";

export const runtime = "nodejs";
export const maxDuration = 60;

/** A recording sheet or a photo of one is small; anything bigger is not. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 500;
const MAX_COLUMNS = 25;
const MAX_TEXT = 60000;

const noStore = { "Cache-Control": "no-store, max-age=0" };

function fail(code: string, status = 400, detail = "") {
  return Response.json({ ok: false, code, detail }, { status, headers: noStore });
}

/** One clean grid from a sheet of cells, so the model sees rows and columns, not a blob. */
function gridText(rows: unknown[][]) {
  const trimmed = rows
    .slice(0, MAX_ROWS)
    .map((row) => (Array.isArray(row) ? row.slice(0, MAX_COLUMNS).map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim()) : []))
    .filter((row) => row.some((cell) => cell !== ""));
  const lines = trimmed.map((row) => row.join(" | "));
  const text = lines.join("\n").slice(0, MAX_TEXT);
  const columns = trimmed.reduce((most, row) => Math.max(most, row.length), 0);
  return { text, rows: trimmed.length, columns };
}

function fromCsv(raw: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"' && raw[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === "," || char === ";" || char === "\t") { row.push(cell); cell = ""; continue; }
    if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (char === "\r") continue;
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function isImage(name: string, type: string) {
  return /^image\//i.test(type) || /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(name);
}

function isSheet(name: string, type: string) {
  return /\.(csv|xlsx?)$/i.test(name) || /spreadsheet|officedocument|csv/i.test(type);
}

/** A photo of a sheet still has to become rows, so read the words off it. */
async function readPhoto(buffer: Buffer) {
  const worker = await createWorker("eng", 1, {
    // The language data ships with the app, so no download is needed at run time.
    langPath: path.join(process.cwd(), "node_modules/@tesseract.js-data/eng/4.0.0"),
    cachePath: "/tmp",
    logger: () => {},
  });
  type Word = { text?: string; bbox?: { x0?: number; x1?: number } };
  type Line = { words?: Word[] };
  type Block = { paragraphs?: { lines?: Line[] }[] };
  try {
    const { data } = await worker.recognize(buffer, {}, { blocks: true });
    const blocks = (data as { blocks?: Block[] }).blocks || [];
    const lines: string[] = [];
    for (const block of blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          // A wide gap between words is a column break, so a photographed
          // sheet keeps its layout for the model instead of one run of words.
          let previousEnd = -Infinity;
          const cells: string[] = [];
          for (const word of (line.words || []).sort((a, b) => (a.bbox?.x0 || 0) - (b.bbox?.x0 || 0))) {
            const text = String(word.text || "").trim();
            if (!text) continue;
            const start = word.bbox?.x0 ?? 0;
            if (cells.length && start - previousEnd > 28) cells.push(" | ");
            cells.push(text);
            previousEnd = word.bbox?.x1 ?? start;
          }
          const joined = cells.join(" ").replace(/ \| /g, " | ").replace(/\s+/g, " ").trim();
          if (joined) lines.push(joined);
        }
      }
    }
    const fallback = String(data.text || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return (lines.length ? lines : fallback).join("\n").slice(0, MAX_TEXT);
  } finally {
    await worker.terminate().catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  const session = workspaceSessionFromRequest(request);
  if (!session) return fail("STAFF_SESSION_NOT_ACTIVE", 401);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("ASSISTANT_FILE_REQUIRED");
  if (file.size > MAX_BYTES) return fail("ASSISTANT_FILE_TOO_LARGE", 413, "Keep it under 8 MB.");
  const name = file.name.replace(/[^\w.\- ()]/g, "").slice(0, 90) || "file";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (isImage(name, file.type)) {
      let text = "";
      try {
        text = await readPhoto(buffer);
      } catch {
        // A blurred photo is still worth sending; the chip and the name survive.
        text = "";
      }
      const rows = text ? text.split("\n").length : 0;
      return Response.json({ ok: true, kind: "photo", name, text, rows, columns: 0 }, { headers: noStore });
    }

    if (isSheet(name, file.type)) {
      let rows: unknown[][] = [];
      if (/\.xlsx?$/i.test(name) || /spreadsheet|officedocument/i.test(file.type)) {
        const book = XLSX.read(buffer, { type: "buffer", sheetRows: MAX_ROWS + 20 });
        const first = book.SheetNames[0];
        if (!first) return fail("ASSISTANT_FILE_EMPTY");
        rows = XLSX.utils.sheet_to_json(book.Sheets[first], { header: 1, blankrows: false, defval: "" }) as unknown[][];
      } else {
        rows = fromCsv(buffer.toString("utf8"));
      }
      const grid = gridText(rows);
      if (!grid.text || !grid.rows) return fail("ASSISTANT_FILE_EMPTY", 400, "No marks were found in that file.");
      return Response.json({ ok: true, kind: "sheet", name, ...grid, truncated: grid.rows >= MAX_ROWS }, { headers: noStore });
    }

    // Anything else still travels with the message and is named, so the model
    // can tell the proprietor what it holds even without reading it.
    return Response.json({ ok: true, kind: "file", name, text: "", rows: 0, columns: 0 }, { headers: noStore });
  } catch {
    return fail("ASSISTANT_FILE_UNREADABLE", 400, "That file could not be read. Send it as an Excel or CSV sheet, or a photo.");
  }
}
