import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { PerformanceMetrics, formatMs } from "@/types/performance.types";
import { format } from "date-fns";
import { Cpu } from "lucide-react";

interface CPUMetricsChartProps {
  data: PerformanceMetrics[];
}

export function CPUMetricsChart({ data }: CPUMetricsChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      longTasks: m.cpu_long_tasks || 0,
      longTasksTime: m.cpu_long_tasks_time || 0,
      maxLongTask: m.max_long_task_time || 0,
      tbt: m.tbt || 0,
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  // Check if we have any CPU data
  const hasCPUData = chartData.some(
    (d) => d.longTasks > 0 || d.longTasksTime > 0 || d.maxLongTask > 0
  );

  if (!hasCPUData) {
    return (
      <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-orange-500" />
            {t("cpuMetrics") || "CPU Metrics"}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {t("noCPUData") || "CPU metrics not available. Enable with --cpu flag in sitespeed.io."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-orange-500" />
          {t("cpuMetrics") || "CPU Long Tasks"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => formatMs(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "longTasks") {
                  return [value, t("longTasksCount") || "Long Tasks Count"];
                }
                return [formatMs(value), name];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  longTasksTime: t("longTasksTime") || "Long Tasks Time",
                  maxLongTask: t("maxLongTask") || "Max Long Task",
                  tbt: "TBT",
                  longTasks: t("longTasksCount") || "Long Tasks Count",
                };
                return labels[value] || value;
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="longTasksTime"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              name="longTasksTime"
            />
            <Bar
              yAxisId="left"
              dataKey="tbt"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              name="tbt"
            />
            <ReferenceLine
              yAxisId="left"
              y={200}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: t("goodTBT"), fill: "#22c55e", fontSize: 10 }}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-orange-500/10">
            <p className="text-xs text-muted-foreground">{t("avgLongTasks") || "Avg Long Tasks"}</p>
            <p className="text-lg font-bold text-orange-500">
              {(chartData.reduce((sum, d) => sum + d.longTasks, 0) / chartData.length).toFixed(1)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10">
            <p className="text-xs text-muted-foreground">{t("avgLongTaskTime") || "Avg Long Task Time"}</p>
            <p className="text-lg font-bold text-yellow-500">
              {formatMs(chartData.reduce((sum, d) => sum + d.longTasksTime, 0) / chartData.length)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <p className="text-xs text-muted-foreground">{t("avgTBT") || "Avg TBT"}</p>
            <p className="text-lg font-bold text-red-500">
              {formatMs(chartData.reduce((sum, d) => sum + d.tbt, 0) / chartData.length)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
