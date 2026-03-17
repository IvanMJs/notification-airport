"use client";

import { useState, useRef } from "react";
import { Plane, ArrowDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AirportStatusMap } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface TimelineFlight {
  originCode: string;
  destinationCode: string;
  isoDate: string;
  flightCode: string;
  departureTime?: string;
}

interface TripTimelineProps {
  flights: TimelineFlight[];
  statusMap: AirportStatusMap;
}

interface TooltipState {
  idx: number;
  x: number;
  y: number;
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function TripTimeline({ flights, statusMap }: TripTimelineProps) {
  const { locale } = useLanguage();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  if (flights.length === 0) return null;

  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  type Node = {
    code: string;
    isOrigin: boolean;
    flightCode: string;
    isoDate: string;
    departureTime?: string;
  };
  const nodes: Node[] = [];
  for (const f of sorted) {
    nodes.push({ code: f.originCode, isOrigin: true, flightCode: f.flightCode, isoDate: f.isoDate, departureTime: f.departureTime });
  }
  const last = sorted[sorted.length - 1];
  nodes.push({ code: last.destinationCode, isOrigin: false, flightCode: "", isoDate: last.isoDate });

  const totalNodes = nodes.length;

  function openTooltip(el: HTMLElement, idx: number) {
    clearTimeout(closeTimer.current);
    const rect = el.getBoundingClientRect();
    setTooltip({ idx, x: rect.left + rect.width / 2, y: rect.top - 10 });
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltip(null), 120);
  }
  function cancelClose() {
    clearTimeout(closeTimer.current);
  }
  function handleGoToCard(nodeIdx: number, isOrigin: boolean) {
    const cardIdx = isOrigin ? nodeIdx : nodeIdx - 1;
    document.getElementById(`flight-card-${cardIdx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTooltip(null);
  }

  const activeNode = tooltip ? nodes[tooltip.idx] : null;

  return (
    <>
      {/* Tooltip — position:fixed so it's never clipped by overflow */}
      {tooltip && activeNode && (
        <div
          className="fixed z-50"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%) translateY(-100%)" }}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        >
          <div className="rounded-lg border border-gray-600 bg-gray-800 shadow-2xl px-3 py-2.5 whitespace-nowrap text-left">
            <p className="text-xs font-bold text-white mb-1">
              {activeNode.code} · {AIRPORTS[activeNode.code]?.city ?? activeNode.code}
            </p>
            {activeNode.isOrigin ? (
              <>
                <p className="text-[11px] text-gray-300">{formatDate(activeNode.isoDate, locale)}</p>
                {activeNode.departureTime ? (
                  <p className="text-[11px] text-blue-300 font-medium mt-0.5">
                    {locale === "en" ? "Dep." : "Sale"} {activeNode.departureTime}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {locale === "en" ? "Time TBD" : "Hora por confirmar"}
                  </p>
                )}
                {activeNode.flightCode && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{activeNode.flightCode}</p>
                )}
                {statusMap[activeNode.code]?.status && statusMap[activeNode.code]?.status !== "ok" && (
                  <p className="text-[11px] text-orange-400 font-semibold mt-1">
                    ⚠️ {locale === "en" ? "Active delays" : "Demoras activas"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-gray-400">
                {locale === "en" ? "Final destination" : "Destino final"}
              </p>
            )}
            <button
              onClick={() => handleGoToCard(tooltip.idx, activeNode.isOrigin)}
              className="mt-2 w-full flex items-center justify-center gap-1 rounded-md bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
            >
              <ArrowDown className="h-2.5 w-2.5" />
              {locale === "en" ? "Go to flight" : "Ir al vuelo"}
            </button>
          </div>
          <div className="flex justify-center">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-600" />
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 overflow-x-auto animate-fade-in-up"
        onClick={() => setTooltip(null)}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          {locale === "en" ? "Trip timeline" : "Cronograma del viaje"}
        </p>

        {/*
          Layout: items-start so all columns top-align.
          Dot is the FIRST element in every column → all dots on same horizontal level.
          Connecting line has marginTop:2 to vertically center with dot (dot h-4=16px → center at 8px; line container h~12px → center at 2+6=8px ✓).
          Inicio/Fin badges sit BELOW the airport code, not above the dot.
        */}
        <div className="flex items-start min-w-max gap-0 py-1">
          {nodes.map((node, idx) => {
            const isLast  = idx === totalNodes - 1;
            const isFirst = idx === 0;
            const daysUntil = node.isOrigin ? getDaysUntil(node.isoDate) : null;
            const status    = statusMap[node.code]?.status ?? "ok";
            const hasIssue  = status !== "ok";
            const isActive  = tooltip?.idx === idx;

            const dotColor = hasIssue
              ? "bg-orange-500 ring-orange-500/30"
              : daysUntil !== null && daysUntil <= 0
              ? "bg-red-400 ring-red-400/30"
              : daysUntil !== null && daysUntil <= 7
              ? "bg-yellow-400 ring-yellow-400/30"
              : "bg-blue-400 ring-blue-400/30";

            return (
              <div key={idx} className="flex items-start">

                {/* Node column — dot first so all dots are top-aligned */}
                <div className="flex flex-col items-center gap-1">

                  {/* Dot */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      tooltip?.idx === idx ? setTooltip(null) : openTooltip(e.currentTarget, idx);
                    }}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") { cancelClose(); openTooltip(e.currentTarget, idx); } }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleClose(); }}
                    className={`h-4 w-4 rounded-full ring-4 ring-offset-1 ring-offset-gray-900 transition-transform focus:outline-none cursor-pointer ${dotColor} ${isActive ? "scale-125" : "hover:scale-125"}`}
                    aria-label={`${node.code}${node.isOrigin ? ": " + formatDate(node.isoDate, locale) : ""}`}
                  />

                  {/* Airport code */}
                  <span className="text-xs font-bold text-white">{node.code}</span>

                  {/* Inicio / Fin badge — below the code, doesn't affect dot position */}
                  {(isFirst || isLast) && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                      isFirst ? "bg-green-900/50 text-green-400" : "bg-blue-900/50 text-blue-400"
                    }`}>
                      {isFirst
                        ? (locale === "en" ? "Start" : "Inicio")
                        : (locale === "en" ? "End"   : "Fin")}
                    </span>
                  )}

                  {/* Flight code */}
                  {node.isOrigin && node.flightCode && (
                    <span className="text-[10px] text-gray-500 max-w-[60px] text-center leading-tight">
                      {node.flightCode}
                    </span>
                  )}

                  {/* Days countdown */}
                  {node.isOrigin && daysUntil !== null && (
                    <span className={`text-[10px] font-medium ${
                      daysUntil < 0   ? "text-gray-600"   :
                      daysUntil === 0 ? "text-red-400"    :
                      daysUntil <= 7  ? "text-yellow-400" :
                      "text-green-400"
                    }`}>
                      {daysUntil < 0  ? (locale === "en" ? "Done"  : "Listo") :
                       daysUntil === 0 ? (locale === "en" ? "TODAY" : "HOY")   :
                       `${daysUntil}d`}
                    </span>
                  )}
                </div>

                {/* Connecting line — marginTop:2 centers it with the dot (dot h-4 → center at 8px; line h-3 icon → center at 2+6=8px) */}
                {!isLast && (
                  <div className="flex items-center mx-1" style={{ marginTop: 2 }}>
                    <div className="h-px w-8 sm:w-12 bg-gray-700" />
                    <Plane className="h-3 w-3 text-gray-600 -mx-0.5" />
                    <div className="h-px w-8 sm:w-12 bg-gray-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-700 mt-2">
          {locale === "en" ? "Hover or tap a dot for details" : "Hover o tocá un punto para ver detalles"}
        </p>
      </div>
    </>
  );
}
