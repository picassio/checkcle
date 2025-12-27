/**
 * UserTable Component
 *
 * Displays users in a table (desktop) or card list (mobile) with
 * color-coded RBAC role badges. Features clickable cards with
 * reveal-on-hover actions following Modern Professional design system.
 */

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Trash2,
  Crown,
  Shield,
  Wrench,
  Eye,
  UserCog,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { User } from "@/services/userService";
import { getRoleColor } from "./hooks/useRoles";
import { useLanguage } from "@/contexts/LanguageContext";

export interface UserTableProps {
  users: User[];
  onUserUpdate: (user: User) => void;
  onUserDelete: (user: User) => void;
}

// Role display name mapping
const getRoleDisplayName = (roleName: string): string => {
  const displayNames: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Admin",
    service_manager: "Service Manager",
    operator: "Operator",
    viewer: "Viewer",
  };
  return displayNames[roleName] || roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, " ");
};

// Role icon mapping
const getRoleIcon = (roleName: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    superadmin: Crown,
    admin: Shield,
    service_manager: Wrench,
    operator: UserCog,
    viewer: Eye,
  };
  return iconMap[roleName] || Sparkles;
};

// Status badge helper - semantic colors from design system
const getStatusBadgeClasses = (isActive: boolean): string => {
  return isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
};

// Role Badge Component
const RoleBadge = ({ role, size = "default" }: { role: string; size?: "default" | "sm" }) => {
  const colors = getRoleColor(role);
  const Icon = getRoleIcon(role);
  const displayName = getRoleDisplayName(role);

  const sizeClasses = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-1"
    : "text-xs px-2 py-1 gap-1.5";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-md border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses}
      `}
    >
      <Icon className={iconSize} />
      <span>{displayName}</span>
    </span>
  );
};

// Status Badge Component
const StatusBadge = ({ isActive, size = "default" }: { isActive: boolean; size?: "default" | "sm" }) => {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "";

  return (
    <Badge variant="outline" className={`${getStatusBadgeClasses(isActive)} ${sizeClasses}`}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
};

const UserTable = ({ users, onUserUpdate, onUserDelete }: UserTableProps) => {
  const { t } = useLanguage();

  // Helper function to get the user's initials for the avatar fallback
  const getUserInitials = (user: User): string => {
    return (user.full_name || user.username || "").substring(0, 2).toUpperCase();
  };

  // Mobile User Card Component - Clickable with reveal-on-hover actions
  const MobileUserCard = ({ user }: { user: User }) => (
    <div
      onClick={() => onUserUpdate(user)}
      className="group mb-3 rounded-lg border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-background shadow-sm">
            {user.avatar ? (
              <AvatarImage
                src={user.avatar}
                alt={user.full_name || user.username}
              />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                {getUserInitials(user)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{user.full_name || "-"}</div>
            <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
          </div>
        </div>

        {/* Reveal-on-hover action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onUserUpdate(user);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onUserDelete(user);
              }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 text-xs text-muted-foreground truncate">{user.email}</div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <RoleBadge role={user.role || "viewer"} size="sm" />
        <StatusBadge isActive={user.isActive !== false} size="sm" />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-sm">No users found</div>
          </div>
        ) : (
          users.map((user) => (
            <MobileUserCard key={user.id} user={user} />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Username</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="group cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onUserUpdate(user)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                        {user.avatar ? (
                          <AvatarImage
                            src={user.avatar}
                            alt={user.full_name || user.username}
                          />
                        ) : (
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{user.full_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role || "viewer"} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={user.isActive !== false} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserUpdate(user);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserDelete(user);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default UserTable;
