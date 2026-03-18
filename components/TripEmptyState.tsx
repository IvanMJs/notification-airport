"use client";

interface TripEmptyStateProps {
  locale: "es" | "en";
  onCreateTrip?: () => void;
}

const BULLETS: { es: string; en: string }[] = [
  {
    es: "🔴 Estado FAA en tiempo real para cada aeropuerto de tu ruta",
    en: "🔴 Real-time FAA status for every airport on your route",
  },
  {
    es: "🔗 Análisis automático de riesgo en conexiones ajustadas",
    en: "🔗 Automatic risk analysis for tight connections",
  },
  {
    es: "🤖 Guía de equipaje y tips por destino, generada con IA",
    en: "🤖 AI-powered packing list and destination tips",
  },
];

export function TripEmptyState({ locale, onCreateTrip }: TripEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] overflow-hidden animate-fade-in-up"
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      <div className="px-6 py-10 flex flex-col items-center text-center">

        {/* Icon */}
        <div className="text-5xl mb-5 select-none">✈️</div>

        {/* Headline */}
        <h2 className="text-lg font-bold text-white mb-2 leading-snug">
          {locale === "es" ? "Tu próximo viaje, aquí" : "Your next trip, here"}
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-400 mb-7 max-w-xs leading-relaxed">
          {locale === "es"
            ? "Cargá tus vuelos y monitoreamos aeropuertos, conexiones y clima en tiempo real."
            : "Add your flights and we'll monitor airports, connections, and weather in real time."}
        </p>

        {/* Value bullets */}
        <ul className="flex flex-col gap-2.5 mb-8 text-left max-w-xs w-full">
          {BULLETS.map((b, i) => (
            <li key={i} className="text-sm text-gray-400 leading-snug">
              {b[locale]}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {onCreateTrip && (
          <button
            onClick={onCreateTrip}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-6 py-3 transition-all tap-scale"
          >
            {locale === "es" ? "Agregar mi primer viaje" : "Add my first trip"}
          </button>
        )}
      </div>
    </div>
  );
}
