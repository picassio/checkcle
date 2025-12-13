import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { performanceService } from '@/services/performanceService';
import { QueueStatus, QueueItem } from '@/types/performance.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, Clock, ChevronDown, ChevronUp, X, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface QueueStatusBannerProps {
  onRefresh?: () => void;
  testNames?: Record<string, string>; // Map of test_id -> test_name for display
}

export function QueueStatusBanner({ onRefresh, testNames = {} }: QueueStatusBannerProps) {
  const { t } = useLanguage();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueueStatus = async () => {
    try {
      const status = await performanceService.getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    // Poll every 5 seconds
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelItem = async (itemId: string) => {
    try {
      await performanceService.cancelQueueItem(itemId);
      toast.success(t('queueItemCancelled') || 'Queue item cancelled');
      fetchQueueStatus();
      onRefresh?.();
    } catch (error) {
      toast.error(t('failedToCancelQueueItem') || 'Failed to cancel queue item');
    }
  };

  const getTestName = (testId: string) => {
    return testNames[testId] || testId;
  };

  const formatQueuedTime = (queuedAt: string) => {
    try {
      return formatDistanceToNow(new Date(queuedAt), { addSuffix: true });
    } catch {
      return queuedAt;
    }
  };

  // Don't show if there's nothing in the queue
  if (!isLoading && (!queueStatus || (!queueStatus.currently_running && queueStatus.total_pending === 0))) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className="bg-muted/50 border rounded-lg p-3 mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {queueStatus?.currently_running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {t('runningTest') || 'Running'}:{' '}
                  <span className="text-primary">
                    {getTestName(queueStatus.currently_running.test_id)}
                  </span>
                </span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('queueIdle') || 'Queue idle'}
                </span>
              </>
            )}

            {queueStatus && queueStatus.total_pending > 0 && (
              <Badge variant="secondary" className="ml-2">
                {queueStatus.total_pending} {t('pending') || 'pending'}
              </Badge>
            )}
          </div>

          {queueStatus && queueStatus.total_pending > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        <CollapsibleContent className="mt-3 space-y-2">
          {queueStatus?.pending_items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-background rounded border"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
                <div>
                  <span className="text-sm font-medium">
                    {getTestName(item.test_id)}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.source === 'manual' ? (
                        <Play className="h-3 w-3 inline mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 inline mr-1" />
                      )}
                      {item.source === 'manual'
                        ? (t('manualRun') || 'Manual')
                        : (t('scheduled') || 'Scheduled')}
                    </span>
                    <span>{formatQueuedTime(item.queued_at)}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelItem(item.id)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default QueueStatusBanner;
