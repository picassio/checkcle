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
import { PerformanceMetrics } from "@/types/performance.types";
import { Network } from "lucide-react";

interface RequestsBreakdownChartProps {
  data: PerformanceMetrics;
}

const REQUEST_COLORS = {
  html: "#ef4444",    // red
  css: "#3b82f6",     // blue
  js: "#f59e0b",      // yellow
  image: "#22c55e",   // green
  font: "#8b5cf6",    // purple
  other: "#6b7280",   // gray
  thirdParty: "#ec4899", // pink
};

export function RequestsBreakdownChart({ data }: RequestsBreakdownChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const chartData = [
    { name: "HTML", value: data.requests_html || 0, color: REQUEST_COLORS.html },
    { name: "CSS", value: data.requests_css || 0, color: REQUEST_COLORS.css },
    { name: "JS", value: data.requests_js || 0, color: REQUEST_COLORS.js },
    { name: "Images", value: data.requests_image || 0, color: REQUEST_COLORS.image },
    { name: "Fonts", value: data.requests_font || 0, color: REQUEST_COLORS.font },
    { name: "Other", value: data.requests_other || 0, color: REQUEST_COLORS.other },
  ].filter(item => item.value > 0);

  const thirdPartyCount = data.third_party_requests || 0;
  const totalRequests = data.requests || chartData.reduce((sum, item) => sum + item.value, 0);

  const gridColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = totalRequests > 0 ? ((item.value / totalRequests) * 100).toFixed(1) : "0";
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
            {item.value} requests ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            {t("requestsBreakdown") || "Requests Breakdown"}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noRequestData") || "No request breakdown available"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-purple-500" />
          {t("requestsBreakdown") || "Requests Breakdown"}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {t("total") || "Total"}: {totalRequests}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColor }}
              tickLine={{ stroke: gridColor }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Third Party Info */}
        {thirdPartyCount > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: REQUEST_COLORS.thirdParty }}
              />
              <span className="text-sm font-medium">
                {t("thirdPartyRequests") || "Third Party Requests"}
              </span>
            </div>
            <span className="text-sm font-bold">
              {thirdPartyCount} ({totalRequests > 0 ? ((thirdPartyCount / totalRequests) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
