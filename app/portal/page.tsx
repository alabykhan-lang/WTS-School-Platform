import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_SESSION_COOKIE } from "../api/workspace-session/_lib";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Staff Portal",
  description: "One clear staff entrance to the connected Way to Success Standard Schools services.",
  path: "/portal",
  image: "/images/campus2.webp",
  imageAlt: "A view across the Way to Success Standard Schools campus",
  keywords: ["WTS School Systems", "Way to Success staff portal", "Way to Success Standard Schools"],
});

export default async function PortalPage() {
  const cookieStore = await cookies();
  redirect(cookieStore.has(WORKSPACE_SESSION_COOKIE) ? "/workspace" : "/portal/sign-in");
}
