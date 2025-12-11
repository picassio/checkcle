
import { Service } from "@/types/service.types";
import { ServiceFormData } from "./types";

export const getServiceFormDefaults = (): ServiceFormData => ({
  name: "",
  type: "http",
  url: "",
  port: "",
  interval: "60",
  retries: "3",
  notificationStatus: "disabled",
  notificationChannels: [],
  alertTemplate: "",
  regionalMonitoringEnabled: false,
  regionalAgents: [],
  // Content validation defaults
  expectedStatusCode: "",
  keywordCheck: "",
  keywordCheckType: "contains",
  jsonPathChecks: [],
  headerChecks: [],
});

export const mapServiceToFormData = (service: Service): ServiceFormData => {
  // Ensure the type is one of the allowed values
  const serviceType = (service.type || "http").toLowerCase();
  const validType = ["http", "ping", "tcp", "dns"].includes(serviceType) 
    ? serviceType as "http" | "ping" | "tcp" | "dns"
    : "http";

  // For PING services, use host field; for DNS use domain field; for TCP use host field; others use url
  let urlValue = "";
  let portValue = "";
  
  if (validType === "ping") {
    urlValue = service.host || "";
  } else if (validType === "dns") {
    urlValue = service.domain || "";
  } else if (validType === "tcp") {
    urlValue = service.host || "";
    portValue = String(service.port || "");
  } else {
    urlValue = service.url || "";
  }

  // Handle regional monitoring data - check regional_status field
  const isRegionalEnabled = service.regional_status === "enabled";
  const regionalAgents: string[] = [];
  
  // Parse multiple regional agents from comma-separated region_name and agent_id fields
  if (isRegionalEnabled && service.region_name && service.agent_id) {
    const regionNames = service.region_name.includes(',') 
      ? service.region_name.split(',').map(name => name.trim()).filter(name => name)
      : [service.region_name];
    
    const agentIds = service.agent_id.includes(',')
      ? service.agent_id.split(',').map(id => id.trim()).filter(id => id)
      : [service.agent_id];
    
    // Combine region names and agent IDs (they should have the same length)
    const maxLength = Math.max(regionNames.length, agentIds.length);
    for (let i = 0; i < maxLength; i++) {
      const regionName = regionNames[i] || regionNames[0] || "";
      const agentId = agentIds[i] || agentIds[0] || "";
      if (regionName && agentId) {
        regionalAgents.push(`${regionName}|${agentId}`);
      }
    }
  }

  // Handle notification channels - prioritize notification_channel field which contains JSON array
  const notificationChannels: string[] = [];
  
  // First check for notification_channel field (JSON string of array)
  if (service.notification_channel) {
    try {
      const parsedChannels = JSON.parse(service.notification_channel);
      if (Array.isArray(parsedChannels)) {
        notificationChannels.push(...parsedChannels);
      }
    } catch (error) {
      // If parsing fails, treat as single channel ID
      notificationChannels.push(service.notification_channel);
    }
  }
  
  // Fallback to comma-separated notification_id field
  if (notificationChannels.length === 0 && service.notificationChannel) {
    // Check if it's comma-separated
    if (service.notificationChannel.includes(',')) {
      const channels = service.notificationChannel.split(',').map(id => id.trim()).filter(id => id);
      notificationChannels.push(...channels);
    } else {
      notificationChannels.push(service.notificationChannel);
    }
  }

  // Handle notification_status - it can be boolean or string
  let notificationStatus: "enabled" | "disabled" = "disabled";
  if (typeof service.notification_status === "boolean") {
    notificationStatus = service.notification_status ? "enabled" : "disabled";
  } else if (typeof service.notification_status === "string") {
    notificationStatus = service.notification_status === "enabled" ? "enabled" : "disabled";
  }

  return {
    name: service.name || "",
    type: validType,
    url: urlValue,
    port: portValue,
    interval: String(service.interval || 60),
    retries: String(service.retries || 3),
    notificationStatus: notificationStatus,
    notificationChannels: notificationChannels,
    alertTemplate: service.alertTemplate === "default" ? "" : service.alertTemplate || "",
    regionalMonitoringEnabled: isRegionalEnabled,
    regionalAgents: regionalAgents,
    // Content validation fields
    expectedStatusCode: service.expected_status_code ? String(service.expected_status_code) : "",
    keywordCheck: service.keyword_check || "",
    keywordCheckType: service.keyword_check_type || "contains",
    jsonPathChecks: (service.json_path_checks || []).map(check => ({
      path: check.path,
      operator: check.operator,
      expectedValue: check.expected_value,
    })),
    headerChecks: (service.header_checks || []).map(check => ({
      headerName: check.header_name,
      operator: check.operator,
      expectedValue: check.expected_value,
    })),
  };
};

export const mapFormDataToServiceData = (data: ServiceFormData) => {
  // Parse regional agent selections - store multiple agents as comma-separated values
  let regionNames = "";
  let agentIds = "";
  let regionalStatus: "enabled" | "disabled" = "disabled";
  
  // Set regional status and agent data based on form values
  if (data.regionalMonitoringEnabled && data.regionalAgents && data.regionalAgents.length > 0) {
    regionalStatus = "enabled";
    
    // Extract region names and agent IDs from the selected agents
    const parsedRegions: string[] = [];
    const parsedAgentIds: string[] = [];
    
    data.regionalAgents.forEach(agentValue => {
      if (agentValue && agentValue !== "") {
        const [regionName, agentId] = agentValue.split("|");
        if (regionName && agentId) {
          parsedRegions.push(regionName);
          parsedAgentIds.push(agentId);
        }
      }
    });
    
    // Store as comma-separated strings
    regionNames = parsedRegions.join(',');
    agentIds = parsedAgentIds.join(',');
  }
  
  // Prepare service data with proper field mapping
  return {
    name: data.name,
    type: data.type,
    interval: parseInt(data.interval),
    retries: parseInt(data.retries),
    // Convert string status to boolean for notification_status field
    notificationStatus: data.notificationStatus === "enabled",
    notificationChannels: data.notificationChannels || [],
    alertTemplate: data.alertTemplate === "default" ? "" : data.alertTemplate,
    // Use regional_status field and store multiple agents as comma-separated values
    regionalStatus: regionalStatus,
    regionName: regionNames,
    agentId: agentIds,
    // Map the URL field to appropriate database field based on service type
    ...(data.type === "dns"
      ? { domain: data.url, url: "", host: "", port: undefined }  // DNS: store in domain field
      : data.type === "ping"
      ? { host: data.url, url: "", domain: "", port: undefined }  // PING: store in host field
      : data.type === "tcp"
      ? { host: data.url, port: parseInt(data.port || "80"), url: "", domain: "" }  // TCP: store in host and port fields
      : { url: data.url, domain: "", host: "", port: undefined }  // HTTP: store in url field
    ),
    // Content validation fields (HTTP only)
    ...(data.type === "http" && {
      expected_status_code: data.expectedStatusCode ? parseInt(data.expectedStatusCode) : null,
      keyword_check: data.keywordCheck || null,
      keyword_check_type: data.keywordCheckType || null,
      json_path_checks: data.jsonPathChecks?.length ? data.jsonPathChecks.map(check => ({
        path: check.path,
        operator: check.operator,
        expected_value: check.expectedValue,
      })) : null,
      header_checks: data.headerChecks?.length ? data.headerChecks.map(check => ({
        header_name: check.headerName,
        operator: check.operator,
        expected_value: check.expectedValue,
      })) : null,
    }),
  };
};