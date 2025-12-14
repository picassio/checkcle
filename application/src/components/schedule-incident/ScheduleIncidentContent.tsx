
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScheduledMaintenanceTab } from "./ScheduledMaintenanceTab";
import { IncidentManagementTab } from "./IncidentManagementTab";
import { CreateMaintenanceDialog } from './maintenance/CreateMaintenanceDialog';
import { CreateIncidentDialog } from './incident/CreateIncidentDialog';
import { useToast } from '@/hooks/use-toast';
import { initMaintenanceNotifications, stopMaintenanceNotifications } from '@/services/maintenance/maintenanceNotificationService';

export const ScheduleIncidentContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [createMaintenanceDialogOpen, setCreateMaintenanceDialogOpen] = useState(false);
  const [createIncidentDialogOpen, setCreateIncidentDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [incidentRefreshTrigger, setIncidentRefreshTrigger] = useState(0);

  // Initialize maintenance notifications when the component mounts
  useEffect(() => {
   // console.log("Initializing maintenance notifications");
    initMaintenanceNotifications();
    
    // Clean up when the component unmounts
    return () => {
     // console.log("Cleaning up maintenance notifications");
      stopMaintenanceNotifications();
    };
  }, []);

  const handleCreateButtonClick = () => {
    if (activeTab === "maintenance") {
      setCreateMaintenanceDialogOpen(true);
    } else {
      setCreateIncidentDialogOpen(true);
    }
  };

  const handleMaintenanceCreated = () => {
    // Refresh data by incrementing the refresh trigger
    const newTriggerValue = refreshTrigger + 1;
   // console.log("Maintenance created, refreshing data with new trigger value:", newTriggerValue);
    setRefreshTrigger(newTriggerValue);
    
    // Show success toast
    toast({
      title: t('success'),
      description: t('maintenanceCreatedSuccess'),
    });
  };

  const handleIncidentCreated = () => {
    // Refresh data by incrementing the refresh trigger
    const newTriggerValue = incidentRefreshTrigger + 1;
   // console.log("Incident created, refreshing data with new trigger value:", newTriggerValue);
    setIncidentRefreshTrigger(newTriggerValue);
    
    // Show success toast
    toast({
      title: t('success'),
      description: t('incidentCreatedSuccess'),
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('scheduleIncidentManagement')}
        </h2>
        <Button
          className="text-primary-foreground w-full sm:w-auto"
          onClick={handleCreateButtonClick}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="truncate">
            {activeTab === "maintenance" ? t('createMaintenanceWindow') : t('createIncident')}
          </span>
        </Button>
      </div>

      <Tabs
        defaultValue="maintenance"
        className="w-full"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="maintenance" className="text-xs md:text-sm">
            <CalendarClock className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">{t('scheduledMaintenance')}</span>
            <span className="sm:hidden">Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs md:text-sm">
            <AlertCircle className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">{t('incidentManagement')}</span>
            <span className="sm:hidden">Incidents</span>
          </TabsTrigger>
        </TabsList>
          
          <TabsContent value="maintenance" className="space-y-4">
            <ScheduledMaintenanceTab refreshTrigger={refreshTrigger} />
          </TabsContent>
          
          <TabsContent value="incidents" className="space-y-4">
            <IncidentManagementTab refreshTrigger={incidentRefreshTrigger} />
          </TabsContent>
        </Tabs>

      {/* Maintenance creation dialog */}
      <CreateMaintenanceDialog 
        open={createMaintenanceDialogOpen}
        onOpenChange={setCreateMaintenanceDialogOpen}
        onMaintenanceCreated={handleMaintenanceCreated}
      />

      {/* Incident creation dialog */}
      <CreateIncidentDialog
        open={createIncidentDialogOpen}
        onOpenChange={setCreateIncidentDialogOpen}
        onIncidentCreated={handleIncidentCreated}
      />
    </div>
  );
};
