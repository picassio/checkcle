import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CoreWebVitalsCard } from "./dashboard/CoreWebVitalsCard";
import { CoachScoreCard } from "./dashboard/CoachScoreCard";
import { DetailedMetricsCard } from "./dashboard/DetailedMetricsCard";
import { SpeedIndexChart } from "./charts/SpeedIndexChart";
import { WebVitalsChart } from "./charts/WebVitalsChart";
import { VisualMetricsChart } from "./charts/VisualMetricsChart";
import { CPUMetricsChart } from "./charts/CPUMetricsChart";
import { PageSizeChart } from "./charts/PageSizeChart";
import { NavigationTimingChart } from "./charts/NavigationTimingChart";
import { RequestsBreakdownChart } from "./charts/RequestsBreakdownChart";
import { BudgetStatusCard } from "./dashboard/BudgetStatusCard";
import { HTMLReportViewer } from "./reports/HTMLReportViewer";
import { ArrowLeft, ExternalLink, Clock, Calendar, FileText, LayoutDashboard, BarChart3, Gauge } from "lucide-react";
import { PerformanceTest, PerformanceMetrics, formatMs, formatBytes, getWebVitalStatus } from "@/types/performance.types";
import { format } from "date-fns";

interface PerformanceDetailViewProps {
  test: PerformanceTest;
  onBack: () => void;
}

export function PerformanceDetailView({ test, onBack }: PerformanceDetailViewProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [selectedReportUrl, setSelectedReportUrl] = useState("");

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["performance-metrics", test.id, timeRange],
    queryFn: () => performanceService.getMetricsHistory(test.id, timeRange),
  });

  const latestMetrics = metrics[0];
  const averages = performanceService.calculateAverages(metrics);
  const budgetPassRate = performanceService.calculateBudgetPassRate(metrics);

  // Extract timestamp from report_path for URL construction
  const getReportUrlFromMetric = (metric: PerformanceMetrics): string | null => {
    if (!metric.report_path) return null;
    // report_path format: /opt/sitespeed-results/{testId}/{timestamp}/pages/...
    const parts = metric.report_path.split("/");
    const sitespeedIdx = parts.findIndex(p => p === "sitespeed-results");
    if (sitespeedIdx >= 0 && parts.length > sitespeedIdx + 2) {
      const testId = parts[sitespeedIdx + 1];
      const timestamp = parts[sitespeedIdx + 2];
      return performanceService.getReportUrl(testId, timestamp);
    }
    return null;
  };

  const openReport = (metric: PerformanceMetrics) => {
    const url = getReportUrlFromMetric(metric);
    if (url) {
      setSelectedReportUrl(url);
      setReportViewerOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back") || "Back"}
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-semibold flex flex-wrap items-center gap-2">
              <span className="truncate">{test.name}</span>
              <Badge variant={test.status === "active" ? "default" : "secondary"}>
                {test.status}
              </Badge>
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2 truncate">
              <a
                href={test.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{test.url}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {latestMetrics && getReportUrlFromMetric(latestMetrics) && (
            <Button variant="outline" size="sm" onClick={() => openReport(latestMetrics)} className="text-xs md:text-sm">
              <FileText className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("viewReport") || "View Report"}</span>
              <span className="sm:hidden">Report</span>
            </Button>
          )}
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-24 md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 {t("hours") || "Hours"}</SelectItem>
              <SelectItem value="7d">7 {t("days") || "Days"}</SelectItem>
              <SelectItem value="30d">30 {t("days") || "Days"}</SelectItem>
              <SelectItem value="90d">90 {t("days") || "Days"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      ) : metrics.length === 0 ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t("noMetricsYet") || "No metrics collected yet. Run the test to see results."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("overview") || "Overview"}</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("trends") || "Trends"}</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">{t("details") || "Details"}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t("history") || "History"}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("testsRun") || "Tests Run"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.length}</div>
                </CardContent>
              </Card>

              <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("budgetPassRate") || "Budget Pass Rate"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{budgetPassRate.toFixed(0)}%</div>
                </CardContent>
              </Card>

              <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("avgFullyLoaded") || "Avg Fully Loaded"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMs(averages?.fully_loaded || 0)}</div>
                </CardContent>
              </Card>

              <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("lastRun") || "Last Run"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    {latestMetrics
                      ? format(new Date(latestMetrics.timestamp), "MMM d, HH:mm")
                      : t("never")}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Core Web Vitals */}
            {latestMetrics && (
              <CoreWebVitalsCard
                lcp={latestMetrics.lcp}
                fcp={latestMetrics.fcp}
                cls={latestMetrics.cls}
                tbt={latestMetrics.tbt}
              />
            )}

            {/* Coach Score and Page Breakdown */}
            {latestMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CoachScoreCard data={latestMetrics} />
                <NavigationTimingChart data={latestMetrics} />
              </div>
            )}

            {/* Page Size and Requests */}
            {latestMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PageSizeChart data={latestMetrics} />
                <RequestsBreakdownChart data={latestMetrics} />
              </div>
            )}

            {/* Budget Status */}
            {latestMetrics?.budget_results && (
              <BudgetStatusCard
                budgetResults={latestMetrics.budget_results}
                testName={test.name}
              />
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpeedIndexChart data={metrics} />
              <WebVitalsChart data={metrics} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VisualMetricsChart data={metrics} />
              <CPUMetricsChart data={metrics} />
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {latestMetrics && (
              <DetailedMetricsCard
                current={latestMetrics}
                previous={metrics[1]}
              />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader>
                <CardTitle>{t("recentResults") || "Recent Results"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                        <th className="text-left py-2 px-4 font-medium">{t("time") || "Time"}</th>
                        <th className="text-left py-2 px-4 font-medium">LCP</th>
                        <th className="text-left py-2 px-4 font-medium">FCP</th>
                        <th className="text-left py-2 px-4 font-medium">CLS</th>
                        <th className="text-left py-2 px-4 font-medium">TTFB</th>
                        <th className="text-left py-2 px-4 font-medium">{t("requests") || "Requests"}</th>
                        <th className="text-left py-2 px-4 font-medium">{t("size") || "Size"}</th>
                        <th className="text-left py-2 px-4 font-medium">{t("budget") || "Budget"}</th>
                        <th className="text-left py-2 px-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.slice(0, 20).map((m) => (
                        <tr
                          key={m.id}
                          className={`border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}
                        >
                          <td className="py-2 px-4 text-sm">
                            {format(new Date(m.timestamp), "MMM d, HH:mm")}
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant={getWebVitalStatus("lcp", m.lcp) === "good" ? "default" : "destructive"}
                            >
                              {formatMs(m.lcp)}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant={getWebVitalStatus("fcp", m.fcp) === "good" ? "default" : "destructive"}
                            >
                              {formatMs(m.fcp)}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant={getWebVitalStatus("cls", m.cls) === "good" ? "default" : "destructive"}
                            >
                              {m.cls.toFixed(3)}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant={getWebVitalStatus("ttfb", m.ttfb) === "good" ? "default" : "destructive"}
                            >
                              {formatMs(m.ttfb)}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">{m.requests}</td>
                          <td className="py-2 px-4">{formatBytes(m.transfer_size)}</td>
                          <td className="py-2 px-4">
                            {m.budget_passed ? (
                              <Badge variant="default" className="bg-green-600">
                                {t("passed") || "Passed"}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">{t("failed") || "Failed"}</Badge>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {getReportUrlFromMetric(m) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReport(m)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                {t("viewReport") || "Report"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <HTMLReportViewer
        open={reportViewerOpen}
        onOpenChange={setReportViewerOpen}
        reportUrl={selectedReportUrl}
        testName={test.name}
      />
    </div>
  );
}
