export type StaffPortalModuleKey =
  | "centralRegistry"
  | "results"
  | "attendance"
  | "notifications"
  | "reports"
  | "website"
  | "systemAdministration";

export type StaffPortalModuleDefinition = {
  key: StaffPortalModuleKey;
  title: string;
  icon: string;
  description: string;
  summaryKey: string;
  summaryFallback: string;
  href?: string;
  status: "operational" | "under-development" | "protected";
};

/**
 * The authenticated launcher is intentionally configuration-driven. Adding
 * a real future service means adding its approved definition and server-side
 * access contract; no dashboard layout rewrite or fake module is required.
 */
export const staffPortalModules: readonly StaffPortalModuleDefinition[] = [
  {
    key: "centralRegistry",
    title: "Central Registry",
    icon: "◎",
    status: "operational",
    description: "The school’s authoritative identity, employment and access service.",
    summaryKey: "central_registry",
    summaryFallback: "Identity, employment and access remain authoritative in Central Registry.",
    href: "https://wts-central-registry.vercel.app/",
  },
  {
    key: "results",
    title: "Results",
    icon: "▦",
    status: "operational",
    description: "Open the specialist Results service for score entry, review, report cards and publication.",
    summaryKey: "results",
    summaryFallback: "Your authorised Results responsibilities are summarised above.",
    href: "https://wts-result-system.vercel.app/portal_core.html?sso=1",
  },
  {
    key: "attendance",
    title: "Attendance",
    icon: "✓",
    status: "protected",
    description: "Open the live Attendance service through the school’s secure sign-in.",
    summaryKey: "attendance",
    summaryFallback: "Attendance summaries are connected to the live Attendance service.",
    href: "https://wts-attendance-system.vercel.app/",
  },
  {
    key: "notifications",
    title: "Notifications",
    icon: "◌",
    status: "under-development",
    description: "Review school messages and communications connected to your account.",
    summaryKey: "notifications",
    summaryFallback: "Notification summaries are not yet available.",
    href: "https://wts-notification-system.vercel.app/",
  },
  {
    key: "reports",
    title: "Reports",
    icon: "↗",
    status: "protected",
    description: "Open authorised reporting services when reporting access is available.",
    summaryKey: "reports",
    summaryFallback: "Report generation remains inside the authorised specialist Results service.",
    href: "https://wts-result-system.vercel.app/portal_core.html?sso=1",
  },
  {
    key: "website",
    title: "Website Management",
    icon: "⌂",
    status: "protected",
    description: "Website actions remain inside the protected management service.",
    summaryKey: "website_management",
    summaryFallback: "Website-management actions are not performed in the read-only Staff Portal.",
  },
  {
    key: "systemAdministration",
    title: "System Administration",
    icon: "⚙",
    status: "protected",
    description: "Protected school access and system controls.",
    summaryKey: "system_administration",
    summaryFallback: "System administration remains inside the protected access-management service.",
    href: "https://wts-central-registry.vercel.app/",
  },
];
