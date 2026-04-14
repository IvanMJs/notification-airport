export const runtime = "nodejs";
export const alt = "TripCopilot — Seguimiento de viaje";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

import { ImageResponse } from "next/og";
import { getTripByShareToken } from "@/lib/tripShareServer";
import { AIRPORTS } from "@/lib/airports";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRouteString(
  flights: Array<{ origin_code: string; destination_code: string }>,
): string {
  if (flights.length === 0) return "";
  const codes = [flights[0].origin_code];
  for (const f of flights) codes.push(f.destination_code);
  const deduped: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) deduped.push(codes[i]);
  }
  return deduped.join(" → ");
}

// ── OG Image ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function Image({ params }: PageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(token);

  const tripName    = trip?.name ?? "TripCopilot";
  const flights     = trip?.flights ?? [];
  const sortedFlights = [...flights].sort((a, b) => a.iso_date.localeCompare(b.iso_date));
  const routeStr    = buildRouteString(sortedFlights);
  const flightCount = sortedFlights.length;

  // Hero destination city
  const lastFlight = sortedFlights[sortedFlights.length - 1];
  const heroCity   = lastFlight
    ? (AIRPORTS[lastFlight.destination_code]?.city ?? lastFlight.destination_code)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a12",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Violet gradient accent — top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Bottom-left glow */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "64px 72px",
            justifyContent: "space-between",
          }}
        >
          {/* Top: live badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(6,78,59,0.4)",
              border: "1px solid rgba(6,78,59,0.8)",
              borderRadius: 24,
              padding: "6px 14px",
              width: "fit-content",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#34d399",
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#34d399", letterSpacing: 1 }}>
              SEGUIMIENTO EN VIVO
            </span>
          </div>

          {/* Middle: trip name + destination */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              {tripName}
            </div>

            {heroCity && (
              <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(167,139,250,0.85)" }}>
                {heroCity}
              </div>
            )}

            {/* Route */}
            {routeStr && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <span style={{ fontSize: 22, color: "#6b7280" }}>✈</span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#9ca3af",
                    fontFamily: "monospace",
                    letterSpacing: 2,
                  }}
                >
                  {routeStr}
                </span>
              </div>
            )}
          </div>

          {/* Bottom row: flight count badge + wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            {/* Flight count badge */}
            {flightCount > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: "10px 20px",
                }}
              >
                <span style={{ fontSize: 28, color: "#a78bfa" }}>✈</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#e5e7eb" }}>
                  {flightCount} {flightCount === 1 ? "vuelo" : "vuelos"}
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* TripCopilot wordmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 20, color: "#ffffff" }}>✈</span>
              </div>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#d1d5db",
                  letterSpacing: -0.5,
                }}
              >
                TripCopilot
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
