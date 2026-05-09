type Timer = ReturnType<typeof setTimeout>;

export function createDraftPersistenceController() {
  let pendingSave: Timer | null = null;
  let suppressNextSave = false;

  const cancelPendingSave = () => {
    if (pendingSave) {
      clearTimeout(pendingSave);
      pendingSave = null;
    }
  };

  return {
    scheduleSave(save: () => void, delayMs: number) {
      if (suppressNextSave) {
        suppressNextSave = false;
        cancelPendingSave();
        return;
      }

      cancelPendingSave();
      pendingSave = setTimeout(() => {
        pendingSave = null;
        save();
      }, delayMs);
    },
    async clear(clearStorage: () => Promise<void> | void) {
      cancelPendingSave();
      suppressNextSave = true;
      await clearStorage();
    },
    saveImmediately(save: () => void) {
      if (suppressNextSave) {
        suppressNextSave = false;
        cancelPendingSave();
        return;
      }

      cancelPendingSave();
      save();
    },
    cancelPendingSave,
  };
}
