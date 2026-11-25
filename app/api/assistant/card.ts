/**
 * The printed report card, in the results portal's own design.
 *
 * The assistant serves this page itself so the proprietor never has to go
 * through the portal's sign-in. Unlike the portal, every subject that has a
 * recorded mark is printed, whether or not the class has published it.
 */

export type CardRow = {
  index: number;
  name: string;
  ca1: unknown;
  ca2: unknown;
  ca3: unknown;
  exam: unknown;
  total: number | "";
  grade: Grade;
  classAvg: number | "";
  highest: number | "";
};

export type Grade = { g: string; r: string; c: string };

export type CardData = {
  student: Record<string, unknown>;
  classKey: string;
  dept: string;
  term: string;
  session: string;
  school: { name: string; addr: string; phone: string; email: string };
  sections: Record<string, boolean>;
  signature: { name?: string; title?: string; image?: string };
  rows: CardRow[];
  count: number;
  studentAvg: number | "";
  classAvg: number | "";
  lowestAvg: number | "";
  highestAvg: number | "";
  grand: number | "";
  passed: number | "";
  affective: Record<string, string>;
  psychomotor: Record<string, string>;
  form: { ca: number; classAvg: boolean; highest: boolean; remark: boolean };
  attendance: { opened: unknown; present: unknown; absent: number | "" };
  remark: string;
  resume: string;
  fees: { total?: unknown; debt?: unknown; paid?: unknown };
  photo?: string;
  logo: string;
};

const FONT = "Segoe UI,Tahoma,sans-serif";
const NAVY = "#1a2a4a";
const MINT = "#edf8f4";
const TEAL = "#7dd4b0";
const BORDER = "#b8edd8";
const WHITE = "#ffffff";
const P = "-webkit-print-color-adjust:exact;print-color-adjust:exact";

const GRADE_SCALE = [
  { min: 75, max: 100, g: "A1", r: "Excellent", c: "#065f46" },
  { min: 70, max: 74, g: "B2", r: "Very Good", c: "#065f46" },
  { min: 65, max: 69, g: "B3", r: "Good", c: "#065f46" },
  { min: 60, max: 64, g: "C4", r: "Credit", c: "#065f46" },
  { min: 55, max: 59, g: "C5", r: "Credit", c: "#92400e" },
  { min: 50, max: 54, g: "C6", r: "Credit", c: "#92400e" },
  { min: 45, max: 49, g: "D7", r: "Pass", c: "#92400e" },
  { min: 40, max: 44, g: "E8", r: "Pass", c: "#92400e" },
  { min: 0, max: 39, g: "F9", r: "Fail", c: "#991b1b" },
];

const DEFAULT_REMARKS = [
  { min: 0, max: 39, text: "Needs serious improvement. Must work harder next term." },
  { min: 40, max: 49, text: "Fair performance, but can do better with more effort." },
  { min: 50, max: 59, text: "Satisfactory performance. Can improve with more dedication." },
  { min: 60, max: 69, text: "Good performance. Keep working hard for greater success." },
  { min: 70, max: 79, text: "Very good performance. Keep it up!" },
  { min: 80, max: 100, text: "Excellent performance. Keep up the outstanding work!" },
];

export const AFFECTIVE_TRAITS = ["Punctuality", "Respect", "Attentiveness", "Reliability", "Neatness", "Spirit of Teamwork"];
export const PSYCHOMOTOR_TRAITS = ["Handwriting", "Reading", "Verbal Fluency/Diction", "Musical Skills", "Creative Arts", "Physical Education"];

export const CARD_SECTIONS = [
  "showHeader", "showPhoto", "showBio", "showSummary", "showSubjects", "showAffective",
  "showPsycho", "showFees", "showNextTerm", "showAttendance", "showSignature",
];

export const CARD_SECTION_LABELS: Record<string, string> = {
  showFees: "Fees",
  showAttendance: "Attendance",
  showPsycho: "Psychomotor",
  showNextTerm: "Next term",
  showSignature: "Signature",
};

export function gradeOf(total: number | ""): Grade {
  if (total === "") return { g: "", r: "", c: "#aaa" };
  const value = Math.floor(Number(total));
  const hit = GRADE_SCALE.find((row) => value >= row.min && value <= row.max);
  return hit || { g: "F9", r: "Fail", c: "#991b1b" };
}

export function autoRemark(avg: number | "", remarks: unknown): string {
  if (avg === "") return "--";
  const list = Array.isArray(remarks) && remarks.length ? remarks as { min: number; max: number; text: string }[] : DEFAULT_REMARKS;
  const hit = list.find((row) => avg >= Number(row.min) && avg <= Number(row.max));
  return hit ? String(hit.text) : "--";
}

/** Marks a score row as recorded when any component has been entered. */
export function totalOf(row: Record<string, unknown>): number | "" {
  const components = ["ca1", "ca2", "ca3", "exam"];
  const present = components.filter((key) => row[key] !== "" && row[key] !== null && row[key] !== undefined);
  if (!present.length) return "";
  const ca = present.some((key) => key !== "exam")
    ? Math.min(30, ["ca1", "ca2", "ca3"].reduce((sum, key) => sum + (Number(row[key]) || 0), 0))
    : 0;
  const exam = row.exam === "" || row.exam === undefined || row.exam === null ? 0 : Number(row.exam) || 0;
  return ca + exam;
}

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
}

function dateText(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function traitTable(title: string, traits: string[], ratings: Record<string, string>, extra = "") {
  return `<table style="width:100%;border-collapse:collapse;font-size:8pt">`
    + `<tr style="background:${NAVY};color:${WHITE};${P}"><th style="padding:5px 8px;text-align:left;border:1px solid ${BORDER}">${title}</th><th style="padding:5px;text-align:center;border:1px solid ${BORDER};width:70px">RTG</th></tr>`
    + traits.map((trait, index) => {
      const bg = index % 2 === 0 ? WHITE : MINT;
      return `<tr style="background:${bg};${P}"><td style="padding:4px 8px;border:1px solid ${BORDER}">${trait}</td><td style="text-align:center;border:1px solid ${BORDER};font-weight:700;color:${NAVY}">${esc(ratings[trait] || "")}</td></tr>`;
    }).join("")
    + extra
    + `</table>`;
}

export function renderCard(data: CardData): string {
  const s = data.student;
  const sec = data.sections;
  const sig = data.signature;
  const school = data.school;
  const show = (key: string) => Boolean(sec[key]);

  const sigHtml = sig.image
    ? `<img src="${esc(sig.image)}" style="height:38px;max-width:130px;object-fit:contain"/>`
    : sig.name
      ? `<div style="font-family:'Dancing Script',cursive;font-size:1.3rem;color:${NAVY}">${esc(sig.name)}</div>`
      : "";
  const sigTitle = esc(sig.title || "Proprietor");
  const photo = data.photo || String(s.photo || "");

  let h = `<div class="report-card" style="background:${WHITE};max-width:800px;font-family:${FONT};font-size:9pt;border-top:7px solid ${NAVY};${P}">`;

  if (show("showHeader")) {
    h += `<div style="display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:2px solid ${TEAL};background:${NAVY};${P}">`
      + `<div style="flex-shrink:0;${P}"><img src="${esc(data.logo)}" style="width:70px;height:70px;object-fit:contain;border-radius:8px;background:#fff;padding:3px"/></div>`
      + `<div style="flex:1">`
      + `<div style="color:${TEAL};font-size:15pt;font-weight:900;text-transform:uppercase">${esc(school.name)}</div>`
      + `<div style="color:rgba(255,255,255,.75);font-size:8pt;margin-top:2px">${esc(school.addr)}</div>`
      + `<div style="color:rgba(255,255,255,.65);font-size:8pt">Phone: ${esc(school.phone)} | Email: ${esc(school.email)}</div>`
      + `</div>`
      + (show("showPhoto") && photo ? `<img src="${esc(photo)}" style="width:65px;height:78px;object-fit:cover;border-radius:4px;border:2px solid ${TEAL};flex-shrink:0"/>` : "")
      + `</div>`;
  }

  if (show("showBio")) {
    h += `<table class="cardBio" style="width:100%;border-collapse:collapse;border-bottom:2px solid ${NAVY}"><tr>`
      + `<td rowspan="2" style="background:${NAVY};color:${WHITE};padding:7px 10px;width:92px;vertical-align:top;border-right:2px solid ${TEAL};${P}">`
      + `<div style="font-size:7.5pt;font-weight:700">REG. NO:</div>`
      + `<div style="font-size:9pt;font-weight:700;border-bottom:1px solid rgba(255,255,255,.25);padding-bottom:4px;margin-bottom:4px">${esc(s.admno || "--")}</div>`
      + `<div style="font-size:7.5pt;font-weight:700">SESSION:</div>`
      + `<div style="font-size:9pt;font-weight:700">${esc(data.session)}</div>`
      + `</td>`
      + `<td colspan="2" style="padding:7px 12px;background:${MINT};${P}">`
      + `<div style="font-size:10pt;font-weight:700;color:${NAVY}">NAME OF STUDENT: <span style="font-size:11pt;text-transform:uppercase">${esc(s.name)}</span></div>`
      + `<div style="margin-top:4px;display:flex;gap:20px;font-size:9pt">`
      + `<span><strong>GENDER:</strong> ${esc(s.gender || "--")}</span>`
      + `<span><strong>CLASS:</strong> ${esc(data.dept)}</span>`
      + `<span><strong>AGE:</strong> ${esc(s.age || "--")}</span>`
      + `</div></td>`
      + `<td style="padding:7px 12px;background:${MINT};text-align:right;${P}"><div style="font-size:9pt;font-weight:700;color:${NAVY}">TERM: ${esc(data.term)}</div></td>`
      + `</tr></table>`;
  }

  if (show("showSummary")) {
    h += `<table style="width:100%;border-collapse:collapse;border-bottom:1px solid ${BORDER};font-size:8pt"><tr>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">No. of students: <strong>${data.count}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Student avg: <strong>${data.studentAvg !== "" ? data.studentAvg : "--"}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Class avg: <strong>${data.classAvg !== "" ? data.classAvg : "--"}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Overall total: <strong>${data.grand !== "" ? data.grand : "--"}</strong></td>`
      + `</tr><tr>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Lowest avg: <strong>${data.lowestAvg !== "" ? data.lowestAvg : "--"}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Highest avg: <strong>${data.highestAvg !== "" ? data.highestAvg : "--"}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Overall performance: <strong style="color:${gradeOf(data.studentAvg).c}">${data.studentAvg !== "" ? gradeOf(data.studentAvg).r : "--"}</strong></td>`
      + `<td style="padding:4px 8px;border:1px solid ${BORDER}">Days school ended: --</td>`
      + `</tr></table>`;
  }

  if (show("showSubjects")) {
    const threeCa = Number(data.form.ca) === 3;
    h += `<div style="background:${TEAL};color:${WHITE};text-align:center;padding:5px;font-weight:700;font-size:9.5pt;text-transform:uppercase;${P}">Academic Subject Results</div>`
      + `<table style="width:100%;border-collapse:collapse;font-size:8pt"><thead><tr style="background:${NAVY};color:${WHITE};${P}">`
      + `<th style="padding:5px 6px;text-align:left;border:1px solid ${BORDER}">SUBJECT</th>`
      + (threeCa
        ? `<th style="padding:5px 2px;text-align:center;border:1px solid ${BORDER}">CA1<br/><small>(10)</small></th>`
          + `<th style="padding:5px 2px;text-align:center;border:1px solid ${BORDER}">CA2<br/><small>(10)</small></th>`
          + `<th style="padding:5px 2px;text-align:center;border:1px solid ${BORDER}">CA3<br/><small>(10)</small></th>`
        : `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">C.A.<br/><small>(30%)</small></th>`)
      + `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">EXAM<br/><small>(70%)</small></th>`
      + `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">TOTAL<br/><small>(100%)</small></th>`
      + `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">GRADE</th>`
      + (data.form.classAvg ? `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">CLASS AVG</th>` : "")
      + (data.form.highest ? `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">HIGHEST</th>` : "")
      + (data.form.remark ? `<th style="padding:5px 3px;text-align:center;border:1px solid ${BORDER}">REMARK</th>` : "")
      + `</tr></thead><tbody>`
      + data.rows.map((row, index) => {
        const bg = index % 2 === 0 ? WHITE : MINT;
        const hasCa = [row.ca1, row.ca2, row.ca3].some((value) => value !== "" && value !== null && value !== undefined);
        const ca = hasCa ? Math.min(30, (Number(row.ca1) || 0) + (Number(row.ca2) || 0) + (Number(row.ca3) || 0)) : "";
        const cell = (value: unknown) => value !== "" && value !== null && value !== undefined ? esc(value) : "";
        const total = row.total;
        return `<tr style="background:${bg};${P}">`
          + `<td style="padding:4px 6px;border:1px solid ${BORDER};font-weight:600;color:${NAVY}">${esc(row.name)}</td>`
          + (threeCa
            ? `<td style="padding:4px 2px;text-align:center;border:1px solid ${BORDER}">${cell(row.ca1)}</td>`
              + `<td style="padding:4px 2px;text-align:center;border:1px solid ${BORDER}">${cell(row.ca2)}</td>`
              + `<td style="padding:4px 2px;text-align:center;border:1px solid ${BORDER}">${cell(row.ca3)}</td>`
            : `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER}">${ca}</td>`)
          + `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER}">${cell(row.exam)}</td>`
          + `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER};font-weight:700">${total !== "" ? total : ""}</td>`
          + `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER};font-weight:700;color:${total !== "" ? gradeOf(total).c : "#999"}">${total !== "" ? gradeOf(total).g : ""}</td>`
          + (data.form.classAvg ? `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER}">${row.classAvg !== "" ? row.classAvg : "--"}</td>` : "")
          + (data.form.highest ? `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER};color:#065f46;font-weight:600">${row.highest !== "" ? row.highest : "--"}</td>` : "")
          + (data.form.remark ? `<td style="padding:4px 3px;text-align:center;border:1px solid ${BORDER};color:${total !== "" ? gradeOf(total).c : "#999"}">${total !== "" ? gradeOf(total).r : ""}</td>` : "")
          + `</tr>`;
      }).join("")
      + `</tbody></table>`;
  }

  if (show("showAffective") || show("showPsycho")) {
    h += `<div style="background:${TEAL};color:${WHITE};text-align:center;padding:5px;font-weight:700;font-size:9.5pt;text-transform:uppercase;${P}">Personal Development Assessment</div>`
      + `<table style="width:100%;border-collapse:collapse"><tr>`;
    if (show("showAffective")) {
      h += `<td style="width:50%;vertical-align:top;border-right:2px solid ${BORDER};padding:0">${traitTable("AFFECTIVE TRAITS", AFFECTIVE_TRAITS, data.affective)}</td>`;
    }
    if (show("showPsycho")) {
      h += `<td style="width:50%;vertical-align:top;padding:0">${traitTable("PSYCHOMOTOR SKILLS", PSYCHOMOTOR_TRAITS, data.psychomotor, `<tr><td colspan="2" style="padding:3px 8px;text-align:right;font-size:7pt;color:#666;border:1px solid ${BORDER};font-style:italic">5=Excellent, 1=Poor</td></tr>`)}</td>`;
    }
    h += `</tr></table>`;
  }

  if (show("showFees")) {
    const fees = data.fees;
    const balance = Number(fees.total || 0) + Number(fees.debt || 0) - Number(fees.paid || 0);
    h += `<table style="width:100%;border-collapse:collapse;border-top:2px solid ${NAVY}"><tr>`
      + `<td rowspan="2" style="background:${NAVY};color:${WHITE};padding:8px 10px;text-align:center;font-weight:700;font-size:8pt;width:100px;vertical-align:middle;${P}">SCHOOL FEES STATUS</td>`
      + `<th style="background:${MINT};padding:5px 8px;text-align:center;border:1px solid ${BORDER};font-size:8pt;${P}">Amount Paid</th>`
      + `<th style="background:${MINT};padding:5px 8px;text-align:center;border:1px solid ${BORDER};font-size:8pt;${P}">Previous Debt</th>`
      + `<th style="background:${MINT};padding:5px 8px;text-align:center;border:1px solid ${BORDER};font-size:8pt;${P}">Outstanding Balance</th>`
      + `</tr><tr>`
      + `<td style="padding:6px 8px;text-align:center;border:1px solid ${BORDER};font-weight:700">${fees.paid ? `N${Number(fees.paid).toLocaleString()}` : "--"}</td>`
      + `<td style="padding:6px 8px;text-align:center;border:1px solid ${BORDER};font-weight:700">${fees.debt ? `N${Number(fees.debt).toLocaleString()}` : "--"}</td>`
      + `<td style="padding:6px 8px;text-align:center;border:1px solid ${BORDER};font-weight:700;color:${balance > 0 ? "#c0392b" : "#065f46"}">${fees.total ? `N${balance.toLocaleString()}` : "--"}</td>`
      + `</tr></table>`;
  }

  if (sec.showNextTerm !== false && data.resume) {
    h += `<table style="width:100%;border-collapse:collapse;border-top:1px solid ${BORDER}"><tr>`
      + `<th style="background:${MINT};padding:5px 8px;text-align:center;border:1px solid ${BORDER};font-size:8pt;${P}">Next Term Begins</th>`
      + `</tr><tr><td style="padding:6px 8px;text-align:center;border:1px solid ${BORDER};font-weight:700;color:${TEAL}">${esc(data.resume)}</td></tr></table>`;
  }

  if (sec.showAttendance !== false) {
    h += `<div style="display:flex;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};font-size:8.5pt">`
      + `<div style="flex:1;padding:5px 10px;border-right:1px solid ${BORDER}">Days opened: <strong>${esc(data.attendance.opened || "--")}</strong></div>`
      + `<div style="flex:1;padding:5px 10px;border-right:1px solid ${BORDER}">Days present: <strong>${esc(data.attendance.present || "--")}</strong></div>`
      + `<div style="flex:1;padding:5px 10px;border-right:1px solid ${BORDER}">Days absent: <strong>${data.attendance.absent !== "" ? data.attendance.absent : "--"}</strong></div>`
      + `<div style="flex:1;padding:5px 10px">Subjects passed: <strong>${data.passed !== "" ? `${data.passed}/${data.rows.length}` : "--"}</strong></div>`
      + `</div>`;
  }

  h += `<div style="padding:6px 12px;border-bottom:1px solid ${BORDER};display:flex;align-items:center;gap:8px;font-size:8.5pt">`
    + `<strong style="color:${NAVY};white-space:nowrap">GENERAL REMARK</strong>`
    + `<div style="flex:1;border-bottom:1.5px solid #aaa;padding-bottom:2px;color:${TEAL};font-weight:600">${esc(data.remark)}</div>`
    + `</div>`;

  if (show("showSignature")) {
    h += `<div style="display:flex;justify-content:flex-start;align-items:flex-end;padding:10px 14px"><div style="text-align:center">`
      + (sigHtml || `<div style="height:36px;border-bottom:1.5px solid #999;width:160px"></div>`)
      + `<div style="font-size:7.5pt;font-weight:700;color:${NAVY};margin-top:3px;text-transform:uppercase;letter-spacing:.05em">${sigTitle}</div>`
      + `</div></div>`;
  }

  h += `</div>`;
  return h;
}

export function cardPage(data: CardData, options: { autoPrint?: boolean; message?: string } = {}) {
  const body = renderCard(data);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Report card · ${esc(data.student.name)}</title>
<link rel="icon" href="/images/wts-logo.png"/>
<style>
  @page{size:A4;margin:10mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#eef2f5}
  body{font-family:${FONT};color:#111}
  .bar{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 16px;background:${NAVY};color:#fff;font-size:9pt}
  .bar strong{grid-area:name;min-width:0;font-weight:600;color:${TEAL}}
  .bar .acts{grid-area:acts;display:flex;gap:10px}
  .bar .back{grid-area:back}
  .lbl-short{display:none}
  @media screen and (max-width:640px){
    .bar{grid-template-columns:auto 1fr;grid-template-areas:"back name" "acts acts";gap:8px}
    .bar .acts button{flex:1;padding:8px 6px;font-size:8.5pt}
    .lbl-full{display:none}
    .lbl-short{display:inline}
  }
  .bar button{border:0;border-radius:6px;padding:8px 14px;font:inherit;font-weight:700;background:${TEAL};color:${NAVY};cursor:pointer}
  .bar a{color:#fff;font-size:8.5pt}
  .sheet{display:flex;justify-content:center;padding:14px;overflow-x:auto}
  .report-card{width:100%;min-width:0}
  @media screen and (max-width:900px){
    .sheet{padding:6px}
    .report-card{font-size:7.2pt!important}
    .report-card table{font-size:6.7pt!important}
    .report-card td,.report-card th{padding-left:2px!important;padding-right:2px!important}
    .report-card td:first-child{min-width:70px}
    .report-card td{word-break:normal;overflow-wrap:anywhere}
    .report-card th,.report-card strong,.report-card td[rowspan] div{white-space:nowrap}
    .report-card td[style*="text-align:right"]{min-width:54px}
    .cardBio tbody,.cardBio tr{display:block}
    .cardBio td{display:block;width:auto!important;border-right:0!important}
    .cardBio td[rowspan]{padding:6px 10px!important}
    .cardBio td[colspan]{padding:6px 10px!important}
    .cardBio td[style*="text-align:right"]{text-align:left!important;min-width:0;padding:2px 10px 6px!important}
  }
  .panel{background:#fff;border-bottom:2px solid ${BORDER};padding:10px 16px;font-size:8.5pt;display:flex;flex-direction:column;gap:8px}
  .panel[hidden]{display:none}
  .panel .row{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}
  .panel strong{color:${NAVY};font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em}
  .panel label{display:flex;align-items:center;gap:5px;color:#334155}
  .panel input[type=text],.panel select{border:1px solid #cbd5e1;border-radius:5px;padding:4px 6px;font:inherit;background:#fff;color:#111}
  .panel input[type=text]{width:140px}
  .panel input[type=file]{font-size:8pt}
  .panel .save{border:0;border-radius:6px;padding:7px 16px;font:inherit;font-weight:700;background:${NAVY};color:#fff;cursor:pointer}
  .panel .save:disabled{opacity:.6;cursor:default}
  .panel .ghost{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:5px 10px;font:inherit;color:#334155;cursor:pointer}
  .panel .note{color:#475569}
  .panel .note.bad{color:#b91c1c}
  .panel img{height:34px;max-width:150px;object-fit:contain;border:1px dashed #cbd5e1;border-radius:4px;padding:2px;background:#fff}
  .printing .bar,.printing .panel{display:none!important}
  .printing .sheet{display:block;padding:0;overflow:visible}
  .printing .report-card{box-shadow:none!important;max-width:none!important}
  .back{display:flex;align-items:center;gap:4px;border:0;border-radius:6px;padding:8px 10px;font:inherit;font-weight:700;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;text-decoration:none;white-space:nowrap}
  @media print{
    html,body{background:#fff}
    .bar,.panel{display:none!important}
    .sheet{display:block;padding:0;overflow:visible}
    .report-card{box-shadow:none!important;max-width:none!important}
    table,tr,td,th{page-break-inside:avoid}
  }
</style></head>
<body>
<div class="bar"><a class="back" id="back" href="/assistant">← Back</a><strong>${esc(data.student.name)} · ${esc(data.term)} · ${esc(data.session)}${options.message ? ` — ${esc(options.message)}` : ""}</strong>
<div class="acts"><button type="button" id="openForm">Card form</button>
<button type="button" id="openSig">Signature</button>
<button type="button" id="printBtn"><span class="lbl-full">Print / Save as PDF</span><span class="lbl-short">Print</span></button></div></div>
<div class="panel" id="panel" hidden>
  <div class="row"><strong>Card form</strong>
    <label>CA columns
      <select id="f-ca">
        <option value="3"${Number(data.form.ca) === 3 ? " selected" : ""}>Three CA columns</option>
        <option value="1"${Number(data.form.ca) === 1 ? " selected" : ""}>One CA total</option>
      </select>
    </label>
    <label><input type="checkbox" id="f-classAvg"${data.form.classAvg ? " checked" : ""}/> Class average</label>
    <label><input type="checkbox" id="f-highest"${data.form.highest ? " checked" : ""}/> Highest</label>
    <label><input type="checkbox" id="f-remark"${data.form.remark ? " checked" : ""}/> Remark column</label>
  </div>
  <div class="row"><strong>Sections</strong>
    ${(["showFees", "showAttendance", "showPsycho", "showNextTerm", "showSignature"] as const).map((key) => `<label><input type="checkbox" data-section="${key}"${data.sections[key] !== false ? " checked" : ""}/> ${CARD_SECTION_LABELS[key]}</label>`).join("")}
  </div>
  <div class="row"><strong>Signature</strong>
    <label>Name <input type="text" id="s-name" maxlength="80" value="${esc(data.signature.name || "")}"/></label>
    <label>Title <input type="text" id="s-title" maxlength="80" placeholder="Proprietor" value="${esc(data.signature.title || "")}"/></label>
    <label>Image <input type="file" id="s-file" accept="image/png,image/jpeg"/></label>
    <img id="s-preview" alt="" src="${esc(data.signature.image || "")}"${data.signature.image ? "" : " hidden"}/>
    <button type="button" class="ghost" id="s-clear">Clear image</button>
  </div>
  <div class="row"><button type="button" class="save" id="save">Save changes</button><span class="note" id="note">Saved here shows on every card.</span></div>
</div>
<div class="sheet">${body}</div>
<script>
(function(){
  var panel=document.getElementById('panel');
  var note=document.getElementById('note');
  var save=document.getElementById('save');
  var preview=document.getElementById('s-preview');
  var image='';
  var clear=false;
  function open(){
    panel.hidden=false;
    var bar=document.querySelector('.bar');
    var top=panel.getBoundingClientRect().top+window.pageYOffset-(bar?bar.offsetHeight+6:0);
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }
  document.getElementById('openForm').addEventListener('click',open);
  document.getElementById('openSig').addEventListener('click',open);
  document.getElementById('s-clear').addEventListener('click',function(){image='';clear=true;preview.hidden=true;preview.removeAttribute('src');note.textContent='Signature image will be removed when you save.';note.className='note';});
  document.getElementById('s-file').addEventListener('change',function(){
    var file=this.files&&this.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(){
      var img=new Image();
      img.onload=function(){
        var scale=Math.min(1,600/(img.width||600));
        var canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        image=canvas.toDataURL('image/png');
        clear=false;
        preview.src=image;preview.hidden=false;
        note.textContent='New signature ready. Save to keep it.';
        note.className='note';
      };
      img.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  save.addEventListener('click',function(){
    var sections={};
    Array.prototype.forEach.call(document.querySelectorAll('[data-section]'),function(box){sections[box.getAttribute('data-section')]=box.checked;});
    var body={
      action:'card_config',
      cardForm:{ca:Number(document.getElementById('f-ca').value),classAvg:document.getElementById('f-classAvg').checked,highest:document.getElementById('f-highest').checked,remark:document.getElementById('f-remark').checked},
      sections:sections,
      signature:{name:document.getElementById('s-name').value,title:document.getElementById('s-title').value}
    };
    if(image)body.signature.image=image;
    else if(clear)body.signature.image='';
    save.disabled=true;
    note.textContent='Saving…';note.className='note';
    fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();})
      .then(function(got){
        if(got&&got.ok){note.textContent='Saved. Reloading…';location.reload();return;}
        save.disabled=false;
        note.textContent=(got&&got.code==='ASSISTANT_SIGNATURE_TOO_LARGE')?'That image is too large.':'Could not save. Try again.';
        note.className='note bad';
      })
      .catch(function(){save.disabled=false;note.textContent='Could not save. Check the connection.';note.className='note bad';});
  });
  var back=document.getElementById('back');
  var chat=new URLSearchParams(location.search).get('chat');
  if(chat)back.href='/assistant?chat='+encodeURIComponent(chat);
  var printBtn=document.getElementById('printBtn');
  window.addEventListener('beforeprint',function(){document.body.classList.add('printing');});
  window.addEventListener('afterprint',function(){document.body.classList.remove('printing');});
  printBtn.addEventListener('click',function(){
    document.body.classList.add('printing');
    setTimeout(function(){window.print();},80);
    setTimeout(function(){document.body.classList.remove('printing');},45000);
  });
  ${options.autoPrint ? "window.addEventListener('load',function(){var go=function(){document.body.classList.add('printing');setTimeout(function(){window.print();},250);setTimeout(function(){document.body.classList.remove('printing');},1800);};if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go);else go();});" : ""}
})();
</script>
</body></html>`;
}

export function cardErrorPage(message: string, detail = "") {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Report card</title><style>body{font-family:${FONT};background:#eef2f5;margin:0;padding:40px 20px;color:${NAVY}}
.box{max-width:560px;margin:0 auto;background:#fff;border-top:6px solid #b91c1c;border-radius:8px;padding:24px}
h1{font-size:15pt;margin:0 0 8px}p{font-size:10pt;line-height:1.5;margin:0 0 8px;color:#333}
code{font-size:8.5pt;color:#666}</style></head><body><div class="box">
<h1>The card could not be built</h1><p>${esc(message)}</p>${detail ? `<p><code>${esc(detail)}</code></p>` : ""}
<p>Go back to the assistant and ask again, or open the card on the results portal.</p></div></body></html>`;
}

export { dateText, esc };
