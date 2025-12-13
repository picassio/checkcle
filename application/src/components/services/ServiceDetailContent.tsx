import { Service, UptimeData } from "@/types/service.types";
import { ServiceHeader } from "@/components/services/ServiceHeader";
import { ServiceStatsCards } from "@/components/services/ServiceStatsCards";
import { ResponseTimeChart } from "@/components/services/ResponseTimeChart";
import { LatestChecksTable } from "@/components/services/incident-history";
import { DateRangeFilter, DateRangeOption } from "@/components/services/DateRangeFilter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceDetailContentProps {
  service: Service;
  uptimeData: UptimeData[];
  onDateRangeChange: (start: Date, end: Date, option: DateRangeOption) => void;
  onStatusChange: (newStatus: "up" | "down" | "paused" | "warning") => void;
  selectedDateOption: DateRangeOption;
  selectedRegionalAgent: string;
  onRegionalAgentChange: (agent: string) => void;
}

export const ServiceDetailContent = ({
  service,
  uptimeData,
  onDateRangeChange,
  onStatusChange,
  selectedDateOption,
  selectedRegionalAgent,
  onRegionalAgentChange
}: ServiceDetailContentProps) => {
  const { t } = useLanguage();
  // Check if data is available
  const hasUptimeData = uptimeData && uptimeData.length > 0;

  return (
    <div className="p-4 md:p-6 pb-0 h-full overflow-auto">
      <ServiceHeader 
        service={service} 
        onStatusChange={onStatusChange}
        selectedRegionalAgent={selectedRegionalAgent}
        onRegionalAgentChange={onRegionalAgentChange}
        uptimeData={uptimeData}
      />
      <ServiceStatsCards service={service} uptimeData={uptimeData} />
      
      <div className="mb-4 md:mb-6 mt-6 md:mt-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-lg md:text-xl font-medium">{t("responseTimeHistory")}</h2>
        <DateRangeFilter
          onRangeChange={onDateRangeChange}
          selectedOption={selectedDateOption}
        />
      </div>
      
      {!hasUptimeData && (
        <Card className="mb-6 md:mb-8">
          <CardContent className="flex items-center justify-center py-8 md:py-12">
            <div className="text-center">
              <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-amber-500 mx-auto mb-2 md:mb-3 opacity-70" />
              <h3 className="text-base md:text-lg font-medium mb-1">{t("noUptimeData")}</h3>
              <p className="text-muted-foreground max-w-md text-sm md:text-base">
                {t("noUptimeDataDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {hasUptimeData && <ResponseTimeChart uptimeData={uptimeData} />}
      
      <div className="pb-6">
        <LatestChecksTable uptimeData={uptimeData} />
      </div>
    </div>
  );
};