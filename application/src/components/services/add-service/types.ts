import { z } from "zod";
import type { ZodSchema } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

export interface JSONPathCheckFormData {
  path: string;
  operator: string;
  expectedValue: string;
}

export interface HeaderCheckFormData {
  headerName: string;
  operator: string;
  expectedValue: string;
}

export type ServiceFormData = {
  name: string;
  type: "http" | "ping" | "tcp" | "dns";
  url: string;
  port?: string;
  interval: string;
  retries: string;
  notificationStatus?: "enabled" | "disabled";
  notificationChannels?: string[];
  alertTemplate?: string;
  regionalMonitoringEnabled?: boolean;
  regionalAgents?: string[];
  // Content validation fields (HTTP only)
  expectedStatusCode?: string;
  keywordCheck?: string;
  keywordCheckType?: "contains" | "not_contains";
  jsonPathChecks?: JSONPathCheckFormData[];
  headerChecks?: HeaderCheckFormData[];
};

// Hook to use the schema with translations
export const useServiceSchema = () => {
  const { t } = useLanguage();
  return z.object({
      name: z.string().min(1, t("serviceNameRequired")),
      type: z.enum(["http", "ping", "tcp", "dns"]),
      url: z.string()
        .min(1, t("urlDomainHostRequired"))
        .refine(
          (value) => value.trim().length > 0,
          t("enterValidUrlHostnameDomain")
        ),
      port: z.string().optional(),
      interval: z.string(),
      retries: z.string(),
      notificationStatus: z.enum(["enabled", "disabled"]).optional(),
      notificationChannels: z.array(z.string()).optional(),
      alertTemplate: z.string().optional(),
      // Regional monitoring fields - now supports multiple agents
      regionalMonitoringEnabled: z.boolean().optional(),
      regionalAgents: z.array(z.string()).optional(),
      // Content validation fields (HTTP only)
      expectedStatusCode: z.string().optional(),
      keywordCheck: z.string().optional(),
      keywordCheckType: z.enum(["contains", "not_contains"]).optional(),
      jsonPathChecks: z.array(z.object({
        path: z.string(),
        operator: z.string(),
        expectedValue: z.string(),
      })).optional(),
      headerChecks: z.array(z.object({
        headerName: z.string(),
        operator: z.string(),
        expectedValue: z.string(),
      })).optional(),
    });
};