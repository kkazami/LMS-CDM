import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";
import { terms } from "@/lib/legal-content";

export const metadata: Metadata = { title: "Terms and Conditions | CdM LMS", description: terms.introduction };

export default function TermsPage() {
  return <PolicyPage document={terms} />;
}
