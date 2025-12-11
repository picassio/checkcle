
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { serviceService } from "@/services/serviceService";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";

const Dashboard = () => {
  // Use shared sidebar state
  const { sidebarCollapsed, toggleSidebar } = useSidebar();

  // Get current user
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();
  
  // For debugging user data
  useEffect(() => {
  //  console.log("Current user data:", currentUser);
  }, [currentUser]);
  
  // Handle logout
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // Fetch all services with 1-minute polling for real-time updates
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: serviceService.getServices,
    refetchInterval: 60000, // 1 minute as requested
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on mount
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 2,
    retryDelay: 3000,
  });

  // Start monitoring all active services when the dashboard loads - only once
  useEffect(() => {
    let hasStarted = false;
    
    const startActiveServices = async () => {
      if (hasStarted) return;
      hasStarted = true;
      
      await serviceService.startAllActiveServices();
     // console.log("Active services monitoring started");
    };

    // Only start once and add a delay to prevent immediate execution
    const timeoutId = setTimeout(startActiveServices, 2000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Remove services dependency to prevent re-runs

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
        <DashboardContent
          services={services}
          isLoading={isLoading}
          error={error as Error}
        />
      </div>
    </div>
  );
};

export default Dashboard;