/**
 * MenuItem Component
 *
 * Navigation item with refined active states and tooltip support.
 * Features left accent border on active, smooth transitions,
 * and tooltips when sidebar is collapsed.
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MenuItemProps {
  id: string;
  path: string | null;
  icon: LucideIcon;
  translationKey: string;
  color: string;
  hasNavigation: boolean;
  collapsed: boolean;
  onItemClick?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  id,
  path,
  icon: Icon,
  translationKey,
  color,
  hasNavigation,
  collapsed,
  onItemClick
}) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasNavigation && path) {
      navigate(path, { replace: false });
      onItemClick?.();
    }
  };

  const isActive = path && location.pathname === path;
  const label = t(translationKey);

  const menuItemContent = (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-center gap-3
        mx-2 px-3 py-2.5 rounded-lg
        cursor-pointer select-none
        transition-all duration-150 ease-out
        ${collapsed ? 'justify-center mx-1.5 px-0' : ''}
        ${isActive
          ? 'bg-primary/8 dark:bg-primary/10'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }
      `}
    >
      {/* Active Indicator - Left Border */}
      <div
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          w-[3px] rounded-r-full
          transition-all duration-150 ease-out
          ${isActive
            ? 'h-5 bg-primary'
            : 'h-0 bg-transparent group-hover:h-3 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
          }
        `}
      />

      {/* Icon */}
      <div
        className={`
          flex-shrink-0 flex items-center justify-center
          transition-colors duration-150
          ${collapsed ? 'w-10 h-10 rounded-lg' : ''}
          ${isActive
            ? 'text-primary'
            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
          }
        `}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
      </div>

      {/* Label */}
      {!collapsed && (
        <span
          className={`
            text-[13px] font-medium tracking-tight
            transition-colors duration-150
            truncate
            ${isActive
              ? 'text-primary dark:text-primary'
              : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
            }
          `}
        >
          {label}
        </span>
      )}
    </div>
  );

  // Wrap with tooltip when collapsed
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {menuItemContent}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="font-medium"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuItemContent;
};
