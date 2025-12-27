/**
 * EditUserDialog Component
 *
 * Dialog for editing existing user accounts.
 * Follows Modern Professional design system dialog patterns.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { User } from "@/services/userService";
import { Loader2, AlertCircle, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserTextField from "./form-fields/UserTextField";
import UserToggleField from "./form-fields/UserToggleField";
import UserRoleField from "./form-fields/UserRoleField";
import { useLanguage } from "@/contexts/LanguageContext";

interface EditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  form: UseFormReturn<any>;
  user: User | null;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

const EditUserDialog = ({
  isOpen,
  setIsOpen,
  form,
  user,
  onSubmit,
  isSubmitting = false,
  error = null
}: EditUserDialogProps) => {
  const { t } = useLanguage();

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              {t("editUser")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Text fields - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UserTextField
                  control={form.control}
                  name="full_name"
                  label="Full Name"
                  placeholder="Enter full name"
                />

                <UserTextField
                  control={form.control}
                  name="email"
                  label="Email"
                  placeholder="Enter email"
                  type="email"
                />

                <UserTextField
                  control={form.control}
                  name="username"
                  label="Username"
                  placeholder="Enter username"
                />
              </div>

              {/* Role field - full width for radio cards */}
              <UserRoleField
                control={form.control}
                name="role"
                label="Role"
              />

              <UserToggleField
                control={form.control}
                name="isActive"
                label="Active Status"
                description="User will be able to access the system"
              />
            </form>
          </Form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                t("updateUser")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
