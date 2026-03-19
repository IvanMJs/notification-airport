"use client";

import { useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/effect-cards";

interface NotifCarouselProps {
  screenshots: { src: string; label: string }[];
}

export function NotifCarousel({ screenshots }: NotifCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

  const handleSlideChange = useCallback((sw: SwiperType) => {
    setActiveIndex(sw.realIndex);
  }, []);

  const goTo = useCallback(
    (i: number) => swiperRef?.slideToLoop(i),
    [swiperRef],
  );

  return (
    <div className="select-none flex flex-col items-center">
      {/* Card stack swiper */}
      <div style={{ width: "clamp(200px, 52vw, 300px)", paddingBottom: "2rem" }}>
        <Swiper
          modules={[EffectCards, A11y]}
          effect="cards"
          onSwiper={setSwiperRef}
          onSlideChange={handleSlideChange}
          grabCursor
          centeredSlides
          loop
          a11y={{ prevSlideMessage: "Anterior", nextSlideMessage: "Siguiente" }}
          cardsEffect={{
            slideShadows: true,
            rotate: true,
            perSlideOffset: 10,
            perSlideRotate: 4,
          }}
        >
          {screenshots.map((s) => (
            <SwiperSlide key={s.src}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={s.src}
                  alt={s.label}
                  className="w-full h-auto block"
                  draggable={false}
                />
                {/* Bottom label overlay */}
                <div
                  className="absolute bottom-0 inset-x-0 py-3 px-4 text-center"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)",
                  }}
                >
                  <p className="text-xs font-bold text-white">{s.label}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={screenshots[i].label}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 h-1.5 bg-blue-500"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
