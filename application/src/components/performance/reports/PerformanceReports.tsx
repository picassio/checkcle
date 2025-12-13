import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, ExternalLink, Calendar } from "lucide-react";
import { PerformanceMetrics, formatMs, formatBytes, getWebVitalStatus } from "@/types/performance.types";
import { format } from "date-fns";
import { HTMLReportViewer } from "./HTMLReportViewer";

export function PerformanceReports() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [selectedReportUrl, setSelectedReportUrl] = useState("");
  const [selectedReportTestName, setSelectedReportTestName] = useState("");

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["performance-metrics-report", selectedTestId, timeRange],
    queryFn: () => performanceService.getMetricsHistory(selectedTestId, timeRange),
    enabled: !!selectedTestId,
  });

  const isLoading = testsLoading || (selectedTestId && metricsLoading);

  const selectedTest = tests.find((t) => t.id === selectedTestId);
  const averages = performanceService.calculateAverages(metrics);
  const passRate = performanceService.calculateBudgetPassRate(metrics);

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

  const openReport = (metric: PerformanceMetrics, testName: string) => {
    const url = getReportUrlFromMetric(metric);
    if (url) {
      setSelectedReportUrl(url);
      setSelectedReportTestName(testName);
      setReportViewerOpen(true);
    }
  };

  const exportCSV = () => {
    if (metrics.length === 0) return;

    const headers = ["Date", "LCP (ms)", "FCP (ms)", "CLS", "TBT (ms)", "Speed Index", "TTFB (ms)", "Requests", "Transfer Size", "Budget Passed"];
    const rows = metrics.map((m) => [
      format(new Date(m.timestamp), "yyyy-MM-dd HH:mm:ss"),
      Math.round(m.lcp),
      Math.round(m.fcp),
      m.cls.toFixed(3),
      Math.round(m.tbt),
      Math.round(m.speed_index),
      Math.round(m.ttfb),
      m.requests,
      m.transfer_size,
      m.budget_passed ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${selectedTest?.name || "export"}-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectTest") || "Select a test"} />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 {t("days") || "Days"}</SelectItem>
            <SelectItem value="30d">30 {t("days") || "Days"}</SelectItem>
            <SelectItem value="90d">90 {t("days") || "Days"}</SelectItem>
          </SelectContent>
        </Select>

        {metrics.length > 0 && (
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t("exportCSV") || "Export CSV"}
          </Button>
        )}
      </div>

      {!selectedTestId ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("selectTestForReport") || "Select a test to view its performance report."}
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : metrics.length === 0 ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t("noDataForPeriod") || "No data available for the selected period."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <CardTitle className="text-sm font-medium">{t("avgLCP") || "Avg LCP"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMs(averages?.lcp || 0)}</div>
                <Badge
                  variant={getWebVitalStatus("lcp", averages?.lcp || 0) === "good" ? "default" : "destructive"}
                  className="mt-1"
                >
                  {getWebVitalStatus("lcp", averages?.lcp || 0)}
                </Badge>
              </CardContent>
            </Card>

            <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("avgSpeedIndex") || "Avg Speed Index"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMs(averages?.speed_index || 0)}</div>
              </CardContent>
            </Card>

            <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("budgetPassRate") || "Budget Pass Rate"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{passRate.toFixed(0)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("detailedResults") || "Detailed Results"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                      <th className="text-left py-2 px-4 font-medium">{t("date") || "Date"}</th>
                      <th className="text-left py-2 px-4 font-medium">LCP</th>
                      <th className="text-left py-2 px-4 font-medium">FCP</th>
                      <th className="text-left py-2 px-4 font-medium">CLS</th>
                      <th className="text-left py-2 px-4 font-medium">TBT</th>
                      <th className="text-left py-2 px-4 font-medium">{t("speedIndex") || "SI"}</th>
                      <th className="text-left py-2 px-4 font-medium">{t("requests") || "Req"}</th>
                      <th className="text-left py-2 px-4 font-medium">{t("size") || "Size"}</th>
                      <th className="text-left py-2 px-4 font-medium">{t("budget") || "Budget"}</th>
                      <th className="text-left py-2 px-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr
                        key={m.id}
                        className={`border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}
                      >
                        <td className="py-2 px-4 text-sm">
                          {format(new Date(m.timestamp), "MMM d, HH:mm")}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={getWebVitalStatus("lcp", m.lcp) === "good" ? "default" : "destructive"}>
                            {formatMs(m.lcp)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={getWebVitalStatus("fcp", m.fcp) === "good" ? "default" : "destructive"}>
                            {formatMs(m.fcp)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={getWebVitalStatus("cls", m.cls) === "good" ? "default" : "destructive"}>
                            {m.cls.toFixed(3)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={getWebVitalStatus("tbt", m.tbt) === "good" ? "default" : "destructive"}>
                            {formatMs(m.tbt)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">{formatMs(m.speed_index)}</td>
                        <td className="py-2 px-4">{m.requests}</td>
                        <td className="py-2 px-4">{formatBytes(m.transfer_size)}</td>
                        <td className="py-2 px-4">
                          {m.budget_passed ? (
                            <Badge variant="default" className="bg-green-600">{t("pass") || "Pass"}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("fail") || "Fail"}</Badge>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {getReportUrlFromMetric(m) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReport(m, selectedTest?.name || "")}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
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
        </>
      )}

      <HTMLReportViewer
        open={reportViewerOpen}
        onOpenChange={setReportViewerOpen}
        reportUrl={selectedReportUrl}
        testName={selectedReportTestName}
      />
    </div>
  );
}
