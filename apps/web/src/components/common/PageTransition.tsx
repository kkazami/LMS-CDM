"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.25,
          ease: "easeOut",
        }}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
