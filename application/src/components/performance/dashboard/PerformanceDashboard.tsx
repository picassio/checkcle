import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CoreWebVitalsCard } from "./CoreWebVitalsCard";
import { BudgetStatusCard } from "./BudgetStatusCard";
import { Activity, Clock, AlertCircle, CheckCircle2, Gauge } from "lucide-react";
import {
  getWebVitalStatus,
  getStatusColor,
  formatMs,
} from "@/types/performance.types";

export function PerformanceDashboard() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const { data: testsWithMetrics = [], isLoading } = useQuery({
    queryKey: ["performance-latest-metrics"],
    queryFn: () => performanceService.getLatestMetricsForAllTests(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

  // Calculate summary stats
  const activeTests = tests.filter((t) => t.status === "active").length;
  const runningTests = tests.filter((t) => t.status === "running").length;
  const errorTests = tests.filter((t) => t.status === "error").length;

  const testsWithData = testsWithMetrics.filter((t) => t.latest_metrics);
  const avgLCP =
    testsWithData.length > 0
      ? testsWithData.reduce((sum, t) => sum + (t.latest_metrics?.lcp || 0), 0) / testsWithData.length
      : 0;
  const avgFCP =
    testsWithData.length > 0
      ? testsWithData.reduce((sum, t) => sum + (t.latest_metrics?.fcp || 0), 0) / testsWithData.length
      : 0;
  const avgCLS =
    testsWithData.length > 0
      ? testsWithData.reduce((sum, t) => sum + (t.latest_metrics?.cls || 0), 0) / testsWithData.length
      : 0;
  const avgTBT =
    testsWithData.length > 0
      ? testsWithData.reduce((sum, t) => sum + (t.latest_metrics?.tbt || 0), 0) / testsWithData.length
      : 0;

  const budgetPassCount = testsWithData.filter((t) => t.latest_metrics?.budget_passed).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("activeTests") || "Active Tests"}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTests}</div>
            <p className="text-xs text-muted-foreground">
              {runningTests > 0 && (
                <span className="text-yellow-500">{runningTests} {t("running") || "running"}</span>
              )}
              {errorTests > 0 && (
                <span className="text-red-500 ml-2">{errorTests} {t("errors") || "errors"}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("avgLCP") || "Avg. LCP"}</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatMs(avgLCP)}</span>
              <Badge
                variant={getWebVitalStatus("lcp", avgLCP) === "good" ? "default" : "destructive"}
                className="text-xs"
              >
                {getWebVitalStatus("lcp", avgLCP)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("largestContentfulPaint") || "Largest Contentful Paint"}
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("avgCLS") || "Avg. CLS"}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{avgCLS.toFixed(3)}</span>
              <Badge
                variant={getWebVitalStatus("cls", avgCLS) === "good" ? "default" : "destructive"}
                className="text-xs"
              >
                {getWebVitalStatus("cls", avgCLS)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("cumulativeLayoutShift") || "Cumulative Layout Shift"}
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("budgetStatus") || "Budget Status"}</CardTitle>
            {budgetPassCount === testsWithData.length ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testsWithData.length > 0
                ? `${Math.round((budgetPassCount / testsWithData.length) * 100)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetPassCount}/{testsWithData.length} {t("testsPassed") || "tests passed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Web Vitals Overview */}
      <CoreWebVitalsCard lcp={avgLCP} fcp={avgFCP} cls={avgCLS} tbt={avgTBT} />

      {/* Test Results Table */}
      <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
        <CardHeader>
          <CardTitle>{t("latestResults") || "Latest Results"}</CardTitle>
        </CardHeader>
        <CardContent>
          {testsWithMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noPerformanceTests") || "No performance tests configured yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    <th className="text-left py-2 px-4 font-medium">{t("test") || "Test"}</th>
                    <th className="text-left py-2 px-4 font-medium">LCP</th>
                    <th className="text-left py-2 px-4 font-medium">FCP</th>
                    <th className="text-left py-2 px-4 font-medium">CLS</th>
                    <th className="text-left py-2 px-4 font-medium">TBT</th>
                    <th className="text-left py-2 px-4 font-medium">{t("budget") || "Budget"}</th>
                  </tr>
                </thead>
                <tbody>
                  {testsWithMetrics.map((item) => (
                    <tr
                      key={item.test_id}
                      className={`border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.test_name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{item.test_url}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.latest_metrics ? (
                          <Badge
                            variant={
                              getWebVitalStatus("lcp", item.latest_metrics.lcp) === "good"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {formatMs(item.latest_metrics.lcp)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.latest_metrics ? (
                          <Badge
                            variant={
                              getWebVitalStatus("fcp", item.latest_metrics.fcp) === "good"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {formatMs(item.latest_metrics.fcp)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.latest_metrics ? (
                          <Badge
                            variant={
                              getWebVitalStatus("cls", item.latest_metrics.cls) === "good"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {item.latest_metrics.cls.toFixed(3)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.latest_metrics ? (
                          <Badge
                            variant={
                              getWebVitalStatus("tbt", item.latest_metrics.tbt) === "good"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {formatMs(item.latest_metrics.tbt)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.latest_metrics ? (
                          item.latest_metrics.budget_passed ? (
                            <Badge variant="default" className="bg-green-600">
                              {t("passed") || "Passed"}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">{t("failed") || "Failed"}</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
