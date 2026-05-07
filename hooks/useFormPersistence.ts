import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FieldValues, UseFormWatch, UseFormReset } from 'react-hook-form';

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
): { clearPersistedData: () => void; isRestored: boolean } {
  const [isRestored, setIsRestored] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to `watch` so AppState handler always reads current values
  const watchRef = useRef(watch);
  watchRef.current = watch;

  // ── 1. Load saved draft on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(storageKey).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<T>;
        // Merge with defaultValues so missing keys always have a value
        reset({ ...defaultValues, ...saved } as T);
        setIsRestored(true);
      } catch {
        // Silently ignore corrupt / non-JSON data
      }
    });

    return () => {
      cancelled = true;
    };
    // We intentionally run this only once on mount.
    // defaultValues reference is stable (defined outside the component render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // ── 2. Debounced save on every field change ───────────────────────────────
  useEffect(() => {
    const subscription = watch((values) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        AsyncStorage.setItem(storageKey, JSON.stringify(values)).catch(
          (err) => console.warn('[useFormPersistence] Failed to save draft:', err),
        );
      }, 300);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [watch, storageKey]);

  // ── 3. Immediate save when app moves to background ───────────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Cancel any pending debounce and write immediately
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        const values = watchRef.current();
        AsyncStorage.setItem(storageKey, JSON.stringify(values)).catch(
          (err) => console.warn('[useFormPersistence] Failed to save on background:', err),
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [storageKey]);

  // ── 4. Cleanup helper — call after successful submission ──────────────────
  const clearPersistedData = useCallback(() => {
    AsyncStorage.removeItem(storageKey).catch(
      (err) => console.warn('[useFormPersistence] Failed to clear draft:', err),
    );
  }, [storageKey]);

  return { clearPersistedData, isRestored };
}
