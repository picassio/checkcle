import { Service } from "@/types/service.types";
import { PerformanceMetrics, PerformanceTest } from "@/types/performance.types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text("CHECKCLE UPTIME REPORT", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Time Range: ${timeRange}`, pageWidth / 2, 34, { align: "center" });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Summary", 14, 48);

    doc.setFontSize(10);
    doc.text(`Average Uptime: ${overallStats.avgUptime.toFixed(2)}%`, 14, 56);
    doc.text(`Total Incidents: ${overallStats.totalIncidents}`, 14, 62);
    doc.text(`Avg Response Time: ${overallStats.avgResponse.toFixed(0)}ms`, 14, 68);

    // Service Details Table
    doc.setFontSize(14);
    doc.text("Service Details", 14, 82);

    const tableData = stats.map(stat => [
      stat.service.name,
      stat.service.service_type?.toUpperCase() || "N/A",
      `${stat.uptimePercentage.toFixed(2)}%`,
      stat.totalChecks.toString(),
      `${stat.avgResponseTime.toFixed(0)}ms`,
      stat.lastDowntime ? new Date(stat.lastDowntime).toLocaleDateString() : "None"
    ]);

    autoTable(doc, {
      startY: 88,
      head: [["Service", "Type", "Uptime", "Checks", "Avg Response", "Last Downtime"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    doc.save(`uptime-report-${timeRange}-${new Date().toISOString().split("T")[0]}.pdf`);
  },

  exportResponseTimePDF(
    stats: ResponseTimeStats[],
    timeRange: string,
    overallStats: { avgResponse: number; minResponse: number; maxResponse: number }
  ) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text("CHECKCLE RESPONSE TIME REPORT", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Time Range: ${timeRange}`, pageWidth / 2, 34, { align: "center" });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Summary", 14, 48);

    doc.setFontSize(10);
    doc.text(`Average Response: ${overallStats.avgResponse.toFixed(0)}ms`, 14, 56);
    doc.text(`Fastest Response: ${overallStats.minResponse.toFixed(0)}ms`, 14, 62);
    doc.text(`Slowest Response: ${overallStats.maxResponse.toFixed(0)}ms`, 14, 68);

    // Service Details Table
    doc.setFontSize(14);
    doc.text("Service Details", 14, 82);

    const tableData = stats.map(stat => [
      stat.service.name,
      `${stat.minResponse.toFixed(0)}ms`,
      `${stat.avgResponse.toFixed(0)}ms`,
      `${stat.maxResponse.toFixed(0)}ms`,
      `${stat.p95Response.toFixed(0)}ms`,
      `${stat.p99Response.toFixed(0)}ms`,
      stat.trend
    ]);

    autoTable(doc, {
      startY: 88,
      head: [["Service", "Min", "Avg", "Max", "P95", "P99", "Trend"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    doc.save(`response-time-report-${timeRange}-${new Date().toISOString().split("T")[0]}.pdf`);
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

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text("CHECKCLE INCIDENT REPORT", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Time Range: ${timeRange}`, pageWidth / 2, 34, { align: "center" });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Summary", 14, 48);

    doc.setFontSize(10);
    doc.text(`Total Incidents: ${overallStats.totalIncidents}`, 14, 56);
    doc.text(`Total Downtime: ${formatDuration(overallStats.totalDowntimeMinutes)}`, 14, 62);
    doc.text(`Average MTTR: ${formatDuration(Math.round(overallStats.avgMTTR))}`, 14, 68);
    doc.text(`Ongoing Incidents: ${overallStats.ongoingIncidents}`, 14, 74);

    // Service Statistics Table
    doc.setFontSize(14);
    doc.text("Service Statistics", 14, 88);

    const statsTableData = stats.map(stat => [
      stat.service.name,
      stat.totalIncidents.toString(),
      formatDuration(stat.totalDowntimeMinutes),
      formatDuration(Math.round(stat.avgIncidentDuration)),
      formatDuration(Math.round(stat.mttr))
    ]);

    autoTable(doc, {
      startY: 94,
      head: [["Service", "Incidents", "Total Downtime", "Avg Duration", "MTTR"]],
      body: statsTableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    // Incident List Table
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    doc.setFontSize(14);
    doc.text("Recent Incidents", 14, finalY + 14);

    const incidentTableData = incidents.slice(0, 30).map(incident => [
      incident.serviceName,
      new Date(incident.startTime).toLocaleString(),
      incident.endTime ? new Date(incident.endTime).toLocaleString() : "Ongoing",
      formatDuration(incident.duration),
      incident.resolved ? "Resolved" : "Ongoing"
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Service", "Start", "End", "Duration", "Status"]],
      body: incidentTableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    doc.save(`incident-report-${timeRange}-${new Date().toISOString().split("T")[0]}.pdf`);
  },

  exportPerformancePDF(
    metrics: PerformanceMetrics[],
    tests: PerformanceTest[],
    timeRange: string,
    overallStats: {
      totalTests: number;
      avgLcp: number;
      avgFcp: number;
      avgCls: number;
      avgTbt: number;
      avgTtfb: number;
      avgSpeedIndex: number;
      budgetPassRate: number;
    },
    testName: string
  ) {
    const getStatus = (metric: string, value: number): string => {
      const thresholds: Record<string, { good: number; poor: number }> = {
        lcp: { good: 2500, poor: 4000 },
        fcp: { good: 1800, poor: 3000 },
        cls: { good: 0.1, poor: 0.25 },
        tbt: { good: 200, poor: 600 },
        ttfb: { good: 800, poor: 1800 },
        speedIndex: { good: 3400, poor: 5800 },
      };
      const t = thresholds[metric];
      if (!t) return "N/A";
      if (value <= t.good) return "Good";
      if (value <= t.poor) return "Needs Improvement";
      return "Poor";
    };

    const getStatusColor = (status: string): [number, number, number] => {
      switch (status) {
        case "Good": return [34, 197, 94]; // green
        case "Needs Improvement": return [234, 179, 8]; // yellow
        case "Poor": return [239, 68, 68]; // red
        default: return [100, 100, 100];
      }
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text("CHECKCLE PERFORMANCE REPORT", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Time Range: ${timeRange} | Test: ${testName}`, pageWidth / 2, 34, { align: "center" });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Summary", 14, 48);

    doc.setFontSize(10);
    doc.text(`Total Tests Run: ${overallStats.totalTests}`, 14, 56);
    doc.text(`Budget Pass Rate: ${overallStats.budgetPassRate.toFixed(1)}%`, 14, 62);

    // Core Web Vitals Section
    doc.setFontSize(14);
    doc.text("Core Web Vitals (Averages)", 14, 76);

    const vitalsData = [
      ["LCP (Largest Contentful Paint)", `${overallStats.avgLcp.toFixed(0)}ms`, getStatus("lcp", overallStats.avgLcp), "< 2500ms"],
      ["FCP (First Contentful Paint)", `${overallStats.avgFcp.toFixed(0)}ms`, getStatus("fcp", overallStats.avgFcp), "< 1800ms"],
      ["CLS (Cumulative Layout Shift)", overallStats.avgCls.toFixed(3), getStatus("cls", overallStats.avgCls), "< 0.1"],
      ["TBT (Total Blocking Time)", `${overallStats.avgTbt.toFixed(0)}ms`, getStatus("tbt", overallStats.avgTbt), "< 200ms"],
      ["TTFB (Time to First Byte)", `${overallStats.avgTtfb.toFixed(0)}ms`, getStatus("ttfb", overallStats.avgTtfb), "< 800ms"],
      ["Speed Index", `${overallStats.avgSpeedIndex.toFixed(0)}ms`, getStatus("speedIndex", overallStats.avgSpeedIndex), "< 3400ms"],
    ];

    autoTable(doc, {
      startY: 82,
      head: [["Metric", "Value", "Status", "Target (Good)"]],
      body: vitalsData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { fontStyle: "bold" }
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const status = data.cell.raw as string;
          const color = getStatusColor(status);
          data.cell.styles.textColor = color;
        }
      }
    });

    // Recent Results Table
    const finalY = (doc as any).lastAutoTable.finalY || 140;
    doc.setFontSize(14);
    doc.text("Recent Test Results", 14, finalY + 14);

    const resultsData = metrics.slice(0, 15).map(m => {
      const test = tests.find(t => t.id === m.test_id);
      return [
        test?.name || m.test_id.substring(0, 10),
        new Date(m.timestamp).toLocaleDateString(),
        `${m.lcp.toFixed(0)}ms`,
        `${m.fcp.toFixed(0)}ms`,
        m.cls.toFixed(3),
        `${m.tbt.toFixed(0)}ms`,
        `${m.ttfb.toFixed(0)}ms`,
        m.budget_passed ? "Pass" : "Fail"
      ];
    });

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Test", "Date", "LCP", "FCP", "CLS", "TBT", "TTFB", "Budget"]],
      body: resultsData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        7: { fontStyle: "bold" }
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const status = data.cell.raw as string;
          data.cell.styles.textColor = status === "Pass" ? [34, 197, 94] : [239, 68, 68];
        }
      }
    });

    // Recommendations
    const finalY2 = (doc as any).lastAutoTable.finalY || 200;

    if (finalY2 < 250) {
      doc.setFontSize(14);
      doc.text("Recommendations", 14, finalY2 + 14);

      doc.setFontSize(9);
      let recY = finalY2 + 22;

      const recommendations: string[] = [];
      if (overallStats.avgLcp > 2500) recommendations.push("LCP: Optimize largest content element loading (images, videos)");
      if (overallStats.avgFcp > 1800) recommendations.push("FCP: Reduce render-blocking resources (CSS, JS)");
      if (overallStats.avgCls > 0.1) recommendations.push("CLS: Add explicit dimensions to images and ads");
      if (overallStats.avgTbt > 200) recommendations.push("TBT: Consider code splitting and reducing JavaScript");
      if (overallStats.avgTtfb > 800) recommendations.push("TTFB: Optimize server response or use CDN");
      if (overallStats.budgetPassRate < 80) recommendations.push("Budget: Review and adjust performance budgets");

      if (recommendations.length === 0) {
        recommendations.push("Great job! All performance metrics are within good thresholds.");
      }

      recommendations.forEach(rec => {
        doc.text(`• ${rec}`, 14, recY);
        recY += 6;
      });
    }

    doc.save(`performance-report-${timeRange}-${new Date().toISOString().split("T")[0]}.pdf`);
  }
};
