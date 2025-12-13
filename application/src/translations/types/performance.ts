
export interface PerformanceTranslations {
  // Page & Dashboard
  performanceMonitoring: string;
  performanceDashboard: string;
  performanceTests: string;
  performanceReports: string;
  performanceBudgets: string;
  performanceDescription: string;
  dashboard: string;
  tests: string;
  reports: string;
  budgets: string;

  // Core Web Vitals
  coreWebVitals: string;
  largestContentfulPaint: string;
  firstContentfulPaint: string;
  cumulativeLayoutShift: string;
  totalBlockingTime: string;
  timeToFirstByte: string;
  speedIndex: string;

  // Core Web Vitals Descriptions
  lcpDescription: string;
  fcpDescription: string;
  clsDescription: string;
  tbtDescription: string;
  lcpDesc: string;
  fcpDesc: string;
  clsDesc: string;
  tbtDesc: string;
  ttfbDesc: string;

  // Status
  good: string;
  needsImprovement: string;
  poor: string;
  goodAbbr: string;
  needsImprovementAbbr: string;
  poorAbbr: string;

  // Test Management
  createTest: string;
  editTest: string;
  deleteTest: string;
  runTest: string;
  testName: string;
  testUrl: string;
  schedule: string;
  scheduleInterval: string;
  browser: string;
  connectivity: string;
  runs: string;
  addTest: string;
  runNow: string;
  pause: string;
  resume: string;
  openUrl: string;
  testPaused: string;
  testResumed: string;
  testCompleted: string;
  testFailed: string;

  // Time units
  min: string;
  hr: string;
  day: string;
  hours: string;
  never: string;

  // Connectivity options
  native: string;
  cable: string;

  // Status
  active: string;
  paused: string;
  running: string;
  error: string;

  // Budget
  createBudget: string;
  editBudget: string;
  budgetName: string;
  budgetNamePlaceholder: string;
  budgetDialogDescription: string;
  budgetCreated: string;
  budgetUpdated: string;
  budgetDeleted: string;
  budgetsDescription: string;
  strict: string;
  moderate: string;
  relaxed: string;
  noBudgetConfigured: string;
  selectBudget: string;
  noBudget: string;

  // Budget hints
  lcpHint: string;
  fcpHint: string;
  clsHint: string;
  tbtHint: string;
  ttfbHint: string;
  speedIndexHint: string;

  // Reports
  testsRun: string;
  avgLCP: string;
  avgFCP: string;
  avgSpeedIndex: string;
  avgFullyLoaded: string;
  avgCLS: string;
  budgetPassRate: string;
  detailedResults: string;
  exportCSV: string;
  selectTest: string;
  selectTestForReport: string;
  noDataForPeriod: string;
  recentResults: string;
  recentResultsDesc: string;
  allTests: string;
  noPerformanceData: string;
  inSelectedPeriod: string;
  healthy: string;
  attention: string;
  coreWebVitalsDesc: string;
  test: string;
  date: string;
  budget: string;
  pass: string;
  fail: string;

  // Charts
  webVitalsTrend: string;
  speedIndexTrend: string;
  lcpFcpTrend: string;
  clsTbtTrend: string;
  ttfbTrend: string;
  requestsAndTransfer: string;
  pageLoadTrend: string;
  backendFrontendTrend: string;
  cpuMetrics: string;
  cpuLongTasks: string;
  noCPUData: string;
  longTasksCount: string;
  longTasksTime: string;
  maxLongTask: string;
  avgLongTasks: string;
  avgLongTaskTime: string;
  avgTBT: string;
  navigationTimings: string;
  pageSizeBreakdown: string;
  noSizeData: string;
  requestsBreakdown: string;
  noRequestData: string;
  thirdPartyRequests: string;
  total: string;

  // HTML Report Viewer
  sitespeedReport: string;
  fullscreen: string;
  exitFullscreen: string;
  openInNewTab: string;
  noReportAvailable: string;
  reportGeneratedBy: string;
  openFullReport: string;
  viewReport: string;

  // Dashboard
  activeTests: string;
  errors: string;
  budgetStatus: string;
  testsPassed: string;
  latestResults: string;
  noPerformanceTests: string;
  passed: string;
  failed: string;
  lastRun: string;

  // Detailed Metrics
  detailedMetrics: string;
  vsLastRun: string;
  loadTiming: string;
  fullyLoaded: string;
  fullyLoadedDesc: string;
  backendTime: string;
  backendTimeDesc: string;
  frontendTime: string;
  frontendTimeDesc: string;
  serverResponse: string;
  dnsDesc: string;
  connect: string;
  connectDesc: string;
  sslDesc: string;
  pageStats: string;
  requestsDesc: string;
  transferSizeDesc: string;
  domElements: string;
  domDesc: string;
  thirdParty: string;
  thirdPartyDesc: string;

  // Coach Score
  coachScore: string;
  noCoachScore: string;
  overallScore: string;
  performance: string;
  accessibility: string;
  bestPractice: string;

  // Tabs
  overview: string;
  trends: string;
  details: string;
  history: string;

  // Common
  ms: string;
  days: string;
  requests: string;
  transferSize: string;
  optional: string;
  size: string;
  time: string;
  back: string;
  name: string;
  url: string;
  iterations: string;
  run: string;
  update: string;
  create: string;
  invalidUrl: string;

  // Messages
  testCreated: string;
  testUpdated: string;
  testDeleted: string;
  testStarted: string;
  nameRequired: string;
  urlRequired: string;
  saveFailed: string;
  deleteError: string;
  confirmDelete: string;
  noTestsYet: string;
  createFirstTest: string;
  noBudgetsYet: string;
  createFirstBudget: string;
  noMetricsYet: string;
  createPerformanceTest: string;
  editPerformanceTest: string;
  testNamePlaceholder: string;

  // CSV Export
  csvDate: string;
  csvLCP: string;
  csvFCP: string;
  csvCLS: string;
  csvTBT: string;
  csvSpeedIndex: string;
  csvTTFB: string;
  csvRequests: string;
  csvTransferSize: string;
  csvBudgetPassed: string;
  yes: string;
  no: string;

  // Reference line labels
  goodLabel: string;
  poorLabel: string;
  goodTTFB: string;
  poorTTFB: string;
  goodTBT: string;

  // Visual Metrics
  visualMetrics: string;
  visualMetricsDescription: string;
  visualMetricsEnabled: string;
  visualMetricsDisabled: string;

  // Queue system
  queueStatus: string;
  queuePosition: string;
  queuedAt: string;
  cancelQueue: string;
  queueItemCancelled: string;
  failedToCancelQueueItem: string;
  runningTest: string;
  queueIdle: string;
  pending: string;
  queued: string;
  queueing: string;
  testQueued: string;
  manualRun: string;
  processing: string;
}
