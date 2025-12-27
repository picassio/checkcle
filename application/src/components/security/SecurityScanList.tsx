import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityScan } from '@/types/security.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, MoreVertical, Trash2, Edit, Eye, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { SeverityBadge } from './SeverityBadge';
import { usePermission } from '@/hooks/usePermission';
import { permissionService } from '@/services/permissionService';

interface SecurityScanListProps {
  onEdit?: (scan: SecurityScan) => void;
  onDelete?: (scan: SecurityScan) => void;
}

export function SecurityScanList({ onEdit, onDelete }: SecurityScanListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Permission checking for resource filtering
  const { getAssignedResourceIds, loading: permissionLoading } = usePermission();

  // Helper function to check if user can manage a specific scan
  const canManageScan = (scanId: string): boolean => {
    const accessLevel = permissionService.getEffectiveAccessLevel('security_scans', scanId);
    return accessLevel === 'manage';
  };

  const { data: allScans, isLoading: scansLoading, refetch } = useQuery({
    queryKey: ['security-scans'],
    queryFn: () => securityService.getScans(),
    refetchInterval: 30000,
  });

  // Filter security scans based on user's resource assignments
  const scans = useMemo(() => {
    const assignedIds = getAssignedResourceIds('security_scans');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allScans;
    }

    // Empty array means no access to any security scans
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show assigned security scans
    return allScans?.filter(scan => assignedIds.includes(scan.id));
  }, [allScans, getAssignedResourceIds]);

  // Combined loading state
  const isLoading = scansLoading || permissionLoading;

  const runScanMutation = useMutation({
    mutationFn: (scanId: string) => securityService.runScanNow(scanId),
    onSuccess: () => {
      toast.success('Scan queued successfully');
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      queryClient.invalidateQueries({ queryKey: ['security-queue'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to queue scan: ${error.message}`);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ scanId, currentStatus }: { scanId: string; currentStatus: string }) =>
      securityService.toggleScanStatus(scanId, currentStatus),
    onSuccess: () => {
      toast.success('Scan status updated');
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      running: 'default',
      error: 'destructive',
    };
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      paused: 'bg-gray-500',
      running: 'bg-blue-500 animate-pulse',
      error: 'bg-red-500',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading scans...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View Component
  const MobileScanCard = ({ scan }: { scan: SecurityScan }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{scan.name}</span>
              {getStatusBadge(scan.status)}
            </div>
            <a
              href={scan.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline truncate block"
            >
              {scan.target_url}
            </a>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/security/${scan.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              {canManageScan(scan.id) && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(scan)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        scanId: scan.id,
                        currentStatus: scan.status,
                      })
                    }
                  >
                    {scan.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDelete?.(scan)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">Findings</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-medium">{scan.findings_count || 0}</span>
              {(scan.critical_count || 0) > 0 && (
                <SeverityBadge severity="critical" className="text-xs" />
              )}
              {(scan.high_count || 0) > 0 && (
                <SeverityBadge severity="high" className="text-xs" />
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Last Scan</span>
            <span className="font-medium">
              {scan.last_scan
                ? formatDistanceToNow(new Date(scan.last_scan), { addSuffix: true })
                : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Schedule</span>
            <span className="font-medium">
              {securityService.formatScanInterval(scan.scan_interval)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          {canManageScan(scan.id) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => runScanMutation.mutate(scan.id)}
              disabled={runScanMutation.isPending || scan.status === 'running'}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/security/${scan.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Shield className="h-5 w-5" />
              Security Scans
            </CardTitle>
            <CardDescription className="text-sm">
              Manage your vulnerability scans
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        {!scans || scans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No security scans configured. Create your first scan to get started.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden">
              {scans.map((scan) => (
                <MobileScanCard key={scan.id} scan={scan} />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Last Scan</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-medium">{scan.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <a
                          href={scan.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {scan.target_url}
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(scan.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{scan.findings_count || 0}</span>
                          {(scan.critical_count || 0) > 0 && (
                            <SeverityBadge severity="critical" className="text-xs" />
                          )}
                          {(scan.high_count || 0) > 0 && (
                            <SeverityBadge severity="high" className="text-xs" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {scan.last_scan
                          ? formatDistanceToNow(new Date(scan.last_scan), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {securityService.formatScanInterval(scan.scan_interval)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManageScan(scan.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => runScanMutation.mutate(scan.id)}
                              disabled={runScanMutation.isPending || scan.status === 'running'}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/security/${scan.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManageScan(scan.id) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit?.(scan)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleStatusMutation.mutate({
                                      scanId: scan.id,
                                      currentStatus: scan.status,
                                    })
                                  }
                                >
                                  {scan.status === 'active' ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => onDelete?.(scan)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SecurityScanList;
