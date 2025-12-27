
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templateService, AnyTemplate, TemplateType } from "@/services/templateService";
import { usePermission } from "@/hooks/usePermission";

interface TemplateListProps {
  templates: AnyTemplate[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  refetchTemplates: () => void;
  templateType: TemplateType;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  isLoading,
  onEdit,
  refetchTemplates,
  templateType
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Permission checking - templates require alerts:manage permission
  const { can } = usePermission();
  const canManageAlerts = can('alerts', 'manage');

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id, templateType),
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['notification_templates', templateType] });
      refetchTemplates();
    },
    onError: (error) => {
     // console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    setDeleteTemplateId(id);
  };

  const confirmDelete = () => {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-48"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
              <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-6 md:py-8">
        <p className="text-sm md:text-base text-muted-foreground">No templates found. Create your first template to get started.</p>
      </div>
    );
  }

  const getTemplateTypeLabel = (type: TemplateType) => {
    switch (type) {
      case 'server': return 'Server';
      case 'service': return 'Service';
      case 'ssl': return 'SSL';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <div className="space-y-3 md:space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 gap-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm md:text-base truncate">{template.name}</h3>
                <Badge variant="outline" className="text-xs">{getTemplateTypeLabel(templateType)}</Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Created: {new Date(template.created).toLocaleDateString()}
                {template.updated !== template.created &&
                  <span className="hidden sm:inline"> • Updated: {new Date(template.updated).toLocaleDateString()}</span>
                }
              </p>
            </div>
            {canManageAlerts && (
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(template.id)}
                  className="h-8 text-xs md:text-sm"
                >
                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};