
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { AlertConfiguration, alertConfigService } from "@/services/alertConfigService";
import { WebhookConfiguration, webhookService } from "@/services/webhookService";
import { NotificationChannelDialog } from "./NotificationChannelDialog";
import { NotificationChannelList } from "./NotificationChannelList";
import { pb } from "@/lib/pocketbase";
import { useLanguage } from "@/contexts/LanguageContext";

interface CombinedChannel extends Partial<AlertConfiguration> {
  isWebhook?: boolean;
  url?: string;
  method?: string;
  description?: string;
}

const NotificationSettings = () => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfiguration[]>([]);
  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfiguration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("all");
  const [editingConfig, setEditingConfig] = useState<AlertConfiguration | null>(null);

  const fetchNotificationChannels = async () => {
    setIsLoading(true);
    try {
      // Fetch alert configurations
      const configs = await alertConfigService.getAlertConfigurations();
      setAlertConfigs(configs);

      // Fetch webhooks
      try {
        const webhookResponse = await pb.collection('webhook').getList(1, 50);
        setWebhookConfigs(webhookResponse.items as WebhookConfiguration[]);
      } catch (webhookError) {
        setWebhookConfigs([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationChannels();
  }, []);

  const handleAddNew = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = (config: AlertConfiguration) => {
    setEditingConfig(config);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if it's a webhook first
    const isWebhook = webhookConfigs.find(w => w.id === id);
    
    if (isWebhook) {
      // Handle webhook deletion
      if (confirm("Are you sure you want to delete this webhook?")) {
        try {
          await pb.collection('webhook').delete(id);
          fetchNotificationChannels();
        } catch (error) {
          console.error("Error deleting webhook:", error);
        }
      }
    } else {
      // Handle alert config deletion
      const success = await alertConfigService.deleteAlertConfiguration(id);
      if (success) {
        fetchNotificationChannels();
      }
    }
  };

  const handleDialogClose = (refreshList: boolean) => {
    setDialogOpen(false);
    if (refreshList) {
      fetchNotificationChannels();
    }
  };

  const getCombinedChannels = (): CombinedChannel[] => {
    const combined: CombinedChannel[] = [];
    
    // Add alert configurations
    alertConfigs.forEach(config => {
      combined.push(config);
    });
    
    // Add webhooks as notification channels
    webhookConfigs.forEach(webhook => {
      combined.push({
        id: webhook.id,
        notify_name: webhook.name,
        notification_type: "webhook" as const,
        enabled: webhook.enabled === "on",
        created: webhook.created,
        updated: webhook.updated,
        isWebhook: true,
        url: webhook.url,
        method: webhook.method,
        description: webhook.description
      });
    });
    
    return combined;
  };

  const getFilteredConfigs = () => {
    const combined = getCombinedChannels();
    if (currentTab === "all") return combined;
    return combined.filter(config => config.notification_type === currentTab);
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg md:text-xl">{t("titleNotification")}</CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1">
              {t("descriptionChannelsServices")}
            </CardDescription>
          </div>
          <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> {t("addChannel")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="mb-4 inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-8">
              <TabsTrigger value="all" className="text-xs md:text-sm whitespace-nowrap">{t("all")}</TabsTrigger>
              <TabsTrigger value="telegram" className="text-xs md:text-sm whitespace-nowrap">{t("telegram")}</TabsTrigger>
              <TabsTrigger value="discord" className="text-xs md:text-sm whitespace-nowrap">{t("discord")}</TabsTrigger>
              <TabsTrigger value="slack" className="text-xs md:text-sm whitespace-nowrap">{t("slack")}</TabsTrigger>
              <TabsTrigger value="signal" className="text-xs md:text-sm whitespace-nowrap">{t("signal")}</TabsTrigger>
              <TabsTrigger value="google_chat" className="text-xs md:text-sm whitespace-nowrap">{t("googleChat")}</TabsTrigger>
              <TabsTrigger value="email" className="text-xs md:text-sm whitespace-nowrap">{t("email")}</TabsTrigger>
              <TabsTrigger value="webhook" className="text-xs md:text-sm whitespace-nowrap">{t("webhook")}</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={currentTab} className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <NotificationChannelList 
                channels={getFilteredConfigs()} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <NotificationChannelDialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        editingConfig={editingConfig}
      />
    </Card>
  );
};

export default NotificationSettings;