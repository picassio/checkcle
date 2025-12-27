/**
 * SettingsPanel Component
 *
 * Collapsible settings section with refined animations.
 * Features visual separation from main nav, smooth expand/collapse,
 * and tooltip support in collapsed sidebar mode.
 */

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { settingsMenuItems } from "./navigationData";
import { usePermission } from "@/hooks/usePermission";

interface SettingsPanelProps {
  collapsed: boolean;
  onItemClick?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ collapsed, onItemClick }) => {
  const { t } = useLanguage();
  const { can } = usePermission();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSettingsItem, setActiveSettingsItem] = useState<string | null>("general");
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(true);

  // Filter settings items based on user permissions
  const visibleSettingsItems = settingsMenuItems.filter((item) => {
    if (!item.requiredPermission) {
      return true;
    }
    const [resource, action] = item.requiredPermission;
    return can(resource, action);
  });

  const hasAnySettingsAccess = visibleSettingsItems.length > 0;

  // Update active settings item based on URL
  useEffect(() => {
    if (location.pathname === '/settings') {
      setSettingsPanelOpen(true);
      const params = new URLSearchParams(location.search);
      const panel = params.get('panel');
      if (panel) {
        setActiveSettingsItem(panel);
      }
    }
  }, [location]);

  const handleMenuItemClick = (path: string, itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveSettingsItem(itemId);
    navigate(path, { replace: false });
    onItemClick?.();
  };

  if (!hasAnySettingsAccess) {
    return null;
  }

  const isSettingsActive = location.pathname === '/settings';

  // Collapsed mode - just show settings icon
  if (collapsed) {
    return (
      <div className="py-3 border-t border-slate-200 dark:border-slate-800">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={(e) => handleMenuItemClick('/settings?panel=general', 'general', e)}
              className={`
                group relative flex items-center justify-center
                mx-1.5 py-2.5 rounded-lg
                cursor-pointer select-none
                transition-all duration-150 ease-out
                ${isSettingsActive
                  ? 'bg-primary/8 dark:bg-primary/10'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }
              `}
            >
              {/* Active Indicator */}
              <div
                className={`
                  absolute left-0 top-1/2 -translate-y-1/2
                  w-[3px] rounded-r-full
                  transition-all duration-150 ease-out
                  ${isSettingsActive
                    ? 'h-5 bg-primary'
                    : 'h-0 bg-transparent group-hover:h-3 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  }
                `}
              />
              <Settings
                className={`
                  h-[18px] w-[18px]
                  transition-colors duration-150
                  ${isSettingsActive
                    ? 'text-primary'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }
                `}
                strokeWidth={isSettingsActive ? 2.5 : 2}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-medium">
            {t("settingPanel")}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 py-3">
      <Collapsible open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
        {/* Section Header / Trigger */}
        <CollapsibleTrigger className="w-full group">
          <div
            className={`
              flex items-center justify-between
              mx-2 px-3 py-2 rounded-lg
              transition-colors duration-150
              hover:bg-slate-100 dark:hover:bg-slate-800/60
            `}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {t("settingPanel")}
              </span>
            </div>
            <ChevronRight
              className={`
                h-4 w-4 text-slate-400 dark:text-slate-500
                transition-transform duration-200 ease-out
                ${settingsPanelOpen ? 'rotate-90' : ''}
              `}
            />
          </div>
        </CollapsibleTrigger>

        {/* Settings Items */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
          <div className="mt-1 space-y-0.5">
            {visibleSettingsItems.map((item) => {
              const isActive = activeSettingsItem === item.id && isSettingsActive;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleMenuItemClick(`/settings?panel=${item.id}`, item.id, e)}
                  className={`
                    group relative flex items-center gap-3
                    mx-2 ml-5 px-3 py-2 rounded-lg
                    cursor-pointer select-none
                    transition-all duration-150 ease-out
                    ${isActive
                      ? 'bg-primary/8 dark:bg-primary/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }
                  `}
                >
                  {/* Active Indicator */}
                  <div
                    className={`
                      absolute left-0 top-1/2 -translate-y-1/2
                      w-[3px] rounded-r-full
                      transition-all duration-150 ease-out
                      ${isActive
                        ? 'h-4 bg-primary'
                        : 'h-0 bg-transparent group-hover:h-2 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                      }
                    `}
                  />

                  <Icon
                    className={`
                      h-4 w-4 flex-shrink-0
                      transition-colors duration-150
                      ${isActive
                        ? 'text-primary'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }
                    `}
                  />
                  <span
                    className={`
                      text-[13px] font-medium truncate
                      transition-colors duration-150
                      ${isActive
                        ? 'text-primary'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                      }
                    `}
                  >
                    {t(item.translationKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
