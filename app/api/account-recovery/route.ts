import { NextRequest } from "next/server";
import { portalOrigins } from "../../../data/portal-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: NO_STORE });
}

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const action = textValue((input as Record<string, unknown>).action, 32).toLowerCase();
  let payload: Record<string, unknown>;

  if (action === "request") {
    const purpose = (input as Record<string, unknown>).purpose === "activation" ? "activation" : "password_reset";
    const login = textValue((input as Record<string, unknown>).login, 254);
    if (!login) return json({ ok: false, code: "RECOVERY_LOGIN_REQUIRED" }, 400);
    if (purpose === "password_reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) {
      return json({ ok: false, code: "RECOVERY_EMAIL_REQUIRED" }, 400);
    }
    payload = { action: "request", purpose, login };
  } else if (action === "complete") {
    const token = textValue((input as Record<string, unknown>).token, 512);
    const passwordValue = (input as Record<string, unknown>).password;
    const confirmPasswordValue = (input as Record<string, unknown>).confirmPassword;
    const password: string = typeof passwordValue === "string" ? passwordValue : "";
    const confirmPassword: string = typeof confirmPasswordValue === "string" ? confirmPasswordValue : "";
    if (!token || !password || password !== confirmPassword || password.length > 512) {
      return json({ ok: false, code: "PASSWORD_CONFIRMATION_REQUIRED" }, 400);
    }
    payload = { action: "complete", token, password, confirmPassword };
  } else {
    return json({ ok: false, code: "RECOVERY_ACTION_REQUIRED" }, 400);
  }

  try {
    const response = await fetch(new URL("/api/account-recovery", portalOrigins.centralRegistry + "/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ ok: false, code: "RECOVERY_SERVICE_INVALID_RESPONSE" }));
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return json({ ok: false, code: "RECOVERY_SERVICE_INVALID_RESPONSE" }, 502);
    }
    return json(result as Record<string, unknown>, response.status);
  } catch {
    return json({ ok: false, code: "RECOVERY_SERVICE_UNAVAILABLE" }, 502);
  }
}
