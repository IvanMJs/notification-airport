"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, Trash2, User, Loader2 } from "lucide-react";
import { usePassengers, NewPassengerData } from "@/hooks/usePassengers";

interface Props {
  tripId: string;
}

interface FormState {
  name: string;
  email: string;
  passportNumber: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", passportNumber: "" };

export function TripPassengers({ tripId }: Props) {
  const { passengers, loading, error, addPassenger, removePassenger } =
    usePassengers(tripId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio / Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const data: NewPassengerData = {
        tripId,
        name:           trimmedName,
        email:          form.email.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
      };
      await addPassenger(data);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Pasajero agregado / Passenger added");
    } catch {
      toast.error("No se pudo agregar el pasajero / Could not add passenger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    try {
      await removePassenger(id);
      toast.success(`${name} eliminado`);
    } catch {
      toast.error("No se pudo eliminar el pasajero / Could not remove passenger");
    }
  };

  return (
    <div className="space-y-4 px-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Pasajeros
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>

      {/* Add passenger form */}
      {showForm && (
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
          <p className="text-xs font-medium text-slate-400">Nuevo pasajero</p>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Juan García"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="juan@ejemplo.com"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Passport */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Número de pasaporte
            </label>
            <input
              type="text"
              value={form.passportNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, passportNumber: e.target.value }))
              }
              placeholder="AAA123456"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {error && !loading && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && passengers.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <User className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            No hay pasajeros aún
          </p>
          <p className="text-xs text-slate-600">
            Agregá pasajeros para gestionar su información de viaje
          </p>
        </div>
      )}

      {/* Passenger cards */}
      {!loading && passengers.length > 0 && (
        <ul className="space-y-2">
          {passengers.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium text-slate-100">
                  {p.name}
                </p>
                {p.email && (
                  <p className="truncate text-xs text-slate-400">{p.email}</p>
                )}
                {p.passportNumber && (
                  <p className="text-xs text-slate-500">
                    Pasaporte: {p.passportNumber}
                  </p>
                )}
              </div>
              <button
                onClick={() => { void handleRemove(p.id, p.name); }}
                className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                aria-label={`Eliminar ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
