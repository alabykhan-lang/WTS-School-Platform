import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const middleware = await read("middleware.ts");
const layout = await read("app/layout.tsx");
const workspace = await read("app/_components/PortalWorkspaceClient.tsx");
const modules = await read("data/staff-portal-modules.ts");

assert.match(middleware, /portal\.waytosuccessschools\.com/);
assert.match(middleware, /wts_school_workspace_session/);
assert.match(middleware, /NextResponse\.rewrite/);
assert.match(middleware, /"\/workspace"/);
assert.match(middleware, /"\/portal\/sign-in"/);

assert.match(layout, /headers\(\)/);
assert.match(layout, /staffPortalHost/);
assert.match(layout, /SiteHeader/);
assert.match(layout, /SiteFooter/);

assert.match(workspace, /school_staff_workspace_read_summary_api|summary\?\./);
assert.match(workspace, /centralRegistry: app\("central_registry"\)/);
assert.match(workspace, /results: app\("results"\)/);
assert.match(workspace, /grantedModules\.attendance/);
assert.match(workspace, /Sign out/);
assert.equal(/sessionStorage|localStorage/.test(workspace), false);
assert.match(modules, /staffPortalModules/);
assert.match(modules, /centralRegistry/);
assert.match(modules, /results/);
assert.match(modules, /attendance/);

console.log("Unified portal shell contract passed.");
