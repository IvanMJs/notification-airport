"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const SLIDES = [
  { src: "/responsive-intuitivo-mobile.jpg", alt: "Vista de vuelo con estado FAA", label: "Estado por vuelo" },
  { src: "/planifica-tu-viaje.jpg",          alt: "Gestión de viajes",              label: "Gestión de viajes" },
  { src: "/tripcopilot-ia.jpg",              alt: "TripCopilot IA",                 label: "IA integrada" },
];

const SLIDE_W = 220;
const GAP     = 20;
const STEP    = SLIDE_W + GAP;
const AUTOPLAY_MS = 3500;

export function AppScreenshotCarousel() {
  const [index, setIndex] = useState(1);
  const [dragX, setDragX] = useState(0);

  const startX   = useRef<number | null>(null);
  const dragging = useRef(false);
  const hovered  = useRef(false);
  const total    = SLIDES.length;

  const advance = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total],
  );

  useEffect(() => {
    const t = setInterval(() => {
      if (!hovered.current && !dragging.current) advance();
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [advance]);

  // ── Pointer events ────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    dragging.current = true;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || startX.current === null) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || startX.current === null) return;
    const delta = e.clientX - startX.current;
    dragging.current = false;
    startX.current = null;
    setDragX(0);
    if (Math.abs(delta) > 50)
      delta < 0
        ? setIndex((i) => (i + 1) % total)
        : setIndex((i) => (i - 1 + total) % total);
  }

  function onPointerCancel() {
    dragging.current = false;
    startX.current = null;
    setDragX(0);
  }

  const isDragging  = dragging.current;
  const trackOffset = -index * STEP + dragX;

  return (
    <div
      style={{ overflow: "hidden", touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* Track */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: GAP,
          transform: `translateX(calc(50% - ${SLIDE_W / 2}px + ${trackOffset}px))`,
          transition: isDragging ? "none" : "transform 0.55s cubic-bezier(.4,0,.2,1)",
          paddingBottom: 24,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.src}
              style={{
                flexShrink: 0, width: SLIDE_W,
                transform: isActive ? "translateY(0) scale(1)" : "translateY(18px) scale(0.9)",
                opacity: isActive ? 1 : 0.45,
                transition: isDragging
                  ? "none"
                  : "transform 0.55s cubic-bezier(.4,0,.2,1), opacity 0.55s",
              }}
            >
              <div
                style={{
                  borderRadius: 22, overflow: "hidden",
                  boxShadow: isActive
                    ? "0 24px 64px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.65)"
                    : "0 6px 20px rgba(0,0,0,0.4)",
                  border: isActive
                    ? "1.5px solid rgba(59,130,246,0.32)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transition: "box-shadow 0.55s, border 0.55s",
                }}
              >
                <img
                  src={slide.src} alt={slide.alt} draggable={false}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p style={{
                textAlign: "center", fontSize: 12, fontWeight: 500,
                marginTop: 10, transition: "color 0.4s",
                color: isActive ? "#60a5fa" : "#4b5563",
              }}>
                {slide.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 2, paddingBottom: 8, pointerEvents: "auto" }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={SLIDES[i].label}
            style={{
              background: "transparent", border: "none",
              padding: "10px 4px", cursor: "pointer",
              WebkitAppearance: "none", appearance: "none",
              display: "flex", alignItems: "center",
            }}
          >
            <span style={{
              display: "block", borderRadius: 999,
              height: 6, width: i === index ? 20 : 6,
              background: i === index ? "#3b82f6" : "rgba(255,255,255,0.18)",
              transition: "all 0.35s ease", flexShrink: 0,
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}
