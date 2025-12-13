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
  ReferenceLine,
} from "recharts";
import { PerformanceMetrics, WEB_VITALS_THRESHOLDS } from "@/types/performance.types";
import { format } from "date-fns";
import { Clock } from "lucide-react";

interface TTFBChartProps {
  data: PerformanceMetrics[];
}

export function TTFBChart({ data }: TTFBChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      timestamp: format(new Date(m.timestamp), "MMM d HH:mm"),
      ttfb: m.ttfb,
    }));

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-500" />
          {t("ttfbTrend") || "Time to First Byte Trend"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="ttfbGradient" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(value) => (value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
              }}
              formatter={(value: number) => [
                value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`,
                "TTFB",
              ]}
            />
            <ReferenceLine
              y={WEB_VITALS_THRESHOLDS.ttfb.good}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: t("goodLabel"), fill: "#22c55e", fontSize: 10 }}
            />
            <ReferenceLine
              y={WEB_VITALS_THRESHOLDS.ttfb.poor}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: t("poorLabel"), fill: "#ef4444", fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="ttfb"
              stroke="#06b6d4"
              fill="url(#ttfbGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
