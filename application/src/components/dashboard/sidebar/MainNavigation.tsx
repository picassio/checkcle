/**
 * MainNavigation Component
 *
 * Primary navigation section with permission-based filtering.
 * Features consistent spacing and subtle section header.
 */

import React from "react";
import { MenuItem } from "./MenuItem";
import { mainMenuItems } from "./navigationData";
import { usePermission } from "@/hooks/usePermission";

interface MainNavigationProps {
  collapsed: boolean;
  onItemClick?: () => void;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({ collapsed, onItemClick }) => {
  const { can, loading } = usePermission();

  // Filter menu items based on user permissions
  const visibleMenuItems = mainMenuItems.filter((item) => {
    // If permissions are still loading, only show items without permission requirements
    if (loading) {
      return !item.requiredPermission;
    }
    // If no permission required, show the item
    if (!item.requiredPermission) {
      return true;
    }
    // Check if user has the required permission
    const [resource, action] = item.requiredPermission;
    return can(resource, action);
  });

  return (
    <nav className="flex-1 py-3 overflow-y-auto overscroll-contain">
      {/* Navigation Label - hidden when collapsed */}
      {!collapsed && (
        <div className="px-5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Navigation
          </span>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-0.5">
        {visibleMenuItems.map((item) => (
          <MenuItem
            key={item.id}
            id={item.id}
            path={item.path || null}
            icon={item.icon}
            translationKey={item.translationKey}
            color={item.color || ''}
            hasNavigation={item.hasNavigation ?? true}
            collapsed={collapsed}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </nav>
  );
};
