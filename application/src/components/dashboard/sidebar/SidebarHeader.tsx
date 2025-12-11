
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";

interface SidebarHeaderProps {
  collapsed: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed }) => {
  const { theme } = useTheme();
  const { appName, appLogo } = useSidebar();

  return (
    <div className={`p-4 ${theme === 'dark' ? 'border-[#1e1e1e]' : 'border-sidebar-border'} border-b flex items-center ${collapsed ? 'justify-center' : ''}`}>
      <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center mr-2 flex-shrink-0">
        <img
          src={appLogo || "/favicon_sidebar.ico"}
          alt={appName}
          className="h-6 w-6"
        />
      </div>
      {!collapsed && <h1 className="text-xl font-semibold truncate">{appName}</h1>}
    </div>
  );
};