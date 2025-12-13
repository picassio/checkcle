import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PerformanceBudget, WEB_VITALS_THRESHOLDS } from "@/types/performance.types";
import { toast } from "sonner";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: PerformanceBudget | null;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  editingBudget,
}: CreateBudgetDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    lcp_limit: 2500,
    fcp_limit: 1800,
    cls_limit: 0.1,
    tbt_limit: 200,
    ttfb_limit: 800,
    speed_index_limit: 3400,
    requests_limit: 0,
    transfer_size_limit: 0,
  });

  useEffect(() => {
    if (editingBudget) {
      setFormData({
        name: editingBudget.name,
        lcp_limit: editingBudget.lcp_limit || 0,
        fcp_limit: editingBudget.fcp_limit || 0,
        cls_limit: editingBudget.cls_limit || 0,
        tbt_limit: editingBudget.tbt_limit || 0,
        ttfb_limit: editingBudget.ttfb_limit || 0,
        speed_index_limit: editingBudget.speed_index_limit || 0,
        requests_limit: editingBudget.requests_limit || 0,
        transfer_size_limit: editingBudget.transfer_size_limit || 0,
      });
    } else {
      // Reset to Google's "good" thresholds
      setFormData({
        name: "",
        lcp_limit: WEB_VITALS_THRESHOLDS.lcp.good,
        fcp_limit: WEB_VITALS_THRESHOLDS.fcp.good,
        cls_limit: WEB_VITALS_THRESHOLDS.cls.good,
        tbt_limit: WEB_VITALS_THRESHOLDS.tbt.good,
        ttfb_limit: WEB_VITALS_THRESHOLDS.ttfb.good,
        speed_index_limit: WEB_VITALS_THRESHOLDS.speedIndex.good,
        requests_limit: 0,
        transfer_size_limit: 0,
      });
    }
  }, [editingBudget, open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<PerformanceBudget>) =>
      editingBudget
        ? performanceService.updateBudget(editingBudget.id, data)
        : performanceService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-budgets"] });
      toast.success(
        editingBudget
          ? t("budgetUpdated") || "Budget updated successfully"
          : t("budgetCreated") || "Budget created successfully"
      );
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("saveFailed") || "Failed to save budget");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t("nameRequired") || "Name is required");
      return;
    }

    createMutation.mutate(formData);
  };

  const applyPreset = (preset: "strict" | "moderate" | "relaxed") => {
    const presets = {
      strict: {
        lcp_limit: 2000,
        fcp_limit: 1500,
        cls_limit: 0.05,
        tbt_limit: 150,
        ttfb_limit: 600,
        speed_index_limit: 2500,
      },
      moderate: {
        lcp_limit: WEB_VITALS_THRESHOLDS.lcp.good,
        fcp_limit: WEB_VITALS_THRESHOLDS.fcp.good,
        cls_limit: WEB_VITALS_THRESHOLDS.cls.good,
        tbt_limit: WEB_VITALS_THRESHOLDS.tbt.good,
        ttfb_limit: WEB_VITALS_THRESHOLDS.ttfb.good,
        speed_index_limit: WEB_VITALS_THRESHOLDS.speedIndex.good,
      },
      relaxed: {
        lcp_limit: 3500,
        fcp_limit: 2500,
        cls_limit: 0.2,
        tbt_limit: 400,
        ttfb_limit: 1200,
        speed_index_limit: 5000,
      },
    };

    setFormData((prev) => ({ ...prev, ...presets[preset] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingBudget
              ? t("editBudget") || "Edit Budget"
              : t("createBudget") || "Create Budget"}
          </DialogTitle>
          <DialogDescription>
            {t("budgetDialogDescription") || "Set performance thresholds based on Core Web Vitals."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name") || "Name"}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("budgetNamePlaceholder") || "e.g., Production Standards"}
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("strict")}>
              {t("strict") || "Strict"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("moderate")}>
              {t("moderate") || "Moderate"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("relaxed")}>
              {t("relaxed") || "Relaxed"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lcp">LCP ({t("ms")})</Label>
              <Input
                id="lcp"
                type="number"
                value={formData.lcp_limit}
                onChange={(e) => setFormData({ ...formData, lcp_limit: parseInt(e.target.value) || 0 })}
                placeholder="2500"
              />
              <p className="text-xs text-muted-foreground">{t("lcpHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fcp">FCP ({t("ms")})</Label>
              <Input
                id="fcp"
                type="number"
                value={formData.fcp_limit}
                onChange={(e) => setFormData({ ...formData, fcp_limit: parseInt(e.target.value) || 0 })}
                placeholder="1800"
              />
              <p className="text-xs text-muted-foreground">{t("fcpHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cls">CLS</Label>
              <Input
                id="cls"
                type="number"
                step="0.01"
                value={formData.cls_limit}
                onChange={(e) => setFormData({ ...formData, cls_limit: parseFloat(e.target.value) || 0 })}
                placeholder="0.1"
              />
              <p className="text-xs text-muted-foreground">{t("clsHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tbt">TBT ({t("ms")})</Label>
              <Input
                id="tbt"
                type="number"
                value={formData.tbt_limit}
                onChange={(e) => setFormData({ ...formData, tbt_limit: parseInt(e.target.value) || 0 })}
                placeholder="200"
              />
              <p className="text-xs text-muted-foreground">{t("tbtHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ttfb">TTFB ({t("ms")})</Label>
              <Input
                id="ttfb"
                type="number"
                value={formData.ttfb_limit}
                onChange={(e) => setFormData({ ...formData, ttfb_limit: parseInt(e.target.value) || 0 })}
                placeholder="800"
              />
              <p className="text-xs text-muted-foreground">{t("ttfbHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speedIndex">{t("speedIndex")} ({t("ms")})</Label>
              <Input
                id="speedIndex"
                type="number"
                value={formData.speed_index_limit}
                onChange={(e) => setFormData({ ...formData, speed_index_limit: parseInt(e.target.value) || 0 })}
                placeholder="3400"
              />
              <p className="text-xs text-muted-foreground">{t("speedIndexHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requests">{t("requests") || "Max Requests"}</Label>
              <Input
                id="requests"
                type="number"
                value={formData.requests_limit || ""}
                onChange={(e) => setFormData({ ...formData, requests_limit: parseInt(e.target.value) || 0 })}
                placeholder={t("optional") || "Optional"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferSize">{t("transferSize") || "Transfer Size"} (KB)</Label>
              <Input
                id="transferSize"
                type="number"
                value={formData.transfer_size_limit ? formData.transfer_size_limit / 1024 : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    transfer_size_limit: (parseInt(e.target.value) || 0) * 1024,
                  })
                }
                placeholder={t("optional") || "Optional"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBudget ? t("update") || "Update" : t("create") || "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
