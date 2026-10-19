/**
 * Activities Route Layout — Eligibility Enforcement
 *
 * This server-side layout wraps ALL routes under /{institute}/activities/.
 * It enforces the ICS-only eligibility check at the routing layer, so
 * individual activity pages never need to remember to check.
 *
 * If a user is not authenticated → redirect to login.
 * If a user is authenticated but not eligible (wrong institute) → redirect
 * to their dashboard with a clean message, not a broken page.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities } from "@/lib/activity-eligibility";

export default async function ActivitiesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  // Not authenticated — redirect to login with institute context
  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // Authenticated but not eligible — redirect to their dashboard
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  if (!eligible) {
    // Redirect to the institute's dashboard root.
    // The user sees their normal dashboard, not a broken page or 403.
    // FUTURE: Consider adding a toast/flash message about ineligibility.
    redirect(`/${institute}`);
  }

  // Eligible — render the activity pages
  return <>{children}</>;
}
