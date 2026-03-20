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

  // ── Drag — global listeners so events never escape the element ────────────
  function pDown(clientX: number) {
    startX.current = clientX;
    dragging.current = true;

    function onMouseMove(e: MouseEvent) {
      setDragX(e.clientX - startX.current!);
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      setDragX(e.touches[0].clientX - startX.current!);
    }
    function finalize(x: number) {
      const delta = x - (startX.current ?? x);
      startX.current = null;
      dragging.current = false;
      setDragX(0);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (Math.abs(delta) > 50)
        delta < 0
          ? setIndex((i) => (i + 1) % total)
          : setIndex((i) => (i - 1 + total) % total);
    }
    function onMouseUp(e: MouseEvent) { finalize(e.clientX); }
    function onTouchEnd(e: TouchEvent) { finalize(e.changedTouches[0].clientX); }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  }

  const isDragging  = dragging.current;
  const trackOffset = -index * STEP + dragX;

  return (
    <div
      style={{ overflow: "hidden", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
      onMouseDown={(e) => pDown(e.clientX)}
      onTouchStart={(e) => pDown(e.touches[0].clientX)}
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
        }}
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.src}
              onClick={() => { if (!isDragging) setIndex(i); }}
              style={{
                flexShrink: 0, width: SLIDE_W,
                transform: isActive ? "translateY(0) scale(1)" : "translateY(18px) scale(0.9)",
                opacity: isActive ? 1 : 0.45,
                transition: isDragging
                  ? "none"
                  : "transform 0.55s cubic-bezier(.4,0,.2,1), opacity 0.55s",
                cursor: isActive ? "inherit" : "pointer",
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
      <div style={{ display: "flex", justifyContent: "center", gap: 2, paddingBottom: 8 }}>
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
