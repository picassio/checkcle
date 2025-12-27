
import { Globe, Boxes, Layers, Calendar, BarChart2, LineChart, MapPin, Settings, User, Bell, Database, Info, BookOpen, Gauge, Shield, Palette, Key } from "lucide-react";

export interface MenuItemData {
  id: string;
  path?: string;
  icon: any;
  translationKey: string;
  color?: string;
  hasNavigation?: boolean;
  // Permission requirement: [resource, action]
  requiredPermission?: [string, string];
}

export const mainMenuItems: MenuItemData[] = [
  {
    id: 'uptime-monitoring',
    path: '/dashboard',
    icon: Globe,
    translationKey: 'uptimeMonitoring',
    color: 'text-purple-400',
    hasNavigation: true,
    // Dashboard is accessible to all authenticated users
    requiredPermission: undefined
  },
  {
    id: 'instance-monitoring',
    path: '/instance-monitoring',
    icon: Boxes,
    translationKey: 'instanceMonitoring',
    color: 'text-blue-400',
    hasNavigation: true,
    requiredPermission: ['services', 'view']
  },
  {
    id: 'ssl-domain',
    path: '/ssl-domain',
    icon: Layers,
    translationKey: 'sslDomain',
    color: 'text-cyan-400',
    hasNavigation: true,
    requiredPermission: ['ssl_certificates', 'view']
  },
  {
    id: 'schedule-incident',
    path: '/schedule-incident',
    icon: Calendar,
    translationKey: 'scheduleIncident',
    color: 'text-emerald-400',
    hasNavigation: true,
    requiredPermission: ['incidents', 'view']
  },
  {
    id: 'operational-page',
    path: '/operational-page',
    icon: BarChart2,
    translationKey: 'operationalPage',
    color: 'text-amber-400',
    hasNavigation: true,
    requiredPermission: ['operational_pages', 'view']
  },
  {
    id: 'regional-monitoring',
    path: '/regional-monitoring',
    icon: MapPin,
    translationKey: 'regionalMonitoring',
    color: 'text-indigo-400',
    hasNavigation: true,
    requiredPermission: ['services', 'view']
  },
  {
    id: 'performance-monitoring',
    path: '/performance',
    icon: Gauge,
    translationKey: 'performanceMonitoring',
    color: 'text-orange-400',
    hasNavigation: true,
    requiredPermission: ['performance_tests', 'view']
  },
  {
    id: 'security-scanning',
    path: '/security',
    icon: Shield,
    translationKey: 'securityScanning',
    color: 'text-red-400',
    hasNavigation: true,
    requiredPermission: ['security_scans', 'view']
  },
  {
    id: 'reports',
    path: '/reports',
    icon: LineChart,
    translationKey: 'reports',
    color: 'text-rose-400',
    hasNavigation: true,
    requiredPermission: ['reports', 'view']
  }
];

export const settingsMenuItems: MenuItemData[] = [
  {
    id: 'general',
    icon: Settings,
    translationKey: 'generalSettings',
    requiredPermission: ['settings', 'view']
  },
  {
    id: 'branding',
    icon: Palette,
    translationKey: 'brandingSettings',
    requiredPermission: ['settings', 'view']
  },
  {
    id: 'users',
    icon: User,
    translationKey: 'userManagement',
    requiredPermission: ['users', 'view']
  },
  {
    id: 'roles',
    icon: Key,
    translationKey: 'roleManagement',
    requiredPermission: ['roles', 'view']
  },
  {
    id: 'notifications',
    icon: Bell,
    translationKey: 'notificationSettings',
    requiredPermission: ['settings', 'view']
  },
  {
    id: 'templates',
    icon: BookOpen,
    translationKey: 'alertsTemplates',
    requiredPermission: ['alerts', 'view']
  },
  {
    id: 'data-retention',
    icon: Database,
    translationKey: 'dataRetention',
    requiredPermission: ['settings', 'view']
  },
  {
    id: 'about',
    icon: Info,
    translationKey: 'aboutSystem',
    // About is accessible to all authenticated users
    requiredPermission: undefined
  }
];
