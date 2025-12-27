/**
 * AddUserForm Component
 *
 * Form for creating new users with role-based access.
 * Follows Modern Professional design system patterns.
 */

import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { UserTextField } from "./";
import { UserToggleField } from "./";
import { UserRoleField } from "./";
import UserProfilePictureField from "./UserProfilePictureField";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddUserFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onCancel?: () => void;
}

const AddUserForm = ({ form, onSubmit, isSubmitting, onCancel }: AddUserFormProps) => {
  const { t } = useLanguage();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Picture Selection */}
        <UserProfilePictureField control={form.control} />

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

        {/* Password fields - responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UserTextField
            control={form.control}
            name="password"
            label="Password"
            placeholder="Enter password"
            type="password"
          />

          <UserTextField
            control={form.control}
            name="passwordConfirm"
            label="Confirm Password"
            placeholder="Confirm password"
            type="password"
          />
        </div>

        <UserToggleField
          control={form.control}
          name="isActive"
          label="Active Status"
          description="User will be able to access the system"
        />

        {/* Fixed Footer */}
        <div className="pt-4 border-t bg-muted/30 -mx-4 sm:-mx-6 px-4 sm:px-6 -mb-4 pb-4 mt-6">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {t("cancel")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                t("createUser")
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default AddUserForm;
