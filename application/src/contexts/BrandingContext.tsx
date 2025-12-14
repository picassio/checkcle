import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandingService, BrandingData } from '@/services/brandingService';

export interface BrandingSettings {
  // Basic branding
  appName: string;
  appDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginLogoUrl: string | null;

  // Logo visibility toggles
  showSidebarLogo: boolean;
  showLoginLogo: boolean;

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

  showSidebarLogo: true,
  showLoginLogo: true,

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

      // Fetch branding from data_settings collection
      const brandingData = await brandingService.getBranding();

      // Fetch app name from PocketBase system settings
      const appName = await brandingService.getAppName();

      if (brandingData) {
        setBranding({
          appName: brandingData.appName || appName || defaultBranding.appName,
          appDescription: brandingData.appDescription || defaultBranding.appDescription,
          logoUrl: brandingData.logoUrl || null,
          faviconUrl: brandingData.faviconUrl || null,
          loginLogoUrl: brandingData.loginLogoUrl || null,

          showSidebarLogo: brandingData.showSidebarLogo ?? defaultBranding.showSidebarLogo,
          showLoginLogo: brandingData.showLoginLogo ?? defaultBranding.showLoginLogo,

          showSocialLinks: brandingData.showSocialLinks ?? defaultBranding.showSocialLinks,
          githubUrl: brandingData.githubUrl || defaultBranding.githubUrl,
          twitterUrl: brandingData.twitterUrl || defaultBranding.twitterUrl,
          discordUrl: brandingData.discordUrl || defaultBranding.discordUrl,
          docsUrl: brandingData.docsUrl || defaultBranding.docsUrl,

          showGithubLink: brandingData.showGithubLink ?? defaultBranding.showGithubLink,
          showTwitterLink: brandingData.showTwitterLink ?? defaultBranding.showTwitterLink,
          showDiscordLink: brandingData.showDiscordLink ?? defaultBranding.showDiscordLink,
          showDocsLink: brandingData.showDocsLink ?? defaultBranding.showDocsLink,
          showLoginSocialLinks: brandingData.showLoginSocialLinks ?? defaultBranding.showLoginSocialLinks,
          showHeaderSocialLinks: brandingData.showHeaderSocialLinks ?? defaultBranding.showHeaderSocialLinks,

          emailSenderName: brandingData.emailSenderName || defaultBranding.emailSenderName,
          emailFooterText: brandingData.emailFooterText || defaultBranding.emailFooterText,
        });

        // Update document title
        document.title = brandingData.appName || appName || defaultBranding.appName;

        // Update favicon if custom one is provided
        if (brandingData.faviconUrl) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = brandingData.faviconUrl;
          }
        }
      } else {
        // No branding saved yet, use app name from system settings
        setBranding({
          ...defaultBranding,
          appName: appName || defaultBranding.appName,
        });
        document.title = appName || defaultBranding.appName;
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
