import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { workspaceSessionFromRequest } from "../../workspace-session/_lib";

export const runtime = "nodejs";
export const maxDuration = 60;

/** A recording sheet is small; anything bigger is not one. */
const MAX_BYTES = 4 * 1024 * 1024;
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

export async function POST(request: NextRequest) {
  const session = workspaceSessionFromRequest(request);
  if (!session) return fail("STAFF_SESSION_NOT_ACTIVE", 401);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("ASSISTANT_FILE_REQUIRED");
  if (file.size > MAX_BYTES) return fail("ASSISTANT_FILE_TOO_LARGE", 413, "Keep the sheet under 4 MB.");
  const name = file.name.replace(/[^\w.\- ()]/g, "").slice(0, 90) || "sheet";
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    let rows: unknown[][] = [];
    let csv = "";
    if (/\.xlsx?$/i.test(name) || /spreadsheet|officedocument/i.test(file.type)) {
      const book = XLSX.read(buffer, { type: "buffer", sheetRows: MAX_ROWS + 20 });
      const first = book.SheetNames[0];
      if (!first) return fail("ASSISTANT_FILE_EMPTY");
      rows = XLSX.utils.sheet_to_json(book.Sheets[first], { header: 1, blankrows: false, defval: "" }) as unknown[][];
    } else {
      csv = buffer.toString("utf8");
      if (/\.pdf$/i.test(name) || /pdf/i.test(file.type)) {
        return fail("ASSISTANT_FILE_PDF", 415, "A PDF cannot be read yet. Send the sheet as Excel or CSV.");
      }
      rows = fromCsv(csv);
    }
    const grid = gridText(rows);
    if (!grid.text || !grid.rows) return fail("ASSISTANT_FILE_EMPTY", 400, "No marks were found in that file.");
    return Response.json({ ok: true, name, ...grid, truncated: grid.rows >= MAX_ROWS }, { headers: noStore });
  } catch {
    return fail("ASSISTANT_FILE_UNREADABLE", 400, "That file could not be read. Send an Excel or CSV sheet.");
  }
}
