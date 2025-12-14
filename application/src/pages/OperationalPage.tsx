
import React from "react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { OperationalPageContent } from '@/components/operational-page/OperationalPageContent';
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";

const OperationalPage = () => {
  // Use shared sidebar state
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();

  // Get current user
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();

  // Handle logout
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
          <OperationalPageContent />
        </main>
      </div>
    </div>
  );
};

export default OperationalPage;