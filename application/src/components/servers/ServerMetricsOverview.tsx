
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "@/types/server.types";
import { Cpu, HardDrive, MemoryStick, Clock, Activity, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ServerMetricsOverviewProps {
  server: Server;
}

export const ServerMetricsOverview = ({ server }: ServerMetricsOverviewProps) => {
  const { theme } = useTheme();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const cpuUsagePercent = server.cpu_usage || 0;
  const ramUsagePercent = server.ram_total > 0 ? (server.ram_used / server.ram_total) * 100 : 0;
  const diskUsagePercent = server.disk_total > 0 ? (server.disk_used / server.disk_total) * 100 : 0;

  const MetricCard = ({ title, used, total, free, percentage, icon: Icon, color, gradient, additionalInfo }: {
    title: string;
    used: string;
    total: string;
    free: string;
    percentage: number;
    icon: any;
    color: string;
    gradient: string;
    additionalInfo?: string;
  }) => (
    <Card 
      className="border-none rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 relative"
      style={{ background: gradient }}
    >
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div 
          className="w-full h-full" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
      </div>
      
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm transition-all duration-300 group-hover:scale-110">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-white">{title}</span>
          </div>
          <div className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white border border-white/30">
            {percentage.toFixed(1)}%
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-white/70">Used:</span>
              <span className="font-mono font-semibold text-white">{used}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Free:</span>
              <span className="font-mono font-semibold text-white">{free}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-white/70">Total:</span>
              <span className="font-mono font-semibold text-white">{total}</span>
            </div>
            {additionalInfo && (
              <div className="flex justify-between">
                <span className="text-white/70">Cores:</span>
                <span className="font-mono font-semibold text-white">{additionalInfo}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden shadow-inner backdrop-blur-sm">
          <div 
            className="h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden bg-white/80"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
      {/* Status Card */}
      <Card 
        className="border-none rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 relative"
        style={{
          background: theme === 'dark' 
            ? "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)" 
            : "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, #3b82f6 100%)"
        }}
      >
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div 
            className="w-full h-full" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />
        </div>
        
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm transition-all duration-300 group-hover:scale-110">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-white">Status</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className={`text-lg font-bold capitalize flex items-center gap-3 text-white`}>
            <div className={`w-3 h-3 rounded-full ${server.status === 'up' ? 'bg-green-400' : server.status === 'down' ? 'bg-red-400' : 'bg-yellow-400'} animate-pulse shadow-sm`} />
            {server.status}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-white/70">Agent:</span>
              <span className="font-semibold text-white">{server.agent_status}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/70">Connection:</span>
              <span className="font-semibold text-white">{server.connection}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime Card */}
      <Card 
        className="border-none rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 relative"
        style={{
          background: theme === 'dark' 
            ? "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, rgba(34, 197, 94, 0.6) 100%)" 
            : "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, #22c55e 100%)"
        }}
      >
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div 
            className="w-full h-full" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />
        </div>
        
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm transition-all duration-300 group-hover:scale-110">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-white">Uptime</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="text-lg font-bold text-white">
            {server.uptime}
          </div>
          <div className="text-xs text-white/70 space-y-1">
            <div>Last Check:</div>
            <div className="font-mono text-[10px] text-white/90 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
              {new Date(server.last_checked).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPU Metric */}
      <MetricCard
        title="CPU"
        used={`${cpuUsagePercent.toFixed(1)}%`}
        total={`${server.cpu_cores} cores`}
        free={`${(100 - cpuUsagePercent).toFixed(1)}%`}
        percentage={cpuUsagePercent}
        icon={Cpu}
        color={theme === 'dark' ? "#3b82f6" : "#2563eb"}
        gradient={theme === 'dark' 
          ? "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)" 
          : "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, #3b82f6 100%)"
        }
        additionalInfo={server.cpu_cores?.toString()}
      />

      {/* Memory Metric */}
      <MetricCard
        title="Memory"
        used={formatBytes(server.ram_used)}
        total={formatBytes(server.ram_total)}
        free={formatBytes(server.ram_total - server.ram_used)}
        percentage={ramUsagePercent}
        icon={MemoryStick}
        color={theme === 'dark' ? "#10b981" : "#059669"}
        gradient={theme === 'dark' 
          ? "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, rgba(16, 185, 129, 0.6) 100%)" 
          : "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, #10b981 100%)"
        }
      />

      {/* Disk Metric */}
      <MetricCard
        title="Disk"
        used={formatBytes(server.disk_used)}
        total={formatBytes(server.disk_total)}
        free={formatBytes(server.disk_total - server.disk_used)}
        percentage={diskUsagePercent}
        icon={HardDrive}
        color={theme === 'dark' ? "#f59e0b" : "#d97706"}
        gradient={theme === 'dark' 
          ? "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, rgba(245, 158, 11, 0.6) 100%)" 
          : "linear-gradient(135deg, rgba(65, 59, 55, 0.8) 0%, #f59e0b 100%)"
        }
      />
    </div>
  );
};