"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { TripExpense } from "@/lib/types";
import toast from "react-hot-toast";

// ── DB row shape (snake_case) ─────────────────────────────────────────────────

interface DbExpense {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  expense_date: string | null;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

function toTripExpense(row: DbExpense): TripExpense {
  return {
    id:          row.id,
    tripId:      row.trip_id,
    amount:      row.amount,
    currency:    row.currency,
    category:    row.category as TripExpense["category"],
    description: row.description ?? undefined,
    expenseDate: row.expense_date ?? undefined,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTripExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("trip_expenses")
      .select("id, trip_id, amount, currency, category, description, expense_date")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setExpenses((data as DbExpense[]).map(toTripExpense));
    setLoading(false);
  }, [tripId]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  // ── Real-time subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`trip-expenses-${tripId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "trip_expenses",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void fetchExpenses();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, fetchExpenses]);

  // ── addExpense — returns true on success, false on failure ─────────────────

  const addExpense = useCallback(
    async (expense: Omit<TripExpense, "id" | "tripId">): Promise<boolean> => {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("trip_expenses")
        .insert({
          trip_id:      tripId,
          amount:       expense.amount,
          currency:     expense.currency,
          category:     expense.category,
          description:  expense.description ?? null,
          expense_date: expense.expenseDate ?? null,
        })
        .select("id, trip_id, amount, currency, category, description, expense_date")
        .single();

      if (insertError) {
        setError(insertError.message);
        toast.error(insertError.message);
        return false;
      }

      if (data) {
        setExpenses((prev) => [toTripExpense(data as DbExpense), ...prev]);
      }

      return true;
    },
    [tripId],
  );

  // ── removeExpense — optimistic delete with revert on failure ───────────────

  const removeExpense = useCallback(
    async (id: string): Promise<void> => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));

      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("trip_expenses")
        .delete()
        .eq("id", id);

      if (deleteError) {
        void fetchExpenses();
        toast.error(deleteError.message);
      }
    },
    [fetchExpenses],
  );

  // ── totalByCurrency — groups sum per currency ──────────────────────────────

  const totalByCurrency = useCallback((): Record<string, number> => {
    return expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
      return acc;
    }, {});
  }, [expenses]);

  return { expenses, loading, error, addExpense, removeExpense, totalByCurrency };
}
