import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Shield,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Bug,
  ExternalLink,
  Target,
  Clock,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Link,
  Terminal,
  Lightbulb,
  Tag,
} from "lucide-react";
import { securityService } from "@/services/securityService";
import { SecurityScan, SecurityResult, severityColors } from "@/types/security.types";
import { ExportUtils } from "./ExportUtils";
import { formatDistanceToNow, format } from "date-fns";
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

type TimeRange = "24h" | "7d" | "30d" | "90d" | "all";

interface SeverityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  unknown: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
  unknown: "#9ca3af",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info", "unknown"];

export function SecurityReport() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedScanId, setSelectedScanId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Fetch all security scans
  const { data: scans = [], isLoading: scansLoading } = useQuery({
    queryKey: ["security-scans-report"],
    queryFn: () => securityService.getScans(),
  });

  // Fetch all results for selected scan or all scans
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["security-results-report", selectedScanId],
    queryFn: async () => {
      if (selectedScanId === "all") {
        // Fetch results for all scans
        const allScanResults: SecurityResult[] = [];
        for (const scan of scans) {
          try {
            const results = await securityService.getResults(scan.id, { limit: 500 });
            allScanResults.push(...results);
          } catch (error) {
            console.error(`Error fetching results for scan ${scan.id}:`, error);
          }
        }
        return allScanResults;
      } else {
        return securityService.getResults(selectedScanId, { limit: 500 });
      }
    },
    enabled: scans.length > 0,
  });

  // Filter results by time range
  const filteredResults = useMemo(() => {
    if (timeRange === "all") return allResults;

    const now = new Date();
    const cutoff = new Date();
    switch (timeRange) {
      case "24h":
        cutoff.setHours(cutoff.getHours() - 24);
        break;
      case "7d":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case "30d":
        cutoff.setDate(cutoff.getDate() - 30);
        break;
      case "90d":
        cutoff.setDate(cutoff.getDate() - 90);
        break;
    }

    return allResults.filter((r) => new Date(r.created) >= cutoff);
  }, [allResults, timeRange]);

  // Calculate severity statistics
  const severityStats = useMemo((): SeverityStats => {
    const stats: SeverityStats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      unknown: 0,
    };

    filteredResults.forEach((result) => {
      const severity = result.severity?.toLowerCase() || "unknown";
      if (severity in stats) {
        stats[severity as keyof SeverityStats]++;
      } else {
        stats.unknown++;
      }
    });

    return stats;
  }, [filteredResults]);

  // Group results by template for top vulnerabilities
  const topVulnerabilities = useMemo(() => {
    const templateGroups: Record<string, { count: number; severity: string; name: string; templateId: string }> = {};

    filteredResults.forEach((result) => {
      const key = result.template_id;
      if (!templateGroups[key]) {
        templateGroups[key] = {
          count: 0,
          severity: result.severity,
          name: result.template_name,
          templateId: result.template_id,
        };
      }
      templateGroups[key].count++;
    });

    return Object.values(templateGroups)
      .sort((a, b) => {
        // Sort by severity first, then by count
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4, unknown: 5 };
        const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 5;
        const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 5;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.count - a.count;
      })
      .slice(0, 10);
  }, [filteredResults]);

  // Group results by host
  const hostStats = useMemo(() => {
    const hostGroups: Record<string, { total: number; critical: number; high: number; medium: number; low: number; info: number }> = {};

    filteredResults.forEach((result) => {
      const host = result.host || "Unknown";
      if (!hostGroups[host]) {
        hostGroups[host] = { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      }
      hostGroups[host].total++;
      const severity = result.severity?.toLowerCase() || "unknown";
      if (severity in hostGroups[host]) {
        (hostGroups[host] as any)[severity]++;
      }
    });

    return Object.entries(hostGroups)
      .map(([host, stats]) => ({ host, ...stats }))
      .sort((a, b) => b.critical + b.high - (a.critical + a.high))
      .slice(0, 10);
  }, [filteredResults]);

  // Prepare chart data
  const severityChartData = SEVERITY_ORDER.map((severity) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: severityStats[severity as keyof SeverityStats],
    color: SEVERITY_COLORS[severity],
  })).filter((d) => d.value > 0);

  const pieChartData = SEVERITY_ORDER.map((severity) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: severityStats[severity as keyof SeverityStats],
  })).filter((d) => d.value > 0);

  // Get overall stats
  const overallStats = useMemo(() => {
    const totalFindings = filteredResults.length;
    const criticalAndHigh = severityStats.critical + severityStats.high;
    const uniqueHosts = new Set(filteredResults.map((r) => r.host)).size;
    const uniqueTemplates = new Set(filteredResults.map((r) => r.template_id)).size;
    const withCVE = filteredResults.filter((r) => r.cve_ids && r.cve_ids.length > 0).length;

    return {
      totalFindings,
      criticalAndHigh,
      uniqueHosts,
      uniqueTemplates,
      withCVE,
    };
  }, [filteredResults, severityStats]);

  // Get scan summary
  const scanSummary = useMemo(() => {
    if (selectedScanId !== "all") {
      const scan = scans.find((s) => s.id === selectedScanId);
      return scan ? [scan] : [];
    }
    return scans;
  }, [scans, selectedScanId]);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
      info: "outline",
    };
    return variants[severity] || "outline";
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredResults.map((result) => ({
      "Template ID": result.template_id,
      "Template Name": result.template_name,
      Severity: result.severity,
      Host: result.host,
      "Matched URL": result.matched_url || "",
      Description: result.description || "",
      Solution: result.solution || "",
      "CVE IDs": result.cve_ids?.join(", ") || "",
      References: result.references?.join(", ") || "",
      Tags: result.tags?.join(", ") || "",
      "Extracted Results": result.extracted_results || "",
      "cURL Command": result.curl_command || "",
      "Matched At": result.matched_at || "",
      "Found At": result.created,
      "Scan ID": result.scan_id,
    }));
    ExportUtils.exportCSV(data, `security-report-${timeRange}`);
  };

  const handleExportPDF = () => {
    ExportUtils.exportSecurityPDF(
      filteredResults,
      scanSummary,
      severityStats,
      overallStats,
      topVulnerabilities,
      hostStats,
      timeRange,
      selectedScanId === "all" ? "All Scans" : scans.find((s) => s.id === selectedScanId)?.name || "Unknown"
    );
  };

  const isLoading = scansLoading || resultsLoading;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Select value={selectedScanId} onValueChange={setSelectedScanId}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select scan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scans</SelectItem>
              {scans.map((scan) => (
                <SelectItem key={scan.id} value={scan.id}>
                  {scan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t("last24Hours") || "Last 24 Hours"}</SelectItem>
              <SelectItem value="7d">{t("last7Days") || "Last 7 Days"}</SelectItem>
              <SelectItem value="30d">{t("last30Days") || "Last 30 Days"}</SelectItem>
              <SelectItem value="90d">{t("last90Days") || "Last 90 Days"}</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalFindings}</div>
            <p className="text-xs text-muted-foreground">Vulnerabilities detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical + High</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{overallStats.criticalAndHigh}</div>
            <p className="text-xs text-muted-foreground">
              {severityStats.critical} critical, {severityStats.high} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected Hosts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.uniqueHosts}</div>
            <p className="text-xs text-muted-foreground">Unique targets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerability Types</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.uniqueTemplates}</div>
            <p className="text-xs text-muted-foreground">Unique templates matched</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With CVE</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.withCVE}</div>
            <p className="text-xs text-muted-foreground">Known CVE references</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Findings by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SEVERITY_COLORS[entry.name.toLowerCase()] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities" className="text-xs sm:text-sm">Top Vulnerabilities</TabsTrigger>
          <TabsTrigger value="hosts" className="text-xs sm:text-sm">By Host</TabsTrigger>
          <TabsTrigger value="details" className="text-xs sm:text-sm">All Findings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Summary</CardTitle>
              <CardDescription>
                Overview of configured security scans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : scanSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No scans configured</div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {scanSummary.map((scan) => (
                      <Card key={scan.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{scan.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{scan.target_url}</div>
                          </div>
                          <Badge
                            variant={scan.status === "active" ? "default" : scan.status === "running" ? "secondary" : "outline"}
                          >
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                          <div>
                            <span className="text-muted-foreground">Total:</span> {scan.findings_count || 0}
                          </div>
                          <div>
                            <span className="text-red-500">Critical:</span> {scan.critical_count || 0}
                          </div>
                          <div>
                            <span className="text-orange-500">High:</span> {scan.high_count || 0}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Last scan: {scan.last_scan ? format(new Date(scan.last_scan), "PPp") : "Never"}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scan Name</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Critical</TableHead>
                          <TableHead className="text-right">High</TableHead>
                          <TableHead>Last Scan</TableHead>
                          <TableHead>Next Scan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanSummary.map((scan) => (
                          <TableRow key={scan.id}>
                            <TableCell className="font-medium">{scan.name}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={scan.target_url}>
                              {scan.target_url}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  scan.status === "active"
                                    ? "default"
                                    : scan.status === "running"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {scan.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{scan.findings_count || 0}</TableCell>
                            <TableCell className="text-right text-red-500">{scan.critical_count || 0}</TableCell>
                            <TableCell className="text-right text-orange-500">{scan.high_count || 0}</TableCell>
                            <TableCell>
                              {scan.last_scan ? (
                                <span className="text-sm" title={format(new Date(scan.last_scan), "PPpp")}>
                                  {formatDistanceToNow(new Date(scan.last_scan), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Never</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {scan.next_scan ? (
                                <span className="text-sm" title={format(new Date(scan.next_scan), "PPpp")}>
                                  {formatDistanceToNow(new Date(scan.next_scan), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Vulnerabilities Tab */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Vulnerabilities</CardTitle>
              <CardDescription>
                Most frequently detected vulnerability types, sorted by severity and occurrence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : topVulnerabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No vulnerabilities found</div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {topVulnerabilities.map((vuln, index) => (
                      <Card key={vuln.templateId} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getSeverityBadge(vuln.severity)}>{vuln.severity}</Badge>
                              <span className="text-sm font-medium">{vuln.count} occurrences</span>
                            </div>
                            <div className="font-medium truncate">{vuln.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{vuln.templateId}</div>
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
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Vulnerability</TableHead>
                          <TableHead>Template ID</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead className="text-right">Occurrences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topVulnerabilities.map((vuln, index) => (
                          <TableRow key={vuln.templateId}>
                            <TableCell className="font-bold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{vuln.name}</TableCell>
                            <TableCell className="font-mono text-sm">{vuln.templateId}</TableCell>
                            <TableCell>
                              <Badge variant={getSeverityBadge(vuln.severity)}>{vuln.severity}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{vuln.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Host Tab */}
        <TabsContent value="hosts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Findings by Host</CardTitle>
              <CardDescription>
                Vulnerability distribution across scanned targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : hostStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No host data available</div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {hostStats.map((host) => (
                      <Card key={host.host} className="p-4">
                        <div className="font-medium truncate mb-2">{host.host}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Total:</span> {host.total}</div>
                          <div><span className="text-red-600">Critical:</span> {host.critical}</div>
                          <div><span className="text-orange-500">High:</span> {host.high}</div>
                          <div><span className="text-yellow-500">Medium:</span> {host.medium}</div>
                          <div><span className="text-blue-500">Low:</span> {host.low}</div>
                          <div><span className="text-gray-500">Info:</span> {host.info}</div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Host</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Critical</TableHead>
                          <TableHead className="text-right">High</TableHead>
                          <TableHead className="text-right">Medium</TableHead>
                          <TableHead className="text-right">Low</TableHead>
                          <TableHead className="text-right">Info</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hostStats.map((host) => (
                          <TableRow key={host.host}>
                            <TableCell className="font-mono text-sm max-w-[300px] truncate" title={host.host}>
                              {host.host}
                            </TableCell>
                            <TableCell className="text-right font-medium">{host.total}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">{host.critical}</TableCell>
                            <TableCell className="text-right text-orange-500">{host.high}</TableCell>
                            <TableCell className="text-right text-yellow-600">{host.medium}</TableCell>
                            <TableCell className="text-right text-blue-500">{host.low}</TableCell>
                            <TableCell className="text-right text-gray-500">{host.info}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Findings Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Findings ({filteredResults.length})</CardTitle>
              <CardDescription>
                Complete list of detected vulnerabilities with full details. Click on any finding to expand.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No findings in selected time range</div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {filteredResults.map((result) => (
                      <Collapsible
                        key={result.id}
                        open={expandedFindings.has(result.id)}
                        onOpenChange={() => toggleFinding(result.id)}
                      >
                        <Card className={`${expandedFindings.has(result.id) ? 'ring-2 ring-primary' : ''}`}>
                          <CollapsibleTrigger asChild>
                            <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <Badge variant={getSeverityBadge(result.severity)} className="mt-0.5">
                                    {result.severity}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{result.template_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{result.template_id}</div>
                                    <div className="text-sm text-muted-foreground mt-1 truncate">{result.host}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {result.cve_ids && result.cve_ids.length > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {result.cve_ids.length} CVE{result.cve_ids.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(result.created), { addSuffix: true })}
                                  </span>
                                  {expandedFindings.has(result.id) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-4 pb-4 border-t pt-4 space-y-4">
                              {/* Matched URL */}
                              {result.matched_url && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Link className="h-4 w-4" />
                                    Matched URL
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all font-mono">
                                      {result.matched_url}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(result.matched_url, 'URL')}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={result.matched_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Description */}
                              {result.description && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Info className="h-4 w-4" />
                                    Description
                                  </div>
                                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                    {result.description}
                                  </p>
                                </div>
                              )}

                              {/* Solution */}
                              {result.solution && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                    <Lightbulb className="h-4 w-4" />
                                    Solution / Remediation
                                  </div>
                                  <p className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                                    {result.solution}
                                  </p>
                                </div>
                              )}

                              {/* CVE IDs */}
                              {result.cve_ids && result.cve_ids.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <AlertTriangle className="h-4 w-4" />
                                    CVE References
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {result.cve_ids.map((cve) => (
                                      <a
                                        key={cve}
                                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1"
                                      >
                                        <Badge variant="destructive" className="cursor-pointer hover:bg-red-600">
                                          {cve}
                                          <ExternalLink className="h-3 w-3 ml-1" />
                                        </Badge>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tags */}
                              {result.tags && result.tags.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Tag className="h-4 w-4" />
                                    Tags
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {result.tags.map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* References */}
                              {result.references && result.references.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <ExternalLink className="h-4 w-4" />
                                    References
                                  </div>
                                  <div className="space-y-1 bg-muted p-3 rounded max-h-32 overflow-y-auto">
                                    {result.references.map((ref, idx) => (
                                      <a
                                        key={idx}
                                        href={ref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-blue-500 hover:underline truncate"
                                      >
                                        {ref}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Extracted Results */}
                              {result.extracted_results && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Target className="h-4 w-4" />
                                    Extracted Data
                                  </div>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">
                                    {result.extracted_results}
                                  </pre>
                                </div>
                              )}

                              {/* cURL Command */}
                              {result.curl_command && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <Terminal className="h-4 w-4" />
                                      Reproduce (cURL)
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(result.curl_command, 'cURL command')}
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <pre className="text-xs bg-zinc-900 text-green-400 p-3 rounded overflow-x-auto font-mono">
                                    {result.curl_command}
                                  </pre>
                                </div>
                              )}

                              {/* Raw Data */}
                              {result.raw_data && Object.keys(result.raw_data).length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <FileText className="h-4 w-4" />
                                      Raw Data
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(JSON.stringify(result.raw_data, null, 2), 'Raw data')}
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copy JSON
                                    </Button>
                                  </div>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono max-h-48 overflow-y-auto">
                                    {JSON.stringify(result.raw_data, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="pt-2 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">Host:</span> {result.host}
                                </div>
                                <div>
                                  <span className="font-medium">Found:</span> {format(new Date(result.created), "PPpp")}
                                </div>
                                {result.matched_at && (
                                  <div>
                                    <span className="font-medium">Matched at:</span> {format(new Date(result.matched_at), "PPpp")}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">Scan ID:</span> {result.scan_id}
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
