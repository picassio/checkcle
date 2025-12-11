import { Service } from "@/types/service.types";

interface ServiceUptimeStats {
  service: Service;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercentage: number;
  avgResponseTime: number;
  lastDowntime: string | null;
}

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

interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  errorMessage: string;
  resolved: boolean;
}

interface ServiceIncidentStats {
  service: Service;
  totalIncidents: number;
  totalDowntimeMinutes: number;
  avgIncidentDuration: number;
  longestIncident: number;
  mttr: number;
}

export const ExportUtils = {
  exportCSV(data: Record<string, any>[], filename: string) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  exportUptimePDF(
    stats: ServiceUptimeStats[],
    timeRange: string,
    overallStats: { avgUptime: number; totalIncidents: number; avgResponse: number }
  ) {
    const content = `
CHECKCLE UPTIME REPORT
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

================================================================================
SUMMARY
================================================================================
Average Uptime:     ${overallStats.avgUptime.toFixed(2)}%
Total Incidents:    ${overallStats.totalIncidents}
Avg Response Time:  ${overallStats.avgResponse.toFixed(0)}ms

================================================================================
SERVICE DETAILS
================================================================================
${stats.map(stat => `
Service:          ${stat.service.name}
Type:             ${stat.service.service_type?.toUpperCase()}
URL:              ${stat.service.url || stat.service.host || "N/A"}
Uptime:           ${stat.uptimePercentage.toFixed(2)}%
Total Checks:     ${stat.totalChecks}
Up Checks:        ${stat.upChecks}
Down Checks:      ${stat.downChecks}
Avg Response:     ${stat.avgResponseTime.toFixed(0)}ms
Last Downtime:    ${stat.lastDowntime ? new Date(stat.lastDowntime).toLocaleString() : "No downtime"}
--------------------------------------------------------------------------------`).join("\n")}

================================================================================
END OF REPORT
================================================================================
`;

    this.downloadTextAsPDF(content, `uptime-report-${timeRange}`);
  },

  exportResponseTimePDF(
    stats: ResponseTimeStats[],
    timeRange: string,
    overallStats: { avgResponse: number; minResponse: number; maxResponse: number }
  ) {
    const content = `
CHECKCLE RESPONSE TIME REPORT
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

================================================================================
SUMMARY
================================================================================
Average Response:   ${overallStats.avgResponse.toFixed(0)}ms
Fastest Response:   ${overallStats.minResponse.toFixed(0)}ms
Slowest Response:   ${overallStats.maxResponse.toFixed(0)}ms

================================================================================
SERVICE DETAILS
================================================================================
${stats.map(stat => `
Service:          ${stat.service.name}
Type:             ${stat.service.service_type?.toUpperCase()}
Min Response:     ${stat.minResponse.toFixed(0)}ms
Avg Response:     ${stat.avgResponse.toFixed(0)}ms
Max Response:     ${stat.maxResponse.toFixed(0)}ms
P95 Response:     ${stat.p95Response.toFixed(0)}ms
P99 Response:     ${stat.p99Response.toFixed(0)}ms
Trend:            ${stat.trend} (${stat.trendValue > 0 ? "+" : ""}${stat.trendValue.toFixed(0)}ms)
--------------------------------------------------------------------------------`).join("\n")}

================================================================================
END OF REPORT
================================================================================
`;

    this.downloadTextAsPDF(content, `response-time-report-${timeRange}`);
  },

  exportIncidentPDF(
    incidents: Incident[],
    stats: ServiceIncidentStats[],
    timeRange: string,
    overallStats: { totalIncidents: number; totalDowntimeMinutes: number; avgMTTR: number; ongoingIncidents: number }
  ) {
    const formatDuration = (minutes: number) => {
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours < 24) return `${hours}h ${mins}m`;
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    };

    const content = `
CHECKCLE INCIDENT REPORT
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

================================================================================
SUMMARY
================================================================================
Total Incidents:    ${overallStats.totalIncidents}
Total Downtime:     ${formatDuration(overallStats.totalDowntimeMinutes)}
Average MTTR:       ${formatDuration(Math.round(overallStats.avgMTTR))}
Ongoing Incidents:  ${overallStats.ongoingIncidents}

================================================================================
SERVICE STATISTICS
================================================================================
${stats.map(stat => `
Service:            ${stat.service.name}
Total Incidents:    ${stat.totalIncidents}
Total Downtime:     ${formatDuration(stat.totalDowntimeMinutes)}
Avg Duration:       ${formatDuration(Math.round(stat.avgIncidentDuration))}
Longest Incident:   ${formatDuration(stat.longestIncident)}
MTTR:               ${formatDuration(Math.round(stat.mttr))}
--------------------------------------------------------------------------------`).join("\n")}

================================================================================
INCIDENT LIST (Last 50)
================================================================================
${incidents.slice(0, 50).map(incident => `
Service:     ${incident.serviceName}
Start:       ${new Date(incident.startTime).toLocaleString()}
End:         ${incident.endTime ? new Date(incident.endTime).toLocaleString() : "Ongoing"}
Duration:    ${formatDuration(incident.duration)}
Status:      ${incident.resolved ? "Resolved" : "Ongoing"}
Error:       ${incident.errorMessage}
--------------------------------------------------------------------------------`).join("\n")}

================================================================================
END OF REPORT
================================================================================
`;

    this.downloadTextAsPDF(content, `incident-report-${timeRange}`);
  },

  downloadTextAsPDF(content: string, filename: string) {
    // For simplicity, we'll download as a text file
    // In production, you'd use a library like jsPDF or pdfmake
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
