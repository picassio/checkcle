import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  PerformanceTest,
  BROWSER_OPTIONS,
  CONNECTIVITY_OPTIONS,
  SCHEDULE_INTERVALS,
} from "@/types/performance.types";
import { toast } from "sonner";

interface CreatePerformanceTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTest?: PerformanceTest | null;
}

export function CreatePerformanceTestDialog({
  open,
  onOpenChange,
  editingTest,
}: CreatePerformanceTestDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    browser: "chrome",
    connectivity: "native",
    schedule_interval: 86400, // 1 day default
    runs: 3,
    budget_id: "",
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["performance-budgets"],
    queryFn: () => performanceService.getBudgets(),
  });

  useEffect(() => {
    if (editingTest) {
      setFormData({
        name: editingTest.name,
        url: editingTest.url,
        browser: editingTest.browser,
        connectivity: editingTest.connectivity,
        schedule_interval: editingTest.schedule_interval,
        runs: editingTest.runs,
        budget_id: editingTest.budget_id || "",
      });
    } else {
      setFormData({
        name: "",
        url: "",
        browser: "chrome",
        connectivity: "native",
        schedule_interval: 86400,
        runs: 3,
        budget_id: "",
      });
    }
  }, [editingTest, open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<PerformanceTest>) =>
      editingTest
        ? performanceService.updateTest(editingTest.id, data)
        : performanceService.createTest({ ...data, status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tests"] });
      toast.success(
        editingTest
          ? t("testUpdated") || "Test updated successfully"
          : t("testCreated") || "Test created successfully"
      );
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("saveFailed") || "Failed to save test");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t("nameRequired") || "Name is required");
      return;
    }

    if (!formData.url.trim()) {
      toast.error(t("urlRequired") || "URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(formData.url);
    } catch {
      toast.error(t("invalidUrl") || "Please enter a valid URL");
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTest
              ? t("editPerformanceTest") || "Edit Performance Test"
              : t("createPerformanceTest") || "Create Performance Test"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name") || "Name"}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("testNamePlaceholder") || "My Website Performance Test"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">{t("url") || "URL"}</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("browser") || "Browser"}</Label>
              <Select
                value={formData.browser}
                onValueChange={(value) => setFormData({ ...formData, browser: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BROWSER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("connectivity") || "Network"}</Label>
              <Select
                value={formData.connectivity}
                onValueChange={(value) => setFormData({ ...formData, connectivity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTIVITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("schedule") || "Schedule"}</Label>
              <Select
                value={String(formData.schedule_interval)}
                onValueChange={(value) =>
                  setFormData({ ...formData, schedule_interval: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_INTERVALS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("iterations") || "Iterations"}</Label>
              <Select
                value={String(formData.runs)}
                onValueChange={(value) => setFormData({ ...formData, runs: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num} {num === 1 ? t("run") || "run" : t("runs") || "runs"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("budget") || "Performance Budget"} ({t("optional") || "Optional"})</Label>
            <Select
              value={formData.budget_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, budget_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectBudget") || "Select a budget"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noBudget") || "No budget"}</SelectItem>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTest ? t("update") || "Update" : t("create") || "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
