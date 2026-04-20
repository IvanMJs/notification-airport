import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "neutral";

const PULSE_COLOR: Record<Tone, string> = {
  ok:      "bg-green-400",
  warn:    "bg-orange-400",
  danger:  "bg-red-500",
  neutral: "bg-gray-500",
};

interface RadarDotProps {
  tone: Tone;
  size?: "sm" | "md";
  ringColor?: string;
}

export function RadarDot({ tone, size = "md", ringColor = "#080810" }: RadarDotProps) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span className={cn("relative flex shrink-0", dim)}>
      {/* Outer expanding ring */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full animate-[radarPulse_2.2s_ease-out_infinite]",
          PULSE_COLOR[tone],
        )}
      />
      {/* Middle ring — offset phase */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full animate-[radarPulse_2.2s_ease-out_infinite] [animation-delay:1.1s]",
          PULSE_COLOR[tone],
        )}
      />
      {/* Solid core */}
      <span
        className={cn("relative inline-flex rounded-full", dim, PULSE_COLOR[tone])}
        style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
      />
    </span>
  );
}
