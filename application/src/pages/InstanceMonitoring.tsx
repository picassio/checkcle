
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ServerStatsCards } from "@/components/servers/ServerStatsCards";
import { ServerTable } from "@/components/servers/ServerTable";
import { AddServerAgentDialog } from "@/components/servers/AddServerAgentDialog";
import { serverService } from "@/services/serverService";
import { Server, ServerStats } from "@/types/server.types";
import { useSidebar } from "@/contexts/SidebarContext";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

const InstanceMonitoring = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();
  const navigate = useNavigate();

  // Permission checking for resource filtering
  const { getAssignedResourceIds, can, loading: permissionLoading } = usePermission();

  // Check if user can create servers
  const canCreateServers = can('servers', 'create');

  const [stats, setStats] = useState<ServerStats>({
    total: 0,
    online: 0,
    offline: 0,
    warning: 0
  });

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: allServers = [], isLoading: serversLoading, error, refetch } = useQuery({
    queryKey: ['servers'],
    queryFn: serverService.getServers,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Filter servers based on user's resource assignments
  const servers = useMemo(() => {
    const assignedIds = getAssignedResourceIds('servers');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allServers;
    }

    // Empty array means no access to any servers
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show assigned servers
    return allServers.filter(server => assignedIds.includes(server.id));
  }, [allServers, getAssignedResourceIds]);

  // Combined loading state
  const isLoading = serversLoading || permissionLoading;

  useEffect(() => {
    if (servers.length > 0) {
      serverService.getServerStats(servers).then(setStats);
    }
  }, [servers]);
  
  const handleRefresh = () => {
    refetch();
  };
  
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleAgentAdded = () => {
    refetch();
  };
  
  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            currentUser={currentUser}
            onLogout={handleLogout}
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={toggleSidebar}
            toggleMobile={toggleMobile}
          />
          <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-md w-full">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('errorLoadingServers')}</h2>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                {t('unableToFetchServerData')}
              </p>
              <button 
                onClick={handleRefresh} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm sm:text-base"
              >
                {t('retry')}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          toggleMobile={toggleMobile}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-2xl font-bold text-foreground">
                    {t('instanceMonitoring')}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                    {t('describeMonitorInstance')}
                  </p>
                </div>
                {canCreateServers && (
                  <Button onClick={() => setAddDialogOpen(true)} className="flex-shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addServerAgent')}
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Cards Section */}
            <div>
              <ServerStatsCards stats={stats} />
            </div>
            
            {/* Server Table Section */}
            <div>
              <ServerTable servers={servers} isLoading={isLoading} onRefresh={handleRefresh} />
            </div>
          </div>
        </main>
      </div>

      <AddServerAgentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAgentAdded={handleAgentAdded}
      />
    </div>
  );
};

export default InstanceMonitoring;