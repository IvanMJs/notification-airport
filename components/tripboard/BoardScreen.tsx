"use client";

import { Fragment, useState, useEffect } from "react";
import { FlightRow } from "./FlightRow";
import type { BoardFlight } from "@/hooks/useBoardFlights";

interface BoardScreenProps {
  flights: BoardFlight[];
  litId?: string | null;
  onShare: () => void;
}

const A    = "#FFB800";
const A35  = "rgba(255,184,0,.35)";
const A18  = "rgba(255,184,0,.18)";
const A08  = "rgba(255,184,0,.08)";
const A70  = "rgba(255,184,0,.70)";
const MONO = "'JetBrains Mono','Courier New',monospace";

function useLiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 10_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function BoardScreen({ flights, litId, onShare }: BoardScreenProps) {
  const clock = useLiveClock();
  const date = new Date()
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
        {/* Back */}
        <a
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "rgba(232,232,240,.50)",
            textDecoration: "none",
            marginBottom: 14,
          }}
        >
          ← DASHBOARD
        </a>

        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                color: A70,
                letterSpacing: "0.18em",
                marginBottom: 3,
              }}
            >
              ✈ MIS VUELOS · SALIDAS
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: "rgba(232,232,240,.35)",
                letterSpacing: "0.08em",
              }}
            >
              {date}
            </div>
          </div>

          {/* Live clock */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              fontWeight: 700,
              color: A,
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {clock}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 2,
            marginTop: 12,
            borderRadius: 1,
            background: `linear-gradient(to right, ${A}, ${A35}, transparent)`,
          }}
        />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 4 }}>
        {flights.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 11,
              color: "rgba(232,232,240,.40)",
              letterSpacing: "0.08em",
            }}
          >
            — SIN VUELOS PRÓXIMOS —
          </div>
        )}
        {flights.map((f, i) => (
          <Fragment key={f.id}>
            <FlightRow flight={f} idx={i} lit={f.id === litId} />
            {i < flights.length - 1 && (
              <div
                style={{
                  margin: "0 20px",
                  borderBottom: `1px dashed ${A18}`,
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Share CTA */}
      <div style={{ padding: "10px 20px 20px", flexShrink: 0 }}>
        <button
          onClick={onShare}
          style={{
            width: "100%",
            padding: "14px",
            cursor: "pointer",
            background: A,
            border: "none",
            color: "#07070d",
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            borderRadius: 8,
            transition: "opacity .15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          ⬡ COMPARTIR MIS VUELOS
        </button>
      </div>
    </div>
  );
}
