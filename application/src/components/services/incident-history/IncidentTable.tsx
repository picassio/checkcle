
import { useState } from "react";
import { format } from "date-fns";
import { UptimeData } from "@/types/service.types";
import { getStatusInfo } from "./utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ValidationResultsDisplay } from "../ValidationResultsDisplay";
import { IncidentDetailDialog } from "./IncidentDetailDialog";
import { Eye, Clock } from "lucide-react";

interface IncidentTableProps {
  incidents: UptimeData[];
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedIncident, setSelectedIncident] = useState<UptimeData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRowClick = (incident: UptimeData) => {
    setSelectedIncident(incident);
    setDialogOpen(true);
  };

  if (incidents.length === 0) {
    return null;
  }

  // Mobile Incident Card Component
  const MobileIncidentCard = ({ check, index }: { check: UptimeData; index: number }) => {
    const statusInfo = getStatusInfo(check.status);
    const timestamp = new Date(check.timestamp);

    return (
      <Card
        className={`mb-3 cursor-pointer ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}`}
        onClick={() => handleRowClick(check)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {statusInfo.badge}
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <Clock className="h-3 w-3 inline mr-1" />
                {format(timestamp, 'MMM dd, h:mm a')}
              </span>
            </div>
            <Eye className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">{t("responseTime")}</span>
              <div className={`font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {check.status !== "paused" && check.responseTime > 0 ? `${check.responseTime}ms` : "N/A"}
              </div>
            </div>
            {check.error_message && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t("errorMessage")}</span>
                <div className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {check.error_message}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {incidents.map((check, index) => (
          <MobileIncidentCard key={check.id || `incident-${index}`} check={check} index={index} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
      <Table className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>
        <TableHeader className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}>
          <TableRow className={theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("time")}</TableHead>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("status")}</TableHead>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("responseTime")}</TableHead>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("errorMessage")}</TableHead>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("details")}</TableHead>
            <TableHead className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t("validation") || "Validation"}</TableHead>
            <TableHead className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} w-10`}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((check, index) => {
            const statusInfo = getStatusInfo(check.status);
            const timestamp = new Date(check.timestamp);

            return (
              <TableRow
                key={check.id || `incident-${index}`}
                className={`cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'}`}
                onClick={() => handleRowClick(check)}
              >
              <TableCell>
                <div className="flex flex-col">
                  <span>{format(timestamp, 'MMM dd, yyyy')}</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {format(timestamp, 'h:mm a')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {statusInfo.badge}
                </div>
              </TableCell>
              <TableCell className={`font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {check.status !== "paused" && check.responseTime > 0 
                  ? `${check.responseTime}ms` 
                  : "N/A"}
              </TableCell>
              <TableCell className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} max-w-[200px]`}>
                {check.error_message ? (
                  <div className="truncate" title={check.error_message}>
                    {check.error_message}
                  </div>
                ) : (
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>-</span>
                )}
              </TableCell>
              <TableCell className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} max-w-[250px]`}>
                {check.details ? (
                  <div className="truncate" title={check.details}>
                    {check.details}
                  </div>
                ) : (
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>-</span>
                )}
              </TableCell>
              <TableCell className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {check.validation_results ? (
                  <ValidationResultsDisplay results={check.validation_results} />
                ) : (
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>-</span>
                )}
              </TableCell>
              <TableCell>
                <Eye className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>

    <IncidentDetailDialog
      incident={selectedIncident}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    />
    </>
  );
}