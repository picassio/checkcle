import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PerformanceMetrics, formatMs } from "@/types/performance.types";
import { format } from "date-fns";
import { Timer } from "lucide-react";

interface VisualMetricsChartProps {
  data: PerformanceMetrics[];
}

export function VisualMetricsChart({ data }: VisualMetricsChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      backendTime: m.backend_time || 0,
      frontendTime: m.frontend_time || 0,
      fullyLoaded: m.fully_loaded || 0,
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-cyan-500" />
          {t("backendFrontendTrend") || "Backend vs Frontend Time"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="backendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="frontendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => formatMs(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  backendTime: t("backendTime") || "Backend Time",
                  frontendTime: t("frontendTime") || "Frontend Time",
                  fullyLoaded: t("fullyLoaded") || "Fully Loaded",
                };
                return [formatMs(value), labels[name] || name];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  backendTime: t("backendTime") || "Backend",
                  frontendTime: t("frontendTime") || "Frontend",
                  fullyLoaded: t("fullyLoaded") || "Fully Loaded",
                };
                return labels[value] || value;
              }}
            />
            <Area
              type="monotone"
              dataKey="backendTime"
              stroke="#f59e0b"
              fill="url(#backendGradient)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="frontendTime"
              stroke="#3b82f6"
              fill="url(#frontendGradient)"
              strokeWidth={2}
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
