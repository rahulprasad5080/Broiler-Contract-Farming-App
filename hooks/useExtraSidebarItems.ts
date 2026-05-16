/**
 * useExtraSidebarItems
 *
 * A convenience hook for screens that need to inject extra action items
 * into the global DashboardSidebar (e.g., the Owner Dashboard adds
 * "User Settings").
 *
 * Usage:
 *   useExtraSidebarItems(myExtraItems);
 *
 * Items are registered on mount and cleared on unmount automatically.
 */
import { useEffect } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import type { DashboardSidebarAction } from '@/components/navigation/DashboardSidebar';

export function useExtraSidebarItems(items: DashboardSidebarAction[]) {
  const { setExtraSidebarItems } = useSidebar();

  useEffect(() => {
    setExtraSidebarItems(items);
    return () => {
      setExtraSidebarItems([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
