import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePerformanceTestDialog } from "./CreatePerformanceTestDialog";
import { PerformanceDetailView } from "./PerformanceDetailView";
import { QueueStatusBanner } from "./QueueStatusBanner";
import {
  Plus,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Clock,
  RefreshCw,
  Loader2,
  ListOrdered,
  Eye,
} from "lucide-react";
import { PerformanceTest, BROWSER_OPTIONS, CONNECTIVITY_OPTIONS, QueueStatus } from "@/types/performance.types";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { permissionService } from "@/services/permissionService";

export function PerformanceTestList() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Permission checking for resource filtering
  const { getAssignedResourceIds, can, loading: permissionLoading } = usePermission();

  // Check if user can create performance tests
  const canCreateTests = can('performance_tests', 'create');

  // Check if user can manage any performance tests (for showing queue status)
  const canManageAny = can('performance_tests', 'manage');

  // Helper function to check if user can manage a specific test
  const canManageTest = (testId: string): boolean => {
    const accessLevel = permissionService.getEffectiveAccessLevel('performance_tests', testId);
    return accessLevel === 'manage';
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PerformanceTest | null>(null);
  const [selectedTest, setSelectedTest] = useState<PerformanceTest | null>(null);

  const { data: allTests = [], isLoading: testsLoading } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

  // Filter performance tests based on user's resource assignments
  const tests = useMemo(() => {
    const assignedIds = getAssignedResourceIds('performance_tests');

    // null means no filtering needed (superadmin/admin)
    if (assignedIds === null) {
      return allTests;
    }

    // Empty array means no access to any performance tests
    if (assignedIds.length === 0) {
      return [];
    }

    // Filter to only show assigned performance tests
    return allTests.filter(test => assignedIds.includes(test.id));
  }, [allTests, getAssignedResourceIds]);

  // Combined loading state
  const isLoading = testsLoading || permissionLoading;

  // Fetch queue status - only for users who can manage tests
  const { data: queueStatus } = useQuery({
    queryKey: ["performance-queue-status"],
    queryFn: () => performanceService.getQueueStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: canManageAny, // Only fetch for users who can manage tests
  });

  // Create a map of test_id to test name for the queue banner
  const testNamesMap = useMemo(() => {
    return tests.reduce((acc, test) => {
      acc[test.id] = test.name;
      return acc;
    }, {} as Record<string, string>);
  }, [tests]);

  // Check if a test is queued or running
  const getTestQueueStatus = (testId: string): { isQueued: boolean; isRunning: boolean; position: number } => {
    if (!queueStatus) return { isQueued: false, isRunning: false, position: 0 };

    // Check if currently running
    if (queueStatus.currently_running?.test_id === testId) {
      return { isQueued: true, isRunning: true, position: 0 };
    }

    // Check position in pending queue
    const position = queueStatus.pending_items.findIndex(item => item.test_id === testId);
    if (position !== -1) {
      return { isQueued: true, isRunning: false, position: position + 1 };
    }

    return { isQueued: false, isRunning: false, position: 0 };
  };

  const deleteMutation = useMutation({
    mutationFn: performanceService.deleteTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      toast.success(t("testDeleted") || "Test deleted successfully");
    },
    onError: () => {
      toast.error(t("deleteError") || "Failed to delete test");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: performanceService.pauseTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      toast.success(t("testPaused") || "Test paused");
    },
  });

  const resumeMutation = useMutation({
    mutationFn: performanceService.resumeTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      toast.success(t("testResumed") || "Test resumed");
    },
  });

  const runTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      return performanceService.runTestNow(testId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      queryClient.invalidateQueries({ queryKey: ["performance-queue-status"] });
      toast.success(t("testQueued") || "Test added to queue");
    },
    onError: (error: Error) => {
      toast.error(error.message || t("testFailed") || "Failed to queue test");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">{t("active") || "Active"}</Badge>;
      case "paused":
        return <Badge variant="secondary">{t("paused") || "Paused"}</Badge>;
      case "running":
        return <Badge variant="default" className="bg-blue-600">{t("running") || "Running"}</Badge>;
      case "error":
        return <Badge variant="destructive">{t("error") || "Error"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 3600) return `${Math.round(seconds / 60)} ${t("min")}`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} ${t("hr")}`;
    return `${Math.round(seconds / 86400)} ${t("day")}`;
  };

  if (selectedTest) {
    return (
      <PerformanceDetailView
        test={selectedTest}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const handleQueueRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["performance-queue-status"] });
    queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-base md:text-lg font-semibold">{t("performanceTests") || "Performance Tests"}</h2>
        {canCreateTests && (
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t("addTest") || "Add Test"}
          </Button>
        )}
      </div>

      {/* Queue Status Banner - only show for users who can manage tests */}
      {canManageAny && (
        <QueueStatusBanner
          onRefresh={handleQueueRefresh}
          testNames={testNamesMap}
        />
      )}

      {tests.length === 0 ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t("noPerformanceTests") || "No performance tests configured yet."}
            </p>
            {canCreateTests && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("createFirstTest") || "Create your first test"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card
              key={test.id}
              className={`cursor-pointer transition-colors ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800 hover:bg-gray-800"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedTest(test)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm md:text-base truncate">{test.name}</h3>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                      {test.url}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatInterval(test.schedule_interval)}
                      </span>
                      <span className="hidden sm:inline">
                        {BROWSER_OPTIONS.find((b) => b.value === test.browser)?.label || test.browser}
                      </span>
                      <span className="hidden sm:inline">
                        {CONNECTIVITY_OPTIONS.find((c) => c.value === test.connectivity)?.label || test.connectivity}
                      </span>
                      {test.last_run && (
                        <span className="hidden md:inline">
                          {t("lastRun") || "Last run"}: {format(new Date(test.last_run), "MMM d, HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    {canManageTest(test.id) && (() => {
                      const queueInfo = getTestQueueStatus(test.id);
                      const isDisabled = queueInfo.isQueued || test.status === "running" || runTestMutation.isPending;

                      return (
                        <Button
                          size="sm"
                          variant={queueInfo.isQueued ? "secondary" : "outline"}
                          disabled={isDisabled}
                          onClick={() => runTestMutation.mutate(test.id)}
                        >
                          {queueInfo.isRunning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t("running") || "Running"}...
                            </>
                          ) : queueInfo.isQueued ? (
                            <>
                              <ListOrdered className="h-4 w-4 mr-1" />
                              {t("queued") || "Queued"} #{queueInfo.position}
                            </>
                          ) : runTestMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t("queueing") || "Queueing"}...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              {t("runNow") || "Run Now"}
                            </>
                          )}
                        </Button>
                      );
                    })()}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedTest(test)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("viewReports") || "View Reports"}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={test.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t("openUrl") || "Open URL"}
                          </a>
                        </DropdownMenuItem>
                        {canManageTest(test.id) && (
                          <>
                            <DropdownMenuItem onClick={() => setEditingTest(test)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("edit") || "Edit"}
                            </DropdownMenuItem>
                            {test.status === "active" ? (
                              <DropdownMenuItem onClick={() => pauseMutation.mutate(test.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                {t("pause") || "Pause"}
                              </DropdownMenuItem>
                            ) : test.status === "paused" ? (
                              <DropdownMenuItem onClick={() => resumeMutation.mutate(test.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t("resume") || "Resume"}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm(t("confirmDelete") || "Are you sure you want to delete this test?")) {
                                  deleteMutation.mutate(test.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("delete") || "Delete"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePerformanceTestDialog
        open={createDialogOpen || !!editingTest}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingTest(null);
        }}
        editingTest={editingTest}
      />
    </div>
  );
}
