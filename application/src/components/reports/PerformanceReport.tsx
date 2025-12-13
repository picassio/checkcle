import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Gauge, TrendingUp, TrendingDown, Minus, Activity, Zap, Clock } from "lucide-react";
import { PerformanceMetrics, PerformanceTest, formatMs, formatBytes, getWebVitalStatus, WEB_VITALS_THRESHOLDS } from "@/types/performance.types";
import { format } from "date-fns";
import { ExportUtils } from "./ExportUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import html2canvas from "html2canvas";

type TimeRange = "7d" | "30d" | "90d";

export function PerformanceReport() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedTestId, setSelectedTestId] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

  const { data: allMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["performance-report-metrics", timeRange, selectedTestId],
    queryFn: async () => {
      if (selectedTestId === "all") {
        // Fetch metrics for all tests
        const allTestMetrics: PerformanceMetrics[] = [];
        for (const test of tests) {
          const metrics = await performanceService.getMetricsHistory(test.id, timeRange);
          allTestMetrics.push(...metrics);
        }
        return allTestMetrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } else {
        return performanceService.getMetricsHistory(selectedTestId, timeRange);
      }
    },
    enabled: tests.length > 0,
  });

  const isLoading = testsLoading || metricsLoading;

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    if (allMetrics.length === 0) return null;

    const avgLcp = allMetrics.reduce((sum, m) => sum + m.lcp, 0) / allMetrics.length;
    const avgFcp = allMetrics.reduce((sum, m) => sum + m.fcp, 0) / allMetrics.length;
    const avgCls = allMetrics.reduce((sum, m) => sum + m.cls, 0) / allMetrics.length;
    const avgTbt = allMetrics.reduce((sum, m) => sum + m.tbt, 0) / allMetrics.length;
    const avgTtfb = allMetrics.reduce((sum, m) => sum + m.ttfb, 0) / allMetrics.length;
    const avgSpeedIndex = allMetrics.reduce((sum, m) => sum + m.speed_index, 0) / allMetrics.length;
    const budgetPassRate = performanceService.calculateBudgetPassRate(allMetrics);

    return {
      totalTests: allMetrics.length,
      avgLcp,
      avgFcp,
      avgCls,
      avgTbt,
      avgTtfb,
      avgSpeedIndex,
      budgetPassRate,
    };
  }, [allMetrics]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (allMetrics.length === 0) return [];

    // Group metrics by date
    const grouped = allMetrics.reduce((acc, metric) => {
      const date = format(new Date(metric.timestamp), "MMM d");
      if (!acc[date]) {
        acc[date] = { date, lcp: [], fcp: [], cls: [], tbt: [], ttfb: [], speedIndex: [] };
      }
      acc[date].lcp.push(metric.lcp);
      acc[date].fcp.push(metric.fcp);
      acc[date].cls.push(metric.cls);
      acc[date].tbt.push(metric.tbt);
      acc[date].ttfb.push(metric.ttfb);
      acc[date].speedIndex.push(metric.speed_index);
      return acc;
    }, {} as Record<string, { date: string; lcp: number[]; fcp: number[]; cls: number[]; tbt: number[]; ttfb: number[]; speedIndex: number[] }>);

    return Object.values(grouped)
      .map(g => ({
        date: g.date,
        lcp: g.lcp.reduce((a, b) => a + b, 0) / g.lcp.length,
        fcp: g.fcp.reduce((a, b) => a + b, 0) / g.fcp.length,
        cls: g.cls.reduce((a, b) => a + b, 0) / g.cls.length,
        tbt: g.tbt.reduce((a, b) => a + b, 0) / g.tbt.length,
        ttfb: g.ttfb.reduce((a, b) => a + b, 0) / g.ttfb.length,
        speedIndex: g.speedIndex.reduce((a, b) => a + b, 0) / g.speedIndex.length,
      }))
      .reverse();
  }, [allMetrics]);

  // Calculate trends
  const trends = useMemo(() => {
    if (chartData.length < 2) return { lcp: "stable", fcp: "stable", speedIndex: "stable" };

    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));

    const avgFirst = {
      lcp: firstHalf.reduce((sum, d) => sum + d.lcp, 0) / firstHalf.length,
      fcp: firstHalf.reduce((sum, d) => sum + d.fcp, 0) / firstHalf.length,
      speedIndex: firstHalf.reduce((sum, d) => sum + d.speedIndex, 0) / firstHalf.length,
    };

    const avgSecond = {
      lcp: secondHalf.reduce((sum, d) => sum + d.lcp, 0) / secondHalf.length,
      fcp: secondHalf.reduce((sum, d) => sum + d.fcp, 0) / secondHalf.length,
      speedIndex: secondHalf.reduce((sum, d) => sum + d.speedIndex, 0) / secondHalf.length,
    };

    const getTrend = (first: number, second: number) => {
      const change = ((second - first) / first) * 100;
      if (change > 10) return "up";
      if (change < -10) return "down";
      return "stable";
    };

    return {
      lcp: getTrend(avgFirst.lcp, avgSecond.lcp),
      fcp: getTrend(avgFirst.fcp, avgSecond.fcp),
      speedIndex: getTrend(avgFirst.speedIndex, avgSecond.speedIndex),
    };
  }, [chartData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (metric: string, value: number) => {
    const status = getWebVitalStatus(metric as any, value);
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      good: "default",
      "needs-improvement": "secondary",
      poor: "destructive",
    };
    return (
      <Badge variant={variants[status]} className={status === "good" ? "bg-green-600" : ""}>
        {status === "good" ? t("good") || "Good" : status === "needs-improvement" ? t("needsImprovement") || "Needs Improvement" : t("poor") || "Poor"}
      </Badge>
    );
  };

  // Export functions
  const handleExportCSV = () => {
    const data = allMetrics.map(m => {
      const test = tests.find(t => t.id === m.test_id);
      return {
        "Test Name": test?.name || m.test_id,
        "Date": format(new Date(m.timestamp), "yyyy-MM-dd HH:mm:ss"),
        "LCP (ms)": m.lcp.toFixed(0),
        "FCP (ms)": m.fcp.toFixed(0),
        "CLS": m.cls.toFixed(3),
        "TBT (ms)": m.tbt.toFixed(0),
        "TTFB (ms)": m.ttfb.toFixed(0),
        "Speed Index": m.speed_index.toFixed(0),
        "Requests": m.requests,
        "Transfer Size (KB)": (m.transfer_size / 1024).toFixed(2),
        "Budget Passed": m.budget_passed ? "Yes" : "No",
      };
    });
    ExportUtils.exportCSV(data, `performance-report-${timeRange}`);
  };

  const handleExportPDF = () => {
    if (!overviewStats) return;

    const testName = selectedTestId === "all"
      ? "All Tests"
      : tests.find(t => t.id === selectedTestId)?.name || "Unknown";

    ExportUtils.exportPerformancePDF(
      allMetrics,
      tests,
      timeRange,
      {
        totalTests: overviewStats.totalTests,
        avgLcp: overviewStats.avgLcp,
        avgFcp: overviewStats.avgFcp,
        avgCls: overviewStats.avgCls,
        avgTbt: overviewStats.avgTbt,
        avgTtfb: overviewStats.avgTtfb,
        avgSpeedIndex: overviewStats.avgSpeedIndex,
        budgetPassRate: overviewStats.budgetPassRate,
      },
      testName
    );
  };

  const cardClass = theme === "dark" ? "bg-gray-900 border-gray-800" : "";

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("selectTest") || "Select Test"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTests") || "All Tests"}</SelectItem>
              {tests.map(test => (
                <SelectItem key={test.id} value={test.id}>
                  {test.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("last7Days") || "Last 7 Days"}</SelectItem>
              <SelectItem value="30d">{t("last30Days") || "Last 30 Days"}</SelectItem>
              <SelectItem value="90d">{t("last90Days") || "Last 90 Days"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={allMetrics.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={allMetrics.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : allMetrics.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-12 text-center">
            <Gauge className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("noPerformanceData") || "No performance data available. Run some tests first."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("overview") || "Overview"}
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("testsRun") || "Tests Run"}</CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats?.totalTests}</div>
                  <p className="text-xs text-muted-foreground">{t("inSelectedPeriod") || "In selected period"}</p>
                </CardContent>
              </Card>

              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("avgLCP") || "Avg LCP"}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.lcp)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMs(overviewStats?.avgLcp || 0)}</div>
                  {overviewStats && getStatusBadge("lcp", overviewStats.avgLcp)}
                </CardContent>
              </Card>

              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("avgFCP") || "Avg FCP"}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.fcp)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMs(overviewStats?.avgFcp || 0)}</div>
                  {overviewStats && getStatusBadge("fcp", overviewStats.avgFcp)}
                </CardContent>
              </Card>

              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("budgetPassRate") || "Budget Pass Rate"}</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats?.budgetPassRate.toFixed(0)}%</div>
                  <Badge variant={overviewStats && overviewStats.budgetPassRate >= 80 ? "default" : "destructive"}>
                    {overviewStats && overviewStats.budgetPassRate >= 80 ? t("healthy") || "Healthy" : t("attention") || "Needs Attention"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Core Web Vitals Summary */}
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {t("coreWebVitals") || "Core Web Vitals Summary"}
              </CardTitle>
              <CardDescription>
                {t("coreWebVitalsDesc") || "Key performance metrics based on Google's Web Vitals"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-sm font-medium text-muted-foreground mb-1">LCP</div>
                  <div className="text-xl font-bold">{formatMs(overviewStats?.avgLcp || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("lcpDesc") || "Largest Contentful Paint"}</div>
                  {overviewStats && getStatusBadge("lcp", overviewStats.avgLcp)}
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-sm font-medium text-muted-foreground mb-1">FCP</div>
                  <div className="text-xl font-bold">{formatMs(overviewStats?.avgFcp || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("fcpDesc") || "First Contentful Paint"}</div>
                  {overviewStats && getStatusBadge("fcp", overviewStats.avgFcp)}
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-sm font-medium text-muted-foreground mb-1">CLS</div>
                  <div className="text-xl font-bold">{overviewStats?.avgCls.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("clsDesc") || "Cumulative Layout Shift"}</div>
                  {overviewStats && getStatusBadge("cls", overviewStats.avgCls)}
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-sm font-medium text-muted-foreground mb-1">TBT</div>
                  <div className="text-xl font-bold">{formatMs(overviewStats?.avgTbt || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("tbtDesc") || "Total Blocking Time"}</div>
                  {overviewStats && getStatusBadge("tbt", overviewStats.avgTbt)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trends Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("trends") || "Trends"}
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Speed Index Trend */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("speedIndexTrend") || "Speed Index Trend"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="speedIndexGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} unit="ms" />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`, "Speed Index"]} />
                      <ReferenceLine y={WEB_VITALS_THRESHOLDS.speedIndex.good} stroke="#22c55e" strokeDasharray="5 5" />
                      <Area
                        type="monotone"
                        dataKey="speedIndex"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#speedIndexGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* LCP & FCP Trend */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("lcpFcpTrend") || "LCP & FCP Trend"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} unit="ms" />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`]} />
                      <Legend />
                      <ReferenceLine y={WEB_VITALS_THRESHOLDS.lcp.good} stroke="#22c55e" strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="lcp" stroke="#8884d8" name="LCP" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="fcp" stroke="#82ca9d" name="FCP" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TTFB Trend */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("ttfbTrend") || "TTFB Trend"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="ttfbGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} unit="ms" />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`, "TTFB"]} />
                      <ReferenceLine y={WEB_VITALS_THRESHOLDS.ttfb.good} stroke="#22c55e" strokeDasharray="5 5" />
                      <Area
                        type="monotone"
                        dataKey="ttfb"
                        stroke="#ffc658"
                        fillOpacity={1}
                        fill="url(#ttfbGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* CLS & TBT Trend */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("clsTbtTrend") || "CLS & TBT Trend"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis yAxisId="left" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} unit="ms" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="cls" stroke="#ff7300" name="CLS" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="tbt" stroke="#00C49F" name="TBT (ms)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Details Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("details") || "Details"}
            </h2>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle>{t("recentResults") || "Recent Results"}</CardTitle>
                <CardDescription>
                  {t("recentResultsDesc") || "Detailed results from recent performance tests"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("test") || "Test"}</TableHead>
                        <TableHead>{t("date") || "Date"}</TableHead>
                        <TableHead className="text-right">LCP</TableHead>
                        <TableHead className="text-right">FCP</TableHead>
                        <TableHead className="text-right">CLS</TableHead>
                        <TableHead className="text-right">TBT</TableHead>
                        <TableHead className="text-right">TTFB</TableHead>
                        <TableHead className="text-right">{t("speedIndex") || "SI"}</TableHead>
                        <TableHead className="text-center">{t("budget") || "Budget"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMetrics.slice(0, 20).map((m) => {
                        const test = tests.find(t => t.id === m.test_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{test?.name || m.test_id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(m.timestamp), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getWebVitalStatus("lcp", m.lcp) === "good" ? "default" : "destructive"}>
                                {formatMs(m.lcp)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getWebVitalStatus("fcp", m.fcp) === "good" ? "default" : "destructive"}>
                                {formatMs(m.fcp)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getWebVitalStatus("cls", m.cls) === "good" ? "default" : "destructive"}>
                                {m.cls.toFixed(3)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getWebVitalStatus("tbt", m.tbt) === "good" ? "default" : "destructive"}>
                                {formatMs(m.tbt)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getWebVitalStatus("ttfb", m.ttfb) === "good" ? "default" : "destructive"}>
                                {formatMs(m.ttfb)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatMs(m.speed_index)}</TableCell>
                            <TableCell className="text-center">
                              {m.budget_passed ? (
                                <Badge variant="default" className="bg-green-600">{t("pass") || "Pass"}</Badge>
                              ) : (
                                <Badge variant="destructive">{t("fail") || "Fail"}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
