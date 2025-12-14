
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsService } from '@/services/settingsService';

export interface BrandingSettings {
  // Basic branding
  appName: string;
  appDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginLogoUrl: string | null;

  // Social links (can be hidden/shown)
  showSocialLinks: boolean;
  githubUrl: string;
  twitterUrl: string;
  discordUrl: string;
  docsUrl: string;

  // Visibility toggles
  showGithubLink: boolean;
  showTwitterLink: boolean;
  showDiscordLink: boolean;
  showDocsLink: boolean;
  showLoginSocialLinks: boolean;
  showHeaderSocialLinks: boolean;

  // Email branding
  emailSenderName: string;
  emailFooterText: string;
}

interface BrandingContextType extends BrandingSettings {
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  appName: 'CheckCle',
  appDescription: 'An open-source monitoring platform offering real-time insights into server and service health, incident management, and operational transparency.',
  logoUrl: null,
  faviconUrl: null,
  loginLogoUrl: null,

  showSocialLinks: true,
  githubUrl: 'https://github.com/operacle/checkcle',
  twitterUrl: 'https://x.com/checkcle_oss',
  discordUrl: 'https://discord.gg/xs9gbubGwX',
  docsUrl: 'https://docs.checkcle.io',

  showGithubLink: true,
  showTwitterLink: true,
  showDiscordLink: true,
  showDocsLink: true,
  showLoginSocialLinks: true,
  showHeaderSocialLinks: true,

  emailSenderName: 'CheckCle Monitoring System',
  emailFooterText: 'Sent from CheckCle Monitoring System',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const settings = await settingsService.getGeneralSettings();

      if (settings) {
        setBranding({
          appName: settings.meta?.appName || settings.system_name || defaultBranding.appName,
          appDescription: settings.branding?.appDescription || defaultBranding.appDescription,
          logoUrl: settings.branding?.logoUrl || settings.logo_url || null,
          faviconUrl: settings.branding?.faviconUrl || null,
          loginLogoUrl: settings.branding?.loginLogoUrl || null,

          showSocialLinks: settings.branding?.showSocialLinks ?? defaultBranding.showSocialLinks,
          githubUrl: settings.branding?.githubUrl || defaultBranding.githubUrl,
          twitterUrl: settings.branding?.twitterUrl || defaultBranding.twitterUrl,
          discordUrl: settings.branding?.discordUrl || defaultBranding.discordUrl,
          docsUrl: settings.branding?.docsUrl || defaultBranding.docsUrl,

          showGithubLink: settings.branding?.showGithubLink ?? defaultBranding.showGithubLink,
          showTwitterLink: settings.branding?.showTwitterLink ?? defaultBranding.showTwitterLink,
          showDiscordLink: settings.branding?.showDiscordLink ?? defaultBranding.showDiscordLink,
          showDocsLink: settings.branding?.showDocsLink ?? defaultBranding.showDocsLink,
          showLoginSocialLinks: settings.branding?.showLoginSocialLinks ?? defaultBranding.showLoginSocialLinks,
          showHeaderSocialLinks: settings.branding?.showHeaderSocialLinks ?? defaultBranding.showHeaderSocialLinks,

          emailSenderName: settings.branding?.emailSenderName || defaultBranding.emailSenderName,
          emailFooterText: settings.branding?.emailFooterText || defaultBranding.emailFooterText,
        });

        // Update document title
        document.title = settings.meta?.appName || settings.system_name || defaultBranding.appName;

        // Update favicon if custom one is provided
        if (settings.branding?.faviconUrl) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = settings.branding.faviconUrl;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const value: BrandingContextType = {
    ...branding,
    isLoading,
    refetch: fetchBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

// Hook for checking if we should use branding (for conditional rendering)
export const useBrandingReady = () => {
  const context = useContext(BrandingContext);
  return context !== undefined && !context.isLoading;
};
