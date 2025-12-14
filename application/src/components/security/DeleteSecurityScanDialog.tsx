import { useMutation, useQueryClient } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityScan } from '@/types/security.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface DeleteSecurityScanDialogProps {
  scan: SecurityScan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSecurityScanDialog({
  scan,
  open,
  onOpenChange,
}: DeleteSecurityScanDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (scanId: string) => securityService.deleteScan(scanId),
    onSuccess: () => {
      toast.success('Security scan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete scan: ${error.message}`);
    },
  });

  if (!scan) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Security Scan</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the security scan "{scan.name}"? This will also delete
            all associated vulnerability findings and scan history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate(scan.id)}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteSecurityScanDialog;
