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
    const summary = await callPrivilegedRpc<Record<string, unknown>>("school_staff_workspace_read_summary_api", {
      p_session_id: current.id,
      p_session_secret: current.secret,
    });
    if (!summary?.ok) {
      const summaryCode = typeof summary?.code === "string" ? summary.code : "";
      const sessionFailure = summaryCode === "RESULT_SESSION_REQUIRED" || summaryCode === "STAFF_SESSION_REQUIRED" || summaryCode === "STAFF_SESSION_NOT_ACTIVE";
      return Response.json(summary, {
        status: sessionFailure ? 401 : 503,
        headers: { ...noStoreHeaders(), ...(sessionFailure ? { "Set-Cookie": clearWorkspaceSessionCookie() } : {}) },
      });
    }
    return Response.json({ ...result, summary: summary.summary ?? null }, { headers: noStoreHeaders() });
  } catch (error) {
    return resultErrorResponse(error);
  }
}
