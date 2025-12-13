import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PerformanceMetrics, formatBytes } from "@/types/performance.types";
import { format } from "date-fns";
import { Network } from "lucide-react";

interface RequestsChartProps {
  data: PerformanceMetrics[];
}

export function RequestsChart({ data }: RequestsChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      requests: m.requests,
      transferSize: m.transfer_size / 1024, // Convert to KB for better display
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-emerald-500" />
          {t("requestsAndTransfer") || "Requests & Transfer Size"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
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
              label={{
                value: t("requests") || "Requests",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: textColor }
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => `${value.toFixed(0)} KB`}
              label={{
                value: t("transferSize") || "Transfer Size",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 10, fill: textColor }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "transferSize") {
                  return [formatBytes(value * 1024), t("transferSize") || "Transfer Size"];
                }
                return [value, t("requests") || "Requests"];
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="requests"
              fill="#10b981"
              name={t("requests") || "Requests"}
              opacity={0.8}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="transferSize"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name={t("transferSize") || "Transfer Size"}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
