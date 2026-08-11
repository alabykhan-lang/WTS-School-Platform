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
  {
    id: "attendance",
    title: "Attendance",
    description: "A connected specialist service for pupil and staff attendance across the school day.",
    benefit: "Supports accurate registers, absence awareness and stronger pastoral follow-up.",
    status: "available",
    icon: "A",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "A developing communication service for clear, purposeful school updates.",
    benefit: "Helps the school community receive important information in the right place.",
    status: "in-development",
    icon: "N",
  },
  {
    id: "resources",
    title: "Resources",
    description: "A planned school resource service that will be connected when a real operational deployment is available.",
    benefit: "Keeps future resources discoverable without presenting unavailable data as live.",
    status: "planned",
    icon: "◇",
  },
  {
    id: "reports",
    title: "Reports",
    description: "A planned home for trusted summaries that help authorised leaders make informed decisions.",
    benefit: "Turns connected school information into useful, responsible insight.",
    status: "planned",
    icon: "▤",
  },
  {
    id: "future-modules",
    title: "Future school services",
    description: "Additional services will be introduced carefully as they become ready for the school community.",
    benefit: "Creates room for the platform to grow without making access confusing.",
    status: "planned",
    icon: "+",
  },
];

export const portalStatusLabels: Record<PortalServiceStatus, string> = {
  available: "Operational",
  "in-development": "Coming online",
  planned: "Planned",
};
