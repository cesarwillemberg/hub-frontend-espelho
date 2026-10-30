"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  radius?: string;
}

export function Skeleton({
  className,
  width,
  height,
  radius,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "mh-dash-skeleton",
        !width && "w-full",
        !height && "h-full",
        !radius && "rounded-sm",
        className,
      )}
      style={{
        ...(width ? { width } : null),
        ...(height ? { height } : null),
        ...(radius ? { borderRadius: radius } : null),
      }}
      {...props}
    />
  );
}

interface SkeletonTextProps {
  className?: string;
  count?: number;
  height?: string;
}

export function SkeletonText({ className, count = 3, height = "0.875rem" }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="mh-dash-skeleton-text"
          style={{ width: i === count - 1 ? "60%" : "100%", height }}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  className?: string;
  size?: string;
}

export function SkeletonCircle({ className, size = "2.5rem" }: SkeletonCircleProps) {
  return (
    <div
      className={cn("mh-dash-skeleton-circle", className)}
      style={{ width: size, height: size }}
    />
  );
}
