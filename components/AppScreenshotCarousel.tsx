"use client";

import { useState, useRef, useEffect } from "react";

const SLIDES = [
  { src: "/responsive-intuitivo-mobile.jpg", alt: "Vista de vuelo con estado FAA", label: "Estado por vuelo" },
  { src: "/planifica-tu-viaje.jpg",          alt: "Gestión de viajes",              label: "Gestión de viajes" },
  { src: "/tripcopilot-ia.jpg",              alt: "TripCopilot IA",                 label: "IA integrada" },
];

export function AppScreenshotCarousel() {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;
  const paused = useRef(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % total);
    }, 3500);
    return () => clearInterval(t);
  }, [total]);

  function advance(dir: "left" | "right") {
    setIndex((i) => dir === "left" ? (i + 1) % total : (i - 1 + total) % total);
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current === null) return;
    const d = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(d) > 50) advance(d < 0 ? "left" : "right");
  }

  return (
    <div
      className="select-none"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* Slides */}
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 20, paddingBottom: 24, overflow: "hidden" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.src}
              onClick={() => setIndex(i)}
              style={{
                flexShrink: 0,
                width: 220,
                transform: isActive ? "translateY(0) scale(1)" : "translateY(18px) scale(0.9)",
                opacity: isActive ? 1 : 0.45,
                transition: "transform 0.5s cubic-bezier(.4,0,.2,1), opacity 0.5s",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  boxShadow: isActive
                    ? "0 24px 64px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.65)"
                    : "0 6px 20px rgba(0,0,0,0.4)",
                  border: isActive
                    ? "1.5px solid rgba(59,130,246,0.32)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transition: "box-shadow 0.5s, border 0.5s",
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 500,
                  marginTop: 10,
                  color: isActive ? "#60a5fa" : "#4b5563",
                  transition: "color 0.4s",
                }}
              >
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
            <span
              style={{
                display: "block", borderRadius: 999,
                height: 6, width: i === index ? 20 : 6,
                background: i === index ? "#3b82f6" : "rgba(255,255,255,0.18)",
                transition: "all 0.35s ease", flexShrink: 0,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
