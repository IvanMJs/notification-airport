"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";

interface DepartureChecklistProps {
  flightId: string;
  /** True for international flights (3h lead time), false for domestic (2h) */
  isInternational: boolean;
  locale: "es" | "en";
}

interface ChecklistItem {
  id: string;
  labelEs: string;
  labelEn: string;
}

function getItems(isInternational: boolean): ChecklistItem[] {
  const hours = isInternational ? 3 : 2;
  return [
    {
      id: "checkin",
      labelEs: "Hacer check-in online",
      labelEn: "Check in online",
    },
    {
      id: "boarding-pass",
      labelEs: "Descargar boarding pass",
      labelEn: "Download boarding pass",
    },
    {
      id: "id-doc",
      labelEs: "Verificar documento de identidad",
      labelEn: "Verify identity document",
    },
    {
      id: "arrive-early",
      labelEs: `Llegar con ${hours}h de anticipación`,
      labelEn: `Arrive ${hours}h before departure`,
    },
  ];
}

function storageKey(flightId: string): string {
  return `departure-checklist-${flightId}`;
}

function loadChecked(flightId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(flightId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveChecked(flightId: string, checked: Record<string, boolean>): void {
  try {
    localStorage.setItem(storageKey(flightId), JSON.stringify(checked));
  } catch {
    // ignore storage errors
  }
}

export function DepartureChecklist({ flightId, isInternational, locale }: DepartureChecklistProps) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const items = getItems(isInternational);

  useEffect(() => {
    setChecked(loadChecked(flightId));
  }, [flightId]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecked(flightId, next);
  }

  const completedCount = items.filter(item => checked[item.id]).length;
  const allDone = completedCount === items.length;

  return (
    <div className="px-4 py-3 border-t border-white/5 bg-slate-950/30">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {locale === "es" ? "Checklist de salida" : "Departure checklist"}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            allDone
              ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-400"
              : "bg-white/[0.04] border-white/10 text-gray-500"
          }`}>
            {completedCount}/{items.length}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-3 w-3 text-gray-600 shrink-0" />
          : <ChevronDown className="h-3 w-3 text-gray-600 shrink-0" />
        }
      </button>

      {open && (
        <ul className="mt-2.5 space-y-2">
          {items.map(item => {
            const isDone = !!checked[item.id];
            const label = locale === "es" ? item.labelEs : item.labelEn;
            return (
              <li key={item.id}>
                <button
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-2.5 w-full text-left group"
                >
                  {isDone
                    ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <Square className="h-4 w-4 text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" />
                  }
                  <span className={`text-xs transition-colors ${
                    isDone ? "line-through text-gray-600" : "text-gray-300 group-hover:text-gray-200"
                  }`}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
