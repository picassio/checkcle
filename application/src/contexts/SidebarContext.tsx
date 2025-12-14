
import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';

const SIDEBAR_COLLAPSED_KEY = 'checkcle_sidebar_collapsed';

interface SidebarContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  appName: string;
  appLogo: string | null;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [appName, setAppName] = useState('CheckCle');
  const [appLogo, setAppLogo] = useState<string | null>(null);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (e) {
      console.error('Failed to save sidebar state:', e);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobile = () => {
    setMobileOpen(!mobileOpen);
  };

  // Fetch app name from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingsService.getGeneralSettings();
        if (settings) {
          if (settings.meta?.appName) {
            setAppName(settings.meta.appName);
          } else if (settings.system_name) {
            setAppName(settings.system_name);
          }
          if (settings.logo_url) {
            setAppLogo(settings.logo_url);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings for sidebar:', error);
      }
    };
    fetchSettings();
  }, []);

  const value = {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    mobileOpen,
    setMobileOpen,
    toggleMobile,
    appName,
    appLogo
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
