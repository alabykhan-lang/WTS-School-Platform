import type { Metadata } from "next";
import { ManagementWorkspacePreview } from "../../_components/WorkspacePreview";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Management Workspace Preview",
    description: "Preview the future WTS Management Workspace without authentication or live school data.",
    path: "/workspace/management",
    image: "/images/campus1.webp",
    imageAlt: "Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function ManagementWorkspacePage() {
  return <ManagementWorkspacePreview />;
}
