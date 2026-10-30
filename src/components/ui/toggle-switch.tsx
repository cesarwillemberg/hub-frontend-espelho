"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onCheckedChange,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = () => {
    if (!disabled) onCheckedChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-surface-muted ring-1 ring-border",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 text-[7px] font-bold tracking-wide transition-opacity",
          checked ? "text-white/80" : "opacity-0",
        )}
      >
        ON
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-1 text-[7px] font-bold tracking-wide transition-opacity",
          checked ? "opacity-0" : "text-muted-foreground",
        )}
      >
        OFF
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform",
          checked ? "translate-x-6" : "translate-x-0",
        )}
      />
    </button>
  );
}
