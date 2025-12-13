import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PerformanceMetrics } from "@/types/performance.types";
import { format } from "date-fns";
import { Activity } from "lucide-react";

interface WebVitalsChartProps {
  data: PerformanceMetrics[];
}

export function WebVitalsChart({ data }: WebVitalsChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      LCP: m.lcp,
      FCP: m.fcp,
      TBT: m.tbt,
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          {t("webVitalsTrend") || "Web Vitals Trend"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => (value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`,
                name,
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="LCP"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="LCP"
            />
            <Line
              type="monotone"
              dataKey="FCP"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="FCP"
            />
            <Line
              type="monotone"
              dataKey="TBT"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="TBT"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
