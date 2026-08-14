"use client";

interface ProgressRingProps {
  /** 0–100 percentage */
  percentage: number;
  /** Ring size in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Accent color */
  color?: string;
  /** Show percentage text in center */
  showText?: boolean;
}

export default function ProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4,
  color = "#6366f1",
  showText = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={
          {
            "--circumference": circumference,
            "--offset": offset,
          } as React.CSSProperties
        }
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{
            animation: "progressFill 0.8s ease-out forwards",
          }}
        />
      </svg>
      {showText && (
        <span
          className="absolute text-xs font-bold"
          style={{ color }}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
