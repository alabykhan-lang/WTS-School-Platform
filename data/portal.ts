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
    description: "For teachers and authorised school employees. The preview shows the intended role-aware workspace without requesting credentials or displaying live school records.",
    services: [
      {
        title: "Staff Workspace preview",
        description: "Explore the planned first-login experience for classes, subjects, score-entry access, responsibilities and school communication.",
        status: "preview",
        href: "/workspace/staff",
        actionLabel: "View staff preview",
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
    description: "For the proprietor, principal, vice principal and authorised administrators. This preview prepares the intended management modules and least-privilege role structure.",
    services: [
      {
        title: "Management Workspace preview",
        description: "Review the planned command centre for registry, results, attendance, notifications, reports and school-platform settings.",
        status: "preview",
        href: "/workspace/management",
        actionLabel: "View management preview",
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
        description: "Available to authorised users through its current protected entry route. Its exact future unified entry route is being confirmed before wider workspace integration.",
        status: "available",
        href: "https://wts-result-system.vercel.app/",
        actionLabel: "Open Result Portal",
        external: true,
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
