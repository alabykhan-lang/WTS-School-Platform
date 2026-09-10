export type PortalServiceStatus = "available" | "in-development" | "planned";

export type PortalService = {
  id: string;
  title: string;
  description: string;
  benefit: string;
  status: PortalServiceStatus;
  icon: string;
};

export const portalServices: PortalService[] = [
  {
    id: "administration",
    title: "Administration",
    description: "Protected management access to the school’s authoritative identity, assignments and access service.",
    benefit: "Keeps school information organised while management authority remains protected.",
    status: "available",
    icon: "R",
  },
  {
    id: "results",
    title: "Results",
    description: "A focused Result service for score entry, report-card preparation and academic publishing.",
    benefit: "Helps teachers and school leaders keep academic records accurate and timely.",
    status: "available",
    icon: "∑",
  },
];

/**
 * Kept as an internal catalogue so future modules can be restored deliberately
 * when they are ready. This list is not rendered by the public portal.
 */
export const portalServicesNotYetPublished: PortalService[] = [
  {
    id: "attendance",
    title: "Attendance",
    description: "An unreleased attendance service.",
    benefit: "Will support school-day registers when released.",
    status: "in-development",
    icon: "A",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "An unreleased notification service.",
    benefit: "Will support school communication when released.",
    status: "in-development",
    icon: "N",
  },
  {
    id: "resources",
    title: "Resources",
    description: "A future school resource service.",
    benefit: "Will be introduced when an operational deployment is ready.",
    status: "planned",
    icon: "◇",
  },
];

export const portalStatusLabels: Record<PortalServiceStatus, string> = {
  available: "Operational",
  "in-development": "Coming online",
  planned: "Planned",
};
