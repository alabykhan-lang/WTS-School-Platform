"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getModuleLaunchUrl } from "../../data/portal-config";

type WorkspaceGrant = {
  app_code?: string;
  permissions?: string[];
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

type ClassAssignment = {
  class_key?: string;
  class_name?: string | null;
  display_name?: string | null;
};

type SubjectAssignment = {
  class_key?: string;
  class_name?: string | null;
  display_name?: string | null;
  subject_index?: number;
  subject_name?: string | null;
};

type WorkspaceSummary = {
  person?: WorkspacePerson;
  institutional_authority?: { active?: boolean; classification?: string };
  academic_context?: { session?: string | null; term?: string | null };
  class_teacher?: { available?: boolean; assignments?: ClassAssignment[] };
  subject_teacher?: { available?: boolean; assignments?: SubjectAssignment[] };
  subject_assignments?: SubjectAssignment[];
};

type Workspace = {
  ok: boolean;
  person?: WorkspacePerson;
  roles?: Array<{ role_code?: string; role_name?: string }>;
  grants?: WorkspaceGrant[];
  summary?: WorkspaceSummary | null;
  institutional_authority?: { active?: boolean; classification?: string };
  institutional_modules?: Record<string, boolean>;
  management_access?: boolean;
};

const resultsUrl = getModuleLaunchUrl("results");
const centralRegistryUrl = getModuleLaunchUrl("centralRegistry");
const attendanceUrl = getModuleLaunchUrl("attendance");
const notificationsUrl = getModuleLaunchUrl("notifications");

function friendlyError(code?: string) {
  const messages: Record<string, string> = {
    STAFF_SESSION_REQUIRED: "Your Staff Portal session has ended. Sign in again to continue.",
    STAFF_SESSION_NOT_ACTIVE: "Your Staff Portal session has ended. Sign in again to continue.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have Staff Portal access.",
    IDENTITY_SERVICE_UNAVAILABLE: "The school identity service is temporarily unavailable. Please try again shortly.",
  };
  return messages[code || ""] || "The Staff Portal could not load your school view. Please try again.";
}

async function readWorkspace() {
  const response = await fetch("/api/workspace", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as Workspace;
}

function firstName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] || "there";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "WTS";
}

function readable(value: string | null | undefined, fallback = "Not provided") {
  if (!value) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hasAny(values: Set<string>, ...items: string[]) {
  return items.some((item) => values.has(item));
}

function ModuleAction({
  href,
  title,
  description,
  icon,
}: {
  href?: string;
  title: string;
  description: string;
  icon: string;
}) {
  if (!href) return null;
  return (
    <a className="staffPortalAction" href={href}>
      <span className="staffPortalActionIcon" aria-hidden="true">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="staffPortalActionArrow" aria-hidden="true">→</span>
    </a>
  );
}

export function StaffPortalClient() {
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
      const result = await readWorkspace();
      setWorkspace(result);
      setAuthenticated(true);
    } catch (requestError) {
      setWorkspace(null);
      setAuthenticated(false);
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
    await fetch("/api/workspace-session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    window.location.assign("/portal/sign-in");
  }

  const access = useMemo(() => {
    const grants = workspace?.grants || [];
    const activeGrants = grants.filter((grant) => {
      if (!grant.valid_until) return true;
      const expiry = Date.parse(grant.valid_until);
      return Number.isNaN(expiry) || expiry > Date.now();
    });
    const appCodes = new Set(activeGrants.map((grant) => grant.app_code).filter(Boolean) as string[]);
    const permissions = new Set(activeGrants.flatMap((grant) => grant.permissions || []));
    const authority = workspace?.institutional_authority || workspace?.summary?.institutional_authority;
    const institutionalModules = workspace?.institutional_modules || {};
    const roleCodes = new Set((workspace?.roles || []).map((role) => role.role_code).filter(Boolean) as string[]);
    const roleNames = (workspace?.roles || []).map((role) => role.role_name || "");
    const protectedAuthority = authority?.active === true && ["system_owner", "proprietor"].includes(authority.classification || "");
    const developer = protectedAuthority
      || hasAny(roleCodes, "developer", "system_owner", "proprietor")
      || [...roleNames, ...roleCodes].some((value) => /developer|system[ _-]?owner|proprietor/i.test(value));
    const management = developer
      || workspace?.management_access === true
      || institutionalModules.system_administration === true
      || hasAny(permissions, "access.manage", "central_registry.administer", "staff_management.administer", "system_administration.administer");

    return {
      developer,
      results: developer || appCodes.has("results") || institutionalModules.results === true,
      centralRegistry: developer || appCodes.has("central_registry") || management,
      attendance: developer || appCodes.has("attendance") || institutionalModules.attendance === true,
      notifications: developer || appCodes.has("notifications") || institutionalModules.notifications === true,
      roleNames: unique(roleNames),
    };
  }, [workspace]);

  if (checking) {
    return <main id="main-content" className="staffPortalGate"><p>Preparing your Staff Portal…</p></main>;
  }

  if (!workspace || !authenticated) {
    return (
      <main id="main-content" className="staffPortalGate">
        <section>
          <p className="eyebrow">WAY TO SUCCESS STAFF PORTAL</p>
          <h1>Sign in is required.</h1>
          <p>{error || "Sign in to view the school duties and services assigned to you."}</p>
          <div className="staffPortalGateActions">
            <Link className="primaryButton" href="/portal/sign-in">Sign in</Link>
            <Link className="secondaryButton" href="/portal/register">New staff registration</Link>
          </div>
          <button type="button" className="staffPortalRetry" onClick={() => void refresh()}>Try again</button>
        </section>
      </main>
    );
  }

  const summary = workspace.summary;
  const person = summary?.person || workspace.person || {};
  const fullName = person.full_name || "Way to Success staff member";
  const context = summary?.academic_context;
  const classAssignments = summary?.class_teacher?.assignments || [];
  const subjectAssignments = summary?.subject_teacher?.assignments || summary?.subject_assignments || [];
  const designation = person.designation || person.staff_category || access.roleNames[0] || "School staff";
  const classTeacherVisible = Boolean(summary?.class_teacher?.available || classAssignments.length);
  const subjectTeacherVisible = Boolean(summary?.subject_teacher?.available || subjectAssignments.length);
  const hasActions = Boolean((access.results && resultsUrl) || (access.centralRegistry && centralRegistryUrl));

  return (
    <main id="main-content" className="staffPortalPage">
      <div className="staffPortalShell">
        <header className="staffPortalHeader">
          <Link className="staffPortalBrand" href="/">
            <img src="/images/logo.webp" alt="Way to Success Standard Schools logo" />
            <span><strong>Staff Portal</strong><small>Way to Success Standard Schools</small></span>
          </Link>
          <button className="staffPortalMenuButton" type="button" onClick={() => setNavOpen((current) => !current)} aria-expanded={navOpen} aria-controls="staff-portal-navigation">
            {navOpen ? "Close" : "Menu"}
          </button>
          <nav id="staff-portal-navigation" className={`staffPortalNav ${navOpen ? "isOpen" : ""}`} aria-label="Staff Portal navigation">
            <a href="#overview" onClick={() => setNavOpen(false)}>Overview</a>
            <a href="#duties" onClick={() => setNavOpen(false)}>My duties</a>
            <a href="#school-actions" onClick={() => setNavOpen(false)}>School actions</a>
            <button type="button" onClick={() => void signOut()}>Sign out</button>
          </nav>
        </header>

        <section id="overview" className="staffPortalWelcome">
          <div className="staffPortalWelcomeCopy">
            <p className="eyebrow">STAFF PORTAL · {readable(context?.term, "Current term")}</p>
            <h1>{greeting}, {firstName(fullName)}.</h1>
            <p className="staffPortalLead">This is your one school entry point. Open the authorised service you need from here; your Staff Portal sign-in carries across without another module password.</p>
            <div className="staffPortalContext"><span>Academic session</span><strong>{context?.session || "Current session"}</strong></div>
          </div>
          <aside id="profile" className="staffPortalProfileCard" aria-label="Your staff profile">
            <div className="staffPortalAvatar">
              {person.photo_url ? <img src={person.photo_url} alt={`${fullName} profile`} /> : <span>{initials(fullName)}</span>}
            </div>
            <div className="staffPortalProfileMain">
              <p className="staffPortalKicker">YOUR PROFILE</p>
              <h2>{fullName}</h2>
              <p>{designation}</p>
            </div>
            <dl className="staffPortalProfileFacts">
              <div><dt>Staff number</dt><dd>{person.staff_number || "Not provided"}</dd></div>
              <div><dt>Department</dt><dd>{person.department || "Not provided"}</dd></div>
              <div><dt>Account</dt><dd>{readable(person.employment_status || person.registration_status, "Active")}</dd></div>
            </dl>
          </aside>
        </section>

        <section id="duties" className="staffPortalSection" aria-labelledby="duties-heading">
          <div className="staffPortalSectionHeading">
            <div><p className="staffPortalKicker">YOUR CURRENT DUTIES</p><h2 id="duties-heading">What you are responsible for.</h2></div>
            <p>These assignments come from the school’s central records and change when authorised management updates your portfolio.</p>
          </div>
          <div className="staffPortalDutyGrid">
            <article className="staffPortalDutyCard staffPortalDutyCard--portfolio">
              <span className="staffPortalDutyIcon" aria-hidden="true">P</span>
              <p className="staffPortalKicker">PORTFOLIO</p>
              <h3>{designation}</h3>
              <p>{access.roleNames.length ? access.roleNames.join(" · ") : "Your designated school duty"}</p>
            </article>
            <article className="staffPortalDutyCard">
              <span className="staffPortalDutyIcon" aria-hidden="true">C</span>
              <p className="staffPortalKicker">CLASS TEACHER</p>
              {classTeacherVisible ? <><h3>{classAssignments.length ? `${classAssignments.length} class${classAssignments.length === 1 ? "" : "es"}` : "Assigned"}</h3><ul>{classAssignments.map((assignment, index) => <li key={`${assignment.class_key || assignment.display_name || "class"}-${index}`}>{assignment.class_name || assignment.display_name || assignment.class_key || "Class assignment"}</li>)}</ul></> : <p className="staffPortalDutyEmpty">No class-teacher assignment is currently recorded.</p>}
            </article>
            <article className="staffPortalDutyCard">
              <span className="staffPortalDutyIcon" aria-hidden="true">S</span>
              <p className="staffPortalKicker">SUBJECT TEACHER</p>
              {subjectTeacherVisible ? <><h3>{subjectAssignments.length ? `${subjectAssignments.length} subject${subjectAssignments.length === 1 ? "" : "s"}` : "Assigned"}</h3><ul>{subjectAssignments.map((assignment, index) => <li key={`${assignment.class_key || "class"}-${assignment.subject_index || index}-${index}`}>{assignment.subject_name || assignment.display_name || "Subject"}{assignment.class_name || assignment.class_key ? <small> · {assignment.class_name || assignment.class_key}</small> : null}</li>)}</ul></> : <p className="staffPortalDutyEmpty">No subject-teacher assignment is currently recorded.</p>}
            </article>
          </div>
        </section>

        <section id="school-actions" className="staffPortalSection staffPortalActionsSection" aria-labelledby="actions-heading">
          <div className="staffPortalSectionHeading">
            <div><p className="staffPortalKicker">SCHOOL ACTIONS</p><h2 id="actions-heading">Choose where you need to work.</h2></div>
            <p>Only services authorised for this account are shown. Every action below opens through the same Staff Portal session.</p>
          </div>
          {hasActions ? <div className="staffPortalActionGrid">
            {access.results ? <ModuleAction href={resultsUrl} title="Results & academic performance" description="Enter, review and manage authorised academic results." icon="R" /> : null}
            {access.centralRegistry ? <ModuleAction href={centralRegistryUrl} title="School records & staff details" description="Update authorised school records, admissions or profile details." icon="S" /> : null}
          </div> : <p className="staffPortalEmptyAction">Your authorised school actions will appear here after management assigns them to your account.</p>}
          <div className="staffPortalProfileReminder"><span aria-hidden="true">i</span><p><strong>Need a profile change?</strong> Your Staff Portal profile is controlled from the school records. Use School Records when it is available, or contact authorised management.</p></div>
        </section>

        {access.developer ? <section className="staffPortalDeveloperSection" aria-labelledby="developer-heading">
          <div><p className="staffPortalKicker">DEVELOPER VIEW</p><h2 id="developer-heading">Unreleased services</h2><p>Visible only to protected developer or system-owner accounts while these services are being prepared.</p></div>
          <div className="staffPortalDeveloperLinks">
            {access.attendance && attendanceUrl ? <a href={attendanceUrl}>Attendance <span>↗</span></a> : null}
            {access.notifications && notificationsUrl ? <a href={notificationsUrl}>Notifications <span>↗</span></a> : null}
          </div>
        </section> : null}

        <footer className="staffPortalFooter"><span>Way to Success Staff Portal</span><span>{context?.session || "Current session"} · {context?.term || "Current term"}</span><button type="button" onClick={() => void signOut()}>Sign out</button></footer>
      </div>
    </main>
  );
}
