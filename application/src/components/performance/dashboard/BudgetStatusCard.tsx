import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { BudgetResults } from "@/types/performance.types";

interface BudgetStatusCardProps {
  budgetResults?: BudgetResults;
  testName: string;
}

export function BudgetStatusCard({ budgetResults, testName }: BudgetStatusCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!budgetResults) {
    return (
      <Card className={theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            {t('budgetStatus') || 'Budget Status'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('noBudgetConfigured') || 'No budget configured for this test.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const results = Object.entries(budgetResults).filter(([_, result]) => result !== undefined);
  const passedCount = results.filter(([_, result]) => result?.passed).length;
  const failedCount = results.length - passedCount;
  const allPassed = failedCount === 0;

  const formatMetricName = (key: string): string => {
    const names: Record<string, string> = {
      lcp: 'LCP',
      fcp: 'FCP',
      cls: 'CLS',
      tbt: 'TBT',
      ttfb: 'TTFB',
      speed_index: 'Speed Index',
      requests: 'Requests',
      transfer_size: 'Transfer Size',
    };
    return names[key] || key;
  };

  const formatValue = (key: string, value: number): string => {
    if (key === 'cls') return value.toFixed(3);
    if (key === 'transfer_size') {
      if (value < 1024) return `${value}B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
      return `${(value / (1024 * 1024)).toFixed(2)}MB`;
    }
    if (['lcp', 'fcp', 'tbt', 'ttfb', 'speed_index'].includes(key)) {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    return String(value);
  };

  return (
    <Card className={theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {allPassed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            {t('budgetStatus') || 'Budget Status'}
          </span>
          <Badge variant={allPassed ? 'default' : 'destructive'}>
            {passedCount}/{results.length} {t('passed') || 'Passed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map(([key, result]) => (
            <div
              key={key}
              className={`flex items-center justify-between p-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {result?.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">{formatMetricName(key)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={result?.passed ? 'text-green-500' : 'text-red-500'}>
                  {result ? formatValue(key, result.value) : 'N/A'}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {result ? formatValue(key, result.limit) : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
