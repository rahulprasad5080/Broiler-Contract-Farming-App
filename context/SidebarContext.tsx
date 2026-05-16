/**
 * SidebarContext
 * Provides global sidebar open/close state so any screen can
 * toggle the DashboardSidebar via the hamburger icon in the TopAppBar.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

type SidebarContextValue = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  /** Extra sidebar action items injected by individual screens (e.g., User Settings) */
  extraSidebarItems: any[];
  setExtraSidebarItems: (items: any[]) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [extraSidebarItems, setExtraSidebarItems] = useState<any[]>([]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        extraSidebarItems,
        setExtraSidebarItems,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used inside <SidebarProvider>');
  }
  return ctx;
}
