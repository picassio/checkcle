import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gauge, Clock, Layout, Timer } from "lucide-react";
import { getWebVitalStatus, WEB_VITALS_THRESHOLDS, formatMs } from "@/types/performance.types";

interface CoreWebVitalsCardProps {
  lcp: number;  // ms
  fcp: number;  // ms
  cls: number;  // unitless
  tbt: number;  // ms
}

export function CoreWebVitalsCard({ lcp, fcp, cls, tbt }: CoreWebVitalsCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const getProgressValue = (value: number, good: number, poor: number): number => {
    // Map value to 0-100 range where 0 = poor threshold and 100 = 0
    if (value <= 0) return 100;
    if (value >= poor) return 0;
    return ((poor - value) / poor) * 100;
  };

  const getProgressColor = (status: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (status) {
      case 'good':
        return 'bg-green-500';
      case 'needs-improvement':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
    }
  };

  const vitals = [
    {
      name: 'LCP',
      fullName: t('largestContentfulPaint') || 'Largest Contentful Paint',
      value: lcp,
      displayValue: formatMs(lcp),
      unit: '',
      icon: Gauge,
      status: getWebVitalStatus('lcp', lcp),
      thresholds: WEB_VITALS_THRESHOLDS.lcp,
      description: t('lcpDescription') || 'Measures loading performance. Good LCP is under 2.5 seconds.',
    },
    {
      name: 'FCP',
      fullName: t('firstContentfulPaint') || 'First Contentful Paint',
      value: fcp,
      displayValue: formatMs(fcp),
      unit: '',
      icon: Clock,
      status: getWebVitalStatus('fcp', fcp),
      thresholds: WEB_VITALS_THRESHOLDS.fcp,
      description: t('fcpDescription') || 'Measures perceived load speed. Good FCP is under 1.8 seconds.',
    },
    {
      name: 'CLS',
      fullName: t('cumulativeLayoutShift') || 'Cumulative Layout Shift',
      value: cls,
      displayValue: cls.toFixed(3),
      unit: '',
      icon: Layout,
      status: getWebVitalStatus('cls', cls),
      thresholds: WEB_VITALS_THRESHOLDS.cls,
      description: t('clsDescription') || 'Measures visual stability. Good CLS is under 0.1.',
    },
    {
      name: 'TBT',
      fullName: t('totalBlockingTime') || 'Total Blocking Time',
      value: tbt,
      displayValue: formatMs(tbt),
      unit: '',
      icon: Timer,
      status: getWebVitalStatus('tbt', tbt),
      thresholds: WEB_VITALS_THRESHOLDS.tbt,
      description: t('tbtDescription') || 'Measures interactivity. Good TBT is under 200ms.',
    },
  ];

  return (
    <Card className={theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          {t('coreWebVitals') || 'Core Web Vitals'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {vitals.map((vital) => {
            const Icon = vital.icon;
            const progressValue = getProgressValue(vital.value, vital.thresholds.good, vital.thresholds.poor);

            return (
              <div key={vital.name} className="space-y-2 md:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 md:p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <Icon className={`h-3 w-3 md:h-4 md:w-4 ${
                        vital.status === 'good' ? 'text-green-500' :
                        vital.status === 'needs-improvement' ? 'text-yellow-500' : 'text-red-500'
                      }`} />
                    </div>
                    <span className="font-medium text-sm md:text-base">{vital.name}</span>
                  </div>
                  <Badge
                    variant={vital.status === 'good' ? 'default' : vital.status === 'needs-improvement' ? 'secondary' : 'destructive'}
                    className="text-xs self-start sm:self-auto"
                  >
                    {vital.status}
                  </Badge>
                </div>

                <div>
                  <div className="text-xl md:text-3xl font-bold">{vital.displayValue}</div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} line-clamp-1`}>
                    {vital.fullName}
                  </p>
                </div>

                <div className="space-y-1">
                  <Progress
                    value={progressValue}
                    className={`h-2 ${getProgressColor(vital.status)}`}
                  />
                  <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                    <span>&lt;{vital.name === 'CLS' ? vital.thresholds.good : formatMs(vital.thresholds.good)}</span>
                    <span>&gt;{vital.name === 'CLS' ? vital.thresholds.poor : formatMs(vital.thresholds.poor)}</span>
                  </div>
                </div>

                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} hidden md:block`}>
                  {vital.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
