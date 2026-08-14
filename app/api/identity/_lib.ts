import { randomUUID, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.WTS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wuftzyeajmsxdrbwaawl.supabase.co";
const SUPABASE_KEY = process.env.WTS_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Compatibility fallback for the existing production deployment. Replace
  // this with WTS_SUPABASE_PUBLISHABLE_KEY in Vercel before rotating it.
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnR6eWVham1zeGRyYndhYXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjczNTgsImV4cCI6MjA4OTQ0MzM1OH0.QUeDRP1IpHCjvecqAOEZAqmMalEFlCLXylZP5D5iLog";

export class IdentityApiError extends Error {
  status: number;
  code: string;

  referenceId: string;

  constructor(code: string, status = 400, referenceId = randomUUID()) {
    super(code);
    this.name = "IdentityApiError";
    this.code = code;
    this.status = status;
    this.referenceId = referenceId;
  }
}

function serviceKey() {
  if (!SUPABASE_KEY) throw new IdentityApiError("IDENTITY_SERVICE_UNAVAILABLE", 503);
  return SUPABASE_KEY;
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Referrer-Policy": "no-referrer",
  };
}

export function textField(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function rpcFailureCategory(status: number, payload: unknown) {
  const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const upstreamCode = typeof value.code === "string" ? value.code : "";
  if (upstreamCode === "23514" || upstreamCode.startsWith("23")) return "database_constraint";
  if (upstreamCode.startsWith("42") || upstreamCode.startsWith("PGRST")) return "database_contract";
  if (status === 401 || status === 403) return "configuration_or_permission";
  return "database_or_rpc";
}

export async function callPrivilegedRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const key = serviceKey();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    const referenceId = randomUUID();
    console.error(JSON.stringify({
      event: "identity_rpc_failure",
      referenceId,
      rpc: name,
      category: "network_or_configuration",
    }));
    throw new IdentityApiError("IDENTITY_SERVICE_UNAVAILABLE", 503, referenceId);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const referenceId = randomUUID();
    console.error(JSON.stringify({
      event: "identity_rpc_failure",
      referenceId,
      rpc: name,
      category: rpcFailureCategory(response.status, payload),
      upstreamStatus: response.status,
      upstreamCode: typeof value.code === "string" ? value.code : undefined,
      upstreamMessage: typeof value.message === "string" ? value.message : undefined,
      upstreamHint: typeof value.hint === "string" ? value.hint : undefined,
    }));
    throw new IdentityApiError("IDENTITY_SERVICE_UNAVAILABLE", 503, referenceId);
  }
  return payload as T;
}

export function resultErrorResponse(error: unknown) {
  if (error instanceof IdentityApiError) {
    return Response.json(
      { ok: false, code: error.code, reference_id: error.referenceId },
      { status: error.status, headers: noStoreHeaders() },
    );
  }
  const referenceId = randomUUID();
  console.error(JSON.stringify({
    event: "identity_api_unexpected_failure",
    referenceId,
    category: "unexpected_server_error",
  }));
  return Response.json(
    { ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE", reference_id: referenceId },
    { status: 503, headers: noStoreHeaders() },
  );
}
