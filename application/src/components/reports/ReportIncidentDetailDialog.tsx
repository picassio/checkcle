import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, AlertCircle, Zap, Server, CheckCircle, XCircle, Timer, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  startTime: string;
  endTime: string | null;
  duration: number; // in minutes
  errorMessage: string;
  resolved: boolean;
}

interface ReportIncidentDetailDialogProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportIncidentDetailDialog({ incident, open, onOpenChange }: ReportIncidentDetailDialogProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!incident) return null;

  const startTimestamp = new Date(incident.startTime);
  const endTimestamp = incident.endTime ? new Date(incident.endTime) : null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours} hours ${mins} minutes`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} days ${remainingHours} hours ${mins} minutes`;
  };

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
            <Badge variant={incident.resolved ? "default" : "destructive"}>
              {incident.resolved ? "Resolved" : "Ongoing"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {/* Service Info */}
          <DetailRow
            icon={Server}
            label={t("service") || "Service"}
            value={
              <div className="space-y-1">
                <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {incident.serviceName}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {incident.serviceType.toUpperCase()}
                  </Badge>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    ID: {incident.serviceId}
                  </span>
                </div>
              </div>
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* Status */}
          <DetailRow
            icon={incident.resolved ? CheckCircle : XCircle}
            label={t("status") || "Status"}
            value={
              <div className="flex items-center gap-2">
                <Badge variant={incident.resolved ? "default" : "destructive"} className="text-sm">
                  {incident.resolved ? "Resolved" : "Ongoing"}
                </Badge>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {incident.resolved
                    ? (t("incidentResolved") || "This incident has been resolved")
                    : (t("incidentOngoing") || "This incident is still ongoing")}
                </span>
              </div>
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* Start Time */}
          <DetailRow
            icon={Calendar}
            label={t("startTime") || "Start Time"}
            value={
              <div className="space-y-1">
                <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {format(startTimestamp, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {format(startTimestamp, 'h:mm:ss a')} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </p>
              </div>
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* End Time */}
          <DetailRow
            icon={Clock}
            label={t("endTime") || "End Time"}
            value={
              endTimestamp ? (
                <div className="space-y-1">
                  <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                    {format(endTimestamp, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {format(endTimestamp, 'h:mm:ss a')} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse">
                    Ongoing
                  </Badge>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t("incidentStillActive") || "Incident is still active"}
                  </span>
                </div>
              )
            }
          />

          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />

          {/* Duration */}
          <DetailRow
            icon={Timer}
            label={t("duration") || "Duration"}
            value={
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${
                  incident.duration < 5 ? 'text-yellow-500' :
                  incident.duration < 30 ? 'text-orange-500' : 'text-red-500'
                }`}>
                  {formatDuration(incident.duration)}
                </span>
                <Badge variant="outline" className={`text-xs ${
                  incident.duration < 5 ? 'border-yellow-500 text-yellow-500' :
                  incident.duration < 30 ? 'border-orange-500 text-orange-500' : 'border-red-500 text-red-500'
                }`}>
                  {incident.duration < 5 ? 'Brief' :
                   incident.duration < 30 ? 'Moderate' : 'Extended'}
                </Badge>
              </div>
            }
          />

          {/* Error Message */}
          {incident.errorMessage && (
            <>
              <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
              <DetailRow
                icon={AlertCircle}
                label={t("errorMessage") || "Error Message"}
                value={
                  <div className={`p-3 rounded-lg font-mono text-sm break-all whitespace-pre-wrap ${
                    theme === 'dark' ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {incident.errorMessage}
                  </div>
                }
              />
            </>
          )}

          {/* Record Info */}
          <Separator className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} />
          <div className={`py-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <div className="flex flex-wrap gap-4">
              <span>Incident ID: <code className="font-mono">{incident.id}</code></span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
