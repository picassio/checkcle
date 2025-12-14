
import { ArrowLeft, Globe, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/services/StatusBadge";
import { ServiceMonitoringButton } from "@/components/services/ServiceMonitoringButton";
import { RegionalAgentFilter } from "@/components/services/RegionalAgentFilter";
import { HeatmapDialog } from "./HeatmapDialog";
import { Service, UptimeData } from "@/types/service.types";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ServiceHeaderProps {
  service: Service;
  onStatusChange?: (newStatus: "up" | "down" | "paused" | "warning") => void;
  selectedRegionalAgent?: string;
  onRegionalAgentChange?: (agent: string) => void;
  uptimeData?: UptimeData[];
}

export function ServiceHeader({ 
  service, 
  onStatusChange, 
  selectedRegionalAgent, 
  onRegionalAgentChange,
  uptimeData = []
}: ServiceHeaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  return (
    <>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0 hover:bg-transparent" 
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="flex items-center min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{service.name}</h1>

              {/* Pulsating Circle Animation */}
              <div className="relative ml-2 flex items-center flex-shrink-0">
                <span
                  className={cn(
                    "flex h-3 w-3 relative",
                    service.status === "up" ? "bg-green-500" :
                    service.status === "down" ? "bg-red-500" :
                    service.status === "warning" ? "bg-yellow-500" :
                    "bg-blue-500",
                    "rounded-full"
                  )}
                />
                <span
                  className={cn(
                    "animate-ping absolute h-3 w-3",
                    service.status === "up" ? "bg-green-400" :
                    service.status === "down" ? "bg-red-400" :
                    service.status === "warning" ? "bg-yellow-400" :
                    "bg-blue-400",
                    "rounded-full opacity-75"
                  )}
                />
              </div>
            </div>

            {service.url && (
              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/80 hover:text-primary text-xs md:text-sm flex items-center truncate"
              >
                <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{service.url}</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={service.status} size="lg" />
            <ServiceMonitoringButton service={service} onStatusChange={onStatusChange} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHeatmap(true)}
              className="bg-blue-900/20 hover:bg-blue-900/30"
            >
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Heatmap</span>
            </Button>
            {selectedRegionalAgent !== undefined && onRegionalAgentChange && (
              <RegionalAgentFilter
                selectedAgent={selectedRegionalAgent}
                onAgentChange={onRegionalAgentChange}
              />
            )}
          </div>
        </div>
      </div>

      <HeatmapDialog
        open={showHeatmap}
        onOpenChange={setShowHeatmap}
        serviceName={service.name}
        uptimeData={uptimeData}
      />
    </>
  );
}