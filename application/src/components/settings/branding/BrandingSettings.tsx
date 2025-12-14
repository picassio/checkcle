import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette, Link, Mail, ShieldAlert, Image, Loader2 } from "lucide-react";
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
      <div className="p-3 md:p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("brandingSettings", "menu")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
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
    <div className="p-3 md:p-4">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("brandingSettings", "menu")}
          </CardTitle>
          <CardDescription>{t("brandingSettingsDesc", "settings")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-3 mb-4">
                <TabsTrigger value="appearance" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("appearance", "settings")}</span>
                  <span className="sm:hidden">Look</span>
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Link className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("socialLinks", "settings")}</span>
                  <span className="sm:hidden">Links</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("emailBranding", "settings")}</span>
                  <span className="sm:hidden">Email</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">{t("appName", "settings")} *</Label>
                  <Input
                    id="appName"
                    value={formData.appName}
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="CheckCle"
                  />
                  <p className="text-xs text-muted-foreground">{t("appNameDesc", "settings")}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="logoUrl">{t("sidebarLogoUrl", "settings")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
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
                  />
                  <p className="text-xs text-muted-foreground">{t("sidebarLogoUrlDesc", "settings")}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loginLogoUrl">{t("loginLogoUrl", "settings")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
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
                  />
                  <p className="text-xs text-muted-foreground">{t("loginLogoUrlDesc", "settings")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">{t("faviconUrl", "settings")}</Label>
                  <Input
                    id="faviconUrl"
                    value={formData.faviconUrl || ''}
                    onChange={(e) => handleInputChange('faviconUrl', e.target.value || null)}
                    disabled={!isEditing}
                    placeholder="https://example.com/favicon.ico"
                  />
                  <p className="text-xs text-muted-foreground">{t("faviconUrlDesc", "settings")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appDescription">{t("appDescription", "settings")}</Label>
                <Textarea
                  id="appDescription"
                  value={formData.appDescription}
                  onChange={(e) => handleInputChange('appDescription', e.target.value)}
                  disabled={!isEditing}
                  placeholder="An open-source monitoring platform..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{t("appDescriptionDesc", "settings")}</p>
              </div>

              {/* Preview */}
              {(formData.logoUrl || formData.loginLogoUrl) && (
                <div className="border rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">{t("preview", "settings")}</h4>
                  <div className="flex flex-wrap gap-6">
                    {formData.logoUrl && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">{t("sidebarLogo", "settings")}</p>
                        <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center">
                          <img src={formData.logoUrl} alt="Sidebar logo" className="h-6 w-6" />
                        </div>
                      </div>
                    )}
                    {formData.loginLogoUrl && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">{t("loginLogo", "settings")}</p>
                        <img src={formData.loginLogoUrl} alt="Login logo" className="h-16 w-auto" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Social Links Tab */}
            <TabsContent value="links" className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>{t("showSocialLinks", "settings")}</Label>
                  <p className="text-xs text-muted-foreground">{t("showSocialLinksDesc", "settings")}</p>
                </div>
                <Switch
                  checked={formData.showSocialLinks}
                  onCheckedChange={(checked) => handleInputChange('showSocialLinks', checked)}
                  disabled={!isEditing}
                />
              </div>

              {formData.showSocialLinks && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="githubUrl">{t("githubUrl", "settings")}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
                          <Switch
                            checked={formData.showGithubLink}
                            onCheckedChange={(checked) => handleInputChange('showGithubLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <Input
                        id="githubUrl"
                        value={formData.githubUrl}
                        onChange={(e) => handleInputChange('githubUrl', e.target.value)}
                        disabled={!isEditing}
                        placeholder="https://github.com/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="twitterUrl">{t("twitterUrl", "settings")}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
                          <Switch
                            checked={formData.showTwitterLink}
                            onCheckedChange={(checked) => handleInputChange('showTwitterLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <Input
                        id="twitterUrl"
                        value={formData.twitterUrl}
                        onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                        disabled={!isEditing}
                        placeholder="https://x.com/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="discordUrl">{t("discordUrl", "settings")}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
                          <Switch
                            checked={formData.showDiscordLink}
                            onCheckedChange={(checked) => handleInputChange('showDiscordLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <Input
                        id="discordUrl"
                        value={formData.discordUrl}
                        onChange={(e) => handleInputChange('discordUrl', e.target.value)}
                        disabled={!isEditing}
                        placeholder="https://discord.gg/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="docsUrl">{t("docsUrl", "settings")}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("show", "common")}</span>
                          <Switch
                            checked={formData.showDocsLink}
                            onCheckedChange={(checked) => handleInputChange('showDocsLink', checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <Input
                        id="docsUrl"
                        value={formData.docsUrl}
                        onChange={(e) => handleInputChange('docsUrl', e.target.value)}
                        disabled={!isEditing}
                        placeholder="https://docs.example.com"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3">{t("linkVisibility", "settings")}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label>{t("showLoginSocialLinks", "settings")}</Label>
                          <p className="text-xs text-muted-foreground">{t("showLoginSocialLinksDesc", "settings")}</p>
                        </div>
                        <Switch
                          checked={formData.showLoginSocialLinks}
                          onCheckedChange={(checked) => handleInputChange('showLoginSocialLinks', checked)}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label>{t("showHeaderSocialLinks", "settings")}</Label>
                          <p className="text-xs text-muted-foreground">{t("showHeaderSocialLinksDesc", "settings")}</p>
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
            <TabsContent value="email" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailSenderName">{t("emailSenderName", "settings")}</Label>
                  <Input
                    id="emailSenderName"
                    value={formData.emailSenderName}
                    onChange={(e) => handleInputChange('emailSenderName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="CheckCle Monitoring System"
                  />
                  <p className="text-xs text-muted-foreground">{t("emailSenderNameBrandingDesc", "settings")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailFooterText">{t("emailFooterText", "settings")}</Label>
                  <Textarea
                    id="emailFooterText"
                    value={formData.emailFooterText}
                    onChange={(e) => handleInputChange('emailFooterText', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Sent from CheckCle Monitoring System"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">{t("emailFooterTextDesc", "settings")}</p>
                </div>
              </div>

              {/* Email Preview */}
              <div className="border rounded-lg p-4 mt-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-3">{t("emailPreview", "settings")}</h4>
                <div className="bg-background rounded border p-4 text-sm">
                  <div className="border-b pb-2 mb-3">
                    <p className="text-xs text-muted-foreground">From:</p>
                    <p className="font-medium">{formData.emailSenderName || 'CheckCle Monitoring System'}</p>
                  </div>
                  <div className="text-muted-foreground text-xs italic">
                    [Email content here...]
                  </div>
                  <div className="border-t pt-2 mt-3 text-xs text-muted-foreground">
                    {formData.emailFooterText || 'Sent from CheckCle Monitoring System'}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {isEditing && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving} className="w-full sm:w-auto">
                {t("cancel", "common")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? t("saving", "settings") : t("save", "settings")}
              </Button>
            </div>
          )}
        </CardContent>

        {!isEditing && (
          <CardFooter className="p-4 md:p-6 pt-0 md:pt-0">
            <Button onClick={() => setIsEditing(true)}>
              {t("edit", "common")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default BrandingSettings;
