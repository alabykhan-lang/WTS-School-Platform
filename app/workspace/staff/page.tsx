import type { Metadata } from "next";
import { StaffWorkspacePreview } from "../../_components/WorkspacePreview";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Staff Workspace Preview",
    description: "Preview the future WTS Staff Workspace without authentication or live school data.",
    path: "/workspace/staff",
    image: "/images/classroom.webp",
    imageAlt: "A classroom at Way to Success Standard Schools",
  }),
  robots: { index: false, follow: false },
};

export default function StaffWorkspacePage() {
  return <StaffWorkspacePreview />;
}
