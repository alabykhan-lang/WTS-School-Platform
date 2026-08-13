"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { staffPortalModules } from "../../data/staff-portal-modules";
import { getModuleLaunchUrl } from "../../data/portal-config";

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

type WorkspacePerson = {
  staff_id?: string;
  staff_number?: string | null;
  full_name?: string | null;
  designation?: string | null;
  staff_category?: string | null;
  department?: string | null;
  employment_status?: string | null;
  registration_status?: string | null;
  photo_url?: string | null;
};

type InstitutionalAuthority = {
  active?: boolean;
  classification?: "system_owner" | "proprietor" | "ordinary_staff" | string;
  institutional_number?: string | null;
  personal_attendance_required?: boolean;
};

type ClassOverview = {
  available?: boolean;
  class_key: string;
  class_name: string | null;
  academic_session?: string | null;
  term?: string | null;
  total_pupils?: number | null;
  male_pupils?: number | null;
  female_pupils?: number | null;
  active_pupils?: number | null;
  expected_subjects?: number | null;
  subjects_with_scores?: number | null;
  incomplete_subjects?: number | null;
  pupils_with_missing_required_scores?: number | null;
  published_subjects?: number | null;
  report_card_readiness?: { status?: string; label?: string } | null;
  attendance?: {
    available?: boolean;
    days_recorded?: number | null;
    absent_pupils_today?: number | null;
    repeated_absence_alerts?: number | null;
    message?: string | null;
  } | null;
  responsibility?: string | null;
  morning_register_status?: string | null;
  afternoon_register_status?: string | null;
  pupils_present_today?: number | null;
  pupils_absent_today?: number | null;
  weekly_percentage?: number | null;
  incomplete_register_alerts?: number | null;
  repeated_absence_alert_count?: number | null;
  attendance_available?: boolean;
  registry?: { available?: boolean; incomplete_records?: number | null; definition?: string } | null;
  announcements?: { available?: boolean; message?: string | null } | null;
};

type SubjectAssignment = {
  class_key: string;
  class_name: string | null;
  subject_index: number;
  subject_name: string | null;
  academic_session?: string | null;
  term?: string | null;
  pupil_count?: number | null;
  recorded_score_count?: number | null;
  missing_score_count?: number | null;
  score_entry_status?: string | null;
  submission_status?: { available?: boolean; label?: string } | null;
  publication_status?: string | null;
};

type AdministratorDashboard = {
  available?: boolean;
  active_pupils?: number | null;
  active_staff?: number | null;
  class_overviews?: ClassOverview[];
  missing_score_alerts?: number | null;
  report_card_readiness?: {
    available?: boolean;
    classes_ready?: number | null;
    classes_incomplete?: number | null;
    classes_not_available?: number | null;
  } | null;
  attendance_overview?: {
    available?: boolean;
    records?: number | null;
    absent_pupils_today?: number | null;
    absent_staff_today?: number | null;
    message?: string | null;
  } | null;
  attendance_management?: {
    available?: boolean;
    staff_present_today?: number | null;
    staff_absent_today?: number | null;
    staff_late_today?: number | null;
    pupils_present_today?: number | null;
    pupils_absent_today?: number | null;
    classes_with_incomplete_registers?: number | null;
    device_import_health?: {
      available?: boolean;
      registered_devices?: number | null;
      healthy_devices?: number | null;
      pending_imports?: number | null;
    } | null;
    message?: string | null;
  } | null;
  device_import_health?: {
    available?: boolean;
    registered_devices?: number | null;
    healthy_devices?: number | null;
    pending_imports?: number | null;
  } | null;
  registry?: { available?: boolean; incomplete_records?: number | null } | null;
  pending_approvals?: { available?: boolean; count?: number | null; message?: string | null } | null;
  publication?: { available?: boolean; published_subjects?: number | null; expected_subjects?: number | null } | null;
};

type WorkspaceModuleSummary = {
  status?: "operational" | "under-development" | "protected" | string;
  available?: boolean;
  summary?: string;
};

type WorkspaceSummary = {
  person?: WorkspacePerson;
  institutional_authority?: InstitutionalAuthority;
  academic_context?: { session?: string | null; term?: string | null; source?: string | null };
  class_teacher?: { available?: boolean; assignments?: ClassOverview[]; message?: string | null };
  subject_teacher?: { available?: boolean; assignments?: SubjectAssignment[]; message?: string | null };
  subject_assignments?: SubjectAssignment[];
  staff_attendance?: {
    available?: boolean;
    days_recorded?: number | null;
    present_days?: number | null;
    absent_days?: number | null;
    attendance_required?: boolean;
    today?: { available?: boolean; status?: string | null; check_in_time?: string | null; check_out_time?: string | null; records?: number | null } | null;
    weekly?: { available?: boolean; percentage?: number | null } | null;
    monthly?: { available?: boolean; percentage?: number | null } | null;
    term?: { available?: boolean; percentage?: number | null } | null;
    unresolved_correction_count?: number | null;
    message?: string | null;
  };
  attendance?: { ok?: boolean; personal?: Record<string, unknown>; class_teacher?: Record<string, unknown>; management?: Record<string, unknown>; roster_sync?: Record<string, unknown> } | null;
  roster_sync?: { last_successful_sync?: string | null; records_added?: number | null; records_updated?: number | null; records_deactivated?: number | null; unresolved_identities?: number | null; failed_mappings?: number | null; retry_available?: boolean } | null;
  administrator_dashboard?: AdministratorDashboard | null;
  module_summaries?: Record<string, WorkspaceModuleSummary>;
};

type Workspace = {
  ok: boolean;
  code?: string;
  person?: WorkspacePerson;
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
  summary?: WorkspaceSummary | null;
  institutional_authority?: InstitutionalAuthority;
  institutional_modules?: Record<string, boolean>;
  management_access?: boolean;
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
  | "resources"
  | "reports"
  | "website"
  | "systemAdministration";

type WorkspaceModuleStatus = "operational" | "under-development" | "protected" | "unavailable";

const resultPortalUrl = getModuleLaunchUrl("results");
const centralRegistryUrl = getModuleLaunchUrl("centralRegistry");
const attendanceUrl = getModuleLaunchUrl("attendance");

function friendlyError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_LOGIN: "The staff number, official email or password was not accepted.",
    LOGIN_AND_PASSWORD_REQUIRED: "Enter your staff number or official email and password.",
    ACCOUNT_NOT_ACTIVE: "This staff account is not active. Please contact authorised school management.",
    ACCOUNT_TEMPORARILY_LOCKED: "This account is temporarily locked. Please contact authorised school management for recovery.",
    RESULT_ACCESS_NOT_GRANTED: "This account does not currently have an active Results grant.",
    ATTENDANCE_ACCESS_NOT_GRANTED: "This account does not currently have an active Attendance grant.",
    CENTRAL_REGISTRY_ACCESS_NOT_GRANTED: "This account does not currently have authorised Administration access.",
    NOTIFICATIONS_ACCESS_NOT_GRANTED: "This account does not currently have an active Notifications grant.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have access to the Staff Portal.",
    PORTAL_PERMISSION_SYNC_FAILED: "The account could not be matched to an active school access record. Please contact authorised school management.",
    STAFF_SESSION_NOT_ACTIVE: "Your session is no longer active. Please sign in again.",
    STAFF_SESSION_REQUIRED: "Your session is no longer active. Please sign in again.",
    RESULT_SESSION_REQUIRED: "Your session is no longer active. Please sign in again.",
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

function safeWorkspaceReturnTo(value: string | null) {
  if (!value) return "/workspace";
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname !== "/api/sso/authorize") return "/workspace";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/workspace";
  }
}

export function PortalSignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingChange, setPendingChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success" | "info">("error");
  const [busy, setBusy] = useState(false);
  const [returnTo, setReturnTo] = useState("/workspace");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReturnTo(safeWorkspaceReturnTo(query.get("return_to")));
  }, []);

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
      window.location.assign(returnTo);
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
      setShowNewPassword(false);
      setShowConfirmPassword(false);
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
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard" aria-labelledby="portal-sign-in-title">
        <Link className="portalBackLink" href="/portal">← Way to Success Standard Schools</Link>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="portal-sign-in-title">Welcome back.</h1>
        <p>Sign in with your school account. Your portal will show only the current information and services authorised for you.</p>
        {!pendingChange ? <form className="portalAuthForm" onSubmit={submitLogin}>
          <label>Staff number or official registered email
            <input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <label>Password
            <span className="portalPasswordControl">
              <input autoComplete="current-password" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Checking access…" : "Open Staff Portal"}</button>
        </form> : <form className="portalAuthForm" onSubmit={submitPasswordChange}>
          <label>New password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showNewPassword} onClick={() => setShowNewPassword((value) => !value)}>{showNewPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <label>Confirm new password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Updating password…" : "Create new password"}</button>
        </form>}
        <p className={"portalAuthMessage " + (message ? "isVisible " : "") + "portalAuthMessage--" + messageTone} role="status" aria-live="polite">{message}</p>
        <div className="portalEntryActions" aria-label="Account help">
          <Link href="/portal/account-recovery?mode=reset">Forgot Password</Link>
          <Link href="/portal/account-recovery?mode=activation">Activate Existing Account</Link>
          <Link href="/portal/register">New Staff Registration</Link>
          <Link href="/portal/help">Need Help Signing In?</Link>
        </div>
        <ul className="portalAuthNotes">
          <li>Use the same school account for the School Portal and its authorised services.</li>
          <li>Account recovery and activation use the verified details already held by the school.</li>
        </ul>
      </section>
    </main>
  );
}
function EmptyState({ children }: { children: ReactNode }) {
  return <p className="workspaceEmptyState">{children}</p>;
}

function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : value.toLocaleString();
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not available";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPercentage(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${Number(value).toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? formatLabel(value) : date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "WTS";
}

function firstName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] || "there";
}

function ModuleStatus({ status }: { status: WorkspaceModuleStatus }) {
  const label = status === "operational" ? "Operational" : status === "protected" ? "Protected" : status === "unavailable" ? "Not connected" : "Integration in progress";
  return <span className={`workspaceStatus workspaceStatus--${status}`}><i aria-hidden="true" />{label}</span>;
}

function ProgressBar({ value, total }: { value: number | null | undefined; total: number | null | undefined }) {
  const percentage = value !== null && value !== undefined && total ? Math.min(100, Math.round((value / total) * 100)) : null;
  return <div className="workspaceProgress" aria-label={percentage === null ? "Progress not available" : `${percentage}% complete`}><span style={{ width: `${percentage ?? 0}%` }} /></div>;
}

function ModuleCard({
  id,
  title,
  description,
  status,
  summary,
  href,
  icon,
}: {
  id: WorkspaceModuleKey;
  title: string;
  description: string;
  status: WorkspaceModuleStatus;
  summary?: string;
  href?: string;
  icon: string;
}) {
  const unavailableMessage = status === "unavailable"
    ? "This service is not connected to the school platform yet."
    : status === "under-development"
      ? "The portal handoff is being connected. No notification data is fabricated here."
      : "Summary and launch access will appear when this service is connected.";
  return <article id={id} className="workspaceModuleCard">
    <div className="workspaceModuleCardTop"><span className="workspaceModuleIcon" aria-hidden="true">{icon}</span><ModuleStatus status={status} /></div>
    <h3>{title}</h3>
    <p>{summary || description}</p>
    {href ? <a className="workspaceLaunchButton" href={href}>Open {title}<span aria-hidden="true">↗</span></a> : <span className="workspaceMutedNote">{unavailableMessage}</span>}
  </article>;
}

function Metric({ label, value, tone = "mint" }: { label: string; value: string; tone?: "mint" | "gold" | "blue" }) {
  return <article className={`workspaceMetric workspaceMetric--${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function ClassOverviewCard({
  overview,
  launchHref,
  showResults,
  showAttendance,
  showRegistry,
  showNotifications,
}: {
  overview: ClassOverview;
  launchHref?: string;
  showResults: boolean;
  showAttendance: boolean;
  showRegistry: boolean;
  showNotifications: boolean;
}) {
  const readiness = overview.report_card_readiness?.label || "Report-card readiness is not available.";
  return <article className="workspaceClassCard">
    <div className="workspaceCardHeader"><div><p className="workspaceCardKicker">CLASS OVERVIEW</p><h3>{overview.class_name || overview.class_key}</h3><p>{overview.academic_session || "Session not available"} · {overview.term || "Term not available"}</p></div><span className="workspaceClassKey">{overview.class_key}</span></div>
    <div className="workspaceMiniMetrics">
      {showRegistry ? <><div><span>Pupils</span><strong>{formatCount(overview.active_pupils ?? overview.total_pupils)}</strong></div><div><span>Male / female</span><strong>{formatCount(overview.male_pupils)} / {formatCount(overview.female_pupils)}</strong></div></> : null}
      {showResults ? <><div><span>Expected subjects</span><strong>{formatCount(overview.expected_subjects)}</strong></div><div><span>Subjects with scores</span><strong>{formatCount(overview.subjects_with_scores)}</strong></div><div><span>Incomplete subjects</span><strong>{formatCount(overview.incomplete_subjects)}</strong></div><div><span>Missing required scores</span><strong>{formatCount(overview.pupils_with_missing_required_scores)}</strong></div></> : null}
    </div>
    <div className="workspaceDetailList">
      {showResults ? <div><span>Report cards</span><strong>{readiness}</strong></div> : null}
      {showRegistry ? <div><span>Registry records</span><strong>{overview.registry?.incomplete_records === null || overview.registry?.incomplete_records === undefined ? "Not available" : `${formatCount(overview.registry.incomplete_records)} incomplete`}</strong></div> : null}
      {showAttendance ? <><div><span>Morning register</span><strong>{formatLabel(overview.morning_register_status) || "Not available"}</strong></div><div><span>Afternoon register</span><strong>{formatLabel(overview.afternoon_register_status) || "Not available"}</strong></div><div><span>Pupils present today</span><strong>{formatCount(overview.pupils_present_today)}</strong></div><div><span>Pupils absent today</span><strong>{formatCount(overview.pupils_absent_today)}</strong></div><div><span>Weekly class percentage</span><strong>{formatPercentage(overview.weekly_percentage)}</strong></div><div><span>Incomplete register alerts</span><strong>{formatCount(overview.incomplete_register_alerts)}</strong></div><div><span>Repeated-absence alerts</span><strong>{formatCount(overview.repeated_absence_alert_count)}</strong></div></> : null}
      {showNotifications ? <div><span>Class announcements</span><strong>{overview.announcements?.available ? "Available" : overview.announcements?.message || "No class announcement summary is currently connected."}</strong></div> : null}
    </div>
    {(showResults || showAttendance || showRegistry) ? <div className="workspaceCardActions">
      {showResults && launchHref ? <a className="workspaceLaunchButton" href={launchHref}>Open Results<span aria-hidden="true">↗</span></a> : null}
      {showAttendance && attendanceUrl ? <a className="workspaceTextLink" href={attendanceUrl}>Open Attendance ↗</a> : null}
      {showRegistry && centralRegistryUrl ? <a className="workspaceTextLink" href={centralRegistryUrl}>Open Administration ↗</a> : null}
    </div> : null}
  </article>;
}

function SubjectAssignmentCard({ assignment }: { assignment: SubjectAssignment }) {
  return <article className="workspaceAssignmentCard">
    <div className="workspaceCardHeader"><div><p className="workspaceCardKicker">SUBJECT RESPONSIBILITY</p><h3>{assignment.subject_name || `Subject ${assignment.subject_index}`}</h3><p>{assignment.class_name || assignment.class_key}</p></div><span className="workspaceAssignmentStatus">{formatLabel(assignment.score_entry_status)}</span></div>
    <div className="workspaceAssignmentProgress"><div><span>Score-entry progress</span><strong>{assignment.recorded_score_count === null || assignment.recorded_score_count === undefined || assignment.pupil_count === null || assignment.pupil_count === undefined ? "Not available" : `${formatCount(assignment.recorded_score_count)} of ${formatCount(assignment.pupil_count)}`}</strong></div><ProgressBar value={assignment.recorded_score_count} total={assignment.pupil_count} /></div>
    <div className="workspaceMiniMetrics workspaceMiniMetrics--compact"><div><span>Missing scores</span><strong>{formatCount(assignment.missing_score_count)}</strong></div><div><span>Submission</span><strong>{assignment.submission_status?.available ? "Available" : "Not connected"}</strong></div><div><span>Publication</span><strong>{formatLabel(assignment.publication_status)}</strong></div></div>
    {resultPortalUrl ? <a className="workspaceLaunchButton" href={resultPortalUrl}>Open Results<span aria-hidden="true">↗</span></a> : <EmptyState>Results is not connected.</EmptyState>}
  </article>;
}

function PersonalAttendanceCard({ attendance }: { attendance: WorkspaceSummary["staff_attendance"] }) {
  const required = attendance?.attendance_required !== false;
  const hasRecords = Boolean(attendance?.available);
  return <section className="workspacePersonalAttendance" id="personal-attendance" aria-labelledby="personal-attendance-heading">
    <div className="workspaceRoleHeading"><div><p className="workspaceCardKicker">YOUR ATTENDANCE</p><h3 id="personal-attendance-heading">Staff attendance summary</h3></div><span className="workspaceRoleBadge">{required ? "Personal attendance required" : "Personal attendance not required"}</span></div>
    {!required ? <EmptyState>{attendance?.message || "Personal attendance is not required for this institutional account and does not reduce staff percentages."}</EmptyState> : <>
      <div className="workspaceMiniMetrics"><div><span>Today</span><strong>{hasRecords ? formatLabel(attendance?.today?.status) : "No record yet"}</strong></div><div><span>Check-in</span><strong>{hasRecords ? formatDateTime(attendance?.today?.check_in_time) : "Not available"}</strong></div><div><span>Check-out</span><strong>{hasRecords ? formatDateTime(attendance?.today?.check_out_time) : "Not available"}</strong></div><div><span>Unresolved corrections</span><strong>{formatCount(attendance?.unresolved_correction_count)}</strong></div></div>
      <div className="workspaceMiniMetrics"><div><span>Weekly attendance</span><strong>{formatPercentage(attendance?.weekly?.percentage)}</strong></div><div><span>Monthly attendance</span><strong>{formatPercentage(attendance?.monthly?.percentage)}</strong></div><div><span>Term attendance</span><strong>{formatPercentage(attendance?.term?.percentage)}</strong></div><div><span>Days recorded</span><strong>{formatCount(attendance?.days_recorded)}</strong></div></div>
      {!hasRecords ? <EmptyState>{attendance?.message || "No personal attendance records have been recorded yet."}</EmptyState> : null}
    </>}
  </section>;
}

export function WorkspaceClient() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

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
    }
  }

  useEffect(() => {
    void refresh();
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  async function signOut() {
    setAuthenticated(false);
    setWorkspace(null);
    await fetch("/api/workspace-session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    window.location.assign("/portal/sign-in");
  }

  const access = useMemo(() => {
    const grants = workspace?.grants || [];
    const now = Date.now();
    const activeGrants = grants.filter((grant) => !grant.valid_until || new Date(grant.valid_until).getTime() > now);
    const appCodes = new Set(activeGrants.map((grant) => grant.app_code));
    const permissions = new Set(activeGrants.flatMap((grant) => grant.permissions || []));
    const authority = workspace?.institutional_authority || workspace?.summary?.institutional_authority;
    const institutionalModules = workspace?.institutional_modules || {};
    const protectedAuthority = authority?.active === true && (authority.classification === "system_owner" || authority.classification === "proprietor");
    const managementAuthority = protectedAuthority
      || workspace?.management_access === true
      || institutionalModules.system_administration === true
      || hasAny(permissions, "access.manage", "central_registry.administer", "staff_management.administer", "system_administration.administer");
    const app = (appCode: string, moduleKey = appCode) => protectedAuthority || appCodes.has(appCode) || institutionalModules[moduleKey] === true;
    const moduleAccess: Record<WorkspaceModuleKey, boolean> = {
      profile: app("staff_self_service", "workspace"),
      centralRegistry: managementAuthority,
      results: app("results"),
      attendance: app("attendance"),
      notifications: app("notifications"),
      resources: app("resources"),
      reports: protectedAuthority || institutionalModules.reports === true || hasAny(permissions, "reports.view", "reports.export"),
      website: protectedAuthority || institutionalModules.website_management === true || hasAny(permissions, "public_website_content.view", "public_website_content.create", "public_website_content.edit", "public_website_content.publish"),
      systemAdministration: managementAuthority || hasAny(permissions, "system_administration.view"),
    };
    const roleNames = workspace?.roles?.map((role) => role.role_name).filter(Boolean) || [];
    const roleCodes = new Set(workspace?.roles?.map((role) => role.role_code) || []);
    return { permissions, moduleAccess, roleNames, roleCodes, protectedAuthority, assignedModules: Object.entries(moduleAccess).filter(([key, value]) => key !== "profile" && value).length };
  }, [workspace]);

  if (checking) return <main id="main-content" className="workspaceGate"><p>Preparing your School Portal…</p></main>;
  if (!workspace || !authenticated) return <main id="main-content" className="workspaceGate"><section><p className="eyebrow">WAY TO SUCCESS SCHOOL PORTAL</p><h1>Sign in is required.</h1><p>{error || "This portal does not display school records until an active staff identity is verified."}</p><Link className="primaryButton" href="/portal/sign-in">Sign in to Staff Portal</Link></section></main>;

  const summary = workspace.summary;
  const person = summary?.person || workspace.person;
  const fullName = person?.full_name || workspace.person?.full_name || "Way to Success staff member";
  const context = summary?.academic_context;
  const moduleSummaries = summary?.module_summaries || {};
  const classTeacher = summary?.class_teacher;
  const subjectTeacher = summary?.subject_teacher;
  const assignments = subjectTeacher?.assignments || summary?.subject_assignments || [];
  const admin = summary?.administrator_dashboard;
  const roles = access.roleNames.length ? access.roleNames.join(" · ") : "Authorised staff member";
  const grantedModules = access.moduleAccess;
  const moduleSummary = (key: string, fallback: string) => moduleSummaries[key]?.summary || fallback;
  const classTeacherAssignments = classTeacher?.assignments || [];
  const showClassTeacherSection = Boolean(classTeacher?.available || access.roleCodes.has("class_teacher") || classTeacherAssignments.length);
  const showSubjectSection = Boolean(grantedModules.results && (subjectTeacher?.available || assignments.length || access.roleCodes.has("subject_teacher")));
  const hasSpecialistModules = Object.entries(grantedModules).some(([key, value]) => key !== "profile" && value);

  return <main id="main-content" className="workspaceLivePage">
    <div className="workspaceShell">
      <aside id="workspace-navigation" className={`workspaceSidebar ${navOpen ? "isOpen" : ""}`} aria-label="School Portal navigation">
        <div className="workspaceSidebarBrand"><Link className="workspaceBrand" href="/"><img className="workspaceBrandLogo" src="/images/logo.webp" alt="Way to Success Standard Schools logo" /><strong>School Portal</strong></Link><button className="workspaceNavClose" type="button" onClick={() => setNavOpen(false)} aria-label="Close portal navigation">×</button></div>
        <p className="workspaceSidebarNote">Your school view</p>
        <nav onClick={() => setNavOpen(false)}>
          <a href="#overview">Overview</a>
          <a href="#responsibilities">My Work</a>
          {grantedModules.results ? <a href="#results">Results</a> : null}
          {grantedModules.attendance ? <a href="#attendance">Attendance</a> : null}
          {grantedModules.notifications ? <a href="#notifications">Notifications</a> : null}
          {hasSpecialistModules ? <a href="#modules">School functions</a> : null}
        </nav>
        <div className="workspaceSidebarFooter"><span>Current academic context</span><strong>{context?.session || "Session unavailable"}</strong><small>{context?.term || "Term unavailable"}</small><button type="button" className="workspaceSignOut" onClick={() => void signOut()}>Sign out</button></div>
      </aside>

      <section className="workspaceMain">
        <div className="workspaceMobileBar"><Link className="workspaceBrand" href="/"><img className="workspaceBrandLogo" src="/images/logo.webp" alt="Way to Success Standard Schools logo" /><strong>School Portal</strong></Link><button type="button" className="workspaceMenuButton" onClick={() => setNavOpen((current) => !current)} aria-expanded={navOpen} aria-controls="workspace-navigation">{navOpen ? "Close" : "Menu"}</button></div>
        <header id="overview" className="workspaceTopbar"><div><p className="workspaceOverline">SCHOOL PORTAL</p><h1>{greeting}, {firstName(fullName)}.</h1><p className="workspaceTopbarIntro">Your school dashboard brings together your identity, My Work and authorised school functions.</p></div><button className="workspaceRefreshButton" type="button" onClick={() => void refresh()} disabled={checking}><span aria-hidden="true">↻</span>{checking ? "Refreshing…" : "Refresh view"}</button></header>

        <section className="workspaceIdentityCard" id="identity" aria-labelledby="identity-heading">
          <div className="workspaceIdentityPhoto">{person?.photo_url ? <img src={person.photo_url} alt={`${fullName} staff photograph`} /> : <span aria-label="No approved staff photograph">{initials(fullName)}</span>}</div>
          <div className="workspaceIdentityMain"><p className="workspaceCardKicker">STAFF IDENTITY</p><h2 id="identity-heading">{fullName}</h2><p className="workspaceIdentityRole">{person?.designation || person?.staff_category || "Official position not recorded"}{person?.department ? ` · ${person.department}` : ""}</p><span className="workspaceEmploymentStatus"><i aria-hidden="true" />{formatLabel(person?.employment_status)}</span>{person?.photo_url ? null : <EmptyState>No photograph has been approved.</EmptyState>}</div>
          <div className="workspaceIdentityFacts"><div><span>Staff number</span><strong>{person?.staff_number || "Not assigned"}</strong></div><div><span>Employment</span><strong>{formatLabel(person?.employment_status)}</strong></div><div><span>Session</span><strong>{context?.session || "Not available"}</strong></div><div><span>Term</span><strong>{context?.term || "Not available"}</strong></div></div>
        </section>

        <section className="workspaceMetricGrid" aria-label="School Portal summary"><Metric label="Available services" value={formatCount(access.assignedModules)} tone="mint" /><Metric label="Class-teacher assignments" value={formatCount(classTeacherAssignments.length)} tone="gold" /><Metric label="Subject assignments" value={formatCount(assignments.length)} tone="blue" /><Metric label="Current context" value={`${context?.session || "—"} · ${context?.term || "—"}`} tone="mint" /></section>
        <section className="workspaceContextBanner" aria-label="Official academic context"><div><p className="workspaceCardKicker">OFFICIAL ACADEMIC CONTEXT</p><h2>{context?.session || "Session unavailable"}<span> · </span>{context?.term || "Term unavailable"}</h2></div><p>Managed in Central Registry. This context is read-only in the School Portal.</p></section>

        <section id="responsibilities" className="workspaceSection" aria-labelledby="responsibilities-heading"><div className="workspaceSectionHeading"><div><p className="workspaceOverline">MY WORK</p><h2 id="responsibilities-heading">Only the work connected to you.</h2></div><p>Assignments are filtered by the active access held by your signed-in account. No unrelated classes or school-wide figures are added here.</p></div>
          {showClassTeacherSection ? <div className="workspaceRoleSection"><div className="workspaceRoleHeading"><div><p className="workspaceCardKicker">CLASS-TEACHER VIEW</p><h3>Class overview</h3></div><span className="workspaceRoleBadge">{classTeacherAssignments.length ? `${classTeacherAssignments.length} active class${classTeacherAssignments.length === 1 ? "" : "es"}` : "No active assignment"}</span></div>{classTeacherAssignments.length ? <div className="workspaceClassGrid">{classTeacherAssignments.map((overview) => <ClassOverviewCard key={overview.class_key} overview={overview} launchHref={resultPortalUrl} showResults={grantedModules.results} showAttendance={grantedModules.attendance} showRegistry={grantedModules.centralRegistry} showNotifications={grantedModules.notifications} />)}</div> : <EmptyState>{classTeacher?.message || "No class-teacher assignment is currently active."}</EmptyState>}</div> : null}
          {showSubjectSection ? <div className="workspaceRoleSection"><div className="workspaceRoleHeading"><div><p className="workspaceCardKicker">SUBJECT-TEACHER VIEW</p><h3>Subject responsibilities</h3></div><span className="workspaceRoleBadge">{assignments.length ? `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}` : "No current subjects"}</span></div>{assignments.length ? <div className="workspaceAssignmentGrid">{assignments.map((assignment) => <SubjectAssignmentCard key={`${assignment.class_key}-${assignment.subject_index}`} assignment={assignment} />)}</div> : <EmptyState>{subjectTeacher?.message || "No subject assignment has been recorded for this term."}</EmptyState>}</div> : null}
          {grantedModules.attendance ? <PersonalAttendanceCard attendance={summary?.staff_attendance} /> : null}
          {!showClassTeacherSection && !showSubjectSection ? <div className="workspaceNoAssignment"><p className="workspaceCardKicker">CURRENT ASSIGNMENTS</p><h3>No current class or subject assignment is recorded.</h3><p>When an authorised assignment is active for this term, its read-only summary will appear here.</p></div> : null}
        </section>

        {admin?.available && (grantedModules.centralRegistry || grantedModules.results || grantedModules.attendance || grantedModules.notifications || grantedModules.reports || grantedModules.systemAdministration) ? <section className="workspaceSection workspaceAdminSection" aria-labelledby="admin-heading"><div className="workspaceSectionHeading"><div><p className="workspaceOverline">AUTHORISED ADMINISTRATION</p><h2 id="admin-heading">School overview.</h2></div><p>This broader view is visible only because the active identity is authorised for management oversight.</p></div><div className="workspaceAdminMetrics"><Metric label="Active pupils" value={formatCount(admin.active_pupils)} tone="mint" /><Metric label="Active staff" value={formatCount(admin.active_staff)} tone="blue" /><Metric label="Missing-score alerts" value={formatCount(admin.missing_score_alerts)} tone="gold" /><Metric label="Registry issues" value={formatCount(admin.registry?.incomplete_records)} tone="mint" /></div>{admin.attendance_management ? <div className="workspaceAdminMetrics"><Metric label="Staff present today" value={formatCount(admin.attendance_management.staff_present_today)} tone="mint" /><Metric label="Staff absent today" value={formatCount(admin.attendance_management.staff_absent_today)} tone="gold" /><Metric label="Staff late today" value={formatCount(admin.attendance_management.staff_late_today)} tone="blue" /><Metric label="Pupils present today" value={formatCount(admin.attendance_management.pupils_present_today)} tone="mint" /><Metric label="Pupils absent today" value={formatCount(admin.attendance_management.pupils_absent_today)} tone="gold" /><Metric label="Incomplete registers" value={formatCount(admin.attendance_management.classes_with_incomplete_registers)} tone="blue" /></div> : null}<div className="workspaceAdminPanels"><article className="workspacePanel"><p className="workspaceCardKicker">REPORT-CARD READINESS</p><h3>{admin.report_card_readiness?.available ? `${formatCount(admin.report_card_readiness.classes_ready)} classes ready` : "Not available"}</h3><p>{admin.report_card_readiness?.available ? `${formatCount(admin.report_card_readiness.classes_incomplete)} classes remain incomplete.` : "No report-card readiness summary is available."}</p></article><article className="workspacePanel"><p className="workspaceCardKicker">ATTENDANCE OVERVIEW</p><h3>{admin.attendance_overview?.available ? `${formatCount(admin.attendance_overview.absent_pupils_today)} pupils absent today` : "No records yet"}</h3><p>{admin.attendance_management?.message || admin.attendance_overview?.message || "No attendance records have been recorded for the current date."}</p></article><article className="workspacePanel"><p className="workspaceCardKicker">DEVICE / IMPORT HEALTH</p><h3>{admin.attendance_management?.device_import_health?.available ? `${formatCount(admin.attendance_management.device_import_health.healthy_devices)} of ${formatCount(admin.attendance_management.device_import_health.registered_devices)} devices healthy` : "Not available"}</h3><p>{admin.attendance_management?.device_import_health?.available ? `${formatCount(admin.attendance_management.device_import_health.pending_imports)} pending imports.` : "Attendance device and import health is not available."}</p></article><article className="workspacePanel"><p className="workspaceCardKicker">PUBLICATION STATUS</p><h3>{admin.publication?.available ? `${formatCount(admin.publication.published_subjects)} of ${formatCount(admin.publication.expected_subjects)} subjects published` : "Not available"}</h3><p>Publication actions remain inside the specialist Result module.</p></article></div>{admin.class_overviews?.length ? <details className="workspaceAdminClasses"><summary>View authorised class summaries</summary><div className="workspaceClassGrid">{admin.class_overviews.map((overview) => <ClassOverviewCard key={overview.class_key} overview={overview} launchHref={resultPortalUrl} showResults={grantedModules.results} showAttendance={grantedModules.attendance} showRegistry={grantedModules.centralRegistry} showNotifications={grantedModules.notifications} />)}</div></details> : null}</section> : null}

        {hasSpecialistModules ? <section id="modules" className="workspaceSection workspaceModulesSection" aria-labelledby="modules-heading"><div className="workspaceSectionHeading"><div><p className="workspaceOverline">SCHOOL FUNCTIONS</p><h2 id="modules-heading">Your school functions.</h2></div><p>Only functions assigned to this staff identity appear here. Your school portal keeps the entry points together.</p></div><div className="workspaceModuleGrid">
          {staffPortalModules.filter((module) => grantedModules[module.key]).map((module) => <ModuleCard key={module.key} id={module.key} title={module.title} icon={module.icon} status={module.status} description={module.description} summary={moduleSummary(module.summaryKey, module.summaryFallback)} href={module.href} />)}
        </div></section> : null}

        {grantedModules.notifications ? <section id="notifications" className="workspaceNoticeBand"><div><p className="workspaceCardKicker">NOTIFICATIONS</p><h3>School messages</h3></div><EmptyState>{moduleSummary("notifications", "Notification summaries are not yet available.")}</EmptyState></section> : null}
        <footer className="workspaceFooter"><span>Way to Success School Portal</span><span>Read-only summaries · {context?.session || "current session"} · {context?.term || "current term"}</span><button type="button" onClick={() => void signOut()}>Sign out</button></footer>
      </section>
    </div>
  </main>;
}

function hasAny(values: Set<string>, ...items: string[]) {
  return items.some((item) => values.has(item));
}
