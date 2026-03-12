"use client";

export default function ProgressRing({
  percentage,
  size = 80,
  stroke = 6,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "var(--foreground)"
      : percentage >= 50
        ? "var(--subtle)"
        : "var(--muted)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          stroke="var(--border)"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-sm font-medium" style={{ color }}>
        {percentage}%
      </span>
    </div>
  );
}
