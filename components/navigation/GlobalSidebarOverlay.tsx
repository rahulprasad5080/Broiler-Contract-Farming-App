/**
 * GlobalSidebarOverlay
 *
 * Renders the DashboardSidebar driven entirely by SidebarContext.
 * Place this once inside each role layout (owner, farmer, supervisor)
 * so the sidebar is available on every screen within that role.
 *
 * Individual screens can inject extra sidebar items via the
 * useExtraSidebarItems() hook.
 */
import React from 'react';
import { DashboardSidebar } from '@/components/navigation/DashboardSidebar';
import { useSidebar } from '@/context/SidebarContext';

type GlobalSidebarOverlayProps = {
  themeColor?: string;
};

const THEME_GREEN = '#0B5C36';

export function GlobalSidebarOverlay({
  themeColor = THEME_GREEN,
}: GlobalSidebarOverlayProps) {
  const { sidebarOpen, closeSidebar, extraSidebarItems } = useSidebar();

  return (
    <DashboardSidebar
      visible={sidebarOpen}
      onClose={closeSidebar}
      themeColor={themeColor}
      extraItems={extraSidebarItems}
    />
  );
}
