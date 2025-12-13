import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { PerformanceMetrics, formatMs } from "@/types/performance.types";
import { Timer } from "lucide-react";

interface NavigationTimingChartProps {
  data: PerformanceMetrics;
}

const TIMING_COLORS = {
  dns: "#3b82f6",      // blue
  connect: "#22c55e",  // green
  ssl: "#8b5cf6",      // purple
  ttfb: "#f59e0b",     // yellow
  backend: "#ef4444",  // red
  frontend: "#06b6d4", // cyan
};

export function NavigationTimingChart({ data }: NavigationTimingChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = [
    { name: "DNS", value: data.dns_time || 0, color: TIMING_COLORS.dns },
    { name: "Connect", value: data.connect_time || 0, color: TIMING_COLORS.connect },
    { name: "SSL", value: data.ssl_time || 0, color: TIMING_COLORS.ssl },
    { name: "TTFB", value: data.ttfb || 0, color: TIMING_COLORS.ttfb },
    { name: "Backend", value: data.backend_time || 0, color: TIMING_COLORS.backend },
    { name: "Frontend", value: data.frontend_time || 0, color: TIMING_COLORS.frontend },
  ];

  const totalTime = data.fully_loaded || chartData.reduce((sum, item) => sum + item.value, 0);
  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = totalTime > 0 ? ((item.value / totalTime) * 100).toFixed(1) : "0";
      return (
        <div
          className={`px-3 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatMs(item.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-green-500" />
          {t("navigationTimings") || "Navigation Timings"}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {t("fullyLoaded") || "Fully Loaded"}: {formatMs(totalTime)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => formatMs(value)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Timing Legend */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium">{formatMs(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
