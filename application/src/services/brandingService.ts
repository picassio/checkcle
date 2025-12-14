import { pb } from "@/lib/pocketbase";

export interface BrandingData {
  appName: string;
  appDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginLogoUrl: string | null;
  showSidebarLogo: boolean;
  showLoginLogo: boolean;
  showSocialLinks: boolean;
  githubUrl: string;
  twitterUrl: string;
  discordUrl: string;
  docsUrl: string;
  showGithubLink: boolean;
  showTwitterLink: boolean;
  showDiscordLink: boolean;
  showDocsLink: boolean;
  showLoginSocialLinks: boolean;
  showHeaderSocialLinks: boolean;
  emailSenderName: string;
  emailFooterText: string;
}

interface DataSettingsRecord {
  id: string;
  retention_days?: number;
  server_retention_days?: number;
  uptime_retention_days?: number;
  backup?: string;
  branding?: BrandingData;
  created: string;
  updated: string;
}

export const brandingService = {
  /**
   * Get the first data_settings record (there should be only one)
   */
  async getDataSettingsRecord(): Promise<DataSettingsRecord | null> {
    try {
      const records = await pb.collection('data_settings').getList<DataSettingsRecord>(1, 1);
      if (records.items.length > 0) {
        return records.items[0];
      }
      return null;
    } catch (error) {
      console.error('[brandingService] Error fetching data_settings:', error);
      return null;
    }
  },

  /**
   * Get branding settings from data_settings collection
   */
  async getBranding(): Promise<BrandingData | null> {
    try {
      const record = await this.getDataSettingsRecord();
      if (record) {
        return record.branding || null;
      }
      return null;
    } catch (error) {
      console.error('[brandingService] Error fetching branding:', error);
      return null;
    }
  },

  /**
   * Save branding settings to data_settings collection
   */
  async saveBranding(branding: BrandingData): Promise<BrandingData | null> {
    try {
      const existingRecord = await this.getDataSettingsRecord();
      let record: DataSettingsRecord;

      if (existingRecord) {
        record = await pb.collection('data_settings').update<DataSettingsRecord>(existingRecord.id, {
          branding: branding
        });
      } else {
        record = await pb.collection('data_settings').create<DataSettingsRecord>({
          branding: branding
        });
      }

      return record.branding || null;
    } catch (error) {
      console.error('[brandingService] Error saving branding:', error);
      throw error;
    }
  },

  /**
   * Get app name from PocketBase system settings (meta.appName)
   */
  async getAppName(): Promise<string> {
    try {
      const response = await fetch(`${pb.baseUrl}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${pb.authStore.token}`
        }
      });
      if (response.ok) {
        const settings = await response.json();
        return settings.meta?.appName || 'CheckCle';
      }
    } catch (error) {
      console.error('[brandingService] Error fetching app name:', error);
    }
    return 'CheckCle';
  }
};
