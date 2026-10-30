"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8", className)}>
      {icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-surface-muted mb-4 text-muted-foreground">
          <FontAwesomeIcon icon={icon} className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
