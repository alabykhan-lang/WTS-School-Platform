/**
 * The same report card as a real PDF, so a phone can save it to Downloads and
 * print it without a browser print dialog.
 */
import React from "react";
import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from "@react-pdf/renderer";
import { AFFECTIVE_TRAITS, PSYCHOMOTOR_TRAITS, type CardData } from "./card";

const NAVY = "#1a2a4a";
const MINT = "#edf8f4";
const TEAL = "#7dd4b0";
const BORDER = "#b8edd8";

const styles = StyleSheet.create({
  page: { paddingTop: 22, paddingBottom: 16, paddingHorizontal: 26, fontSize: 7.5, fontFamily: "Helvetica", color: "#111" },
  head: { backgroundColor: NAVY, color: "#fff", padding: 8, flexDirection: "row", alignItems: "center", borderTopWidth: 4, borderTopColor: NAVY },
  logo: { width: 44, height: 44, marginRight: 10, backgroundColor: "#fff", borderRadius: 4, objectFit: "contain" },
  school: { color: TEAL, fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  small: { color: "#dbe7f5", fontSize: 6.5, marginTop: 1 },
  bioRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDER, backgroundColor: MINT },
  bioCell: { padding: 4, borderRightWidth: 1, borderColor: BORDER },
  label: { fontSize: 6, color: "#475569" },
  value: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  band: { backgroundColor: TEAL, color: "#fff", textAlign: "center", paddingVertical: 3, fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase", marginTop: 4 },
  gridRow: { flexDirection: "row" },
  gridCell: { flex: 1, padding: 3, borderWidth: 1, borderColor: BORDER, marginTop: -1, marginLeft: -1 },
  th: { backgroundColor: NAVY, color: "#fff", fontSize: 6, fontFamily: "Helvetica-Bold", textAlign: "center", paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  td: { fontSize: 7, textAlign: "center", paddingVertical: 2.5, borderWidth: 1, borderColor: BORDER, marginTop: -1, marginLeft: -1 },
  tdName: { flex: 1, fontSize: 7, paddingVertical: 2.5, paddingHorizontal: 3, borderWidth: 1, borderColor: BORDER, marginTop: -1, marginLeft: -1, fontFamily: "Helvetica-Bold", color: NAVY },
  trait: { fontSize: 6.8, paddingVertical: 2.5, paddingHorizontal: 3, borderWidth: 1, borderColor: BORDER, marginTop: -1, marginLeft: -1 },
  two: { flexDirection: "row" },
  col: { flex: 1 },
  remark: { flexDirection: "row", marginTop: 6, alignItems: "flex-end" },
  remarkLabel: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 7 },
  remarkLine: { flex: 1, marginLeft: 6, height: 15, borderBottomWidth: 1, borderColor: "#aaa", paddingBottom: 2, justifyContent: "flex-end" },
  sign: { marginTop: 12, width: 130 },
  sigImg: { width: 150, height: 42, objectFit: "contain", marginBottom: 2 },
  sigName: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 7, textTransform: "uppercase" },
  sigLine: { borderBottomWidth: 1, borderColor: "#999", height: 24, marginBottom: 2 },
});

const cell = (value: unknown) => (value === "" || value === null || value === undefined ? "" : String(value));

export async function cardPdf(data: CardData): Promise<Buffer> {
  const s = data.student as Record<string, unknown>;
  const show = (key: string) => data.sections[key] !== false;
  const threeCa = Number(data.form.ca) === 3;
  const sig = data.signature;

  const doc = React.createElement(
    Document,
    { title: `Report card · ${String(s.name || "")}`, author: data.school.name },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // School header
      React.createElement(
        View,
        { style: styles.head },
        data.logo ? React.createElement(Image, { style: styles.logo, src: data.logo }) : null,
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.school }, data.school.name),
          React.createElement(Text, { style: styles.small }, data.school.addr),
          React.createElement(Text, { style: styles.small }, `Phone: ${data.school.phone} | Email: ${data.school.email}`),
        ),
      ),
      // Bio
      React.createElement(
        View,
        { style: styles.bioRow },
        React.createElement(View, { style: [styles.bioCell, { width: 130 }] },
          React.createElement(Text, { style: styles.label }, "REG. NO:"),
          React.createElement(Text, { style: styles.value }, String(s.admno || "")),
          React.createElement(Text, { style: [styles.label, { marginTop: 4 }] }, "SESSION:"),
          React.createElement(Text, { style: styles.value }, data.session),
        ),
        React.createElement(View, { style: [styles.bioCell, { flex: 1 }] },
          React.createElement(Text, { style: styles.label }, "NAME OF STUDENT:"),
          React.createElement(Text, { style: [styles.value, { fontSize: 9.5 }] }, String(s.name || "").toUpperCase()),
          React.createElement(View, { style: { flexDirection: "row", marginTop: 3 } },
            React.createElement(Text, { style: [styles.value, { width: 95 }] }, `GENDER: ${String(s.gender || "--")}`),
            React.createElement(Text, { style: [styles.value, { flex: 1 }] }, `CLASS: ${data.dept}`),
            React.createElement(Text, { style: [styles.value, { width: 60 }] }, `AGE: ${String(s.age || "--")}`),
            React.createElement(Text, { style: [styles.value, { width: 90 }] }, `TERM: ${data.term}`),
          ),
        ),
      ),
      // Summary
      React.createElement(
        View,
        { style: [styles.gridRow, { marginTop: 3 }] },
        ...[
          ["No. of students", String(data.count)],
          ["Student avg.", String(data.studentAvg || "--")],
          ["Class avg.", String(data.classAvg || "--")],
          ["Overall total", String(data.grand || "--")],
          ["Lowest avg.", String(data.lowestAvg ?? "--")],
          ["Highest avg.", String(data.highestAvg ?? "--")],
          ["Overall performance", data.studentAvg !== "" ? data.rows.length ? (Number(data.studentAvg) >= 40 ? "PASS" : "FAIL") : "--" : "--"],
          ["Days school ended", String(s.days_school_ended || "--")],
        ].map(([label, value], index) =>
          React.createElement(View, { key: `sm${index}`, style: styles.gridCell },
            React.createElement(Text, { style: styles.label }, label),
            React.createElement(Text, { style: styles.value }, value),
          ),
        ),
      ),
      // Subjects
      show("showSubjects") && React.createElement(Text, { style: styles.band }, "Academic Subject Results"),
      show("showSubjects") && React.createElement(
        View,
        { style: styles.gridRow },
        React.createElement(Text, { style: [styles.th, { flex: 1, textAlign: "left", paddingLeft: 4 }] }, "SUBJECT"),
        threeCa
          ? ["CA1 (10)", "CA2 (10)", "CA3 (10)"].map((label) => React.createElement(Text, { key: label, style: [styles.th, { width: 34 }] }, label))
          : React.createElement(Text, { style: [styles.th, { width: 40 }] }, "CA (30)"),
        React.createElement(Text, { style: [styles.th, { width: 34 }] }, "EXAM (70)"),
        React.createElement(Text, { style: [styles.th, { width: 34 }] }, "TOTAL"),
        React.createElement(Text, { style: [styles.th, { width: 26 }] }, "GRADE"),
        data.form.classAvg && React.createElement(Text, { style: [styles.th, { width: 40 }] }, "CLASS AVG"),
        data.form.highest && React.createElement(Text, { style: [styles.th, { width: 40 }] }, "HIGHEST"),
        data.form.remark && React.createElement(Text, { style: [styles.th, { width: 44 }] }, "REMARK"),
      ),
      ...data.rows.map((row, index) =>
        React.createElement(
          View,
          { key: `r${index}`, style: [styles.gridRow, { backgroundColor: index % 2 ? MINT : "#fff" }], wrap: false },
          React.createElement(Text, { style: styles.tdName }, row.name),
          threeCa
            ? [row.ca1, row.ca2, row.ca3].map((value, i) => React.createElement(Text, { key: `c${i}`, style: [styles.td, { width: 34 }] }, cell(value)))
            : React.createElement(Text, { style: [styles.td, { width: 40 }] },
              cell([row.ca1, row.ca2, row.ca3].some((v) => v !== "" && v !== null && v !== undefined)
                ? Math.min(30, (Number(row.ca1) || 0) + (Number(row.ca2) || 0) + (Number(row.ca3) || 0)) : "")),
          React.createElement(Text, { style: [styles.td, { width: 34 }] }, cell(row.exam)),
          React.createElement(Text, { style: [styles.td, { width: 34, fontFamily: "Helvetica-Bold" }] }, cell(row.total)),
          React.createElement(Text, { style: [styles.td, { width: 26, fontFamily: "Helvetica-Bold", color: row.total !== "" ? row.grade.c : "#999" }] }, row.total !== "" ? row.grade.g : ""),
          data.form.classAvg && React.createElement(Text, { style: [styles.td, { width: 34 }] }, row.classAvg !== "" ? String(row.classAvg) : "--"),
          data.form.highest && React.createElement(Text, { style: [styles.td, { width: 34, color: "#065f46", fontFamily: "Helvetica-Bold" }] }, row.highest !== "" ? String(row.highest) : "--"),
          data.form.remark && React.createElement(Text, { style: [styles.td, { width: 44, color: row.total !== "" ? row.grade.c : "#999" }] }, row.total !== "" ? row.grade.r : ""),
        ),
      ),
      // Traits
      (show("showAffective") || show("showPsycho")) && React.createElement(Text, { style: styles.band }, "Personal Development Assessment"),
      React.createElement(
        View,
        { style: styles.two },
        show("showAffective") && React.createElement(
          View,
          { style: styles.col },
          React.createElement(View, { style: styles.gridRow },
            React.createElement(Text, { style: [styles.th, { flex: 1, textAlign: "left", paddingLeft: 4 }] }, "AFFECTIVE TRAITS"),
            React.createElement(Text, { style: [styles.th, { width: 40 }] }, "RTG"),
          ),
          ...AFFECTIVE_TRAITS.map((trait, i) =>
            React.createElement(View, { key: `a${i}`, style: styles.gridRow },
              React.createElement(Text, { style: [styles.trait, { flex: 1 }] }, trait),
              React.createElement(Text, { style: [styles.trait, { width: 40, textAlign: "center", fontFamily: "Helvetica-Bold" }] }, data.affective[trait] || ""),
            ),
          ),
        ),
        show("showPsycho") && React.createElement(
          View,
          { style: [styles.col, { marginLeft: 8 }] },
          React.createElement(View, { style: styles.gridRow },
            React.createElement(Text, { style: [styles.th, { flex: 1, textAlign: "left", paddingLeft: 4 }] }, "PSYCHOMOTOR SKILLS"),
            React.createElement(Text, { style: [styles.th, { width: 40 }] }, "RTG"),
          ),
          ...PSYCHOMOTOR_TRAITS.map((trait, i) =>
            React.createElement(View, { key: `p${i}`, style: styles.gridRow },
              React.createElement(Text, { style: [styles.trait, { flex: 1 }] }, trait),
              React.createElement(Text, { style: [styles.trait, { width: 40, textAlign: "center", fontFamily: "Helvetica-Bold" }] }, data.psychomotor[trait] || ""),
            ),
          ),
        ),
      ),
      React.createElement(Text, { style: { fontSize: 6, textAlign: "right", marginTop: 2, color: "#475569" } }, "5=Excellent, 1=Poor"),
      // Fees, attendance and next term
      show("showFees") && React.createElement(
        View,
        { style: [styles.gridRow, { marginTop: 4 }] },
        ...[["SCHOOL FEES STATUS", ""], ["Amount Paid", cell(data.fees.paid)], ["Previous Debt", cell(data.fees.debt)], ["Outstanding Balance", cell(data.fees.total)]].map(([label, value], i) =>
          React.createElement(View, { key: `f${i}`, style: styles.gridCell },
            React.createElement(Text, { style: styles.label }, label),
            value ? React.createElement(Text, { style: styles.value }, value) : null,
          ),
        ),
      ),
      show("showAttendance") && React.createElement(
        View,
        { style: [styles.gridRow, { marginTop: 3 }] },
        ...[["Days opened", cell(data.attendance.opened)], ["Days present", cell(data.attendance.present)], ["Days absent", cell(data.attendance.absent)], ["Subjects passed", `${data.passed}/17`]].map(([label, value], i) =>
          React.createElement(View, { key: `at${i}`, style: styles.gridCell },
            React.createElement(Text, { style: styles.label }, label),
            React.createElement(Text, { style: styles.value }, value),
          ),
        ),
      ),
      show("showNextTerm") && React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.band }, "Next Term Begins"),
        React.createElement(Text, { style: { textAlign: "center", color: TEAL, fontFamily: "Helvetica-Bold", marginTop: 2 } }, data.resume || "--"),
      ),
      // Remark
      React.createElement(
        View,
        { style: styles.remark },
        React.createElement(Text, { style: styles.remarkLabel }, "GENERAL REMARK"),
        React.createElement(
          View,
          { style: styles.remarkLine },
          React.createElement(Text, { style: { fontSize: 7.5, color: "#334155" } }, data.remark),
        ),
      ),
      // Signature
      show("showSignature") && React.createElement(
        View,
        { style: styles.sign },
        sig.image
          ? React.createElement(Image, { style: styles.sigImg, src: sig.image })
          : React.createElement(View, { style: styles.sigLine }),
        React.createElement(Text, { style: styles.sigName }, sig.title || "Proprietor"),
      ),
    ),
  );

  return renderToBuffer(doc as never);
}
