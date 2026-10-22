import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";
import { privacy } from "@/lib/legal-content";

export const metadata: Metadata = { title: "Privacy Policy | CdM LMS", description: privacy.introduction };

export default function PrivacyPage() {
  return <PolicyPage document={privacy} />;
}
