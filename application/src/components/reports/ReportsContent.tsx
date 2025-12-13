import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UptimeReports } from "./UptimeReports";
import { PerformanceReport } from "./PerformanceReport";
import { IncidentReports } from "./IncidentReports";
import { Activity, Gauge, AlertTriangle, LineChart } from "lucide-react";

export function ReportsContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("uptime");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LineChart className="h-6 w-6" />
            {t("reports") || "Reports & Analytics"}
          </h1>
          <p className="text-muted-foreground">
            {t("reportsDescription") || "Comprehensive analytics and reports for your monitored services"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="uptime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t("uptimeReports") || "Uptime"}</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">{t("performance") || "Performance"}</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t("incidents") || "Incidents"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uptime" className="space-y-4">
          <UptimeReports />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceReport />
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <IncidentReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
