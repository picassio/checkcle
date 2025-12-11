import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Service, UptimeData } from "@/types/service.types";
import { ExportUtils } from "./ExportUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TimeRange = "7d" | "30d" | "90d";

interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  startTime: string;
  endTime: string | null;
  duration: number; // in minutes
  errorMessage: string;
  resolved: boolean;
}

interface ServiceIncidentStats {
  service: Service;
  totalIncidents: number;
  totalDowntimeMinutes: number;
  avgIncidentDuration: number;
  longestIncident: number;
  mttr: number; // Mean Time To Recovery
}

export function IncidentReports() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

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

  const { data: incidentData, isLoading } = useQuery({
    queryKey: ["incidents", timeRange, services.map(s => s.id).join(",")],
    queryFn: async () => {
      if (services.length === 0) return { incidents: [], stats: [] };

      const { start, end } = getDateRange(timeRange);
      const allIncidents: Incident[] = [];
      const stats: ServiceIncidentStats[] = [];

      for (const service of services) {
        try {
          const records = await pb.collection("uptime_data").getFullList<UptimeData>({
            filter: `service_id="${service.id}" && timestamp>="${start.toISOString()}" && timestamp<="${end.toISOString()}"`,
            sort: "timestamp",
          });

          // Identify incidents (consecutive down statuses)
          const serviceIncidents: Incident[] = [];
          let currentIncident: Incident | null = null;

          records.forEach((record, index) => {
            if (record.status === "down") {
              if (!currentIncident) {
                currentIncident = {
                  id: `${service.id}-${record.id}`,
                  serviceId: service.id!,
                  serviceName: service.name,
                  serviceType: service.service_type || "http",
                  startTime: record.timestamp,
                  endTime: null,
                  duration: 0,
                  errorMessage: record.error_message || "Service unavailable",
                  resolved: false,
                };
              }
            } else if (currentIncident) {
              // Service recovered
              currentIncident.endTime = record.timestamp;
              currentIncident.duration = Math.round(
                (new Date(record.timestamp).getTime() - new Date(currentIncident.startTime).getTime()) / 60000
              );
              currentIncident.resolved = true;
              serviceIncidents.push(currentIncident);
              currentIncident = null;
            }
          });

          // Handle ongoing incident
          if (currentIncident) {
            currentIncident.duration = Math.round(
              (new Date().getTime() - new Date(currentIncident.startTime).getTime()) / 60000
            );
            serviceIncidents.push(currentIncident);
          }

          allIncidents.push(...serviceIncidents);

          // Calculate service stats
          const totalIncidents = serviceIncidents.length;
          const totalDowntimeMinutes = serviceIncidents.reduce((sum, i) => sum + i.duration, 0);
          const avgIncidentDuration = totalIncidents > 0 ? totalDowntimeMinutes / totalIncidents : 0;
          const longestIncident = totalIncidents > 0
            ? Math.max(...serviceIncidents.map(i => i.duration))
            : 0;
          const resolvedIncidents = serviceIncidents.filter(i => i.resolved);
          const mttr = resolvedIncidents.length > 0
            ? resolvedIncidents.reduce((sum, i) => sum + i.duration, 0) / resolvedIncidents.length
            : 0;

          if (totalIncidents > 0) {
            stats.push({
              service,
              totalIncidents,
              totalDowntimeMinutes,
              avgIncidentDuration,
              longestIncident,
              mttr,
            });
          }
        } catch (error) {
          console.error(`Error fetching incidents for service ${service.id}:`, error);
        }
      }

      return {
        incidents: allIncidents.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
        stats: stats.sort((a, b) => b.totalIncidents - a.totalIncidents),
      };
    },
    enabled: services.length > 0,
  });

  const incidents = incidentData?.incidents || [];
  const incidentStats = incidentData?.stats || [];

  const overallStats = useMemo(() => {
    const totalIncidents = incidents.length;
    const totalDowntimeMinutes = incidents.reduce((sum, i) => sum + i.duration, 0);
    const resolvedIncidents = incidents.filter(i => i.resolved);
    const avgMTTR = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + i.duration, 0) / resolvedIncidents.length
      : 0;
    const ongoingIncidents = incidents.filter(i => !i.resolved).length;

    return { totalIncidents, totalDowntimeMinutes, avgMTTR, ongoingIncidents };
  }, [incidents]);

  // Chart data for incidents by day
  const incidentsByDay = useMemo(() => {
    const dayMap = new Map<string, number>();
    incidents.forEach(incident => {
      const day = new Date(incident.startTime).toLocaleDateString([], {
        month: "short",
        day: "numeric"
      });
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
  }, [incidents]);

  // Pie chart data for incidents by service
  const incidentsByService = useMemo(() => {
    return incidentStats.slice(0, 5).map(stat => ({
      name: stat.service.name.substring(0, 15),
      value: stat.totalIncidents,
    }));
  }, [incidentStats]);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  const handleExportCSV = () => {
    const data = incidents.map(incident => ({
      Service: incident.serviceName,
      Type: incident.serviceType,
      "Start Time": incident.startTime,
      "End Time": incident.endTime || "Ongoing",
      "Duration (min)": incident.duration,
      Status: incident.resolved ? "Resolved" : "Ongoing",
      "Error Message": incident.errorMessage,
    }));
    ExportUtils.exportCSV(data, `incident-report-${timeRange}`);
  };

  const handleExportPDF = () => {
    ExportUtils.exportIncidentPDF(incidents, incidentStats, timeRange, overallStats);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("last7Days") || "Last 7 Days"}</SelectItem>
            <SelectItem value="30d">{t("last30Days") || "Last 30 Days"}</SelectItem>
            <SelectItem value="90d">{t("last90Days") || "Last 90 Days"}</SelectItem>
          </SelectContent>
        </Select>

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalIncidents") || "Total Incidents"}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {t("inSelectedPeriod") || "In selected period"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalDowntime") || "Total Downtime"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatDuration(overallStats.totalDowntimeMinutes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("cumulativeDowntime") || "Cumulative downtime"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgMTTR") || "Avg MTTR"}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {formatDuration(Math.round(overallStats.avgMTTR))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("meanTimeToRecovery") || "Mean time to recovery"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ongoingIncidents") || "Ongoing"}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overallStats.ongoingIncidents > 0 ? "text-red-500" : "text-green-500"}`}>
              {overallStats.ongoingIncidents}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("activeIncidents") || "Active incidents"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("incidentsByDay") || "Incidents by Day"}</CardTitle>
          </CardHeader>
          <CardContent>
            {incidentsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={incidentsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("noIncidents") || "No incidents in this period"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("incidentsByService") || "Incidents by Service"}</CardTitle>
          </CardHeader>
          <CardContent>
            {incidentsByService.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={incidentsByService}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incidentsByService.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("noIncidents") || "No incidents in this period"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("serviceIncidentStats") || "Service Incident Statistics"}</CardTitle>
          <CardDescription>
            {t("incidentStatsDescription") || "Breakdown of incidents by service"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : incidentStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noIncidents") || "No incidents recorded in this period"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("service") || "Service"}</TableHead>
                  <TableHead className="text-right">{t("incidents") || "Incidents"}</TableHead>
                  <TableHead className="text-right">{t("totalDowntime") || "Total Downtime"}</TableHead>
                  <TableHead className="text-right">{t("avgDuration") || "Avg Duration"}</TableHead>
                  <TableHead className="text-right">{t("longestIncident") || "Longest"}</TableHead>
                  <TableHead className="text-right">MTTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidentStats.map((stat) => (
                  <TableRow key={stat.service.id}>
                    <TableCell className="font-medium">{stat.service.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{stat.totalIncidents}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {formatDuration(stat.totalDowntimeMinutes)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(Math.round(stat.avgIncidentDuration))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(stat.longestIncident)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(Math.round(stat.mttr))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentIncidents") || "Recent Incidents"}</CardTitle>
          <CardDescription>
            {t("latestIncidentsList") || "List of recent incidents across all services"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noIncidents") || "No incidents recorded"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("service") || "Service"}</TableHead>
                  <TableHead>{t("startTime") || "Start Time"}</TableHead>
                  <TableHead>{t("endTime") || "End Time"}</TableHead>
                  <TableHead className="text-right">{t("duration") || "Duration"}</TableHead>
                  <TableHead>{t("status") || "Status"}</TableHead>
                  <TableHead>{t("error") || "Error"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.slice(0, 20).map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">{incident.serviceName}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(incident.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {incident.endTime
                        ? new Date(incident.endTime).toLocaleString()
                        : <span className="text-red-500">Ongoing</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(incident.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={incident.resolved ? "default" : "destructive"}>
                        {incident.resolved ? "Resolved" : "Ongoing"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {incident.errorMessage}
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
