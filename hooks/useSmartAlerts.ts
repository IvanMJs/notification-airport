import { useState, useEffect, useMemo, useCallback } from "react";
import { TripTab, AirportStatus } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SmartAlertType =
  | "departure_soon"
  | "gate_change"
  | "delay_active"
  | "checkin_reminder";

export type AlertUrgency = "info" | "warning" | "critical";

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  tripId: string;
  flightId: string;
  message: string;
  detail: string;
  urgency: AlertUrgency;
  timestamp: Date;
  icon: "Clock" | "AlertTriangle" | "CheckCircle" | "Navigation";
}

// ── Constants ────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "tc-dismissed-alerts";
const MAX_ALERTS = 5;
const URGENCY_ORDER: Record<AlertUrgency, number> = { critical: 0, warning: 1, info: 2 };

// ── Labels ───────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    departure_soon_message: (code: string) => `Salida próxima · ${code}`,
    departure_soon_detail: (mins: number, route: string) =>
      `Sale en ${mins} min · ${route}`,
    delay_active_message: (iata: string) => `Demoras en ${iata}`,
    delay_active_detail: (reason: string) => reason,
    checkin_reminder_message: (code: string) => `Check-in disponible · ${code}`,
    checkin_reminder_detail: (route: string, date: string) =>
      `Vuelo ${route} mañana · ${date}`,
    gate_change_message: (code: string) => `Cambio de puerta · ${code}`,
    gate_change_detail: (gate: string) => `Nueva puerta: ${gate}`,
  },
  en: {
    departure_soon_message: (code: string) => `Departing soon · ${code}`,
    departure_soon_detail: (mins: number, route: string) =>
      `Departs in ${mins} min · ${route}`,
    delay_active_message: (iata: string) => `Delays at ${iata}`,
    delay_active_detail: (reason: string) => reason,
    checkin_reminder_message: (code: string) => `Check-in open · ${code}`,
    checkin_reminder_detail: (route: string, date: string) =>
      `Flight ${route} tomorrow · ${date}`,
    gate_change_message: (code: string) => `Gate change · ${code}`,
    gate_change_detail: (gate: string) => `New gate: ${gate}`,
  },
};

// ── localStorage helpers ──────────────────────────────────────────────────────

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // fail silently
  }
}

// ── Urgency mapping for delay statuses ────────────────────────────────────────

function delayUrgency(status: AirportStatus["status"]): AlertUrgency {
  if (status === "ground_stop" || status === "closure") return "critical";
  if (status === "ground_delay" || status === "delay_severe") return "critical";
  if (status === "delay_moderate") return "warning";
  return "info";
}

// ── Alert derivation ──────────────────────────────────────────────────────────

function deriveAlerts(
  trips: TripTab[],
  statusMap: Record<string, AirportStatus>,
  locale: "es" | "en",
  now: Date,
): SmartAlert[] {
  const L = LABELS[locale];
  const alerts: SmartAlert[] = [];
  const seenDelayAirports = new Set<string>();
  const todayISO = now.toISOString().slice(0, 10);
  const tomorrowISO = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  for (const trip of trips) {
    for (const flight of trip.flights) {
      const { id: flightId, flightCode, isoDate, departureTime, originCode, destinationCode } = flight;
      const route = `${originCode}→${destinationCode}`;

      // Parse departure datetime
      const depTime = departureTime ?? "";
      const depDateTimeStr = `${isoDate}T${depTime || "00:00"}:00`;
      const depMs = Date.parse(depDateTimeStr);
      const minsUntilDep = isNaN(depMs) ? null : (depMs - now.getTime()) / 60000;

      // ── departure_soon: within next 3 hours, not yet departed ─────────────
      if (minsUntilDep !== null && minsUntilDep > 0 && minsUntilDep <= 180) {
        const urgency: AlertUrgency =
          minsUntilDep <= 60 ? "critical" : minsUntilDep <= 120 ? "warning" : "info";
        alerts.push({
          id: `departure_soon-${flightId}`,
          type: "departure_soon",
          tripId: trip.id,
          flightId,
          message: L.departure_soon_message(flightCode),
          detail: L.departure_soon_detail(Math.round(minsUntilDep), route),
          urgency,
          timestamp: now,
          icon: "Clock",
        });
      }

      // ── delay_active: airport has active delay, deduplicated per airport ──
      if (!seenDelayAirports.has(originCode)) {
        const airportStatus = statusMap[originCode];
        if (airportStatus && airportStatus.status !== "ok" && airportStatus.status !== "unknown") {
          // Only alert for flights today or future
          if (isoDate >= todayISO) {
            seenDelayAirports.add(originCode);
            const reason =
              airportStatus.delays?.reason ??
              airportStatus.groundStop?.reason ??
              airportStatus.groundDelay?.reason ??
              airportStatus.closure?.reason ??
              airportStatus.status;
            alerts.push({
              id: `delay_active-${originCode}-${isoDate}`,
              type: "delay_active",
              tripId: trip.id,
              flightId,
              message: L.delay_active_message(originCode),
              detail: L.delay_active_detail(reason),
              urgency: delayUrgency(airportStatus.status),
              timestamp: now,
              icon: "AlertTriangle",
            });
          }
        }
      }

      // ── checkin_reminder: 24h before departure ────────────────────────────
      if (isoDate === tomorrowISO) {
        const displayDate = new Date(isoDate + "T00:00:00").toLocaleDateString(
          locale === "en" ? "en-US" : "es-AR",
          { day: "numeric", month: "short" },
        );
        alerts.push({
          id: `checkin_reminder-${flightId}`,
          type: "checkin_reminder",
          tripId: trip.id,
          flightId,
          message: L.checkin_reminder_message(flightCode),
          detail: L.checkin_reminder_detail(route, displayDate),
          urgency: "info",
          timestamp: now,
          icon: "CheckCircle",
        });
      }
    }
  }

  return alerts;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSmartAlerts(
  trips: TripTab[],
  statusMap: Record<string, AirportStatus>,
  locale: "es" | "en",
): { alerts: SmartAlert[]; dismiss: (id: string) => void } {
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [now, setNow] = useState(() => new Date());

  // Tick every 60 seconds so time-sensitive alerts stay accurate
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const rawAlerts = useMemo(
    () => deriveAlerts(trips, statusMap, locale, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, statusMap, locale, now],
  );

  const alerts = useMemo(() => {
    const visible = rawAlerts.filter((a) => !dismissed.has(a.id));

    // Sort by urgency then by time-to-departure (critical first)
    visible.sort((a, b) => {
      const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    return visible.slice(0, MAX_ALERTS);
  }, [rawAlerts, dismissed]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  return { alerts, dismiss };
}
