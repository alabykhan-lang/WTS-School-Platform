import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lib = await readFile(new URL("../app/api/workspace-session/_lib.ts", import.meta.url), "utf8");

// The browser keeps the HttpOnly cookie; an agent sends a bearer session.
assert.match(lib, /function bearerSession\(request: Request\)/);
assert.match(lib, /if \(!value\) return bearerSession\(request\);/);
assert.ok(lib.includes("const BEARER_SESSION = /^Bearer"), "bearer pattern missing");
assert.match(lib, /WORKSPACE_SESSION_COOKIE/);
console.log("Agent bearer contract passed");
