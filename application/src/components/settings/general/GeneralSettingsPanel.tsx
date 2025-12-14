import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Mail, ShieldAlert } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { GeneralSettings } from "@/services/settingsService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import SystemSettingsTab from './SystemSettingsTab';
import MailSettingsTab from './MailSettingsTab';
import { GeneralSettingsPanelProps } from './types';

const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = () => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  
  // Get current user to check permissions
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === "superadmin";
  
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    isUpdating,
  } = useSystemSettings();

  const form = useForm<GeneralSettings>({
    defaultValues: {
      meta: {
        appName: '',
        appURL: '',
        senderName: '',
        senderAddress: '',
        hideControls: false
      },
      smtp: {
        enabled: false,
        port: 587,
        host: '',
        username: '',
        password: '',
        authMethod: '',
        tls: true,
        localName: ''
      }
    }
  });

  useEffect(() => {
    if (settings && isSuperAdmin) {
      // Initialize form with existing settings, using system_name for appName if meta.appName is not set
      const appName = settings.meta?.appName || settings.system_name || '';
      
      form.reset({
        ...settings,
        meta: {
          appName: appName,
          appURL: settings.meta?.appURL || '',
          senderName: settings.meta?.senderName || '',
          senderAddress: settings.meta?.senderAddress || '',
          hideControls: settings.meta?.hideControls || false
        },
        smtp: settings.smtp || {
          enabled: false,
          port: 587,
          host: '',
          username: '',
          password: '',
          authMethod: '',
          tls: true,
          localName: ''
        }
      });
    }
  }, [settings, form, isSuperAdmin]);

  const handleSave = async (formData: GeneralSettings) => {
    try {
      // Prepare data for PocketBase settings update (no ID needed)
      const dataToSave = {
        ...formData,
        system_name: formData.meta?.appName || settings?.system_name
      };
      
      console.log('Saving settings data:', dataToSave);
      await updateSettings(dataToSave);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleEditClick = () => {
    console.log('Edit button clicked, setting isEditing to true');
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    console.log('Cancel button clicked, setting isEditing to false');
    setIsEditing(false);
    // Reset form to original values
    if (settings) {
      const appName = settings.meta?.appName || settings.system_name || '';
      form.reset({
        ...settings,
        meta: {
          appName: appName,
          appURL: settings.meta?.appURL || '',
          senderName: settings.meta?.senderName || '',
          senderAddress: settings.meta?.senderAddress || '',
          hideControls: settings.meta?.hideControls || false
        },
        smtp: settings.smtp || {
          enabled: false,
          port: 587,
          host: '',
          username: '',
          password: '',
          authMethod: '',
          tls: true,
          localName: ''
        }
      });
    }
  };

  // Show permission notice for admin users
  if (!isSuperAdmin) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("generalSettings", "menu")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <span className="font-medium">{t("permissionNotice")}</span> {t("permissionNoticeAddUser")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">{t("loadingSettings")}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{t("loadingSettingsError")}</div>;
  }

  return (
    <div className="p-3 md:p-4">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">{t("generalSettings", "menu")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full mb-4 grid grid-cols-2">
                  <TabsTrigger value="system" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("systemSettings", "settings")}</span>
                    <span className="sm:hidden">System</span>
                  </TabsTrigger>
                  <TabsTrigger value="mail" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("mailSettings", "settings")}</span>
                    <span className="sm:hidden">Mail</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="system">
                  <SystemSettingsTab 
                    form={form} 
                    isEditing={isEditing} 
                    settings={settings} 
                  />
                </TabsContent>
                
                <TabsContent value="mail">
                  <MailSettingsTab 
                    form={form} 
                    isEditing={isEditing} 
                    settings={settings}
                  />
                </TabsContent>
              </Tabs>
              
              {isEditing && (
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isUpdating} className="w-full sm:w-auto">
                    {t("cancel", "common")}
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                    {isUpdating ? t("saving", "settings") : t("save", "settings")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        
        {!isEditing && (
          <CardFooter>
            <Button type="button" onClick={handleEditClick}>
              {t("edit", "common")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default GeneralSettingsPanel;