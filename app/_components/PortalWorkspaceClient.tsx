"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { centralIdentityConfig, centralIdentitySessionStorageKey } from "../../data/central-identity";

type StoredSession = {
  clientCode: string;
  clientSecret: string;
  expiresAt: string;
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
  management_access?: boolean;
  roles?: Array<{ role_code: string; role_name: string }>;
  grants?: Array<{ app_code: string; access_role: string; permissions: string[] }>;
  class_assignments?: Array<{ class_key: string; display_name: string }>;
  subject_assignments?: Array<{ class_key: string; display_name: string; subject_index: number; subject_name: string }>;
  result_portal?: {
    legacy_grant: boolean;
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
  client_code?: string;
  client_secret?: string;
  expires_at?: string;
  must_change_password?: boolean;
};

type WorkspaceView = "overview" | "staff" | "management";

const resultPortalUrl = "https://wts-result-system.vercel.app/";

function friendlyError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_LOGIN: "The staff number, email address or password was not accepted.",
    ACCOUNT_NOT_ACTIVE: "This staff account is not active. Please contact school management.",
    ACCOUNT_TEMPORARILY_LOCKED: "This account is temporarily locked. Please try later or contact school management.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have Staff Workspace access.",
    STAFF_SESSION_NOT_ACTIVE: "Your session is no longer active. Please sign in again.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
  };
  return messages[code || ""] || "The protected service could not complete that request.";
}

async function callCentralRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${centralIdentityConfig.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: centralIdentityConfig.publishableKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ ok: false, code: "INVALID_SERVER_RESPONSE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as T;
}

function readSession() {
  try {
    const value = window.sessionStorage.getItem(centralIdentitySessionStorageKey);
    return value ? (JSON.parse(value) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(value: StoredSession) {
  window.sessionStorage.setItem(centralIdentitySessionStorageKey, JSON.stringify(value));
}

function clearSession() {
  window.sessionStorage.removeItem(centralIdentitySessionStorageKey);
}

export function PortalSignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pendingChange, setPendingChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await callCentralRpc<LoginResponse>("school_identity_portal_login", {
        p_login: login.trim(),
        p_password: password,
        p_app_code: "staff_self_service",
      });
      if (result.must_change_password) {
        setPendingChange(true);
        setMessage("A password change is required before this account can continue.");
        return;
      }
      saveSession({ clientCode: result.client_code!, clientSecret: result.client_secret!, expiresAt: result.expires_at! });
      window.location.assign("/workspace");
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await callCentralRpc("school_identity_change_password", {
        p_login: login.trim(),
        p_current_password: password,
        p_new_password: newPassword,
      });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPendingChange(false);
      setMessage("Password changed. Sign in with your new password.");
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="portalSignInPage">
      <section className="portalSignInCard" aria-labelledby="portal-sign-in-title">
        <Link className="portalBackLink" href="/portal">← Back to Portal Gateway</Link>
        <p className="eyebrow">WTS STAFF AND MANAGEMENT</p>
        <h1 id="portal-sign-in-title">Sign in to your authorised workspace.</h1>
        <p>Your existing Central Registry staff identity is checked before any workspace module is shown. This page never creates a new school account.</p>
        {!pendingChange ? <form className="portalAuthForm" onSubmit={submitLogin}>
          <label>Staff number or official email<input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Checking access…" : "Sign in securely"}</button>
        </form> : <form className="portalAuthForm" onSubmit={submitPasswordChange}>
          <label>New password<input autoComplete="new-password" type="password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input autoComplete="new-password" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Updating password…" : "Change password"}</button>
        </form>}
        <p className={`portalAuthMessage ${message ? "isVisible" : ""}`} role="status">{message}</p>
        <ul className="portalAuthNotes"><li>Access is checked against your active staff identity, employment status and explicit grants.</li><li>Management decides modules, actions, classes and subjects individually.</li><li>Result Management currently opens separately while its legacy security model is being replaced.</li></ul>
      </section>
    </main>
  );
}

function ModuleStatus({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return <span className={`liveWorkspaceStatus ${allowed ? "isAllowed" : "isRestricted"}`}>{children}</span>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="workspaceLiveEmpty">{children}</p>;
}

export function WorkspaceClient({ requestedView }: { requestedView: WorkspaceView }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    const session = readSession();
    if (!session) {
      setWorkspace(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    setError("");
    try {
      const result = await callCentralRpc<Workspace>("school_staff_workspace_read_api", {
        p_client_code: session.clientCode,
        p_client_secret: session.clientSecret,
      });
      setWorkspace(result);
    } catch (requestError) {
      clearSession();
      setWorkspace(null);
      setError(friendlyError(requestError instanceof Error ? requestError.message : undefined));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function signOut() {
    const session = readSession();
    clearSession();
    setWorkspace(null);
    if (session) {
      try {
        await callCentralRpc("school_identity_portal_logout", { p_client_code: session.clientCode, p_client_secret: session.clientSecret });
      } catch {
        // Local removal still prevents this browser from continuing the workspace.
      }
    }
    window.location.assign("/portal");
  }

  const result = workspace?.result_portal;
  const roles = useMemo(() => workspace?.roles?.map((role) => role.role_name).join(" · ") || "No additional system role assigned", [workspace]);

  if (checking) return <main id="main-content" className="workspaceGate"><p>Checking your authorised WTS workspace…</p></main>;
  if (!workspace) return <main id="main-content" className="workspaceGate"><section><p className="eyebrow">PROTECTED WORKSPACE</p><h1>Sign in is required.</h1><p>{error || "This route does not display records until an active staff identity is verified."}</p><Link className="primaryButton" href="/portal/sign-in">Sign in to WTS Workspace</Link></section></main>;
  if (requestedView === "management" && !workspace.management_access) return <main id="main-content" className="workspaceGate"><section><p className="eyebrow">MANAGEMENT WORKSPACE</p><h1>You do not currently have management access.</h1><p>Management modules require an explicit Central Registry permission. Your staff workspace remains available.</p><Link className="primaryButton" href="/workspace/staff">Open Staff Workspace</Link></section></main>;

  const showManagement = requestedView === "management" || (requestedView === "overview" && workspace.management_access);
  return <main id="main-content" className="workspaceLivePage">
    <div className="workspaceLiveFrame">
      <aside className="workspaceLiveSidebar" aria-label="Workspace navigation">
        <Link className="workspaceBrand" href="/portal"><span>WTS</span><strong>Workspace</strong></Link>
        <p>Verified staff session</p>
        <nav><Link href="/workspace">Overview</Link><Link href="/workspace/staff">Staff Workspace</Link>{workspace.management_access ? <Link href="/workspace/management">Management Workspace</Link> : null}</nav>
        <button type="button" className="workspaceSignOut" onClick={() => void signOut()}>Sign out</button>
      </aside>
      <section className="workspaceLiveContent">
        <header className="workspaceLiveHeader"><div><p className="eyebrow">{showManagement ? "MANAGEMENT WORKSPACE" : "STAFF WORKSPACE"}</p><h1>Welcome, {workspace.person?.full_name}.</h1><p>{workspace.person?.designation || workspace.person?.staff_category || "Authorised staff member"} · {roles}</p></div><button className="ghostButton" type="button" onClick={() => void refresh()}>Refresh access</button></header>
        <section className="workspaceLiveSummary"><article><span>Staff ID</span><strong>{workspace.person?.staff_number || "Not assigned"}</strong></article><article><span>Current session</span><strong>Not yet supplied by an integrated academic source</strong></article><article><span>Current term</span><strong>Not yet supplied by an integrated academic source</strong></article></section>
        {!showManagement ? <>
          <section className="workspaceLiveGrid"><article><p className="eyebrow">ASSIGNED CLASSES</p><h2>Classes</h2>{workspace.class_assignments?.length ? <ul>{workspace.class_assignments.map((item) => <li key={item.class_key}>{item.display_name}</li>)}</ul> : <EmptyState>No classes have been assigned to your account.</EmptyState>}</article><article><p className="eyebrow">ASSIGNED SUBJECTS</p><h2>Subjects</h2>{workspace.subject_assignments?.length ? <ul>{workspace.subject_assignments.map((item) => <li key={`${item.class_key}-${item.subject_index}`}>{item.display_name} · {item.subject_name}</li>)}</ul> : <EmptyState>No subjects have been assigned to your account.</EmptyState>}</article></section>
          <section className="workspaceLiveGrid"><article><p className="eyebrow">RESULT MANAGEMENT</p><h2>Score entry and submission</h2><ModuleStatus allowed={Boolean(result?.can_view_entry || result?.legacy_grant)}>{result?.can_view_entry ? "Explicit action access assigned" : result?.legacy_grant ? "Legacy Result Portal grant found" : "Not authorised"}</ModuleStatus><p>Result scopes and action grants are checked in the Central Registry workspace before a future unified result route is enabled.</p>{result?.legacy_grant ? <a className="workspaceExternalLink" href={resultPortalUrl} target="_blank" rel="noreferrer">Open existing Result Portal ↗</a> : null}{result?.legacy_grant && !result?.can_view_entry ? <EmptyState>No result-entry action is assigned in the unified model yet. The separate legacy portal remains subject to its own current login during transition.</EmptyState> : null}</article><article><p className="eyebrow">RESPONSIBILITIES</p><h2>Current work</h2><EmptyState>No pending result submissions were found in an integrated feed. Live task status will appear only after the Result Portal publishes a protected assignment API.</EmptyState><p className="eyebrow">ANNOUNCEMENTS</p><EmptyState>No approved school announcements are connected to this workspace yet.</EmptyState></article></section>
          <section className="workspaceLiveGrid"><article><p className="eyebrow">STAFF PROFILE</p><h2>Profile</h2><ModuleStatus allowed>Authorised</ModuleStatus><p>Your staff identity is supplied by Central Registry. Self-service profile editing remains within its protected Registry workflow.</p></article><article><p className="eyebrow">IN DEVELOPMENT</p><h2>Attendance and notifications</h2><p>Attendance and Notification systems are not presented as daily operational tools in this phase.</p></article></section>
        </> : <>
          <section className="workspaceLiveGrid managementGrid"><article><p className="eyebrow">ACCESS CONTROL</p><h2>Staff Management</h2><ModuleStatus allowed>Authorised management role</ModuleStatus><p>Role, module, action, class and subject assignments are controlled in the Central Registry management interface and fully audited.</p><a className="workspaceExternalLink" href="https://wts-central-registry.vercel.app/" target="_blank" rel="noreferrer">Open Central Registry ↗</a><small>A separate Central Registry sign-in remains necessary during this transition.</small></article><article><p className="eyebrow">RESULTS ADMINISTRATION</p><h2>Results</h2><ModuleStatus allowed={Boolean(result?.legacy_grant)}> {result?.legacy_grant ? "Legacy Result Portal access exists" : "No results module grant"}</ModuleStatus><p>Report-card generation, review, approval and publishing require their own explicit action grants before they can become a unified workspace route.</p>{result?.legacy_grant ? <a className="workspaceExternalLink" href={resultPortalUrl} target="_blank" rel="noreferrer">Open existing Result Portal ↗</a> : <EmptyState>You do not currently have access to this module.</EmptyState>}</article><article><p className="eyebrow">IN DEVELOPMENT</p><h2>Central Registry, Attendance and Notifications</h2><p>Central Registry access control is now operational. Attendance Monitoring and Notification Management remain in development and are not routine daily tools.</p></article><article><p className="eyebrow">PLANNED</p><h2>Reports, Public Website and System Settings</h2><p>These modules will remain hidden until management assigns explicit actions and their protected service contracts are ready.</p></article></section>
          <section className="workspaceLiveGrid"><article><p className="eyebrow">AUDIT AND REVOCATION</p><h2>Immediate access checks</h2><p>Each workspace refresh reads the active Central Registry grant. Suspending the account invalidates Central sessions; revoking a module removes it from this workspace.</p></article><article><p className="eyebrow">UNRESOLVED INTEGRATION</p><h2>One login is not complete yet.</h2><p>The current Result Portal must be moved off browser-local passwords and unrestricted direct data access before it can consume this workspace session securely.</p></article></section>
        </>}
      </section>
    </div>
  </main>;
}
