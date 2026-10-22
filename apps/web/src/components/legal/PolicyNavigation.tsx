"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { policyHref, policyReturnTo } from "@/lib/policy-navigation";

export function PolicyLink({ href, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <Link {...props} href={policyHref(href, pathname, params.toString())} />;
}

export function PolicyBackLink() {
  const params = useSearchParams();
  const returnTo = policyReturnTo(params.get('returnTo'));
  const label = returnTo.startsWith('/#') || returnTo === '/' ? 'Back to landing page' : returnTo.split(/[?#]/)[0].endsWith('/profile') ? 'Back to your profile' : returnTo.startsWith('/login') ? 'Back to sign in' : 'Back to previous page';
  // Load the destination document so its section anchor survives the page transition.
  return <a href={returnTo} className="inline-block py-2 text-sm font-semibold underline underline-offset-4">{label}</a>;
}
