export type WorkspaceModuleStatus = "available" | "in-development" | "planned" | "preview" | "first-integration-target";

export type WorkspaceModule = {
  id: string;
  title: string;
  description: string;
  status: WorkspaceModuleStatus;
  detail: string;
};

export type WorkspaceRole = {
  id: string;
  title: string;
  summary: string;
  authorisedModules: string[];
};

export const workspaceStatusLabels: Record<WorkspaceModuleStatus, string> = {
  available: "Available",
  "in-development": "In development",
  planned: "Planned",
  preview: "Preview only",
  "first-integration-target": "First integration target",
};

export const staffWorkspaceModules: WorkspaceModule[] = [
  {
    id: "profile",
    title: "My staff profile",
    description: "A future view of the employee profile held in the authorised staff directory.",
    status: "preview",
    detail: "Preview data only — no staff profile is connected.",
  },
  {
    id: "assigned-classes",
    title: "Assigned classes",
    description: "Class access will be based on verified assignments for the active school session.",
    status: "preview",
    detail: "No live class assignment is connected.",
  },
  {
    id: "assigned-subjects",
    title: "Assigned subjects",
    description: "Subject permissions will be granted independently from the staff role.",
    status: "preview",
    detail: "No live subject assignment is connected.",
  },
  {
    id: "result-submission",
    title: "Score entry and submission",
    description: "Results work will open only for approved classes and subjects after the Result Portal contract is ready.",
    status: "first-integration-target",
    detail: "No score-entry or result-submission status is connected.",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Attendance tasks will be introduced through the future attendance integration.",
    status: "in-development",
    detail: "The attendance module is not connected in this preview.",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Approved school announcements and staff communication will appear through the future communications integration.",
    status: "in-development",
    detail: "No live notifications are connected.",
  },
];

export const managementWorkspaceModules: WorkspaceModule[] = [
  {
    id: "central-registry",
    title: "Central Registry",
    description: "The future authority for student, guardian and staff identity records once its security and integration contract are confirmed.",
    status: "in-development",
    detail: "Not presented as a routine management workspace in this rollout.",
  },
  {
    id: "staff-management",
    title: "Staff Management",
    description: "Role grants, staff records and workspace permissions will follow the Registry integration.",
    status: "planned",
    detail: "Prepared as a role-limited management module.",
  },
  {
    id: "results-administration",
    title: "Results Administration",
    description: "The existing Result Portal is the first specialist system to inspect and connect through a protected route.",
    status: "first-integration-target",
    detail: "Current specialist login remains separate until a secure unified-entry plan is approved.",
  },
  {
    id: "attendance-monitoring",
    title: "Attendance Monitoring",
    description: "Attendance reports, device oversight and exceptions will appear after the attendance integration is ready.",
    status: "in-development",
    detail: "No attendance events or reports are displayed here.",
  },
  {
    id: "notification-management",
    title: "Notification Management",
    description: "Templates, approvals and delivery history will remain inside an authorised communications service.",
    status: "in-development",
    detail: "No messages, contacts or delivery records are displayed here.",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Cross-system reporting will follow the approved data contracts and release rules.",
    status: "planned",
    detail: "No operational metrics are connected in this preview.",
  },
  {
    id: "public-website-content",
    title: "Public Website Content",
    description: "A future publishing workflow for authorised school updates and public information.",
    status: "planned",
    detail: "The public website has no connected management dashboard in this phase.",
  },
  {
    id: "system-settings",
    title: "System Settings",
    description: "A future place for authorised platform-wide settings, protected by elevated permissions and audit history.",
    status: "planned",
    detail: "No settings are editable from this preview.",
  },
];

export const workspaceRoles: WorkspaceRole[] = [
  {
    id: "teacher",
    title: "Teacher",
    summary: "Views only their approved classes, subjects, score-entry tasks, profile and school announcements.",
    authorisedModules: ["Assigned classes", "Assigned subjects", "Score entry", "Staff profile", "School announcements"],
  },
  {
    id: "class-teacher",
    title: "Class Teacher",
    summary: "Receives Teacher access plus approved class-level responsibilities and results follow-up for the assigned class.",
    authorisedModules: ["Teacher access", "Class responsibility", "Approved class results follow-up", "Class announcements"],
  },
  {
    id: "principal",
    title: "Principal",
    summary: "Oversees approved school operations, result administration, staff responsibilities and reports without unrestricted system control.",
    authorisedModules: ["Results Administration", "Staff Management", "Reports", "Public Website Content"],
  },
  {
    id: "vice-principal",
    title: "Vice Principal",
    summary: "Receives delegated academic and operational oversight determined by the school’s explicit role grants.",
    authorisedModules: ["Results Administration", "Assigned reports", "Staff responsibilities", "Approved announcements"],
  },
  {
    id: "proprietor",
    title: "Proprietor",
    summary: "Has executive oversight modules approved by school governance, with auditable access to sensitive actions.",
    authorisedModules: ["Executive reports", "Results Administration", "Staff Management", "System oversight"],
  },
  {
    id: "registry-administrator",
    title: "Registry Administrator",
    summary: "Maintains authorised identity, admissions and guardian records in the Central Registry service.",
    authorisedModules: ["Central Registry", "Admissions records", "Guardian records", "Staff identity records"],
  },
  {
    id: "results-administrator",
    title: "Results Administrator",
    summary: "Administers approved results workflows, release controls and report-card production.",
    authorisedModules: ["Results Administration", "Result-release controls", "Report cards", "Broadsheets"],
  },
  {
    id: "attendance-administrator",
    title: "Attendance Administrator",
    summary: "Manages authorised attendance devices, exceptions and reports without access to unrelated school modules.",
    authorisedModules: ["Attendance Monitoring", "Device administration", "Attendance reports"],
  },
  {
    id: "communications-administrator",
    title: "Communications Administrator",
    summary: "Prepares approved communications, templates and delivery follow-up under consent and role controls.",
    authorisedModules: ["Notification Management", "Approved templates", "Delivery status", "Public Website Content"],
  },
  {
    id: "super-administrator",
    title: "Super Administrator",
    summary: "Holds tightly controlled platform-administration access, with elevated actions recorded and reviewed.",
    authorisedModules: ["Role grants", "Integration settings", "Security review", "Audit history"],
  },
];
