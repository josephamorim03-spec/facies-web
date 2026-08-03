"use client";

import { useEffect, useState } from "react";

import { getAuthToken } from "@/lib/auth";
import { getTrainerPrescription, type TrainerPrescription } from "@/lib/api";

type UseTrainerPrescription = {
  prescription: TrainerPrescription | null;
  loading: boolean;
};

/**
 * Shared read of the daily trainer prescription.
 *
 * - `no-store` (per-user, never shared-cached) — handled by the API client.
 * - Degrades to `null` on any failure so pages never break.
 * - Never records `shown` (that stays exclusive to `/hoje`).
 */
export function useTrainerPrescription(option: { enabled?: boolean } = {}): UseTrainerPrescription {
  const enabled = option.enabled ?? true;
  const [prescription, setPrescription] = useState<TrainerPrescription | null>(null);
  // `loading` is derived (never set synchronously in the effect body); the async
  // callbacks flip `ready` when the fetch settles.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const token = getAuthToken();
    getTrainerPrescription(token)
      .then((data) => {
        if (active) setPrescription(data);
      })
      .catch(() => {
        if (active) setPrescription(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { prescription, loading: enabled && !ready };
}
