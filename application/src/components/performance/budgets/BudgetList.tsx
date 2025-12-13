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
import { CreateBudgetDialog } from "./CreateBudgetDialog";
import { Plus, MoreVertical, Trash2, Edit, AlertTriangle } from "lucide-react";
import { PerformanceBudget, formatMs, formatBytes } from "@/types/performance.types";
import { toast } from "sonner";

export function BudgetList() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<PerformanceBudget | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["performance-budgets"],
    queryFn: () => performanceService.getBudgets(),
  });

  const deleteMutation = useMutation({
    mutationFn: performanceService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-budgets"] });
      toast.success(t("budgetDeleted") || "Budget deleted successfully");
    },
    onError: () => {
      toast.error(t("deleteError") || "Failed to delete budget");
    },
  });

  const formatLimit = (key: string, value: number | undefined): string => {
    if (value === undefined || value === null || value === 0) return "-";
    if (key === "cls_limit") return value.toString();
    if (key === "transfer_size_limit") return formatBytes(value);
    if (key === "requests_limit") return value.toString();
    return formatMs(value);
  };

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
        <div>
          <h2 className="text-lg font-semibold">{t("performanceBudgets") || "Performance Budgets"}</h2>
          <p className="text-sm text-muted-foreground">
            {t("budgetsDescription") || "Set performance thresholds to monitor your websites."}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("createBudget") || "Create Budget"}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {t("noBudgetsYet") || "No performance budgets created yet."}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createFirstBudget") || "Create your first budget"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget) => (
            <Card
              key={budget.id}
              className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{budget.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingBudget(budget)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t("edit") || "Edit"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(t("confirmDelete") || "Are you sure you want to delete this budget?")) {
                            deleteMutation.mutate(budget.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("delete") || "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">LCP</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("lcp_limit", budget.lcp_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">FCP</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("fcp_limit", budget.fcp_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CLS</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("cls_limit", budget.cls_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TBT</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("tbt_limit", budget.tbt_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TTFB</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("ttfb_limit", budget.ttfb_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("speedIndex") || "Speed Index"}</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("speed_index_limit", budget.speed_index_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("requests") || "Requests"}</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("requests_limit", budget.requests_limit)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("transferSize") || "Transfer Size"}</p>
                    <Badge variant="outline" className="mt-1">
                      {formatLimit("transfer_size_limit", budget.transfer_size_limit)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateBudgetDialog
        open={createDialogOpen || !!editingBudget}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingBudget(null);
        }}
        editingBudget={editingBudget}
      />
    </div>
  );
}
