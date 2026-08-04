import { NextRequest } from "next/server";
import {
  callPrivilegedRpc,
  IdentityApiError,
  isSameOrigin,
  noStoreHeaders,
  resultErrorResponse,
  textField,
} from "../identity/_lib";
import { clearWorkspaceSessionCookie, workspaceSessionCookie, workspaceSessionFromRequest } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOriginOrMissing(request: NextRequest) {
  return !request.headers.get("origin") || isSameOrigin(request);
}

function response(payload: Record<string, unknown>, status = 200, cookie?: string) {
  const headers = new Headers(noStoreHeaders());
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json(payload, { status, headers });
}

export async function GET(request: NextRequest) {
  try {
    if (!sameOriginOrMissing(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const current = workspaceSessionFromRequest(request);
    if (!current) return response({ ok: false, code: "STAFF_SESSION_REQUIRED" }, 401, clearWorkspaceSessionCookie());
    const result = await callPrivilegedRpc<Record<string, unknown>>("school_identity_session_context_api", {
      p_session_id: current.id,
      p_session_secret: current.secret,
      p_target_app_code: "staff_self_service",
    });
    if (!result?.ok) return response(result, 401, clearWorkspaceSessionCookie());
    return response(result);
  } catch (error) {
    return resultErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOriginOrMissing(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object") throw new IdentityApiError("INVALID_REQUEST", 400);

    if (body.action === "logout") {
      const current = workspaceSessionFromRequest(request);
      if (current) {
        await callPrivilegedRpc("school_identity_session_revoke", {
          p_session_id: current.id,
          p_session_secret: current.secret,
          p_reason: "SCHOOL_WORKSPACE_LOGOUT",
        });
      }
      return response({ ok: true, code: "IDENTITY_SESSION_REVOKED" }, 200, clearWorkspaceSessionCookie());
    }

    if (body.action === "change_password") {
      const login = textField(body.login, 160);
      const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
      const newPassword = typeof body.new_password === "string" ? body.new_password : "";
      if (!login || !currentPassword || !newPassword || newPassword.length > 512) throw new IdentityApiError("PASSWORD_CHANGE_INPUT_REQUIRED", 400);
      const result = await callPrivilegedRpc<Record<string, unknown>>("school_identity_change_password", {
        p_login: login,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });
      if (!result?.ok) return response(result, 400, clearWorkspaceSessionCookie());
      return response({ ok: true, code: result.code || "PASSWORD_CHANGED" }, 200, clearWorkspaceSessionCookie());
    }

    if (body.action !== "login") throw new IdentityApiError("WORKSPACE_SESSION_ACTION_REQUIRED", 400);
    const login = textField(body.login, 160);
    const password = typeof body.password === "string" ? body.password : "";
    if (!login || !password || password.length > 512) throw new IdentityApiError("LOGIN_AND_PASSWORD_REQUIRED", 400);

    const authentication = await callPrivilegedRpc<Record<string, unknown>>("school_identity_portal_login", {
      p_login: login,
      p_password: password,
      p_app_code: "staff_self_service",
    });
    if (!authentication?.ok) return response(authentication, 401, clearWorkspaceSessionCookie());
    if (authentication.must_change_password) {
      return response({ ok: true, code: authentication.code || "PASSWORD_CHANGE_REQUIRED", must_change_password: true });
    }

    const clientCode = typeof authentication.client_code === "string" ? authentication.client_code : "";
    const clientSecret = typeof authentication.client_secret === "string" ? authentication.client_secret : "";
    if (!clientCode || !clientSecret) return response({ ok: false, code: "STAFF_SESSION_SERVICE_UNAVAILABLE" }, 503, clearWorkspaceSessionCookie());
    const issued = await callPrivilegedRpc<Record<string, unknown>>("school_identity_session_issue_api", {
      p_client_code: clientCode,
      p_client_secret: clientSecret,
      p_originating_app_code: "staff_self_service",
      p_target_app_code: "staff_self_service",
    });
    if (!issued?.ok || typeof issued.session_id !== "string" || typeof issued.session_secret !== "string") {
      return response(issued || { ok: false, code: "STAFF_SESSION_NOT_ACTIVE" }, 401, clearWorkspaceSessionCookie());
    }
    return response({
      ok: true,
      code: issued.code,
      expires_at: issued.expires_at,
      person_id: issued.person_id,
      identity_account_id: issued.identity_account_id,
      access_role: issued.access_role,
      permissions: issued.permissions || [],
    }, 200, workspaceSessionCookie(issued.session_id, issued.session_secret));
  } catch (error) {
    return resultErrorResponse(error);
  }
}
