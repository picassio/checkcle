import { useState } from "react";
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
} from "lucide-react";
import { PerformanceTest, BROWSER_OPTIONS, CONNECTIVITY_OPTIONS } from "@/types/performance.types";
import { format } from "date-fns";
import { toast } from "sonner";

export function PerformanceTestList() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PerformanceTest | null>(null);
  const [selectedTest, setSelectedTest] = useState<PerformanceTest | null>(null);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["performance-tests"],
    queryFn: () => performanceService.getTests(),
  });

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
      setRunningTestId(testId);
      return performanceService.runTestNow(testId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      queryClient.invalidateQueries({ queryKey: ["performance-latest-metrics"] });
      toast.success(t("testCompleted") || "Test completed successfully");
      setRunningTestId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("testFailed") || "Test failed to run");
      setRunningTestId(null);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t("performanceTests") || "Performance Tests"}</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addTest") || "Add Test"}
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t("noPerformanceTests") || "No performance tests configured yet."}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createFirstTest") || "Create your first test"}
            </Button>
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{test.name}</h3>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                      {test.url}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatInterval(test.schedule_interval)}
                      </span>
                      <span>
                        {BROWSER_OPTIONS.find((b) => b.value === test.browser)?.label || test.browser}
                      </span>
                      <span>
                        {CONNECTIVITY_OPTIONS.find((c) => c.value === test.connectivity)?.label || test.connectivity}
                      </span>
                      {test.last_run && (
                        <span>
                          {t("lastRun") || "Last run"}: {format(new Date(test.last_run), "MMM d, HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningTestId === test.id || test.status === "running"}
                      onClick={() => runTestMutation.mutate(test.id)}
                    >
                      {runningTestId === test.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          {t("running") || "Running"}...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          {t("runNow") || "Run Now"}
                        </>
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                        <DropdownMenuItem asChild>
                          <a href={test.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t("openUrl") || "Open URL"}
                          </a>
                        </DropdownMenuItem>
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
