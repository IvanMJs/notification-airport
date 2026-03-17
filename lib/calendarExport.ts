export interface CalendarFlight {
  flightCode: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  isoDate: string;       // "2026-03-29"
  departureTime?: string; // "20:30"
  airlineName: string;
  flightAwareUrl: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toICSDate(isoDate: string, time?: string): string {
  // Returns YYYYMMDDTHHMMSS (local, no timezone suffix for simplicity)
  const [year, month, day] = isoDate.split("-");
  if (time) {
    const [hh, mm] = time.split(":");
    return `${year}${month}${day}T${hh}${mm}00`;
  }
  return `${year}${month}${day}`;
}

function makeUID(flight: CalendarFlight): string {
  return `${flight.isoDate}-${flight.flightCode.replace(/\s/g, "")}@airport-monitor`;
}

export function generateICS(flights: CalendarFlight[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Airport Monitor//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const f of flights) {
    const dtstart = toICSDate(f.isoDate, f.departureTime);
    const isAllDay = !f.departureTime;
    // End = start + 12h (rough estimate) or next day for all-day
    let dtend: string;
    if (isAllDay) {
      const d = new Date(f.isoDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      dtend = `${String(d.getFullYear())}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    } else {
      const [hh, mm] = f.departureTime!.split(":").map(Number);
      const totalMins = hh * 60 + mm + 12 * 60;
      const endH = pad(Math.floor(totalMins / 60) % 24);
      const endM = pad(totalMins % 60);
      const [year, month, day] = f.isoDate.split("-");
      dtend = `${year}${month}${day}T${endH}${endM}00`;
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${makeUID(f)}`);
    lines.push(`SUMMARY:${f.flightCode} ${f.originCode}→${f.destinationCode}`);
    lines.push(`DESCRIPTION:${f.airlineName}\\n${f.originCity} → ${f.destinationCity}\\nTracking: ${f.flightAwareUrl}`);
    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
    } else {
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`DTEND:${dtend}`);
    }
    lines.push(`LOCATION:${f.originCode} - ${f.originCity}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Opens a single event directly in Google Calendar via URL */
export function buildGoogleCalendarURL(f: CalendarFlight): string {
  const [year, month, day] = f.isoDate.split("-");

  let dtstart: string;
  let dtend: string;

  if (f.departureTime) {
    const [hh, mm] = f.departureTime.split(":");
    dtstart = `${year}${month}${day}T${hh}${mm}00`;
    const totalMins = Number(hh) * 60 + Number(mm) + 12 * 60;
    dtend = `${year}${month}${day}T${pad(Math.floor(totalMins / 60) % 24)}${pad(totalMins % 60)}00`;
  } else {
    const next = new Date(f.isoDate + "T00:00:00");
    next.setDate(next.getDate() + 1);
    dtstart = `${year}${month}${day}`;
    dtend = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  }

  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     `${f.flightCode} ${f.originCode}→${f.destinationCode}`,
    dates:    `${dtstart}/${dtend}`,
    details:  `${f.airlineName}\n${f.originCity} → ${f.destinationCity}\nTracking: ${f.flightAwareUrl}`,
    location: `${f.originCode} - ${f.originCity}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
