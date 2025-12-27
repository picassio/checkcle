import { pb } from '@/lib/pocketbase';
import {
  SecurityScan,
  SecurityResult,
  SecurityQueueItem,
  SecurityQueueStatus,
  SecuritySummary,
  CreateSecurityScanRequest,
  UpdateSecurityScanRequest,
} from '@/types/security.types';

// Dynamically construct service operation URL based on current host
const getServiceOperationUrl = (): string => {
  if (import.meta.env.VITE_SERVICE_OPERATION_URL) {
    return import.meta.env.VITE_SERVICE_OPERATION_URL;
  }
  // Use the same hostname as the current page, but with port 8091
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8091`;
};

const SERVICE_OPERATION_URL = getServiceOperationUrl();

export const securityService = {
  // ==================== Scans ====================

  // Get all security scans
  async getScans(status?: string): Promise<SecurityScan[]> {
    const options: { filter?: string; sort: string } = {
      sort: '-created',
    };
    if (status) {
      options.filter = `status="${status}"`;
    }
    const response = await pb.collection('security_scans').getFullList<SecurityScan>(options);
    return response;
  },

  // Get a single scan by ID
  async getScan(scanId: string): Promise<SecurityScan> {
    return await pb.collection('security_scans').getOne<SecurityScan>(scanId);
  },

  // Create a new security scan
  async createScan(data: CreateSecurityScanRequest): Promise<SecurityScan> {
    const scanData = {
      ...data,
      status: data.status || 'active',
      scan_interval: data.scan_interval || 86400, // Default to daily
      template_tags: data.template_tags || [],
      exclude_tags: data.exclude_tags || [],
      severity_filter: data.severity_filter || [],
      findings_count: 0,
      critical_count: 0,
      high_count: 0,
    };
    return await pb.collection('security_scans').create<SecurityScan>(scanData);
  },

  // Update a security scan
  async updateScan(scanId: string, data: UpdateSecurityScanRequest): Promise<SecurityScan> {
    return await pb.collection('security_scans').update<SecurityScan>(scanId, data);
  },

  // Delete a security scan
  async deleteScan(scanId: string): Promise<boolean> {
    return await pb.collection('security_scans').delete(scanId);
  },

  // Run a scan immediately (adds to queue with high priority)
  async runScanNow(scanId: string): Promise<SecurityQueueItem> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/security/scan/${scanId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pb.authStore.token}`,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to queue scan');
    }
    return await response.json();
  },

  // Toggle scan status (active/paused)
  async toggleScanStatus(scanId: string, currentStatus: string): Promise<SecurityScan> {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    return await pb.collection('security_scans').update<SecurityScan>(scanId, { status: newStatus });
  },

  // ==================== Results ====================

  // Get results for a scan
  async getResults(scanId: string, options?: { severity?: string; limit?: number }): Promise<SecurityResult[]> {
    const filter: string[] = [`scan_id="${scanId}"`];
    if (options?.severity) {
      filter.push(`severity="${options.severity}"`);
    }

    const queryOptions = {
      filter: filter.join(' && '),
      sort: '-created',
      perPage: options?.limit || 100,
    };

    const response = await pb.collection('security_results').getList<SecurityResult>(1, queryOptions.perPage, {
      filter: queryOptions.filter,
      sort: queryOptions.sort,
    });
    return response.items;
  },

  // Get all results with pagination
  async getResultsPaginated(scanId: string, page: number = 1, perPage: number = 20, severity?: string) {
    const filter: string[] = [`scan_id="${scanId}"`];
    if (severity) {
      filter.push(`severity="${severity}"`);
    }

    return await pb.collection('security_results').getList<SecurityResult>(page, perPage, {
      filter: filter.join(' && '),
      sort: '-created',
    });
  },

  // Get results by queue_id (for per-run results) - preferred method
  async getResultsByQueueId(
    queueId: string,
    page: number = 1,
    perPage: number = 20,
    severity?: string
  ) {
    const filter: string[] = [`queue_id="${queueId}"`];
    if (severity) {
      filter.push(`severity="${severity}"`);
    }

    return await pb.collection('security_results').getList<SecurityResult>(page, perPage, {
      filter: filter.join(' && '),
      sort: '-created',
    });
  },

  // Get results filtered by time range (for per-run results) - fallback for old results without queue_id
  async getResultsByTimeRange(
    scanId: string,
    startTime: string,
    endTime: string,
    page: number = 1,
    perPage: number = 20,
    severity?: string
  ) {
    const filter: string[] = [
      `scan_id="${scanId}"`,
      `created>="${startTime}"`,
      `created<="${endTime}"`
    ];
    if (severity) {
      filter.push(`severity="${severity}"`);
    }

    return await pb.collection('security_results').getList<SecurityResult>(page, perPage, {
      filter: filter.join(' && '),
      sort: '-created',
    });
  },

  // Get a single result by ID
  async getResult(resultId: string): Promise<SecurityResult> {
    return await pb.collection('security_results').getOne<SecurityResult>(resultId);
  },

  // Get severity breakdown for a scan
  async getSeverityBreakdown(scanId: string): Promise<Record<string, number>> {
    const results = await this.getResults(scanId, { limit: 1000 });
    const breakdown: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      unknown: 0,
    };

    results.forEach(result => {
      const severity = result.severity.toLowerCase();
      if (severity in breakdown) {
        breakdown[severity]++;
      } else {
        breakdown.unknown++;
      }
    });

    return breakdown;
  },

  // ==================== Queue ====================

  // Get current queue status
  async getQueueStatus(): Promise<SecurityQueueStatus> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/security/queue`, {
      headers: {
        'Authorization': `Bearer ${pb.authStore.token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch queue status');
    }
    return await response.json();
  },

  // Cancel a pending queue item
  async cancelQueueItem(itemId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/security/queue/${itemId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pb.authStore.token}`,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to cancel queue item');
    }
    return await response.json();
  },

  // Get queue items from PocketBase directly
  async getQueueItems(status?: string): Promise<SecurityQueueItem[]> {
    const options: { filter?: string; sort: string } = {
      sort: '-created',
    };
    if (status) {
      options.filter = `status="${status}"`;
    }
    return await pb.collection('security_queue').getFullList<SecurityQueueItem>(options);
  },

  // Get queue items (runs) for a specific scan
  async getQueueItemsByScan(scanId: string): Promise<SecurityQueueItem[]> {
    return await pb.collection('security_queue').getFullList<SecurityQueueItem>({
      filter: `scan_id="${scanId}"`,
      sort: '-created',
    });
  },

  // Delete a queue item (scan run) and its associated results
  async deleteQueueItem(queueId: string): Promise<boolean> {
    // First delete associated results with this queue_id
    try {
      const results = await pb.collection('security_results').getFullList({
        filter: `queue_id="${queueId}"`,
      });
      for (const result of results) {
        await pb.collection('security_results').delete(result.id);
      }
    } catch (e) {
      // Results may not exist, continue with queue deletion
    }
    // Delete the queue item
    return await pb.collection('security_queue').delete(queueId);
  },

  // ==================== Summary ====================

  // Get security summary
  async getSummary(): Promise<SecuritySummary> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/security/summary`, {
      headers: {
        'Authorization': `Bearer ${pb.authStore.token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch security summary');
    }
    return await response.json();
  },

  // Get dashboard stats
  async getDashboardStats(): Promise<{
    totalScans: number;
    activeScans: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
  }> {
    const scans = await this.getScans();
    const activeScans = scans.filter(s => s.status === 'active').length;
    const totalFindings = scans.reduce((sum, s) => sum + (s.findings_count || 0), 0);
    const criticalFindings = scans.reduce((sum, s) => sum + (s.critical_count || 0), 0);
    const highFindings = scans.reduce((sum, s) => sum + (s.high_count || 0), 0);

    return {
      totalScans: scans.length,
      activeScans,
      totalFindings,
      criticalFindings,
      highFindings,
    };
  },

  // ==================== Utilities ====================

  // Format scan interval for display
  formatScanInterval(seconds: number): string {
    if (seconds === 0) return 'Manual only';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    if (seconds === 86400) return 'Daily';
    if (seconds === 604800) return 'Weekly';
    return `${Math.floor(seconds / 86400)} days`;
  },

  // Parse scan interval from string
  parseScanInterval(value: string): number {
    const num = parseInt(value);
    if (isNaN(num)) return 86400;
    return num;
  },
};

export default securityService;
