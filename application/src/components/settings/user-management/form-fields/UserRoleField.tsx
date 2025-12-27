/**
 * UserRoleField Component
 *
 * Dynamic role selector that loads RBAC roles from the database.
 * Features color-coded role cards with descriptions for clear hierarchy.
 */

import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles, getRoleColor } from "../hooks/useRoles";
import {
  Crown,
  Shield,
  Wrench,
  Eye,
  UserCog,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface UserRoleFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  disabled?: boolean;
}

// Role icon mapping
const getRoleIcon = (roleName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    superadmin: Crown,
    admin: Shield,
    service_manager: Wrench,
    operator: UserCog,
    viewer: Eye,
  };
  return iconMap[roleName] || Sparkles;
};

const UserRoleField = ({ control, name, label, disabled = false }: UserRoleFieldProps) => {
  const { roles, loading, error } = useRoles();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load roles. Please refresh the page.</span>
        </div>
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {roles.map((role) => {
                const colors = getRoleColor(role.name);
                const Icon = getRoleIcon(role.name);
                const isSelected = field.value === role.name;

                return (
                  <label
                    key={role.id}
                    className={`
                      relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer
                      transition-all duration-150 ease-out
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm active:scale-[0.98]'}
                      ${isSelected
                        ? `${colors.border} ${colors.bg} shadow-sm`
                        : 'border-muted hover:border-muted-foreground/30 bg-card'
                      }
                    `}
                  >
                    <RadioGroupItem
                      value={role.name}
                      id={`role-${role.id}`}
                      className="sr-only"
                    />

                    {/* Icon */}
                    <div className={`
                      shrink-0 p-2 rounded-md mt-0.5
                      ${isSelected ? colors.bg : 'bg-muted'}
                    `}>
                      <Icon className={`h-4 w-4 ${isSelected ? colors.text : 'text-muted-foreground'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? colors.text : 'text-foreground'}`}>
                          {role.display_name}
                        </span>
                        {role.is_system && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {role.description}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className={`
                        absolute top-2 right-2 w-2 h-2 rounded-full
                        ${colors.text.replace('text-', 'bg-').split(' ')[0]}
                      `} />
                    )}
                  </label>
                );
              })}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default UserRoleField;
