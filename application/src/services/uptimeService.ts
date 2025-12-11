
import { pb } from '@/lib/pocketbase';
import { UptimeData } from '@/types/service.types';

const uptimeCache = new Map<string, {
  data: UptimeData[],
  timestamp: number,
  expiresIn: number
}>();

const CACHE_TTL = 3000; // 3 seconds for faster updates

// Map service types to their corresponding collections
const getCollectionForServiceType = (serviceType: string): string => {
  const type = serviceType.toLowerCase();
  switch (type) {
    case 'ping':
    case 'icmp':
      return 'ping_data';
    case 'dns':
      return 'dns_data';
    case 'tcp':
      return 'tcp_data';
    case 'http':
    case 'https':
    default:
      return 'uptime_data';
  }
};

export const uptimeService = {
  async recordUptimeData(data: UptimeData): Promise<void> {
    try {
   //   console.log(`Recording uptime data for service ${data.serviceId || data.service_id}: Status ${data.status}, Response time: ${data.responseTime}ms`);
      
      const options = {
        $autoCancel: false,
        $cancelKey: `uptime_record_${data.serviceId || data.service_id}_${Date.now()}`
      };
      
      const record = await pb.collection('uptime_data').create({
        service_id: data.service_id || data.serviceId,
        timestamp: data.timestamp,
        status: data.status,
        response_time: data.responseTime
      }, options);
      
      // Invalidate cache for this service
      const serviceId = data.service_id || data.serviceId;
      const keysToDelete = Array.from(uptimeCache.keys()).filter(key => key.includes(`uptime_${serviceId}`));
      keysToDelete.forEach(key => uptimeCache.delete(key));
      
    //  console.log(`Uptime data recorded successfully with ID: ${record.id}`);
    } catch (error) {
    //  console.error("Error recording uptime data:", error);
      throw new Error(`Failed to record uptime data: ${error}`);
    }
  },
  
  async getUptimeHistory(
    serviceId: string, 
    limit: number = 200, 
    startDate?: Date, 
    endDate?: Date,
    serviceType?: string
  ): Promise<UptimeData[]> {
    try {
      if (!serviceId) {
     //   console.log('No serviceId provided to getUptimeHistory');
        return [];
      }

      const cacheKey = `uptime_${serviceId}_${limit}_${startDate?.toISOString() || ''}_${endDate?.toISOString() || ''}_${serviceType || 'default'}_default`;
      
      // Check cache
      const cached = uptimeCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cached.expiresIn) {
       // console.log(`Using cached uptime history for service ${serviceId}`);
        return cached.data;
      }
      
      // Determine the correct collection based on service type
      const collection = serviceType ? getCollectionForServiceType(serviceType) : 'uptime_data';
     // console.log(`Fetching default uptime history for service ${serviceId} from collection ${collection}, limit: ${limit}`);
      
      // Build filter to get records for specific service_id
      let filter = `service_id='${serviceId}'`;
      
      // Add date range filtering if provided
      if (startDate && endDate) {
        const startUTC = startDate.toISOString();
        const endUTC = endDate.toISOString();
        
      //  console.log(`Date filter: ${startUTC} to ${endUTC}`);
        filter += ` && timestamp >= "${startUTC}" && timestamp <= "${endUTC}"`;
      }
      
      const options = {
        filter: filter,
        sort: '-timestamp', // Sort by timestamp descending (newest first)
        $autoCancel: false,
        $cancelKey: `uptime_history_${serviceId}_${Date.now()}`
      };
      
     // console.log(`Filter query for default data: ${filter} on collection: ${collection}`);
      
      const response = await pb.collection(collection).getList(1, limit, options);
      
    //  console.log(`Fetched ${response.items.length} records for service ${serviceId} from ${collection}`);
      
      if (response.items.length > 0) {
      //  console.log(`Date range in results: ${response.items[response.items.length - 1].timestamp} to ${response.items[0].timestamp}`);
      } else {
      //  console.log(`No records found for service_id '${serviceId}' in collection: ${collection}`);
      }
      
      // Transform the response items to UptimeData format
      const uptimeData = response.items.map(item => ({
        id: item.id,
        service_id: item.service_id,
        serviceId: item.service_id,
        timestamp: item.timestamp,
        status: item.status as "up" | "down" | "warning" | "paused",
        responseTime: item.response_time || 0,
        date: item.timestamp,
        uptime: 100,
        error_message: item.error_message,
        details: item.details,
        validation_results: item.validation_results
      }));
      
      // Cache the result
      uptimeCache.set(cacheKey, {
        data: uptimeData,
        timestamp: Date.now(),
        expiresIn: CACHE_TTL
      });
      
      return uptimeData;
    } catch (error) {
    //  console.error(`Error fetching uptime history for service ${serviceId}:`, error);
      
      // Try to return cached data as fallback
      const cacheKey = `uptime_${serviceId}_${limit}_${startDate?.toISOString() || ''}_${endDate?.toISOString() || ''}_${serviceType || 'default'}_default`;
      const cached = uptimeCache.get(cacheKey);
      if (cached) {
      //  console.log(`Using expired cached data for service ${serviceId} due to fetch error`);
        return cached.data;
      }
      
      // Return empty array instead of throwing to prevent UI crashes
    //  console.log(`Returning empty array for service ${serviceId} due to fetch error`);
      return [];
    }
  },

  async getUptimeHistoryByRegionalAgent(
    serviceId: string, 
    limit: number = 50, 
    startDate?: Date, 
    endDate?: Date, 
    serviceType?: string,
    regionName?: string,
    agentId?: string
  ): Promise<UptimeData[]> {
    try {
      if (!regionName || !agentId) {
      //  console.log('No region name or agent ID provided for regional query');
        return [];
      }

      const cacheKey = `uptime_${serviceId}_${limit}_${startDate?.toISOString() || ''}_${endDate?.toISOString() || ''}_${serviceType || 'default'}_${regionName}_${agentId}`;
      
      // Check cache
      const cached = uptimeCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cached.expiresIn) {
      //  console.log(`Using cached regional uptime history for service ${serviceId}`);
        return cached.data;
      }

      // Determine the correct collection based on service type
      const collection = serviceType ? getCollectionForServiceType(serviceType) : 'uptime_data';
     // console.log(`Fetching regional uptime history from collection: ${collection} for service: ${serviceId}, region: ${regionName}, agent: ${agentId}`);

      // Build filter for regional agent data
      let filter = `service_id="${serviceId}" && region_name="${regionName}" && agent_id="${agentId}"`;

      if (startDate && endDate) {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();
        filter += ` && timestamp>="${startISO}" && timestamp<="${endISO}"`;
      }

    //  console.log(`Regional filter query: ${filter} on collection: ${collection}`);

      const records = await pb.collection(collection).getList(1, limit, {
        sort: '-timestamp',
        filter: filter,
        $autoCancel: false,
        $cancelKey: `regional_uptime_history_${serviceId}_${Date.now()}`
      });

    //  console.log(`Retrieved ${records.items.length} regional uptime records from ${collection} for region ${regionName}, agent ${agentId}`);

      const uptimeData = records.items.map(item => ({
        id: item.id,
        service_id: item.service_id,
        serviceId: item.service_id,
        timestamp: item.timestamp,
        status: item.status as "up" | "down" | "paused" | "warning",
        responseTime: item.response_time || item.responseTime || 0,
        error_message: item.error_message,
        details: item.details,
        created: item.created,
        updated: item.updated,
        validation_results: item.validation_results
      }));

      // Cache the result
      uptimeCache.set(cacheKey, {
        data: uptimeData,
        timestamp: Date.now(),
        expiresIn: CACHE_TTL
      });

      return uptimeData;
    } catch (error) {
      const collectionForError = serviceType ? getCollectionForServiceType(serviceType) : 'uptime_data';
    //  console.error(`Error fetching regional uptime history from ${collectionForError}:`, error);
      return [];
    }
  }
};