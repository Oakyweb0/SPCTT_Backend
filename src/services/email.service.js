import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';

const BANNER_IMAGE_URL = 'https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/assets/spctt_header_banner_v5.png';

let transporter = null;

/**
 * Get or initialize nodemailer transporter instance
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || config.EMAIL.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || config.EMAIL.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || config.EMAIL.SMTP_USER;
  const pass = process.env.SMTP_PASS || config.EMAIL.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in .env file.');
  }

  // Re-create transporter if credentials/config changed
  const transportOptions = {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  transporter = nodemailer.createTransport(transportOptions);
  return transporter;
}

/**
 * Generate HTML template for Accepted Abstract
 */
function generateAcceptedHtml({ name, abstractCode, topic, category, instituteName, reviewComments }) {
  const safeName = name || 'Respected Author';
  const safeCode = abstractCode || 'N/A';
  const safeTopic = topic || 'Abstract Submission';
  const safeCategory = category || 'Poster';
  const safeInstitute = instituteName || 'Affiliated Institution';
  const commentsSection = reviewComments
    ? `
      <div style="margin-top: 16px; padding: 14px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">
        <strong style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Reviewer Feedback / Comments:</strong>
        <p style="margin: 0; color: #15803d; font-size: 16px; line-height: 1.5;">${reviewComments}</p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abstract Received - SPCTT 2027</title>
    <style>
      @media only screen and (max-width: 520px) {
        .responsive-td {
          display: block !important;
          width: 100% !important;
          text-align: left !important;
          padding-bottom: 12px !important;
          box-sizing: border-box !important;
        }
        .mobile-padding {
          padding: 24px 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      <!-- Brand Header Banner Image (Matching Screenshot Design) -->
      <div style="border-top-left-radius: 12px; border-top-right-radius: 12px; overflow: hidden; line-height: 0;">
        <a href="https://2027.spctt.org/" target="_blank" style="display: block; text-decoration: none; border: 0; outline: none;">
          <img src="${BANNER_IMAGE_URL}" alt="Society for Pediatric Cellular Therapy and Transplant - SPCTT 2027 Annual Conference" width="650" style="display: block; width: 100%; max-width: 650px; height: auto; border: 0; outline: none; text-decoration: none;" />
        </a>
      </div>

      <!-- Notification Banner -->
      <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
        <strong style="color: #000000; font-size: 19px; letter-spacing: 0.2px;">Congratulations! Your Abstract Has Been Received</strong>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 18px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 17px; line-height: 1.6; color: #334155;">
          We are pleased to inform you that your abstract submission has been officially <strong>RECEIVED</strong> and is <strong>pending for review</strong> for the upcoming <strong>SPCTT 2027 Annual Conference</strong>.
        </p>

        <!-- Abstract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 26px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Submission Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 700; font-family: monospace; font-size: 17px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Topic / Title:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeTopic}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Presenter / Author:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Affiliation:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeInstitute}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #1e293b;">
                <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 13px; text-transform: uppercase;">
                  ${safeCategory}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #f1f5f9; color: #000000; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #cbd5e1;">
                  RECEIVED
                </span>
              </td>
            </tr>
          </table>

          ${commentsSection}
        </div>

        <!-- Next Steps -->
        <h3 style="font-size: 18px; color: #13254A; margin: 26px 0 14px 0;">Important Next Steps:</h3>
        <ol style="padding-left: 22px; font-size: 16px; line-height: 1.7; color: #334155; margin-bottom: 26px;">
          <li style="margin-bottom: 8px;"><strong>Delegate Registration:</strong> As per conference regulations, all presenting authors must complete their delegate registration for SPCTT 2027.</li>
          <li style="margin-bottom: 8px;"><strong>Presentation Preparation:</strong> Please prepare your presentation (Poster / Oral slides) in accordance with the official SPCTT guidelines.</li>
          <li style="margin-bottom: 8px;"><strong>Schedule Notification:</strong> Detailed session allocation, presentation date, and time slot will be shared shortly via email.</li>
        </ol>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 34px 0 24px 0;">
          <a href="https://2027.spctt.org/" style="background-color: #13254A; color: #ffffff; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 17px; display: inline-block; box-shadow: 0 4px 12px rgba(19, 37, 74, 0.3);">
            Visit Conference Portal
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 15px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">Scientific Review Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b; word-break: break-all;">Email: <a href="mailto:spctt2027@spctt.org" style="color: #13254A; text-decoration: none;">spctt2027@spctt.org</a></p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">For Abstract Query:</p>
                <p style="margin: 0; font-size: 14px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600; word-break: break-all;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Rejected Abstract
 */
function generateRejectedHtml({ name, abstractCode, topic, category, instituteName, reviewComments }) {
  const safeName = name || 'Respected Author';
  const safeCode = abstractCode || 'N/A';
  const safeTopic = topic || 'Abstract Submission';
  const safeCategory = category || 'Poster';
  const safeInstitute = instituteName || 'Affiliated Institution';
  const commentsSection = reviewComments
    ? `
      <div style="margin-top: 16px; padding: 14px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
        <strong style="color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Reviewer Feedback / Comments:</strong>
        <p style="margin: 0; color: #b91c1c; font-size: 16px; line-height: 1.5;">${reviewComments}</p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abstract Review Decision - SPCTT 2027</title>
    <style>
      @media only screen and (max-width: 520px) {
        .responsive-td {
          display: block !important;
          width: 100% !important;
          text-align: left !important;
          padding-bottom: 12px !important;
          box-sizing: border-box !important;
        }
        .mobile-padding {
          padding: 24px 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      <!-- Brand Header Banner Image (Matching Screenshot Design) -->
      <div style="border-top-left-radius: 12px; border-top-right-radius: 12px; overflow: hidden; line-height: 0;">
        <a href="https://2027.spctt.org/" target="_blank" style="display: block; text-decoration: none; border: 0; outline: none;">
          <img src="${BANNER_IMAGE_URL}" alt="Society for Pediatric Cellular Therapy and Transplant - SPCTT 2027 Annual Conference" width="650" style="display: block; width: 100%; max-width: 650px; height: auto; border: 0; outline: none; text-decoration: none;" />
        </a>
      </div>

      <!-- Notification Banner -->
      <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
        <strong style="color: #475569; font-size: 18px; letter-spacing: 0.2px;">Review Outcome Notification</strong>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 18px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Thank you for submitting your abstract to <strong>SPCTT 2027</strong>. Due to high submission volume and limited session capacity, we regret to inform you that your abstract could not be accepted for presentation.
        </p>

        <!-- Abstract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 26px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Submission Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 700; font-family: monospace; font-size: 17px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Topic / Title:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeTopic}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Presenter / Author:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase;">
                  NOT RECEIVED
                </span>
              </td>
            </tr>
          </table>

          ${commentsSection}
        </div>

        <!-- Encouragement & Conference Invitation -->
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          We warmly invite you to join <strong>SPCTT 2027</strong> as a conference delegate to participate in keynote lectures, workshops, and networking sessions.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 34px 0 24px 0;">
          <a href="https://2027.spctt.org/" style="background-color: #13254A; color: #ffffff; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 17px; display: inline-block; box-shadow: 0 4px 12px rgba(19, 37, 74, 0.25);">
            Register as Conference Delegate
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 15px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Sincerely,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">Scientific Review Committee</p>
                <p style="margin: 0; color: #64748b; font-size: 14px;">SPCTT 2027 Annual Conference Secretariat</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b; word-break: break-all;">Email: <a href="mailto:spctt2027@spctt.org" style="color: #13254A; text-decoration: none;">spctt2027@spctt.org</a></p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 15px;">For Abstract Query:</p>
                <p style="margin: 0; font-size: 15px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600; word-break: break-all;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0;">This is an automated notification sent from SPCTT 2027 Secretariat.</p>
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

export const emailService = {
  /**
   * Send Abstract Decision Email (Accepted / Rejected)
   */
  async sendAbstractDecisionEmail({
    abstract,
    status,
    reviewComments = ''
  }) {
    if (!abstract) {
      throw new Error('Abstract object is required to send notification email.');
    }

    const recipientEmail = abstract.email || abstract.submitter_email;
    if (!recipientEmail) {
      console.warn(`⚠️ Cannot send email for abstract #${abstract.id}: No recipient email found.`);
      return {
        success: false,
        message: 'No recipient email address found for this abstract.'
      };
    }

    const recipientName = abstract.name || abstract.display_name || abstract.authors || abstract.submitter_name || 'Author';
    const abstractCode = abstract.abstract_code || `#${abstract.id}`;
    const topic = abstract.topic || abstract.title || 'Abstract Submission';
    const category = abstract.category || 'Poster';
    const instituteName = abstract.institute_name || abstract.affiliation || abstract.submitter_org || '';
    const comments = reviewComments || abstract.review_comments || '';

    const isAccepted = status === 'accepted';
    const isRejected = status === 'rejected';

    if (!isAccepted && !isRejected) {
      return {
        success: false,
        message: `No email template configured for status '${status}'.`
      };
    }

    const emailType = isAccepted ? 'abstract_accepted' : 'abstract_rejected';
    const subject = isAccepted
      ? `[SPCTT 2027] Abstract Received: ${abstractCode} - ${topic}`
      : `[SPCTT 2027] Abstract Review Decision: ${abstractCode} - ${topic}`;

    const htmlContent = isAccepted
      ? generateAcceptedHtml({
        name: recipientName,
        abstractCode,
        topic,
        category,
        instituteName,
        reviewComments: comments
      })
      : generateRejectedHtml({
        name: recipientName,
        abstractCode,
        topic,
        category,
        instituteName,
        reviewComments: comments
      });

    const fromAddress = config.EMAIL.DEFAULT_FROM || '"SPCTT 2027 Secretariat" <spctt2027@spctt.org>';
    const ccAddress = config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';

    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${recipientEmail}>`,
      cc: ccAddress,
      subject: subject,
      html: htmlContent
    };

    try {
      const activeTransporter = getTransporter();
      console.log(`📧 Attempting to send ${emailType} email to '${recipientEmail}', CC: '${ccAddress}'...`);

      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);

      // Record in database log
      await EmailLog.create({
        abstractId: abstract.id,
        userId: abstract.user_id,
        recipientEmail,
        recipientName,
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject,
        emailType,
        status: 'sent',
        errorMessage: null
      });

      return {
        success: true,
        messageId: info.messageId,
        recipientEmail,
        ccEmail: ccAddress,
        status: 'sent',
        message: `Decision notification email successfully sent to ${recipientEmail} (CC: ${ccAddress}).`
      };
    } catch (sendError) {
      console.error(`❌ Failed to send email via SMTP to ${recipientEmail}:`, sendError.message);

      // Record failure in database log
      await EmailLog.create({
        abstractId: abstract.id,
        userId: abstract.user_id,
        recipientEmail,
        recipientName,
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject,
        emailType,
        status: 'failed',
        errorMessage: sendError.message
      });

      return {
        success: false,
        recipientEmail,
        ccEmail: ccAddress,
        status: 'failed',
        error: sendError.message,
        message: `Failed to dispatch email to ${recipientEmail}: ${sendError.message}`
      };
    }
  }
};

export default emailService;
