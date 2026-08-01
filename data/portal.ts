export type PortalServiceStatus = "available" | "in-development" | "planned" | "preview" | "first-integration-target";

export type PortalService = {
  title: string;
  description: string;
  status: PortalServiceStatus;
  href: string;
  actionLabel: string;
  external?: boolean;
};

export type PortalGroup = {
  id: string;
  label: string;
  title: string;
  description: string;
  services: PortalService[];
};

export const portalGroups: PortalGroup[] = [
  {
    id: "staff-workspace",
    label: "01 · Staff Workspace",
    title: "Staff Workspace",
    description: "For teachers and authorised school employees. Existing Central Registry identities are checked before only their authorised workspace modules are shown.",
    services: [
      {
        title: "Staff Workspace",
        description: "Sign in with an existing authorised staff identity to view your assigned classes, subjects and available work modules.",
        status: "available",
        href: "/portal/sign-in",
        actionLabel: "Sign in to workspace",
      },
      {
        title: "Attendance module",
        description: "Staff attendance tasks will be introduced after authorised access and the attendance-system integration are ready.",
        status: "in-development",
        href: "/workspace/staff#attendance",
        actionLabel: "View planned module",
      },
      {
        title: "Notifications module",
        description: "School notices and communication tasks will appear only after the communications integration is approved.",
        status: "in-development",
        href: "/workspace/staff#notifications",
        actionLabel: "View planned module",
      },
    ],
  },
  {
    id: "management-workspace",
    label: "02 · Management Workspace",
    title: "Management Workspace",
    description: "For the proprietor, principal, vice principal and authorised administrators. Management access is shown only after an explicit Central Registry permission check.",
    services: [
      {
        title: "Management Workspace",
        description: "Open the authorised management workspace after staff sign-in. Modules remain limited to the permissions assigned by management.",
        status: "available",
        href: "/workspace/management",
        actionLabel: "Open management workspace",
      },
      {
        title: "Results Administration",
        description: "The existing Result Portal is the first specialist system to inspect and connect through a protected route.",
        status: "first-integration-target",
        href: "/workspace/management#results-administration",
        actionLabel: "View integration target",
      },
      {
        title: "Central Registry, Attendance and Notifications",
        description: "These specialist systems remain in development for routine school use and are not presented as daily operational pathways here.",
        status: "in-development",
        href: "/workspace/management#planned-modules",
        actionLabel: "View planned modules",
      },
    ],
  },
  {
    id: "result-management",
    label: "03 · Result Management",
    title: "Result Management",
    description: "The existing Result Portal is the only specialist system currently proven in normal school operations. It remains a separately protected system while unified access is prepared.",
    services: [
      {
        title: "Existing Result Portal",
        description: "Available from the Staff or Management Workspace after your active Central Registry identity and Results grant have been checked.",
        status: "available",
        href: "/portal/sign-in",
        actionLabel: "Sign in to access results",
      },
      {
        title: "Unified results access",
        description: "A one-login route will follow only after role mapping, privacy controls and a secure integration contract are approved.",
        status: "planned",
        href: "/workspace/management#results-administration",
        actionLabel: "View planned approach",
      },
    ],
  },
];

export const portalStatusLabels: Record<PortalServiceStatus, string> = {
  available: "Available",
  "in-development": "In development",
  planned: "Planned",
  preview: "Preview only",
  "first-integration-target": "First integration target",
};
