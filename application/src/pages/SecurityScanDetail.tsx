import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { authService } from '@/services/authService';
import { securityService } from '@/services/securityService';
import { SecurityResult } from '@/types/security.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SecurityScanOverview,
  SecurityResultsTable,
  SecurityResultDetail,
} from '@/components/security';
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Shield,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

const SecurityScanDetail = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();
  const currentUser = authService.getCurrentUser();
  const [selectedResult, setSelectedResult] = useState<SecurityResult | null>(null);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const {
    data: scan,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['security-scan', scanId],
    queryFn: () => securityService.getScan(scanId!),
    enabled: !!scanId,
    refetchInterval: 10000,
  });

  const runScanMutation = useMutation({
    mutationFn: () => securityService.runScanNow(scanId!),
    onSuccess: () => {
      toast.success('Scan queued successfully');
      queryClient.invalidateQueries({ queryKey: ['security-scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['security-queue'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to queue scan: ${error.message}`);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () => securityService.toggleScanStatus(scanId!, scan!.status),
    onSuccess: () => {
      toast.success('Scan status updated');
      queryClient.invalidateQueries({ queryKey: ['security-scan', scanId] });
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      );
    }

    if (!scan) {
      return (
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Scan not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/security')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Security Scans
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/security')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>

        {/* Scan Info Card */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2 text-xl md:text-2xl">
                  <Shield className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />
                  <span className="truncate">{scan.name}</span>
                  {getStatusBadge(scan.status)}
                </CardTitle>
                <CardDescription className="mt-2">
                  <a
                    href={scan.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center gap-1 break-all"
                  >
                    <span className="truncate">{scan.target_url}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runScanMutation.mutate()}
                  disabled={runScanMutation.isPending || scan.status === 'running'}
                  className="flex-1 sm:flex-none"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Run Now</span>
                  <span className="sm:hidden">Run</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatusMutation.mutate()}
                  disabled={toggleStatusMutation.isPending}
                  className="flex-1 sm:flex-none"
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
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                  Last Scan
                </span>
                <p className="text-sm md:text-base font-medium">
                  {scan.last_scan
                    ? formatDistanceToNow(new Date(scan.last_scan), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 md:h-4 md:w-4" />
                  Next Scan
                </span>
                <p className="text-sm md:text-base font-medium">
                  {scan.next_scan
                    ? format(new Date(scan.next_scan), 'PPp')
                    : scan.scan_interval === 0
                    ? 'Manual only'
                    : 'Pending'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs md:text-sm text-muted-foreground">Schedule</span>
                <p className="text-sm md:text-base font-medium">
                  {securityService.formatScanInterval(scan.scan_interval)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs md:text-sm text-muted-foreground">Total Findings</span>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-sm md:text-base font-medium">{scan.findings_count || 0}</span>
                  {(scan.critical_count || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {scan.critical_count} critical
                    </Badge>
                  )}
                  {(scan.high_count || 0) > 0 && (
                    <Badge variant="default" className="text-xs bg-orange-500">
                      {scan.high_count} high
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {(scan.template_tags?.length > 0 || scan.severity_filter?.length > 0) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {scan.template_tags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs md:text-sm text-muted-foreground">Template Tags:</span>
                    {scan.template_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {scan.severity_filter?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs md:text-sm text-muted-foreground">Severity Filter:</span>
                    {scan.severity_filter.map((sev) => (
                      <Badge key={sev} variant="outline" className="text-xs">
                        {sev}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <SecurityScanOverview scanId={scanId} />

        {/* Results Table */}
        <SecurityResultsTable scanId={scanId!} onViewResult={setSelectedResult} />

        {/* Result Detail Dialog */}
        <SecurityResultDetail
          result={selectedResult}
          open={!!selectedResult}
          onOpenChange={(open) => !open && setSelectedResult(null)}
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          toggleMobile={toggleMobile}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SecurityScanDetail;
