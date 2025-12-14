import { getAuthHeaders, getBaseUrl, validateEmail } from '../utils';
import { SettingsApiResponse } from '../types';

interface BrandingData {
  appName?: string;
  emailSenderName?: string;
  emailFooterText?: string;
}

const createEmailTemplate = (template: string, data: any, branding?: BrandingData): { subject: string; htmlBody: string } => {
  const appName = branding?.appName || data.appName || 'CheckCle';
  const senderName = branding?.emailSenderName || data.emailSenderName || `${appName} Monitoring System`;
  const footerText = branding?.emailFooterText || data.emailFooterText || `Sent from ${senderName}`;

  let subject = `Test Email from ${appName}`;
  let htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Test Email</h2>
          <p>This is a test email from your monitoring system.</p>
          <p>If you received this email, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            ${footerText}<br>
            Template: ${template}<br>
            ${data.collection ? `Collection: ${data.collection}` : ''}
          </p>
        </div>
      </body>
    </html>
  `;

  switch (template) {
    case 'verification':
      subject = `Email Verification Test - ${appName}`;
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">Email Verification Test</h2>
              <p>This is a test of the email verification template.</p>
              <p>If you received this email, your SMTP configuration is working correctly.</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Template:</strong> Verification Email</p>
                <p><strong>Collection:</strong> ${data.collection || '_superusers'}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">${footerText}</p>
            </div>
          </body>
        </html>
      `;
      break;
    case 'password-reset':
      subject = `Password Reset Test - ${appName}`;
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #f59e0b;">Password Reset Test</h2>
              <p>This is a test of the password reset template.</p>
              <p>If you received this email, your SMTP configuration is working correctly.</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Template:</strong> Password Reset Email</p>
                <p><strong>Collection:</strong> ${data.collection || '_superusers'}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">${footerText}</p>
            </div>
          </body>
        </html>
      `;
      break;
    case 'email-change':
      subject = `Email Change Confirmation Test - ${appName}`;
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #8b5cf6;">Email Change Confirmation Test</h2>
              <p>This is a test of the email change confirmation template.</p>
              <p>If you received this email, your SMTP configuration is working correctly.</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Template:</strong> Email Change Confirmation</p>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">${footerText}</p>
            </div>
          </body>
        </html>
      `;
      break;
  }

  return { subject, htmlBody };
};

export const testEmail = async (data: any): Promise<SettingsApiResponse> => {
  console.log('testEmail function called with data:', data);

  try {
    // Validate required fields
    if (!data || typeof data !== 'object') {
      console.log('Invalid request data - not object');
      return {
        status: 200,
        json: { success: false, message: 'Invalid request data' },
      };
    }

    if (!data.email || typeof data.email !== 'string') {
      console.log('Email address missing or invalid type');
      return {
        status: 200,
        json: { success: false, message: 'Email address is required and must be a string' },
      };
    }

    if (!validateEmail(data.email)) {
      console.log('Invalid email format:', data.email);
      return {
        status: 200,
        json: { success: false, message: 'Invalid email address format' },
      };
    }

    console.log('Email validation passed for:', data.email);

    const headers = getAuthHeaders();
    const baseUrl = getBaseUrl();

    // Get current SMTP settings first
    console.log('Fetching SMTP settings from:', `${baseUrl}/api/settings`);
    
    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers,
    });

    if (!settingsResponse.ok) {
      console.error('Failed to get SMTP settings, status:', settingsResponse.status);
      return {
        status: 200,
        json: { success: false, message: 'Failed to get SMTP settings' },
      };
    }

    const settingsData = await settingsResponse.json();
    console.log('Retrieved settings data:', settingsData);
    
    const smtpSettings = settingsData?.smtp;

    if (!smtpSettings || !smtpSettings.enabled) {
      console.log('SMTP not enabled or missing');
      return {
        status: 200,
        json: { success: false, message: 'SMTP is not enabled. Please enable and configure SMTP settings first.' },
      };
    }

    if (!smtpSettings.host || !smtpSettings.username) {
      console.log('SMTP configuration incomplete - missing host or username');
      return {
        status: 200,
        json: { success: false, message: 'SMTP configuration is incomplete. Please check host and username.' },
      };
    }

    // Extract branding from settings (stored in meta.branding)
    const branding = settingsData?.meta?.branding || settingsData?.branding;
    const brandingData: BrandingData = {
      appName: settingsData?.meta?.appName || settingsData?.system_name,
      emailSenderName: branding?.emailSenderName,
      emailFooterText: branding?.emailFooterText,
    };

    // Create test email content based on template
    const template = data.template || 'basic';
    const { subject, htmlBody } = createEmailTemplate(template, data, brandingData);

    console.log('Test email prepared successfully:', {
      to: data.email,
      subject: subject,
      template: template,
      smtpHost: smtpSettings.host,
      smtpPort: smtpSettings.port || 587
    });

    // Send actual email using the correct PocketBase API endpoint
    console.log('Sending actual email via PocketBase...');
    
    // Fix the payload structure to match PocketBase API expectations
    const emailPayload = {
      email: data.email,  // Use 'email' instead of 'to'
      template: template, // Add the template field
      subject: subject,
      html: htmlBody,
    };

    console.log('Email payload:', emailPayload);

    const emailResponse = await fetch(`${baseUrl}/api/settings/test/email`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email, status:', emailResponse.status);
      const errorText = await emailResponse.text();
      console.error('Email send error response:', errorText);
      return {
        status: 200,
        json: { success: false, message: 'Failed to send email. Please check your SMTP configuration.' },
      };
    }

    // Handle 204 No Content response (successful but no body)
    if (emailResponse.status === 204) {
      console.log('Email sent successfully (204 No Content)');
      return {
        status: 200,
        json: {
          success: true,
          message: `Test email sent successfully to ${data.email}`,
        },
      };
    }

    // For other successful responses, try to parse JSON
    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return {
      status: 200,
      json: {
        success: true,
        message: `Test email sent successfully to ${data.email}`,
      },
    };

  } catch (error) {
    console.error('Error in testEmail function:', error);
    return {
      status: 200,
      json: { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send test email. Please check your SMTP configuration.'
      },
    };
  }
};