import { Service } from "@/types/service.types";
import { PerformanceMetrics, PerformanceTest } from "@/types/performance.types";
import { SecurityScan, SecurityResult } from "@/types/security.types";
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
  },

  exportSecurityPDF(
    results: SecurityResult[],
    scans: SecurityScan[],
    severityStats: { critical: number; high: number; medium: number; low: number; info: number; unknown: number },
    overallStats: {
      totalFindings: number;
      criticalAndHigh: number;
      uniqueHosts: number;
      uniqueTemplates: number;
      withCVE: number;
    },
    topVulnerabilities: { count: number; severity: string; name: string; templateId: string }[],
    hostStats: { host: string; total: number; critical: number; high: number; medium: number; low: number; info: number }[],
    timeRange: string,
    scanName: string
  ) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const getSeverityColor = (severity: string): [number, number, number] => {
      switch (severity.toLowerCase()) {
        case "critical": return [220, 38, 38];
        case "high": return [249, 115, 22];
        case "medium": return [234, 179, 8];
        case "low": return [59, 130, 246];
        case "info": return [107, 114, 128];
        default: return [156, 163, 175];
      }
    };

    // ==================== PAGE 1: Executive Summary ====================

    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 33, 33);
    doc.text("CHECKCLE SECURITY REPORT", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Time Range: ${timeRange} | Scan: ${scanName}`, pageWidth / 2, 34, { align: "center" });

    // Executive Summary Section
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text("Executive Summary", 14, 48);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    // Summary box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 52, pageWidth - 28, 40, 3, 3, "FD");

    doc.text(`Total Vulnerabilities Found: ${overallStats.totalFindings}`, 20, 62);
    doc.text(`Critical + High Severity: ${overallStats.criticalAndHigh}`, 20, 70);
    doc.text(`Affected Hosts: ${overallStats.uniqueHosts}`, 20, 78);
    doc.text(`Unique Vulnerability Types: ${overallStats.uniqueTemplates}`, 20, 86);

    doc.text(`Vulnerabilities with CVE: ${overallStats.withCVE}`, pageWidth / 2 + 10, 62);
    doc.text(`Scans Analyzed: ${scans.length}`, pageWidth / 2 + 10, 70);

    // Risk Assessment
    let riskLevel = "Low";
    let riskColor: [number, number, number] = [34, 197, 94];
    if (severityStats.critical > 0) {
      riskLevel = "Critical";
      riskColor = [220, 38, 38];
    } else if (severityStats.high > 0) {
      riskLevel = "High";
      riskColor = [249, 115, 22];
    } else if (severityStats.medium > 0) {
      riskLevel = "Medium";
      riskColor = [234, 179, 8];
    }

    doc.setFontSize(12);
    doc.text("Overall Risk Level:", pageWidth / 2 + 10, 78);
    doc.setTextColor(...riskColor);
    doc.setFontSize(14);
    doc.text(riskLevel.toUpperCase(), pageWidth / 2 + 10, 86);
    doc.setTextColor(60, 60, 60);

    // Severity Breakdown Table
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Severity Breakdown", 14, 104);

    const severityData = [
      ["Critical", severityStats.critical.toString(), severityStats.critical > 0 ? "Immediate action required" : "None found"],
      ["High", severityStats.high.toString(), severityStats.high > 0 ? "Address within 24-48 hours" : "None found"],
      ["Medium", severityStats.medium.toString(), severityStats.medium > 0 ? "Address within 1-2 weeks" : "None found"],
      ["Low", severityStats.low.toString(), severityStats.low > 0 ? "Address in next maintenance cycle" : "None found"],
      ["Info", severityStats.info.toString(), "Informational findings"],
    ];

    autoTable(doc, {
      startY: 110,
      head: [["Severity", "Count", "Recommendation"]],
      body: severityData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const severity = data.cell.raw as string;
          data.cell.styles.textColor = getSeverityColor(severity.toLowerCase());
        }
      }
    });

    // Scan Configuration Summary
    const scanTableY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Scan Configuration", 14, scanTableY);

    const scanData = scans.map(scan => [
      scan.name,
      scan.target_url.length > 40 ? scan.target_url.substring(0, 37) + "..." : scan.target_url,
      scan.status,
      (scan.findings_count || 0).toString(),
      (scan.critical_count || 0).toString(),
      (scan.high_count || 0).toString(),
    ]);

    autoTable(doc, {
      startY: scanTableY + 6,
      head: [["Scan Name", "Target", "Status", "Total", "Critical", "High"]],
      body: scanData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { textColor: [220, 38, 38] },
        5: { textColor: [249, 115, 22] },
      }
    });

    // ==================== PAGE 2: Top Vulnerabilities ====================
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text("Top Vulnerabilities", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Most frequently detected vulnerability types, sorted by severity and occurrence", 14, 28);

    const vulnData = topVulnerabilities.map((vuln, index) => [
      (index + 1).toString(),
      vuln.name.length > 35 ? vuln.name.substring(0, 32) + "..." : vuln.name,
      vuln.templateId.length > 25 ? vuln.templateId.substring(0, 22) + "..." : vuln.templateId,
      vuln.severity,
      vuln.count.toString(),
    ]);

    autoTable(doc, {
      startY: 34,
      head: [["#", "Vulnerability", "Template ID", "Severity", "Count"]],
      body: vulnData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        4: { halign: "center", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const severity = data.cell.raw as string;
          data.cell.styles.textColor = getSeverityColor(severity);
          data.cell.styles.fontStyle = "bold";
        }
      }
    });

    // Host Statistics
    const hostTableY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text("Findings by Host", 14, hostTableY);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Vulnerability distribution across scanned targets", 14, hostTableY + 8);

    const hostData = hostStats.map(host => [
      host.host.length > 40 ? host.host.substring(0, 37) + "..." : host.host,
      host.total.toString(),
      host.critical.toString(),
      host.high.toString(),
      host.medium.toString(),
      host.low.toString(),
      host.info.toString(),
    ]);

    autoTable(doc, {
      startY: hostTableY + 14,
      head: [["Host", "Total", "Critical", "High", "Medium", "Low", "Info"]],
      body: hostData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { halign: "center", fontStyle: "bold" },
        2: { halign: "center", textColor: [220, 38, 38] },
        3: { halign: "center", textColor: [249, 115, 22] },
        4: { halign: "center", textColor: [202, 138, 4] },
        5: { halign: "center", textColor: [59, 130, 246] },
        6: { halign: "center", textColor: [107, 114, 128] },
      }
    });

    // ==================== PAGE 3+: Detailed Findings ====================
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text("Detailed Vulnerability Findings", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Showing ${Math.min(results.length, 50)} of ${results.length} findings (sorted by severity)`, 14, 28);

    // Sort results by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, unknown: 5 };
    const sortedResults = [...results].sort((a, b) => {
      const aOrder = severityOrder[a.severity?.toLowerCase()] ?? 5;
      const bOrder = severityOrder[b.severity?.toLowerCase()] ?? 5;
      return aOrder - bOrder;
    }).slice(0, 50);

    const detailData = sortedResults.map(result => [
      result.severity?.toUpperCase() || "UNKNOWN",
      result.template_name?.length > 30 ? result.template_name.substring(0, 27) + "..." : result.template_name,
      result.host?.length > 30 ? result.host.substring(0, 27) + "..." : result.host,
      result.cve_ids?.slice(0, 2).join(", ") || "-",
      result.created ? new Date(result.created).toLocaleDateString() : "-",
    ]);

    autoTable(doc, {
      startY: 34,
      head: [["Severity", "Vulnerability", "Host", "CVEs", "Found"]],
      body: detailData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const severity = (data.cell.raw as string).toLowerCase();
          data.cell.styles.textColor = getSeverityColor(severity);
          data.cell.styles.fontStyle = "bold";
        }
      }
    });

    // ==================== FINAL PAGE: Recommendations ====================
    const currentY = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (currentY > pageHeight - 80) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text("Recommendations", 14, 20);
    } else {
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text("Recommendations", 14, currentY);
    }

    const recStartY = currentY > pageHeight - 80 ? 28 : currentY + 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const recommendations: string[] = [];

    if (severityStats.critical > 0) {
      recommendations.push(`CRITICAL: ${severityStats.critical} critical vulnerabilities require immediate remediation. These pose the highest risk to your infrastructure.`);
    }
    if (severityStats.high > 0) {
      recommendations.push(`HIGH: ${severityStats.high} high-severity issues should be addressed within 24-48 hours to prevent potential exploitation.`);
    }
    if (severityStats.medium > 0) {
      recommendations.push(`MEDIUM: ${severityStats.medium} medium-severity findings should be scheduled for remediation within the next 1-2 weeks.`);
    }
    if (overallStats.withCVE > 0) {
      recommendations.push(`CVE TRACKING: ${overallStats.withCVE} vulnerabilities have known CVE identifiers. Monitor vendor advisories for patches.`);
    }
    if (overallStats.uniqueHosts > 1) {
      recommendations.push(`SCOPE: Vulnerabilities span ${overallStats.uniqueHosts} hosts. Consider prioritizing hosts with critical findings.`);
    }

    // Add general recommendations
    recommendations.push("REGULAR SCANNING: Schedule automated security scans to detect new vulnerabilities promptly.");
    recommendations.push("PATCH MANAGEMENT: Implement a robust patch management process for timely remediation.");
    recommendations.push("DEFENSE IN DEPTH: Use multiple security layers including WAF, IDS/IPS, and network segmentation.");

    if (recommendations.length === 0 || overallStats.totalFindings === 0) {
      recommendations.length = 0;
      recommendations.push("No critical or high-severity vulnerabilities detected. Continue regular security monitoring.");
      recommendations.push("Maintain current security practices and stay updated on emerging threats.");
    }

    let recY = recStartY;
    recommendations.forEach((rec, index) => {
      // Check for page break
      if (recY > pageHeight - 20) {
        doc.addPage();
        recY = 20;
      }

      const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 28);
      doc.text(lines, 14, recY);
      recY += lines.length * 5 + 3;
    });

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Generated by CheckCle Security Scanning - https://checkcle.com",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save(`security-report-${timeRange}-${new Date().toISOString().split("T")[0]}.pdf`);
  }
};
