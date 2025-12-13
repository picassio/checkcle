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
  ReferenceLine,
} from "recharts";
import { PerformanceMetrics, WEB_VITALS_THRESHOLDS, formatMs } from "@/types/performance.types";
import { format } from "date-fns";
import { Gauge } from "lucide-react";

interface SpeedIndexChartProps {
  data: PerformanceMetrics[];
}

export function SpeedIndexChart({ data }: SpeedIndexChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      ttfb: m.ttfb || 0,
      fullyLoaded: m.fully_loaded || 0,
      backendTime: m.backend_time || 0,
      frontendTime: m.frontend_time || 0,
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-purple-500" />
          {t("pageLoadTrend") || "Page Load Trend"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="ttfbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fullyLoadedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
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
                  ttfb: "TTFB",
                  fullyLoaded: t("fullyLoaded") || "Fully Loaded",
                  backendTime: t("backendTime") || "Backend Time",
                  frontendTime: t("frontendTime") || "Frontend Time",
                };
                return [formatMs(value), labels[name] || name];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  ttfb: "TTFB",
                  fullyLoaded: t("fullyLoaded") || "Fully Loaded",
                };
                return labels[value] || value;
              }}
            />
            <ReferenceLine
              y={WEB_VITALS_THRESHOLDS.ttfb.good}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: t("goodTTFB"), fill: "#22c55e", fontSize: 10 }}
            />
            <ReferenceLine
              y={WEB_VITALS_THRESHOLDS.ttfb.poor}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: t("poorTTFB"), fill: "#ef4444", fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="ttfb"
              stroke="#8b5cf6"
              fill="url(#ttfbGradient)"
              strokeWidth={2}
              name="ttfb"
            />
            <Area
              type="monotone"
              dataKey="fullyLoaded"
              stroke="#06b6d4"
              fill="url(#fullyLoadedGradient)"
              strokeWidth={2}
              name="fullyLoaded"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
