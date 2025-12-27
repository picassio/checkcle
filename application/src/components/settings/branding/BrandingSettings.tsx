/**
 * BrandingSettings Component
 *
 * Settings page for customizing app branding, social links, and email branding.
 * Uses Modern Professional design system with semantic colored sections.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Palette,
  Link2,
  Mail,
  ShieldAlert,
  Image,
  Loader2,
  Github,
  Twitter,
  MessageCircle,
  BookOpen,
  Eye,
  EyeOff
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { brandingService, BrandingData } from "@/services/brandingService";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

const BrandingSettings: React.FC = () => {
  const { t } = useLanguage();
  const branding = useBranding();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");

  // Check if user is super admin
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === "superadmin";

  // Form state
  const [formData, setFormData] = useState<BrandingData>({
    appName: '',
    appDescription: '',
    logoUrl: null,
    faviconUrl: null,
    loginLogoUrl: null,
    showSidebarLogo: true,
    showLoginLogo: true,
    showSocialLinks: true,
    githubUrl: '',
    twitterUrl: '',
    discordUrl: '',
    docsUrl: '',
    showGithubLink: true,
    showTwitterLink: true,
    showDiscordLink: true,
    showDocsLink: true,
    showLoginSocialLinks: true,
    showHeaderSocialLinks: true,
    emailSenderName: '',
    emailFooterText: '',
  });

  // Initialize form data from branding context
  useEffect(() => {
    if (branding && isSuperAdmin) {
      setFormData({
        appName: branding.appName || 'CheckCle',
        appDescription: branding.appDescription || '',
        logoUrl: branding.logoUrl || null,
        faviconUrl: branding.faviconUrl || null,
        loginLogoUrl: branding.loginLogoUrl || null,
        showSidebarLogo: branding.showSidebarLogo ?? true,
        showLoginLogo: branding.showLoginLogo ?? true,
        showSocialLinks: branding.showSocialLinks ?? true,
        githubUrl: branding.githubUrl || 'https://github.com/operacle/checkcle',
        twitterUrl: branding.twitterUrl || 'https://x.com/checkcle_oss',
        discordUrl: branding.discordUrl || 'https://discord.gg/xs9gbubGwX',
        docsUrl: branding.docsUrl || 'https://docs.checkcle.io',
        showGithubLink: branding.showGithubLink ?? true,
        showTwitterLink: branding.showTwitterLink ?? true,
        showDiscordLink: branding.showDiscordLink ?? true,
        showDocsLink: branding.showDocsLink ?? true,
        showLoginSocialLinks: branding.showLoginSocialLinks ?? true,
        showHeaderSocialLinks: branding.showHeaderSocialLinks ?? true,
        emailSenderName: branding.emailSenderName || 'CheckCle Monitoring System',
        emailFooterText: branding.emailFooterText || 'Sent from CheckCle Monitoring System',
      });
    }
  }, [branding, isSuperAdmin]);

  const handleInputChange = (field: string, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await brandingService.saveBranding(formData);

      setIsEditing(false);

      // Refresh branding context
      await branding.refetch();

      toast({
        title: t("settingsUpdated", "settings"),
        description: t("brandingSettingsSaved", "settings") || "Branding settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving branding settings:", error);
      toast({
        title: t("errorSavingSettings", "settings"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data from branding context
    if (branding) {
      setFormData({
        appName: branding.appName || 'CheckCle',
        appDescription: branding.appDescription || '',
        logoUrl: branding.logoUrl || null,
        faviconUrl: branding.faviconUrl || null,
        loginLogoUrl: branding.loginLogoUrl || null,
        showSidebarLogo: branding.showSidebarLogo ?? true,
        showLoginLogo: branding.showLoginLogo ?? true,
        showSocialLinks: branding.showSocialLinks ?? true,
        githubUrl: branding.githubUrl || 'https://github.com/operacle/checkcle',
        twitterUrl: branding.twitterUrl || 'https://x.com/checkcle_oss',
        discordUrl: branding.discordUrl || 'https://discord.gg/xs9gbubGwX',
        docsUrl: branding.docsUrl || 'https://docs.checkcle.io',
        showGithubLink: branding.showGithubLink ?? true,
        showTwitterLink: branding.showTwitterLink ?? true,
        showDiscordLink: branding.showDiscordLink ?? true,
        showDocsLink: branding.showDocsLink ?? true,
        showLoginSocialLinks: branding.showLoginSocialLinks ?? true,
        showHeaderSocialLinks: branding.showHeaderSocialLinks ?? true,
        emailSenderName: branding.emailSenderName || 'CheckCle Monitoring System',
        emailFooterText: branding.emailFooterText || 'Sent from CheckCle Monitoring System',
      });
    }
  };

  // Show permission notice for non-super admin users
  if (!isSuperAdmin) {
    return (
      <div className="p-3 sm:p-4">
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              {t("brandingSettings", "menu")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800/50">
              <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <span className="font-medium">{t("permissionNotice", "settings")}</span> {t("brandingPermissionNotice", "settings")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                {t("brandingSettings", "menu")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("brandingSettingsDesc", "settings")}
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} size="sm" className="w-full sm:w-auto">
                {t("edit", "common")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto p-1 grid grid-cols-3 gap-1 mb-6">
              <TabsTrigger
                value="appearance"
                className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
              >
                <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
                  <Image className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                  {t("appearance", "settings")}
                </span>
                <span className="text-xs font-medium xs:hidden">Look</span>
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
              >
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                  <Link2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                  {t("socialLinks", "settings")}
                </span>
                <span className="text-xs font-medium xs:hidden">Links</span>
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
              >
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30">
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                  {t("emailBranding", "settings")}
                </span>
                <span className="text-xs font-medium xs:hidden">Email</span>
              </TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              {/* App Identity Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    App Identity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName" className="text-sm font-medium">
                      {t("appName", "settings")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="appName"
                      value={formData.appName}
                      onChange={(e) => handleInputChange('appName', e.target.value)}
                      disabled={!isEditing}
                      placeholder="CheckCle"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("appNameDesc", "settings")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl" className="text-sm font-medium">
                      {t("faviconUrl", "settings")}
                    </Label>
                    <Input
                      id="faviconUrl"
                      value={formData.faviconUrl || ''}
                      onChange={(e) => handleInputChange('faviconUrl', e.target.value || null)}
                      disabled={!isEditing}
                      placeholder="https://example.com/favicon.ico"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("faviconUrlDesc", "settings")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appDescription" className="text-sm font-medium">
                    {t("appDescription", "settings")}
                  </Label>
                  <Textarea
                    id="appDescription"
                    value={formData.appDescription}
                    onChange={(e) => handleInputChange('appDescription', e.target.value)}
                    disabled={!isEditing}
                    placeholder="An open-source monitoring platform..."
                    rows={3}
                    className="bg-white dark:bg-slate-900 resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("appDescriptionDesc", "settings")}
                  </p>
                </div>
              </div>

              {/* Logo Settings Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Logo Settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sidebar Logo */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logoUrl" className="text-sm font-medium">
                        {t("sidebarLogoUrl", "settings")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formData.showSidebarLogo ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </span>
                        <Switch
                          checked={formData.showSidebarLogo}
                          onCheckedChange={(checked) => handleInputChange('showSidebarLogo', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <Input
                      id="logoUrl"
                      value={formData.logoUrl || ''}
                      onChange={(e) => handleInputChange('logoUrl', e.target.value || null)}
                      disabled={!isEditing || !formData.showSidebarLogo}
                      placeholder="https://example.com/logo.png"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("sidebarLogoUrlDesc", "settings")}
                    </p>
                  </div>

                  {/* Login Logo */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="loginLogoUrl" className="text-sm font-medium">
                        {t("loginLogoUrl", "settings")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formData.showLoginLogo ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </span>
                        <Switch
                          checked={formData.showLoginLogo}
                          onCheckedChange={(checked) => handleInputChange('showLoginLogo', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <Input
                      id="loginLogoUrl"
                      value={formData.loginLogoUrl || ''}
                      onChange={(e) => handleInputChange('loginLogoUrl', e.target.value || null)}
                      disabled={!isEditing || !formData.showLoginLogo}
                      placeholder="https://example.com/login-logo.svg"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("loginLogoUrlDesc", "settings")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {(formData.logoUrl || formData.loginLogoUrl) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("preview", "settings")}
                    </h4>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900">
                    <div className="flex flex-wrap gap-8">
                      {formData.logoUrl && formData.showSidebarLogo && (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            {t("sidebarLogo", "settings")}
                          </p>
                          <div className="h-12 w-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600">
                            <img
                              src={formData.logoUrl}
                              alt="Sidebar logo"
                              className="h-8 w-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {formData.loginLogoUrl && formData.showLoginLogo && (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            {t("loginLogo", "settings")}
                          </p>
                          <img
                            src={formData.loginLogoUrl}
                            alt="Login logo"
                            className="h-16 w-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Social Links Tab */}
            <TabsContent value="links" className="space-y-6 mt-0">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("showSocialLinks", "settings")}</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("showSocialLinksDesc", "settings")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.showSocialLinks}
                  onCheckedChange={(checked) => handleInputChange('showSocialLinks', checked)}
                  disabled={!isEditing}
                />
              </div>

              {formData.showSocialLinks && (
                <>
                  {/* Platform Links */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Platform Links
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* GitHub */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700">
                              <Github className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            </div>
                            <Label htmlFor="githubUrl" className="text-sm font-medium">
                              {t("githubUrl", "settings")}
                            </Label>
                          </div>
                          <Switch
                            checked={formData.showGithubLink}
                            onCheckedChange={(checked) => handleInputChange('showGithubLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                        <Input
                          id="githubUrl"
                          value={formData.githubUrl}
                          onChange={(e) => handleInputChange('githubUrl', e.target.value)}
                          disabled={!isEditing || !formData.showGithubLink}
                          placeholder="https://github.com/..."
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>

                      {/* Twitter/X */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-900/30">
                              <Twitter className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            </div>
                            <Label htmlFor="twitterUrl" className="text-sm font-medium">
                              {t("twitterUrl", "settings")}
                            </Label>
                          </div>
                          <Switch
                            checked={formData.showTwitterLink}
                            onCheckedChange={(checked) => handleInputChange('showTwitterLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                        <Input
                          id="twitterUrl"
                          value={formData.twitterUrl}
                          onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                          disabled={!isEditing || !formData.showTwitterLink}
                          placeholder="https://x.com/..."
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>

                      {/* Discord */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                              <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <Label htmlFor="discordUrl" className="text-sm font-medium">
                              {t("discordUrl", "settings")}
                            </Label>
                          </div>
                          <Switch
                            checked={formData.showDiscordLink}
                            onCheckedChange={(checked) => handleInputChange('showDiscordLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                        <Input
                          id="discordUrl"
                          value={formData.discordUrl}
                          onChange={(e) => handleInputChange('discordUrl', e.target.value)}
                          disabled={!isEditing || !formData.showDiscordLink}
                          placeholder="https://discord.gg/..."
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>

                      {/* Documentation */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                              <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <Label htmlFor="docsUrl" className="text-sm font-medium">
                              {t("docsUrl", "settings")}
                            </Label>
                          </div>
                          <Switch
                            checked={formData.showDocsLink}
                            onCheckedChange={(checked) => handleInputChange('showDocsLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                        <Input
                          id="docsUrl"
                          value={formData.docsUrl}
                          onChange={(e) => handleInputChange('docsUrl', e.target.value)}
                          disabled={!isEditing || !formData.showDocsLink}
                          placeholder="https://docs.example.com"
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Link Visibility */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("linkVisibility", "settings")}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="pr-4">
                          <Label className="text-sm font-medium">{t("showLoginSocialLinks", "settings")}</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t("showLoginSocialLinksDesc", "settings")}
                          </p>
                        </div>
                        <Switch
                          checked={formData.showLoginSocialLinks}
                          onCheckedChange={(checked) => handleInputChange('showLoginSocialLinks', checked)}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="pr-4">
                          <Label className="text-sm font-medium">{t("showHeaderSocialLinks", "settings")}</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t("showHeaderSocialLinksDesc", "settings")}
                          </p>
                        </div>
                        <Switch
                          checked={formData.showHeaderSocialLinks}
                          onCheckedChange={(checked) => handleInputChange('showHeaderSocialLinks', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Email Branding Tab */}
            <TabsContent value="email" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailSenderName" className="text-sm font-medium">
                      {t("emailSenderName", "settings")}
                    </Label>
                    <Input
                      id="emailSenderName"
                      value={formData.emailSenderName}
                      onChange={(e) => handleInputChange('emailSenderName', e.target.value)}
                      disabled={!isEditing}
                      placeholder="CheckCle Monitoring System"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("emailSenderNameBrandingDesc", "settings")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailFooterText" className="text-sm font-medium">
                      {t("emailFooterText", "settings")}
                    </Label>
                    <Textarea
                      id="emailFooterText"
                      value={formData.emailFooterText}
                      onChange={(e) => handleInputChange('emailFooterText', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Sent from CheckCle Monitoring System"
                      rows={2}
                      className="bg-white dark:bg-slate-900 resize-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("emailFooterTextDesc", "settings")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("emailPreview", "settings")}
                  </h3>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  {/* Email Header */}
                  <div className="bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                        <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">From</p>
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
                          {formData.emailSenderName || 'CheckCle Monitoring System'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="p-5 bg-white dark:bg-slate-900">
                    <div className="text-sm text-slate-500 dark:text-slate-400 italic py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      [Email content will appear here...]
                    </div>
                  </div>

                  {/* Email Footer */}
                  <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      {formData.emailFooterText || 'Sent from CheckCle Monitoring System'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {t("cancel", "common")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? t("saving", "settings") : t("save", "settings")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandingSettings;
