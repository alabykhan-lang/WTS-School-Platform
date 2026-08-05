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
    id: "central-registry",
    title: "Central Registry",
    description: "The school’s trusted foundation for staff identity, pupil records and authorised access.",
    benefit: "Keeps school information organised and access carefully assigned.",
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
    description: "A developing view of pupil and staff attendance across the school day.",
    benefit: "Supports early awareness of absence and stronger pastoral follow-up.",
    status: "in-development",
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
