import { Accommodation, TripFlight } from "./types";

// ── Types for public share data ───────────────────────────────────────────────

export interface SharedTripFlight {
  id: string;
  flight_code: string;
  airline_name: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
}

export interface SharedTripAccommodation {
  id: string;
  name: string;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
}

export interface SharedTripData {
  id: string;
  name: string;
  flights: SharedTripFlight[];
  accommodations: SharedTripAccommodation[];
}

export interface WhatsAppFlight {
  flightCode:      string;
  airlineName:     string;
  originCode:      string;
  originCity:      string;
  destinationCode: string;
  destinationCity: string;
  isoDate:         string;
  departureTime?:  string;
  arrivalTime?:    string;
  arrivalDate?:    string;
  arrivalBuffer?:  number;
  arrivalRec?:     string; // pre-computed "17:30" string
}

function formatWADate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "numeric", month: "short",
  });
}

function formatWADateShort(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "numeric", month: "short",
  });
}

// Unicode escapes avoid Windows filesystem encoding issues with emoji literals
const E = {
  plane:    "\u2708\uFE0F",  // ✈️
  calendar: "\uD83D\uDCC5",  // 📅
  clock:    "\uD83D\uDD50",  // 🕐
  depart:   "\uD83D\uDEEB",  // 🛫
  hotel:    "\uD83C\uDFE8",  // 🏨
  link:     "\uD83D\uDD17",  // 🔗
};

export function buildWhatsAppMessage(
  tripName: string,
  flights: WhatsAppFlight[],
  locale: "es" | "en",
  accommodations?: Accommodation[],
  trackingUrl?: string,
): string {
  const sorted = [...flights].sort((a, b) => {
    const d = a.isoDate.localeCompare(b.isoDate);
    return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
  });

  // Build route summary: EZE → MIA → GCM
  const routeCodes = sorted.length > 0
    ? [sorted[0].originCode, ...sorted.map((f) => f.destinationCode)].join(" \u2192 ")
    : "";

  let lines: string[] = [
    `${E.plane} *${routeCodes}* \u2014 ${tripName}`,
    "",
  ];

  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    const flightNum = i + 1;

    lines.push(locale === "en"
      ? `*Flight ${flightNum}:* ${f.flightCode}`
      : `*Vuelo ${flightNum}:* ${f.flightCode}`);

    // Date and times line
    const dateStr = formatWADate(f.isoDate, locale);
    if (f.departureTime) {
      let timeStr = `${E.calendar} ${dateStr} \u00B7 ${E.clock} ${f.departureTime}`;
      if (f.arrivalTime) {
        // Check if arrival is next day
        const nextDay = f.arrivalDate && f.arrivalDate !== f.isoDate ? "+1" : "";
        timeStr += ` \u2192 ${f.arrivalTime}${nextDay}`;
      }
      lines.push(timeStr);
    } else {
      lines.push(`${E.calendar} ${dateStr}`);
    }

    // Route line
    lines.push(`${E.depart} ${f.originCity} (${f.originCode}) \u2192 ${f.destinationCity} (${f.destinationCode})`);

    // Accommodation for this flight (by destination)
    if (accommodations) {
      const acc = accommodations.find(
        (a) => a.checkInDate === (f.arrivalDate ?? f.isoDate) || a.checkInDate === f.isoDate
      );
      if (acc) {
        const checkIn  = acc.checkInDate  ? formatWADateShort(acc.checkInDate,  locale) : null;
        const checkOut = acc.checkOutDate ? formatWADateShort(acc.checkOutDate, locale) : null;
        const dateRange = checkIn && checkOut ? `${checkIn}\u2013${checkOut}` : checkIn ?? "";
        const checkInTime = acc.checkInTime ? ` \u00B7 Check-in ${acc.checkInTime}` : "";
        lines.push(`${E.hotel} *${locale === "en" ? "Stay" : "Alojamiento"}:* ${acc.name}`);
        if (dateRange) lines.push(`${E.calendar} ${dateRange}${checkInTime}`);
      }
    }

    lines.push("");
  }

  if (trackingUrl) {
    lines.push(locale === "en"
      ? `_Follow my trip in real time: ${trackingUrl}_`
      : `_Seguí mi viaje en tiempo real: ${trackingUrl}_`);
  }

  return lines.join("\n").trimEnd();
}

export function buildWhatsAppURL(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function encodeTripFlights(flights: TripFlight[]): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(flights)));
  } catch {
    return "";
  }
}

export function decodeTripFlights(encoded: string): TripFlight[] | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as TripFlight[];
  } catch {
    return null;
  }
}

export function buildShareURL(tripName: string, flights: TripFlight[]): string {
  const encoded = encodeTripFlights(flights);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ share: encoded, name: tripName });
  return `${base}?${params.toString()}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}

// ── Server-side utils moved to lib/tripShareServer.ts ─────────────────────────
// getTripByShareToken is in lib/tripShareServer.ts to avoid bundling next/headers
// into client components that import this file.