/**
 * The one public integration registry for the school platform.
 *
 * Production currently uses the Vercel origins below. Every origin is
 * environment-overridable so the future portal hostname can be introduced by
 * changing deployment configuration and the approved Supabase SSO client
 * values, not by rewriting launcher components.
 */

export type PortalModuleKey =
  | "centralRegistry"
  | "results"
  | "attendance"
  | "notifications"
  | "resources"
  | "reports"
  | "website"
  | "systemAdministration";

export type PortalModuleStatus = "operational" | "under-development" | "protected" | "unavailable";
export type PortalSsoMethod = "pkce" | "central-session" | "none";
export type PortalVisibilityRule = "grant" | "management" | "permission" | "institutional";

export type PortalModuleDefinition = {
  key: PortalModuleKey;
  code: string;
  displayName: string;
  description: string;
  icon: string;
  productionOrigin?: string;
  launchRoute?: string | null;
  ssoMethod: PortalSsoMethod;
  requiredCentralModuleGrant?: string;
  operationalStatus: PortalModuleStatus;
  visibilityRule: PortalVisibilityRule;
  displayOrder: number;
  summaryContract?: {
    source: "workspace-summary";
    key: string;
    access: "read-only";
  };
  callbackRoute: string | null;
  logoutReturnRoute: string | null;
  launchable: boolean;
};

export type PortalSsoClientDefinition = {
  clientId: string;
  moduleCode: string;
  target: string;
  redirectUri: string;
  postLogoutUri: string;
  scope: string;
  codeChallengeMethod: "S256";
};

const DEFAULT_ORIGINS = {
  portal: "https://wts-school-platform.vercel.app",
  results: "https://wts-result-system.vercel.app",
  attendance: "https://wts-attendance-system.vercel.app",
  centralRegistry: "https://wts-central-registry.vercel.app",
  notifications: "https://wts-notification-system.vercel.app",
  publicSite: "https://waytosuccessschools.com",
} as const;

function configuredOrigin(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function optionalOrigin(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  return configuredOrigin(candidate, "");
}

function requiredUri(origin: string, route: string) {
  return new URL(route, `${origin}/`).toString();
}

export const portalOrigins = Object.freeze({
  portal: configuredOrigin(process.env.NEXT_PUBLIC_PORTAL_ORIGIN, DEFAULT_ORIGINS.portal),
  results: configuredOrigin(process.env.NEXT_PUBLIC_RESULTS_ORIGIN, DEFAULT_ORIGINS.results),
  attendance: configuredOrigin(process.env.NEXT_PUBLIC_ATTENDANCE_ORIGIN, DEFAULT_ORIGINS.attendance),
  centralRegistry: configuredOrigin(process.env.NEXT_PUBLIC_CENTRAL_REGISTRY_ORIGIN, DEFAULT_ORIGINS.centralRegistry),
  notifications: configuredOrigin(process.env.NEXT_PUBLIC_NOTIFICATIONS_ORIGIN, DEFAULT_ORIGINS.notifications),
  resources: optionalOrigin(process.env.NEXT_PUBLIC_RESOURCES_ORIGIN),
  publicSite: configuredOrigin(process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN, DEFAULT_ORIGINS.publicSite),
});

export const staffPortalHost = (
  process.env.NEXT_PUBLIC_STAFF_PORTAL_HOST?.trim() || "portal.waytosuccessschools.com"
).toLowerCase();

export function isStaffPortalHost(hostname: string) {
  return hostname.toLowerCase() === staffPortalHost;
}

export const portalLogoutReturnUri = requiredUri(portalOrigins.portal, "/workspace");

export const portalSsoClients = Object.freeze({
  result_portal: {
    clientId: "result_portal",
    moduleCode: "results",
    target: "results",
    redirectUri: requiredUri(portalOrigins.results, "/portal_core.html"),
    postLogoutUri: portalLogoutReturnUri,
    scope: "results",
    codeChallengeMethod: "S256",
  },
  attendance: {
    clientId: "attendance",
    moduleCode: "attendance",
    target: "attendance",
    redirectUri: requiredUri(portalOrigins.attendance, "/"),
    postLogoutUri: portalLogoutReturnUri,
    scope: "attendance",
    codeChallengeMethod: "S256",
  },
} satisfies Readonly<Record<string, PortalSsoClientDefinition>>);

const unsortedPortalModuleRegistry: PortalModuleDefinition[] = [
  {
    key: "centralRegistry",
    code: "central_registry",
    displayName: "Administration",
    description: "Authorised management access to the school’s identity, assignments and administration service.",
    icon: "◎",
    productionOrigin: portalOrigins.centralRegistry,
    launchRoute: "/",
    ssoMethod: "central-session",
    requiredCentralModuleGrant: "central_registry",
    operationalStatus: "protected",
    visibilityRule: "management",
    displayOrder: 10,
    summaryContract: { source: "workspace-summary", key: "central_registry", access: "read-only" },
    callbackRoute: null,
    logoutReturnRoute: "/workspace",
    launchable: true,
  },
  {
    key: "results",
    code: "results",
    displayName: "Results",
    description: "Open the specialist Results service for score entry, review, report cards and publication.",
    icon: "▦",
    productionOrigin: portalOrigins.results,
    launchRoute: "/portal_core.html?sso=1",
    ssoMethod: "pkce",
    requiredCentralModuleGrant: "results",
    operationalStatus: "operational",
    visibilityRule: "grant",
    displayOrder: 20,
    summaryContract: { source: "workspace-summary", key: "results", access: "read-only" },
    callbackRoute: "/portal_core.html",
    logoutReturnRoute: "/workspace",
    launchable: true,
  },
  {
    key: "attendance",
    code: "attendance",
    displayName: "Attendance",
    description: "Open the live Attendance service through the school’s secure sign-in.",
    icon: "✓",
    productionOrigin: portalOrigins.attendance,
    launchRoute: "/?sso=1",
    ssoMethod: "pkce",
    requiredCentralModuleGrant: "attendance",
    operationalStatus: "operational",
    visibilityRule: "grant",
    displayOrder: 30,
    summaryContract: { source: "workspace-summary", key: "attendance", access: "read-only" },
    callbackRoute: "/",
    logoutReturnRoute: "/workspace",
    launchable: true,
  },
  {
    key: "notifications",
    code: "notifications",
    displayName: "Notifications",
    description: "School messages will appear here when the Notification handoff is operational.",
    icon: "◌",
    productionOrigin: portalOrigins.notifications,
    launchRoute: "/",
    ssoMethod: "central-session",
    requiredCentralModuleGrant: "notifications",
    operationalStatus: "under-development",
    visibilityRule: "grant",
    displayOrder: 40,
    summaryContract: { source: "workspace-summary", key: "notifications", access: "read-only" },
    callbackRoute: null,
    logoutReturnRoute: "/workspace",
    launchable: false,
  },
  {
    key: "resources",
    code: "resources",
    displayName: "Resources",
    description: "Resources will appear when the existing Resources System is connected to the school platform.",
    icon: "◇",
    productionOrigin: portalOrigins.resources,
    launchRoute: null,
    ssoMethod: "none",
    requiredCentralModuleGrant: "resources",
    operationalStatus: "unavailable",
    visibilityRule: "grant",
    displayOrder: 50,
    summaryContract: { source: "workspace-summary", key: "resources", access: "read-only" },
    callbackRoute: null,
    logoutReturnRoute: null,
    launchable: false,
  },
  {
    key: "reports",
    code: "reports",
    displayName: "Reports",
    description: "Open authorised reporting work inside the specialist Results service.",
    icon: "↗",
    productionOrigin: portalOrigins.results,
    launchRoute: "/portal_core.html?sso=1",
    ssoMethod: "pkce",
    requiredCentralModuleGrant: "results",
    operationalStatus: "protected",
    visibilityRule: "permission",
    displayOrder: 60,
    summaryContract: { source: "workspace-summary", key: "reports", access: "read-only" },
    callbackRoute: "/portal_core.html",
    logoutReturnRoute: "/workspace",
    launchable: true,
  },
  {
    key: "website",
    code: "website_management",
    displayName: "Website Management",
    description: "Website actions remain inside the protected management service.",
    icon: "⌂",
    ssoMethod: "none",
    operationalStatus: "protected",
    visibilityRule: "permission",
    displayOrder: 70,
    summaryContract: { source: "workspace-summary", key: "website_management", access: "read-only" },
    callbackRoute: null,
    logoutReturnRoute: null,
    launchable: false,
  },
  {
    key: "systemAdministration",
    code: "system_administration",
    displayName: "System Administration",
    description: "Protected school access and system controls remain inside Administration.",
    icon: "⚙",
    productionOrigin: portalOrigins.centralRegistry,
    launchRoute: "/",
    ssoMethod: "central-session",
    requiredCentralModuleGrant: "central_registry",
    operationalStatus: "protected",
    visibilityRule: "institutional",
    displayOrder: 80,
    summaryContract: { source: "workspace-summary", key: "system_administration", access: "read-only" },
    callbackRoute: null,
    logoutReturnRoute: "/workspace",
    launchable: true,
  },
];

export const portalModuleRegistry: readonly PortalModuleDefinition[] = unsortedPortalModuleRegistry.sort(
  (left, right) => left.displayOrder - right.displayOrder,
);

export function getPortalModule(key: PortalModuleKey | string) {
  return portalModuleRegistry.find((module) => module.key === key || module.code === key);
}

export function getModuleLaunchUrl(key: PortalModuleKey | string) {
  const module = getPortalModule(key);
  if (!module?.launchable || !module.productionOrigin || !module.launchRoute) return undefined;
  return requiredUri(module.productionOrigin, module.launchRoute);
}
