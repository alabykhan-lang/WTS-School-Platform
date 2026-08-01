import type { Metadata } from "next";
import { WorkspaceClient } from "../../_components/PortalWorkspaceClient";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Staff Workspace",
    description: "Authorised WTS staff workspace.",
    path: "/workspace/staff",
    image: "/images/classroom.webp",
    imageAlt: "A classroom at Way to Success Standard Schools",
  }),
  robots: { index: false, follow: false },
};

export default function StaffWorkspacePage() {
  return <WorkspaceClient requestedView="staff" />;
}
