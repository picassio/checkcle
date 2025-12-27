import { useMemo } from "react";
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
import { usePermission } from "@/hooks/usePermission";

export function PerformanceDashboard() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Permission checking for resource filtering
  const { getAssignedResourceIds, loading: permissionLoading } = usePermission();

  const { data: allTestsWithMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["performance-latest-metrics"],
    queryFn: () => performanceService.getLatestMetricsForAllTests(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

  // Filter performance tests based on user's resource assignments
  const tests = useMemo(() => {
    const assignedIds = getAssignedResourceIds('performance_tests');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allTests;
    }

    // Empty array means no access to any performance tests
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show assigned performance tests
    return allTests.filter(test => assignedIds.includes(test.id));
  }, [allTests, getAssignedResourceIds]);

  // Filter tests with metrics based on assigned tests
  const testsWithMetrics = useMemo(() => {
    const assignedIds = getAssignedResourceIds('performance_tests');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allTestsWithMetrics;
    }

    // Empty array means no access
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show assigned tests
    return allTestsWithMetrics.filter(item => assignedIds.includes(item.test_id));
  }, [allTestsWithMetrics, getAssignedResourceIds]);

  const isLoading = metricsLoading || permissionLoading;

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
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 md:h-32" />
          ))}
        </div>
        <Skeleton className="h-48 md:h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("activeTests") || "Active Tests"}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{activeTests}</div>
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
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("avgLCP") || "Avg. LCP"}</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-xl md:text-2xl font-bold">{formatMs(avgLCP)}</span>
              <Badge
                variant={getWebVitalStatus("lcp", avgLCP) === "good" ? "default" : "destructive"}
                className="text-xs w-fit"
              >
                {getWebVitalStatus("lcp", avgLCP)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t("largestContentfulPaint") || "Largest Contentful Paint"}
            </p>
            <p className="text-xs text-muted-foreground sm:hidden">LCP</p>
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("avgCLS") || "Avg. CLS"}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-xl md:text-2xl font-bold">{avgCLS.toFixed(3)}</span>
              <Badge
                variant={getWebVitalStatus("cls", avgCLS) === "good" ? "default" : "destructive"}
                className="text-xs w-fit"
              >
                {getWebVitalStatus("cls", avgCLS)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t("cumulativeLayoutShift") || "Cumulative Layout Shift"}
            </p>
            <p className="text-xs text-muted-foreground sm:hidden">CLS</p>
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("budgetStatus") || "Budget Status"}</CardTitle>
            {budgetPassCount === testsWithData.length ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
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
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">{t("latestResults") || "Latest Results"}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {testsWithMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noPerformanceTests") || "No performance tests configured yet."}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {testsWithMetrics.map((item) => (
                  <Card key={item.test_id} className={theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50"}>
                    <CardContent className="p-3">
                      <div className="mb-2">
                        <p className="font-medium text-sm truncate">{item.test_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.test_url}</p>
                      </div>
                      {item.latest_metrics ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">LCP:</span>
                              <Badge
                                variant={getWebVitalStatus("lcp", item.latest_metrics.lcp) === "good" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {formatMs(item.latest_metrics.lcp)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">FCP:</span>
                              <Badge
                                variant={getWebVitalStatus("fcp", item.latest_metrics.fcp) === "good" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {formatMs(item.latest_metrics.fcp)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">CLS:</span>
                              <Badge
                                variant={getWebVitalStatus("cls", item.latest_metrics.cls) === "good" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {item.latest_metrics.cls.toFixed(3)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">TBT:</span>
                              <Badge
                                variant={getWebVitalStatus("tbt", item.latest_metrics.tbt) === "good" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {formatMs(item.latest_metrics.tbt)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-muted-foreground">{t("budget") || "Budget"}:</span>
                            {item.latest_metrics.budget_passed ? (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                {t("passed") || "Passed"}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">{t("failed") || "Failed"}</Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("noData") || "No data available"}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
