"use client";

import { SplitFlapTime } from "./SplitFlapTime";
import { StatusPill } from "./StatusPill";
import type { BoardFlight } from "@/hooks/useBoardFlights";

interface FlightRowProps {
  flight: BoardFlight;
  idx: number;
  lit?: boolean;
}

const MONO = "'JetBrains Mono','Courier New',monospace";

export function FlightRow({ flight, idx, lit }: FlightRowProps) {
  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        gap: 16,
        alignItems: "center",
        animation: lit
          ? "tb-lit-fade 3.5s ease-out forwards"
          : `tb-row-in .35s ease-out ${idx * 70}ms both`,
      }}
    >
      {/* Time tiles */}
      <div style={{ flexShrink: 0 }}>
        <SplitFlapTime time={flight.time} sz={38} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: destination + status */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}
          >
            {flight.dest}
          </span>
          <StatusPill status={flight.status} delay={flight.delay} />
        </div>

        {/* City name */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: "rgba(232,232,240,.55)",
            marginTop: 4,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {flight.city}
        </div>

        {/* Bottom row: route + flight + countdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
            fontFamily: MONO,
            fontSize: 11,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "rgba(255,184,0,.90)", fontWeight: 700, letterSpacing: "0.04em" }}>
            {flight.orig} → {flight.dest}
          </span>
          <span style={{ color: "rgba(232,232,240,.25)" }}>·</span>
          <span style={{ color: "rgba(255,184,0,.65)", letterSpacing: "0.03em" }}>
            {flight.airline} {flight.num}
          </span>
          {flight.gate !== "—" && (
            <>
              <span style={{ color: "rgba(232,232,240,.25)" }}>·</span>
              <span style={{ color: "rgba(232,232,240,.50)" }}>GATE {flight.gate}</span>
            </>
          )}
          <span style={{ color: "rgba(232,232,240,.25)" }}>·</span>
          <span style={{ color: "rgba(232,232,240,.65)", fontStyle: "italic" }}>{flight.cd}</span>
        </div>
      </div>
    </div>
  );
}
