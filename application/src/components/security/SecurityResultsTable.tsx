import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityResult, severityOptions } from '@/types/security.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, ChevronLeft, ChevronRight, AlertTriangle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SeverityBadge } from './SeverityBadge';

interface SecurityResultsTableProps {
  scanId: string;
  onViewResult?: (result: SecurityResult) => void;
}

export function SecurityResultsTable({ scanId, onViewResult }: SecurityResultsTableProps) {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const perPage = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-results', scanId, page, severityFilter],
    queryFn: () =>
      securityService.getResultsPaginated(scanId, page, perPage, severityFilter || undefined),
    enabled: !!scanId,
  });

  const results = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading results...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View Component
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
            onClick={() => onViewResult?.(result)}
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
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
              Vulnerability Findings
            </CardTitle>
            <CardDescription className="text-sm">
              {totalItems} vulnerabilities found
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
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No vulnerabilities found matching your filter criteria.
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
                    <TableRow key={result.id}>
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
                        <a
                          href={result.matched_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate block"
                        >
                          {result.matched_url}
                        </a>
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
                      <TableCell>
                        {formatDistanceToNow(new Date(result.created), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewResult?.(result)}
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
  );
}

export default SecurityResultsTable;
