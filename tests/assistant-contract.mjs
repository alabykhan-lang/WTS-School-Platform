import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

// The turn must fit the hosting limit, not a budget the platform never grants.
assert.match(route, /export const maxDuration = 60;/);
assert.equal(vercel.functions["app/api/assistant/route.ts"].maxDuration, 60);
assert.match(route, /const MAX_TOOL_CALLS = 12;/);
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
assert.match(route, /Break a subject down when asked[^\n]*call class_analysis only ONCE/);

// A write asks for a tap, and a tap is verified against the same call.
assert.match(route, /requires_confirmation: true/);
assert.match(route, /approvalToken\(current, \{ tool: name, args \}\)/);
assert.match(route, /readApproval\(current, token\)/);
assert.match(route, /async function verifyWrite/);
assert.match(route, /read_back: true/);
assert.match(route, /read\.remarks/);

// A turn cannot end silent.
assert.match(route, /const DONE_LABELS/);
assert.match(route, /const fallback = facts.length/);
assert.match(route, /case "class_guardians"/);
assert.match(route, /async function classGuardians/);
assert.match(route, /guardian\.primaryPhone/);

// A remark keeps its text and the live term, however the model names them.
assert.match(route, /payload\.academic = text/);
assert.match(route, /await withAcademicContext\(current, payload\)/);
assert.match(route, /Date\.now\(\) - touched > 70000/);
assert.match(route, /The connected school systems did not finish this request/);

// Every turn carries the real class names and live term.
assert.match(route, /async function classCatalog/);
assert.match(route, /classes: classes.map\(\(row\) => row.label\)/);

// The proprietor's own answers charge the meter on the server; a developer
// test never moves it, and the client shows the returned balance.
assert.match(route, /async function chargeUsage/);
assert.match(route, /if \(!isAdmin && !isTestRun && answer\.ok === true\)/);
const ui = await readFile(new URL("../app/_components/ProprietorAssistant.tsx", import.meta.url), "utf8");
assert.match(ui, /config\.is_admin && <>\s*<div className="assistantPair">\s*<label><span>Balance \(%\)<\/span><input/, "the balance fields still show for a proprietor");
assert.match(ui, /const charged = value\.usage as/);
assert.doesNotMatch(ui, /current\.usagePercent - current\.perReplyCost/, "the client still counts the answer itself");

console.log("Assistant contract passed");
