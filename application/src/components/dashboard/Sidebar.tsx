/**
 * Sidebar Component
 *
 * Modern Professional sidebar with refined industrial aesthetic.
 * Features proper light/dark mode support, smooth transitions,
 * and polished mobile drawer experience.
 */

import React from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { MainNavigation } from "./sidebar/MainNavigation";
import { SettingsPanel } from "./sidebar/SettingsPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ collapsed: collapsedProp, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const { sidebarCollapsed } = useSidebar();

  // Use context value, fallback to prop for backwards compatibility
  const collapsed = sidebarCollapsed;

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col h-full
          bg-slate-50 dark:bg-slate-900/95
          border-r border-slate-200 dark:border-slate-800
          transition-all duration-200 ease-out
          ${collapsed ? 'w-[68px]' : 'w-64'}
        `}
      >
        {/* Subtle top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <SidebarHeader collapsed={collapsed} />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <MainNavigation collapsed={collapsed} />
          <SettingsPanel collapsed={collapsed} />
        </div>

        {/* Subtle bottom fade */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </aside>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] border-r-0 bg-slate-50 dark:bg-slate-900/95"
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>

          <div className="flex flex-col h-[calc(100%-24px)] overflow-hidden">
            <SidebarHeader collapsed={false} />

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <MainNavigation collapsed={false} onItemClick={onMobileClose} />
              <SettingsPanel collapsed={false} onItemClick={onMobileClose} />
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};
