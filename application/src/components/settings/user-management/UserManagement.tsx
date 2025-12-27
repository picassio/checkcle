/**
 * UserManagement Component
 *
 * Main container for user management functionality.
 * Uses Modern Professional design system with card pattern.
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Loader2, AlertCircle, Plus, ShieldAlert } from "lucide-react";
import { authService } from "@/services/authService";
import { useLanguage } from "@/contexts/LanguageContext.tsx";
import { useUserManagement } from "./hooks";
import UserTable from "./UserTable";
import AddUserDialog from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import DeleteUserDialog from "./DeleteUserDialog";

const UserManagement = () => {
  const { t } = useLanguage();
  const {
    users,
    loading,
    error,
    newUserForm,
    isAddUserDialogOpen,
    setIsAddUserDialogOpen,
    isDialogOpen,
    setIsDialogOpen,
    isDeleting,
    setIsDeleting,
    isSubmitting,
    updateError,
    form,
    currentUser,
    userToDelete,
    handleEditUser,
    handleDeletePrompt,
    handleDeleteUser,
    onSubmit,
    onAddUser,
    fetchUsers
  } = useUserManagement();

  // Get the current logged in user to check their role
  const loggedInUser = authService.getCurrentUser();
  const isSuperAdmin = loggedInUser?.role === "superadmin";

  return (
    <div className="p-3 sm:p-4">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {t("userManagement")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            {isSuperAdmin && (
              <Button
                onClick={() => setIsAddUserDialogOpen(true)}
                size="sm"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addUser")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pt-0">
          {/* Permission Notice for non-super admins */}
          {!isSuperAdmin && (
            <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800/50">
              <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <span className="font-medium">{t("permissionNotice")}</span> As an admin user, you have access to view and modify existing user details. However, only Super Admins have permission to create new user accounts.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium mb-2">Failed to load users</p>
              <p className="text-muted-foreground mb-4 text-sm">{error}</p>
              <Button onClick={fetchUsers} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : (
            /* User Table */
            <UserTable
              users={users}
              onUserUpdate={handleEditUser}
              onUserDelete={handleDeletePrompt}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddUserDialog
        isOpen={isAddUserDialogOpen && isSuperAdmin}
        setIsOpen={setIsAddUserDialogOpen}
        form={newUserForm}
        onSubmit={onAddUser}
        isSubmitting={isSubmitting}
      />

      <EditUserDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        form={form}
        user={currentUser}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        error={updateError}
      />

      <DeleteUserDialog
        isOpen={isDeleting}
        setIsOpen={setIsDeleting}
        user={userToDelete}
        onDelete={handleDeleteUser}
        isDeleting={isSubmitting}
      />
    </div>
  );
};

export default UserManagement;
