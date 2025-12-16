import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityQueueItem } from '@/types/security.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, XCircle, Clock, PlayCircle, CheckCircle, AlertCircle, Loader2, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SecurityQueueStatusProps {
  showDetails?: boolean;
}

export function SecurityQueueStatus({ showDetails = true }: SecurityQueueStatusProps) {
  const queryClient = useQueryClient();

  const { data: queueStatus, isLoading, refetch } = useQuery({
    queryKey: ['security-queue'],
    queryFn: () => securityService.getQueueStatus(),
    refetchInterval: 5000,
  });

  const cancelMutation = useMutation({
    mutationFn: (itemId: string) => securityService.cancelQueueItem(itemId),
    onSuccess: () => {
      toast.success('Queue item cancelled');
      queryClient.invalidateQueries({ queryKey: ['security-queue'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'timeout':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      timeout: 'destructive',
      cancelled: 'outline',
    };
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      processing: 'bg-blue-500 animate-pulse',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      timeout: 'bg-orange-500',
      cancelled: 'bg-gray-500',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        <span className="flex items-center gap-1">
          {getStatusIcon(status)}
          <span className="hidden sm:inline">{status}</span>
        </span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Loading queue status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queueStatus) return null;

  const { currently_running, pending_items, total_pending, recent_items } = queueStatus;

  // Compact banner view when no details needed
  if (!showDetails) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        {currently_running ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm">Scan running...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Queue idle</span>
          </div>
        )}
        {total_pending > 0 && (
          <Badge variant="secondary">{total_pending} pending</Badge>
        )}
      </div>
    );
  }

  // Scanned URLs display component
  const ScannedURLsInfo = ({ item }: { item: SecurityQueueItem }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!item.scanned_urls_count || item.scanned_urls_count === 0) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-7 px-2">
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {item.scanned_urls_count} URL{item.scanned_urls_count !== 1 ? 's' : ''} scanned
              {item.scan_mode_used && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                  {item.scan_mode_used}
                </Badge>
              )}
            </span>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1">
          <div className="bg-muted rounded p-2 text-xs max-h-32 overflow-y-auto">
            {item.scanned_urls_sample && item.scanned_urls_sample.length > 0 ? (
              <>
                {item.scanned_urls_sample.map((url, idx) => (
                  <div key={idx} className="truncate text-muted-foreground py-0.5">
                    {url}
                  </div>
                ))}
                {item.scanned_urls_count > item.scanned_urls_sample.length && (
                  <div className="text-muted-foreground italic mt-1">
                    ... and {item.scanned_urls_count - item.scanned_urls_sample.length} more
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">No URL samples available</div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Mobile Queue Item Card
  const MobileQueueItemCard = ({ item, showCancel = false }: { item: SecurityQueueItem; showCancel?: boolean }) => (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getStatusBadge(item.status)}
            <Badge variant="outline" className="text-xs">{item.source}</Badge>
          </div>
          {showCancel && (item.status === 'pending' || item.status === 'processing') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelMutation.mutate(item.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Priority:</span>{' '}
            <span className="font-medium">{item.priority}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Queued:</span>{' '}
            <span className="font-medium">
              {formatDistanceToNow(new Date(item.queued_at || item.created), { addSuffix: true })}
            </span>
          </div>
          {item.completed_at && (
            <div>
              <span className="text-muted-foreground">Completed:</span>{' '}
              <span className="font-medium">
                {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
              </span>
            </div>
          )}
          {item.findings_count !== undefined && (
            <div>
              <span className="text-muted-foreground">Findings:</span>{' '}
              <span className="font-medium">{item.findings_count}</span>
            </div>
          )}
        </div>
        {item.error && (
          <div className="mt-2 text-xs text-red-500 truncate">
            Error: {item.error}
          </div>
        )}
        <ScannedURLsInfo item={item} />
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <PlayCircle className="h-4 w-4 md:h-5 md:w-5" />
            Scan Queue
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
        {/* Currently Running */}
        {currently_running && (
          <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm md:text-base">Scan in Progress</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Started {formatDistanceToNow(new Date(currently_running.started_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-blue-500 w-fit">
                  {currently_running.source}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate(currently_running.id)}
                  disabled={cancelMutation.isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Queue */}
        {pending_items && pending_items.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">Pending ({total_pending})</h4>

            {/* Mobile View */}
            <div className="md:hidden">
              {pending_items.map((item: SecurityQueueItem) => (
                <MobileQueueItemCard key={item.id} item={item} showCancel />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Queued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending_items.map((item: SecurityQueueItem) => (
                    <TableRow key={item.id}>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.source}</Badge>
                      </TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(item.queued_at || item.created), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelMutation.mutate(item.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          !currently_running && (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scans in queue</p>
            </div>
          )
        )}

        {/* Recent Items */}
        {recent_items && recent_items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Scans</h4>

            {/* Mobile View */}
            <div className="md:hidden">
              {recent_items.slice(0, 5).map((item: SecurityQueueItem) => (
                <MobileQueueItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>URLs Scanned</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent_items.slice(0, 5).map((item: SecurityQueueItem) => (
                    <TableRow key={item.id}>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.source}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.completed_at
                          ? formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {item.scanned_urls_count ? (
                          <div className="flex items-center gap-1">
                            <span>{item.scanned_urls_count}</span>
                            {item.scan_mode_used && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {item.scan_mode_used}
                              </Badge>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.findings_count !== undefined ? item.findings_count : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-red-500">
                        {item.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SecurityQueueStatus;
