"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] p-7 space-y-6"
        style={{ background: "linear-gradient(160deg, rgba(16,16,28,0.99) 0%, rgba(9,9,18,1) 100%)" }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/tripcopliot-avatar.svg"
            alt="TripCopilot"
            className="h-14 w-auto"
          />
          <div className="text-center">
            <h1 className="text-xl font-black text-white tracking-tight">TripCopilot</h1>
            <p className="text-xs text-gray-500 mt-0.5">Tu copiloto para este viaje</p>
          </div>
        </div>

        {sent ? (
          /* Confirmation state */
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-5 text-center space-y-2">
            <p className="text-2xl">📬</p>
            <p className="text-sm font-bold text-emerald-300">Revisá tu email</p>
            <p className="text-xs text-emerald-400/70 leading-relaxed">
              Mandamos un link a <span className="font-semibold">{email}</span>.
              Tocá el link para entrar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.09] py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 tap-scale"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">o</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Magic link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@email.com"
                    required
                    className="w-full rounded-xl border border-white/[0.12] bg-[#080810] pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors tap-scale"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enviar link de acceso"
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-700 leading-relaxed">
          Sin contraseña. Sin datos compartidos con terceros.
        </p>
      </div>
    </div>
  );
}
