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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <LineChart className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />
            <span className="truncate">{t("reports") || "Reports & Analytics"}</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("reportsDescription") || "Comprehensive analytics and reports for your monitored services"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="uptime" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t("uptimeReports") || "Uptime"}</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">{t("performance") || "Performance"}</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
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
