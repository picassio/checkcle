/**
 * ScanRunResults Component
 *
 * Displays vulnerability results for a specific scan run.
 * Filters results by the run's time window (started_at to completed_at).
 * Follows Modern Professional design system patterns.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityQueueItem, SecurityResult, severityOptions } from '@/types/security.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Link2,
  Calendar,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { SeverityBadge } from './SeverityBadge';

interface ScanRunResultsProps {
  scanId: string;
  run: SecurityQueueItem;
  onBack: () => void;
  onViewResult: (result: SecurityResult) => void;
}

// Status badge helper
const getRunStatusClasses = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'failed':
    case 'timeout':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }
};

export function ScanRunResults({ scanId, run, onBack, onViewResult }: ScanRunResultsProps) {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const perPage = 20;

  // Use queue_id for filtering results (direct link to this run)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-results-by-run', run.id, page, severityFilter],
    queryFn: () =>
      securityService.getResultsByQueueId(
        run.id,
        page,
        perPage,
        severityFilter || undefined
      ),
    enabled: !!run?.id,
  });

  const results = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  const hasFindings = run.findings_count > 0;

  // Mobile Result Card
  const MobileResultCard = ({ result }: { result: SecurityResult }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={result.severity} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(result.created), { addSuffix: true })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewResult(result)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-xs text-muted-foreground block">Template</span>
            <span className="font-medium text-sm truncate block">{result.template_name}</span>
            <span className="text-xs text-muted-foreground truncate block">{result.template_id}</span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block">Host</span>
            <span className="font-mono text-sm">{result.host}</span>
          </div>

          {result.matched_url && (
            <div>
              <span className="text-xs text-muted-foreground block">URL</span>
              <a
                href={result.matched_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm truncate block"
              >
                {result.matched_url}
              </a>
            </div>
          )}

          {result.cve_ids && result.cve_ids.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">CVEs</span>
              <div className="flex flex-wrap gap-1">
                {result.cve_ids.slice(0, 3).map((cve) => (
                  <Badge key={cve} variant="outline" className="text-xs">
                    {cve}
                  </Badge>
                ))}
                {result.cve_ids.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{result.cve_ids.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Back Button & Run Summary Header */}
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="w-fit -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Run History
            </Button>

            {/* Run Summary */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`
                  p-2.5 rounded-lg flex-shrink-0
                  ${hasFindings
                    ? 'bg-rose-100 dark:bg-rose-900/30'
                    : run.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }
                `}>
                  {hasFindings ? (
                    <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  ) : run.status === 'completed' ? (
                    <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Clock className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    Scan Run Results
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getRunStatusClasses(run.status)}`}>
                        {run.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          run.source === 'scheduled'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400'
                        }`}
                      >
                        {run.source}
                      </Badge>
                      {run.scan_mode_used && (
                        <Badge variant="outline" className="text-xs">
                          {run.scan_mode_used}
                        </Badge>
                      )}
                    </div>
                  </CardDescription>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {run.findings_count > 0 ? (
                  <div className="text-center sm:text-right">
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {run.findings_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Findings</div>
                  </div>
                ) : run.status === 'completed' ? (
                  <div className="text-center sm:text-right">
                    <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      Clean
                    </div>
                    <div className="text-xs text-muted-foreground">No issues</div>
                  </div>
                ) : null}

                {run.scanned_urls_count > 0 && (
                  <div className="text-center sm:text-right">
                    <div className="text-xl font-bold">{run.scanned_urls_count}</div>
                    <div className="text-xs text-muted-foreground">URLs Scanned</div>
                  </div>
                )}

                {run.started_at && (
                  <div className="col-span-2 sm:col-span-1 text-center sm:text-right">
                    <div className="text-sm font-medium">
                      {format(new Date(run.started_at), 'MMM d, HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">Started</div>
                  </div>
                )}
              </div>
            </div>

            {run.error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
                <div className="text-sm text-rose-700 dark:text-rose-400">
                  <strong>Error:</strong> {run.error}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Results Table */}
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
                Vulnerability Findings
              </CardTitle>
              <CardDescription className="text-sm">
                {totalItems} vulnerabilities found in this run
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={severityFilter}
                onValueChange={(value) => {
                  setSeverityFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px] md:w-[150px]">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {severityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pt-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-base font-medium">No vulnerabilities found</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                {severityFilter
                  ? `No ${severityFilter} vulnerabilities in this scan run.`
                  : 'This scan run completed without finding any security issues.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden">
                {results.map((result) => (
                  <MobileResultCard key={result.id} result={result} />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Matched URL</TableHead>
                      <TableHead>CVE</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id} className="group">
                        <TableCell>
                          <SeverityBadge severity={result.severity} />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="font-medium truncate">{result.template_name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.template_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{result.host}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {result.matched_url ? (
                            <a
                              href={result.matched_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline truncate block"
                            >
                              {result.matched_url}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.cve_ids && result.cve_ids.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {result.cve_ids.slice(0, 2).map((cve) => (
                                <Badge key={cve} variant="outline" className="text-xs">
                                  {cve}
                                </Badge>
                              ))}
                              {result.cve_ids.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.cve_ids.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(result.created), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewResult(result)}
                            >
                              View
                            </Button>
                            {result.matched_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={result.matched_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({totalItems} total)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ScanRunResults;
