import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.SCHOOL_PLATFORM_URL || "https://wts-school-platform.vercel.app";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  return { response, payload };
}

const workspace = await request("/api/workspace");
assert.equal(workspace.response.status, 401);
assert.equal(workspace.payload.code, "STAFF_SESSION_REQUIRED");

const session = await request("/api/workspace-session");
assert.equal(session.response.status, 401);
assert.equal(session.payload.code, "STAFF_SESSION_REQUIRED");

const login = await request("/api/workspace-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "login", login: "contract-test-invalid-login@example.invalid", password: "contract-test-invalid-password" }),
});
assert.equal(login.response.status, 401);
assert.equal(Object.hasOwn(login.payload, "client_secret"), false);
assert.equal(Object.hasOwn(login.payload, "session_secret"), false);

for (const path of ["app/_components/PortalWorkspaceClient.tsx"]) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.equal(/sessionStorage|localStorage/.test(source), false, `${path} stores browser session state`);
}

console.log(`School Platform workspace session contract passed against ${baseUrl}`);
