/**
 * UserTable Component
 *
 * Displays users in a table (desktop) or card list (mobile) with
 * color-coded RBAC role badges.
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Edit,
  Trash2,
  Crown,
  Shield,
  Wrench,
  Eye,
  UserCog,
  Sparkles,
} from "lucide-react";
import { User } from "@/services/userService";
import { getRoleColor } from "./hooks/useRoles";

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

const UserTable = ({ users, onUserUpdate, onUserDelete }: UserTableProps) => {
  // Helper function to get the user's initials for the avatar fallback
  const getUserInitials = (user: User): string => {
    return (user.full_name || user.username || "").substring(0, 2).toUpperCase();
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user }: { user: User }) => (
    <Card className="mb-3 bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 flex-shrink-0">
              {user.avatar ? (
                <AvatarImage
                  src={user.avatar}
                  alt={user.full_name || user.username}
                />
              ) : (
                <AvatarFallback>
                  {getUserInitials(user)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{user.full_name || "-"}</div>
              <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onUserUpdate(user)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onUserDelete(user)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground truncate">{user.email}</div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <RoleBadge role={user.role || "viewer"} size="sm" />
          {user.isActive !== false ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-1.5 py-0.5">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 text-[10px] px-1.5 py-0.5">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found
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
            <TableRow className="bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.avatar ? (
                          <AvatarImage
                            src={user.avatar}
                            alt={user.full_name || user.username}
                          />
                        ) : (
                          <AvatarFallback>
                            {getUserInitials(user)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{user.full_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role || "viewer"} />
                  </TableCell>
                  <TableCell>
                    {user.isActive !== false ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onUserUpdate(user)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onUserDelete(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
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
