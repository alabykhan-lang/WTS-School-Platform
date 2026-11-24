import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_SESSION_COOKIE } from "../api/workspace-session/_lib";
import { ProprietorAssistant } from "../_components/ProprietorAssistant";

export const metadata: Metadata = {
  title: "Proprietor Assistant",
  description: "Private Way to Success school administration assistant.",
  robots: { index: false, follow: false },
};

export default async function AssistantPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(WORKSPACE_SESSION_COOKIE) && process.env.NODE_ENV === "production") redirect("/portal/sign-in?return_to=%2Fassistant");
  return <ProprietorAssistant />;
}
