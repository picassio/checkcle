
import React, { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";
import { RegionalMonitoringContent } from "@/components/regional-monitoring/RegionalMonitoringContent";

const RegionalMonitoring = () => {
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

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
        <main className="flex-1 overflow-y-auto">
          <RegionalMonitoringContent />
        </main>
      </div>
    </div>
  );
};

export default RegionalMonitoring;