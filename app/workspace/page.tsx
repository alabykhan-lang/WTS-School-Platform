import type { Metadata } from "next";
import { WorkspaceClient } from "../_components/PortalWorkspaceClient";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Authorised Staff Workspace",
    description: "Authorised WTS Staff and Management Workspace.",
    path: "/workspace",
    image: "/images/campus2.webp",
    imageAlt: "A view across the Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <WorkspaceClient requestedView="overview" />;
}
