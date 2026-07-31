import type { Metadata } from "next";
import { WorkspaceOverview } from "../_components/WorkspacePreview";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Workspace Preview",
    description: "Preview the future role-based WTS Staff and Management Workspace structure.",
    path: "/workspace",
    image: "/images/campus2.webp",
    imageAlt: "A view across the Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <WorkspaceOverview />;
}
