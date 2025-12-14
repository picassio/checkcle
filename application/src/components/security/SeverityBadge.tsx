import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: string;
  className?: string;
  showIcon?: boolean;
}

const severityConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  critical: {
    color: 'text-white',
    bgColor: 'bg-red-600 hover:bg-red-700',
    icon: '🔴',
  },
  high: {
    color: 'text-white',
    bgColor: 'bg-orange-500 hover:bg-orange-600',
    icon: '🟠',
  },
  medium: {
    color: 'text-black',
    bgColor: 'bg-yellow-400 hover:bg-yellow-500',
    icon: '🟡',
  },
  low: {
    color: 'text-white',
    bgColor: 'bg-blue-500 hover:bg-blue-600',
    icon: '🔵',
  },
  info: {
    color: 'text-white',
    bgColor: 'bg-gray-500 hover:bg-gray-600',
    icon: '⚪',
  },
  unknown: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-300 hover:bg-gray-400',
    icon: '❓',
  },
};

export function SeverityBadge({ severity, className, showIcon = false }: SeverityBadgeProps) {
  const normalizedSeverity = severity?.toLowerCase() || 'unknown';
  const config = severityConfig[normalizedSeverity] || severityConfig.unknown;

  return (
    <Badge
      className={cn(config.bgColor, config.color, 'font-medium', className)}
      variant="default"
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {severity?.charAt(0).toUpperCase() + severity?.slice(1).toLowerCase()}
    </Badge>
  );
}

export default SeverityBadge;
