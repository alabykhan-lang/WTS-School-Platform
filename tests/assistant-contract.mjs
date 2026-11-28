import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

// The turn must fit the hosting limit, not a budget the platform never grants.
assert.match(route, /export const maxDuration = 120;/);
assert.equal(vercel.functions["app/api/assistant/route.ts"].maxDuration, 120);
assert.match(route, /const MAX_TOOL_CALLS = 14;/);
assert.match(route, /const TOOL_RESULT_CAP = 6000;/);

// The brain is layered, and class work is one call.
for (const heading of ["HOW YOU WORK", "CLASS AND RESULT ANALYSIS", "APPROVAL, PUBLICATION AND CONFIRMATION", "AFTER EVERY WRITE", "LEARNER WORDS", "STYLE"]) {
  assert.ok(route.includes(`\n${heading}\n`), `missing prompt layer: ${heading}`);
}
assert.match(route, /call class_analysis once/);
assert.match(route, /call the write tool straight away/);
assert.match(route, /Always finish with a sentence/);

// One call reads the whole class and does the arithmetic on the server.
assert.match(route, /topStudentsOverall/);
assert.match(route, /bottomStudentsOverall/);
assert.match(route, /studentsWithoutMarkOnBasis/);
assert.match(route, /passMethod:/);
assert.match(route, /rankingMethod:/);
// A half-entered term is analysed on the marks that exist; a named part
// narrows the basis instead of blanking the exam.
assert.match(route, /const BASIS: Record<string, \{ fields: string\[\]; label: string \}>/);
assert.match(route, /basis: \{ type: "string", enum: \["current", "ca", "ca1", "ca2", "ca3", "exam"\]/);
assert.match(route, /const percentOf = /);
assert.match(route, /Leave basis at current/);
// Comparing classes is one call with no class name, not one call per class.
assert.match(route, /async function classAnalysisOne/);
assert.match(route, /mode: "school_compare"/);
assert.match(route, /classAveragePercent/);
assert.match(route, /Which class is most competitive/);
// The reply must not open with a data-dump label.
assert.match(route, /Never open with "Here is what the records returned"/);
// A test turn leaves the proprietor's balance alone, and a subject can be
// broken down on request.
assert.match(route, /const isTestRun = body\.test === true \|\| request\.headers\.get\("x-assistant-test"\) === "1";/);
assert.match(route, /!isAdmin && !isTestRun && payload\.ok === true/);
// Breakdown without a subject returns every subject in the one call, so the
// model never loops one subject at a time; a named subject adds the full table.
assert.match(route, /const breakdownOf = /);
assert.match(route, /breakdowns = chosenIndexes\.map/);
assert.match(route, /const componentAverages/);
assert.match(route, /printHint:/);

// Band counts use the portal's own default bands until the school customises
// them, so a breakdown always has real bands.
assert.match(route, /const DEFAULT_GRADE_SCALE/);

// Asking for the whole score list is one call that returns every row, and a
// timed-out list still prints as tables instead of a sentence.
assert.match(route, /list: \{ type: "boolean"/);
assert.match(route, /let scoreSheet: Record<string, unknown>/);
assert.match(route, /function scoreSheetText/);
assert.match(route, /call class_analysis ONCE with list true/);

// A plain "list every score" question is answered by the sheet printer without
// a model round, so it cannot loop or time out.
assert.match(route, /function sheetAsk/);
// "JSS 1" and "jss-1" must reach the stored jss1 class.
assert.match(route, /const compact = slug\.replace/);
assert.match(route, /scoreSheetText\(made\.scoreSheet/);
assert.match(route, /Break a subject down when asked[^\n]*call class_analysis only ONCE/);

// A write asks for a tap, and a tap is verified against the same call.
assert.match(route, /requires_confirmation: true/);
assert.match(route, /approvalToken\(current, \{ tool: name, args: prepared \}\)/);
assert.match(route, /readApproval\(current, token\)/);
assert.match(route, /async function verifyWrite/);
assert.match(route, /read_back: true/);
assert.match(route, /read\.remarks/);

// A turn cannot end silent.
assert.match(route, /const DONE_LABELS/);
assert.match(route, /const fallback = printed/);
assert.match(route, /: facts\.length/);
assert.match(route, /case "class_guardians"/);
assert.match(route, /async function classGuardians/);
assert.match(route, /guardian\.primaryPhone/);

// A remark keeps its text and the live term, however the model names them.
assert.match(route, /payload\.academic = text/);
assert.match(route, /await withAcademicContext\(current, payload\)/);
assert.match(route, /Date\.now\(\) - touched > 130000/);
assert.match(route, /The connected school systems did not finish this request/);

// Every turn carries the real class names and live term.
assert.match(route, /async function classCatalog/);
assert.match(route, /classes: classes.map\(\(row\) => row.label\)/);

// The proprietor's own answers charge the meter on the server; a developer
// test never moves it, and the client shows the returned balance.
assert.match(route, /async function chargeUsage/);
assert.match(route, /if \(!isAdmin && !isTestRun && answer\.ok === true\)/);
const ui = await readFile(new URL("../app/_components/ProprietorAssistant.tsx", import.meta.url), "utf8");
assert.match(ui, /config\.is_owner && <div className="assistantCard">\s*<h2>Set the balance<\/h2>[\s\S]{0,400}<label><span>Balance \(%\)<\/span><input/, "the balance fields still show for a proprietor");
assert.match(ui, /const charged = value\.usage as/);
assert.doesNotMatch(ui, /current\.usagePercent - current\.perReplyCost/, "the client still counts the answer itself");

// The screen is the cloned chat shell: header, avatars, quiet confirm row and a
// three-tab bar, not a settings page with a chat in it.
assert.match(ui, /className="assistantAvatar">WTS</);
assert.match(ui, /className="assistantWho">You</);
assert.match(ui, /placeholder="Message the assistant…"/);
assert.match(ui, /className="assistantConfirm"/);
assert.match(ui, /className="assistantTabbar"/);
assert.match(ui, />Chats<\/button>/);
assert.match(ui, />Models<\/button>/);
assert.match(ui, />Usage<\/button>/);
assert.doesNotMatch(ui, /assistantApproval/, "the old yellow approval bar is gone");
// The reply layer is prose and bullets, and settles pushback first.
assert.match(route, /async function verifyRow/);
assert.match(route, /matched: found\.matched/);
assert.match(route, /Read back from the record\./);
assert.match(route, /never a table/);
assert.match(route, /settle that point first/);
assert.match(route, /barely started/);

console.log("Assistant contract passed");

// One pass rule everywhere: the portal's total out of 100 against its own pass
// mark, stated in the answer, never an unstated exam-only cut.
assert.match(route, /const didPass = \(total: number\) => total >= passMark;/);
assert.match(route, /passMark,$/m);
assert.match(route, /passRule:/);
assert.match(route, /State it in every answer/);
// Ties share a position and every tied learner is listed.
assert.match(route, /const withTies = /);
assert.match(route, /withTies\(ranked, show\)/);
assert.match(route, /weakestByPercent/);
assert.match(route, /rankedMark/);
assert.match(route, /if five share second place, all five are listed/);
// The examiner's ground truth: the weakest exam marks are exam marks, not totals.
assert.match(route, /When the question is about the exam, quote the exam score itself/);
// The denominator is the whole class, and the learners without a mark are named.
assert.match(route, /passDenominator: students\.length/);
assert.match(route, /const notOnBasis = students/);
assert.match(route, /passRateOfMarked/);
assert.match(route, /say "40 of 64 passed", not "40 of 62"/);
// The grading formula is on the page, not just the pass mark.
assert.match(route, /passRuleLine/);
assert.match(route, /Pass is the total out of 100 \(CA1 \+ CA2 \+ CA3, up to 30, plus the exam, up to 70\)/);
// A school-wide missing-scores answer leads with the learners who have nothing.
assert.match(route, /learnersWithNoExamMarkAtAllCount/);
assert.match(route, /examGapsBySubject/);
assert.match(route, /subjectsWithNoExamAtAll/);
assert.match(route, /classesWithNoExamAtAll/);
assert.match(route, /missingHeadline/);
assert.match(route, /missingGapsText/);
assert.match(route, /studentsWithoutExamMark/);
assert.match(route, /classesNoExamLine/);
assert.match(route, /noExamSubjectsText/);
assert.match(route, /skippedText/);
assert.match(route, /basisLowestMark/);
assert.match(route, /marksRecordedOutOf/);
assert.match(route, /failedNames/);
// The source table carries its own percent column in a fixed order.
assert.match(route, /sourceTableColumns/);
assert.match(route, /"Percent", "Total \/100", "Pass"/);

// A write card names the subject and shows old → new, and needs a typed reason.
assert.match(route, /const shown = \(value: unknown\)/);
assert.match(route, /→ \$\{shown\(payload\[field\]\)\}/);
assert.match(route, /async function approve\(token: string, current: CurrentSession, reason = ""\)/);
assert.match(route, /body\.reason/);
assert.match(route, /payload: \{ \.\.\.payload, reason: reason\.trim\(\)\.slice\(0, 140\) \}/);
assert.match(ui, /placeholder=\{approval\.optional \? "Reason \(optional\)"/);
assert.match(ui, /approval\.reason\.trim\(\)\.length < 3/);
assert.match(ui, /Change cancelled — nothing was saved/);
assert.match(route, /Reason: \$\{reasonShown\}/);

// Archiving goes through students.archive, carries its own reason, and checks
// the record itself instead of asking the proprietor to look.
assert.match(route, /students\.archive, students\.restore/);
assert.match(route, /const ARCHIVE_REASON = /);
assert.match(route, /reason_optional: true/);
assert.match(route, /function withStandardReason/);
assert.match(route, /Read back from the record/);
assert.doesNotMatch(route, /check the record before relying on it/);
assert.match(ui, /approval\.optional/);

// A recording sheet can be attached, so the claim in the chat is real.
const upload = await readFile(new URL("../app/api/assistant/upload/route.ts", import.meta.url), "utf8");
assert.match(upload, /formData\(\)/);
assert.match(upload, /XLSX\.read/);
assert.match(ui, /type="file"/);
assert.match(ui, /api\/assistant\/upload/);

// The dev placeholders are gone from the live bar, but a test turn still works.
assert.doesNotMatch(ui, />How figures work</);
assert.doesNotMatch(ui, />Notify me</);
assert.match(ui, /\.has\("test"\)/);
assert.match(ui, /config\.is_owner/);
assert.match(route, /is_owner: ownerAccount\(person\)/);

// Long answers lead with a summary line, and the timeout sentence is plain.
assert.match(route, /On a long answer, put the headline first/);
assert.doesNotMatch(route, /There was more to do than the time allowed/);
assert.match(route, /A connected system did not answer, so a part of this may be missing/);

// Live progress and the published method page answer the speed and trust points.
assert.match(route, /current\.progress\?\.\(progressText/);
assert.match(route, /function progressText/);
assert.match(route, /school_assistant_job_progress/);
assert.match(ui, /setWaitNote\(value\.progress\)/);
const method = await readFile(new URL("../app/assistant/method/page.tsx", import.meta.url), "utf8");
assert.match(method, /pass mark/);
assert.match(method, /share the position/);
// Any answer can be printed or copied on its own.
assert.match(ui, /Print this answer/);
assert.match(ui, /navigator\.clipboard\.writeText/);
assert.match(route, /\/assistant\/method/);

console.log("Assistant correctness contract passed");

// A class row that stores its bare key still reads as a real class name.
assert.match(route, /given && \/\[A-Z\]\| \/\.test\(given\) \? given : classLabel\(key\)/);

// A stored key reads as "JSS 2", never "JSS2".
assert.match(route, /replace\(\/\^\(\[a-z\]\+\)\(\\d\)\/, "\$1 \$2"\)/);
