import { NextRequest } from "next/server";
import {
  callPrivilegedRpc,
  IdentityApiError,
  isSameOrigin,
  noStoreHeaders,
  resultErrorResponse,
  sessionFromBody,
  textField,
} from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const body = await request.json().catch(() => ({}));
    const session = sessionFromBody(body);
    const staffId = textField(body.staff_id, 80);
    const reason = textField(body.reason, 500);
    if (!isUuid(staffId)) throw new IdentityApiError("INVALID_STAFF_ID", 400);
    if (reason.length < 8) throw new IdentityApiError("RESET_REASON_REQUIRED", 400);

    const result = await callPrivilegedRpc<{
      ok: boolean;
      code?: string;
      login_name?: string;
      temporary_password?: string;
      must_change_password?: boolean;
      request_id?: string;
    }>("school_identity_issue_temporary_password", {
      p_client_code: session.clientCode,
      p_client_secret: session.clientSecret,
      p_staff_id: staffId,
      p_reason: reason,
    });

    if (!result?.ok) {
      throw new IdentityApiError(result?.code || "ADMIN_AUTH_OR_PERMISSION_FAILED", 403);
    }
    return Response.json(
      {
        ok: true,
        code: result.code,
        login_name: result.login_name,
        temporary_password: result.temporary_password,
        must_change_password: result.must_change_password,
        request_id: result.request_id,
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return resultErrorResponse(error);
  }
}
