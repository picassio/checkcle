import { pb } from '@/lib/pocketbase';
import {
  PerformanceTest,
  PerformanceMetrics,
  PerformanceBudget,
  PerformanceTestsResponse,
  PerformanceMetricsResponse,
  PerformanceBudgetsResponse,
  PerformanceTestWithMetrics,
  QueueItem,
  QueueStatus,
  QueuePositionResponse,
} from '@/types/performance.types';

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

// Performance Tests
export const performanceService = {
  // Get all performance tests
  async getTests(status?: string): Promise<PerformanceTest[]> {
    const options: { filter?: string; sort: string } = {
      sort: '-created',
    };
    if (status) {
      options.filter = `status="${status}"`;
    }
    const response = await pb.collection('performance_tests').getFullList<PerformanceTest>(options);
    return response;
  },

  // Get a single test by ID
  async getTest(testId: string): Promise<PerformanceTest> {
    return await pb.collection('performance_tests').getOne<PerformanceTest>(testId);
  },

  // Create a new performance test
  async createTest(data: Partial<PerformanceTest>): Promise<PerformanceTest> {
    return await pb.collection('performance_tests').create<PerformanceTest>(data);
  },

  // Update a performance test
  async updateTest(testId: string, data: Partial<PerformanceTest>): Promise<PerformanceTest> {
    return await pb.collection('performance_tests').update<PerformanceTest>(testId, data);
  },

  // Delete a performance test
  async deleteTest(testId: string): Promise<boolean> {
    return await pb.collection('performance_tests').delete(testId);
  },

  // Run a test immediately (adds to queue with high priority)
  // Returns a QueueItem instead of metrics - the test runs asynchronously
  async runTestNow(testId: string): Promise<QueueItem> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/performance/test/${testId}/run`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to queue test');
    }
    return await response.json();
  },

  // Queue Management Methods

  // Get current queue status (currently running + pending items)
  async getQueueStatus(): Promise<QueueStatus> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/performance/queue`);
    if (!response.ok) {
      throw new Error('Failed to fetch queue status');
    }
    return await response.json();
  },

  // Get queue position for a specific test
  async getQueuePosition(testId: string): Promise<QueuePositionResponse> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/performance/queue/test/${testId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch queue position');
    }
    return await response.json();
  },

  // Cancel a pending queue item
  async cancelQueueItem(itemId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${SERVICE_OPERATION_URL}/performance/queue/${itemId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to cancel queue item');
    }
    return await response.json();
  },

  // Pause a test
  async pauseTest(testId: string): Promise<PerformanceTest> {
    return await pb.collection('performance_tests').update<PerformanceTest>(testId, {
      status: 'paused',
    });
  },

  // Resume a test
  async resumeTest(testId: string): Promise<PerformanceTest> {
    return await pb.collection('performance_tests').update<PerformanceTest>(testId, {
      status: 'active',
    });
  },

  // Performance Metrics
  async getMetrics(
    testId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PerformanceMetrics[]> {
    let filter = `test_id="${testId}"`;

    if (options?.startDate) {
      filter += ` && timestamp>="${options.startDate.toISOString()}"`;
    }
    if (options?.endDate) {
      filter += ` && timestamp<="${options.endDate.toISOString()}"`;
    }

    const response = await pb.collection('performance_metrics').getList<PerformanceMetrics>(
      1,
      options?.limit || 100,
      {
        filter,
        sort: '-timestamp',
      }
    );
    return response.items;
  },

  // Get latest metrics for a test
  async getLatestMetrics(testId: string): Promise<PerformanceMetrics | null> {
    const response = await pb.collection('performance_metrics').getList<PerformanceMetrics>(
      1,
      1,
      {
        filter: `test_id="${testId}"`,
        sort: '-timestamp',
      }
    );
    return response.items[0] || null;
  },

  // Get latest metrics for all tests (dashboard overview)
  async getLatestMetricsForAllTests(): Promise<PerformanceTestWithMetrics[]> {
    try {
      const response = await fetch(`${SERVICE_OPERATION_URL}/performance/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest metrics');
      }
      return await response.json();
    } catch {
      // Fallback: fetch from PocketBase directly
      const tests = await this.getTests('active');
      const results: PerformanceTestWithMetrics[] = [];

      for (const test of tests) {
        const latestMetrics = await this.getLatestMetrics(test.id);
        results.push({
          test_id: test.id,
          test_name: test.name,
          test_url: test.url,
          latest_metrics: latestMetrics,
        });
      }

      return results;
    }
  },

  // Get metrics history for charts
  async getMetricsHistory(
    testId: string,
    timeRange: '24h' | '7d' | '30d' | '90d' = '7d'
  ): Promise<PerformanceMetrics[]> {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    return await this.getMetrics(testId, { startDate, endDate: now, limit: 500 });
  },

  // Performance Budgets
  async getBudgets(): Promise<PerformanceBudget[]> {
    return await pb.collection('performance_budgets').getFullList<PerformanceBudget>({
      sort: '-created',
    });
  },

  async getBudget(budgetId: string): Promise<PerformanceBudget> {
    return await pb.collection('performance_budgets').getOne<PerformanceBudget>(budgetId);
  },

  async createBudget(data: Partial<PerformanceBudget>): Promise<PerformanceBudget> {
    return await pb.collection('performance_budgets').create<PerformanceBudget>(data);
  },

  async updateBudget(budgetId: string, data: Partial<PerformanceBudget>): Promise<PerformanceBudget> {
    return await pb.collection('performance_budgets').update<PerformanceBudget>(budgetId, data);
  },

  async deleteBudget(budgetId: string): Promise<boolean> {
    return await pb.collection('performance_budgets').delete(budgetId);
  },

  // Get report URL for a test
  // Note: trailing slash is important for relative links in the HTML report to work correctly
  getReportUrl(testId: string, timestamp: string): string {
    return `${SERVICE_OPERATION_URL}/performance/report/${testId}/${timestamp}/`;
  },

  // Calculate average metrics for a time range
  calculateAverages(metrics: PerformanceMetrics[]): Partial<PerformanceMetrics> | null {
    if (metrics.length === 0) return null;

    const sum = metrics.reduce(
      (acc, m) => ({
        lcp: acc.lcp + m.lcp,
        fcp: acc.fcp + m.fcp,
        cls: acc.cls + m.cls,
        tbt: acc.tbt + m.tbt,
        ttfb: acc.ttfb + m.ttfb,
        speed_index: acc.speed_index + m.speed_index,
        fully_loaded: acc.fully_loaded + (m.fully_loaded || 0),
        requests: acc.requests + m.requests,
        transfer_size: acc.transfer_size + m.transfer_size,
      }),
      { lcp: 0, fcp: 0, cls: 0, tbt: 0, ttfb: 0, speed_index: 0, fully_loaded: 0, requests: 0, transfer_size: 0 }
    );

    const count = metrics.length;
    return {
      lcp: sum.lcp / count,
      fcp: sum.fcp / count,
      cls: sum.cls / count,
      tbt: sum.tbt / count,
      ttfb: sum.ttfb / count,
      speed_index: sum.speed_index / count,
      fully_loaded: sum.fully_loaded / count,
      requests: Math.round(sum.requests / count),
      transfer_size: Math.round(sum.transfer_size / count),
    };
  },

  // Get budget pass rate
  calculateBudgetPassRate(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 100;
    const passed = metrics.filter((m) => m.budget_passed).length;
    return (passed / metrics.length) * 100;
  },
};

export default performanceService;
