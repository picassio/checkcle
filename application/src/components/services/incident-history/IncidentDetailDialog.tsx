import { format } from "date-fns";
import { UptimeData } from "@/types/service.types";
import { getStatusInfo } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ValidationResultsDisplay } from "../ValidationResultsDisplay";
import { Clock, AlertCircle, Zap, FileText, CheckCircle, XCircle, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface IncidentDetailDialogProps {
  incident: UptimeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentDetailDialog({ incident, open, onOpenChange }: IncidentDetailDialogProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!incident) return null;

  const statusInfo = getStatusInfo(incident.status);
  const timestamp = new Date(incident.timestamp);

  const DetailRow = ({ icon: Icon, label, value, valueClassName = "" }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    valueClassName?: string;
  }) => (
    <div className="flex items-start gap-3 py-3">
      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <Icon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {label}
        </p>
        <div className={`mt-1 ${valueClassName}`}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{t("incidentDetails") || "Incident Details"}</span>
            {statusInfo.badge}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {/* Timestamp */}
          <DetailRow
            icon={Clock}
            label={t("time") || "Time"}
            value={
              <div className="space-y-1">
                <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {format(timestamp, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {format(timestamp, 'h:mm:ss a')} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </p>
              </div>
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* Status */}
          <DetailRow
            icon={incident.status === 'up' ? CheckCircle : incident.status === 'down' ? XCircle : AlertCircle}
            label={t("status") || "Status"}
            value={
              <div className="flex items-center gap-2">
                {statusInfo.badge}
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {incident.status === 'up' && (t("serviceOperatingNormally") || "Service is operating normally")}
                  {incident.status === 'down' && (t("serviceUnavailable") || "Service is unavailable")}
                  {incident.status === 'warning' && (t("serviceExperiencingIssues") || "Service is experiencing issues")}
                  {incident.status === 'paused' && (t("monitoringPaused") || "Monitoring is paused")}
                </span>
              </div>
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* Response Time */}
          <DetailRow
            icon={Zap}
            label={t("responseTime") || "Response Time"}
            value={
              incident.status !== "paused" && incident.responseTime > 0 ? (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-mono font-semibold ${
                    incident.responseTime < 200 ? 'text-green-500' :
                    incident.responseTime < 500 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {incident.responseTime}ms
                  </span>
                  <Badge variant="outline" className={`text-xs ${
                    incident.responseTime < 200 ? 'border-green-500 text-green-500' :
                    incident.responseTime < 500 ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'
                  }`}>
                    {incident.responseTime < 200 ? 'Fast' :
                     incident.responseTime < 500 ? 'Normal' : 'Slow'}
                  </Badge>
                </div>
              ) : (
                <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>N/A</span>
              )
            }
          />

          {/* Regional Info (if available) */}
          {(incident.region_name || incident.agent_id) && (
            <>
              <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
              <DetailRow
                icon={Globe}
                label={t("monitoringSource") || "Monitoring Source"}
                value={
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {incident.region_name || 'Default'}
                    </Badge>
                    {incident.agent_id && (
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Agent ID: {incident.agent_id}
                      </span>
                    )}
                  </div>
                }
              />
            </>
          )}

          {/* Error Message */}
          {incident.error_message && (
            <>
              <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
              <DetailRow
                icon={AlertCircle}
                label={t("errorMessage") || "Error Message"}
                value={
                  <div className={`p-3 rounded-lg font-mono text-sm break-all ${
                    theme === 'dark' ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {incident.error_message}
                  </div>
                }
              />
            </>
          )}

          {/* Details */}
          {incident.details && (
            <>
              <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
              <DetailRow
                icon={FileText}
                label={t("details") || "Details"}
                value={
                  <div className={`p-3 rounded-lg font-mono text-sm break-all whitespace-pre-wrap ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {incident.details}
                  </div>
                }
              />
            </>
          )}

          {/* Validation Results */}
          {incident.validation_results && (
            <>
              <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
              <div className="py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <CheckCircle className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t("validationResults") || "Validation Results"}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ValidationResultsDisplay results={incident.validation_results} expanded={true} />
                </div>
              </div>
            </>
          )}

          {/* Record Info */}
          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
          <div className={`py-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <div className="flex flex-wrap gap-4">
              {incident.id && (
                <span>ID: <code className="font-mono">{incident.id}</code></span>
              )}
              {incident.created && (
                <span>Created: {format(new Date(incident.created), 'MMM d, yyyy h:mm a')}</span>
              )}
              {incident.updated && (
                <span>Updated: {format(new Date(incident.updated), 'MMM d, yyyy h:mm a')}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
