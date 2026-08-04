"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

export type WorkspaceSession = {
  ok: boolean;
  code?: string;
  expires_at?: string;
  permissions?: string[];
};

type WorkspaceGrant = {
  app_code: string;
  access_role: string;
  permissions: string[];
  valid_until?: string | null;
};

type Workspace = {
  ok: boolean;
  code?: string;
  person?: {
    staff_id: string;
    staff_number: string | null;
    full_name: string;
    designation: string | null;
    staff_category: string | null;
  };
  roles?: Array<{ role_code: string; role_name: string }>;
  grants?: WorkspaceGrant[];
  class_assignments?: Array<{ class_key: string; display_name: string }>;
  subject_assignments?: Array<{ class_key: string; display_name: string; subject_index: number; subject_name: string }>;
  result_portal?: {
    active_grant: boolean;
    can_view_entry: boolean;
    can_create_entry: boolean;
    can_edit_entry: boolean;
    can_submit: boolean;
    can_review: boolean;
    can_approve: boolean;
    can_generate_cards: boolean;
    can_publish: boolean;
  };
};

type LoginResponse = {
  ok: boolean;
  code?: string;
  must_change_password?: boolean;
};

type WorkspaceModuleKey =
  | "profile"
  | "centralRegistry"
  | "results"
  | "attendance"
  | "notifications"
  | "reports"
  | "website"
  | "systemAdministration";

type WorkspaceModuleStatus = "operational" | "under-development" | "protected";

const resultPortalUrl = "https://wts-result-system.vercel.app/";
const centralRegistryUrl = "https://wts-central-registry.vercel.app/";

function friendlyError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_LOGIN: "The staff number, official email or password was not accepted.",
    LOGIN_AND_PASSWORD_REQUIRED: "Enter your WTS staff number or official email and password.",
    ACCOUNT_NOT_ACTIVE: "This staff account is not active. Please contact authorised school management.",
    ACCOUNT_TEMPORARILY_LOCKED: "This account is temporarily locked. Please contact authorised school management for recovery.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have access to the WTS Workspace.",
    PORTAL_PERMISSION_SYNC_FAILED: "The account could not be matched to an active workspace grant. Please contact authorised school management.",
    STAFF_SESSION_NOT_ACTIVE: "Your session is no longer active. Please sign in again.",
    STAFF_SESSION_REQUIRED: "Your session is no longer active. Please sign in again.",
    INVALID_CURRENT_PASSWORD: "The current password was not accepted.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
    IDENTITY_SERVICE_UNAVAILABLE: "The identity service is temporarily unavailable. Please try again later.",
  };
  return messages[code || ""] || "The protected service could not complete that request.";
}
async function workspaceSessionRequest<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/workspace-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ action, ...body }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as T;
}

async function readWorkspace<T>() {
  const response = await fetch("/api/workspace", { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as T;
}

export function PortalSignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pendingChange, setPendingChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success" | "info">("error");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageTone("error");
    try {
      const result = await workspaceSessionRequest<LoginResponse>("login", { login: login.trim(), password });
      if (result.must_change_password) {
        setPendingChange(true);
        setMessage("This is a first-time or reset credential. Choose your new password before continuing.");
        setMessageTone("info");
        return;
      }
      window.location.assign("/workspace");
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("The new passwords do not match.");
      setMessageTone("error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await workspaceSessionRequest("change_password", { login: login.trim(), current_password: password, new_password: newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPendingChange(false);
      setMessage("Password changed. Sign in again with your new password.");
      setMessageTone("success");
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="portalSignInPage">
      <section className="portalSignInCard" aria-labelledby="portal-sign-in-title">
        <Link className="portalBackLink" href="/portal">← Back to Portal</Link>
        <p className="eyebrow">WTS WORKSPACE</p>
        <h1 id="portal-sign-in-title">Sign in to WTS Workspace.</h1>
        <p>Use your WTS staff number or official registered email. Your workspace is assembled from the real permissions assigned by school management.</p>
        {!pendingChange ? <form className="portalAuthForm" onSubmit={submitLogin}>
          <label>WTS staff number or official registered email<input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Checking access…" : "Sign in securely"}</button>
        </form> : <form className="portalAuthForm" onSubmit={submitPasswordChange}>
          <label>New password<input autoComplete="new-password" type="password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input autoComplete="new-password" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Updating password…" : "Create new password"}</button>
        </form>}
        <p className={`portalAuthMessage ${message ? "isVisible" : ""} portalAuthMessage--${messageTone}`} role="status">{message}</p>
        <ul className="portalAuthNotes">
          <li>This sign-in uses the active WTS identity managed by Central Registry.</li>
          <li>First-time or reset accounts must create a new password before workspace access.</li>
          <li>Unknown public emails are handled with the same generic error as incorrect credentials.</li>
          <li>Contact authorised school management when access recovery is required.</li>
        </ul>
      </section>
    </main>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="workspaceLiveEmpty">{children}</p>;
}

function ModuleStatus({ status }: { status: WorkspaceModuleStatus }) {
  const label = status === "operational" ? "Operational" : status === "protected" ? "Protected" : "Under continued development";
  return <span className={`liveWorkspaceStatus liveWorkspaceStatus--${status}`}>{label}</span>;
}

function hasAny(values: Set<string>, ...items: string[]) {
  return items.some((item) => values.has(item));
}

function ModuleCard({
  id,
  title,
  description,
  status,
  action,
  note,
}: {
  id: WorkspaceModuleKey;
  title: string;
  description: string;
  status: WorkspaceModuleStatus;
  action?: ReactNode;
  note?: string;
}) {
  return <article id={id} className="workspaceModule workspaceModule--live">
    <ModuleStatus status={status} />
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
    {note ? <small>{note}</small> : null}
  </article>;
}

export function WorkspaceClient() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  async function refresh() {
    setChecking(true);
    setError("");
    try {
      const result = await readWorkspace<Workspace>();
      setAuthenticated(true);
      setWorkspace(result);
    } catch (requestError) {
      setAuthenticated(false);
      setWorkspace(null);
      setError(friendlyError(requestError instanceof Error ? requestError.message : undefined));
    } finally {
      setChecking(false);
   