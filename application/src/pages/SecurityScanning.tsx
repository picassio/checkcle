import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { authService } from '@/services/authService';
import { SecurityScan } from '@/types/security.types';
import { Button } from '@/components/ui/button';
import {
  SecurityDashboard,
  SecurityScanList,
  SecurityQueueStatus,
  CreateSecurityScanDialog,
  DeleteSecurityScanDialog,
} from '@/components/security';
import { Plus, Shield } from 'lucide-react';

const SecurityScanning = () => {
  const { sidebarCollapsed, toggleSidebar, mobileOpen, setMobileOpen, toggleMobile } = useSidebar();
  const currentUser = authService.getCurrentUser();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editScan, setEditScan] = useState<SecurityScan | null>(null);
  const [deleteScan, setDeleteScan] = useState<SecurityScan | null>(null);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleEdit = (scan: SecurityScan) => {
    setEditScan(scan);
    setCreateDialogOpen(true);
  };

  const handleDelete = (scan: SecurityScan) => {
    setDeleteScan(scan);
  };

  const handleCloseCreateDialog = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditScan(null);
    }
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
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 md:h-8 md:w-8" />
                  Security Scanning
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  Automated vulnerability scanning powered by Nuclei
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Scan
              </Button>
            </div>

            {/* Dashboard Stats */}
            <SecurityDashboard />

            {/* Queue Status */}
            <SecurityQueueStatus showDetails={true} />

            {/* Scan List */}
            <SecurityScanList onEdit={handleEdit} onDelete={handleDelete} />

            {/* Create/Edit Dialog */}
            <CreateSecurityScanDialog
              open={createDialogOpen}
              onOpenChange={handleCloseCreateDialog}
              editScan={editScan}
            />

            {/* Delete Dialog */}
            <DeleteSecurityScanDialog
              scan={deleteScan}
              open={!!deleteScan}
              onOpenChange={(open) => !open && setDeleteScan(null)}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SecurityScanning;
