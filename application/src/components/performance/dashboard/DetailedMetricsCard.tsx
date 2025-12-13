import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PerformanceMetrics, formatMs, formatBytes, getWebVitalStatus } from "@/types/performance.types";
import {
  Gauge,
  Clock,
  Layout,
  Timer,
  Zap,
  Database,
  Globe,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface DetailedMetricsCardProps {
  current: PerformanceMetrics;
  previous?: PerformanceMetrics;
}

function MetricTrend({ current, previous, higherIsBetter = false }: { current: number; previous?: number; higherIsBetter?: boolean }) {
  if (!previous || previous === 0) return null;

  const diff = current - previous;
  const percentChange = ((diff / previous) * 100);

  if (Math.abs(percentChange) < 1) {
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }

  const isImprovement = higherIsBetter ? diff > 0 : diff < 0;

  return (
    <span className={`flex items-center text-xs ${isImprovement ? 'text-green-500' : 'text-red-500'}`}>
      {isImprovement ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {Math.abs(percentChange).toFixed(1)}%
    </span>
  );
}

export function DetailedMetricsCard({ current, previous }: DetailedMetricsCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const cardClass = theme === "dark" ? "bg-gray-900 border-gray-800" : "";
  const subCardClass = theme === "dark" ? "bg-gray-800" : "bg-gray-50";

  const metrics = [
    // Core Web Vitals
    {
      category: t("coreWebVitals") || "Core Web Vitals",
      items: [
        {
          name: "LCP",
          value: current.lcp,
          prevValue: previous?.lcp,
          format: formatMs,
          icon: Gauge,
          status: getWebVitalStatus('lcp', current.lcp),
          description: t("lcpDesc") || "Largest Contentful Paint"
        },
        {
          name: "FCP",
          value: current.fcp,
          prevValue: previous?.fcp,
          format: formatMs,
          icon: Clock,
          status: getWebVitalStatus('fcp', current.fcp),
          description: t("fcpDesc") || "First Contentful Paint"
        },
        {
          name: "CLS",
          value: current.cls,
          prevValue: previous?.cls,
          format: (v: number) => v.toFixed(3),
          icon: Layout,
          status: getWebVitalStatus('cls', current.cls),
          description: t("clsDesc") || "Cumulative Layout Shift"
        },
        {
          name: "TBT",
          value: current.tbt,
          prevValue: previous?.tbt,
          format: formatMs,
          icon: Timer,
          status: getWebVitalStatus('tbt', current.tbt),
          description: t("tbtDesc") || "Total Blocking Time"
        },
      ]
    },
    // Load Timing Metrics
    {
      category: t("loadTiming") || "Load Timing",
      items: [
        {
          name: t("fullyLoaded") || "Fully Loaded",
          value: current.fully_loaded,
          prevValue: previous?.fully_loaded,
          format: formatMs,
          icon: Globe,
          description: t("fullyLoadedDesc") || "Time until page is fully loaded"
        },
        {
          name: t("backendTime") || "Backend Time",
          value: current.backend_time,
          prevValue: previous?.backend_time,
          format: formatMs,
          icon: Clock,
          description: t("backendTimeDesc") || "Server processing time"
        },
        {
          name: t("frontendTime") || "Frontend Time",
          value: current.frontend_time,
          prevValue: previous?.frontend_time,
          format: formatMs,
          icon: Clock,
          description: t("frontendTimeDesc") || "Browser rendering time"
        },
        {
          name: "TBT",
          value: current.tbt,
          prevValue: previous?.tbt,
          format: formatMs,
          icon: Timer,
          status: getWebVitalStatus('tbt', current.tbt),
          description: t("tbtDesc") || "Total Blocking Time"
        },
      ]
    },
    // Server Response
    {
      category: t("serverResponse") || "Server Response",
      items: [
        {
          name: "TTFB",
          value: current.ttfb,
          prevValue: previous?.ttfb,
          format: formatMs,
          icon: ArrowUpDown,
          status: getWebVitalStatus('ttfb', current.ttfb),
          description: t("ttfbDesc") || "Time to First Byte"
        },
        {
          name: "DNS",
          value: current.dns_time,
          prevValue: previous?.dns_time,
          format: formatMs,
          icon: Globe,
          description: t("dnsDesc") || "DNS Lookup Time"
        },
        {
          name: t("connect") || "Connect",
          value: current.connect_time,
          prevValue: previous?.connect_time,
          format: formatMs,
          icon: ArrowUpDown,
          description: t("connectDesc") || "TCP Connection Time"
        },
        {
          name: "SSL",
          value: current.ssl_time,
          prevValue: previous?.ssl_time,
          format: formatMs,
          icon: ArrowUpDown,
          description: t("sslDesc") || "SSL Handshake Time"
        },
      ]
    },
    // Page Stats
    {
      category: t("pageStats") || "Page Stats",
      items: [
        {
          name: t("requests") || "Requests",
          value: current.requests,
          prevValue: previous?.requests,
          format: (v: number) => v.toString(),
          icon: Globe,
          description: t("requestsDesc") || "Total HTTP Requests"
        },
        {
          name: t("transferSize") || "Transfer Size",
          value: current.transfer_size,
          prevValue: previous?.transfer_size,
          format: formatBytes,
          icon: Database,
          description: t("transferSizeDesc") || "Total Transfer Size"
        },
        {
          name: t("domElements") || "DOM Elements",
          value: current.dom_elements,
          prevValue: previous?.dom_elements,
          format: (v: number) => v.toString(),
          icon: Layout,
          description: t("domDesc") || "Number of DOM Elements"
        },
        {
          name: t("thirdParty") || "3rd Party",
          value: current.third_party_requests,
          prevValue: previous?.third_party_requests,
          format: (v: number) => v.toString(),
          icon: Globe,
          description: t("thirdPartyDesc") || "Third Party Requests"
        },
      ]
    },
  ];

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-500" />
          {t("detailedMetrics") || "Detailed Metrics"}
          {previous && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {t("vsLastRun") || "vs. last run"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((category) => (
            <div key={category.category} className={`p-4 rounded-lg ${subCardClass}`}>
              <h3 className="font-medium mb-4">{category.category}</h3>
              <div className="space-y-3">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TooltipProvider key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${
                                item.status === 'good' ? 'text-green-500' :
                                item.status === 'needs-improvement' ? 'text-yellow-500' :
                                item.status === 'poor' ? 'text-red-500' : 'text-muted-foreground'
                              }`} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {item.value ? item.format(item.value) : "-"}
                              </span>
                              <MetricTrend current={item.value} previous={item.prevValue} />
                              {item.status && (
                                <Badge
                                  variant={item.status === 'good' ? 'default' : item.status === 'needs-improvement' ? 'secondary' : 'destructive'}
                                  className="text-xs h-5"
                                >
                                  {item.status === 'good' ? 'G' : item.status === 'needs-improvement' ? 'NI' : 'P'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
