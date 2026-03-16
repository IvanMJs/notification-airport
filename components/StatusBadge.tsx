"use client";

import { DelayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatusBadgeProps {
  status: DelayStatus;
  className?: string;
}

const STYLE: Record<DelayStatus, { emoji: string; classes: string }> = {
  ok:               { emoji: "✅", classes: "bg-green-900/40 text-green-300 border border-green-600" },
  delay_minor:      { emoji: "🟡", classes: "bg-yellow-900/40 text-yellow-300 border border-yellow-600" },
  delay_moderate:   { emoji: "🟠", classes: "bg-orange-900/40 text-orange-300 border border-orange-500" },
  delay_severe:     { emoji: "🔴", classes: "bg-red-900/40 text-red-300 border border-red-500" },
  ground_delay:     { emoji: "🔴", classes: "bg-red-900/50 text-red-200 border border-red-600" },
  ground_stop:      { emoji: "🛑", classes: "bg-red-950/60 text-red-200 border border-red-700" },
  closure:          { emoji: "⛔", classes: "bg-gray-900/60 text-gray-300 border border-gray-500" },
  unknown:          { emoji: "❓", classes: "bg-gray-800/40 text-gray-400 border border-gray-600" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useLanguage();
  const { emoji, classes } = STYLE[status] ?? STYLE.unknown;

  const label: Record<DelayStatus, string> = {
    ok:             t.statusOk,
    delay_minor:    t.statusMinor,
    delay_moderate: t.statusModerate,
    delay_severe:   t.statusSevere,
    ground_delay:   t.statusGroundDelay,
    ground_stop:    t.statusGroundStop,
    closure:        t.statusClosure,
    unknown:        t.statusUnknown,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        classes,
        className
      )}
    >
      {emoji} {label[status]}
    </span>
  );
}
