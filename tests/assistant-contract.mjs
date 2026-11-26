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
assert.match(route, /Always finish with a sentence/);

// One call reads the whole class and does the arithmetic on the server.
assert.match(route, /topStudentsOverall/);
assert.match(route, /bottomStudentsOverall/);
assert.match(route, /studentsWithoutExamNames/);
assert.match(route, /passMethod:/);
assert.match(route, /rankingMethod:/);

// A write asks for a tap, and a tap is verified against the same call.
assert.match(route, /requires_confirmation: true/);
assert.match(route, /approvalToken\(current, \{ tool: name, args \}\)/);
assert.match(route, /readApproval\(current, token\)/);
assert.match(route, /async function verifyWrite/);
assert.match(route, /read_back: true/);

// A turn cannot end silent.
assert.match(route, /const DONE_LABELS/);
assert.match(route, /const fallback = labels.length/);
assert.match(route, /The connected school systems did not finish this request/);

// Every turn carries the real class names and live term.
assert.match(route, /async function classCatalog/);
assert.match(route, /classes: classes.map\(\(row\) => row.label\)/);

console.log("Assistant contract passed");
