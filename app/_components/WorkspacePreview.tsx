import Link from "next/link";
import {
  managementWorkspaceModules,
  staffWorkspaceModules,
  workspaceRoles,
  workspaceStatusLabels,
  type WorkspaceModule,
  type WorkspaceModuleStatus,
} from "../../data/workspace";

type WorkspaceKind = "staff" | "management";

function WorkspaceStatus({ status }: { status: WorkspaceModuleStatus }) {
  return <span className={`workspaceStatus workspaceStatus--${status}`}>{workspaceStatusLabels[status]}</span>;
}

function WorkspaceNavigation({ active }: { active: "overview" | WorkspaceKind }) {
  return (
    <aside className="workspaceSidebar" aria-label="Workspace preview navigation">
      <Link className="workspaceBrand" href="/portal"><span>WTS</span><strong>Workspace preview</strong></Link>
      <p className="workspaceSidebarNote">Demonstration only</p>
      <nav>
        <Link className={active === "overview" ? "isActive" : undefined} aria-current={active === "overview" ? "page" : undefined} href="/workspace">Workspace overview</Link>
        <Link className={active === "staff" ? "isActive" : undefined} aria-current={active === "staff" ? "page" : undefined} href="/workspace/staff">Staff Workspace</Link>
        <Link className={active === "management" ? "isActive" : undefined} aria-current={active === "management" ? "page" : undefined} href="/workspace/management">Management Workspace</Link>
      </nav>
      <div className="workspaceSidebarFooter"><span>Authentication</span><strong>Not connected</strong><Link href="/portal">Back to Portal Gateway</Link></div>
    </aside>
  );
}

function PreviewHeader({ kind }: { kind: WorkspaceKind }) {
  const isStaff = kind === "staff";
  return (
    <header className="workspacePreviewHeader">
      <div><p className="eyebrow">{isStaff ? "STAFF WORKSPACE" : "MANAGEMENT WORKSPACE"}</p><h1>{isStaff ? "A focused day at school, prepared safely." : "A clearer view of authorised school management."}</h1></div>
      <div className="workspacePreviewPill"><span>Preview data</span><strong>Not connected to live systems</strong></div>
    </header>
  );
}

function ModuleCard({ module }: { module: WorkspaceModule }) {
  return <article className="workspaceModule" id={module.id}><WorkspaceStatus status={module.status} /><h3>{module.title}</h3><p>{module.description}</p><span>{module.detail}</span></article>;
}

export function StaffWorkspacePreview() {
  return (
    <main id="main-content" className="workspacePage">
      <div className="workspaceFrame"><WorkspaceNavigation active="staff" /><section className="workspaceContent"><PreviewHeader kind="staff" />
        <section className="workspaceWelcome" aria-label="Preview first-login summary"><div><p className="eyebrow">WELCOME AREA</p><h2>Welcome, <span>Preview Staff Name</span></h2><p>Teacher · Preview role</p></div><dl><div><dt>Current session</dt><dd>Preview data — not connected</dd></div><div><dt>Current term</dt><dd>Preview data — not connected</dd></div></dl></section>
        <section className="workspaceSplit"><article><p className="eyebrow">SCHOOL ANNOUNCEMENTS</p><h2>Nothing is connected yet.</h2><p>No live announcements are loaded in this preview. Approved school announcements will appear here after the communications integration is ready.</p></article><article><p className="eyebrow">PENDING RESPONSIBILITIES</p><h2>Safe empty state.</h2><p>No live responsibilities are displayed. Future tasks will be driven by verified role, class and subject assignments.</p></article></section>
        <section className="workspaceSection" aria-labelledby="staff-modules-heading"><div className="workspaceSectionHead"><div><p className="eyebrow">INTENDED TOOLS</p><h2 id="staff-modules-heading">Your authorised work, in one place.</h2></div><p>Every item remains a preview or planned integration until the correct authentication, role grants and data contracts are approved.</p></div><div className="workspaceModuleGrid">{staffWorkspaceModules.map((module) => <ModuleCard key={module.id} module={module} />)}</div></section>
      </section></div>
    </main>
  );
}

export function ManagementWorkspacePreview() {
  return (
    <main id="main-content" className="workspacePage">
      <div className="workspaceFrame"><WorkspaceNavigation active="management" /><section className="workspaceContent"><PreviewHeader kind="management" />
        <section className="workspaceWelcome" aria-label="Preview management overview"><div><p className="eyebrow">MANAGEMENT OVERVIEW</p><h2>Authorised modules, <span>prepared by role.</span></h2><p>Preview management workspace · No live statistics or records</p></div><dl><div><dt>Current session</dt><dd>Preview data — not connected</dd></div><div><dt>Current term</dt><dd>Preview data — not connected</dd></div></dl></section>
        <section className="workspaceSplit"><article><p className="eyebrow">SENSITIVE DATA</p><h2>Protected by design.</h2><p>This shell intentionally shows no student, guardian, staff, attendance, financial or result records.</p></article><article><p className="eyebrow">FIRST SPECIALIST TARGET</p><h2>Results Administration.</h2><p>The Result Portal is the first operational specialist system to connect through a protected route, after its access model is strengthened.</p></article></section>
        <section className="workspaceSection" id="planned-modules" aria-labelledby="management-modules-heading"><div className="workspaceSectionHead"><div><p className="eyebrow">INTENDED MANAGEMENT MODULES</p><h2 id="management-modules-heading">Oversight without overexposure.</h2></div><p>Each module will be visible only to a verified role with an explicit authorisation grant. Being management does not automatically give access to every system.</p></div><div className="workspaceModuleGrid">{managementWorkspaceModules.map((module) => <ModuleCard key={module.id} module={module} />)}</div></section>
      </section></div>
    </main>
  );
}

export function WorkspaceOverview() {
  return (
    <main id="main-content" className="workspacePage">
      <div className="workspaceFrame"><WorkspaceNavigation active="overview" /><section className="workspaceContent"><header className="workspacePreviewHeader"><div><p className="eyebrow">FUTURE ROLE-BASED WORKSPACE</p><h1>One future entrance. The right tools for each responsibility.</h1></div><div className="workspacePreviewPill"><span>Preview structure</span><strong>No sign-in or live data</strong></div></header>
        <section className="workspaceOverviewLead"><div><p className="eyebrow">ROLE MODEL</p><h2>Access will be deliberate, not automatic.</h2></div><p>When unified access is approved, one verified school identity will open only the modules authorised for that person’s role, responsibility and current assignment.</p></section>
        <section className="workspaceRoleGrid" aria-label="Prepared workspace roles">{workspaceRoles.map((role) => <article key={role.id}><h2>{role.title}</h2><p>{role.summary}</p><ul>{role.authorisedModules.map((module) => <li key={module}>{module}</li>)}</ul></article>)}</section>
        <section className="workspaceNext"><div><p className="eyebrow">NEXT INTEGRATION</p><h2>Start with protected Result Management.</h2><p>The existing Result Portal remains separate during this preparation phase. A secure external link is the first integration method; shared authentication and data access follow only after security and role mapping are approved.</p></div><Link className="primaryButton" href="/portal">Return to Portal Gateway</Link></section>
      </section></div>
    </main>
  );
}
