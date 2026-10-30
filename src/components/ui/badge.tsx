"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "positive" | "negative" | "warning" | "info";
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "mh-dash-badge",
        {
          "mh-dash-badge--default": variant === "default",
          "mh-dash-badge--positive": variant === "positive",
          "mh-dash-badge--negative": variant === "negative",
          "mh-dash-badge--warning": variant === "warning",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}
