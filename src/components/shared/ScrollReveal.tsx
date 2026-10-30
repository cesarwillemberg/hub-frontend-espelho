"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  eager?: boolean;
}

export function ScrollReveal({ children, delay = 0, eager = false }: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion ? false : { opacity: 0, y: 28 };
  const visible = { opacity: 1, y: 0 };
  const transition = { duration: shouldReduceMotion ? 0 : 0.6, delay, ease: "easeOut" as const };

  if (eager) return <motion.div initial={initial} animate={visible} transition={transition}>{children}</motion.div>;
  return <motion.div initial={initial} whileInView={visible} viewport={{ once: true, amount: 0.2 }} transition={transition}>{children}</motion.div>;
}
