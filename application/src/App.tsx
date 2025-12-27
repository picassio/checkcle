import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { PermissionProvider } from './contexts/PermissionContext';

import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InstanceMonitoring from './pages/InstanceMonitoring';
import ContainerMonitoring from './pages/ContainerMonitoring';
import ServiceDetail from './pages/ServiceDetail';
import SslDomain from './pages/SslDomain';
import ScheduleIncident from './pages/ScheduleIncident';
import OperationalPage from './pages/OperationalPage';
import RegionalMonitoring from './pages/RegionalMonitoring';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import PublicStatusPage from './pages/PublicStatusPage';
import { ProtectedRoute, AccessDenied } from './components/auth/ProtectedRoute';
import ServerDetail from './pages/ServerDetail';
import Reports from './pages/Reports';
import PerformanceMonitoring from './pages/PerformanceMonitoring';
import SecurityScanning from './pages/SecurityScanning';
import SecurityScanDetail from './pages/SecurityScanDetail';

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000
      }
    }
  }));

  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <BrandingProvider>
            <SidebarProvider>
              <QueryClientProvider client={queryClient}>
                <PermissionProvider>
                  <Toaster />
                  <Routes>
                    {/* Public routes */}
                    <Route path="/public/:slug" element={<PublicStatusPage />} />

                    {/* Auth routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Dashboard - accessible to all authenticated users */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Profile - accessible to all authenticated users */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* Services/Uptime Monitoring - requires services:view */}
                    <Route
                      path="/instance-monitoring"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'services', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <InstanceMonitoring />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/service/:id"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'services', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <ServiceDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/regional-monitoring"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'services', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <RegionalMonitoring />
                        </ProtectedRoute>
                      }
                    />

                    {/* Server Monitoring - requires servers:view */}
                    <Route
                      path="/server-detail/:serverId"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'servers', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <ServerDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/container-monitoring"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'servers', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <ContainerMonitoring />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/container-monitoring/:serverId"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'servers', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <ContainerMonitoring />
                        </ProtectedRoute>
                      }
                    />

                    {/* SSL Domain - requires ssl_certificates:view */}
                    <Route
                      path="/ssl-domain"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'ssl_certificates', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <SslDomain />
                        </ProtectedRoute>
                      }
                    />

                    {/* Incidents - requires incidents:view */}
                    <Route
                      path="/schedule-incident"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'incidents', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <ScheduleIncident />
                        </ProtectedRoute>
                      }
                    />

                    {/* Operational/Status Pages - requires operational_pages:view */}
                    <Route
                      path="/operational-page"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'operational_pages', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <OperationalPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Reports - requires reports:view */}
                    <Route
                      path="/reports"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'reports', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <Reports />
                        </ProtectedRoute>
                      }
                    />

                    {/* Performance Tests - requires performance_tests:view */}
                    <Route
                      path="/performance"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'performance_tests', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <PerformanceMonitoring />
                        </ProtectedRoute>
                      }
                    />

                    {/* Security Scans - requires security_scans:view */}
                    <Route
                      path="/security"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'security_scans', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <SecurityScanning />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/security/:scanId"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'security_scans', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <SecurityScanDetail />
                        </ProtectedRoute>
                      }
                    />

                    {/* Settings - requires settings:view */}
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute
                          requiredPermission={{ resource: 'settings', action: 'view' }}
                          unauthorizedComponent={<AccessDenied />}
                        >
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PermissionProvider>
              </QueryClientProvider>
            </SidebarProvider>
          </BrandingProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
