
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useBranding } from "@/contexts/BrandingContext";

interface SidebarHeaderProps {
  collapsed: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed }) => {
  const { theme } = useTheme();
  const { appName, logoUrl, showSidebarLogo } = useBranding();

  return (
    <div className={`p-4 ${theme === 'dark' ? 'border-[#1e1e1e]' : 'border-sidebar-border'} border-b flex items-center ${collapsed ? 'justify-center' : ''}`}>
      {showSidebarLogo && (
        <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center mr-2 flex-shrink-0">
          <img
            src={logoUrl || "/favicon_sidebar.ico"}
            alt={appName}
            className="h-6 w-6"
          />
        </div>
      )}
      {!collapsed && <h1 className="text-xl font-semibold truncate">{appName}</h1>}
    </div>
  );
};