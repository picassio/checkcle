
import { useState, useEffect, useCallback, useMemo } from "react";
import { pb } from "@/lib/pocketbase";
import { Service, UptimeData } from "@/types/service.types";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { uptimeService } from "@/services/uptimeService";
import { DateRangeOption } from "../../DateRangeFilter";
import { useQuery } from "@tanstack/react-query";
import { regionalService } from "@/services/regionalService";

export const useServiceData = (serviceId: string | undefined, startDate: Date, endDate: Date, selectedRange?: DateRangeOption) => {
  const [service, setService] = useState<Service | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegionalAgent, setSelectedRegionalAgent] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get regional agents for "all" monitoring with optimized caching
  const { data: regionalAgents = [] } = useQuery({
    queryKey: ['regional-services'],
    queryFn: regionalService.getRegionalServices,
    enabled: selectedRegionalAgent === "all",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  const handleStatusChange = useCallback(async (newStatus: "up" | "down" | "paused" | "warning") => {
    if (!service || !serviceId) return;

    try {
      setService({ ...service, status: newStatus as Service["status"] });
      
      await pb.collection('services').update(serviceId, {
        status: newStatus
      });
      
      toast({
        title: "Status updated",
        description: `Service status changed to ${newStatus}`,
      });
    } catch (error) {
    //  console.error("Failed to update service status:", error);
      setService(prevService => prevService);
      
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update service status. Please try again.",
      });
    }
  }, [service, serviceId, toast]);

  const fetchUptimeData = useCallback(async (serviceId: string, start: Date, end: Date, rangeOption?: DateRangeOption | string, regionalAgent?: string) => {
    try {
      if (!service) {
        console.log('fetchUptimeData: No service data available');
        return [];
      }

      const currentAgent = regionalAgent || selectedRegionalAgent;
      console.log(`fetchUptimeData: Fetching from ${start.toISOString()} to ${end.toISOString()}, range: ${rangeOption}, service type: ${service.type}`);
      
      // Clear existing data immediately when switching agents
      setUptimeData([]);
      
      let limit = 500; // Default limit

      if (rangeOption === '24h') {
        limit = 300;
      } else if (rangeOption === '7d') {
        limit = 1000;
      } else if (rangeOption === '30d') {
        limit = 2000;
      } else if (rangeOption === '1y') {
        limit = 5000;
      }

      console.log(`fetchUptimeData: Using limit ${limit} for range ${rangeOption}`);
      
      let history: UptimeData[] = [];
      
      if (currentAgent === "all") {
        // Fetch data from all sources (default + all online regional agents)
      //  console.log(`Fetching data from all monitoring sources`);
        
        // Fetch default monitoring data
        const defaultData = await uptimeService.getUptimeHistory(serviceId, limit, start, end, service.type);
       // console.log(`Retrieved ${defaultData.length} default monitoring records`);
        
        // Mark default data with source identifier
        const markedDefaultData = defaultData.map(record => ({
          ...record,
          source: 'default' as const,
          region_name: undefined,
          agent_id: undefined
        }));
        
        history = [...markedDefaultData];
        
        // Fetch regional monitoring data from all online agents
        const onlineAgents = regionalAgents.filter(agent => agent.connection === 'online');
        
        for (const agent of onlineAgents) {
          try {
            const regionalData = await uptimeService.getUptimeHistoryByRegionalAgent(
              serviceId, limit, start, end, service.type, agent.region_name, agent.agent_id
            );
          //  console.log(`Retrieved ${regionalData.length} records from ${agent.region_name}`);
            
            // Mark regional data with source identifier
            const markedRegionalData = regionalData.map(record => ({
              ...record,
              source: `${agent.region_name}|${agent.agent_id}` as const,
              region_name: agent.region_name,
              agent_id: agent.agent_id
            }));
            
            history = [...history, ...markedRegionalData];
          } catch (error) {
          //  console.error(`Error fetching data from ${agent.region_name}:`, error);
          }
        }
        
       // console.log(`Total combined records: ${history.length}`);
        
      } else {
        // Fetch regional agent specific data
        const [regionName, agentId] = currentAgent.split("|");
       // console.log(`Fetching regional agent data for region: ${regionName}, agent: ${agentId} from ${service.type} collection`);
        history = await uptimeService.getUptimeHistoryByRegionalAgent(serviceId, limit, start, end, service.type, regionName, agentId);
       // console.log(`Retrieved ${history.length} regional monitoring records`);
      }
      
      // Sort by timestamp (newest first)
      const filteredHistory = [...history].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
     // console.log(`Final dataset: ${filteredHistory.length} records for ${currentAgent === "all" ? "all sources" : "regional"} monitoring`);
      setUptimeData(filteredHistory);
      return filteredHistory;
    } catch (error) {
     // console.error("Error fetching uptime data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load uptime history. Please try again.",
      });
      return [];
    }
  }, [service, selectedRegionalAgent, regionalAgents, toast]);

  const handleRegionalAgentChange = useCallback((agent: string) => {
   // console.log(`Regional agent changed from ${selectedRegionalAgent} to: ${agent}`);

    // Clear data immediately when switching
    setUptimeData([]);
    setSelectedRegionalAgent(agent);

    // Refetch data with new agent selection
    if (serviceId && !isLoading && service) {
    //  console.log(`Refetching data for new agent: ${agent}`);
      fetchUptimeData(serviceId, startDate, endDate, selectedRange || '24h', agent);
    }
  }, [selectedRegionalAgent, serviceId, isLoading, service, fetchUptimeData, startDate, endDate, selectedRange]);

  // Memoize the service data fetching to prevent unnecessary re-runs
  const fetchServiceData = useCallback(async () => {
    try {
      if (!serviceId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 10000);
      });
      
      const fetchPromise = pb.collection('services').getOne(serviceId);
      const serviceData = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      const formattedService: Service = {
        id: serviceData.id,
        name: serviceData.name,
        url: serviceData.url || "",
        host: serviceData.host || "",
        port: serviceData.port || undefined,
        domain: serviceData.domain || "",
        type: serviceData.service_type || serviceData.type || "HTTP",
        status: serviceData.status || "paused",
        responseTime: serviceData.response_time || serviceData.responseTime || 0,
        uptime: serviceData.uptime || 0,
        lastChecked: serviceData.last_checked || serviceData.lastChecked || new Date().toLocaleString(),
        interval: serviceData.heartbeat_interval || serviceData.interval || 60,
        retries: serviceData.max_retries || serviceData.retries || 3,
        notificationChannel: serviceData.notification_id,
        alertTemplate: serviceData.template_id,
        alerts: serviceData.alerts || "unmuted"
      };
      
     // console.log(`Loaded service: ${formattedService.name} (${formattedService.type})`);
      setService(formattedService);
      
      // Small delay to ensure state is updated before fetching uptime data
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
     // console.error("Error fetching service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load service data. Please try again.",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, navigate, toast]);

  // Initial data loading
  useEffect(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  // Update data when date range changes or when service is loaded - with debouncing
  useEffect(() => {
    if (serviceId && !isLoading && service) {
      console.log(`useServiceData useEffect: Date range changed, will fetch data for ${serviceId}: ${startDate.toISOString()} to ${endDate.toISOString()}, range: ${selectedRange}`);
      const timeoutId = setTimeout(() => {
        console.log(`useServiceData useEffect: Executing fetchUptimeData for ${serviceId}`);
        fetchUptimeData(serviceId, startDate, endDate, selectedRange || '24h', selectedRegionalAgent);
      }, 500); // Debounce API calls by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [startDate, endDate, serviceId, isLoading, service, selectedRegionalAgent, regionalAgents, fetchUptimeData, selectedRange]);

  return useMemo(() => ({
    service,
    setService,
    uptimeData,
    setUptimeData,
    isLoading,
    handleStatusChange,
    fetchUptimeData,
    selectedRegionalAgent,
    handleRegionalAgentChange
  }), [service, uptimeData, isLoading, handleStatusChange, fetchUptimeData, selectedRegionalAgent, handleRegionalAgentChange]);
};