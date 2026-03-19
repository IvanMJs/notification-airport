"use client";

import { useState } from "react";
import { Hotel, Pencil, Trash2, X, Plus } from "lucide-react";
import { Accommodation } from "@/lib/types";

// ── Labels subset ─────────────────────────────────────────────────────────────

export type AccommodationLabels = {
  accNamePlaceholder: string;
  accCheckIn:         string;
  accCheckOut:        string;
  accRemove:          string;
  accEdit:            string;
  accSave:            string;
  accCancel:          string;
  accNights:          (n: number) => string;
  accErrName:         string;
  accAdd:             string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function estimateArrivalDate(isoDate: string, departureTime: string, arrivalBuffer: number): string {
  if (departureTime && departureTime >= "20:00" && arrivalBuffer >= 2) {
    const d = new Date(isoDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return isoDate;
}

export function nightsBetween(isoA: string, isoB: string): number {
  return Math.round(
    (new Date(isoB + "T00:00:00").getTime() - new Date(isoA + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

// ── AccommodationInline ───────────────────────────────────────────────────────

export function AccommodationInline({
  acc,
  checkInDate,
  checkOutDate,
  locale,
  onRemove,
  onEdit,
  L,
}: {
  acc: Accommodation;
  checkInDate: string;
  checkOutDate?: string;
  locale: "es" | "en";
  onRemove: () => void;
  onEdit: (name: string, checkInTime?: string, checkOutTime?: string) => void;
  L: AccommodationLabels;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(acc.name);
  const [editCheckIn, setEditCheckIn] = useState(acc.checkInTime ?? "");
  const [editCheckOut, setEditCheckOut] = useState(acc.checkOutTime ?? "");
  const nights = checkOutDate ? nightsBetween(checkInDate, checkOutDate) : null;
  const inputCls = "flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/60 transition-colors";

  // suppress unused variable warning for locale (kept for API consistency)
  void locale;

  if (editing) {
    return (
      <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder={L.accNamePlaceholder}
          className={inputCls + " w-full"}
          onKeyDown={(e) => { if (e.key === "Enter") { onEdit(editName.trim(), editCheckIn || undefined, editCheckOut || undefined); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-gray-600 mb-1">{L.accCheckIn}</p>
            <input type="time" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-600 mb-1">{L.accCheckOut}</p>
            <input type="time" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onEdit(editName.trim(), editCheckIn || undefined, editCheckOut || undefined); setEditing(false); }}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-1.5 text-xs font-medium text-white transition-colors"
          >{L.accSave}</button>
          <button onClick={() => setEditing(false)} className="px-3 rounded-lg border border-white/[0.08] py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">{L.accCancel}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
      <Hotel className="h-3.5 w-3.5 text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{acc.name}</p>
        <p className="text-[11px] text-gray-500">
          {acc.checkInTime ? `Check-in ${acc.checkInTime}` : "Check-in"}
          {acc.checkOutTime ? ` · Check-out ${acc.checkOutTime}` : ""}
          {nights !== null ? (
            <span className="text-gray-600 ml-1.5">· {L.accNights(nights)}</span>
          ) : null}
        </p>
      </div>
      <button onClick={() => setEditing(true)} title={L.accEdit} className="shrink-0 p-1 rounded-md text-gray-600 hover:text-blue-400 transition-colors">
        <Pencil className="h-3 w-3" />
      </button>
      <button onClick={onRemove} title={L.accRemove} className="shrink-0 p-1 rounded-md text-gray-600 hover:text-red-400 transition-colors">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── AddAccommodationInlineForm ────────────────────────────────────────────────

export function AddAccommodationInlineForm({
  destCity,
  onAdd,
  onClose,
  locale,
  L,
}: {
  destCity: string;
  onAdd: (name: string, checkInTime?: string, checkOutTime?: string) => void;
  onClose: () => void;
  locale: "es" | "en";
  L: AccommodationLabels;
}) {
  const [name, setName]             = useState("");
  const [checkInTime, setCheckInTime]   = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [err, setErr]               = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) { setErr(L.accErrName); return; }
    onAdd(name.trim(), checkInTime || undefined, checkOutTime || undefined);
    onClose();
  }

  const inputCls = "flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/60 transition-colors";

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
          <Hotel className="h-3 w-3" />
          {locale === "es" ? `Hotel en ${destCity}` : `Hotel in ${destCity}`}
        </span>
        <button onClick={onClose} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => { setName(e.target.value); setErr(null); }}
        placeholder={L.accNamePlaceholder}
        className={inputCls + " w-full"}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-gray-600 mb-1">{L.accCheckIn}</p>
          <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputCls} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-600 mb-1">{L.accCheckOut}</p>
          <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputCls} />
        </div>
      </div>
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        {L.accAdd}
      </button>
    </div>
  );
}
