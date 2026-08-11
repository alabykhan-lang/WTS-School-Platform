import { getModuleLaunchUrl, portalModuleRegistry, type PortalModuleKey, type PortalModuleStatus } from "./portal-config";

export type StaffPortalModuleKey = PortalModuleKey;

export type StaffPortalModuleDefinition = {
  key: StaffPortalModuleKey;
  title: string;
  icon: string;
  description: string;
  summaryKey: string;
  summaryFallback: string;
  href?: string;
  status: PortalModuleStatus;
};

/**
 * Compatibility view for the Workspace renderer. The integration registry is
 * authoritative; this view only adapts its fields to the existing card UI.
 */
export const staffPortalModules: readonly StaffPortalModuleDefinition[] = portalModuleRegistry.map((module) => ({
  key: module.key,
  title: module.displayName,
  icon: module.icon,
  description: module.description,
  summaryKey: module.summaryContract?.key || module.code,
  summaryFallback: module.description,
  href: getModuleLaunchUrl(module.key),
  status: module.operationalStatus,
}));
