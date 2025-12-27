
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
    <nav className="my-2 mx-1 py-1 px-1">
      {visibleMenuItems.map((item) => (
        <MenuItem
          key={item.id}
          id={item.id}
          path={item.path}
          icon={item.icon}
          translationKey={item.translationKey}
          color={item.color}
          hasNavigation={item.hasNavigation}
          collapsed={collapsed}
          onItemClick={onItemClick}
        />
      ))}
    </nav>
  );
};
