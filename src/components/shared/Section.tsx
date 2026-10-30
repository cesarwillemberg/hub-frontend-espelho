import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("mh-section", className)} {...props} />;
}
