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

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) throw new IdentityApiError("ORIGIN_NOT_ALLOWED", 403);
    const body = await request.json().catch(() => ({}));
    const session = sessionFromBody(body);
    const result = await callPrivilegedRpc<{
      ok: boolean;
      code?: string;
      accounts?: Array<Record<string, unknown>>;
    }>("school_identity_admin_read_api", {
      p_client_code: session.clientCode,
      p_client_secret: session.clientSecret,
      p_action: "staffAccounts",
      p_payload: { search: textField(body.search, 120) },
    });

    if (!result?.ok) {
      throw new IdentityApiError(result?.code || "ADMIN_AUTH_OR_PERMISSION_FAILED", 403);
    }
    const accounts = (Array.isArray(result.accounts) ? result.accounts : []).map((account) => ({
      staff_id: account.staff_id,
      full_name: account.full_name,
      staff_number: account.staff_number,
      email: account.email,
      designation: account.designation,
      department: account.department,
      login_name: account.login_name,
      account_status: account.account_status,
      credential_status: account.credential_status,
      must_change_password: account.must_change_password,
      failed_attempts: account.failed_attempts,
      locked_until: account.locked_until,
      last_login_at: account.last_login_at,
      password_changed_at: account.password_changed_at,
    }));
    return Response.json({ ok: true, accounts }, { headers: noStoreHeaders() });
  } catch (error) {
    return resultErrorResponse(error);
  }
}
