import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { after, NextRequest } from "next/server";
import { callPrivilegedRpc, IdentityApiError, isSameOrigin, noStoreHeaders, resultErrorResponse } from "../identity/_lib";
import { workspaceSessionFromRequest } from "../workspace-session/_lib";
import { portalOrigins } from "../../../data/portal-config";
import { autoRemark, cardErrorPage, cardPage, CARD_SECTION_LABELS, CARD_SECTIONS, gradeOf, totalOf, dateText } from "./card";
import type { CardData } from "./card";
import { cardPdf } from "./card-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || "";
const GATEWAY_URL = process.env.AI_GATEWAY_URL?.trim() || "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/+$/, "");
const PROVIDER_URL = GATEWAY_KEY ? GATEWAY_URL : `${DEEPSEEK_BASE}/chat/completions`;
const DEFAULT_MODEL = process.env.WTS_ASSISTANT_DEFAULT_MODEL?.trim() || (GATEWAY_KEY ? "openai/gpt-4.1" : "deepseek-chat");

type ModelOption = { id: string; label: string; description: string };
type AppSession = { session_id: string; session_secret: string; attendance_client_code?: string; attendance_client_secret?: string };
type CurrentSession = { id: string; secret: string; context: Record<string, unknown>; deadline?: number; progress?: (text: string) => void };

/** How long a bridge call may wait, never past the turn's own deadline. */
function bridgeTimeout(current: CurrentSession, cap = 60000) {
  if (!current.deadline) return cap;
  return Math.max(7000, Math.min(cap, current.deadline - Date.now() - 4000));
}

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

function hostOfUrl(value: string) {
  try { return new URL(value).hostname; } catch { return ""; }
}

/** Known provider hosts that need a path before chat/completions, e.g. Google's OpenAI bridge. */
const PROVIDER_BASES: Record<string, string> = {
  "generativelanguage.googleapis.com": "/v1beta/openai",
  "api.openai.com": "/v1",
  "api.deepseek.com": "/v1",
  "platform.yeta.ai": "/v1",
  "api.xingchiapi.com": "/v1",
  "openrouter.ai": "/api/v1",
  "api.mistral.ai": "/v1",
  "api.groq.com": "/openai/v1",
};

/** Only https chat-completions endpoints are accepted, and a bare provider address is completed for the user. */
function readProviderUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new IdentityApiError("ASSISTANT_PROVIDER_URL_INVALID", 400); }
  if (parsed.protocol !== "https:") throw new IdentityApiError("ASSISTANT_PROVIDER_URL_INVALID", 400);
  const normalised = parsed.toString().replace(/\/+$/, "");
  const path = parsed.pathname.replace(/\/+$/, "");
  if (/\/(chat\/completions|responses)$/.test(path)) return normalised;
  const base = path === "" ? PROVIDER_BASES[parsed.hostname] || "/v1" : "";
  if (base) return `${parsed.origin}${base}/chat/completions`;
  return `${normalised}/chat/completions`;
}

function authorityIsAdmin(context: Record<string, unknown>) {
  const authority = (context.institutional_authority || {}) as Record<string, unknown>;
  const summary = (context.summary || {}) as Record<string, unknown>;
  const summaryAuthority = (summary.institutional_authority || {}) as Record<string, unknown>;
  const classification = String(authority.classification || summaryAuthority.classification || "").toLowerCase();
  const roles = Array.isArray(context.roles) ? context.roles : [];
  const roleText = roles.map((role) => typeof role === "object" && role ? `${(role as Record<string, unknown>).role_code || ""} ${(role as Record<string, unknown>).role_name || ""}` : "").join(" ").toLowerCase();
  // Only the developer's own account is free. A proprietor is management too,
  // so management_access alone would wrongly exempt them from the allowance.
  return ["system_owner", "developer"].includes(classification)
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
  // The database sheds a statement under load, so one retry keeps a slow spell from failing the turn.
  const readContext = () => callPrivilegedRpc<Record<string, unknown>>("school_staff_workspace_read_session_api", {
    p_session_id: current.id,
    p_session_secret: current.secret,
  });
  let context: Record<string, unknown>;
  try {
    context = await readContext();
  } catch {
    context = await readContext();
  }
  if (!context?.ok) throw new IdentityApiError(String(context?.code || "STAFF_SESSION_NOT_ACTIVE"), 401);
  assertProprietor(context);
  return { ...current, context };
}

async function mintAppSession(current: CurrentSession, app: "registry" | "results" | "attendance" | "notifications"): Promise<AppSession> {
  const client = app === "registry"
    ? { id: "central_registry", target: "central_registry", redirect: `${portalOrigins.centralRegistry}/` }
    : app === "attendance"
      ? { id: "attendance", target: "attendance", redirect: `${portalOrigins.attendance}/` }
      : app === "notifications"
        ? { id: "notifications", target: "notifications", redirect: `${portalOrigins.notifications}/` }
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
  return {
    session_id: exchanged.session_id,
    session_secret: exchanged.session_secret,
    ...(typeof exchanged.attendance_client_code === "string" ? { attendance_client_code: exchanged.attendance_client_code } : {}),
    ...(typeof exchanged.attendance_client_secret === "string" ? { attendance_client_secret: exchanged.attendance_client_secret } : {}),
  };
}

/** One registry session for several reads, so contact lists do not pay for an SSO exchange each time. */
async function openRegistry(current: CurrentSession) {
  const session = await mintAppSession(current, "registry");
  return async (kind: "read" | "write", action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(`${portalOrigins.centralRegistry}/api/registry-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_id}.${session.session_secret}` },
      body: JSON.stringify({ kind, action, payload }),
      cache: "no-store",
      signal: AbortSignal.timeout(bridgeTimeout(current, 30000)),
    });
    return response.json().catch(() => ({ ok: false, code: "REGISTRY_INVALID_RESPONSE" }));
  };
}

async function registry(current: CurrentSession, kind: "read" | "write", action: string, payload: Record<string, unknown> = {}) {
  return (await openRegistry(current))(kind, action, payload);
}

/** Guardian reads cached per request so a repeated contact question costs one pass. */
const guardianCache = new WeakMap<CurrentSession, Map<string, Record<string, unknown>[]>>();

async function guardiansFor(call: (kind: "read" | "write", action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown>>, current: CurrentSession, studentId: string) {
  let cache = guardianCache.get(current);
  if (!cache) { cache = new Map(); guardianCache.set(current, cache); }
  const hit = cache.get(studentId);
  if (hit) return hit;
  const answer = await call("read", "guardians", { studentId });
  const list = Array.isArray(answer?.guardians) ? (answer.guardians as Record<string, unknown>[]) : [];
  cache.set(studentId, list);
  return list;
}

async function openResults(current: CurrentSession) {
  const session = await mintAppSession(current, "results");
  return async (action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(`${portalOrigins.results}/api/result-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_id}.${session.session_secret}` },
      body: JSON.stringify({ action, payload }),
      cache: "no-store",
      signal: AbortSignal.timeout(bridgeTimeout(current)),
    });
    return response.json().catch(() => ({ ok: false, code: "RESULTS_INVALID_RESPONSE" }));
  };
}

async function results(current: CurrentSession, action: string, payload: Record<string, unknown> = {}) {
  return (await openResults(current))(action, payload);
}

const ATTENDANCE_RPCS = new Set([
  "attendance_strict_read_api",
  "attendance_strict_write_api",
  "attendance_qr_card_api",
  "attendance_roster_sync_status_api",
  "attendance_roster_sync_api",
  "attendance_roster_sync_retry_api",
]);

async function attendanceRequest(current: CurrentSession, name: string, action: string, payload: Record<string, unknown> = {}) {
  if (!ATTENDANCE_RPCS.has(name)) return { ok: false, code: "ATTENDANCE_RPC_NOT_ALLOWED" };
  const session = await mintAppSession(current, "attendance");
  if (!session.attendance_client_code || !session.attendance_client_secret) {
    return { ok: false, code: "ATTENDANCE_SESSION_CREATE_FAILED" };
  }
  const response = await fetch(`${portalOrigins.attendance}/api/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: portalOrigins.attendance,
      Cookie: `wts_attendance_central_session=${encodeURIComponent(`${session.session_id}.${session.session_secret}`)}; wts_attendance_session=${encodeURIComponent(`${session.attendance_client_code}.${session.attendance_client_secret}`)}`,
    },
    body: JSON.stringify({ name, action, payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(bridgeTimeout(current)),
  });
  return response.json().catch(() => ({ ok: false, code: "ATTENDANCE_INVALID_RESPONSE" }));
}

const NOTIFICATION_RPCS = new Set([
  "school_notification_control_read_api",
  "school_notification_control_write_api",
  "school_notification_recipient_admin_read_api",
  "school_notification_recipient_admin_write_api",
  "school_guardian_import_admin_read_api",
  "school_guardian_import_admin_write_api",
  "school_notification_message_admin_write_api",
  "school_notification_bulk_message_api",
  "school_notification_template_send_api",
]);

async function notificationRequest(current: CurrentSession, name: string, action: string, payload: Record<string, unknown> = {}) {
  if (!NOTIFICATION_RPCS.has(name)) return { ok: false, code: "NOTIFICATION_ACTION_NOT_ALLOWED" };
  const session = await mintAppSession(current, "notifications");
  if (!session.attendance_client_code || !session.attendance_client_secret) {
    return { ok: false, code: "NOTIFICATION_SESSION_CREATE_FAILED" };
  }
  const response = await fetch(`${portalOrigins.notifications}/api/assistant-rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      action,
      payload,
      clientCode: session.attendance_client_code,
      clientSecret: session.attendance_client_secret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(bridgeTimeout(current)),
  });
  return response.json().catch(() => ({ ok: false, code: "NOTIFICATION_INVALID_RESPONSE" }));
}

/** Fill term and session from the live academic context when the model omits them. */
/** The live term and session, read from the results app when the session itself does not carry them. */
async function liveAcademic(current: CurrentSession) {
  const held = (current.context.academic_context || {}) as Record<string, unknown>;
  if (typeof held.session === "string" && held.session && typeof held.term === "string" && held.term) {
    return { session: held.session, term: held.term };
  }
  const read = await results(current, "settings.read", {}).catch(() => null);
  const live = ((read?.settings || {}) as Record<string, unknown>).academic_context as Record<string, unknown> | undefined;
  const session = typeof live?.academic_session === "string" ? live.academic_session : "";
  const term = typeof live?.term === "string" ? live.term : "";
  if (session && term) (current.context as Record<string, unknown>).academic_context = { ...held, session, term };
  return { session, term };
}

const CLASS_CACHE_MS = 120000;
const classCache = new Map<string, { at: number; rows: { key: string; label: string }[] }>();

/** The real class names, so the model never has to guess a class key. */
async function classCatalog(current: CurrentSession) {
  const key = current.id;
  const held = classCache.get(key);
  if (held && Date.now() - held.at < CLASS_CACHE_MS) return held.rows;
  try {
    const call = await openResults(current);
    const read = await call("read.classes", {});
    const rows = (Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [])
      .filter((row) => row && row.class_key)
      .map((row) => ({ key: String(row.class_key), label: String(row.display_name || classLabel(String(row.class_key))) }));
    if (rows.length) classCache.set(key, { at: Date.now(), rows });
    return rows;
  } catch {
    return held?.rows || [];
  }
}

const SUBJECT_CACHE_MS = 120000;
const subjectCache = new Map<string, { at: number; rows: Record<string, unknown>[] }>();

/** A class subject list barely changes, so a second turn reuses it. */
async function classSubjects(current: CurrentSession, call: (name: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>, classKey: string) {
  const key = `${current.id}:${classKey}`;
  const held = subjectCache.get(key);
  if (held && Date.now() - held.at < SUBJECT_CACHE_MS) return { ok: true, rows: held.rows };
  const read = await call("read.subjects", { class_key: classKey });
  const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
  if (read?.ok && rows.length) subjectCache.set(key, { at: Date.now(), rows });
  return read;
}

/** Class keys are lowercase slugs, but people type "SS2 Science", so settle it here. */
function classKeyOf(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const slug = raw.replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // "JSS 1", "jss-1" and "jss1" are the same class to the school.
  const compact = slug.replace(/^(creche|kg|nursery|primary|pry|basic|jss|ss)-?(\d[a-z]?)(?:-(.+))?$/, (_all, head: string, number: string, tail?: string) => `${head === "pry" ? "primary" : head}${number}${tail ? `-${tail}` : ""}`);
  const aliases: Record<string, string> = { ss1: "ss1-general", ss2: "ss2-general", ss3: "ss3-general" };
  return aliases[compact] || compact;
}

/** "ss2-science" reads as "SS2 Science" when no display name is saved. */
function classLabel(key: string) {
  return key.split("-").filter(Boolean).map((part, index) => (index === 0 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1))).join(" ");
}

async function withAcademicContext(current: CurrentSession, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const live = await liveAcademic(current);
  return {
    ...payload,
    class_key: payload.class_key ? classKeyOf(payload.class_key) : payload.class_key,
    term: payload.term || live.term || null,
    academic_session: payload.academic_session || live.session || null,
  };
}

/** Everything a report card needs, in the shape the portal uses, so the assistant can render and print it. */
async function reportCard(current: CurrentSession, args: Record<string, unknown>) {
  const call = await openResults(current);
  let studentId = String(args.studentId || "");
  if (!studentId) {
    const wanted = String(args.search || "").trim();
    if (!wanted) return { ok: false, code: "RESULT_STUDENT_REQUIRED", detail: "Pass the student's name or admission number." };
    const lower = wanted.toLowerCase();
    const match = (rows: Record<string, unknown>[]) => rows.filter((row) => String(row.admno || "").toLowerCase() === lower || String(row.name || "").toLowerCase().includes(lower));
    // With a class named, the class roster is the surest and quickest way to the
    // child; the registry search is the second, independent route.
    const rosterHits = async () => {
      const ctx = await withAcademicContext(current, { class_key: args.classKey });
      if (!ctx.class_key) return [];
      // The portal only reads the class it has open on this session.
      await call("context.set", { class_key: ctx.class_key, academic_session: ctx.academic_session, term: ctx.term });
      const roster = await call("read.students", ctx);
      return Array.isArray(roster?.rows) ? match(roster.rows as Record<string, unknown>[]) : [];
    };
    const find = async () => {
      const found = await registry(current, "read", "students", { search: wanted, classKey: args.classKey ? classKeyOf(args.classKey) : null, status: "active" });
      return match(Array.isArray(found?.students) ? found.students as Record<string, unknown>[] : []);
    };
    let hits = await find();
    if (!hits.length) hits = await find();
    if (!hits.length) hits = await rosterHits();
    const exact = hits.find((row) => String(row.admno || "").toLowerCase() === wanted.toLowerCase()) || hits.find((row) => String(row.name || "").toLowerCase() === wanted.toLowerCase());
    const pick = exact || (hits.length === 1 ? hits[0] : null);
    if (!pick) {
      return hits.length > 1
        ? { ok: false, code: "RESULT_STUDENT_AMBIGUOUS", detail: `Which one? ${hits.slice(0, 8).map((row) => `${row.name} (${row.admno})`).join(", ")}.` }
        : { ok: false, code: "RESULT_STUDENT_NOT_FOUND", detail: `No active student matches "${wanted}"${args.classKey ? ` in ${String(args.classKey)}` : ""}.` };
    }
    studentId = String(pick.id);
    if (!args.classKey && pick.class_key) args = { ...args, classKey: pick.class_key };
  }
  const payload = await withAcademicContext(current, { class_key: args.classKey, student_id: studentId });
  if (!payload.class_key || !payload.term || !payload.academic_session) {
    return { ok: false, code: "RESULT_ACADEMIC_CONTEXT_REQUIRED", detail: "A class, term and session are needed." };
  }
  const contextReady = call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
  // A read can start before the context lands, so a mismatch waits for it and tries once more.
  const read = async (name: string, body: Record<string, unknown>) => {
    const first = await call(name, body);
    if (first?.ok || first?.code !== "RESULT_CONTEXT_MISMATCH") return first;
    await contextReady;
    return call(name, body);
  };
  const [summary, subjectsCall, traits, remarks, settings] = await Promise.all([
    read("read.result_summary", payload),
    read("read.subjects", { class_key: payload.class_key }),
    read("read.traits", payload),
    read("read.remarks", payload),
    call("settings.read", {}),
  ]);
  await contextReady;
  if (!summary.ok) return summary;
  const bag = (summary.summary || {}) as { students?: Record<string, unknown>[]; scores?: Record<string, unknown>[] };
  const student = (bag.students || []).find((row) => String(row.id) === studentId);
  if (!student) return { ok: false, code: "RESULT_STUDENT_NOT_IN_CLASS" };
  const names = new Map<number, string>();
  for (const row of (Array.isArray(subjectsCall?.rows) ? subjectsCall.rows : []) as Record<string, unknown>[]) {
    names.set(Number(row.subject_index), String(row.subject_name || ""));
  }
  const config = ((settings?.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
  const weights = (config?.assessment_config || config?.assessment || { ca1: 10, ca2: 10, ca3: 10, exam: 70 }) as Record<string, unknown>;
  const scores = (bag.scores || []).filter((row) => String(row.student_id) === studentId);
  const rows = scores
    .map((row) => {
      const index = Number(row.subject_index);
      const total = ["ca1", "ca2", "ca3", "exam"].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
      return { subject: names.get(index) || `Subject ${index}`, ca1: row.ca1, ca2: row.ca2, ca3: row.ca3, exam: row.exam, total };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
  return {
    ok: true,
    document: "report_card",
    school: "Way to Success Standard Schools",
    student: { id: String(student.id || studentId), name: String(student.name || ""), admno: String(student.admno || ""), class_key: String(student.class_key || ""), gender: String(student.gender || ""), house: String(student.house || "") },
    term: payload.term,
    academic_session: payload.academic_session,
    weights,
    rows,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    traits: traits?.rows || [],
    remarks: remarks?.rows || [],
    note: "Print this as it is. Numbers come straight from the results portal.",
  };
}


type Usage = { percent: number; cost: number; days: number; until: number };

function cleanUsage(raw: unknown): Usage | null {
  const value = raw as Record<string, unknown> | null;
  if (!value || typeof value !== "object") return null;
  const num = (input: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
  };
  return {
    percent: num(value.percent, 0, 100, 100),
    cost: num(value.cost, 0, 100, 1),
    days: num(value.days, 1, 365, 30),
    until: num(value.until, 0, Date.now() + 400 * 86400000, 0),
  };
}

/** The allowance is kept with the school settings so both accounts see the same meter. */
async function readUsage(current: CurrentSession) {
  try {
    const read = await results(current, "settings.read", {});
    const config = (read?.settings?.app_config || {}) as Record<string, unknown>;
    return cleanUsage(config.assistant_usage);
  } catch {
    return null;
  }
}

async function saveUsage(current: CurrentSession, raw: unknown) {
  const usage = cleanUsage(raw);
  if (!usage) return { ok: false, code: "ASSISTANT_USAGE_INVALID" };
  const read = await results(current, "settings.read", {});
  if (!read?.ok) return read;
  const config = ((read.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
  return results(current, "settings.app_config.update", { config: { ...(config || {}), assistant_usage: usage } });
}

/**
 * One answer by the proprietor costs one step. It is charged here, on the
 * server, so a developer test never moves the meter and the client cannot
 * count the same answer twice.
 */
async function chargeUsage(current: CurrentSession): Promise<Usage | null> {
  try {
    const usage = await readUsage(current);
    if (!usage) return null;
    const next = { ...usage, percent: Math.max(0, Math.round((usage.percent - usage.cost) * 10) / 10) };
    const read = await results(current, "settings.read", {});
    const config = ((read?.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
    await results(current, "settings.app_config.update", { config: { ...(config || {}), assistant_usage: next } });
    return next;
  } catch {
    return null;
  }
}

/** The card's own settings: the signature and which parts of the card to print. */
const CARD_FORM_DEFAULTS = { ca: 3, classAvg: true, highest: true, remark: true };

async function saveCardConfig(current: CurrentSession, body: Record<string, unknown>) {
  const read = await results(current, "settings.read", {});
  if (!read?.ok) return read;
  const config = { ...(((read.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> || {}) };

  if (body.signature && typeof body.signature === "object") {
    const supplied = body.signature as Record<string, unknown>;
    const old = (config.signature || {}) as Record<string, unknown>;
    const next: Record<string, string> = {};
    const name = typeof supplied.name === "string" ? supplied.name.trim().slice(0, 80) : String(old.name || "");
    const title = typeof supplied.title === "string" ? supplied.title.trim().slice(0, 80) : String(old.title || "Proprietor");
    if (name) next.name = name;
    next.title = title || "Proprietor";
    if (supplied.image === "") next.image = "";
    else if (typeof supplied.image === "string" && supplied.image.startsWith("data:image/")) {
      if (supplied.image.length > 1_600_000) return { ok: false, code: "ASSISTANT_SIGNATURE_TOO_LARGE" };
      next.image = supplied.image;
    } else if (typeof old.image === "string" && old.image) next.image = old.image;
    config.signature = next;
  }

  if (body.cardForm && typeof body.cardForm === "object") {
    const supplied = body.cardForm as Record<string, unknown>;
    const old = (config.cardForm || {}) as Record<string, unknown>;
    config.cardForm = {
      ca: Number(supplied.ca) === 1 ? 1 : Number(supplied.ca) === 3 ? 3 : Number(old.ca) === 1 ? 1 : 3,
      classAvg: typeof supplied.classAvg === "boolean" ? supplied.classAvg : old.classAvg !== false,
      highest: typeof supplied.highest === "boolean" ? supplied.highest : old.highest !== false,
      remark: typeof supplied.remark === "boolean" ? supplied.remark : old.remark !== false,
    };
  }

  if (body.sections && typeof body.sections === "object") {
    const supplied = body.sections as Record<string, unknown>;
    const sections = { ...((config.sections || {}) as Record<string, unknown>) };
    for (const key of CARD_SECTIONS) if (typeof supplied[key] === "boolean") sections[key] = supplied[key];
    config.sections = sections;
  }

  return results(current, "settings.app_config.update", { config });
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
  const supplied = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = createHmac("sha256", current.secret).update(body).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new IdentityApiError("APPROVAL_INVALID", 400);
  let proposal: Record<string, unknown>;
  try { proposal = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new IdentityApiError("APPROVAL_INVALID", 400); }
  if (typeof proposal.expires !== "number" || proposal.expires < Date.now()) throw new IdentityApiError("APPROVAL_EXPIRED", 400);
  return proposal;
}

const tools = [
  { type: "function", function: { name: "school_overview", description: "Read the current school dashboard and academic context.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "find_students", description: "List active students in a class or search active students by name or admission number. Always pass classKey when listing a class.", parameters: { type: "object", properties: { search: { type: "string" }, classKey: { type: "string" } } } } },
  { type: "function", function: { name: "class_guardians", description: "Check every student's guardian phone in one class in one call. Returns who has a guardian phone and who has none. Use it for 'who has no guardian phone', missing contacts, or a reachability check instead of reading students one by one.", parameters: { type: "object", required: ["classKey"], properties: { classKey: { type: "string" } } } } },
  { type: "function", function: { name: "student_record", description: "Read one student's complete record by id, including guardian contacts.", parameters: { type: "object", required: ["studentId"], properties: { studentId: { type: "string" } } } } },
  { type: "function", function: { name: "staff_directory", description: "Read the staff directory and active assignments.", parameters: { type: "object", properties: { search: { type: "string" } } } } },
  { type: "function", function: { name: "results_read", description: "Read information available to the signed-in proprietor in the Results Portal. Use for results, marks, subject lists, publication, traits, remarks, fees, class rosters, and report-card context. The portal applies the account's permissions and class scope. For class performance, pass/fail, coverage, averages, or rankings, use class_analysis so the complete class is read and summarized in one call.", parameters: { type: "object", required: ["resource"], properties: { resource: { type: "string", enum: ["classes", "fees", "published_subjects", "remarks", "result_summary", "scores", "students", "subjects", "traits"] }, classKey: { type: "string" }, studentId: { type: "string" }, subjectIndex: { type: "integer" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
  { type: "function", function: { name: "class_analysis", description: "One call gives a complete class analysis from the Results Portal: coverage, per-subject pass/fail rates, per-subject top performers, and the overall top and bottom order. It reads the whole class once and does the arithmetic on the server. Use it for every class performance question and call it only once per class. Omit classKey to compare every class on its average and pass rate in this one call. basis defaults to current, which uses every mark recorded so far and compares percentages so a learner whose exam is not entered yet still ranks; name a basis only when the proprietor asks to grade on that part alone. Pass subject only for exactly one subject; topN changes how many leaders are returned; includeMissing names learners with nothing on the chosen basis; breakdown true adds a simple per-subject breakdown (bands, component averages, strongest and weakest) for every subject in this one call, so use it alone for 'break it down'; add subject only for one named subject, which also returns the full table. list true returns the whole score sheet in the same call, for requests to list every score. source true adds sourceTable, the exact marks behind every ranked learner, for 'show me the source table' or a spot check.", parameters: { type: "object", properties: { classKey: { type: "string", description: "The class to analyse. Leave it out for a whole-school comparison" }, basis: { type: "string", enum: ["current", "ca", "ca1", "ca2", "ca3", "exam"], description: "current = every recorded mark (default); ca = all continuous assessment; ca1, ca2, ca3 = that single CA; exam = exam only" }, subject: { type: "string", description: "Subject name or stored index, for one subject only" }, topN: { type: "integer" }, includeMissing: { type: "boolean" }, breakdown: { type: "boolean", description: "Add the simple breakdown for every subject at once. With a single subject named, also return that subject's full table" }, list: { type: "boolean", description: "Return every learner's marks for every subject analysed, as the whole score sheet" }, source: { type: "boolean", description: "Add sourceTable: the exact recorded marks, percent and total behind each ranked learner, so a figure can be checked" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
  { type: "function", function: { name: "results_history", description: "Read prior terms and sessions the signed-in proprietor can access in the Results Portal. Use for historical comparisons; the portal enforces the account's access.", parameters: { type: "object", properties: { classKey: { type: "string" }, studentId: { type: "string" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
  {
    type: "function",
    function: {
      name: "results_request",
      description: "Use any Results Portal read or action for the proprietor through the signed-in portal session. Pass the portal action and its normal payload; class_key, student_id, term and academic_session are used as the portal expects, and the live term and session fill in by themselves. Common write actions: scores.enter (ca1, ca2, ca3, exam), traits.enter (trait_name, rating), remarks.enter (the remark text in academic), fees.update (total, paid, debt). Never call for a change unless the proprietor explicitly requested it. The Results Portal itself enforces permissions and write freezes.",
      parameters: { type: "object", required: ["action"], properties: { action: { type: "string" }, payload: { type: "object", additionalProperties: true } } },
    },
  },
  { type: "function", function: { name: "registry_request", description: "Use any central Registry read or action through the signed-in proprietor's Registry session. Pass kind read or write, one action name from the list and its payload. Read actions: students, student (with studentId, for one full record), guardians, staff, staff_self, registrations, catalog, allocations, calendar, prefect, portfolio, portal_access, dashboard. Write actions: students.update, student.update, guardian.upsert, students.restore, allocations.class.set, allocations.subject.set, allocations.class.end, portal.access.set, registration.approve, calendar.transition, prefect.select, profile.signature.update. The Registry enforces the proprietor's permissions and record scope.", parameters: { type: "object", required: ["kind", "action"], properties: { kind: { type: "string", enum: ["read", "write"] }, action: { type: "string" }, payload: { type: "object", additionalProperties: true } } } } },
  { type: "function", function: { name: "attendance_request", description: "Use the connected Attendance System for attendance reads or actions through the proprietor's attendance session. The Attendance System checks account permissions. Only use the listed RPC names; pass its action and payload.", parameters: { type: "object", required: ["rpc", "action"], properties: { rpc: { type: "string", enum: ["attendance_strict_read_api", "attendance_strict_write_api", "attendance_qr_card_api", "attendance_roster_sync_status_api", "attendance_roster_sync_api", "attendance_roster_sync_retry_api"] }, action: { type: "string" }, payload: { type: "object", additionalProperties: true } } } } },
  { type: "function", function: { name: "notification_request", description: "Use the connected WTS Notifications System to inspect settings, recipients, queued messages, or perform a requested notification action. Pass one of the approved RPC names and its normal action/payload. The system enforces permissions. Never send a message until the proprietor explicitly asks; for a send, state the exact recipients, approved template/message, and scope, then get confirmation before calling.", parameters: { type: "object", required: ["rpc"], properties: { rpc: { type: "string", enum: ["school_notification_control_read_api", "school_notification_control_write_api", "school_notification_recipient_admin_read_api", "school_notification_recipient_admin_write_api", "school_guardian_import_admin_read_api", "school_guardian_import_admin_write_api", "school_notification_message_admin_write_api", "school_notification_bulk_message_api", "school_notification_template_send_api"] }, action: { type: "string" }, payload: { type: "object", additionalProperties: true } } } } },
  { type: "function", function: { name: "report_card", description: "Prepare report cards when the proprietor asks. Use the class and student details supplied; use class_analysis for class-wide statistics instead of rebuilding cards one student at a time.", parameters: { type: "object", required: [], properties: { classKey: { type: "string" }, studentId: { type: "string" }, search: { type: "string", description: "Student name or admission number" }, term: { type: "string" }, academicSession: { type: "string" } } } } },
];

const SYSTEM_PROMPT = `You are the Way to Success Assistant, the school operator for Way to Success Standard Schools. You work across the school's own digital systems — the Results Portal, the Central Registry, the Attendance System and the Notifications System — and you act for the proprietor inside those systems, not beside them. You are warm, quick and exact, and you speak like a trusted colleague.

NAMING
- Creche to Primary 5 are pupils. JSS1 to SS3 are students. Use the right word for the class in hand, and "pupils and students" when a list spans both stages.
- Class names always carry their stage: say "Primary 3", not "P3"; "JSS 2", not "J2".

HOW YOU WORK
- You decide. Read the message, any photo and the whole conversation yourself, then act with the tools. Nobody parses the sentence for you.
- Act first, talk second. For reading, searching and previewing, act immediately. For a change, call the write tool straight away: it comes back as a confirmation card, and that card is the review. Then stop and wait for the tap. Do not ask "shall I?" in prose and do not stop before the write tool is called.
- The newest message sets the job. Answer what it asks, in its own words. A tool call is how you get there, never a substitute for the answer.
- Chain tools freely. Most jobs need a few calls: read the record, resolve the class or person, act, read back, report.
- Stop as soon as the question is answered. The moment the fact is in hand, write the answer — do not keep reading to feel sure, and do not read a second time what one read already gave.
- student_record already includes the guardian contacts (and the guardian count when there are none), so never follow it with registry reads for the same person.
- One chat can move across classes, people, terms and systems. Use the class, subject and term in the newest message; an earlier screen is only context. Never tell the proprietor to start a new chat for another class or system.
- When a tool has already settled something, it is settled. Do not describe your own doubt about a name, class or date a tool matched. Act on it.
- Never ask for what is already in the conversation or in a tool result. Short forms and everyday wording are enough: "SS2 sci" is SS2 Science, "1st term" is 1st Term, "CA" is continuous assessment.
- Ask once, only where a wrong guess is costly: an ambiguous class or person, an unreadable figure, or two real choices. A value a tool returned is not a choice.
- If a tool returns an error or a next-step hint, do what the hint says. Never refuse when the signed-in account is allowed the action.
- You are not caged to one class, one subject, one term or one system. Follow the proprietor and keep going.

CLASS AND RESULT ANALYSIS
- For class performance, pass and failure rates, exam coverage, averages, rankings or top performers per subject, call class_analysis once. It reads the complete class result set in one request and does the arithmetic on the server.
- Do not page through pupils or subjects one call at a time when class_analysis covers the job. Do not read every student record to answer a class question.
- Use the numbers the tool returns exactly. Never count rows, average marks or work out a rate in your head.
- A term fills up bit by bit: CA, then tests, then exam one subject after another. That is normal, never a fault to report.
- "Current" means every mark recorded so far, CA and any exam already entered. Leave basis at current and score all of it. Only when the proprietor says exam alone, test alone, first CA alone, second CA or third CA alone do you pass that basis and grade on that part only.
- Pass and fail always use the portal's own grading and nothing else: a learner's total out of 100 (CA1 + CA2 + CA3 + exam) at or above the pass mark. class_analysis returns that mark as passMark. State it in every answer that carries a pass or fail figure, as "pass mark 40" or similar. Never mix an exam-only rate with a total rate, and never use a rate the tool did not return.
- When the question is about the exam, quote the exam score itself from rankedMark, not the total. The same holds for any named part: quote the score for that part, and let the total sit beside it if it helps.
- Give the class, session, term, roster size and the denominator behind every rate. A subject with only a few marks on the chosen basis is reported against those marks, not against the whole class, and you say so.
- Marks are out of 10 for each CA and out of 70 for the exam; quote the maximum with any average and never invent one.
- Never say a class has no data, or tell the proprietor to finish the exam, when CA is recorded. Answer with what is in the records and mention how much of the exam is in yet.
- overallPassRate counts graded subject entries, not learners. Quote it as "40 of 64 graded entries passed" and use a subject's passRate when the question is about that subject.
- A learner with no exam mark has no total that can pass, so they count as not passing until the exam lands. When a passRateNote is returned, say it in the same breath as the rate. Never quote an exam-only rate and call it the pass rate.
- "Which class is most competitive", "which classes are best or worst", or any comparison between classes: call class_analysis once with NO classKey. It compares every class on its own average and pass rate. Name the strongest class first with its figure, then the weakest, and keep the rest to the few that matter.
- Break a subject down when asked, even for "just show me" or "simply", and call class_analysis only ONCE. Leave subject out and pass breakdown true and you get every subject broken down in the same call; add subject only when the proprietor named one subject, which also returns the full table.
- In a breakdown give the bands as a short list, the strongest and weakest few, and where the marks were lost (component averages against their maximums). Print the whole table only when the hint says to; otherwise top five and bottom five.
- When the proprietor asks for the list of scores, every score, or the whole sheet, call class_analysis ONCE with list true, and add subject only for one named subject. scoreSheet.roster holds the names; each row's i is its position in that list. Print a table per subject with every row, blank marks as a dash, and do not call again per subject.
- one whole-class call already returns every subject with its own marks, rates and leaders, plus the overall order. Do not call it again once per subject. Pass subject only when the proprietor asks about exactly one subject, and topN only to change how many leaders are shown.
- Use results_read for a single record, one pupil's marks, traits, remarks or fees, and never for whole-class statistics.
- Use results_history only for prior terms and sessions the proprietor can already see.
- A report card is report_card, for the named pupil. Do not build cards to answer a class statistic.

OTHER SYSTEM WORK
- Registry: list and search students and staff, read a student's record and guardian contacts, check a whole class's guardian phones, and perform an explicitly requested Registry action with registry_request. Registry actions are named, not routed: the payload lists them, so use one name and do not try others one by one. find_students then student_record settles a person; only reach for registry_request when those two do not cover it.
- Attendance: read registers and status through attendance_request, and perform an explicitly requested attendance action with the same tool.
- Notifications: read settings, recipients, templates and queues through notification_request. A send needs the exact recipients, template or message text and scope confirmed first.
- Results Portal: use results_request for any portal action that the specialist tools do not cover, read or write. Every system applies the signed-in proprietor's own permissions; a refusal is that system's rule, not yours.
- When a system is not reachable, say which one and what part was unavailable. Never fill the gap with a guess or send the proprietor off to do the work by hand.
- The Registry has no home address field anywhere. An address can only come from a guardian, so read the guardians and stop: no guardian means no address is stored. Say that in one line and offer to add the guardian, never hunt other Registry actions for it.
- When a field the proprietor asked for is simply empty in the record, say that in one flat line: "No home address is stored for him." Do not offer two readings side by side and do not hedge with "it may exist but not be reachable". If a lookup did not finish, name the part that was not checked instead of talking about time.

TOOLS BY JOB
- Class marks, pass/fail, coverage, averages, ranks, top performers: class_analysis (once).
- Who has no guardian phone, a reachability check: class_guardians (once).
- A class roster, a person by name or admission number: find_students.
- One pupil's record, guardian contacts, fees, traits, remarks: student_record or results_read.
- Staff list: staff_directory.
- One report card: report_card.
- Anything else in a system: results_request, registry_request, attendance_request or notification_request with its normal action.
- Do not use a general request tool for a job a specialist tool already covers.

APPROVAL, PUBLICATION AND CONFIRMATION
- Reading, searching, previewing, samples and reversible calculations are free and need no tap.
- A school write returns a confirmation card. The card is the review: it already names the record, class, subject and the old and new value, or the exact recipients and text. Do not repeat a prose preview before calling it, and do not say it is done before the tap.
- Publish, unpublish, delete, archive, a settings change, a staff change, a subject-catalogue change, a message send and a large batch always need the tap.
- A pupil is changed one field at a time when the request names one field; a whole batch is one confirmation with its count.
- Never overwrite or delete silently. Show the difference, or say what will be removed, and wait.

AFTER EVERY WRITE
- Verify by reading the record back, not by trusting the preview.
- Report what actually changed: person, class, subject, old value, new value. Give the batch or message result and say what can be undone.
- If the re-read does not show the change, say it did not save and do not call it done.

INVESTIGATION
- When something looks wrong, read the data first, explain the cause in plain words, then propose the smallest fix.
- A subject is identified by its stored index, never by its position in a list. A hidden subject keeps its index and its marks.
- If a figure looks impossible, check the denominator and the term before reporting it as a finding.

LEARNER WORDS
- Crèche, Nursery, KG and Primary classes: say "pupil" and "pupils".
- JSS and SS classes: say "student" and "students". Never call a secondary learner a pupil.
- Follow the class section in every reply, including lists and error sentences. On a whole-school answer say "learners".

STYLE
- Sound like a helpful person who knows the school, not a report. Warm, direct, everyday words.
- Answer the question in the first line, in the words it was asked. Never open with "Here is what the records returned", "Based on the data" or similar.
- Then give only the figures that answer it, the few that matter, and stop. Short sentences; two to five lines on a phone. A full list is right when the question asks for a list.
- If the question pushes back on the last answer, or says it is wrong, settle that point first in one plain sentence. Own a mistake outright: "You're right — that class has nothing recorded." Never defend the old answer.
- Write in the chat as prose and bullets, never a table. A table is only right when the person asks for one.
- On a long answer, put the headline first as one plain line — the number, the class, the name that matters — then the detail. Example: "JSS 3 Yoruba passes 49 of 55 (89.1%), pass mark 40, and Qozeem Yusroh is the weakest on the exam at 14."
- Say figures the way they were counted. Never round differently, never invent a second figure for the same thing.
- When the answer is thin, lead with that fact, not with the count: "Primary 4 is barely started — one mark in the whole class."
- Say what it means: "JSS 3 is ahead", "the exam is barely in yet, so this can still move".
- Offer one plain next step when it helps, as a normal sentence: "Want the bottom five?" Not every turn needs one.
- Use "- " bullets for lists, one learner, subject or figure per line.
- Never mention tool names, JSON, RPCs or internal codes. Never print tokens or keys.
- A question you ask is a normal question, never a failure message.
- Put learners in alphabetical order whenever you list a group.
- A report card appears as a Save button under your reply, so do not paste file links; say the card is ready and name the pupil.
- Answer greetings, thanks and simple explainers naturally, without tools.
- Always finish with a sentence. Never end a turn on a tool call or a button label.`;

/**
 * The per-turn state the model needs: real class names, the live term and
 * session, and the date. State only — the rules live in the prompt above.
 */
function systemPrompt(current: CurrentSession, classes: { key: string; label: string }[] = []) {
  const academic = (current.context.academic_context || {}) as Record<string, unknown>;
  const live = typeof academic.session === "string" && typeof academic.term === "string" && academic.session && academic.term
    ? `${academic.session}, ${academic.term}`
    : "not read yet";
  const person = (current.context.person || {}) as Record<string, unknown>;
  const envelope = {
    SCHOOL_CONTEXT: {
      school: "Way to Success Standard Schools",
      today: new Date().toISOString().slice(0, 10),
      signed_in_as: String(person.full_name || "Proprietor"),
      live_academic_context: live,
      classes: classes.map((row) => row.label),
      systems: ["Results Portal", "Central Registry", "Attendance System", "Notifications System"],
    },
  };
  return `${SYSTEM_PROMPT}\n\nTURN STATE\n${JSON.stringify(envelope)}`;
}

/** Keep complete school records; redact credentials and binary image data before model use. */
function slim(value: unknown, depth = 0, field = ""): unknown {
  if (/password|secret|token|api.?key|credential/i.test(field)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (/^(photo|signature|image|avatar|data)$/i.test(field) && value.startsWith("data:")) return "[image]";
    if (value.startsWith("data:image/")) return "[image]";
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => slim(item, depth + 1, field));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) output[key] = slim(item, depth + 1, key);
    return output;
  }
  return value;
}

/**
 * With a class named, that class is analysed in full. Without one, every class
 * is compared on its own average and pass rate in this same call, so "which
 * class is most competitive" never needs one call per class.
 */
async function classAnalysis(current: CurrentSession, args: Record<string, unknown>) {
  if (classKeyOf(args.classKey)) return classAnalysisOne(current, args);
  const catalog = await classCatalog(current);
  if (!catalog.length) return { ok: false, code: "RESULT_CLASS_REQUIRED", detail: "Name the class to analyse.", hint: "Call class_analysis again with one of the class names in TURN STATE." };

  const basisKey = String(args.basis || "current").toLowerCase().replace(/[^a-z0-9]/g, "");
  // One settings read serves every class, so the comparison stays quick.
  const sharedRead = await results(current, "settings.read", {}).catch(() => null);
  const sharedConfig = ((sharedRead?.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
  const sharedGrades = Array.isArray(sharedConfig?.gradeScale) && sharedConfig.gradeScale.length
    ? sharedConfig.gradeScale as Record<string, unknown>[]
    : DEFAULT_GRADE_SCALE;
  const ranked: Record<string, unknown>[] = [];
  const skipped: { class: string; code: string }[] = [];
  const queue = [...catalog];
  const worker = async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      current.progress?.(`Reading ${item.label}`);
      const made = await classAnalysisOne(current, { ...args, classKey: item.key, breakdown: false, list: false, includeMissing: false }, sharedGrades) as Record<string, unknown>;
      if (made.ok !== true) { skipped.push({ class: item.label, code: String(made.code || "UNREAD") }); continue; }
      if (!Number(made.gradedSubjectEntries || 0)) continue;
      ranked.push({
        class: item.label,
        roster: made.rosterCount,
        subjects: made.subjectCount,
        averagePercent: made.classAveragePercent,
        passRate: made.overallPassRate,
        examCoverage: made.examCoverageRate,
      });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  ranked.sort((a, b) => Number(b.averagePercent ?? -1) - Number(a.averagePercent ?? -1) || Number(b.passRate ?? -1) - Number(a.passRate ?? -1));
  ranked.forEach((row, index) => { row.rank = index + 1; });
  if (!ranked.length) return { ok: false, code: "RESULT_NO_MARKS_ANYWHERE", detail: "No class has a mark recorded yet on this basis.", hint: "Say that no marks are recorded yet and ask the proprietor to enter them in the Results Portal." };
  const live = await withAcademicContext(current, {});
  return {
    ok: true,
    mode: "school_compare",
    source: "results_portal_each_class_read",
    basis: basisKey || "current",
    term: live.term,
    academicSession: live.academic_session,
    classesCompared: ranked.length,
    classesSkipped: skipped.length ? skipped : undefined,
    mostCompetitive: ranked[0],
    leastCompetitive: ranked[ranked.length - 1],
    ranked,
    method: "Classes are ordered by their average learner percentage on the chosen basis, with the pass rate breaking ties. Classes with no marks on that basis are left out.",
    hint: "Name the mostCompetitive class first with its average and pass rate, then the leastCompetitive, then only the few in between that matter. Say the exam is barely in where coverage is low.",
  };
}

/** One class, measured across every subject, from a single read of that class. */
async function classAnalysisOne(current: CurrentSession, args: Record<string, unknown>, sharedGrades?: Record<string, unknown>[]) {
  const requestedClass = classKeyOf(args.classKey);
  if (!requestedClass) return { ok: false, code: "RESULT_CLASS_REQUIRED", detail: "Name the class to analyse.", hint: "Call class_analysis again with one of the class names in TURN STATE." };
  const payload = await withAcademicContext(current, {
    class_key: requestedClass,
    term: args.term,
    academic_session: args.academicSession,
  });
  if (!payload.term || !payload.academic_session) return { ok: false, code: "RESULT_ACADEMIC_CONTEXT_REQUIRED", detail: "The Results Portal has no current session and term.", hint: "Say that no live term is set and ask the proprietor to set it in the Results Portal." };

  const call = await openResults(current);
  const set = await call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
  if (!set?.ok) return set;
  // The subject list and settings do not depend on the sheet read, so they go
  // out beside it instead of after it. That is one round trip saved per class.
  const extras = Promise.all([
    classSubjects(current, call, String(payload.class_key)).catch(() => ({ ok: false, code: "RESULT_SUBJECTS_FAILED", rows: [] as Record<string, unknown>[] })),
    sharedGrades ? Promise.resolve(null) : call("settings.read", {}).catch(() => null),
  ]);
  let summary = await call("read.result_summary", payload);
  if (summary?.code === "RESULT_CONTEXT_MISMATCH") summary = await call("read.result_summary", payload);
  const [subjectResponse, configResponse] = await extras;
  if (!summary?.ok) return { ...summary, hint: "The class read failed. Check the class name, session and term in TURN STATE, then call class_analysis once more with corrected values." };
  if (!subjectResponse?.ok) return subjectResponse;

  const bag = (summary.summary || {}) as { students?: Record<string, unknown>[]; scores?: Record<string, unknown>[] };
  const students = Array.isArray(bag.students) ? bag.students : [];
  const rawScores = Array.isArray(bag.scores) ? bag.scores : [];
  const studentNames = new Map(students.map((student) => [String(student.id), String(student.name || student.admno || "Student")]));
  const subjectNames = new Map<number, string>();
  for (const row of (Array.isArray(subjectResponse.rows) ? subjectResponse.rows : []) as Record<string, unknown>[]) {
    subjectNames.set(Number(row.subject_index), String(row.subject_name || `Subject ${row.subject_index}`));
  }
  const config = ((configResponse?.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
  // The portal's own default grade bands, used until the school customises
  // them, so pass/fail and band counts here match the report cards.
  const gradeScale = sharedGrades?.length
    ? sharedGrades
    : Array.isArray(config?.gradeScale) && config.gradeScale.length
      ? config.gradeScale as Record<string, unknown>[]
      : DEFAULT_GRADE_SCALE;
  // Pass/fail is the portal's own rule and nowhere else: the learner's total
  // out of 100 at or above the pass mark. The mark is taken from the live grade
  // scale, so a school that moves it moves this too, and it is reported back so
  // every answer can state it.
  const passMarks = gradeScale
    .filter((row) => {
      const remark = String(row.r || row.remark || "").toLowerCase();
      return !remark.includes("fail") && String(row.g || row.grade || "").toUpperCase() !== "F9";
    })
    .map((row) => Number(row.min))
    .filter((value) => Number.isFinite(value));
  const passMark = passMarks.length ? Math.min(...passMarks) : 40;
  const didPass = (total: number) => total >= passMark;
  /** The same list, extended past the cut while the score is tied. */
  const withTies = <T extends { percent: number | null }>(list: T[], size: number) => {
    const kept = list.slice(0, size);
    while (kept.length < list.length && Number(list[kept.length].percent) === Number(kept[kept.length - 1]?.percent)) kept.push(list[kept.length]);
    return kept;
  };
  const subjectIndexes = [...subjectNames.keys()].sort((a, b) => a - b);
  for (const row of rawScores) {
    const index = Number(row.subject_index);
    if (!subjectNames.has(index)) subjectNames.set(index, `Subject ${index}`);
  }
  for (const row of rawScores) {
    const index = Number(row.subject_index);
    if (!subjectIndexes.includes(index)) subjectIndexes.push(index);
  }
  subjectIndexes.sort((a, b) => a - b);

  // Narrowing to one subject keeps the whole class in scope, so the
  // denominator is still the class and never a page of it.
  const wantedSubject = String(args.subject || "").trim().toLowerCase();
  let chosenIndexes = subjectIndexes;
  if (wantedSubject) {
    const numeric = Number(wantedSubject);
    chosenIndexes = subjectIndexes.filter((index) => index === numeric || String(subjectNames.get(index) || "").toLowerCase() === wantedSubject || String(subjectNames.get(index) || "").toLowerCase().includes(wantedSubject));
    if (!chosenIndexes.length) {
      return {
        ok: false,
        code: "RESULT_SUBJECT_NOT_FOUND",
        detail: `No subject matches "${String(args.subject)}" in ${classLabel(String(payload.class_key))}.`,
        subjects: subjectIndexes.map((index) => subjectNames.get(index)),
        hint: "Call class_analysis again with one of the subject names above, or leave the subject out for the whole class.",
      };
    }
  }
  const topN = Math.max(1, Math.min(25, Number(args.topN) || 5));
  const missingWanted = args.includeMissing === true;

  // Marks land subject by subject through the term, so a class is normally
  // half recorded. "current" therefore scores each learner on whatever is
  // recorded and compares percentages, instead of treating a blank exam as
  // zero. Naming one part (exam alone, first CA alone) narrows the basis.
  const MAX_MARK: Record<string, number> = { ca1: 10, ca2: 10, ca3: 10, exam: 70 };
  const BASIS: Record<string, { fields: string[]; label: string }> = {
    current: { fields: ["ca1", "ca2", "ca3", "exam"], label: "every recorded mark" },
    all: { fields: ["ca1", "ca2", "ca3", "exam"], label: "every recorded mark" },
    ca: { fields: ["ca1", "ca2", "ca3"], label: "continuous assessment only" },
    test: { fields: ["ca1", "ca2", "ca3"], label: "continuous assessment only" },
    ca1: { fields: ["ca1"], label: "first CA only" },
    ca2: { fields: ["ca2"], label: "second CA only" },
    ca3: { fields: ["ca3"], label: "third CA only" },
    exam: { fields: ["exam"], label: "exam only" },
  };
  const basisKey = String(args.basis || "current").toLowerCase().replace(/[^a-z0-9]/g, "");
  const basis = BASIS[basisKey] || BASIS.current;
  const markOf = (row: Record<string, unknown>, field: string) => {
    const value = row[field];
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const percentOf = (row: Record<string, unknown>) => {
    let scored = 0;
    let possible = 0;
    for (const field of basis.fields) {
      const mark = markOf(row, field);
      if (mark === null) continue;
      scored += mark;
      possible += MAX_MARK[field];
    }
    if (!possible) return null;
    return Math.round(scored * 1000 / possible) / 10;
  };

  /** One learner's row per subject, de-duplicated to the best attempt. */
  const rowsForSubject = (index: number) => {
    const rowsByStudent = new Map<string, Record<string, unknown>>();
    for (const row of rawScores) {
      if (Number(row.subject_index) !== index) continue;
      const studentId = String(row.student_id || "");
      if (!studentId || !studentNames.has(studentId)) continue;
      const previous = rowsByStudent.get(studentId);
      if (!previous || Number(totalOf(row) || -1) > Number(totalOf(previous) || -1)) rowsByStudent.set(studentId, row);
    }
    return [...rowsByStudent.entries()].map(([studentId, row]) => ({
      studentId,
      name: studentNames.get(studentId) || "Student",
      row,
      total: totalOf(row),
      percent: percentOf(row),
      exam: markOf(row, "exam"),
    })).filter((entry) => entry.percent !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const subjects = chosenIndexes.map((index) => {
    const rowsByStudent = new Map<string, Record<string, unknown>>();
    for (const row of rawScores) {
      if (Number(row.subject_index) !== index) continue;
      const studentId = String(row.student_id || "");
      if (!studentId || !studentNames.has(studentId)) continue;
      const previous = rowsByStudent.get(studentId);
      const nextTotal = totalOf(row);
      const previousTotal = previous ? totalOf(previous) : "";
      if (!previous || Number(nextTotal || -1) > Number(previousTotal || -1)) rowsByStudent.set(studentId, row);
    }
    const rows = [...rowsByStudent.entries()].map(([studentId, row]) => ({
      studentId,
      name: studentNames.get(studentId) || "Student",
      row,
      total: totalOf(row),
      percent: percentOf(row),
      exam: markOf(row, "exam"),
    }));
    // A learner counts once any mark on the chosen basis is there.
    const marked = rows.filter((entry) => entry.percent !== null);
    const exams = rows.filter((entry) => entry.exam !== null);
    // A learner passes on the total out of 100, never on the basis percentage.
    const passed = marked.filter((entry) => didPass(Number(entry.total) || 0));
    const ranked = marked.slice().sort((a, b) => Number(b.percent) - Number(a.percent) || a.name.localeCompare(b.name));
    const rankedRow = (entry: typeof ranked[number]) => {
      const marks: Record<string, number | null> = {};
      for (const field of basis.fields) marks[field] = markOf(entry.row, field);
      return {
        name: entry.name,
        percent: Number(entry.percent),
        marks,
        rankedMark: basis.fields.length === 1 ? marks[basis.fields[0]] : null,
        total: entry.total === "" ? null : Number(entry.total),
        totalOutOf100: entry.total === "" ? null : Number(entry.total),
        exam: entry.exam,
        pass: didPass(Number(entry.total) || 0),
      };
    };
    const show = chosenIndexes.length === 1 ? topN : Math.min(topN, 3);
    const leaders = withTies(ranked, show).map(rankedRow);
    const weakest = ranked.slice().reverse().length ? withTies(ranked.slice().reverse(), show).map(rankedRow) : [];
    const missingNames = missingWanted
      ? students.filter((student) => !marked.some((entry) => entry.studentId === String(student.id))).map((student) => String(student.name || "Student")).sort()
      : undefined;
    const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, n) => sum + n, 0) * 10 / values.length) / 10 : null;
    const examValues = exams.map((entry) => Number(entry.exam));
    const percentages = marked.map((entry) => Number(entry.percent));
    return {
      subject: subjectNames.get(index) || `Subject ${index}`,
      index,
      roster: students.length,
      studentsWithAnyMark: marked.length,
      studentsWithExam: exams.length,
      studentsWithoutExam: Math.max(0, students.length - exams.length),
      examMean: average(examValues),
      examLowest: examValues.length ? Math.min(...examValues) : null,
      examHighest: examValues.length ? Math.max(...examValues) : null,
      percentMean: average(percentages),
      percentLowest: percentages.length ? Math.min(...percentages) : null,
      percentHighest: percentages.length ? Math.max(...percentages) : null,
      gradedOnBasis: marked.length,
      passedOnPortalGradeScale: passed.length,
      failedOnPortalGradeScale: marked.length - passed.length,
      passRate: marked.length ? Math.round(passed.length * 1000 / marked.length) / 10 : null,
      // Without an exam mark there is no total that can pass, so those learners
      // sit in the denominator until the exam lands. Say so rather than let the
      // figure look wrong.
      ...(basis.fields.includes("exam") && students.length > exams.length
        ? { passRateNote: `Learners with no exam mark yet count as not passing until it lands — ${students.length - exams.length} of ${students.length} have none.` }
        : {}),
      topByPercent: leaders,
      weakestByPercent: weakest,
      ...(missingNames ? { studentsWithoutMarkOnBasis: missingNames } : {}),
    };
  });

  // A breakdown is the simple view: who scored what, how the class fell into
  // bands, and where the marks were lost. With no subject named it covers every
  // subject in this same call, so the model never has to loop one subject at a
  // time. With one subject named it also returns the full table.
  const breakdownOf = (index: number) => {
    const ranked = rowsForSubject(index).map((entry) => ({
      name: entry.name,
      percent: entry.percent as number,
      marks: basis.fields.map((field) => markOf(entry.row, field)),
    })).sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
    const bandRows = gradeScale.map((row) => ({
      grade: String(row.g || row.grade || ""),
      remark: String(row.r || row.remark || ""),
      min: Number(row.min),
      max: Number(row.max),
      count: 0 as number,
    })).sort((a, b) => b.min - a.min);
    const table: Record<string, unknown>[] = ranked.map((entry, position) => {
      const band = bandRows.find((row) => entry.percent >= row.min && entry.percent <= row.max);
      if (band) band.count += 1;
      const marks: Record<string, number | null> = {};
      basis.fields.forEach((field, fieldIndex) => { marks[field] = entry.marks[fieldIndex]; });
      return { position: position + 1, name: entry.name, percent: entry.percent, grade: band?.grade || "", remark: band?.remark || "", ...marks };
    });
    const componentAverages: Record<string, { mean: number | null; max: number }> = {};
    for (const field of basis.fields) {
      const values = table.map((row) => row[field] as number | null).filter((value): value is number => value !== null);
      componentAverages[field] = { mean: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) * 10 / values.length) / 10 : null, max: MAX_MARK[field] };
    }
    const percentages = table.map((row) => Number(row.percent));
    const side = (rows: Record<string, unknown>[]) => rows.map((row) => ({ name: row.name, percent: row.percent, grade: row.grade }));
    return {
      subject: subjectNames.get(index) || `Subject ${index}`,
      index,
      basisLabel: basis.label,
      roster: students.length,
      gradedOnBasis: table.length,
      percentMean: percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) * 10 / percentages.length) / 10 : null,
      bandsLabel: "Counts per grade band on the portal's own grade scale, highest band first.",
      bands: bandRows,
      componentAverages,
      strongest: side(table.slice(0, 3)),
      weakest: side(table.slice(-3).reverse()),
      table,
    };
  };
  let breakdown: Record<string, unknown> | undefined;
  let breakdowns: Record<string, unknown>[] | undefined;
  if (args.breakdown === true) {
    if (chosenIndexes.length === 1) {
      const built = breakdownOf(chosenIndexes[0]);
      const rows = Number(built.gradedOnBasis) || 0;
      breakdown = {
        ...built,
        printHint: rows <= 30
          ? "Print the bands, then the whole table."
          : "Print the bands, then the top five and bottom five rows of the table, and say the table holds the rest.",
      };
    } else {
      // Every subject at once, but without the long tables.
      breakdowns = chosenIndexes.map((index) => {
        const { table: _table, ...rest } = breakdownOf(index);
        return rest;
      });
    }
  }

  // The whole score sheet in one call, packed so the model can list every
  // learner without reading the class again subject by subject. The roster is
  // sent once and each subject refers to it by position.
  let scoreSheet: Record<string, unknown> | undefined;
  if (args.list === true) {
    const roster = students.map((student) => String(student.name || "Student")).sort((a, b) => a.localeCompare(b));
    const position = new Map(students.map((student) => [String(student.id), roster.indexOf(String(student.name || "Student"))]));
    scoreSheet = {
      class: classLabel(String(payload.class_key)),
      term: payload.term,
      academicSession: payload.academic_session,
      basisLabel: basis.label,
      basisFields: basis.fields,
      maxMarks: MAX_MARK,
      roster,
      subjects: chosenIndexes.map((index) => ({
        subject: subjectNames.get(index) || `Subject ${index}`,
        rows: rowsForSubject(index).map((entry) => {
          const marks: Record<string, number | null> = {};
          for (const field of basis.fields) marks[field] = markOf(entry.row, field);
          return { i: position.get(entry.studentId) ?? -1, ...marks, percent: entry.percent };
        }),
      })),
      note: "rows[i] is roster[i]. A blank mark is null. List every row.",
      debug: { classKey: payload.class_key, term: payload.term, students: students.length, scores: rawScores.length, indexes: chosenIndexes.length },
    };
  }

  // Overall position across every subject analysed, from the same single read.
  // Each learner is averaged on the subjects where they have the chosen marks.
  const perStudent = new Map<string, { name: string; percentSum: number; totalMarks: number; subjects: number; examSubjects: number }>();
  for (const row of rawScores) {
    const studentId = String(row.student_id || "");
    if (!studentId || !studentNames.has(studentId)) continue;
    if (!chosenIndexes.includes(Number(row.subject_index))) continue;
    const percent = percentOf(row);
    if (percent === null) continue;
    const entry = perStudent.get(studentId) || { name: studentNames.get(studentId) || "Student", percentSum: 0, totalMarks: 0, subjects: 0, examSubjects: 0 };
    entry.percentSum += percent;
    entry.totalMarks += Number(totalOf(row)) || 0;
    entry.subjects += 1;
    if (markOf(row, "exam") !== null) entry.examSubjects += 1;
    perStudent.set(studentId, entry);
  }
  const ordered = [...perStudent.values()]
    .filter((entry) => entry.subjects > 0)
    .map((entry) => ({
      name: entry.name,
      averagePercent: Math.round(entry.percentSum * 10 / entry.subjects) / 10,
      totalMarks: entry.totalMarks,
      subjects: entry.subjects,
      subjectsWithExam: entry.examSubjects,
    }))
    .sort((a, b) => b.averagePercent - a.averagePercent || b.totalMarks - a.totalMarks || a.name.localeCompare(b.name));

  const classAveragePercent = ordered.length
    ? Math.round(ordered.reduce((sum, entry) => sum + entry.averagePercent, 0) * 10 / ordered.length) / 10
    : null;
  const expectedExamEntries = students.length * chosenIndexes.length;
  const actualExamEntries = subjects.reduce((sum, subject) => sum + subject.studentsWithExam, 0);
  const gradedCount = subjects.reduce((sum, subject) => sum + subject.gradedOnBasis, 0);
  const passCount = subjects.reduce((sum, subject) => sum + subject.passedOnPortalGradeScale, 0);
  const orderedTied = withTies(ordered.map((entry) => ({ ...entry, percent: entry.averagePercent })), topN);
  const orderedLowest = withTies(ordered.slice().reverse().map((entry) => ({ ...entry, percent: entry.averagePercent })), topN)
    .map(({ percent: _percent, ...rest }) => rest);
  // The rows behind the ranking, so any figure in the answer can be checked.
  let sourceTable: Record<string, unknown>[] | undefined;
  if (args.source === true) {
    const named = new Set(ordered.map((entry) => entry.name));
    const out: Record<string, unknown>[] = [];
    for (const index of chosenIndexes) {
      for (const entry of rowsForSubject(index)) {
        if (!named.has(entry.name)) continue;
        const marks: Record<string, number | null> = {};
        for (const field of basis.fields) marks[field] = markOf(entry.row, field);
        out.push({
          learner: entry.name,
          subject: subjectNames.get(index) || `Subject ${index}`,
          marks,
          percent: entry.percent,
          totalOutOf100: entry.total === "" ? null : Number(entry.total),
          pass: didPass(Number(entry.total) || 0),
        });
      }
    }
    sourceTable = out.slice(0, 400);
  }
  return {
    ok: true,
    source: "results_portal_complete_class_read",
    class: classLabel(String(payload.class_key)),
    classKey: payload.class_key,
    term: payload.term,
    academicSession: payload.academic_session,
    basis: basisKey in BASIS ? basisKey : "current",
    basisLabel: basis.label,
    basisFields: basis.fields,
    maxMarks: MAX_MARK,
    rosterCount: students.length,
    subjectCount: chosenIndexes.length,
    subjectsAnalysed: chosenIndexes.map((index) => subjectNames.get(index)),
    expectedExamEntries,
    recordedExamEntries: actualExamEntries,
    examCoverageRate: expectedExamEntries ? Math.round(actualExamEntries * 1000 / expectedExamEntries) / 10 : null,
    classAveragePercent,
    gradedSubjectEntries: gradedCount,
    totalPassCount: passCount,
    totalFailCount: gradedCount - passCount,
    overallPassRate: gradedCount ? Math.round(passCount * 1000 / gradedCount) / 10 : null,
    overallPassRateNote: `${passCount} of ${gradedCount} graded subject entries passed. That is a share of entries, not of learners; for one subject use its passRate, which is learners.`,
    passMark,
    passRule: `A learner passes when the total out of 100 (CA1 + CA2 + CA3 + exam) is ${passMark} or more, the portal's own pass mark. CA counts up to 30 and the exam up to 70.`,
    passMethod: `Pass/fail is counted on the learner's total out of 100 against the pass mark of ${passMark}, exactly as the portal grades. Each ranked percentage is a share of the maximum for the parts recorded on the chosen basis; the denominator is the learners with a mark on that basis, never the whole roster.`,
    rankingMethod: "Each learner is averaged on their percentage in the subjects analysed, highest first, on the chosen basis. A learner appears once they have a mark on that basis in any subject. Learners level on the same percentage share the position and are all listed.",
    studentsRanked: ordered.length,
    topStudentsOverall: orderedTied.map(({ percent: _percent, ...rest }) => rest),
    bottomStudentsOverall: orderedLowest,
    subjects,
    ...(breakdown ? { breakdown } : {}),
    ...(breakdowns ? { breakdowns, breakdownsHint: "Every subject is here. Name one of them for its full table." } : {}),
    ...(scoreSheet ? { scoreSheet } : {}),
    ...(sourceTable ? { sourceTable, sourceTableHint: "One row per learner and subject: the marks on the basis, the percent, the total out of 100 and pass/fail." } : {}),
  };
}

/** Actions that change a school record and therefore need the proprietor's tap. */
const CONFIRM_RESULT_ACTIONS = new Set([
  "scores.enter",
  "traits.enter",
  "remarks.enter",
  "fees.update",
  "students.upsert",
  "students.archive",
  "settings.app_config.update",
  "settings.provider_key.update",
  "settings.override.set",
  "settings.override.clear",
  "staff.write_access.update",
  "staff.write_access.bulk",
  "agent_keys.create",
  "agent_keys.revoke",
]);

function pendingWrites(name: string, args: Record<string, unknown>) {
  if (name === "results_request") {
    const action = String(args.action || "");
    return CONFIRM_RESULT_ACTIONS.has(action) || action.startsWith("history.context");
  }
  if (name === "registry_request") return args.kind === "write";
  if (name === "attendance_request") { const act = String(args.action || ""); return act !== "" && !/^(read|list|get|status|view)/i.test(act); }
  if (name === "notification_request") { const act = String(args.action || ""); return act !== "" && !/^(read|list|get|status|view)/i.test(act) && /write|send|queue|bulk|import|create|update|delete|save|enable|disable/i.test(act); }
  return false;
}

/** One short, exact sentence of what the tap will change. */
function pendingSummary(name: string, args: Record<string, unknown>, label: { who?: string; where?: string; subject?: string; before?: Record<string, unknown> } = {}) {
  const payload = (args.payload && typeof args.payload === "object" ? args.payload : {}) as Record<string, unknown>;
  if (name === "results_request") {
    const action = String(args.action || "");
    const who = label.who || String(payload.student_id || payload.name || payload.admno || "the record");
    const where = label.where || [payload.class_key, payload.term, payload.subject_index === undefined ? "" : `subject ${payload.subject_index}`].filter(Boolean).join(", ");
    if (action === "scores.enter") {
      const shown = (value: unknown) => (value === null || value === undefined || value === "" ? "blank" : String(value));
      // Each change is written as old → new, so a wrong subject or a wrong
      // learner is obvious before the tap.
      const parts = MARK_FIELDS
        .filter((field) => payload[field] !== undefined)
        .map((field) => `${field === "exam" ? "exam" : field.toUpperCase()} ${shown(label.before?.[field])} → ${shown(payload[field])}`);
      const rest = parts.length < MARK_FIELDS.length ? " The other marks stay as they are." : "";
      return `Save marks for ${who}${where ? ` — ${where}` : ""}${parts.length ? `: ${parts.join(", ")}` : ""}.${rest}`;
    }
    if (action === "traits.enter") return `Save the trait "${payload.trait_name || "trait"}" (${payload.rating ?? "blank"}) for ${who}${where ? ` — ${where}` : ""}.`;
    if (action === "remarks.enter") {
      const text = String(payload.academic ?? payload.remark ?? payload.remarks ?? payload.text ?? "").trim();
      return `Save the remark for ${who}${where ? ` — ${where}` : ""}${text ? `: "${text}"` : ""}.`;
    }
    if (action === "fees.update") return `Change the fee record for ${who}${where ? ` — ${where}` : ""}: total ${payload.total ?? "—"}, paid ${payload.paid ?? "—"}, debt ${payload.debt ?? "—"}.`;
    if (action === "students.upsert") return `Save the student record for ${who}${payload.class_key ? ` in ${payload.class_key}` : ""}.`;
    if (action === "students.archive") return `Archive ${who}${payload.reason ? ` — ${payload.reason}` : ""}. The record can be restored.`;
    if (action === "settings.app_config.update") return "Save the school setting change shown above.";
    return `Apply "${action}" to the Results Portal.`;
  }
  if (name === "registry_request") {
    const target = String(payload.studentId || payload.staffId || payload.name || "the registry record");
    return `Apply Registry change "${String(args.action || "")}" to ${target}.`;
  }
  if (name === "attendance_request") return `Apply attendance change "${String(args.action || "")}" through ${String(args.rpc || "")}.`;
  if (name === "notification_request") return `Run notification action "${String(args.action || "")}".`;
  return "Apply this change.";
}

/**
 * A read replica can trail a write, so a verify read is tried a few times before
 * it is called a miss. The last row seen is returned either way, so a stale
 * record can be described instead of guessed at.
 */
async function verifyRow<T>(read: () => Promise<T | null>, matches: (row: T) => boolean) {
  let last: T | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await read().catch(() => null);
    if (row) {
      last = row;
      if (matches(row)) return { row, matched: true };
    }
    if (attempt < 2) await new Promise((step) => setTimeout(step, 400));
  }
  return { row: last, matched: false };
}

const MARK_FIELDS = ["ca1", "ca2", "ca3", "exam"] as const;

const sameMark = (left: unknown, right: unknown) => (left === null || left === undefined || left === "" ? null : Number(left)) === (right === null || right === undefined || right === "" ? null : Number(right));

/** Read the record back after a write, so "done" is never taken from the preview. */
async function verifyWrite(name: string, args: Record<string, unknown>, current: CurrentSession, result: unknown) {
  const record = (result && typeof result === "object" ? result : {}) as Record<string, unknown>;
  if (record.ok !== true) return record;
  const payload = (args.payload && typeof args.payload === "object" ? args.payload : {}) as Record<string, unknown>;
  try {
    if (name === "results_request" && String(args.action) === "scores.enter") {
      const call = await openResults(current);
      // The sheet read needs the class, term and session in session context first.
      await call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
      const found = await verifyRow(async () => {
        const read = await call("read.scores", {
          class_key: payload.class_key,
          student_id: payload.student_id,
          subject_index: payload.subject_index,
          term: payload.term,
          academic_session: payload.academic_session,
        });
        const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
        return rows.find((item) => String(item.student_id) === String(payload.student_id) && Number(item.subject_index) === Number(payload.subject_index)) || null;
      }, (row) => MARK_FIELDS.every((field) => payload[field] === undefined || sameMark(row[field], payload[field])));
      const row = found.row;
      return { ...record, verify: row ? { read_back: true, matched: found.matched, ca1: row.ca1, ca2: row.ca2, ca3: row.ca3, exam: row.exam } : { read_back: false } };
    }
    if (name === "results_request" && String(args.action) === "fees.update") {
      const call = await openResults(current);
      await call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
      const found = await verifyRow(async () => {
        const read = await call("read.fees", { class_key: payload.class_key, student_id: payload.student_id, term: payload.term, academic_session: payload.academic_session });
        const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
        return rows.find((item) => String(item.student_id) === String(payload.student_id)) || null;
      }, (row) => sameMark(row.total, payload.total) && sameMark(row.paid, payload.paid) && sameMark(row.debt, payload.debt));
      const row = found.row;
      return { ...record, verify: row ? { read_back: true, matched: found.matched, total: row.total, paid: row.paid, debt: row.debt } : { read_back: false } };
    }
    if (name === "results_request" && String(args.action) === "remarks.enter") {
      const call = await openResults(current);
      await call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
      const wanted = String(payload.academic || "").trim();
      const found = await verifyRow(async () => {
        const read = await call("read.remarks", { class_key: payload.class_key, student_id: payload.student_id, term: payload.term, academic_session: payload.academic_session });
        const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
        return rows.find((item) => String(item.student_id) === String(payload.student_id)) || null;
      }, (row) => String(row.academic || "").trim() === wanted);
      const row = found.row;
      return { ...record, verify: row ? { read_back: true, matched: found.matched, academic: row.academic } : { read_back: false } };
    }
    if (name === "results_request" && String(args.action) === "traits.enter") {
      const call = await openResults(current);
      await call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
      const found = await verifyRow(async () => {
        const read = await call("read.traits", { class_key: payload.class_key, student_id: payload.student_id, term: payload.term, academic_session: payload.academic_session });
        const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
        return rows.find((item) => String(item.student_id) === String(payload.student_id) && String(item.trait_name) === String(payload.trait_name)) || null;
      }, (row) => String(row.rating ?? "") === String(payload.rating ?? ""));
      const row = found.row;
      return { ...record, verify: row ? { read_back: true, matched: found.matched, trait_name: row.trait_name, rating: row.rating } : { read_back: false } };
    }
    if (name === "registry_request" && payload.studentId) {
      const read = await registry(current, "read", "student", { studentId: payload.studentId });
      const found = read?.student || read?.record || null;
      return { ...record, verify: found ? { read_back: true, student: found } : { read_back: false } };
    }
  } catch {
    return { ...record, verify: { read_back: false, note: "The change was sent but the read-back failed." } };
  }
  return record;
}

/** Read a person's name and class so the confirmation reads like a person, not an id. */
async function cardLabel(name: string, args: Record<string, unknown>, current: CurrentSession) {
  const payload = (args.payload && typeof args.payload === "object" ? args.payload : {}) as Record<string, unknown>;
  const label: { who?: string; where?: string; subject?: string; before?: Record<string, unknown> } = {};
  if (name === "results_request" && payload.student_id) {
    const read = await registry(current, "read", "student", { studentId: String(payload.student_id) }).catch(() => null);
    const found = (Array.isArray(read?.students) ? read.students[0] : read?.student) as Record<string, unknown> | undefined;
    if (found?.name) label.who = String(found.name);
    const classKey = classKeyOf(found?.class_key || payload.class_key);
    // A marks change is ambiguous by subject alone, so the card names the
    // subject and shows the mark it is replacing.
    if (String(args.action) === "scores.enter" && classKey && payload.subject_index !== undefined) {
      const index = Number(payload.subject_index);
      // The terminal carries no session, so it fills in here before any read;
      // without it the sheet read comes back empty and the card lies about the
      // old mark.
      const scoped = await withAcademicContext(current, { class_key: classKey, term: payload.term, academic_session: payload.academic_session });
      const term = scoped.term;
      const session = scoped.academic_session;
      // One session, one context: the class read and the sheet read share it, so
      // they run in order rather than racing each other. The sheet read gets a
      // retry because the portal can answer before its context lands.
      const call = await openResults(current);
      await call("context.set", { class_key: classKey, academic_session: session, term });
      const subjects = await call("read.subjects", { class_key: classKey }).catch(() => null);
      const subject = (Array.isArray(subjects?.rows) ? subjects.rows as Record<string, unknown>[] : [])
        .find((row) => Number(row.subject_index) === index);
      if (subject?.subject_name) label.subject = String(subject.subject_name);
      const sheet = async () => {
        const read = await call("read.scores", { class_key: classKey, student_id: payload.student_id, subject_index: index, term, academic_session: session });
        const rows = Array.isArray(read?.rows) ? read.rows as Record<string, unknown>[] : [];
        return rows.find((item) => String(item.student_id) === String(payload.student_id) && Number(item.subject_index) === index) || null;
      };
      let row = await sheet().catch(() => null);
      if (!row) row = await sheet().catch(() => null);
      // Still nothing means the sheet read is unhappy, not that the mark is
      // blank. The class summary carries every score, so it settles the value.
      if (!row) {
        const summary = await call("read.result_summary", { class_key: classKey, term, academic_session: session }).catch(() => null);
        const scores = ((summary?.summary || {}) as { scores?: Record<string, unknown>[] }).scores || [];
        row = scores.find((item) => String(item.student_id) === String(payload.student_id) && Number(item.subject_index) === index) || null;
      }
      if (row) label.before = row;
    }
    if (classKey) label.where = [classLabel(classKey), label.subject, payload.term].filter(Boolean).join(", ");
  }
  return label;
}

async function executeTool(name: string, args: Record<string, unknown>, current: CurrentSession, confirmed = false) {
  if (pendingWrites(name, args) && !confirmed) {
    const label = await cardLabel(name, args, current);
    const token = approvalToken(current, { tool: name, args });
    return {
      requires_confirmation: true,
      summary: pendingSummary(name, args, label),
      tool: name,
      args,
      token,
      approval_token: token,
    };
  }
  const result = await runTool(name, args, current);
  return verifyWrite(name, args, current, result);
}

/** Whole-class guardian contact check in one tool call, in parallel behind the scenes. */
async function classGuardians(current: CurrentSession, args: Record<string, unknown>) {
  const classKey = classKeyOf(args.classKey);
  if (!classKey) return { ok: false, code: "REGISTRY_CLASS_REQUIRED", detail: "Name the class.", hint: "Call class_guardians again with one of the class names in TURN STATE." };
  const call = await openRegistry(current);
  const roster = await call("read", "students", { classKey, status: "active" });
  const rows = (Array.isArray(roster?.students) ? roster.students : Array.isArray(roster?.rows) ? roster.rows : []) as Record<string, unknown>[];
  if (!rows.length) return { ok: false, code: "REGISTRY_CLASS_EMPTY", detail: `No active students in ${classLabel(classKey)}.`, hint: "Check the class name; if the class is right, the roster really is empty." };
  const shown = rows.slice(0, 200);
  const withPhone: Record<string, unknown>[] = [];
  const without: Record<string, unknown>[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < shown.length) {
      const person = shown[cursor];
      cursor += 1;
      const guardians = await guardiansFor(call, current, String(person.id)).catch(() => []);
      const phone = guardians
        .map((guardian) => String(guardian.primaryPhone || guardian.whatsappPhone || guardian.phone || guardian.email || ""))
        .find((value) => value.trim());
      if (phone) withPhone.push({ name: String(person.name || ""), admno: String(person.admno || ""), guardianPhone: phone });
      else without.push({ name: String(person.name || ""), admno: String(person.admno || "") });
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, shown.length) }, worker));
  const byName = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.name).localeCompare(String(b.name));
  withPhone.sort(byName);
  without.sort(byName);
  const counted = withPhone.length + without.length;
  return {
    ok: true,
    class: classLabel(classKey),
    rosterCount: rows.length,
    checked: counted,
    withGuardianPhoneCount: withPhone.length,
    withoutGuardianPhoneCount: without.length,
    withoutGuardianPhone: without,
    withGuardianPhone: withPhone,
    ...(rows.length > shown.length ? { note: `Only the first ${shown.length} students were checked.` } : {}),
  };
}

async function runTool(name: string, args: Record<string, unknown>, current: CurrentSession) {
  switch (name) {
    case "school_overview": {
      const [workspace, dashboard] = await Promise.all([
        Promise.resolve(current.context),
        registry(current, "read", "dashboard"),
      ]);
      return slim({ workspace, dashboard });
    }
    case "find_students": return slim(await registry(current, "read", "students", { search: args.search || "", classKey: args.classKey ? classKeyOf(args.classKey) : null, status: "active" }));
    case "class_guardians": return slim(await classGuardians(current, args));
    case "student_record": {
      const call = await openRegistry(current);
      const [record, guardians] = await Promise.all([
        call("read", "student", { studentId: args.studentId }),
        guardiansFor(call, current, String(args.studentId)),
      ]);
      const list = Array.isArray(guardians) ? guardians : [];
      // The Registry keeps no address of its own; a guardian record is the only
      // place one can sit. Saying so stops the model hunting other actions.
      const addressNote = list.length
        ? "The Registry keeps no address on the student; a guardian record is the only place one can sit."
        : "The Registry keeps no address on the student and no guardian is linked, so no address is stored anywhere.";
      return slim({ ...record, guardians, addressNote });
    }
    case "staff_directory": return slim(await registry(current, "read", "staff", { search: args.search || "" }));
    case "class_analysis": return slim(await classAnalysis(current, args));
    case "registry_request": {
      const kind = args.kind === "write" ? "write" : "read";
      const action = String(args.action || "");
      if (!action || action.length > 120) return { ok: false, code: "REGISTRY_ACTION_REQUIRED" };
      const payload = args.payload && typeof args.payload === "object" ? args.payload as Record<string, unknown> : {};
      const made = await registry(current, kind, action, payload);
      // The Registry names actions, not routes. A guess costs a round trip, so a
      // bad name comes back with the real list.
      if (made?.ok !== true && /ACTION_UNKNOWN|ACTION_REQUIRED/.test(String(made?.code || ""))) {
        made.hint = `"${action}" is not a Registry action. Use one of these and call again once: ${kind === "write" ? REGISTRY_WRITE_ACTIONS : REGISTRY_READ_ACTIONS}. Do not walk the list.`;
      }
      return slim(made);
    }
    case "attendance_request": {
      const action = String(args.action || "");
      if (!action || action.length > 120) return { ok: false, code: "ATTENDANCE_ACTION_REQUIRED" };
      const payload = args.payload && typeof args.payload === "object" ? args.payload as Record<string, unknown> : {};
      return slim(await attendanceRequest(current, String(args.rpc || ""), action, payload));
    }
    case "notification_request": {
      const action = String(args.action || "");
      const payload = args.payload && typeof args.payload === "object" ? args.payload as Record<string, unknown> : {};
      return slim(await notificationRequest(current, String(args.rpc || ""), action, payload));
    }
    case "results_read": {
      const resource = String(args.resource || "");
      const payload = await withAcademicContext(current, {
        class_key: args.classKey ? classKeyOf(args.classKey) : undefined,
        student_id: args.studentId,
        subject_index: args.subjectIndex,
        term: args.term,
        academic_session: args.academicSession,
      });
      const call = await openResults(current);
      const contextScoped = ["fees", "published_subjects", "remarks", "result_summary", "scores", "traits"].includes(resource);
      if (contextScoped && payload.class_key && payload.term && payload.academic_session) {
        const set = await call("context.set", { class_key: payload.class_key || null, academic_session: payload.academic_session || null, term: payload.term || null });
        if (!set?.ok) return slim(set);
      }
      const read = await call(`read.${resource}`, payload);
      if (read?.ok === true && resource === "result_summary") {
        read.hint = "This is a raw class read. For pass/fail, coverage, averages or rankings, call class_analysis once instead of reading this again.";
      } else if (read?.ok !== true && !read?.hint) {
        read.hint = contextScoped && !payload.class_key
          ? "This read needs a class. Call it again with classKey."
          : "This read failed. Do not repeat it unchanged; check the class, term or person, or use class_analysis for a whole class.";
      }
      return slim(read);
    }
    case "results_history": {
      const payload = await withAcademicContext(current, {
        class_key: args.classKey ? classKeyOf(args.classKey) : undefined,
        student_id: args.studentId,
        term: args.term,
        academic_session: args.academicSession,
      });
      const call = await openResults(current);
      return slim(await call("history.read", payload));
    }
    case "results_request": {
      const action = String(args.action || "");
      if (!action || action.length > 120) return { ok: false, code: "RESULT_ACTION_REQUIRED" };
      const input = args.payload && typeof args.payload === "object" ? args.payload as Record<string, unknown> : {};
      const payload = { ...input };
      if (payload.class_key) payload.class_key = classKeyOf(payload.class_key);
      // A write carries the same live term and session as a read, so the clerk
      // never has to repeat what the portal already knows.
      if (!action.startsWith("read.") && (payload.class_key || payload.student_id)) {
        Object.assign(payload, await withAcademicContext(current, payload));
      }
      // Everyday field names map onto the portal's own columns.
      if (action === "remarks.enter") {
        const text = payload.academic ?? payload.remark ?? payload.remarks ?? payload.text;
        if (text !== undefined) payload.academic = text;
        delete payload.remark; delete payload.remarks; delete payload.text;
      }
      if (action === "traits.enter") {
        if (payload.trait && payload.trait_name === undefined) payload.trait_name = payload.trait;
        if (payload.value && payload.rating === undefined) payload.rating = payload.value;
        delete payload.trait; delete payload.value;
      }
      const call = await openResults(current);
      if (action.startsWith("read.") && (payload.class_key || payload.term || payload.academic_session)) {
        const scoped = await withAcademicContext(current, payload);
        Object.assign(payload, scoped);
        const set = await call("context.set", { class_key: payload.class_key || null, academic_session: payload.academic_session || null, term: payload.term || null });
        if (!set?.ok) return slim(set);
      }
      // Hand the enriched payload back to the caller, so the read-back that
      // follows uses the same term and session as the write.
      args.payload = payload;
      const answer = await call(action, payload);
      if (answer?.ok !== true && !answer?.hint) {
        const needs: Record<string, string> = {
          "scores.enter": "class_key, student_id, subject_index, term and academic_session, plus ca1, ca2, ca3, exam",
          "traits.enter": "class_key, student_id, trait_name and rating",
          "remarks.enter": "class_key, student_id and the remark text as academic",
          "fees.update": "class_key, student_id and the fee figures",
        };
        answer.hint = needs[action]
          ? `The portal refused "${action}". Send it again with ${needs[action]}.`
          : `The portal refused "${action}". Check the payload fields and call it again.`;
      }
      return slim(answer);
    }
    case "report_card": {
      const made = await reportCard(current, args);
      if (made.ok !== true && !made.hint) {
        made.hint = made.code === "RESULT_STUDENT_AMBIGUOUS"
          ? "Ask which of the named students, then call report_card with the chosen studentId."
          : "Check the pupil name and class, then call report_card once more. Do not read student records to build the card yourself.";
      }
      return slim(made);
    }
    default: return { ok: false, code: "ASSISTANT_TOOL_NOT_FOUND" };
  }
}

type GatewayFailure = { ok: false; status: number; code: string; detail: string };
type CardDoc = { student: string; classKey: string; term: string; session: string; name: string };
type GatewaySuccess = { ok: true; text: string; usage: unknown; approval?: Record<string, unknown>; steps?: string[]; truncated?: boolean; document?: CardDoc };
type ModelSettings = { key: string; url: string; model: string; label: string; effort?: string };

function providerFailure(status: number, detail: string): GatewayFailure {
  const channelMissing = /no available channel|no channel for model|model not available|not available for/i.test(detail);
  const badKey = status === 400 && /api key|invalid key|unauthori[sz]ed|authentication/i.test(detail);
  const code = channelMissing
    ? "ASSISTANT_MODEL_UNAVAILABLE"
    : status === 401 || status === 403 || badKey
      ? "ASSISTANT_MODEL_KEY_REJECTED"
      : status === 404
        ? "ASSISTANT_MODEL_NOT_FOUND"
        : status === 429
          ? "ASSISTANT_MODEL_RATE_LIMITED"
          : status === 503
            ? "ASSISTANT_MODEL_BUSY"
            : "ASSISTANT_MODEL_REQUEST_FAILED";
  return { ok: false, status, code, detail: detail.slice(0, 400) };
}

/** The models list lives beside the chat endpoint, so the same key can be checked. */
function modelListUrl(chatUrl: string) {
  return `${chatUrl.replace(/\/(chat\/completions|responses)$/, "")}/models`;
}

async function listModels(settings: ModelSettings): Promise<Response> {
  if (!settings.key) return Response.json({ ok: false, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED" }, { headers: noStoreHeaders() });
  try {
    const response = await fetch(modelListUrl(settings.url), {
      signal: AbortSignal.timeout(25000),
      headers: { Authorization: `Bearer ${settings.key}` },
      cache: "no-store",
    });
    const text = await response.text();
    let payload: Record<string, unknown> | null = null;
    try { payload = JSON.parse(text) as Record<string, unknown>; } catch { payload = null; }
    if (!response.ok || !payload) {
      const provider = payload?.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : null;
      const detail = String(provider?.message || payload?.message || text || `Provider replied ${response.status}`).trim();
      return Response.json(providerFailure(response.status, detail), { status: 200, headers: noStoreHeaders() });
    }
    const rows = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];
    const models = rows
      .map((row) => ({
        id: String(row.id || ""),
        kinds: Array.isArray(row.supported_endpoint_types) ? row.supported_endpoint_types.map(String) : [],
      }))
      .filter((row) => row.id && (!row.kinds.length || row.kinds.includes("openai")))
      .map((row) => row.id);
    return Response.json({ ok: true, models }, { headers: noStoreHeaders() });
  } catch {
    return Response.json({ ok: false, code: "ASSISTANT_MODEL_UNREACHABLE", detail: "The provider could not be reached from the school server." }, { status: 200, headers: noStoreHeaders() });
  }
}

type ToolCall = { id: string; name: string; args: string };
type Style = "chat" | "responses";
type HistoryItem =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; text: string; calls: ToolCall[] }
  | { role: "tool"; callId: string; content: string };
type Turn = { text: string; calls: ToolCall[]; usage: unknown };

function chatBody(history: HistoryItem[], noTools = false) {
  return {
    messages: history.map((item) => {
      if (item.role === "assistant") {
        return {
          role: "assistant",
          content: item.text || null,
          ...(item.calls.length ? { tool_calls: item.calls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.args } })) } : {}),
        };
      }
      if (item.role === "tool") return { role: "tool", tool_call_id: item.callId, content: item.content };
      return { role: item.role, content: item.content };
    }),
    ...(noTools ? {} : { tools, tool_choice: "auto" }),
  };
}

function responsesBody(history: HistoryItem[], noTools = false) {
  const input: Record<string, unknown>[] = [];
  for (const item of history) {
    if (item.role === "assistant") {
      if (item.text) input.push({ role: "assistant", content: item.text });
      for (const call of item.calls) input.push({ type: "function_call", call_id: call.id, name: call.name, arguments: call.args });
    } else if (item.role === "tool") {
      input.push({ type: "function_call_output", call_id: item.callId, output: item.content });
    } else {
      input.push({ role: item.role, content: item.content });
    }
  }
  return {
    input,
    ...(noTools ? {} : {
      tools: tools.map((tool) => ({ type: "function", name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters })),
      tool_choice: "auto",
    }),
    stream: false,
    store: false,
  };
}

function readTurn(style: Style, payload: Record<string, unknown>): Turn {
  if (style === "chat") {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const message = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>).message as Record<string, unknown> : null;
    const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    return {
      text: typeof message?.content === "string" ? message.content : "",
      calls: calls.map((call) => {
        const item = call as Record<string, unknown>;
        const fn = item.function as Record<string, unknown>;
        return { id: String(item.id || ""), name: String(fn?.name || ""), args: String(fn?.arguments || "{}") };
      }),
      usage: payload.usage || null,
    };
  }
  const output = Array.isArray(payload.output) ? payload.output as Record<string, unknown>[] : [];
  let text = typeof payload.output_text === "string" ? payload.output_text : "";
  const calls: ToolCall[] = [];
  for (const item of output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content as Record<string, unknown>[]) {
        if (part.type === "output_text" && typeof part.text === "string") text += part.text;
      }
    }
    if (item.type === "function_call") {
      calls.push({ id: String(item.call_id || item.id || ""), name: String(item.name || ""), args: String(item.arguments || "{}") });
    }
  }
  return { text, calls, usage: payload.usage || null };
}

async function askProvider(url: string, settings: ModelSettings, style: Style, history: HistoryItem[], budgetMs = 60000, noTools = false, retriedEffort = false) {
  const body = style === "responses" ? responsesBody(history, noTools) : chatBody(history, noTools);
  const tuned = settings.effort
    ? { ...body, ...(style === "responses" ? { reasoning: { effort: settings.effort } } : { reasoning_effort: settings.effort }) }
    : body;
  let response: Response;
  try {
    // A provider that is briefly busy usually answers on the next try, so
    // retry 429/5xx twice before reporting a failure.
    for (let attempt = 0; ; attempt += 1) {
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.key}`, "Content-Type": "application/json", "User-Agent": "opencode/1.18.0" },
        body: JSON.stringify({ model: settings.model, temperature: 0.2, ...tuned }),
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(6000, budgetMs)),
      });
      const transient = response.status === 429 || response.status === 503 || response.status === 500 || response.status === 502 || response.status === 504;
      if (!transient || attempt >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 900 : 2200));
    }
  } catch (caught) {
    const timedOut = caught instanceof Error && (caught.name === "TimeoutError" || caught.name === "AbortError");
    return { failure: { ok: false, status: timedOut ? 504 : 502, code: timedOut ? "ASSISTANT_MODEL_TIMEOUT" : "ASSISTANT_MODEL_UNREACHABLE", detail: timedOut ? "The provider did not answer in time." : "The provider could not be reached from the school server." } as GatewayFailure };
  }
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = JSON.parse(text) as Record<string, unknown>; } catch { payload = null; }
  if (!response.ok || !payload) {
    // Some providers wrap the error in a one-item array, e.g. Google.
    const record = Array.isArray(payload) ? payload[0] as Record<string, unknown> | undefined : payload;
    const provider = record?.error && typeof record.error === "object" ? record.error as Record<string, unknown> : null;
    const detail = String(provider?.message || record?.message || text || `Provider replied ${response.status}`).trim();
    if (response.status === 400 && settings.effort && !retriedEffort && /effort|reasoning|unknown|unexpected|unsupported/i.test(detail)) {
      return askProvider(url, { ...settings, effort: "" }, style, history, budgetMs, noTools, true);
    }
    return { failure: providerFailure(response.status, detail) };
  }
  const turn = readTurn(style, payload);
  if (!turn.text && !turn.calls.length) {
    return { failure: { ok: false, status: 502, code: "ASSISTANT_MODEL_INVALID_RESPONSE", detail: "The provider returned no message." } as GatewayFailure };
  }
  return { turn };
}

const MAX_TOOL_CALLS = 14;

const REGISTRY_READ_ACTIONS = "students, student, guardians, staff, staff_self, registrations, catalog, allocations, calendar, prefect, portfolio, portal_access, dashboard";
const REGISTRY_WRITE_ACTIONS = "students.update, student.update, guardian.upsert, students.restore, allocations.class.set, allocations.subject.set, allocations.class.end, portal.access.set, registration.approve, calendar.transition, prefect.select, profile.signature.update";
const TOOL_RESULT_CAP = 6000;

/** Same default bands the Results Portal ships with, kept in step with it. */
const DEFAULT_GRADE_SCALE: Record<string, unknown>[] = [
  { min: 75, max: 100, g: "A1", r: "Excellent" },
  { min: 70, max: 74, g: "B2", r: "Very Good" },
  { min: 65, max: 69, g: "B3", r: "Good" },
  { min: 60, max: 64, g: "C4", r: "Credit" },
  { min: 55, max: 59, g: "C5", r: "Credit" },
  { min: 50, max: 54, g: "C6", r: "Credit" },
  { min: 45, max: 49, g: "D7", r: "Pass" },
  { min: 40, max: 44, g: "E8", r: "Pass" },
  { min: 0, max: 39, g: "F9", r: "Fail" },
];

/** Labels let a turn close with a sentence even when the model cannot be called again. */
const DONE_LABELS: Record<string, string> = {
  school_overview: "Read the school overview",
  find_students: "Found the students",
  class_guardians: "Checked the guardian contacts",
  student_record: "Read the student record",
  staff_directory: "Read the staff directory",
  class_analysis: "Analysed the class",
  results_read: "Read the result records",
  results_history: "Read the earlier results",
  results_request: "Used the Results Portal",
  registry_request: "Used the Central Registry",
  attendance_request: "Used the Attendance System",
  notification_request: "Used the Notifications System",
  report_card: "Prepared the report card",
};

function capText(value: string, limit = TOOL_RESULT_CAP) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n… [shortened; ${value.length - limit} more characters in this result]`;
}

async function gateway(messages: unknown[], settings: ModelSettings, current: CurrentSession, budgetMs: number, classes: { key: string; label: string }[]): Promise<GatewaySuccess | GatewayFailure> {
  if (!settings.key) return { ok: false, status: 503, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED", detail: "No model API key is saved for this account." };
  let url = settings.url;
  let style: Style = /\/responses$/.test(url) ? "responses" : "chat";
  const history: HistoryItem[] = [{ role: "system", content: systemPrompt(current, classes) }];
  for (const message of messages) {
    const item = message as Record<string, unknown>;
    if (typeof item.content !== "string") continue;
    if (item.role === "assistant") history.push({ role: "assistant", text: item.content, calls: [] });
    else if (item.role === "user") history.push({ role: "user", content: item.content });
  }
  const used: string[] = [];
  const facts: string[] = [];
  /** Details of the last report card built, so the client can open it on the portal itself. */
  let doc: CardDoc | null = null;
  const seen = new Map<string, string>();
  /** Last whole score sheet returned, so a timed-out list can still be printed. */
  let sheet: Record<string, unknown> | null = null;
  /** Last whole-school comparison, printed rather than dumped as raw facts. */
  let compare: Record<string, unknown> | null = null;
  let retriedStyle = false;
  const started = Date.now();
  const totalBudget = Math.max(8000, budgetMs);
  current.deadline = started + totalBudget;
  let partial = "";
  let ranOut = false;
  let failures = 0;
  while (true) {
    const left = totalBudget - (Date.now() - started);
    // A tool round needs real room; below this a closing answer is worth more.
    if (left < 11000) { ranOut = true; break; }
    let answer = await askProvider(url, settings, style, history, Math.min(60000, left));
    if (answer.failure && style === "chat" && !retriedStyle && /responses/i.test(answer.failure.detail)) {
      retriedStyle = true;
      style = "responses";
      url = url.replace(/\/chat\/completions$/, "/responses");
      answer = await askProvider(url, settings, style, history, Math.min(60000, left));
    }
    if (answer.failure) {
      if ((answer.failure.code === "ASSISTANT_MODEL_TIMEOUT" || answer.failure.code === "ASSISTANT_MODEL_BUSY" || answer.failure.code === "ASSISTANT_MODEL_RATE_LIMITED") && (partial || used.length)) { ranOut = true; break; }
      return answer.failure;
    }
    const turn = answer.turn as Turn;
    if (!turn.calls.length) return { ok: true, text: turn.text || "I could not produce a response.", usage: turn.usage, steps: used, document: doc || undefined };
    if (turn.text) partial = turn.text;
    history.push({ role: "assistant", text: turn.text, calls: turn.calls });
    for (const call of turn.calls) {
      if (used.length >= MAX_TOOL_CALLS) { ranOut = true; break; }
      used.push(call.name);
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.args || "{}"); } catch { args = {}; }
      const key = `${call.name}:${JSON.stringify(args)}`;
      const cached = seen.get(key);
      if (cached) { history.push({ role: "tool", callId: call.id, content: cached }); continue; }
      current.progress?.(progressText(call.name, args));
      let result: unknown;
      try {
        result = await executeTool(call.name, args, current);
      } catch (caught) {
        result = { ok: false, code: "SCHOOL_SYSTEM_UNAVAILABLE", detail: (caught as Error)?.message || "The connected school system did not return a response.", hint: "Nothing was changed. Say plainly which system did not answer and what is still missing." };
      }
      if ((result as Record<string, unknown>).ok === false) failures += 1;
      if ((result as Record<string, unknown>).ok === false && !(result as Record<string, unknown>).hint) {
        (result as Record<string, unknown>).hint = "This call failed. Do not repeat it with the same arguments: use another tool or tell the proprietor plainly what could not be read.";
      } else if (/\[\]/.test(JSON.stringify(result)) && JSON.stringify(result).length < 400) {
        (result as Record<string, unknown>).hint = "Nothing came back for this. Change the arguments or use another tool rather than repeating it.";
      }
      if (call.name === "report_card" && (result as Record<string, unknown>).ok === true) {
        const made = result as Record<string, unknown>;
        const person = (made.student || {}) as Record<string, unknown>;
        doc = {
          student: String(person.id || ""),
          classKey: String(person.class_key || args.classKey || ""),
          term: String(made.term || ""),
          session: String(made.academic_session || ""),
          name: String(person.name || ""),
        };
      }
      if ((result as Record<string, unknown>).requires_confirmation === true) {
        return { ok: true, text: (result as Record<string, unknown>).summary as string, usage: null, approval: result as Record<string, unknown>, steps: used };
      }
      if ((result as Record<string, unknown>).ok === true) {
        const made = result as Record<string, unknown>;
        if (call.name === "class_analysis" && made.mode !== "school_compare") {
          const line = `${made.class}: ${made.rosterCount} students, ${made.overallPassRate ?? "no"}% overall pass on ${made.gradedSubjectEntries} graded entries, exam coverage ${made.examCoverageRate ?? "unknown"}%`;
          if (!facts.includes(line)) facts.push(line);
          if (made.scoreSheet) sheet = made.scoreSheet as Record<string, unknown>;
          if (made.mode === "school_compare") compare = made;
        }
        else if (call.name === "class_guardians") facts.push(`${made.class}: ${made.withoutGuardianPhoneCount} of ${made.checked} students with no guardian phone`);
        else if (call.name === "find_students") {
          const rows = Array.isArray(made.students) ? made.students : Array.isArray(made.rows) ? made.rows : [];
          if (rows.length) facts.push(`${rows.length} students found`);
        } else if (call.name === "report_card" && made.student) facts.push(`report card built for ${String((made.student as Record<string, unknown>).name || "")}`);
      }
      // A whole-class breakdown is one result with every subject in it, so it
      // gets more room than an ordinary read before the safety cap.
      const content = capText(JSON.stringify(slim(result)), call.name === "class_analysis" ? (args.list === true ? 60000 : 24000) : TOOL_RESULT_CAP);
      seen.set(key, content);
      history.push({ role: "tool", callId: call.id, content });
    }
    if (ranOut) break;
    if (Date.now() - started > totalBudget) { ranOut = true; break; }
  }
  // A clean run that simply used the time says nothing extra; the model already
  // answered. Only a failed part needs the plain sentence.
  const note = failures
    ? "\n\nA connected system did not answer, so a part of this may be missing."
    : "";
  if (ranOut || !partial.trim()) {
    const closingLeft = totalBudget - (Date.now() - started);
    if (closingLeft >= 4000) {
      const closing = await askProvider(
        url,
        settings,
        style,
        [...history, { role: "user", content: "Use only the completed tool results above. Give the best complete answer you can now, cite the exact tool numbers, clearly say if any requested part is still missing, and do not ask the proprietor to continue the same request." }],
        Math.min(14000, closingLeft),
        true,
      );
      if (!closing.failure && closing.turn && (closing.turn as Turn).text) {
        return { ok: true, text: `${(closing.turn as Turn).text}${note}`, usage: null, steps: used, truncated: true, document: doc || undefined };
      }
    }
  }
  const labels = [...new Set(used)].map((name) => DONE_LABELS[name]).filter(Boolean);
  const printed = sheet ? scoreSheetText(sheet) : compare ? compareText(compare) : "";
  const fallback = printed
    ? `${printed}\n\nThat is every row in the records. Name one subject if you want it on its own.`
    : facts.length
    ? `Here is where it stands: ${facts.join("; ")}.${note}`
    : labels.length
      ? `${labels.join(", ")}.${partial.trim() ? `\n\n${partial.trim()}` : ""}${note}`
      : `The connected school systems did not finish this request.${note}`;
  return { ok: true, text: fallback, usage: null, steps: used, truncated: true, document: doc || undefined };
}

/** A short, plain note about the work in hand, for the live wait line. */
function progressText(name: string, args: Record<string, unknown>) {
  const classKey = classKeyOf(args.classKey);
  const subject = typeof args.subject === "string" ? args.subject.trim() : "";
  if (name === "class_analysis") {
    if (!classKey) return "Reading every class";
    return `Reading ${classLabel(classKey)}${subject ? ` ${subject}` : ""}`;
  }
  if (name === "find_students") return "Finding the learners";
  if (name === "class_guardians") return "Checking the guardian phones";
  if (name === "staff_directory") return "Reading the staff list";
  if (name === "student_record" || name === "results_read" || name === "results_history") return "Reading the record";
  if (name === "report_card") return "Building the report card";
  if (name === "school_overview") return "Reading the school overview";
  const action = String(args.action || "");
  if (name === "results_request" && action) return action.endsWith(".enter") || action.endsWith(".update") ? "Saving the change" : "Reading the results portal";
  if (name === "registry_request") return args.kind === "write" ? "Saving the record" : "Reading the registry";
  if (name === "attendance_request") return "Reading the attendance register";
  if (name === "notification_request") return "Reading the notifications";
  return "Checking the school records";
}

/** Print a whole-school comparison as a short ranked answer. */
function compareText(compare: Record<string, unknown>) {
  const ranked = Array.isArray(compare.ranked) ? compare.ranked as Record<string, unknown>[] : [];
  const top = (compare.mostCompetitive || {}) as Record<string, unknown>;
  const low = (compare.leastCompetitive || {}) as Record<string, unknown>;
  const line = (row: Record<string, unknown>) => `${row.class}: ${row.averagePercent}% average, ${row.passRate}% pass on ${String(row.subjects)} subjects`;
  const parts = [
    `${String(top.class)} is the strongest class right now — ${line(top).replace(`${String(top.class)}: `, "")}.`,
    `The weakest is ${line(low)}.`,
    "",
    "In order:",
    ...ranked.map((row) => `- ${line(row)}`),
    "",
    `That is every class compared on the marks on record (${String(compare.basis || "current")}).`,
  ];
  return parts.join("\n");
}

/** Print a returned score sheet as plain tables, for when the model runs out of time. */
function scoreSheetText(sheet: Record<string, unknown>) {
  const roster = Array.isArray(sheet.roster) ? sheet.roster as string[] : [];
  const basisFields = Array.isArray(sheet.basisFields) ? sheet.basisFields as string[] : ["ca1", "ca2", "ca3", "exam"];
  const maxMarks = (sheet.maxMarks || {}) as Record<string, number>;
  const subjects = Array.isArray(sheet.subjects) ? sheet.subjects as Record<string, unknown>[] : [];
  const head = basisFields.map((field) => `${field.toUpperCase()} /${maxMarks[field] ?? ""}`);
  const parts = [`${sheet.class}, ${sheet.term}, ${sheet.academicSession} — all ${roster.length} learners, every score on record (${sheet.basisLabel}).`];
  for (const subject of subjects) {
    const rows = Array.isArray(subject.rows) ? subject.rows as Record<string, unknown>[] : [];
    parts.push(`\n**${subject.subject}** — ${rows.length} scored\n\n| # | Learner | ${head.join(" | ")} | % |\n|---|---|${basisFields.map(() => "---").join("|")}|---|`);
    for (const row of rows) {
      const marks = basisFields.map((field) => (row[field] === null || row[field] === undefined ? "–" : String(row[field])));
      parts.push(`| ${Number(row.i) + 1} | ${roster[Number(row.i)] || "—"} | ${marks.join(" | ")} | ${row.percent} |`);
    }
  }
  return parts.join("\n");
}

async function testConnection(settings: ModelSettings): Promise<Response> {
  if (!settings.key) return Response.json({ ok: false, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED" }, { status: 400, headers: noStoreHeaders() });
  const history: HistoryItem[] = [{ role: "user", content: "Reply with the single word: ready" }];
  let url = settings.url;
  let style: Style = /\/responses$/.test(url) ? "responses" : "chat";
  const started = Date.now();
  let answer = await askProvider(url, settings, style, history);
  if (answer.failure && style === "chat" && /responses/i.test(answer.failure.detail)) {
    style = "responses";
    url = url.replace(/\/chat\/completions$/, "/responses");
    answer = await askProvider(url, settings, style, history);
  }
  const ms = Date.now() - started;
  if (answer.failure) return Response.json({ ok: false, code: answer.failure.code, detail: answer.failure.detail, ms }, { status: 200, headers: noStoreHeaders() });
  return Response.json({ ok: true, ms, reply: String((answer.turn as Turn).text || "").trim().slice(0, 80), style }, { headers: noStoreHeaders() });
}

async function approve(token: string, current: CurrentSession, reason = "") {
  const proposal = readApproval(current, token);
  const tool = String(proposal.tool || "");
  const args = (proposal.args && typeof proposal.args === "object" ? proposal.args : {}) as Record<string, unknown>;
  if (!tool) throw new IdentityApiError("ASSISTANT_TOOL_NOT_FOUND", 403);
  const summary = pendingSummary(tool, args, await cardLabel(tool, args, current));
  // The reason travels with the write, so the portal's audit row keeps it.
  const payload = (args.payload && typeof args.payload === "object" ? args.payload : {}) as Record<string, unknown>;
  const saved = reason.trim()
    ? { ...args, payload: { ...payload, reason: reason.trim().slice(0, 140) } }
    : args;
  const result = await executeTool(tool, saved, current, true) as Record<string, unknown>;
  if (result.requires_confirmation === true) throw new IdentityApiError("APPROVAL_INVALID", 400);
  // Say whether the record itself now shows the change.
  const verify = (result.verify || {}) as Record<string, unknown>;
  let note = "";
  const blank = (value: unknown) => (value === null || value === undefined || value === "" ? "blank" : String(value));
  const seen = verify.ca1 !== undefined ? ` It now reads CA1 ${blank(verify.ca1)}, CA2 ${blank(verify.ca2)}, CA3 ${blank(verify.ca3)}, exam ${blank(verify.exam)}.`
    : verify.academic !== undefined ? ` It now reads "${String(verify.academic ?? "")}".`
    : verify.rating !== undefined ? ` It now reads ${String(verify.rating ?? "blank")}.`
    : "";
  if (result.ok === true) {
    if (verify.read_back === true && verify.matched !== false) note = ` Read back from the record.${seen}`;
    else if (verify.read_back === true) note = ` The record still shows an older value.${seen} Reload the sheet before relying on it.`;
    else if (verify.read_back === false) note = " The save was sent but the read-back does not show it yet; check the record before relying on it.";
  }
  const said = reason.trim() ? ` Reason: ${reason.trim()}.` : "";
  return { summary: `${summary}${note}${said}`, tool, result, reason: reason.trim() };
}

class CardProblem extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** The report card page the assistant opens itself, in the portal's own design. */
async function cardDocument(current: CurrentSession, request: NextRequest) {
  const params = request.nextUrl.searchParams;
  current.deadline = Date.now() + 48000;
  const studentId = String(params.get("card") || "");
  const classKey = String(params.get("class") || "");
  const payload = await withAcademicContext(current, {
    class_key: classKey || null,
    term: params.get("term") || null,
    academic_session: params.get("session") || null,
  });
  if (!payload.class_key || !payload.term || !payload.academic_session) throw new CardProblem("RESULT_ACADEMIC_CONTEXT_REQUIRED", "A class, term and session are needed before a card can be built.");
  const call = await openResults(current);
  const contextReady = call("context.set", { class_key: payload.class_key, academic_session: payload.academic_session, term: payload.term });
  // Several reads at once can be shed by the database, so each gets one retry.
  const attempt = async (name: string, body: Record<string, unknown>) => {
    let got = await call(name, body);
    if (!got?.ok) got = await call(name, body);
    return got;
  };

  // The summary already carries the class roster, so no extra roster read first.
  const summary = await attempt("read.result_summary", payload);
  if (!summary.ok) throw new CardProblem(String(summary.code || "RESULT_SUMMARY_FAILED"), String(summary.detail || "The results portal did not return the class scores."));
  const bag = (summary.summary || {}) as { students?: Record<string, unknown>[]; scores?: Record<string, unknown>[] };
  let students = bag.students || [];
  if (!students.length) {
    const roster = await call("read.students", payload);
    students = (Array.isArray(roster?.rows) ? roster.rows : []) as Record<string, unknown>[];
  }

  // The link may carry the id, the admission number, or the name.
  const lower = studentId.toLowerCase();
  const student = students.find((row) => String(row.id) === studentId)
    || students.find((row) => String(row.admno || "").toLowerCase() === lower)
    || students.find((row) => String(row.name || "").toLowerCase() === lower)
    || students.find((row) => String(row.name || "").toLowerCase().includes(lower));
  if (!student) throw new CardProblem("RESULT_STUDENT_NOT_IN_CLASS", "The student is not in that class for this term.");
  const scoped = { ...payload, student_id: String(student.id) };

  const [subjectsCall, traitsCall, remarksCall, feesCall, settings] = await Promise.all([
    attempt("read.subjects", { class_key: payload.class_key }),
    attempt("read.traits", scoped),
    attempt("read.remarks", scoped),
    attempt("read.fees", scoped),
    attempt("settings.read", {}),
  ]);
  await contextReady;
  const config = ((settings?.settings || {}) as Record<string, unknown>).app_config as Record<string, unknown> | undefined;
  const classStudents = students;

  const names = new Map<number, string>();
  for (const row of (Array.isArray(subjectsCall?.rows) ? subjectsCall.rows : []) as Record<string, unknown>[]) {
    names.set(Number(row.subject_index), String(row.subject_name || ""));
  }
  const scores = (bag.scores || []) as Record<string, unknown>[];
  const own = new Map<number, Record<string, unknown>>();
  for (const row of scores) if (String(row.student_id) === String(student.id)) own.set(Number(row.subject_index), row);

  // Class figures, straight from the same term's score sheet.
  const classTotals = new Map<number, number[]>();
  const studentGrand = new Map<string, number[]>();
  for (const row of scores) {
    const total = totalOf(row);
    if (total === "") continue;
    const index = Number(row.subject_index);
    classTotals.set(index, [...(classTotals.get(index) || []), total]);
    const owner = String(row.student_id);
    studentGrand.set(owner, [...(studentGrand.get(owner) || []), total]);
  }
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const averages = [...studentGrand.values()].map((list) => round1(list.reduce((a, b) => a + b, 0) / list.length));

  // Every subject with a mark, published or not.
  const indexes = [...own.keys()].filter((index) => totalOf(own.get(index) as Record<string, unknown>) !== "")
    .sort((a, b) => a - b);
  const rows = indexes.map((index) => {
    const row = own.get(index) as Record<string, unknown>;
    const mine = totalOf(row);
    const list = classTotals.get(index) || [];
    return {
      index,
      name: names.get(index) || `Subject ${index}`,
      ca1: row.ca1, ca2: row.ca2, ca3: row.ca3, exam: row.exam,
      total: mine,
      grade: gradeOf(mine),
      classAvg: list.length ? round1(list.reduce((a, b) => a + b, 0) / list.length) : "" as const,
      highest: list.length ? Math.max(...list) : "" as const,
    };
  });
  const grand = rows.reduce((sum, row) => sum + (row.total === "" ? 0 : row.total), 0);
  const studentAvg = rows.length ? round1(grand / rows.length) : "";
  const schools = (config?.school || {}) as Record<string, string>;
  const deptMap = (config?.depts || {}) as Record<string, { label?: string }>;
  const sections: Record<string, boolean> = {};
  for (const key of CARD_SECTIONS) sections[key] = true;
  Object.assign(sections, (config?.sections || {}) as Record<string, boolean>);
  const remarkRows = (Array.isArray(remarksCall?.rows) ? remarksCall.rows : []) as Record<string, unknown>[];
  const remark = remarkRows[0] || {};
  const traitRows = (Array.isArray(traitsCall?.rows) ? traitsCall.rows : []) as Record<string, unknown>[];
  const affective: Record<string, string> = {};
  const psychomotor: Record<string, string> = {};
  for (const row of traitRows) {
    const target = String(row.trait_type || "").toLowerCase().startsWith("psych") ? psychomotor : affective;
    if (row.trait_name) target[String(row.trait_name)] = String(row.rating ?? "");
  }
  const feeRows = (Array.isArray(feesCall?.rows) ? feesCall.rows : []) as Record<string, unknown>[];
  const sessionCfg = (config?.sessionCfg || {}) as Record<string, unknown>;
  const resumeValue = sessionCfg.showResumption === false ? "" : feeRows[0]?.resume_date || feeRows[0]?.resume || sessionCfg.resumption;
  const passed = rows.filter((row) => row.total !== "" && Number(row.total) >= 40).length;
  const rawForm = (config?.cardForm || {}) as Record<string, unknown>;
  const form = {
    ca: Number(rawForm.ca) === 1 ? 1 : 3,
    classAvg: rawForm.classAvg !== false,
    highest: rawForm.highest !== false,
    remark: rawForm.remark !== false,
  };

  const data: CardData = {
    student,
    classKey: String(payload.class_key),
    dept: deptMap[String(payload.class_key)]?.label || classLabel(String(payload.class_key)),
    term: String(payload.term),
    session: String(payload.academic_session),
    school: {
      name: schools.name || "WAY TO SUCCESS STANDARD SCHOOLS",
      addr: schools.addr || "Ifedapo Community, Oko/Ijado Road, Ejigbo, Osun State, Nigeria",
      phone: schools.phone || "07036521734",
      email: schools.email || "sambour12@gmail.com",
    },
    sections,
    form,
    signature: (config?.signature || {}) as Record<string, string>,
    rows,
    count: classStudents.length,
    studentAvg,
    classAvg: averages.length ? round1(averages.reduce((a, b) => a + b, 0) / averages.length) : "",
    lowestAvg: averages.length ? Math.min(...averages) : "",
    highestAvg: averages.length ? Math.max(...averages) : "",
    grand: grand || "",
    passed: rows.length ? passed : "",
    affective,
    psychomotor,
    attendance: { opened: remark.days_opened || "", present: remark.days_present || "", absent: Number(remark.days_opened) ? Number(remark.days_opened) - Number(remark.days_present || 0) : "" },
    remark: autoRemark(studentAvg, config?.remarks),
    resume: dateText(resumeValue),
    fees: (feeRows[0] || {}) as Record<string, unknown>,
    logo: "/images/wts-logo.png",
  };

  const who = String(student.name || "student").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const stem = `report-card-${who}-${String(payload.term || "").replace(/[^a-z0-9]+/gi, "")}`;

  // A real PDF saves straight to a phone's downloads and prints without a dialog.
  if (params.get("format") === "pdf") {
    const pdf = await cardPdf({ ...data, logo: `${request.nextUrl.origin}/images/wts-logo.png` });
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...noStoreHeaders(),
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${stem}.pdf"`,
      },
    });
  }

  const html = cardPage(data, { autoPrint: params.get("print") === "1" });
  if (params.get("download") === "1") {
    return new Response(html, { headers: { ...noStoreHeaders(), "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${stem}.html"` } });
  }
  return new Response(html, { headers: { ...noStoreHeaders(), "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest) {
  try {
    if (!sameOriginOrMissing(request)) return error("ORIGIN_NOT_ALLOWED", 403);
    const current = await currentSession(request);
    if (request.nextUrl.searchParams.get("card")) {
      try {
        return await cardDocument(current, request);
      } catch (caught) {
        const failure = caught instanceof CardProblem ? caught : null;
        return new Response(cardErrorPage(failure?.message || "The results portal did not answer. Check that the class, term and session are right.", failure?.code || ""), {
          status: 200,
          headers: { ...noStoreHeaders(), "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
    const jobId = request.nextUrl.searchParams.get("job");
    if (jobId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
        return error("ASSISTANT_JOB_INVALID", 400);
      }
      const read = await callPrivilegedRpc<Record<string, unknown>>("school_assistant_job_read", {
        p_session_id: current.id,
        p_session_secret: current.secret,
        p_job_id: jobId,
      });
      // A killed function can leave a job marked running forever; close it out
      // so the app never spins on a dead turn.
      if (read?.ok === true && read.status === "running") {
        const touched = Date.parse(String(read.updated_at || ""));
        if (Number.isFinite(touched) && Date.now() - touched > 70000) {
          const stale = {
            ok: true,
            model: "",
            text: "The turn took longer than the hosting limit and was stopped before it could finish. Nothing partial was saved. Send the request again, or ask for a smaller part of it.",
            steps: [],
            truncated: true,
            usage: null,
          };
          await callPrivilegedRpc("school_assistant_job_upsert", {
            p_session_id: current.id,
            p_session_secret: current.secret,
            p_job_id: jobId,
            p_status: "error",
            p_result: stale,
          }).catch(() => null);
          return Response.json({ ...read, status: "done", result: stale }, { headers: noStoreHeaders() });
        }
      }
      return Response.json(read, { headers: noStoreHeaders() });
    }
    const person = current.context.person && typeof current.context.person === "object" ? current.context.person as Record<string, unknown> : {};
    const usage = await readUsage(current);
    return Response.json({
      usage,
      ok: true,
      configured: Boolean(DEEPSEEK_KEY || GATEWAY_KEY),
      results_url: portalOrigins.results,
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

/**
 * A plain "print the card for <name> in <class>" is answered without the model,
 * so the card comes back in seconds instead of after a model round trip.
 */
function cardAsk(text: string): { classKey: string; label: string; search: string } | null {
  if (!/\b(report\s*card|result\s*card|print\s+(the\s+)?card|card)\b/i.test(text)) return null;
  const adm = text.match(/\bWTS[\/ ]?STU[\/ ]?(\d{3,7})\b/i);
  const cls = text.match(/\b(creche|kg\s*1|kg1|kg\s*2|kg2|nursery\s*[12]|primary\s*[1-6]|pry\s*[1-6]|basic\s*[1-6]|jss\s*[1-3][a-z]?|ss\s*[1-3][a-z]?(?:\s*(?:science|arts|commercial|general))?)\b/i);
  if (!cls && !adm) return null;
  const after = text.match(/\b(?:for|of)\s+([a-z][a-z'.\- ]{2,60}?)(?=\s+(?:in|from|at|of)\b|[,.;?]|$)/i);
  let search = adm ? `WTS/STU/${adm[1]}` : after ? after[1] : "";
  if (!search) {
    search = text
      .replace(cls ? cls[0] : "$&", " ")
      .replace(/\b(report|result|print|the|a|card|cards|please|kindly|for|of|in|my|term|session)\b/gi, " ")
      .replace(/\b\d(st|nd|rd|th)\b/gi, " ")
      .replace(/[0-9]{4}\/[0-9]{4}/g, " ")
      .replace(/[^a-z' .\-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  search = search.replace(/\s+/g, " ").trim();
  if (search.length < 3) return null;
  return { classKey: cls ? cls[0] : "", label: cls ? cls[0].replace(/\s+/g, " ").toUpperCase() : "", search };
}

/**
 * "Give me every score in JSS 1" is a whole score sheet, which the assistant
 * can print itself in one read. Only the no-subject form is taken here; a named
 * subject keeps the model, because the subject has to be matched first.
 */
function sheetAsk(text: string): { classKey: string } | null {
  if (!/\b(list|all|every|whole|full|entire)\b/i.test(text)) return null;
  if (!/\b(scores?|marks?|results?|sheet|records?|recorded)\b/i.test(text)) return null;
  const cls = text.match(/\b(creche|kg\s*1|kg1|kg\s*2|kg2|nursery\s*[12]|primary\s*[1-6]|pry\s*[1-6]|basic\s*[1-6]|jss\s*[1-3][a-z]?|ss\s*[1-3][a-z]?(?:\s*(?:science|arts|commercial|general))?)\b/i);
  if (!cls) return null;
  const rest = text
    .replace(cls[0], " ")
    .replace(/\b(list|all|every|whole|full|entire|scores?|marks?|results?|sheet|records?|recorded|students?|pupils?|subjects?|of|for|me|please|give|show|their|the|in|a|an|and|current|now)\b/gi, " ")
    .replace(/[^a-z' .\-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (rest.length > 3) return null; // a subject name is in there
  return { classKey: classKeyOf(cls[0]) };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    if (!sameOriginOrMissing(request)) return error("ORIGIN_NOT_ALLOWED", 403);
    const current = await currentSession(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return error("ASSISTANT_REQUEST_INVALID");
    if (typeof body.approval_token === "string" && body.approval_token) {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 140) : "";
      const completed = await approve(body.approval_token, current, reason);
      return Response.json({ ok: true, completed }, { headers: noStoreHeaders() });
    }

    const isAdmin = authorityIsAdmin(current.context);
    // A test turn is the developer checking the assistant. It never moves the
    // proprietor's balance, whether the flag comes from the app or a header.
    const isTestRun = body.test === true || request.headers.get("x-assistant-test") === "1";

    if (body.action === "usage") {
      const saved = await saveUsage(current, body.usage);
      return Response.json(saved, { headers: noStoreHeaders() });
    }

    if (body.action === "card_config") {
      return Response.json(await saveCardConfig(current, body), { headers: noStoreHeaders() });
    }

    const suppliedKey = typeof body.provider_key === "string" ? body.provider_key.trim() : "";
    const suppliedUrl = readProviderUrl(body.provider_url);
    const suppliedModel = typeof body.model === "string" ? body.model.trim().replace(/^models\//, "") : "";
    if ((suppliedKey || suppliedUrl) && !isAdmin) throw new IdentityApiError("ASSISTANT_ADMIN_REQUIRED", 403);
    if (suppliedKey && suppliedKey.length > 500) throw new IdentityApiError("ASSISTANT_PROVIDER_KEY_INVALID", 400);
    if (suppliedModel && suppliedModel.length > 120) throw new IdentityApiError("ASSISTANT_MODEL_NOT_AVAILABLE", 400);

    const effort = ["low", "medium", "high"].includes(String(body.effort || "")) ? String(body.effort) : "";
    // The school's own key only fits the school's own provider host.
    const anotherHost = Boolean(suppliedUrl) && hostOfUrl(suppliedUrl) !== hostOfUrl(PROVIDER_URL);
    const settings: ModelSettings = {
      key: suppliedKey || (anotherHost ? "" : DEEPSEEK_KEY || GATEWAY_KEY),
      url: suppliedUrl || PROVIDER_URL,
      model: suppliedModel || DEFAULT_MODEL,
      label: suppliedModel || DEFAULT_MODEL,
      effort,
    };

    if (body.action === "test") {
      if (!isAdmin) throw new IdentityApiError("ASSISTANT_ADMIN_REQUIRED", 403);
      return testConnection(settings);
    }

    if (body.action === "models") {
      if (!isAdmin) throw new IdentityApiError("ASSISTANT_ADMIN_REQUIRED", 403);
      return listModels(settings);
    }

    const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message && typeof message === "object").slice(-20) : [];
    if (!messages.length) return error("ASSISTANT_MESSAGE_REQUIRED");

    const lastUser = [...messages].reverse().find((message) => (message as Record<string, unknown>).role === "user");
    const said = lastUser && typeof (lastUser as Record<string, unknown>).content === "string"
      ? String((lastUser as Record<string, unknown>).content)
      : "";
    const ask = said ? cardAsk(said) : null;
    const sheetAskHere = said ? sheetAsk(said) : null;

    const runTurn = async (): Promise<Record<string, unknown>> => {
      const requestStarted = Date.now();
      const elapsed = requestStarted - startedAt;
      const budgetMs = Math.min(50000, Math.max(9000, 50000 - elapsed));
      current.deadline = requestStarted + budgetMs;
      let fastError = "";
      if (sheetAskHere && !ask) {
        try {
          const made = await classAnalysis(current, { classKey: sheetAskHere.classKey, list: true }) as Record<string, unknown>;
          if (made.ok === true && made.scoreSheet && Number((made.rosterCount as number) || 0) > 0) {
            return {
              ok: true,
              model: settings.model,
              text: `${scoreSheetText(made.scoreSheet as Record<string, unknown>)}\n\nThat is every row in the records. Name one subject if you want it on its own.`,
              usage: null,
              steps: ["class_analysis"],
            };
          }
          fastError = `${String(made.code || "")}: ${String(made.detail || "")}`;
        } catch (caught) { fastError = (caught as Error)?.message || String(caught); }
      }
      if (ask) {
        try {
          let made = await reportCard(current, { classKey: ask.classKey, search: ask.search });
          // The portal can read before its own context lands; one retry settles it.
          if (made.ok !== true && made.code === "RESULT_CONTEXT_MISMATCH") made = await reportCard(current, { classKey: ask.classKey, search: ask.search });
          if (made.ok === true) {
            const person = (made.student || {}) as Record<string, unknown>;
            const blank = !((made.rows || []) as Record<string, unknown>[]).some((row) => Number(row.exam) > 0);
            const where = ask.label || String(person.class_key || "").replace(/-/g, " ").toUpperCase();
            const text = `${person.name} — ${where}, ${made.term} ${made.academic_session}. Total ${made.total}${blank ? ", CA only since exam marks are still blank" : ""}. The card is ready: tap Save report card.`;
            return {
              ok: true,
              model: settings.model,
              text,
              usage: null,
              steps: ["report_card"],
              document: { student: String(person.id || ""), classKey: String(person.class_key || ask.classKey), term: String(made.term || ""), session: String(made.academic_session || ""), name: String(person.name || "") },
            };
          } else { fastError = `${made.code}: ${made.detail || ""}`; }
        } catch (caught) { fastError = (caught as Error)?.message || String(caught); }
      }

      if (elapsed < 12000) await liveAcademic(current).catch(() => null);
      const classes = elapsed < 12000 ? await classCatalog(current) : [];
      const result = await gateway(messages, settings, current, budgetMs, classes);
      if (!result.ok) {
        return { ok: false, code: result.code, detail: result.detail, model: settings.model };
      }
      return { ok: true, model: settings.model, text: result.text, usage: result.usage, approval: result.approval, steps: result.steps, document: result.document, fast_error: fastError || undefined };
    };

    if (body.async === true) {
      if (!ask && !settings.key) {
        return Response.json({ ok: false, code: "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED", detail: "No model API key is saved for this account.", model: settings.model }, { status: 200, headers: noStoreHeaders() });
      }
      const jobId = randomUUID();
      const created = await callPrivilegedRpc<Record<string, unknown>>("school_assistant_job_upsert", {
        p_session_id: current.id,
        p_session_secret: current.secret,
        p_job_id: jobId,
        p_status: "running",
        p_result: null,
      });
      if (!created?.ok) {
        return Response.json({ ok: false, code: String(created?.code || "ASSISTANT_JOB_CREATE_FAILED") }, { status: 200, headers: noStoreHeaders() });
      }
      // The wait line names what is being read, at most one write a second.
      let lastProgress = "";
      let lastProgressAt = 0;
      current.progress = (text) => {
        if (!text || text === lastProgress || Date.now() - lastProgressAt < 1000) return;
        lastProgress = text;
        lastProgressAt = Date.now();
        void callPrivilegedRpc("school_assistant_job_progress", {
          p_session_id: current.id,
          p_session_secret: current.secret,
          p_job_id: jobId,
          p_progress: text,
        }).catch(() => null);
      };
      after(async () => {
        try {
          const payload = await runTurn();
          if (!isAdmin && !isTestRun && payload.ok === true) {
            const charged = await chargeUsage(current);
            if (charged) payload.usage = charged;
          }
          await callPrivilegedRpc("school_assistant_job_upsert", {
            p_session_id: current.id,
            p_session_secret: current.secret,
            p_job_id: jobId,
            p_status: payload.ok ? "done" : "error",
            p_result: payload,
          });
        } catch {
          await callPrivilegedRpc("school_assistant_job_upsert", {
            p_session_id: current.id,
            p_session_secret: current.secret,
            p_job_id: jobId,
            p_status: "error",
            p_result: { ok: false, code: "ASSISTANT_REQUEST_FAILED", detail: "The request stopped unexpectedly.", model: settings.model },
          }).catch(() => {});
        }
      });
      return Response.json({ ok: true, job_id: jobId, status: "running" }, { headers: noStoreHeaders() });
    }

    const answer = await runTurn();
    if (!isAdmin && !isTestRun && answer.ok === true) {
      const charged = await chargeUsage(current);
      if (charged) answer.usage = charged;
    }
    return Response.json(answer, { headers: noStoreHeaders() });
  } catch (caught) {
    return resultErrorResponse(caught);
  }
}
