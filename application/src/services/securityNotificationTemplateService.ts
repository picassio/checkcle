import { pb } from "@/lib/pocketbase";

export interface SecurityNotificationTemplate {
  id: string;
  collectionId: string;
  collectionName: string;
  name: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  info: string;
  summary: string;
  placeholder: string;
  created: string;
  updated: string;
}

export interface CreateUpdateSecurityNotificationTemplateData {
  name: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  info: string;
  summary: string;
  placeholder: string;
}

export const securityNotificationTemplateService = {
  async getTemplates(): Promise<SecurityNotificationTemplate[]> {
    try {
      const response = await pb.collection('security_notification_templates').getList(1, 50, {
        sort: '-created',
      });
      return response.items as unknown as SecurityNotificationTemplate[];
    } catch (error) {
      console.error("Error fetching security notification templates:", error);
      throw error;
    }
  },

  async getTemplate(id: string): Promise<SecurityNotificationTemplate> {
    try {
      const response = await pb.collection('security_notification_templates').getOne(id);
      return response as unknown as SecurityNotificationTemplate;
    } catch (error) {
      console.error(`Error fetching security notification template with id ${id}:`, error);
      throw error;
    }
  },

  async createTemplate(data: CreateUpdateSecurityNotificationTemplateData): Promise<SecurityNotificationTemplate> {
    try {
      const response = await pb.collection('security_notification_templates').create(data);
      return response as unknown as SecurityNotificationTemplate;
    } catch (error) {
      console.error("Error creating security notification template:", error);
      throw error;
    }
  },

  async updateTemplate(id: string, data: Partial<CreateUpdateSecurityNotificationTemplateData>): Promise<SecurityNotificationTemplate> {
    try {
      const response = await pb.collection('security_notification_templates').update(id, data);
      return response as unknown as SecurityNotificationTemplate;
    } catch (error) {
      console.error(`Error updating security notification template with id ${id}:`, error);
      throw error;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await pb.collection('security_notification_templates').delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting security notification template with id ${id}:`, error);
      throw error;
    }
  }
};
