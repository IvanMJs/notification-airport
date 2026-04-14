"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Passenger {
  id: string;
  tripId: string;
  name: string;
  email?: string;
  passportNumber?: string;
  /** ISO date string (YYYY-MM-DD). Requires a Supabase migration to add
   *  the `passport_expiry` column to the `passengers` table. */
  passportExpiry?: string;
  nationality?: string;
  dateOfBirth?: string;
  seatPreference?: string;
  mealPreference?: string;
  createdAt: string;
}

interface DbPassenger {
  id: string;
  trip_id: string;
  name: string;
  email: string | null;
  passport_number: string | null;
  /** Column `passport_expiry DATE` — migration required before this is populated. */
  passport_expiry?: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  seat_preference: string | null;
  meal_preference: string | null;
  created_at: string;
}

function toPassenger(row: DbPassenger): Passenger {
  return {
    id:             row.id,
    tripId:         row.trip_id,
    name:           row.name,
    email:          row.email ?? undefined,
    passportNumber: row.passport_number ?? undefined,
    passportExpiry: row.passport_expiry ?? undefined,
    nationality:    row.nationality ?? undefined,
    dateOfBirth:    row.date_of_birth ?? undefined,
    seatPreference: row.seat_preference ?? undefined,
    mealPreference: row.meal_preference ?? undefined,
    createdAt:      row.created_at,
  };
}

export type NewPassengerData = Omit<Passenger, "id" | "createdAt">;
export type UpdatePassengerData = Partial<Omit<Passenger, "id" | "tripId" | "createdAt">>;

export function usePassengers(tripId: string) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPassengers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("passengers")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setPassengers((data as DbPassenger[]).map(toPassenger));
    setLoading(false);
  }, [tripId]);

  // Initial fetch
  useEffect(() => {
    void fetchPassengers();
  }, [fetchPassengers]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-passengers-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passengers",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void fetchPassengers();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, fetchPassengers]);

  const addPassenger = useCallback(
    async (data: NewPassengerData): Promise<void> => {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("passengers")
        .insert({
          trip_id:          data.tripId,
          name:             data.name,
          email:            data.email ?? null,
          passport_number:  data.passportNumber ?? null,
          passport_expiry:  data.passportExpiry ?? null,
          nationality:      data.nationality ?? null,
          date_of_birth:    data.dateOfBirth ?? null,
          seat_preference:  data.seatPreference ?? null,
          meal_preference:  data.mealPreference ?? null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }
    },
    [],
  );

  const updatePassenger = useCallback(
    async (id: string, data: UpdatePassengerData): Promise<void> => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("passengers")
        .update({
          ...(data.name            !== undefined && { name:             data.name }),
          ...(data.email           !== undefined && { email:            data.email ?? null }),
          ...(data.passportNumber  !== undefined && { passport_number:  data.passportNumber ?? null }),
          ...(data.passportExpiry  !== undefined && { passport_expiry:  data.passportExpiry ?? null }),
          ...(data.nationality     !== undefined && { nationality:      data.nationality ?? null }),
          ...(data.dateOfBirth     !== undefined && { date_of_birth:    data.dateOfBirth ?? null }),
          ...(data.seatPreference  !== undefined && { seat_preference:  data.seatPreference ?? null }),
          ...(data.mealPreference  !== undefined && { meal_preference:  data.mealPreference ?? null }),
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    },
    [],
  );

  const removePassenger = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update
      setPassengers((prev) => prev.filter((p) => p.id !== id));

      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("passengers")
        .delete()
        .eq("id", id);

      if (deleteError) {
        // Revert on failure
        void fetchPassengers();
        throw new Error(deleteError.message);
      }
    },
    [fetchPassengers],
  );

  return {
    passengers,
    loading,
    error,
    addPassenger,
    updatePassenger,
    removePassenger,
    refresh: fetchPassengers,
  };
}
