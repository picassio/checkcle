/**
 * ScanRunHistory Component
 *
 * Displays a list of scan run history with clickable cards.
 * Follows Modern Professional design system patterns.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { permissionService } from '@/services/permissionService';
import { SecurityQueueItem } from '@/types/security.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  History,
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  PlayCircle,
  Calendar,
  Link2,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface ScanRunHistoryProps {
  scanId: string;
  onRunSelect: (run: SecurityQueueItem) => void;
  selectedRunId?: string;
}

// Status badge helper - semantic colors from design system
const getRunStatusClasses = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'failed':
    case 'timeout':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
    case 'cancelled':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    case 'processing':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }
};

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'failed':
    case 'timeout':
      return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
  }
};

// Source badge component
const SourceBadge = ({ source }: { source: string }) => {
  const isScheduled = source === 'scheduled';
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isScheduled
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
          : 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800'
      }`}
    >
      {isScheduled ? 'Scheduled' : 'Manual'}
    </Badge>
  );
};

export function ScanRunHistory({ scanId, onRunSelect, selectedRunId }: ScanRunHistoryProps) {
  const queryClient = useQueryClient();
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);

  // Check if user can manage this scan (required for delete)
  const canManage = permissionService.getEffectiveAccessLevel('security_scans', scanId) === 'manage';

  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ['security-queue-by-scan', scanId],
    queryFn: () => securityService.getQueueItemsByScan(scanId),
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => securityService.deleteQueueItem(runId),
    onSuccess: () => {
      toast.success('Scan run deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['security-queue-by-scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['security-queue'] });
      setDeleteRunId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete scan run: ${error.message}`);
    },
  });

  const handleDelete = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    setDeleteRunId(runId);
  };

  const confirmDelete = () => {
    if (deleteRunId) {
      deleteMutation.mutate(deleteRunId);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Loading run history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Run Card Component - Mobile
  const MobileRunCard = ({ run, index }: { run: SecurityQueueItem; index: number }) => {
    const isSelected = selectedRunId === run.id;
    const hasFindings = run.findings_count > 0;

    return (
      <div
        onClick={() => onRunSelect(run)}
        className={`
          group mb-3 rounded-lg border bg-card p-4 cursor-pointer
          transition-all duration-200 hover:shadow-md hover:border-primary/20
          active:scale-[0.99]
          ${isSelected ? 'ring-2 ring-primary border-primary/30' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`
              p-2 rounded-lg flex-shrink-0
              ${run.status === 'completed' && hasFindings
                ? 'bg-rose-100 dark:bg-rose-900/30'
                : run.status === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-slate-100 dark:bg-slate-800'
              }
            `}>
              {run.status === 'completed' && hasFindings ? (
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              ) : run.status === 'completed' ? (
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <StatusIcon status={run.status} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">Run #{runs!.length - index}</div>
              <div className="text-xs text-muted-foreground">
                {run.completed_at
                  ? formatDistanceToNow(new Date(run.completed_at), { addSuffix: true })
                  : run.started_at
                    ? `Started ${formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}`
                    : formatDistanceToNow(new Date(run.created), { addSuffix: true })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="outline" className={`text-xs ${getRunStatusClasses(run.status)}`}>
              <StatusIcon status={run.status} />
              <span className="ml-1 capitalize">{run.status}</span>
            </Badge>
            {run.findings_count > 0 && (
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {run.findings_count} findings
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SourceBadge source={run.source} />
          {run.scanned_urls_count > 0 && (
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {run.scanned_urls_count} URLs
            </span>
          )}
          {run.scan_mode_used && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {run.scan_mode_used}
            </Badge>
          )}
        </div>

        {run.error && (
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 truncate">
            Error: {run.error}
          </div>
        )}

        {/* Reveal on hover - View indicator */}
        <div className="mt-3 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-xs text-muted-foreground">
          <span>Click to view results</span>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                onClick={(e) => handleDelete(e, run.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  };

  // Desktop Run Card
  const DesktopRunCard = ({ run, index }: { run: SecurityQueueItem; index: number }) => {
    const isSelected = selectedRunId === run.id;
    const hasFindings = run.findings_count > 0;

    return (
      <div
        onClick={() => onRunSelect(run)}
        className={`
          group rounded-lg border bg-card p-4 cursor-pointer
          transition-all duration-200 hover:shadow-md hover:border-primary/20
          ${isSelected ? 'ring-2 ring-primary border-primary/30' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`
              p-2.5 rounded-lg flex-shrink-0
              ${run.status === 'completed' && hasFindings
                ? 'bg-rose-100 dark:bg-rose-900/30'
                : run.status === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-slate-100 dark:bg-slate-800'
              }
            `}>
              {run.status === 'completed' && hasFindings ? (
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              ) : run.status === 'completed' ? (
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <StatusIcon status={run.status} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Run #{runs!.length - index}</span>
                <Badge variant="outline" className={`text-xs ${getRunStatusClasses(run.status)}`}>
                  <StatusIcon status={run.status} />
                  <span className="ml-1 capitalize">{run.status}</span>
                </Badge>
                <SourceBadge source={run.source} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                {run.started_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(run.started_at), 'MMM d, yyyy HH:mm')}
                  </span>
                )}
                {run.scanned_urls_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {run.scanned_urls_count} URLs scanned
                  </span>
                )}
                {run.scan_mode_used && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {run.scan_mode_used}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {run.findings_count > 0 ? (
              <div className="text-right">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {run.findings_count}
                </div>
                <div className="text-xs text-muted-foreground">findings</div>
              </div>
            ) : run.status === 'completed' ? (
              <div className="text-right">
                <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Clean
                </div>
                <div className="text-xs text-muted-foreground">No issues</div>
              </div>
            ) : null}

            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                onClick={(e) => handleDelete(e, run.id)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRunSelect(run);
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {run.error && (
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 truncate">
            Error: {run.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-900/30">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
              </div>
              Scan Run History
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {runs && runs.length > 0
                ? `${runs.length} scan runs recorded`
                : 'No scan runs yet'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pt-0">
        {!runs || runs.length === 0 ? (
          /* Empty State */
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-3 rounded-full bg-muted mb-4">
                <PlayCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">No scan runs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Click "Run Now" to start your first scan and see results here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden space-y-0">
              {runs.map((run, index) => (
                <MobileRunCard key={run.id} run={run} index={index} />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block space-y-3">
              {runs.map((run, index) => (
                <DesktopRunCard key={run.id} run={run} index={index} />
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRunId} onOpenChange={(open) => !open && setDeleteRunId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scan run? This will also delete all associated vulnerability findings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default ScanRunHistory;
