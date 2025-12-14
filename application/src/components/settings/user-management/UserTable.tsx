
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
import { Edit, Trash2 } from "lucide-react";
import { User } from "@/services/userService";

export interface UserTableProps {
  users: User[];
  onUserUpdate: (user: User) => void;
  onUserDelete: (user: User) => void;
}

const UserTable = ({ users, onUserUpdate, onUserDelete }: UserTableProps) => {
  // Helper function to get the user's initials for the avatar fallback
  const getUserInitials = (user: User): string => {
    return (user.full_name || user.username || "").substring(0, 2).toUpperCase();
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user }: { user: User }) => (
    <Card className="mb-3">
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
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onUserDelete(user)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground truncate">{user.email}</div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">{user.role || "user"}</Badge>
          {user.isActive !== false ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
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
            <TableRow>
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
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role || "user"}</TableCell>
                  <TableCell>
                    {user.isActive !== false ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
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
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
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
