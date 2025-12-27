/**
 * AddUserDialog Component
 *
 * Dialog for creating new user accounts.
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
import { UseFormReturn } from "react-hook-form";
import { UserPlus } from "lucide-react";
import AddUserForm from "./form-fields/AddUserForm";

interface AddUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const AddUserDialog = ({ isOpen, setIsOpen, form, onSubmit, isSubmitting }: AddUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Add New User
            </DialogTitle>
            <DialogDescription className="text-sm">
              Create a new user account with role-based access
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4">
          <AddUserForm
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
