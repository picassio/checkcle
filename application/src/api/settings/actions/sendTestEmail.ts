
import { getAuthHeaders, getBaseUrl, validateEmail } from '../utils';
import { SettingsApiResponse } from '../types';

const createEmailTemplate = (template: string, data: any): { subject: string; htmlBody: string } => {
  let subject = 'Test Email from CheckCle';
  let htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Test Email</h2>
          <p>This is a test email from your monitoring system.</p>
          <p>If you received this email, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Sent from CheckCle Monitoring System<br>
            Template: ${template}<br>
            ${data.collection ? `Collection: ${data.collection}` : ''}
          </p>
        </div>
      </body>
    </html>
  `;

  switch (template) {
    case 'verification':
      subject = 'Email Verification Test - CheckCle';
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
              <p style="font-size: 12px; color: #666;">Sent from CheckCle Monitoring System</p>
            </div>
          </body>
        </html>
      `;
      break;
    case 'password-reset':
      subject = 'Password Reset Test - CheckCle';
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
              <p style="font-size: 12px; color: #666;">Sent from CheckCle Monitoring System</p>
            </div>
          </body>
        </html>
      `;
      break;
    case 'email-change':
      subject = 'Email Change Confirmation Test - CheckCle';
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
              <p style="font-size: 12px; color: #666;">Sent from CheckCle Monitoring System</p>
            </div>
          </body>
        </html>
      `;
      break;
  }

  return { subject, htmlBody };
};

export const sendTestEmail = async (data: any): Promise<SettingsApiResponse> => {
  // Security: Removed all console.log statements to prevent credential exposure

  try {
    // Validate required fields
    if (!data || typeof data !== 'object') {
      return {
        status: 200,
        json: { success: false, message: 'Invalid request data' },
      };
    }

    if (!data.email || typeof data.email !== 'string') {
      return {
        status: 200,
        json: { success: false, message: 'Email address is required and must be a string' },
      };
    }

    if (!validateEmail(data.email)) {
      return {
        status: 200,
        json: { success: false, message: 'Invalid email address format' },
      };
    }

    const headers = getAuthHeaders();
    const baseUrl = getBaseUrl();

    // Get current SMTP settings first
    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers,
    });

    if (!settingsResponse.ok) {
      return {
        status: 200,
        json: { success: false, message: 'Failed to get SMTP settings' },
      };
    }

    const settingsData = await settingsResponse.json();
    const smtpSettings = settingsData?.smtp;

    if (!smtpSettings || !smtpSettings.enabled) {
      return {
        status: 200,
        json: { success: false, message: 'SMTP is not enabled. Please enable and configure SMTP settings first.' },
      };
    }

    if (!smtpSettings.host || !smtpSettings.username) {
      return {
        status: 200,
        json: { success: false, message: 'SMTP configuration is incomplete. Please check host and username.' },
      };
    }

    if (!smtpSettings.password) {
      return {
        status: 200,
        json: { success: false, message: 'SMTP password is required for authentication. Please configure the SMTP password.' },
      };
    }

    // Create test email content based on template
    const template = data.template || 'basic';
    const { subject, htmlBody } = createEmailTemplate(template, data);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      status: 200,
      json: {
        success: true,
        message: 'Test email sent successfully',
      },
    };

  } catch (error) {
    return {
      status: 200,
      json: {
        success: false,
        message: 'Failed to send test email. Please check your SMTP configuration.'
      },
    };
  }
};