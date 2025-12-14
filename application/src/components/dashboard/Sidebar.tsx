
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { MainNavigation } from "./sidebar/MainNavigation";
import { SettingsPanel } from "./sidebar/SettingsPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ collapsed: collapsedProp, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const { theme } = useTheme();
  const { sidebarCollapsed } = useSidebar();

  // Use context value, fallback to prop for backwards compatibility
  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div
        className={`
          hidden md:flex
          ${theme === 'dark' ? 'bg-[#121212] border-[#1e1e1e]' : 'bg-sidebar border-sidebar-border'}
          border-r flex-col h-full transition-all duration-200
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        <SidebarHeader collapsed={collapsed} />
        <MainNavigation collapsed={collapsed} />
        <SettingsPanel collapsed={collapsed} />
      </div>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-64 flex flex-col overflow-hidden">
          <div
            className={`
              ${theme === 'dark' ? 'bg-[#121212] border-[#1e1e1e]' : 'bg-sidebar border-sidebar-border'}
              flex flex-col h-full overflow-hidden
            `}
          >
            <SidebarHeader collapsed={false} />
            <div className="flex-1 overflow-y-auto">
              <MainNavigation collapsed={false} onItemClick={onMobileClose} />
              <SettingsPanel collapsed={false} onItemClick={onMobileClose} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};