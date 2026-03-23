"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";

export function InstallBanner() {
  const { canInstall, install, isDismissed, dismiss } = usePwaInstall();

  if (!canInstall || isDismissed) return null;

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-40 flex items-end justify-center px-4 pb-2 animate-slide-up pointer-events-none"
      style={{ animation: "slideUp 0.3s ease-out forwards" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl shadow-black/60 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* App icon */}
          <img
            src="/tripcopliot-avatar.svg"
            alt="TripCopilot"
            width={32}
            height={32}
            className="shrink-0 rounded-lg"
          />

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight">
              Instalá TripCopilot
            </p>
            <p className="text-xs text-gray-400 leading-snug mt-0.5">
              Accedé sin internet y recibí notificaciones push
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={install}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 transition-all"
            >
              Instalar
            </button>
            <button
              onClick={dismiss}
              aria-label="Cerrar banner de instalación"
              className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-base leading-none" aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
