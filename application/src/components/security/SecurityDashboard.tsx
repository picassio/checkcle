import { useQuery } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, AlertCircle, Activity, Target, CheckCircle } from 'lucide-react';

export function SecurityDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-dashboard-stats'],
    queryFn: () => securityService.getDashboardStats(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="h-12 md:h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Scans',
      value: stats.totalScans,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Scans',
      value: stats.activeScans,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Findings',
      value: stats.totalFindings,
      icon: Shield,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Critical',
      value: stats.criticalFindings,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      badge: stats.criticalFindings > 0 ? 'destructive' : undefined,
    },
    {
      title: 'High',
      value: stats.highFindings,
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      badge: stats.highFindings > 0 ? 'warning' : undefined,
    },
  ];

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-1.5 md:p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-3 w-3 md:h-4 md:w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <div className="text-xl md:text-2xl font-bold">{card.value}</div>
              {card.badge && card.value > 0 && (
                <Badge variant={card.badge as 'destructive' | 'default'} className="text-xs w-fit">
                  <span className="hidden sm:inline">Needs attention</span>
                  <span className="sm:hidden">!</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SecurityOverviewProps {
  scanId?: string;
}

export function SecurityScanOverview({ scanId }: SecurityOverviewProps) {
  const { data: breakdown, isLoading } = useQuery({
    queryKey: ['security-severity-breakdown', scanId],
    queryFn: () => securityService.getSeverityBreakdown(scanId!),
    enabled: !!scanId,
    refetchInterval: 30000,
  });

  if (isLoading || !breakdown) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="h-24 md:h-32 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const severityItems = [
    { key: 'critical', label: 'Critical', color: 'bg-red-600', textColor: 'text-red-600' },
    { key: 'high', label: 'High', color: 'bg-orange-500', textColor: 'text-orange-500' },
    { key: 'medium', label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { key: 'low', label: 'Low', color: 'bg-blue-500', textColor: 'text-blue-500' },
    { key: 'info', label: 'Info', color: 'bg-gray-500', textColor: 'text-gray-500' },
  ];

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Shield className="h-4 w-4 md:h-5 md:w-5" />
          Severity Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {total === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">
            <CheckCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-green-600">No vulnerabilities found</p>
            <p className="text-xs md:text-sm">Your target appears to be secure</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="flex h-3 md:h-4 rounded-full overflow-hidden bg-muted">
              {severityItems.map((item) => {
                const count = breakdown[item.key] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <div
                    key={item.key}
                    className={`${item.color} transition-all`}
                    style={{ width: `${percentage}%` }}
                    title={`${item.label}: ${count}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {severityItems.map((item) => {
                const count = breakdown[item.key] || 0;
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${item.color}`} />
                    <div className="flex flex-col">
                      <span className="text-xs md:text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-sm md:text-base font-bold ${item.textColor}`}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="pt-3 md:pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Findings</span>
                <span className="text-xl md:text-2xl font-bold">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SecurityDashboard;
