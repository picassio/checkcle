
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Service } from "@/types/service.types";
import { ServiceRow } from "@/components/services/ServiceRow";
import { StatusBadge } from "./StatusBadge";
import { ServiceRowActions, ServiceRowHeader, ServiceRowResponseTime } from "./service-row";
import { LastCheckedTime } from "./LastCheckedTime";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServicesTableViewProps {
  services: Service[];
  onViewDetail: (service: Service) => void;
  onPauseResume: (service: Service) => Promise<void>;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onMuteAlerts?: (service: Service) => Promise<void>;
}

export const ServicesTableView = ({ 
  services,
  onViewDetail,
  onPauseResume,
  onEdit,
  onDelete,
  onMuteAlerts
}: ServicesTableViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Mobile Service Card Component
  const MobileServiceCard = ({ service }: { service: Service }) => {
    const displayTimestamp = service.lastChecked || new Date().toLocaleString();

    return (
      <Card
        className={`mb-3 cursor-pointer ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}`}
        onClick={() => onViewDetail(service)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <ServiceRowHeader service={service} />
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <StatusBadge status={service.status} size="md" />
              <ServiceRowActions
                service={service}
                onViewDetail={onViewDetail}
                onPauseResume={onPauseResume}
                onEdit={onEdit}
                onDelete={onDelete}
                onMuteAlerts={onMuteAlerts}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">{t("serviceType")}</span>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{service.type}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{t("responseTime")}</span>
              <div><ServiceRowResponseTime responseTime={service.responseTime} /></div>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">{t("uptime")}</span>
              <div className="text-sm">{service.uptime?.toFixed(2) || 0}%</div>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">{t("lastChecked")}</span>
              <div><LastCheckedTime lastCheckedTime={displayTimestamp} status={service.status} interval={service.interval} /></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {services.length > 0 ? (
          services.map((service) => (
            <MobileServiceCard key={service.id} service={service} />
          ))
        ) : (
          <div className={`text-center py-8 text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            {t("noServices")}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className={`hidden md:block ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg overflow-hidden border border-border shadow-sm w-full`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} sticky top-0 z-10`}>
            <TableRow className={`${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-100'}`}>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("serviceName")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("serviceType")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("serviceStatus")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("responseTime")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("uptime")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("lastChecked")}</TableHead>
              <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium text-base py-4`}>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length > 0 ? (
              services.map((service) => (
                <ServiceRow 
                  key={service.id}
                  service={service}
                  onViewDetail={onViewDetail}
                  onPauseResume={onPauseResume}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMuteAlerts={onMuteAlerts}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className={`text-center py-8 text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  {t("noServices")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </>
  );
};