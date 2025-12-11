import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Service, UptimeData } from "@/types/service.types";
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
} from "recharts";

type TimeRange = "24h" | "7d" | "30d";

interface ResponseTimeStats {
  service: Service;
  minResponse: number;
  maxResponse: number;
  avgResponse: number;
  p95Response: number;
  p99Response: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

interface ChartDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export function ResponseTimeAnalytics() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [selectedService, setSelectedService] = useState<string>("all");

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const response = await pb.collection("services").getFullList<Service>();
      return response;
    },
  });

  const getDateRange = (range: TimeRange): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case "24h":
        start.setHours(start.getHours() - 24);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
    }
    return { start, end };
  };

  const { data: responseStats = [], isLoading } = useQuery({
    queryKey: ["response-stats", timeRange, services.map(s => s.id).join(",")],
    queryFn: async () => {
      if (services.length === 0) return [];

      const { start, end } = getDateRange(timeRange);
      const stats: ResponseTimeStats[] = [];

      for (const service of services) {
        try {
          const records = await pb.collection("uptime_data").getFullList<UptimeData>({
            filter: `service_id="${service.id}" && timestamp>="${start.toISOString()}" && timestamp<="${end.toISOString()}"`,
            sort: "timestamp",
          });

          if (records.length === 0) continue;

          const responseTimes = records
            .map(r => (r as any).response_time || r.responseTime || 0)
            .filter(r => r > 0)
            .sort((a, b) => a - b);

          if (responseTimes.length === 0) continue;

          const minResponse = responseTimes[0];
          const maxResponse = responseTimes[responseTimes.length - 1];
          const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const p95Index = Math.floor(responseTimes.length * 0.95);
          const p99Index = Math.floor(responseTimes.length * 0.99);
          const p95Response = responseTimes[p95Index] || maxResponse;
          const p99Response = responseTimes[p99Index] || maxResponse;

          // Calculate trend (compare first half vs second half)
          const midpoint = Math.floor(responseTimes.length / 2);
          const firstHalf = responseTimes.slice(0, midpoint);
          const secondHalf = responseTimes.slice(midpoint);
          const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
          const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
          const trendValue = secondAvg - firstAvg;
          const trendPercent = firstAvg > 0 ? (trendValue / firstAvg) * 100 : 0;

          let trend: "up" | "down" | "stable" = "stable";
          if (trendPercent > 10) trend = "up";
          else if (trendPercent < -10) trend = "down";

          stats.push({
            service,
            minResponse,
            maxResponse,
            avgResponse,
            p95Response,
            p99Response,
            trend,
            trendValue,
          });
        } catch (error) {
          console.error(`Error fetching response stats for service ${service.id}:`, error);
        }
      }

      return stats.sort((a, b) => b.avgResponse - a.avgResponse);
    },
    enabled: services.length > 0,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["response-chart", timeRange, selectedService, services.map(s => s.id).join(",")],
    queryFn: async () => {
      const { start, end } = getDateRange(timeRange);
      const targetServices = selectedService === "all"
        ? services.slice(0, 5) // Limit to 5 services for chart clarity
        : services.filter(s => s.id === selectedService);

      if (targetServices.length === 0) return [];

      const dataMap = new Map<string, ChartDataPoint>();

      for (const service of targetServices) {
        try {
          const records = await pb.collection("uptime_data").getFullList<UptimeData>({
            filter: `service_id="${service.id}" && timestamp>="${start.toISOString()}" && timestamp<="${end.toISOString()}"`,
            sort: "timestamp",
          });

          // Group by hour for better visualization
          records.forEach(record => {
            const date = new Date(record.timestamp);
            const hourKey = timeRange === "24h"
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : date.toLocaleDateString([], { month: "short", day: "numeric" });

            if (!dataMap.has(hourKey)) {
              dataMap.set(hourKey, { timestamp: hourKey });
            }
            const point = dataMap.get(hourKey)!;
            const key = service.name.substring(0, 15);
            const responseTime = (record as any).response_time || record.responseTime || 0;
            if (!point[key]) {
              point[key] = responseTime;
            } else {
              // Average if multiple points in same bucket
              point[key] = ((point[key] as number) + responseTime) / 2;
            }
          });
        } catch (error) {
          console.error(`Error fetching chart data for service ${service.id}:`, error);
        }
      }

      return Array.from(dataMap.values());
    },
    enabled: services.length > 0,
  });

  const overallStats = useMemo(() => {
    if (responseStats.length === 0) return { avgResponse: 0, minResponse: 0, maxResponse: 0 };

    const avgResponse = responseStats.reduce((sum, s) => sum + s.avgResponse, 0) / responseStats.length;
    const minResponse = Math.min(...responseStats.map(s => s.minResponse));
    const maxResponse = Math.max(...responseStats.map(s => s.maxResponse));

    return { avgResponse, minResponse, maxResponse };
  }, [responseStats]);

  const handleExportCSV = () => {
    const data = responseStats.map(stat => ({
      Service: stat.service.name,
      Type: stat.service.service_type,
      "Min Response (ms)": stat.minResponse.toFixed(0),
      "Max Response (ms)": stat.maxResponse.toFixed(0),
      "Avg Response (ms)": stat.avgResponse.toFixed(0),
      "P95 Response (ms)": stat.p95Response.toFixed(0),
      "P99 Response (ms)": stat.p99Response.toFixed(0),
      Trend: stat.trend,
    }));
    ExportUtils.exportCSV(data, `response-time-report-${timeRange}`);
  };

  const handleExportPDF = () => {
    ExportUtils.exportResponseTimePDF(responseStats, timeRange, overallStats);
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResponseColor = (ms: number) => {
    if (ms < 200) return "text-green-500";
    if (ms < 500) return "text-yellow-500";
    if (ms < 1000) return "text-orange-500";
    return "text-red-500";
  };

  const chartColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t("last24Hours") || "Last 24 Hours"}</SelectItem>
              <SelectItem value="7d">{t("last7Days") || "Last 7 Days"}</SelectItem>
              <SelectItem value="30d">{t("last30Days") || "Last 30 Days"}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allServices") || "All Services"}</SelectItem>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id!}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgResponseTime") || "Average Response"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getResponseColor(overallStats.avgResponse)}`}>
              {overallStats.avgResponse.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {t("acrossAllServices") || "Across all services"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("fastestResponse") || "Fastest Response"}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {overallStats.minResponse.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {t("bestPerformance") || "Best performance recorded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("slowestResponse") || "Slowest Response"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getResponseColor(overallStats.maxResponse)}`}>
              {overallStats.maxResponse.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {t("worstPerformance") || "Worst performance recorded"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("responseTimeTrend") || "Response Time Trend"}</CardTitle>
          <CardDescription>
            {t("responseTimeOverTime") || "Response time trends over the selected period"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" fontSize={12} />
                <YAxis fontSize={12} unit="ms" />
                <Tooltip />
                <Legend />
                {Object.keys(chartData[0] || {})
                  .filter(key => key !== "timestamp")
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("noChartData") || "No chart data available"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("responseTimeDetails") || "Response Time Details"}</CardTitle>
          <CardDescription>
            {t("detailedResponseMetrics") || "Detailed response time metrics for each service"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : responseStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noDataAvailable") || "No data available"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("service") || "Service"}</TableHead>
                  <TableHead className="text-right">{t("min") || "Min"}</TableHead>
                  <TableHead className="text-right">{t("avg") || "Avg"}</TableHead>
                  <TableHead className="text-right">{t("max") || "Max"}</TableHead>
                  <TableHead className="text-right">P95</TableHead>
                  <TableHead className="text-right">P99</TableHead>
                  <TableHead className="text-center">{t("trend") || "Trend"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responseStats.map((stat) => (
                  <TableRow key={stat.service.id}>
                    <TableCell className="font-medium">{stat.service.name}</TableCell>
                    <TableCell className="text-right text-green-500">
                      {stat.minResponse.toFixed(0)}ms
                    </TableCell>
                    <TableCell className={`text-right ${getResponseColor(stat.avgResponse)}`}>
                      {stat.avgResponse.toFixed(0)}ms
                    </TableCell>
                    <TableCell className={`text-right ${getResponseColor(stat.maxResponse)}`}>
                      {stat.maxResponse.toFixed(0)}ms
                    </TableCell>
                    <TableCell className={`text-right ${getResponseColor(stat.p95Response)}`}>
                      {stat.p95Response.toFixed(0)}ms
                    </TableCell>
                    <TableCell className={`text-right ${getResponseColor(stat.p99Response)}`}>
                      {stat.p99Response.toFixed(0)}ms
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(stat.trend)}
                        <span className="text-xs text-muted-foreground">
                          {stat.trend === "stable" ? "" : `${stat.trendValue > 0 ? "+" : ""}${stat.trendValue.toFixed(0)}ms`}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
