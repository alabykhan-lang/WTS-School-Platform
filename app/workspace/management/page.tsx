import type { Metadata } from "next";
import { WorkspaceClient } from "../../_components/PortalWorkspaceClient";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Management Workspace",
    description: "Authorised WTS school management workspace.",
    path: "/workspace/management",
    image: "/images/campus1.webp",
    imageAlt: "Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function ManagementWorkspacePage() {
  return <WorkspaceClient requestedView="management" />;
}
