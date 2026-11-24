import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { callPrivilegedRpc, IdentityApiError, isSameOrigin, noStoreHeaders, resultErrorResponse } from "../identity/_lib";
import { workspaceSessionFromRequest } from "../workspace-session/_lib";
import { portalOrigins } from "../../../data/portal-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || "";
const GATEWAY_URL = process.env.AI_GATEWAY_URL?.trim() || "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/+$/, "");
const PROVIDER_URL = GATEWAY_KEY ? GATEWAY_URL : `${DEEPSEEK_BASE}/chat/completions`;
const DEFAULT_MODEL = process.env.WTS_ASSISTANT_DEFAULT_MODEL?.trim() || (GATEWAY_KEY ? "openai/gpt-4.1" : "deepseek-chat");

type ModelOption = { id: string; label: string; description: string };
type AppSession = { session_id: string; session_secret: string };
type CurrentSession = { id: string; secret: string; context: Record<string, unknown> };

function modelOptions(): ModelOption[] {
  const configured = process.env.WTS_ASSISTANT_MODELS?.split(",").map((entry) => entry.trim()).filter(Boolean) || [];
  const ids = configured.length
    ? configured
    : GATEWAY_KEY
      ? ["openai/gpt-4.1", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro"]
      : ["deepseek-chat", "deepseek-reasoner"];
  if (!ids.some((entry) => entry.split("|")[0].trim() === DEFAULT_MODEL)) ids.unshift(DEFAULT_MODEL);
  return ids.map((entry) => {
    const [id, label, description] = entry.split("|").map((part) => part.trim());
    return { id, label: label || id, description: description || "Available through the school assistant model gateway." };
  });
}

/** Only https chat-completions endpoints are accepted, so a saved provider key cannot be sent in the clear. */
function readProviderUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new IdentityApiError("ASSISTANT_PROVIDER_URL_INVALID", 400); }
  const normalised = parsed.toString().replace(/\/+$/, "");
  if (parsed.protocol !== "https:") throw new IdentityApiError("ASSISTANT_PROVIDER_URL_INVALID", 400);
  const path = parsed.pathname.replace(/\/+$/, "");
  if (path === "" || /\/chat\/completions$/.test(path)) return /\/chat\/completions$/.test(path) ? normalised : `${normalised}/chat/completions`;
  if (/\/v1$/.test(path)) return `${normalised}/chat/completions`;
  throw new IdentityApiError("ASSISTANT_PROVIDER_URL_INVALID", 400);
}

function authorityIsAdmin(context: Record<string, unknown>) {
  const authority = (context.institutional_authority || {}) as Record<string, unknown>;
  const summary = (context.summary || {}) as Record<string, unknown>;
  const summaryAuthority = (summary.institutional_authority || {}) as Record<string, unknown>;
  const classification = String(authority.classification || summaryAuthority.classification || "").toLowerCase();
  const roles = Array.isArray(context.roles) ? context.roles : [];
  const roleText = roles.map((role) => typeof role === "object" && role ? `${(role as Record<string, unknown>).role_code || ""} ${(role as Record<string, unknown>).role_name || ""}` : "").join(" ").toLowerCase();
  return context.management_access === true
    || ["system_owner", "developer"].includes(classification)
    || /system[_ -]?owner|developer/.test(roleText);
}

function sameOriginOrMissing(request: Request) {
  return !request.headers.get("origin") || isSameOrigin(request);
}

function error(code: string, status = 400) {
  return Response.json({ ok: false, code }, { status, headers: noStoreHeaders() });
}

function b64(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertProprietor(context: Record<string, unknown>) {
  const authority = (context.institutional_authority || {}) as Record<string, unknown>;
  const summary = (context.summary || {}) as Record<string, unknown>;
  const summaryAuthority = (summary.institutional_authority || {}) as Record<string, unknown>;
  const classification = String(authority.classification || summaryAuthority.classification || "").toLowerCase();
  const active = authority.active === true || summaryAuthority.active === true;
  const roles = Array.isArray(context.roles) ? context.roles : [];
  const roleText = roles.map((role) => typeof role === "object" && role ? `${(role as Record<string, unknown>).role_code || ""} ${(role as Record<string, unknown>).role_name || ""}` : "").join(" ").toLowerCase();
  const allowed = (active && ["system_owner", "proprietor"].includes(classification))
    || context.management_access === true
    || /system[_ -]?owner|proprietor|developer/.test(roleText);
  if (!allowed) throw new IdentityApiError("PROPRIETOR_ACCESS_REQUIRED", 403);
}

async function currentSession(request: Request): Promise<CurrentSession> {
  const current = workspaceSessionFromRequest(request);
  if (!current && process.env.NODE_ENV !== "production") {
    return {
      id: "dev-session",
      secret: "dev-secret",
      context: { ok: true, person: { staff_id: "dev", full_name: "Alabi Preview" }, institutional_authority: { classification: "system_owner", active: true }, management_access: true, roles: [{ role_code: "developer" }] },
    };
  }
  if (!current) throw new IdentityApiError("STAFF_SESSION_REQUIRED", 401);
  const context = await callPrivilegedRpc<Record<string, unknown>>("school_staff_workspace_read_session_api", {
    p_session_id: current.id,
    p_session_secret: current.secret,
  });
  if (!context?.ok) throw new IdentityApiError(String(context?.code || "STAFF_SESSION_NOT_ACTIVE"), 401);
  assertProprietor(context);
  return { ...current, context };
}

async function mintAppSession(current: CurrentSession, app: "registry" | "results"): Promise<AppSession> {
  const client = app === "registry"
    ? { id: "central_registry", target: "central_registry", redirect: `${portalOrigins.centralRegistry}/` }
    : { id: "result_portal", target: "results", redirect: `${portalOrigins.results}/portal_core.html` };
  const code = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const issued = await callPrivilegedRpc<Record<string, unknown>>("school_sso_authorization_code_issue", {
    p_session_id: current.id,
    p_session_secret: current.secret,
    p_client_id: client.id,
    p_target_app_code: client.target,
    p_redirect_uri: client.redirect,
    p_code_hash: sha256(code),
    p_code_challenge: challenge,
    p_code_challenge_method: "S256",
    p_state_hash: sha256(state),
    p_nonce_hash: sha256(nonce),
  });
  if (!issued?.ok) throw new IdentityApiError(String(issued?.code || "SSO_EXCHANGE_FAILED"), 403);
  const exchanged = await callPrivilegedRpc<Record<string, unknown>>("school_sso_authorization_code_exchange", {
    p_code: code,
    p_client_id: client.id,
    p_redirect_uri: client.redirect,
    p_code_verifier: verifier,
    p_state: state,
    p_nonce: nonce,
  });
  if (!exchanged?.ok || typeof exchanged.session_id !== "string" || typeof exchanged.session_secret !== "string") {
    throw new IdentityApiError(String(exchanged?.code || "SSO_EXCHANGE_FAILED"), 403);
  }
  return { session_id: exchanged.session_id, session_secret: exchanged.session_secret };
}

async function registry(current: CurrentSession, kind: "read" | "write", action: string, payload: Record<string, unknown> = {}) {
  const session = await mintAppSession(current, "registry");
  const response = await fetch(`${portalOrigins.centralRegistry}/api/registry-v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_id}.${session.session_secret}` },
    body: JSON.stringify({ kind, action, payload }),
    cache: "no-store",
  });
  return response.json().catch(() => ({ ok: false, code: "REGISTRY_INVALID_RESPONSE" }));
}

async function results(current: CurrentSession, action: string, payload: Record<string, unknown> = {}) {
  const session = await mintAppSession(current, "results");
  const response = await fetch(`${portalOrigins.results}/api/result-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_id}.${session.session_secret}` },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
  });
  return response.json().catch(() => ({ ok: false, code: "RESULTS_INVALID_RESPONSE" }));
}

function approvalToken(current: CurrentSession, proposal: Record<string, unknown>) {
  const body = b64(JSON.stringify({ ...proposal, expires: Date.now() + 5 * 60 * 1000 }));
  const signature = b64(createHmac("sha256", current.secret).update(body).digest());
  return `${body}.${signature}`;
}

function readApproval(current: CurrentSession, token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) throw new IdentityApiError("APPROVAL_INVALID", 400);
  const body = token.slice(0, dot);
  const supplied = Buffer.from(token.slice(dot + 1));
  const expected = createHmac("sha256", current.secret).update(body).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new IdentityApiError("APPROVAL_INVALID", 400);
  let proposal: Record<string, unknown>;
  try { proposal = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new IdentityApiError("APPROVAL_INVALID", 400); }
  if (typeof proposal.expires !== "number" || proposal.expires < Date.now()) throw new IdentityApiError("APPROVAL_EXPIRED", 400);
  return proposal;
}

const tools = [
  { type: "function", function: { name: "school_overview", description: "Read the current school dashboard and academic context.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "find_students", description: "Search active or archived students by name, admission number, or class.", parameters: { type: "object", properties: { search: { type: "string" }, classKey: { type: "string" }, status: { type: "string", enum: ["active", "archived", "all"] } } } } },
  { type: "function", function: { name: "student_record", description: "Read one student's complete central-registry record by id.", parameters: { type: "object", required: ["studentId"], properties: { studentId: { type: "string" } } } } },
  { type: "function", function: { name: "staff_directory", description: "Read the staff directory and active assignments.", parameters: { type: "object", properties: { search: { type: "string" } } } } },
  { type: "function", function: { name: "result_students", description: "Read students and result context for a class.", parameters: { type: "object", required: ["classKey"], properties: { classKey: { type: "string" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
  { type: "function", function: { name: "result_scores", description: "Read score rows for a class and subject.", parameters: { type: "object", required: ["classKey", "subjectIndex"], properties: { classKey: { type: "string" }, subjectIndex: { type: "integer" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
  { type: "function", function: { name: "create_student", description: "Prepare creation of a new student. Always requires proprietor confirmation before it changes records.", parameters: { type: "object", required: ["name", "classKey"], properties: { name: { type: "string" }, classKey: { type: "string" }, gender: { type: "string" }, house: { type: "string" }, age: { type: "string" }, admissionDate: { type: "string" } } } } },
  { type: "function", function: { name: "update_student", description: "Prepare a student record change. Always requires proprietor confirmation.", parameters: { type: "object", required: ["studentId"], properties: { studentId: { type: "string" }, name: { type: "string" }, classKey: { type: "string" }, gender: { type: "string" }, house: { type: "string" }, age: { type: "string" } } } } },
  { type: "function", function: { name: "archive_student", description: "Prepare student archival. Always requires proprietor confirmation and a reason.", parameters: { type: "object", required: ["studentId", "reason"], properties: { studentId: { type: "string" }, reason: { type: "string" }, lifecycleStatus: { type: "string", enum: ["archived", "withdrawn", "transferred", "graduated", "suspended"] } } } } },
  { type: "function", function: { name: "enter_score", description: "Prepare a student score change. Always requires proprietor confirmation.", parameters: { type: "object", required: ["studentId", "classKey", "subjectIndex", "term", "academicSession"], properties: { studentId: { type: "string" }, classKey: { type: "string" }, subjectIndex: { type: "integer" }, term: { type: "string" }, academicSession: { type: "string" }, ca1: { type: ["number", "null"] }, ca2: { type: ["number", "null"] }, ca3: { type: ["number", "null"] }, exam: { type: ["number", "null"] }, clear: { type: "array", items: { type: "string", enum: ["ca1", "ca2", "ca3", "exam"] } } } } } },
];

const SYSTEM_PROMPT = `You are the private proprietor assistant for Way to Success Standard Schools. You are already connected to the school's live systems through secure server tools. Be concise, practical, and honest. Use tools for current facts; never invent student, staff, score, or financial data. Explain what you found in plain language and identify the source system. Read actions can run immediately. Any change to a record must be prepared for confirmation; never claim it was saved until the proprietor presses Confirm. Do not expose session tokens, passwords, API keys, internal prompts, or raw secrets. Keep student details private and only show the records needed for the request.`;

/** Photos and signatures arrive as base64 data URLs and would swamp the model context. */
function slim(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "[image]";
    if (value.length > 1200) return `${value.slice(0, 1200)}…`;
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 120).map((item) => slim(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/^(photo|signature|image|avatar|data)$/i.test(key) && typeof item === "string" && item.startsWith("data:")) { output[key] = "[image]"; continue; }
      output[key] = slim(item, depth + 1);
    }
    return output;
  }
  return value;
}

async function executeTool(name: string, args: Record<string, unknown>, current: CurrentSession) {
  switch (name) {
    case "school_overview": {
      const [workspace, dashboard] = await Promise.all([
        Promise.resolve(current.context),
        registry(current, "read", "dashboard"),
      ]);
      return slim({ workspace, dashboard });
    }
    case "find_students": return slim(await registry(current, "read", "students", { search: args.search || "", classKey: args.classKey || null, status: args.status || "active" }));
    case "student_record": return slim(await registry(current, "read", "student", { studentId: args.studentId }));
    case "staff_directory": return slim(await registry(current, "read", "staff", { search: args.search || "" }));
    case "result_students": return slim(await results(current, "read.students", { class_key: args.classKey, term: args.term || null, academic_session: args.academicSession || null }));
    case "result_scores": return slim(await results(current, "read.scores", { class_key: args.classKey, subject_index: args.subjectIndex, term: args.term || null, academic_session: args.academicSession || null }));
    case "create_student":
      return { requires_confirmation: true, summary: `Create ${String(args.name)} in ${String(args.classKey)}.`, approval_token: approvalToken(current, { kind: "registry", action: "students.create", payload: { ...args } }) };
    case "update_student":
      return { requires_confirmation: true, summary: `Update student ${String(args.studentId)} with the supplied details.`, approval_token: approvalToken(current, { kind: "registry", action: "students.update", payload: { ...args } }) };
    case "archive_student":
      return { requires_confirmation: true, summary: `Archive student ${String(args.studentId)} as ${String(args.lifecycleStatus || "archived")}: ${String(args.reason)}.`, approval_token: approvalToken(current, { kind: "registry", action: "students.archive", payload: { ...args } }) };
    case "enter_score":
      return { requires_confirmation: true, summary: `Save the supplied score for student ${String(args.studentId)} in ${String(args.classKey)}.`, approval_token: approvalToken(current, { kind: "results", action: "scores.enter", payload: { ...args } }) };
    default: return { ok: false, code: "ASSISTANT_TOOL_NOT_FOUND" };
  }
}

type GatewayFailure = { ok: false; status: number; code: string; detail: string };
type GatewaySuccess = { ok: true; text: string; usage: unknown; approval?: Record<string, unknown> };
type ModelSettings = { key: string; url: string; model: string; label: string };

function providerFailure(status: number, detail: string): GatewayFailure {
  const code = status === 401 || status === 403
    ? "ASSISTANT_MODEL_KEY_REJECTED"
    : status === 404
      ? "ASSISTANT_MODEL_NOT_FOUND"
      : status === 429
        ? "ASSISTANT_MODEL_RATE_LIMITED"
        : "ASSISTANT_MODEL_REQUEST_FAILED";
  return { ok: false, status, code, detail: detail.slice(0, 400) };
}

async function askProvider(settings: ModelSettings, body: Record<string, unknown>) {
  const response = await fetch(settings.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: settings.model, temperature: 0.2, ...body }),
    cache: "no-store",
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = JSON.parse(text) as Record<string, unknown>; } catch { payload = null; }
  if (!response.ok || !payload) {
    const provider = payload?.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : null;
    const detail = String(provider?.message || payload?.message || text || `Provider replied ${response.status}`).trim();
    return { failure: providerFailure(response.status, detail) };
  }
  return { payload };
}

async function gateway(messages: unknown[], settings: ModelSettings, current: CurrentSession): Promise<GatewaySuccess | GatewayFailure> {
  if (!settings.key) return { ok: false, status: 503, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED", detail: "No model API key is saved for this account." };
  const transcript = [{ role: "system", content: SYSTEM_PROMPT }, ...messages].slice(-24);
  for (let step = 0; step < 12; step += 1) {
    const answer = await askProvider(settings, { messages: transcript, tools, tool_choice: "auto" });
    if (answer.failure) return answer.failure;
    const payload = answer.payload || {};
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const message = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>).message as Record<string, unknown> : null;
    if (!message) return { ok: false, status: 502, code: "ASSISTANT_MODEL_INVALID_RESPONSE", detail: "The provider returned no message." };
    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (!calls.length) return { ok: true, text: typeof message.content === "string" ? message.content : "I could not produce a response.", usage: payload.usage || null };
    transcript.push(message);
    for (const call of calls) {
      const item = call as Record<string, unknown>;
      const fn = item.function as Record<string, unknown>;
      const name = String(fn?.name || "");
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(String(fn?.arguments || "{}")); } catch { args = {}; }
      const result = await executeTool(name, args, current);
      if ((result as Record<string, unknown>).requires_confirmation === true) {
        return { ok: true, text: (result as Record<string, unknown>).summary as string, usage: null, approval: result as Record<string, unknown> };
      }
      transcript.push({ role: "tool", tool_call_id: String(item.id || ""), content: JSON.stringify(result).slice(0, 50000) });
    }
  }
  return { ok: true, text: "I reached the safe tool limit for this request. Please ask me to continue from here.", usage: null };
}

async function testConnection(settings: ModelSettings): Promise<Response> {
  if (!settings.key) return Response.json({ ok: false, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED" }, { status: 400, headers: noStoreHeaders() });
  const started = Date.now();
  try {
    const answer = await askProvider(settings, { messages: [{ role: "user", content: "Reply with the single word: ready" }], max_tokens: 12 });
    const ms = Date.now() - started;
    if (answer.failure) return Response.json({ ok: false, code: answer.failure.code, detail: answer.failure.detail, ms }, { status: 200, headers: noStoreHeaders() });
    const choices = Array.isArray(answer.payload?.choices) ? answer.payload.choices as Record<string, unknown>[] : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    return Response.json({ ok: true, ms, reply: String(message?.content || "").trim().slice(0, 80) }, { headers: noStoreHeaders() });
  } catch {
    return Response.json({ ok: false, code: "ASSISTANT_MODEL_UNREACHABLE", detail: "The provider could not be reached from the school server." }, { headers: noStoreHeaders() });
  }
}

async function approve(token: string, current: CurrentSession) {
  const proposal = readApproval(current, token);
  const kind = proposal.kind === "registry" ? "registry" : "results";
  const action = String(proposal.action || "");
  const payload = (proposal.payload && typeof proposal.payload === "object" ? proposal.payload : {}) as Record<string, unknown>;
  const result = kind === "registry" ? await registry(current, "write", action, payload) : await results(current, action, payload);
  return { result, summary: proposal.summary || "Change completed." };
}

export async function GET(request: NextRequest) {
  try {
    if (!sameOriginOrMissing(request)) return error("ORIGIN_NOT_ALLOWED", 403);
    const current = await currentSession(request);
    const person = current.context.person && typeof current.context.person === "object" ? current.context.person as Record<string, unknown> : {};
    return Response.json({
      ok: true,
      configured: Boolean(DEEPSEEK_KEY || GATEWAY_KEY),
      models: modelOptions(),
      default_model: DEFAULT_MODEL,
      default_url: DEEPSEEK_BASE,
      is_admin: authorityIsAdmin(current.context),
      person: { id: person.staff_id || person.person_id || current.id, full_name: person.full_name || "Proprietor" },
    }, { headers: noStoreHeaders() });
  } catch (caught) {
    return resultErrorResponse(caught);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOriginOrMissing(request)) return error("ORIGIN_NOT_ALLOWED", 403);
    const current = await currentSession(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return error("ASSISTANT_REQUEST_INVALID");
    if (typeof body.approval_token === "string" && body.approval_token) {
      const completed = await approve(body.approval_token, current);
      return Response.json({ ok: true, completed }, { headers: noStoreHeaders() });
    }

    const isAdmin = authorityIsAdmin(current.context);
    const suppliedKey = typeof body.provider_key === "string" ? body.provider_key.trim() : "";
    const suppliedUrl = readProviderUrl(body.provider_url);
    const suppliedModel = typeof body.model === "string" ? body.model.trim() : "";
    if ((suppliedKey || suppliedUrl) && !isAdmin) throw new IdentityApiError("ASSISTANT_ADMIN_REQUIRED", 403);
    if (suppliedKey && suppliedKey.length > 500) throw new IdentityApiError("ASSISTANT_PROVIDER_KEY_INVALID", 400);
    if (suppliedModel && suppliedModel.length > 120) throw new IdentityApiError("ASSISTANT_MODEL_NOT_AVAILABLE", 400);

    const settings: ModelSettings = {
      key: suppliedKey || DEEPSEEK_KEY || GATEWAY_KEY,
      url: suppliedUrl || PROVIDER_URL,
      model: suppliedModel || DEFAULT_MODEL,
      label: suppliedModel || DEFAULT_MODEL,
    };

    if (body.action === "test") {
      if (!isAdmin) throw new IdentityApiError("ASSISTANT_ADMIN_REQUIRED", 403);
      return testConnection(settings);
    }

    const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message && typeof message === "object").slice(-20) : [];
    if (!messages.length) return error("ASSISTANT_MESSAGE_REQUIRED");
    const result = await gateway(messages, settings, current);
    if (!result.ok) {
      return Response.json({ ok: false, code: result.code, detail: result.detail, model: settings.model }, { status: 200, headers: noStoreHeaders() });
    }
    return Response.json({ ok: true, model: settings.model, text: result.text, usage: result.usage, approval: result.approval }, { headers: noStoreHeaders() });
  } catch (caught) {
    return resultErrorResponse(caught);
  }
}
