"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const content = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Keep persistent layouts mounted while the route fades in.
    const animation = content.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
    return () => animation?.cancel();
  }, [pathname]);

  return <div ref={content} className="w-full min-h-screen">{children}</div>;
}
