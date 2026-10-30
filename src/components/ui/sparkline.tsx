"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  accentColor?: string;
  showPoints?: boolean;
}

export function Sparkline({
  data,
  className,
  accentColor = "var(--mh-chart-accent)",
  showPoints = true,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max === min ? 1 : max - min;
  const width = 64;
  const height = 24;
  const padding = 2;
  const step = (width - padding * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      const x = padding + i * step;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={cn("mh-dash-sparkline block", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label="Mini gráfico de variação"
    >
      <polyline
        points={points}
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />
      {showPoints &&
        data.map((v, i) => {
          const y = height - padding - ((v - min) / range) * (height - padding * 2);
          const x = padding + i * step;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill={accentColor}
              opacity="0.9"
            />
          );
        })}
    </svg>
  );
}
