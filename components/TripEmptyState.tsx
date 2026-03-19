"use client";

interface TripEmptyStateProps {
  locale: "es" | "en";
  onCreateTrip?: () => void;
}

const STEPS = [
  {
    icon: "➕",
    es: { title: "Creá tu viaje", desc: "Nombralo como quieras: \"Vacaciones 2025\", \"Viaje de negocios\"…" },
    en: { title: "Create your trip", desc: "Name it whatever you like: \"Vacation 2025\", \"Business trip\"…" },
  },
  {
    icon: "🤖",
    es: { title: "Importá tus vuelos con IA", desc: "Pegá el email de confirmación o subí una captura — TripCopilot extrae todo solo." },
    en: { title: "Import flights with AI", desc: "Paste your confirmation email or upload a screenshot — TripCopilot extracts everything automatically." },
  },
  {
    icon: "🔔",
    es: { title: "Recibí alertas en tiempo real", desc: "Demoras, check-in a las 24h, estado del aeropuerto 3 horas antes y el día del vuelo." },
    en: { title: "Get real-time alerts", desc: "Delays, 24h check-in reminder, airport status 3 hours before, and a morning briefing on departure day." },
  },
];

export function TripEmptyState({ locale, onCreateTrip }: TripEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center">

        {/* Avatar */}
        <img
          src="/tripcopliot-avatar.svg"
          alt="TripCopilot"
          className="w-14 h-14 mb-5 opacity-90"
        />

        {/* Headline */}
        <h2 className="text-lg font-bold text-white mb-2 leading-snug">
          {locale === "es" ? "Tu primer viaje en 3 pasos" : "Your first trip in 3 steps"}
        </h2>

        <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
          {locale === "es"
            ? "TripCopilot monitorea aeropuertos, conexiones y clima — y te avisa antes de que algo salga mal."
            : "TripCopilot monitors airports, connections, and weather — and alerts you before anything goes wrong."}
        </p>
      </div>

      {/* Steps */}
      <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-4 px-6 py-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-base">
              {step.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white mb-0.5">
                {step[locale].title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {step[locale].desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {onCreateTrip && (
        <div className="px-6 py-6">
          <button
            onClick={onCreateTrip}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-6 py-3 transition-all"
          >
            {locale === "es" ? "Agregar mi primer viaje →" : "Add my first trip →"}
          </button>
        </div>
      )}
    </div>
  );
}
