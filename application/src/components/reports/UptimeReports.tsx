import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Service, UptimeData } from "@/types/service.types";
import { ExportUtils } from "./ExportUtils";

type TimeRange = "24h" | "7d" | "30d" | "90d";

interface ServiceUptimeStats {
  service: Service;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercentage: number;
  avgResponseTime: number;
  lastDowntime: string | null;
}

export function UptimeReports() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

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
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
    }
    return { start, end };
  };

  const { data: uptimeStats = [], isLoading } = useQuery({
    queryKey: ["uptime-stats", timeRange, services.map(s => s.id).join(",")],
    queryFn: async () => {
      if (services.length === 0) return [];

      const { start, end } = getDateRange(timeRange);
      const stats: ServiceUptimeStats[] = [];

      for (const service of services) {
        try {
          const records = await pb.collection("uptime_data").getFullList<UptimeData>({
            filter: `service_id="${service.id}" && timestamp>="${start.toISOString()}" && timestamp<="${end.toISOString()}"`,
            sort: "-timestamp",
          });

          const totalChecks = records.length;
          const upChecks = records.filter(r => r.status === "up").length;
          const downChecks = records.filter(r => r.status === "down").length;
          const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;
          const avgResponseTime = totalChecks > 0
            ? records.reduce((sum, r) => sum + ((r as any).response_time || r.responseTime || 0), 0) / totalChecks
            : 0;

          const lastDown = records.find(r => r.status === "down");

          stats.push({
            service,
            totalChecks,
            upChecks,
            downChecks,
            uptimePercentage,
            avgResponseTime,
            lastDowntime: lastDown?.timestamp || null,
          });
        } catch (error) {
          console.error(`Error fetching stats for service ${service.id}:`, error);
        }
      }

      return stats.sort((a, b) => a.uptimePercentage - b.uptimePercentage);
    },
    enabled: services.length > 0,
  });

  const overallStats = useMemo(() => {
    if (uptimeStats.length === 0) return { avgUptime: 0, totalIncidents: 0, avgResponse: 0 };

    const avgUptime = uptimeStats.reduce((sum, s) => sum + s.uptimePercentage, 0) / uptimeStats.length;
    const totalIncidents = uptimeStats.reduce((sum, s) => sum + s.downChecks, 0);
    const avgResponse = uptimeStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / uptimeStats.length;

    return { avgUptime, totalIncidents, avgResponse };
  }, [uptimeStats]);

  const handleExportCSV = () => {
    const data = uptimeStats.map(stat => ({
      Service: stat.service.name,
      Type: stat.service.service_type,
      URL: stat.service.url || stat.service.host || "",
      "Total Checks": stat.totalChecks,
      "Up Checks": stat.upChecks,
      "Down Checks": stat.downChecks,
      "Uptime %": stat.uptimePercentage.toFixed(2),
      "Avg Response (ms)": stat.avgResponseTime.toFixed(0),
      "Last Downtime": stat.lastDowntime || "N/A",
    }));
    ExportUtils.exportCSV(data, `uptime-report-${timeRange}`);
  };

  const handleExportPDF = () => {
    ExportUtils.exportUptimePDF(uptimeStats, timeRange, overallStats);
  };

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99.9) return "text-green-500";
    if (percentage >= 99) return "text-yellow-500";
    if (percentage >= 95) return "text-orange-500";
    return "text-red-500";
  };

  const getUptimeBadge = (percentage: number) => {
    if (percentage >= 99.9) return "default";
    if (percentage >= 99) return "secondary";
    if (percentage >= 95) return "outline";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">{t("last24Hours") || "Last 24 Hours"}</SelectItem>
            <SelectItem value="7d">{t("last7Days") || "Last 7 Days"}</SelectItem>
            <SelectItem value="30d">{t("last30Days") || "Last 30 Days"}</SelectItem>
            <SelectItem value="90d">{t("last90Days") || "Last 90 Days"}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex-1 sm:flex-none">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("averageUptime") || "Average Uptime"}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUptimeColor(overallStats.avgUptime)}`}>
              {overallStats.avgUptime.toFixed(2)}%
            </div>
            <Progress value={overallStats.avgUptime} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalIncidents") || "Total Incidents"}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {t("downtimeEvents") || "Downtime events recorded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgResponseTime") || "Avg Response Time"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.avgResponse.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              {t("acrossAllServices") || "Across all services"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("serviceUptimeDetails") || "Service Uptime Details"}</CardTitle>
          <CardDescription>
            {t("uptimeBreakdown") || "Detailed breakdown of uptime for each monitored service"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : uptimeStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noDataAvailable") || "No data available for the selected time range"}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {uptimeStats.map((stat) => (
                  <Card key={stat.service.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{stat.service.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{stat.service.service_type?.toUpperCase()}</Badge>
                          <Badge variant={getUptimeBadge(stat.uptimePercentage)} className="text-xs">
                            {stat.uptimePercentage.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div><span className="text-muted-foreground">Checks:</span> {stat.totalChecks}</div>
                      <div><span className="text-muted-foreground">Incidents:</span> {stat.downChecks > 0 ? <span className="text-red-500">{stat.downChecks}</span> : <span className="text-green-500">0</span>}</div>
                      <div><span className="text-muted-foreground">Avg Response:</span> {stat.avgResponseTime.toFixed(0)}ms</div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Last Downtime:</span>{' '}
                        {stat.lastDowntime ? new Date(stat.lastDowntime).toLocaleString() : <span className="text-green-500">No downtime</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("service") || "Service"}</TableHead>
                      <TableHead>{t("type") || "Type"}</TableHead>
                      <TableHead className="text-right">{t("uptime") || "Uptime"}</TableHead>
                      <TableHead className="text-right">{t("checks") || "Checks"}</TableHead>
                      <TableHead className="text-right">{t("incidents") || "Incidents"}</TableHead>
                      <TableHead className="text-right">{t("avgResponse") || "Avg Response"}</TableHead>
                      <TableHead>{t("lastDowntime") || "Last Downtime"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uptimeStats.map((stat) => (
                      <TableRow key={stat.service.id}>
                        <TableCell className="font-medium">{stat.service.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{stat.service.service_type?.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getUptimeBadge(stat.uptimePercentage)}>
                            {stat.uptimePercentage.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{stat.totalChecks}</TableCell>
                        <TableCell className="text-right">
                          {stat.downChecks > 0 ? (
                            <span className="text-red-500">{stat.downChecks}</span>
                          ) : (
                            <span className="text-green-500">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{stat.avgResponseTime.toFixed(0)}ms</TableCell>
                        <TableCell>
                          {stat.lastDowntime ? (
                            <span className="text-sm text-muted-foreground">
                              {new Date(stat.lastDowntime).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-green-500 text-sm">No downtime</span>
                          )}
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
    </div>
  );
}
