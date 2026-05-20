import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReset, UseFormWatch } from "react-hook-form";
import { AppState, AppStateStatus } from "react-native";

import { createDraftPersistenceController } from "./formPersistenceController";

/**
 * Persists React Hook Form data to AsyncStorage so that form values survive
 * app minimization, OS background kills, and navigation back/forth.
 *
 * Usage:
 *   const { clearPersistedData, isRestored } = useFormPersistence(
 *     'form_draft_create_batch',
 *     watch,
 *     reset,
 *     defaultValues,
 *   );
 *
 * Call `clearPersistedData()` after a successful form submission so the draft
 * does not re-appear the next time the user opens the form.
 *
 * `isRestored` is true for the first render cycle after saved values have been
 * loaded — use it to show a "Draft restored" indicator if desired.
 */
export function useFormPersistence<T extends FieldValues>(
  /** AsyncStorage key — must be unique per form screen */
  storageKey: string,
  /** `watch` returned by `useForm()` */
  watch: UseFormWatch<T>,
  /** `reset` returned by `useForm()` */
  reset: UseFormReset<T>,
  /**
   * The form's default values.
   * Saved values are merged over these so newly-added fields always get a
   * sensible default even when the persisted draft pre-dates a schema change.
   */
  defaultValues: T,
  options: { enabled?: boolean } = {},
): { clearPersistedData: () => Promise<void>; isRestored: boolean } {
  const enabled = options.enabled ?? true;
  const [isRestored, setIsRestored] = useState(false);
  const draftControllerRef = useRef(createDraftPersistenceController());
  const hasLoadedDraftRef = useRef(false);
  // Keep a stable ref to `watch` so AppState handler always reads current values
  const watchRef = useRef(watch);
  watchRef.current = watch;

  // ── 1. Load saved draft on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const draftController = draftControllerRef.current;
    setIsRestored(false);
    hasLoadedDraftRef.current = false;

    if (!enabled) {
      draftController.cancelPendingSave();
      return () => {
        cancelled = true;
      };
    }

    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) {
          hasLoadedDraftRef.current = true;
          return;
        }

        try {
          const saved = JSON.parse(raw) as Partial<T>;
          // Merge with defaultValues so missing keys always have a value
          reset({ ...defaultValues, ...saved } as T);
          setIsRestored(true);
        } catch {
          // Silently ignore corrupt / non-JSON data
        } finally {
          hasLoadedDraftRef.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) {
          hasLoadedDraftRef.current = true;
        }
      });

    return () => {
      cancelled = true;
      draftController.cancelPendingSave();
    };
    // defaultValues reference is stable (defined outside the component render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // ── 2. Debounced save on every field change ───────────────────────────────
  useEffect(() => {
    const draftController = draftControllerRef.current;

    if (!enabled) {
      draftController.cancelPendingSave();
      return;
    }

    const subscription = watch((values) => {
      if (!hasLoadedDraftRef.current) return;

      draftController.scheduleSave(
        () => {
          AsyncStorage.setItem(storageKey, JSON.stringify(values)).catch((err) =>
            console.warn("[useFormPersistence] Failed to save draft:", err),
          );
        },
        300,
      );
    });

    return () => {
      subscription.unsubscribe();
      draftController.cancelPendingSave();
    };
  }, [watch, storageKey, enabled]);

  // ── 3. Immediate save when app moves to background ───────────────────────
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (!hasLoadedDraftRef.current) return;

        const values = watchRef.current();
        draftControllerRef.current.saveImmediately(() =>
          AsyncStorage.setItem(storageKey, JSON.stringify(values)).catch((err) =>
            console.warn(
              "[useFormPersistence] Failed to save on background:",
              err,
            ),
          ),
        );
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [storageKey, enabled]);

  // ── 4. Cleanup helper — call after successful submission ──────────────────
  const clearPersistedData = useCallback(async () => {
    try {
      await draftControllerRef.current.clear(() => AsyncStorage.removeItem(storageKey));
    } catch (err) {
      console.warn("[useFormPersistence] Failed to clear draft:", err);
    }
  }, [storageKey]);

  return { clearPersistedData, isRestored };
}
