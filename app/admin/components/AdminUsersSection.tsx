"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type UserAdminRow = {
  user_id: string | null;
  email: string | null;
  auth_name: string | null;
  plan: "free" | "explorer" | "pilot";
  admin_override: boolean;
  admin_notes: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_sign_in_at: string | null;
  username: string | null;
  display_name: string | null;
};

type EditingField = {
  userId: string;
  field: "display_name" | "username" | "admin_notes";
  value: string;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  explorer: "Explorer",
  pilot: "Pilot",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-700/50 text-gray-400",
  explorer: "bg-blue-900/50 text-blue-300 border border-blue-700/40",
  pilot: "bg-violet-900/50 text-violet-300 border border-violet-700/40",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function AdminUsersSection() {
  const [users, setUsers] = useState<UserAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pendingPlan, setPendingPlan] = useState<{
    userId: string;
    email: string | null;
    plan: string;
  } | null>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Error cargando usuarios");
      const json = (await res.json()) as { users: UserAdminRow[]; total: number };
      setUsers(json.users);
      setTotal(json.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(value, 0), 300);
  };

  const patch = async (userId: string, payload: Record<string, unknown>) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    if (!res.ok) throw new Error("Error al guardar");
    const { user } = (await res.json()) as { user: UserAdminRow };
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? user : u)));
  };

  const applyPlanChange = async (userId: string, plan: string) => {
    try {
      await patch(userId, { plan, adminOverride: true });
    } catch {
      setError("No se pudo actualizar el plan");
    } finally {
      setPendingPlan(null);
    }
  };

  const toggleAdminOverride = async (userId: string, current: boolean) => {
    try {
      await patch(userId, { adminOverride: !current });
    } catch { /* silent */ }
  };

  const saveField = async (field: EditingField) => {
    setEditing(null);
    try {
      const payload: Record<string, unknown> =
        field.field === "display_name" ? { displayName: field.value }
        : field.field === "username"   ? { username: field.value }
        :                                { adminNotes: field.value };
      await patch(field.userId, payload);
    } catch {
      setError("No se pudo guardar el campo");
    }
  };

  const startEdit = (userId: string, field: EditingField["field"], current: string | null) => {
    setEditing({ userId, field, value: current ?? "" });
  };

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Search bar */}
      <div className="mb-5 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por email, nombre o username…"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <span className="text-xs text-gray-600 whitespace-nowrap shrink-0">
          {total} usuario{total !== 1 ? "s" : ""}
        </span>
      </div>

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Nombre · Username</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center" title="Activo → MercadoPago no puede cambiar el plan">Override</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Último login</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Notas</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Cambiar plan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-white/[0.06] rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-xs">
                  {search ? "Sin resultados para esa búsqueda" : "Sin usuarios registrados"}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const uid = u.user_id ?? u.email ?? "orphan";
                const isEditing = (field: EditingField["field"]) =>
                  editing?.userId === u.user_id && editing.field === field;

                const InlineInput = ({
                  field,
                  placeholder,
                  mono = false,
                }: {
                  field: EditingField["field"];
                  placeholder: string;
                  mono?: boolean;
                }) => {
                  const active = isEditing(field);
                  const current = field === "display_name" ? u.display_name : field === "username" ? u.username : u.admin_notes;
                  if (active && editing) {
                    return (
                      <input
                        autoFocus
                        type="text"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onBlur={() => saveField(editing)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveField(editing);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className={`w-full bg-white/[0.06] border border-violet-500/40 rounded px-2 py-0.5 text-xs text-white focus:outline-none ${mono ? "font-mono" : ""}`}
                      />
                    );
                  }
                  return (
                    <button
                      onClick={() => u.user_id && startEdit(u.user_id, field, current)}
                      disabled={!u.user_id}
                      className={`text-left w-full truncate text-xs transition-colors disabled:cursor-default ${current ? (mono ? "text-gray-400 font-mono" : "text-gray-300") : "text-white/20 hover:text-white/40"}`}
                      title={current ?? placeholder}
                    >
                      {current ?? <span>{placeholder}</span>}
                    </button>
                  );
                };

                return (
                  <tr key={uid} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className={`font-mono text-xs ${u.email ? "text-white/80" : "text-red-400/70"}`}>
                        {u.email ?? "sin email"}
                      </p>
                      {!u.user_id && (
                        <span className="text-[9px] text-red-400/60 font-bold uppercase tracking-wider">
                          ⚠ orphan
                        </span>
                      )}
                    </td>

                    {/* Display name + username (editable) */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <div className="space-y-1">
                        {/* If display_name is null but auth_name exists, show it dimmed as fallback */}
                        {!u.display_name && u.auth_name ? (
                          <button
                            onClick={() => u.user_id && startEdit(u.user_id, "display_name", u.auth_name)}
                            className="text-left w-full truncate text-xs text-yellow-500/60 hover:text-yellow-500/90 transition-colors"
                            title={`"${u.auth_name}" viene de Google/OAuth. Click para guardarlo en el perfil.`}
                          >
                            {u.auth_name} <span className="text-[9px] opacity-50">(oauth)</span>
                          </button>
                        ) : (
                          <InlineInput field="display_name" placeholder="+ nombre" />
                        )}
                        <InlineInput field="username" placeholder="+ username" mono />
                      </div>
                    </td>

                    {/* Plan badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.free}`}>
                        {PLAN_LABELS[u.plan] ?? u.plan}
                      </span>
                    </td>

                    {/* Admin override toggle */}
                    <td className="px-4 py-3 text-center">
                      {u.user_id ? (
                        <button
                          onClick={() => toggleAdminOverride(u.user_id!, u.admin_override)}
                          title={u.admin_override ? "Bloqueado (click para desactivar)" : "MP puede cambiar el plan (click para bloquear)"}
                          className={`w-8 h-4 rounded-full transition-colors relative inline-flex shrink-0 ${u.admin_override ? "bg-violet-600" : "bg-white/10"}`}
                        >
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${u.admin_override ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Last login */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {u.last_sign_in_at ? (
                        <span
                          className="text-gray-400"
                          title={new Date(u.last_sign_in_at).toLocaleString("es-AR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        >
                          {timeAgo(u.last_sign_in_at)}
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>

                    {/* Admin notes (editable) */}
                    <td className="px-4 py-3 max-w-[140px]">
                      <InlineInput field="admin_notes" placeholder="+ nota" />
                    </td>

                    {/* Change plan */}
                    <td className="px-4 py-3">
                      {u.user_id ? (
                        <select
                          value={u.plan}
                          onChange={(e) =>
                            setPendingPlan({ userId: u.user_id!, email: u.email, plan: e.target.value })
                          }
                          className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500/50 cursor-pointer transition-colors"
                        >
                          <option value="free">Free</option>
                          <option value="explorer">Explorer</option>
                          <option value="pilot">Pilot</option>
                        </select>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs text-gray-500 disabled:opacity-30 hover:text-white transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-600">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs text-gray-500 disabled:opacity-30 hover:text-white transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Confirm plan change dialog */}
      {pendingPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl border border-white/[0.1] p-6 max-w-sm w-full space-y-4"
            style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
          >
            <h3 className="font-bold text-white">Confirmar cambio de plan</h3>
            <p className="text-sm text-gray-400">
              Cambiar plan de{" "}
              <span className="text-white font-mono text-xs">
                {pendingPlan.email ?? pendingPlan.userId.slice(0, 8)}
              </span>{" "}
              a{" "}
              <span className={`font-bold ${pendingPlan.plan === "pilot" ? "text-violet-400" : pendingPlan.plan === "explorer" ? "text-blue-400" : "text-gray-400"}`}>
                {PLAN_LABELS[pendingPlan.plan] ?? pendingPlan.plan}
              </span>.
            </p>
            <p className="text-xs text-yellow-500/80 bg-yellow-500/10 rounded-lg p-3">
              Se activará Admin Override — MercadoPago no podrá sobreescribir este plan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingPlan(null)}
                className="flex-1 py-2 rounded-xl bg-white/[0.06] text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => applyPlanChange(pendingPlan.userId, pendingPlan.plan)}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
