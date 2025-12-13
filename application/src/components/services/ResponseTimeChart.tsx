import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, BarChart, Bar } from "recharts";
import { UptimeData } from "@/types/service.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { AreaChart as AreaChartIcon, BarChart3, TrendingUp } from "lucide-react";

interface ResponseTimeChartProps {
  uptimeData: UptimeData[];
  maxDataPoints?: number; // Allow customizing max data points
}

type ChartType = 'area' | 'line' | 'bar';

export function ResponseTimeChart({ uptimeData }: ResponseTimeChartProps) {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>('area');
  
  // Fixed color palette - consistent colors that don't change
  const fixedColors = [
    { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)', name: 'Ocean Blue' },
    { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)', name: 'Emerald Green' },
    { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)', name: 'Golden Amber' },
    { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)', name: 'Ruby Red' },
    { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.2)', name: 'Royal Purple' },
    { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)', name: 'Sky Cyan' },
    { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.2)', name: 'Sunset Orange' },
    { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.2)', name: 'Fresh Lime' },
    { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.2)', name: 'Vibrant Pink' },
    { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.2)', name: 'Ocean Teal' },
  ];
  
  // Check if we have data from multiple sources
  const hasMultipleSources = useMemo(() => {
    const sources = new Set();
    uptimeData.forEach(data => {
      const source = data.source || 'default';
      sources.add(source);
    });
    return sources.size > 1;
  }, [uptimeData]);

  // Format data for the chart with enhanced time formatting
  const chartData = useMemo(() => {
    if (!uptimeData || uptimeData.length === 0) return [];
    
    if (hasMultipleSources) {
      // Group data by timestamp for multi-source display
      const timeGroups = new Map();
      
      uptimeData.forEach(data => {
        const timestamp = new Date(data.timestamp);
        // Round to nearest minute for better grouping
        const roundedTime = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                                   timestamp.getHours(), timestamp.getMinutes());
        const timeKey = roundedTime.getTime();
        const source = data.source || 'default';
        
        if (!timeGroups.has(timeKey)) {
          timeGroups.set(timeKey, {
            time: format(roundedTime, 'HH:mm'),
            rawTime: timeKey,
            date: format(roundedTime, 'MMM dd, yyyy'),
            timestamp: data.timestamp
          });
        }
        
        const group = timeGroups.get(timeKey);
        
        // Handle different data sources properly
        if (source === 'default') {
          // Only add pure default if we don't already have regional data with agent_id 1
          const hasRegionalDefault = uptimeData.some(d => 
            d.region_name === 'Default' && (d.agent_id === '1' || d.agent_id === 1)
          );
          
          if (!hasRegionalDefault) {
            group.defaultValue = data.status === "paused" ? null : data.responseTime;
            group.defaultStatus = data.status;
          }
        } else {
          // Regional monitoring data - distinguish by region and agent
          const sourceKey = `regional_${source.replace('|', '_')}`;
          
          // Group by the same timestamp more accurately
          const currentValue = group[`${sourceKey}_value`];
          const newValue = data.status === "paused" ? null : data.responseTime;
          
          if (currentValue !== undefined && newValue !== null) {
            // Average multiple values for the same time slot
            const count = group[`${sourceKey}_count`] || 1;
            group[`${sourceKey}_value`] = ((currentValue * count) + newValue) / (count + 1);
            group[`${sourceKey}_count`] = count + 1;
          } else if (newValue !== null) {
            group[`${sourceKey}_value`] = newValue;
            group[`${sourceKey}_count`] = 1;
          }
          
          group[`${sourceKey}_status`] = data.status;
          group[`${sourceKey}_label`] = data.region_name || source;
          group[`${sourceKey}_agent_id`] = data.agent_id;
        }
      });
      
      // Dynamically calculate max points based on data range
      const allPoints = Array.from(timeGroups.values()).sort((a, b) => a.rawTime - b.rawTime);

      // For longer time ranges, sample data to reduce points while maintaining coverage
      const maxPoints = 200; // Increased from 50 for better coverage
      if (allPoints.length > maxPoints) {
        // Sample evenly across the time range
        const step = Math.ceil(allPoints.length / maxPoints);
        return allPoints.filter((_, index) => index % step === 0 || index === allPoints.length - 1);
      }
      return allPoints;
    } else {
      // Single source display - use original styling
      const sortedData = [...uptimeData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const isShortTimeRange = uptimeData.length > 0 &&
        (new Date(uptimeData[0].timestamp).getTime() - new Date(uptimeData[uptimeData.length - 1].timestamp).getTime()) < 2 * 60 * 60 * 1000;
      
      return sortedData.map(data => {
        const timestamp = new Date(data.timestamp);
        
        return {
          time: isShortTimeRange 
            ? format(timestamp, 'HH:mm:ss')
            : format(timestamp, 'HH:mm'),
          rawTime: timestamp.getTime(),
          date: format(timestamp, 'MMM dd, yyyy'),
          value: data.status === "paused" ? null : data.responseTime,
          status: data.status,
          upValue: data.status === "up" ? data.responseTime : null,
          downValue: data.status === "down" ? data.responseTime : null,
          warningValue: data.status === "warning" ? data.responseTime : null,
        };
      });
    }
  }, [uptimeData, hasMultipleSources]);
  
  // Calculate Y-axis domain for better positioning
  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];
    
    let allValues: number[] = [];
    
    if (hasMultipleSources) {
      chartData.forEach(d => {
        Object.keys(d).forEach(key => {
          if (key.endsWith('_value') || key === 'defaultValue') {
            const value = d[key as keyof typeof d];
            if (value !== null && value !== undefined && typeof value === 'number') {
              allValues.push(value);
            }
          }
        });
      });
    } else {
      allValues = chartData
        .filter(d => d.value !== null && d.status !== 'paused')
        .map(d => d.value as number)
        .filter(v => typeof v === 'number');
    }
    
    if (allValues.length === 0) return [0, 100];
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = Math.max((maxValue - minValue) * 0.1, 10);
    
    return [Math.max(0, minValue - padding), maxValue + padding];
  }, [chartData, hasMultipleSources]);

  // Get unique sources for legend with consistent fixed colors
  const sources = useMemo(() => {
    if (!hasMultipleSources) return [];
    
    const sourceSet = new Set<string>();
    const sourceInfo = new Map<string, any>();
    
    uptimeData.forEach(data => {
      const source = data.source || 'default';
      if (source !== 'default') {
        sourceSet.add(source);
        sourceInfo.set(source, data);
      }
    });
    
    // Sort sources to ensure consistent ordering
    const sortedSources = Array.from(sourceSet).sort();
    
    const regionalSources = sortedSources.map((source, index) => {
      const data = sourceInfo.get(source);
      const [regionName, agentId] = source.split('|');
      
      // Create proper label with region and agent info
      let label = regionName;
      if (data?.agent_id && data.agent_id !== '1') {
        label = `${regionName} (Agent ${data.agent_id})`;
      } else if (regionName === 'Default' && data?.agent_id === '1') {
        label = `Default System Check`;
      }
      
      const colorIndex = index % fixedColors.length;
      
      return {
        key: `regional_${source.replace('|', '_')}`,
        label: label,
        stroke: fixedColors[colorIndex].stroke,
        fill: fixedColors[colorIndex].fill,
        colorName: fixedColors[colorIndex].name
      };
    });

    // Only add pure default monitoring if we have it AND no regional Default with agent_id 1
    const hasRegionalDefault = uptimeData.some(data => 
      data.region_name === 'Default' && (data.agent_id === '1' || data.agent_id === 1)
    );
    const hasPureDefault = uptimeData.some(data => data.source === 'default');
    
    const defaultSources = (hasPureDefault && !hasRegionalDefault) ? [{
      key: 'default',
      label: 'Default System',
      stroke: fixedColors[regionalSources.length % fixedColors.length].stroke,
      fill: fixedColors[regionalSources.length % fixedColors.length].fill,
      colorName: fixedColors[regionalSources.length % fixedColors.length].name
    }] : [];

    return [...defaultSources, ...regionalSources];
  }, [uptimeData, hasMultipleSources]);
  
  // Create a custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-lg min-w-64`}>
          <p className="text-sm font-semibold mb-1">{String(label)}</p>
          <p className="text-xs text-muted-foreground mb-3">{String(data.date)}</p>
          
          {hasMultipleSources ? (
            // Multi-source tooltip
            <div className="space-y-3">
              {sources.map(source => {
                const valueKey = source.key === 'default' ? 'defaultValue' : `${source.key}_value`;
                const statusKey = source.key === 'default' ? 'defaultStatus' : `${source.key}_status`;
                const value = data[valueKey];
                const status = data[statusKey];
                
                if (value === undefined && status === undefined) return null;
                
                let statusBadgeClass = "px-2 py-1 rounded-full text-xs font-medium";
                let statusText = "No Data";
                
                if (status === "up") {
                  statusBadgeClass += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                  statusText = "Up";
                } else if (status === "down") {
                  statusBadgeClass += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                  statusText = "Down";
                } else if (status === "warning") {
                  statusBadgeClass += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                  statusText = "Warning";
                } else if (status === "paused") {
                  statusBadgeClass += " bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
                  statusText = "Paused";
                } else {
                  statusBadgeClass += " bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                }
                
                return (
                  <div key={source.key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: source.stroke }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">{String(source.label)}</span>
                        <span className="text-xs text-muted-foreground">{source.colorName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={statusBadgeClass}>
                        {statusText}
                      </span>
                      <div className="text-sm font-mono">
                        {status === "paused" ? "Paused" : 
                         value !== null && value !== undefined ? `${value} ms` : "No data"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single source tooltip - showing status with color
            <>
              <div className={`flex items-center gap-3 mt-2 ${data.status === "paused" ? "opacity-70" : ""}`}>
                <div className={`w-4 h-4 rounded-full ${
                  data.status === "up" ? "bg-green-500" :
                  data.status === "down" ? "bg-red-500" :
                  data.status === "warning" ? "bg-yellow-500" : "bg-gray-500"
                }`}></div>
                <span className="font-medium">{
                  data.status === "up" ? "Up" :
                  data.status === "down" ? "Down" :
                  data.status === "warning" ? "Warning" : "Paused"
                }</span>
              </div>
              <p className="mt-2 font-mono text-lg">
                {data.status === "paused" ? "Monitoring paused" : 
                 data.value !== null ? `${data.value} ms` : "No data"}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 30 }
    };

    const commonAxisProps = {
      xAxis: {
        dataKey: "time",
        stroke: theme === 'dark' ? '#666' : '#9ca3af',
        angle: -45,
        textAnchor: "end" as const,
        tick: { fontSize: 10 },
        height: 60,
        interval: "preserveStartEnd" as const,
        minTickGap: 5
      },
      yAxis: {
        stroke: theme === 'dark' ? '#666' : '#9ca3af',
        allowDecimals: false,
        domain: yAxisDomain
      }
    };

    if (hasMultipleSources) {
      switch (chartType) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#e5e7eb'} />
              <XAxis {...commonAxisProps.xAxis} />
              <YAxis {...commonAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              
              {sources.find(s => s.key === 'default') && (
                <Line
                  type="monotone"
                  dataKey="defaultValue"
                  stroke={sources.find(s => s.key === 'default')?.stroke}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  connectNulls={false}
                />
              )}
              
              {sources.filter(s => s.key !== 'default').map((source) => (
                <Line
                  key={source.key}
                  type="monotone"
                  dataKey={`${source.key}_value`}
                  stroke={source.stroke}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          );

        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#e5e7eb'} />
              <XAxis {...commonAxisProps.xAxis} />
              <YAxis {...commonAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              
              {sources.find(s => s.key === 'default') && (
                <Bar
                  dataKey="defaultValue"
                  fill={sources.find(s => s.key === 'default')?.stroke}
                  opacity={0.8}
                />
              )}
              
              {sources.filter(s => s.key !== 'default').map((source) => (
                <Bar
                  key={source.key}
                  dataKey={`${source.key}_value`}
                  fill={source.stroke}
                  opacity={0.8}
                />
              ))}
            </BarChart>
          );

        default: // area
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#e5e7eb'} />
              <XAxis {...commonAxisProps.xAxis} />
              <YAxis {...commonAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              
              {sources.find(s => s.key === 'default') && (
                <Area
                  type="monotone"
                  dataKey="defaultValue"
                  stroke={sources.find(s => s.key === 'default')?.stroke}
                  fill={sources.find(s => s.key === 'default')?.fill}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                />
              )}
              
              {sources.filter(s => s.key !== 'default').map((source) => (
                <Area
                  key={source.key}
                  type="monotone"
                  dataKey={`${source.key}_value`}
                  stroke={source.stroke}
                  fill={source.fill}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          );
      }
    } else {
      // Single source charts remain the same
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#e5e7eb'} />
          <XAxis {...commonAxisProps.xAxis} />
          <YAxis {...commonAxisProps.yAxis} />
          <Tooltip content={<CustomTooltip />} />
          
          <Area 
            type="monotone" 
            dataKey="upValue"
            stroke="#10b981"
            fill="rgba(16, 185, 129, 0.2)"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
          />
          
          <Area 
            type="monotone" 
            dataKey="downValue"
            stroke="#ef4444"
            fill="rgba(239, 68, 68, 0.2)"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
          />
          
          <Area 
            type="monotone" 
            dataKey="warningValue"
            stroke="#f59e0b"
            fill="rgba(245, 158, 11, 0.2)"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
          />
          
          {chartData.map((entry, index) => 
            entry.status === 'paused' ? (
              <ReferenceLine 
                key={`ref-${index}`}
                x={entry.time} 
                stroke="#9ca3af"
                strokeDasharray="3 3"
              />
            ) : null
          )}
        </AreaChart>
      );
    }
  };

  // Check if we have any data to display
  const hasData = uptimeData.length > 0;
  
  // Get date range for display
  const dateRange = useMemo(() => {
    if (!chartData.length) return { start: "", end: "" };
    
    const sortedData = [...chartData].sort((a, b) => a.rawTime - b.rawTime);
    return {
      start: sortedData[0]?.date || "",
      end: sortedData[sortedData.length - 1]?.date || ""
    };
  }, [chartData]);
  
  // Display date range if different dates
  const dateRangeDisplay = dateRange.start === dateRange.end 
    ? dateRange.start 
    : `${dateRange.start} - ${dateRange.end}`;
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
          <span>Response Time History</span>
          <div className="flex items-center gap-4">
            {hasMultipleSources && (
              <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className="h-8 px-2"
                >
                  <AreaChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="h-8 px-2"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className="h-8 px-2"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {hasData && (
              <span className="text-sm font-normal text-muted-foreground">
                {dateRangeDisplay}
              </span>
            )}
          </div>
        </CardTitle>
        {hasMultipleSources && (
          <div className="flex flex-wrap gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2 w-full">
              <span>Monitoring Sources:</span>
            </div>
            {sources.map(source => (
              <div key={source.key} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border shadow-sm">
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm" 
                  style={{ backgroundColor: source.stroke }}
                ></div>
                <span className="font-medium">{String(source.label)}</span>
                <span className="text-xs text-muted-foreground">({source.colorName})</span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No data available for the selected time period.</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}