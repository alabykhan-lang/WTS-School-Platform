"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { centralIdentityConfig, centralIdentitySessionStorageKey } from "../../data/central-identity";
import { IdentityAccessPanel } from "./IdentityAccessPanel";

export type StoredSession = {
  clientCode: string;
  clientSecret: string;
  expiresAt: string;
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
    IDENTITY_ACCOUNT_NOT_ACTIVE: "This WTS identity account is inactive. Please contact authorised school management.",
    IDENTITY_PERSON_NOT_ACTIVE: "This staff identity is inactive. Please contact authorised school management.",
    IDENTITY_CREDENTIAL_NOT_ACTIVE: "This WTS staff credential is suspended. Please contact authorised school management.",
    INACTIVE_EMPLOYMENT: "This staff employment record is inactive. Please contact authorised school management.",
    ACCOUNT_TEMPORARILY_LOCKED: "This account is temporarily locked. Please contact authorised school management for recovery.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have access to the WTS Workspace.",
    PORTAL_ACCESS_SUSPENDED: "WTS Workspace access is suspended for this account. Please contact authorised school management.",
    RESULTS_GRANT_MISSING: "This account does not have an active Results grant.",
    RESULT_ACCESS_NOT_GRANTED: "This account does not have an active Results grant.",
    PORTAL_PERMISSION_SYNC_FAILED: "The account could not be matched to an active workspace grant. Please contact authorised school management.",
    STAFF_SESSION_NOT_ACTIVE: "Your session is no longer active. Please sign in again.",
    SESSION_EXPIRED: "Your WTS session has expired. Please sign in again.",
    PASSWORD_CHANGE_REQUIRED: "This credential must be activated by choosing a new password before workspace access.",
    INVALID_CURRENT_PASSWORD: "The current password was not accepted.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
    IDENTITY_SERVICE_UNAVAILABLE: "The identity service is temporarily unavailable. Please try again later.",
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
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as T;
}

export function readStoredSession() {
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
  const [messageTone, setMessageTone] = useState<"error" | "success" | "info">("error");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageTone("error");
    try {
      const result = await callCentralRpc<LoginResponse>("school_identity_portal_login", {
        p_login: login.trim(),
        p_password: password,
        p_app_code: "staff_self_service",
      });
      if (result.must_change_password) {
        setPendingChange(true);
        setMessage("This is a first-time or reset credential. Choose your new password before continuing.");
        setMessageTone("info");
        return;
      }
      if (!result.client_code || !result.client_secret || !result.expires_at) {
        throw new Error("IDENTITY_SERVICE_UNAVAILABLE");
      }
      saveSession({ clientCode: result.client_code, clientSecret: result.client_secret, expiresAt: result.expires_at });
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
      await callCentralRpc("school_identity_change_password", {
        p_login: login.trim(),
        p_current_password: password,
        p_new_password: newPassword,
      });
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
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Checking access…" : "Sign In to WTS"}</button>
        </form> : <form className="portalAuthForm" onSubmit={submitPasswordChange}>
          <label>New password<input autoComplete="new-password" type="password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input autoComplete="new-password" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Updating password…" : "Create new password"}</button>
        </form>}
        <p className={`portalAuthMessage ${message ? "isVisible" : ""} portalAuthMessage--${messageTone}`} role="status">{message}</p>
        <ul className="portalAuthNotes">
          <li>This credential may differ from a legacy Result Portal password.</li>
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
  const [session, setSession] = useState<StoredSession | null>(null);

  async function refresh() {
    const currentSession = readStoredSession();
    setSession(currentSession);
    if (!currentSession) {
      setWorkspace(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    setError("");
    try {
      const result = await callCentralRpc<Workspace>("school_staff_workspace_read_api", {
        p_client_code: currentSession.clientCode,
        p_client_secret: currentSession.clientSecret,
      });
      setWorkspace(result);
    } catch (requestError) {
      clearSession();
      setSession(null);
      setWorkspace(null);
      setError(friendlyError(requestError instanceof Error ? requestError.message : undefined));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function signOut() {
    const currentSession = readStoredSession();
    clearSession();
    setSession(null);
    setWorkspace(null);
    if (currentSession) {
      try {
        await callCentralRpc("school_identity_portal_logout", {
          p_client_code: currentSession.clientCode,
          p_client_secret: currentSession.clientSecret,
        });
      } catch {
        // Local removal still prevents this browser from continuing the workspace.
      }
    }
    window.location.assign("/portal");
  }

  const access = useMemo(() => {
    const grants = workspace?.grants || [];
    const appCodes = new Set(grants.map((grant) => grant.app_code));
    const permissions = new Set(grants.flatMap((grant) => grant.permissions || []));
    const app = (appCode: string) => appCodes.has(appCode);
    const moduleAccess: Record<WorkspaceModuleKey, boolean> = {
      profile: app("staff_self_service") && hasAny(permissions, "profile.view", "profile.update", "staff_profile.view", "staff_profile.edit"),
      centralRegistry: app("central_registry") || hasAny(permissions, "central_registry.view", "central_registry.administer", "registry.read", "registry.manage"),
      results: app("results") || Boolean(workspace?.result_portal?.legacy_grant),
      attendance: app("attendance") || hasAny(permissions, "attendance.history.view", "attendance.view", "attendance.create", "attendance.edit", "attendance.review", "attendance.export"),
      notifications: app("notifications") || hasAny(permissions, "notifications.view", "notifications.create", "notifications.edit", "notifications.approve", "notifications.publish"),
      reports: hasAny(permissions, "reports.view", "reports.export"),
      website: hasAny(permissions, "public_website_content.view", "public_website_content.create", "public_website_content.edit", "public_website_content.publish"),
      systemAdministration: hasAny(permissions, "access.manage", "system_administration.view", "system_administration.administer", "staff_management.administer"),
    };
    const roleNames = workspace?.roles?.map((role) => role.role_name).filter(Boolean) || [];
    const assignedModules = Object.values(moduleAccess).filter(Boolean).length;
    return { permissions, moduleAccess, roleNames, assignedModules };
  }, [workspace]);

  if (checking) return <main id="main-content" className="workspaceGate"><p>Checking your authorised WTS Workspace…</p></main>;
  if (!workspace || !session) return <main id="main-content" className="workspaceGate"><section><p className="eyebrow">PROTECTED WORKSPACE</p><h1>Sign in is required.</h1><p>{error || "This route does not display records until an active staff identity is verified."}</p><Link className="primaryButton" href="/portal/sign-in">Sign in to WTS Workspace</Link></section></main>;

  const grantedModules = access.moduleAccess;
  const roles = access.roleNames.length ? access.roleNames.join(" · ") : "No descriptive role assignment is displayed";
  const result = workspace.result_portal;
  const hasClassData = grantedModules.results && Boolean(workspace.class_assignments?.length || workspace.subject_assignments?.length);

  return <main id="main-content" className="workspaceLivePage">
    <div className="workspaceLiveFrame">
      <aside className="workspaceLiveSidebar" aria-label="WTS Workspace navigation">
        <Link className="workspaceBrand" href="/portal"><span>WTS</span><strong>Workspace</strong></Link>
        <p>Permission-driven access</p>
        <nav>
          <a href="#overview">Overview</a>
          {grantedModules.profile ? <a href="#profile">My Profile</a> : null}
          {grantedModules.centralRegistry ? <a href="#centralRegistry">Central Registry</a> : null}
          {grantedModules.results ? <a href="#results">Results</a> : null}
          {grantedModules.attendance ? <a href="#attendance">Attendance</a> : null}
          {grantedModules.notifications ? <a href="#notifications">Notifications</a> : null}
          {grantedModules.reports ? <a href="#reports">Reports</a> : null}
          {grantedModules.website ? <a href="#website">Public Website Management</a> : null}
          {grantedModules.systemAdministration ? <a href="#systemAdministration">System Administration</a> : null}
        </nav>
        <button type="button" className="workspaceSignOut" onClick={() => void signOut()}>Sign out</button>
      </aside>

      <section className="workspaceLiveContent">
        <header className="workspaceLiveHeader">
          <div>
            <p className="eyebrow">WTS WORKSPACE</p>
            <h1>Welcome, {workspace.person?.full_name}.</h1>
            <p>{workspace.person?.designation || workspace.person?.staff_category || "Authorised staff member"} · {roles}</p>
          </div>
          <button className="ghostButton workspaceRefreshButton" type="button" onClick={() => void refresh()}>Refresh permissions</button>
        </header>

        <section id="overview" className="workspaceLiveSummary" aria-label="Workspace overview">
          <article><span>Staff identity</span><strong>{workspace.person?.staff_number || "Not assigned"}</strong></article>
          <article><span>Authorised modules</span><strong>{access.assignedModules}</strong></article>
          <article><span>Academic source</span><strong>Current session and term are not connected to this workspace yet.</strong></article>
        </section>

        <section className="workspaceModuleDirectory" aria-labelledby="workspace-modules-heading">
          <header className="workspaceModuleDirectoryHeader"><div><p className="eyebrow">AUTHORISED MODULES</p><h2 id="workspace-modules-heading">Your WTS work, in one place.</h2></div><p>Only active Central Registry grants are shown. A module status describes the real integration state; it does not create access.</p></header>
          <div className="workspaceModuleGrid">
            {grantedModules.profile ? <ModuleCard id="profile" title="My Profile" status="operational" description="Your staff identity is supplied by Central Registry. This workspace does not create a duplicate profile." action={<a className="workspaceExternalLink" href="https://wts-central-registry.vercel.app/staff" target="_blank" rel="noreferrer">Open protected profile service ↗</a>} /> : null}
            {grantedModules.centralRegistry ? <ModuleCard id="centralRegistry" title="Central Registry" status="under-development" description="The real registry remains the authority for people, admissions, staff identity and access grants." action={<a className="workspaceExternalLink" href={centralRegistryUrl} target="_blank" rel="noreferrer">Open Central Registry ↗</a>} note="The Registry still uses its own protected transition session until shared session integration is completed." /> : null}
            {grantedModules.results ? <ModuleCard id="results" title="Results" status="operational" description="The existing Result Portal remains the operational score, report-card and publication system. This workspace checks your real Results grant before offering access." action={<a className="workspaceExternalLink" href={resultPortalUrl} target="_blank" rel="noreferrer">Open existing Result Portal ↗</a>} note="The legacy Result Portal may still request its separate credential during transition." /> : null}
            {grantedModules.attendance ? <ModuleCard id="attendance" title="Attendance" status="under-development" description="Attendance access is assigned to this identity, but the protected WTS Workspace interface is still in development." note="No attendance events, devices or figures are shown here." /> : null}
            {grantedModules.notifications ? <ModuleCard id="notifications" title="Notifications" status="under-development" description="Notification access is assigned to this identity, but the protected WTS Workspace interface is still in development." note="No contacts, messages or delivery figures are shown here." /> : null}
            {grantedModules.reports ? <ModuleCard id="reports" title="Reports" status="under-development" description="Reporting access is assigned to this identity. The approved reporting service is not connected to this workspace yet." note="No invented metrics or report records are displayed." /> : null}
            {grantedModules.website ? <ModuleCard id="website" title="Public Website Management" status="under-development" description="Website-management permission is assigned to this identity. A real protected publishing interface is not connected yet." note="The public website remains unchanged from this workspace." /> : null}
            {grantedModules.systemAdministration ? <ModuleCard id="systemAdministration" title="System Administration" status="protected" description="Identity and access controls are available only to the real administrators whose grants include access-management authority." action={<a className="workspaceExternalLink" href="#system-administration-panel">Open identity and access controls ↓</a>} /> : null}
            {!access.assignedModules ? <EmptyState>No additional WTS modules are assigned to this identity. Contact authorised school management if access is expected.</EmptyState> : null}
          </div>
        </section>

        {grantedModules.profile ? <section className="workspaceLiveGrid" aria-labelledby="profile-heading">
          <article><p className="eyebrow">MY PROFILE</p><h2 id="profile-heading">{workspace.person?.full_name}</h2><ModuleStatus status="operational" /><p>Staff number: {workspace.person?.staff_number || "Not assigned"}. Designation: {workspace.person?.designation || workspace.person?.staff_category || "Not supplied"}.</p><EmptyState>Profile editing remains inside the protected Central Registry staff profile service.</EmptyState></article>
          <article><p className="eyebrow">PROFILE SOURCE</p><h2>Central Registry identity</h2><p>This workspace reads the existing staff identity and does not create a second identity record.</p></article>
        </section> : null}

        {grantedModules.results ? <section className="workspaceLiveGrid" aria-labelledby="results-heading">
          <article><p className="eyebrow">RESULTS ACCESS</p><h2 id="results-heading">Real grant and scope status</h2><ModuleStatus status="operational" /><p>{result?.can_view_entry ? "An explicit Result Entry view permission is assigned." : "The active Results grant is present, but a unified Result Entry action is not assigned."}</p>{hasClassData ? <><p className="eyebrow workspaceSubEyebrow">ACTIVE RESULT SCOPES</p><ul>{(workspace.class_assignments || []).map((item) => <li key={`class-${item.class_key}`}>{item.display_name}</li>)}{(workspace.subject_assignments || []).map((item) => <li key={`subject-${item.class_key}-${item.subject_index}`}>{item.display_name} · {item.subject_name}</li>)}</ul></> : <EmptyState>No active Result class or subject scope is assigned to this identity.</EmptyState>}</article>
          <article><p className="eyebrow">TRANSITION STATUS</p><h2>Existing Result Portal</h2><p>Report-card generation and existing result data remain unchanged. The portal is not embedded and no credential is passed in a URL.</p><a className="workspaceExternalLink" href={resultPortalUrl} target="_blank" rel="noreferrer">Open Result Portal ↗</a><EmptyState>One-login Results access is not complete because the legacy portal still uses browser-local authentication and direct Data API access.</EmptyState></article>
        </section> : null}

        {grantedModules.systemAdministration ? <section id="system-administration-panel" className="workspaceAdminSection" aria-labelledby="system-admin-heading">
          <header className="workspaceModuleDirectoryHeader"><div><p className="eyebrow">SYSTEM ADMINISTRATION</p><h2 id="system-admin-heading">Identity and access controls.</h2></div><p>Credential recovery is server-side, permission-checked, one-time for each issuance and audited without exposing password hashes or storing temporary passwords.</p></header>
          <IdentityAccessPanel session={session} />
        </section> : null}
      </section>
    </div>
  </main>;
}
