export type PortalServiceStatus = "available" | "in-development" | "planned" | "preview";

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
    id: "wts-workspace",
    label: "ONE AUTHENTICATED DESTINATION",
    title: "WTS Staff and Management Portal",
    description: "One protected workspace for authorised school employees. The modules shown after sign-in come from the real permissions assigned by management; management is not a separate workspace.",
    services: [
      {
        title: "WTS Workspace",
        description: "Sign in with your existing WTS staff identity. The same destination adjusts automatically for your active grants and never invents access, records or dashboard figures.",
        status: "available",
        href: "/portal/sign-in",
        actionLabel: "Sign in to WTS Workspace",
      },
      {
        title: "Results",
        description: "The existing Result Portal remains operational and is offered from the unified workspace after the current Results grant is checked.",
        status: "available",
        href: "/portal/sign-in",
        actionLabel: "Sign in for authorised Results access",
      },
      {
        title: "Central Registry, Attendance and Notifications",
        description: "These real services remain protected and permission-driven. Central Registry is under continued development in the unified flow; Attendance and Notifications are in development.",
        status: "in-development",
        href: "/portal/sign-in",
        actionLabel: "View WTS Workspace status",
      },
    ],
  },
];

export const portalStatusLabels: Record<PortalServiceStatus, string> = {
  available: "Available",
  "in-development": "In development",
  planned: "Planned",
  preview: "Preview only",
};
