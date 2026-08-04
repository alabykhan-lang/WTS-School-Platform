export const WORKSPACE_SESSION_COOKIE = "wts_school_workspace_session";

export function workspaceSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  let value = "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== WORKSPACE_SESSION_COOKIE) continue;
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      value = "";
    }
  }
  const separator = value.indexOf(".");
  if (separator <= 0 || separator === value.length - 1) return null;
  const id = value.slice(0, separator);
  const secret = value.slice(separator + 1);
  if (id.length > 160 || secret.length > 512) return null;
  return { id, secret };
}

export function workspaceSessionCookie(sessionId: string, sessionSecret: string) {
  return `${WORKSPACE_SESSION_COOKIE}=${encodeURIComponent(`${sessionId}.${sessionSecret}`)}; Path=/; Max-Age=${8 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearWorkspaceSessionCookie() {
  return `${WORKSPACE_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
