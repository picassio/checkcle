import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceDashboard } from "./dashboard/PerformanceDashboard";
import { PerformanceTestList } from "./PerformanceTestList";
import { PerformanceReports } from "./reports/PerformanceReports";
import { BudgetList } from "./budgets/BudgetList";
import { Gauge, List, FileText, AlertTriangle } from "lucide-react";

export function PerformanceContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gauge className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />
            <span className="truncate">{t("performanceMonitoring") || "Performance Monitoring"}</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("performanceDescription") || "Core Web Vitals and performance metrics powered by sitespeed.io"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard") || "Dashboard"}</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tests") || "Tests"}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reports") || "Reports"}</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t("budgets") || "Budgets"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PerformanceDashboard />
        </TabsContent>
        <TabsContent value="tests">
          <PerformanceTestList />
        </TabsContent>
        <TabsContent value="reports">
          <PerformanceReports />
        </TabsContent>
        <TabsContent value="budgets">
          <BudgetList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
