
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { MainNavigation } from "./sidebar/MainNavigation";
import { SettingsPanel } from "./sidebar/SettingsPanel";

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar = ({ collapsed: collapsedProp }: SidebarProps) => {
  const { theme } = useTheme();
  const { sidebarCollapsed } = useSidebar();

  // Use context value, fallback to prop for backwards compatibility
  const collapsed = sidebarCollapsed;

  return (
    <div
      className={`
        ${theme === 'dark' ? 'bg-[#121212] border-[#1e1e1e]' : 'bg-sidebar border-sidebar-border'}
        border-r flex flex-col h-full transition-all duration-200
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <SidebarHeader collapsed={collapsed} />
      <MainNavigation collapsed={collapsed} />
      <SettingsPanel collapsed={collapsed} />
    </div>
  );
};