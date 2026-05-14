import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef } from "react";

import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import { getOfflineQueueCount, processOfflineQueue } from "@/services/offlineSyncQueue";

export function useOfflineSyncQueue(accessToken: string | null) {
  const processingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (!accessToken || processingRef.current) return;

    const pendingCount = await getOfflineQueueCount();
    if (!pendingCount) return;

    processingRef.current = true;
    try {
      const result = await processOfflineQueue(accessToken);
      if (result.synced > 0) {
        showSuccessToast(
          result.remaining > 0
            ? `${result.synced} offline item(s) synced. ${result.remaining} still pending.`
            : `${result.synced} offline item(s) synced successfully.`,
        );
      }
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Offline sync failed",
        fallbackMessage: "Saved drafts will retry when the network is available.",
      });
    } finally {
      processingRef.current = false;
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return undefined;

    void syncQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected !== false && state.isInternetReachable !== false) {
        void syncQueue();
      }
    });

    return unsubscribe;
  }, [accessToken, syncQueue]);
}
