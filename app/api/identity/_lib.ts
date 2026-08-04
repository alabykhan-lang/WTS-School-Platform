import { timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wuftzyeajmsxdrbwaawl.supabase.co";
const SUPABASE_KEY = process.env.WTS_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnR6eWVham1zeGRyYndhYXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjczNTgsImV4cCI6MjA4OTQ0MzM1OH0.QUeDRP1IpHCjvecqAOEZAqmMalEFlCLXylZP5D5iLog";

export class IdentityApiError extends Error {
  status: number;
  code: string;

  constructor(code: string, status = 400) {
    super(code);
    this.name = "IdentityApiError";
    this.code = code;
    this.status = status;
  }
}

function serviceKey() {
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
    throw new IdentityApiError("IDENTITY_SERVICE_UNAVAILABLE", 503);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new IdentityApiError("IDENTITY_SERVICE_UNAVAILABLE", 503);
  return payload as T;
}

export function resultErrorResponse(error: unknown) {
  if (error instanceof IdentityApiError) {
    return Response.json({ ok: false, code: error.code }, { status: error.status, headers: noStoreHeaders() });
  }
  return Response.json({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }, { status: 503, headers: noStoreHeaders() });
}
