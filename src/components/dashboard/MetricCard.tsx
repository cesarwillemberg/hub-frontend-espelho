"use client";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
}

export function MetricCard({ title, value, subtitle, trend, trendPositive }: MetricCardProps) {
  return (
    <div className={cn("bg-surface border border-border rounded-xl p-5 shadow-sm")}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      </div>
      {trend !== undefined && (
        <p className={cn("text-xs mt-1", trendPositive ? "text-positive" : "text-destructive")}>
          {trendPositive ? "▲ " : "▼ "}{trend}
        </p>
      )}
    </div>
  );
}
