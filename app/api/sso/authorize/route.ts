import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import {
  callPrivilegedRpc,
  IdentityApiError,
  isSameOrigin,
  noStoreHeaders,
  resultErrorResponse,
} from "../../identity/_lib";
import { workspaceSessionFromRequest } from "../../workspace-session/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPROVED_CLIENTS = {
  result_portal: {
    clientId: "result_portal",
    target: "results",
    redirectUri: "https://wts-result-system.vercel.app/portal_core.html",
  },
  attendance: {
    clientId: "attendance",
    target: "attendance",
    redirectUri: "https://wts-attendance-system.vercel.app/",
  },
} as const;

function redirectResponse(location: string) {
  const headers = new Headers(noStoreHeaders());
  headers.set("Location", location);
  return new Response(null, { status: 302, headers });
}

function errorResponse(code: string, status = 400) {
  return Response.json({ ok: false, code }, { status, headers: noStoreHeaders() });
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isBase64Url(value: string, min: number, max: number) {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length >= min && value.length <= max;
}

function loginRedirect(request: NextRequest) {
  const url = new URL(request.url);
  const returnTo = `${url.pathname}${url.search}`;
  const signIn = new URL("/portal/sign-in", url.origin);
  signIn.searchParams.set("return_to", returnTo);
  return redirectResponse(signIn.toString());
}

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isSameOrigin(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);

    const requestUrl = new URL(request.url);
    const responseType = requestUrl.searchParams.get("response_type") || "";
    const clientId = requestUrl.searchParams.get("client_id") || "";
    const redirectUri = requestUrl.searchParams.get("redirect_uri") || "";
    const scope = requestUrl.searchParams.get("scope") || "";
    const codeChallenge = requestUrl.searchParams.get("code_challenge") || "";
    const codeChallengeMethod = requestUrl.searchParams.get("code_challenge_method") || "";
    const state = requestUrl.searchParams.get("state") || "";
    const nonce = requestUrl.searchParams.get("nonce") || "";

    const client = APPROVED_CLIENTS[clientId as keyof typeof APPROVED_CLIENTS];
    if (
      responseType !== "code"
      || !client
      || redirectUri !== client.redirectUri
      || scope !== client.target
      || codeChallengeMethod !== "S256"
      || !isBase64Url(codeChallenge, 43, 128)
      || !isBase64Url(state, 16, 512)
      || !isBase64Url(nonce, 16, 512)
    ) {
      return errorResponse("SSO_REQUEST_INVALID", 400);
    }

    const current = workspaceSessionFromRequest(request);
    if (!current) return loginRedirect(request);

    const authorizationCode = randomBytes(32).toString("base64url");
    const issued = await callPrivilegedRpc<Record<string, unknown>>(
      "school_sso_authorization_code_issue",
      {
        p_session_id: current.id,
        p_session_secret: current.secret,
        p_client_id: client.clientId,
        p_target_app_code: client.target,
        p_redirect_uri: client.redirectUri,
        p_code_hash: sha256Hex(authorizationCode),
        p_code_challenge: codeChallenge,
        p_code_challenge_method: "S256",
        p_state_hash: sha256Hex(state),
        p_nonce_hash: sha256Hex(nonce),
      },
    );

    if (!issued?.ok) {
      const fallbackCode = client.target === "attendance" ? "ATTENDANCE_ACCESS_NOT_GRANTED" : "RESULT_ACCESS_NOT_GRANTED";
      const code = typeof issued?.code === "string" ? issued.code : fallbackCode;
      const denied = code === "RESULT_ACCESS_NOT_GRANTED" || code === "ATTENDANCE_ACCESS_NOT_GRANTED";
      const status = denied ? 403 : code === "WTS_SESSION_NOT_ACTIVE" ? 401 : 400;
      if (status === 401) return loginRedirect(request);
      return errorResponse(code, status);
    }

    const callback = new URL(client.redirectUri);
    callback.searchParams.set("code", authorizationCode);
    callback.searchParams.set("state", state);
    callback.searchParams.set("nonce", nonce);
    return redirectResponse(callback.toString());
  } catch (error) {
    return resultErrorResponse(error);
  }
}
