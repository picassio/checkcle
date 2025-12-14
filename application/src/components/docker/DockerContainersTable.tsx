
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { DockerContainer } from "@/types/docker.types";
import { DockerMetricsDialog } from "./DockerMetricsDialog";
import { DockerStatusBadge } from "./DockerStatusBadge";
import { dockerService } from "@/services/dockerService";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DockerTableSearch,
  DockerTableHeader,
  DockerTableRow,
  DockerEmptyState,
  DockerRowActions
} from "./table";

interface DockerContainersTableProps {
  containers: DockerContainer[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DockerContainersTable = ({ containers, isLoading, onRefresh }: DockerContainersTableProps) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);

  const filteredContainers = containers.filter(container =>
    container.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    container.docker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    container.hostname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContainerAction = (action: string, containerId: string, containerName: string) => {
    console.log(`${action} action for container ${containerName} (${containerId})`);
    // TODO: Implement container actions
  };

  const handleRowClick = (container: DockerContainer) => {
    setSelectedContainer(container);
    setMetricsDialogOpen(true);
  };

  const handleViewMetrics = (container: DockerContainer) => {
    setSelectedContainer(container);
    setMetricsDialogOpen(true);
  };

  // Mobile Docker Card Component
  const MobileDockerCard = ({ container }: { container: DockerContainer }) => {
    const cpuPercentage = container.cpu_usage;
    const memoryPercentage = Math.round((container.ram_used / container.ram_total) * 100);
    const diskPercentage = Math.round((container.disk_used / container.disk_total) * 100);
    const containerStatus = dockerService.getStatusFromDockerStatus(container.status);

    const getUsageColor = (percentage: number) => {
      if (percentage >= 90) return "text-red-500";
      if (percentage >= 70) return "text-amber-500";
      return "text-emerald-500";
    };

    const getProgressColor = (percentage: number) => {
      if (percentage >= 90) return "bg-red-500";
      if (percentage >= 70) return "bg-amber-500";
      return "bg-emerald-500";
    };

    return (
      <Card className="mb-3" onClick={() => handleRowClick(container)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{container.name}</div>
              <code className="text-xs text-muted-foreground">{container.docker_id}</code>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <DockerStatusBadge status={containerStatus} />
              <DockerRowActions
                container={container}
                containerStatus={containerStatus}
                onContainerAction={handleContainerAction}
                onViewMetrics={handleViewMetrics}
              />
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">CPU</span>
              <Progress value={cpuPercentage} className="flex-1 h-2 bg-muted/50" indicatorClassName={getProgressColor(cpuPercentage)} />
              <span className={`text-xs font-semibold w-10 text-right ${getUsageColor(cpuPercentage)}`}>{cpuPercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">RAM</span>
              <Progress value={memoryPercentage} className="flex-1 h-2 bg-muted/50" indicatorClassName={getProgressColor(memoryPercentage)} />
              <span className={`text-xs font-semibold w-10 text-right ${getUsageColor(memoryPercentage)}`}>{memoryPercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">Disk</span>
              <Progress value={diskPercentage} className="flex-1 h-2 bg-muted/50" indicatorClassName={getProgressColor(diskPercentage)} />
              <span className={`text-xs font-semibold w-10 text-right ${getUsageColor(diskPercentage)}`}>{diskPercentage}%</span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uptime: {dockerService.formatUptime(container.uptime)}</span>
            <span>{new Date(container.last_checked).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Card className="w-full bg-transparent border-0 shadow-none">
        <CardHeader className="pb-4 px-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl font-semibold">{t('dockerContainers', 'docker')}</CardTitle>
              <DockerTableSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onRefresh={onRefresh}
                isLoading={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContainers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? t('noContainersMatchSearch') : t('noContainersFound')}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden">
                {filteredContainers.map((container) => (
                  <MobileDockerCard key={container.id} container={container} />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden border border-border rounded-lg shadow-sm">
                    <Table>
                      <DockerTableHeader />
                      <TableBody>
                        {filteredContainers.map((container) => (
                          <DockerTableRow
                            key={container.id}
                            container={container}
                            onRowClick={handleRowClick}
                            onContainerAction={handleContainerAction}
                            onViewMetrics={handleViewMetrics}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DockerMetricsDialog
        container={selectedContainer}
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
      />
    </>
  );
};