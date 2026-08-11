import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const config = await read("data/portal-config.ts");
const modules = await read("data/staff-portal-modules.ts");
const workspace = await read("app/_components/PortalWorkspaceClient.tsx");
const authorize = await read("app/api/sso/authorize/route.ts");
const identity = await read("app/api/identity/_lib.ts");
const documentation = await read("docs/PHASE-2-UNIFIED-PORTAL-INTEGRATION.md");
const publicPortal = await read("data/portal.ts");

for (const field of ["code", "displayName", "productionOrigin", "launchRoute", "ssoMethod", "requiredCentralModuleGrant", "operationalStatus", "visibilityRule", "displayOrder", "callbackRoute", "logoutReturnRoute"]) {
  assert.match(config, new RegExp(field), `registry is missing ${field}`);
}
assert.match(config, /displayName: "Administration"/);
assert.match(config, /launchRoute: "\/\?sso=1"/);
assert.match(config, /key: "resources"/);
assert.match(config, /operationalStatus: "unavailable"/);
assert.match(config, /operationalStatus: "under-development"/);
assert.match(config, /portalSsoClients/);

assert.match(modules, /portalModuleRegistry/);
assert.match(workspace, /resources: app\("resources"\)/);
assert.match(workspace, /managementAuthority/);
assert.match(workspace, /centralRegistry: managementAuthority/);
assert.match(workspace, /Integration in progress/);
assert.match(workspace, /This service is not connected/);
for (const origin of ["wts-result-system.vercel.app", "wts-attendance-system.vercel.app", "wts-central-registry.vercel.app", "wts-notification-system.vercel.app"]) {
  assert.equal(workspace.includes(origin), false, `workspace hardcodes ${origin}`);
  assert.equal(authorize.includes(origin), false, `SSO route hardcodes ${origin}`);
}
assert.equal(identity.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.equal(identity.includes("SUPABASE_SECRET_KEY"), false);
assert.match(identity, /WTS_SUPABASE_PUBLISHABLE_KEY|SUPABASE_PUBLISHABLE_KEY/);
assert.match(documentation, /Future custom-domain migration checklist/);
assert.match(documentation, /No connected repository or Vercel project was found/);
assert.match(publicPortal, /title: "Administration"/);
assert.match(publicPortal, /id: "resources"/);

console.log("Phase 2 portal integration contract passed.");
