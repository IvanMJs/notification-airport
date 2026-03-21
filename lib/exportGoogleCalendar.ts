import { TripFlight } from "./types";

/**
 * Builds a Google Calendar event creation URL for a single TripFlight.
 * Opens the "new event" form pre-filled with flight details.
 */
export function buildGoogleCalendarUrl(flight: TripFlight): string {
  // Format: YYYYMMDDTHHMMSS
  const startDate =
    flight.isoDate.replace(/-/g, "") +
    "T" +
    (flight.departureTime?.replace(":", "") ?? "0000") +
    "00";

  // Rough 12-hour duration end time (same day, wrapping at midnight)
  const [depH, depM] = flight.departureTime
    ? flight.departureTime.split(":").map(Number)
    : [0, 0];
  const totalMins   = depH * 60 + depM + 12 * 60;
  const endH        = String(Math.floor(totalMins / 60) % 24).padStart(2, "0");
  const endM        = String(totalMins % 60).padStart(2, "0");
  const endDate     = flight.isoDate.replace(/-/g, "") + "T" + endH + endM + "00";

  const title    = encodeURIComponent(
    `\u2708 ${flight.flightCode} \u2014 ${flight.originCode} \u2192 ${flight.destinationCode}`,
  );
  const details  = encodeURIComponent(`Vuelo ${flight.flightCode} \u00B7 ${flight.airlineName}`);
  const location = encodeURIComponent(flight.originCode);

  return (
    `https://calendar.google.com/calendar/r/eventedit` +
    `?text=${title}` +
    `&dates=${startDate}/${endDate}` +
    `&details=${details}` +
    `&location=${location}`
  );
}
