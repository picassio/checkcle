
import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { UserTextField } from "./";
import { UserToggleField } from "./";
import { UserRoleField } from "./";
import { DialogFooter } from "@/components/ui/dialog";

interface AddUserFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const AddUserForm = ({ form, onSubmit, isSubmitting }: AddUserFormProps) => {
  return (
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

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default AddUserForm;