
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MapPin, Activity, Wifi, WifiOff } from "lucide-react";
import { regionalService } from "@/services/regionalService";
import { RegionalService } from "@/types/regional.types";
import { AddRegionalAgentDialog } from "./AddRegionalAgentDialog";
import { RegionalAgentCard } from "./RegionalAgentCard";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermission } from "@/hooks/usePermission";

export const RegionalMonitoringContent = () => {
  const { t } = useLanguage();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission checking for resource filtering
  const { getAssignedResourceIds, can, loading: permissionLoading } = usePermission();

  // Check if user can create regional agents (linked to services permission)
  const canCreateAgents = can('services', 'create');

  const { data: allRegionalServices = [], isLoading: servicesLoading, error } = useQuery({
    queryKey: ['regional-services'],
    queryFn: regionalService.getRegionalServices,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter regional services based on user's resource assignments
  // Regional services are linked to services, so we filter by services resource type
  const regionalServices = useMemo(() => {
    const assignedIds = getAssignedResourceIds('services');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allRegionalServices;
    }

    // Empty array means no access to any services
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show regional services for assigned services
    return allRegionalServices.filter(agent => assignedIds.includes(agent.service_id));
  }, [allRegionalServices, getAssignedResourceIds]);

  // Combined loading state
  const isLoading = servicesLoading || permissionLoading;

  const handleAgentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['regional-services'] });
    toast({
      title: t('regionalAgentAdded'),
      description: t('regionalAgentAddedDesc'),
    });
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await regionalService.deleteRegionalService(id);
      queryClient.invalidateQueries({ queryKey: ['regional-services'] });
      toast({
        title: t('agentRemoved'),
        description: t('agentRemovedDesc'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToRemoveAgent'),
        variant: "destructive",
      });
    }
  };

  const onlineAgents = regionalServices.filter(agent => agent.connection === 'online').length;
  const totalAgents = regionalServices.length;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('regionalmonitoring')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('descriptRegionPage')}
          </p>
        </div>
        {canCreateAgents && (
          <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            {t('addRegionalAgent')}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t('totalAgents')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {t('regionalMonitoringAgents')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t('onlineAgents')}</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{onlineAgents}</div>
            <p className="text-xs text-muted-foreground">
              {t('currentlyConnected')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t('offlineAgents')}</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{totalAgents - onlineAgents}</div>
            <p className="text-xs text-muted-foreground">
              {t('disconnectedAgents')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">{t('regionalAgents')}</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : regionalServices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('noRegionalAgents')}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {t('getStartedAddAgent')}
              </p>
              {canCreateAgents && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addFirstAgent')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {regionalServices.map((agent) => (
              <RegionalAgentCard 
                key={agent.id} 
                agent={agent} 
                onDelete={() => handleDeleteAgent(agent.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AddRegionalAgentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAgentAdded={handleAgentAdded}
      />
    </div>
  );
};