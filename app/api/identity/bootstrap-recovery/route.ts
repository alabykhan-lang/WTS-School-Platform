import { NextRequest } from "next/server";
import {
  callPrivilegedRpc,
  constantTimeEqual,
  IdentityApiError,
  isSameOrigin,
  noStoreHeaders,
  resultErrorResponse,
  textField,
} from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOTSTRAP_STAFF_NUMBER = "WTS/STF/000008";
const BOOTSTRAP_EMAIL = "alabykhan@gmail.com";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const configuredSecret = process.env.WTS_IDENTITY_BOOTSTRAP_SECRET;
    const suppliedSecret = request.headers.get("x-wts-bootstrap-secret") || "";
    if (!configuredSecret || !constantTimeEqual(configuredSecret, suppliedSecret)) {
      throw new IdentityApiError("BOOTSTRAP_NOT_AVAILABLE", 404);
    }

    const body = await request.json().catch(() => ({}));
    const reason = textField(body.reason, 500);
    if (reason.length < 8) throw new IdentityApiError("RESET_REASON_REQUIRED", 400);

    const result = await callPrivilegedRpc<{
      ok: boolean;
      code?: string;
      login_name?: string;
      temporary_password?: string;
      must_change_password?: boolean;
      request_id?: string;
    }>("school_identity_bootstrap_reset", {
      p_staff_number: BOOTSTRAP_STAFF_NUMBER,
      p_login_email: BOOTSTRAP_EMAIL,
      p_reason: reason,
    });

    if (!result?.ok) throw new IdentityApiError(result?.code || "BOOTSTRAP_RECOVERY_FAILED", 403);
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
