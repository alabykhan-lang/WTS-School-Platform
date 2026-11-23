import type { Metadata } from "next";
import { ProprietorAssistant } from "../_components/ProprietorAssistant";

export const metadata: Metadata = {
  title: "Proprietor Assistant",
  description: "Private Way to Success school administration assistant.",
  robots: { index: false, follow: false },
};

export default function AssistantPage() {
  return <ProprietorAssistant />;
}
