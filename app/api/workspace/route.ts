import { NextRequest } from "next/server";
import { callPrivilegedRpc, IdentityApiError, isSameOrigin, noStoreHeaders, resultErrorResponse } from "../identity/_lib";
import { clearWorkspaceSessionCookie, workspaceSessionFromRequest } from "../workspace-session/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isSameOrigin(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const current = workspaceSessionFromRequest(request);
    if (!current) return Response.json({ ok: false, code: "STAFF_SESSION_REQUIRED" }, { status: 401, headers: { ...noStoreHeaders(), "Set-Cookie": clearWorkspaceSessionCookie() } });
    const result = await callPrivilegedRpc<Record<string, unknown>>("school_staff_workspace_read_session_api", {
      p_session_id: current.id,
      p_session_secret: current.secret,
    });
    if (!result?.ok) return Response.json(result, { status: 401, headers: { ...noStoreHeaders(), "Set-Cookie": clearWorkspaceSessionCookie() } });
    return Response.json(result, { headers: noStoreHeaders() });
  } catch (error) {
    return resultErrorResponse(error);
  }
}
