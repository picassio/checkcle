import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { PerformanceMetrics, formatBytes } from "@/types/performance.types";
import { HardDrive } from "lucide-react";

interface PageSizeChartProps {
  data: PerformanceMetrics;
}

const COLORS = {
  html: "#ef4444",    // red
  css: "#3b82f6",     // blue
  js: "#f59e0b",      // yellow
  image: "#22c55e",   // green
  font: "#8b5cf6",    // purple
  other: "#6b7280",   // gray
};

export function PageSizeChart({ data }: PageSizeChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = [
    { name: "HTML", value: data.html_size || 0, color: COLORS.html },
    { name: "CSS", value: data.css_size || 0, color: COLORS.css },
    { name: "JavaScript", value: data.js_size || 0, color: COLORS.js },
    { name: "Images", value: data.image_size || 0, color: COLORS.image },
    { name: "Fonts", value: data.font_size || 0, color: COLORS.font },
    { name: "Other", value: data.other_size || 0, color: COLORS.other },
  ].filter(item => item.value > 0);

  const totalSize = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / totalSize) * 100).toFixed(1);
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
            {formatBytes(item.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0 || totalSize === 0) {
    return (
      <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-500" />
            {t("pageSizeBreakdown") || "Page Size Breakdown"}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noSizeData") || "No size data available"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-500" />
          {t("pageSizeBreakdown") || "Page Size Breakdown"}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {t("total") || "Total"}: {formatBytes(totalSize)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
