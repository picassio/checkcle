import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PerformanceMetrics } from "@/types/performance.types";
import { Award, Zap, Accessibility, Shield } from "lucide-react";

interface CoachScoreCardProps {
  data: PerformanceMetrics;
}

function ScoreGauge({
  score,
  label,
  icon: Icon,
  size = "large"
}: {
  score: number;
  label: string;
  icon: React.ElementType;
  size?: "large" | "small";
}) {
  const { theme } = useTheme();

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: "bg-green-500", text: "text-green-500", ring: "ring-green-500" };
    if (score >= 50) return { bg: "bg-yellow-500", text: "text-yellow-500", ring: "ring-yellow-500" };
    return { bg: "bg-red-500", text: "text-red-500", ring: "ring-red-500" };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  if (size === "small") {
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
              className={colors.text}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${colors.text}`}>{Math.round(score)}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="55"
            stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="55"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 2 * Math.PI * 55} ${2 * Math.PI * 55}`}
            className={colors.text}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`h-6 w-6 mb-1 ${colors.text}`} />
          <span className={`text-2xl font-bold ${colors.text}`}>{Math.round(score)}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}

export function CoachScoreCard({ data }: CoachScoreCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const overallScore = data.coach_score || 0;
  const performanceScore = data.coach_performance || 0;
  const accessibilityScore = data.coach_accessibility || 0;
  const bestPracticeScore = data.coach_best_practice || 0;

  const hasScores = overallScore > 0 || performanceScore > 0 || accessibilityScore > 0 || bestPracticeScore > 0;

  if (!hasScores) {
    return (
      <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            {t("coachScore") || "Coach Score"}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noCoachScore") || "Coach scores not available"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === "dark" ? "bg-gray-900 border-gray-800" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          {t("coachScore") || "Coach Score"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Main Score */}
          <ScoreGauge
            score={overallScore}
            label={t("overallScore") || "Overall Score"}
            icon={Award}
            size="large"
          />

          {/* Sub-scores */}
          <div className="mt-4 md:mt-6 grid grid-cols-3 gap-2 md:gap-6 w-full">
            <ScoreGauge
              score={performanceScore}
              label={t("performance") || "Performance"}
              icon={Zap}
              size="small"
            />
            <ScoreGauge
              score={accessibilityScore}
              label={t("accessibility") || "Accessibility"}
              icon={Accessibility}
              size="small"
            />
            <ScoreGauge
              score={bestPracticeScore}
              label={t("bestPractice") || "Best Practice"}
              icon={Shield}
              size="small"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
