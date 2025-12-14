
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SSLDomainContent } from "@/components/ssl-domain/SSLDomainContent";
import { LoadingState } from "@/components/services/LoadingState";
import { fetchSSLCertificates, shouldRunDailyCheck, checkAllCertificatesAndNotify } from "@/services/sslCertificateService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";

const SslDomain = () => {
  // Get language context for translations
  const { t } = useLanguage();
  
  // Use shared sidebar state
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();

  // Get current user
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();
  
  // Fetch SSL certificates with error handling and debugging
  const { data: certificates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['ssl-certificates'],
    queryFn: async () => {
     // console.log("Fetching SSL certificates from SslDomain page...");
      try {
        const result = await fetchSSLCertificates();
     //  console.log("SSL certificates fetch successful, count:", result.length);
        return result;
      } catch (err) {
     //   console.error("Error fetching SSL certificates from page:", err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 3, // Retry failed requests 3 times
  });
  
  // Check all SSL certificates once per day
  useEffect(() => {
    const checkCertificates = async () => {
      // Check if we should run daily check
      if (shouldRunDailyCheck()) {
     //   console.log("Running daily SSL certificate check...");
        await checkAllCertificatesAndNotify();
        // Refresh certificate list after daily check
        refetch();
      }
    };
    
    // Run check when component mounts
    checkCertificates();
  }, [refetch]);
  
  // Handle logout
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // Show loading state while fetching data
  if (isLoading) {
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
            <LoadingState />
          </main>
        </div>
      </div>
    );
  }

  // Show error state
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
          <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-6">
            <h2 className="text-xl font-bold mb-2">{t('failedToLoadCertificates')}</h2>
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              {error instanceof Error ? error.message : t('unknown')}
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => refetch()}
            >
              {t('check')}
            </button>
          </main>
        </div>
      </div>
    );
  }

  // Render with data
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
          <SSLDomainContent />
        </main>
      </div>
    </div>
  );
};

export default SslDomain;