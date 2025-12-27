/**
 * SidebarHeader Component
 *
 * Premium logo and branding section with refined styling.
 * Features subtle depth with background treatment and clean typography.
 */

import React from "react";
import { useBranding } from "@/contexts/BrandingContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarHeaderProps {
  collapsed: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed }) => {
  const { appName, logoUrl, showSidebarLogo } = useBranding();

  const logoContent = (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-4
        border-b border-slate-200 dark:border-slate-800
        ${collapsed ? 'justify-center px-3' : ''}
      `}
    >
      {/* Logo Container */}
      {showSidebarLogo && (
        <div
          className={`
            relative flex-shrink-0
            h-9 w-9 rounded-lg
            bg-gradient-to-br from-slate-100 to-slate-200
            dark:from-slate-800 dark:to-slate-900
            border border-slate-200 dark:border-slate-700
            flex items-center justify-center
            shadow-sm
            transition-transform duration-150
            ${!collapsed ? 'group-hover:scale-105' : ''}
          `}
        >
          <img
            src={logoUrl || "/favicon_sidebar.ico"}
            alt={appName}
            className="h-5 w-5 object-contain"
          />
        </div>
      )}

      {/* App Name */}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {appName}
          </h1>
        </div>
      )}
    </div>
  );

  // Show tooltip in collapsed mode
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {logoContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <span className="font-medium">{appName}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return logoContent;
};
