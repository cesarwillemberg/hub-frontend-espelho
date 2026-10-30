"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: IconProp;
  supportText?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  supportText,
  href,
  onClick,
  className,
}: KpiCardProps) {
  const displayValue = String(value);
  const isLink = !!href;

  const card = (
    <div
      className={cn(
        "mh-dash-card p-5",
        isLink ? "cursor-pointer group" : "",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-foreground">
            <FontAwesomeIcon icon={icon} className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground tracking-tight">
          {displayValue}
        </span>
      </div>

      {supportText && (
        <p className="text-xs text-muted-foreground mt-2">{supportText}</p>
      )}
    </div>
  );

  if (isLink) {
    return (
      <Link href={href!} onClick={onClick} className={cn("block", className)}>
        {card}
      </Link>
    );
  }

  return card;
}
