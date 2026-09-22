import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BANNER_IMAGE_URL = 'https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/assets/email-banner.png';

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
        <strong style="color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Reviewer Feedback / Comments:</strong>
        <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.5;">${reviewComments}</p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abstract Accepted - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      <!-- Brand Header with Banner Background -->
      <div style="background-color: #0f4c81; background-image: linear-gradient(135deg, rgba(15, 76, 129, 0.84) 0%, rgba(3, 105, 161, 0.88) 100%), url('${BANNER_IMAGE_URL}'); background-size: cover; background-position: center bottom; background-repeat: no-repeat; padding: 36px 24px; text-align: center; color: #ffffff; border-top-left-radius: 12px; border-top-right-radius: 12px;">
        <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">
          SPCTT 2027 ANNUAL CONFERENCE
        </span>
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.25);">Society of Pulmonary Care & Thyroid Therapeutics</h1>
        <p style="margin: 0; font-size: 14px; color: #e0f2fe; opacity: 0.95; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.25);">March 6-7, 2027 &bull; Taj Vivanta, Dwarka, New Delhi</p>
      </div>

      <!-- Celebration Banner -->
      <div style="background-color: #ecfdf5; border-bottom: 1px solid #a7f3d0; padding: 18px 24px; text-align: center;">
        <span style="font-size: 22px; vertical-align: middle; margin-right: 6px;"></span>
        <strong style="color: #065f46; font-size: 16px; letter-spacing: 0.2px;">Congratulations! Your Abstract Has Been Accepted</strong>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          We are pleased to inform you that following peer evaluation by the Scientific Review Committee, your abstract submission has been officially <strong>ACCEPTED</strong> for presentation at the upcoming <strong>SPCTT 2027 Annual Conference</strong>.
        </p>

        <!-- Abstract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Submission Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 6px 0; color: #0f4c81; font-weight: 700; font-family: monospace; font-size: 15px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Topic / Title:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${safeTopic}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Presenter / Author:</td>
              <td style="padding: 6px 0; color: #1e293b;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Affiliation:</td>
              <td style="padding: 6px 0; color: #1e293b;">${safeInstitute}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 6px 0; color: #1e293b;">
                <span style="background-color: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase;">
                  ${safeCategory}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 6px 0;">
                <span style="background-color: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; text-transform: uppercase;">
                  ACCEPTED
                </span>
              </td>
            </tr>
          </table>

          ${commentsSection}
        </div>

        <!-- Next Steps -->
        <h3 style="font-size: 16px; color: #0f4c81; margin: 24px 0 12px 0;">Important Next Steps:</h3>
        <ol style="padding-left: 20px; font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
          <li><strong>Delegate Registration:</strong> As per conference regulations, all presenting authors must complete their delegate registration for SPCTT 2027.</li>
          <li><strong>Presentation Preparation:</strong> Please prepare your presentation (Poster / Oral slides) in accordance with the official SPCTT guidelines.</li>
          <li><strong>Schedule Notification:</strong> Detailed session allocation, presentation date, and time slot will be shared shortly via email.</li>
        </ol>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 20px 0;">
          <a href="https://spctt.org" style="background-color: #0f4c81; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 76, 129, 0.3);">
            Visit Conference Portal
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <p style="margin: 0 0 4px 0;">Warm regards,</p>
          <p style="margin: 0; font-weight: 700; color: #0f4c81;">Scientific Review Committee</p>
          <p style="margin: 0; color: #64748b;">SPCTT 2027 Annual Conference Secretariat</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Email: <a href="mailto:spctt2027@spctt.org" style="color: #0f4c81; text-decoration: none;">spctt2027@spctt.org</a></p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0;">This is an automated notification sent from SPCTT 2027 Secretariat.</p>
        <p style="margin: 0;">&copy; 2026-2027 Society of Pulmonary Care & Thyroid Therapeutics. All rights reserved.</p>
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
        <strong style="color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Reviewer Feedback / Comments:</strong>
        <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.5;">${reviewComments}</p>
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
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      <!-- Brand Header with Banner Background -->
      <div style="background-color: #1e293b; background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.86) 0%, rgba(51, 65, 85, 0.88) 100%), url('${BANNER_IMAGE_URL}'); background-size: cover; background-position: center bottom; background-repeat: no-repeat; padding: 36px 24px; text-align: center; color: #ffffff; border-top-left-radius: 12px; border-top-right-radius: 12px;">
        <span style="background-color: rgba(255,255,255,0.18); color: #ffffff; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.25);">
          SPCTT 2027 ANNUAL CONFERENCE
        </span>
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Society of Pulmonary Care & Thyroid Therapeutics</h1>
        <p style="margin: 0; font-size: 14px; color: #cbd5e1; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Abstract Review Decision Notification</p>
      </div>

      <!-- Notification Banner -->
      <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; text-align: center;">
        <strong style="color: #475569; font-size: 15px; letter-spacing: 0.2px;">Review Outcome Notification</strong>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Thank you for submitting your abstract to the <strong>SPCTT 2027 Annual Conference</strong>. We truly appreciate the time, effort, and scientific work invested in your submission.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          The Scientific Committee received an exceptionally high volume of submissions this year. After a meticulous peer-review process against our program criteria and session capacities, we regret to inform you that your abstract could not be accepted for presentation in the conference program.
        </p>

        <!-- Abstract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Submission Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 700; font-family: monospace;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Topic / Title:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${safeTopic}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Presenter / Author:</td>
              <td style="padding: 6px 0; color: #1e293b;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 6px 0; color: #1e293b;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 6px 0;">
                <span style="background-color: #fee2e2; color: #b91c1c; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; text-transform: uppercase;">
                  NOT ACCEPTED
                </span>
              </td>
            </tr>
          </table>

          ${commentsSection}
        </div>

        <!-- Encouragement & Conference Invitation -->
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          While your abstract could not be accommodated in this cycle's presentation schedule, we warmly invite you to attend <strong>SPCTT 2027</strong> as a conference delegate. The conference will feature keynote lectures, interactive clinical workshops, masterclasses, and networking sessions with leading experts in pulmonary and thyroid medicine.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 20px 0;">
          <a href="https://spctt.org" style="background-color: #0f4c81; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 76, 129, 0.25);">
            Register as Conference Delegate
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <p style="margin: 0 0 4px 0;">Sincerely,</p>
          <p style="margin: 0; font-weight: 700; color: #1e293b;">Scientific Review Committee</p>
          <p style="margin: 0; color: #64748b;">SPCTT 2027 Annual Conference Secretariat</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Email: <a href="mailto:spctt2027@spctt.org" style="color: #0f4c81; text-decoration: none;">spctt2027@spctt.org</a></p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0;">This is an automated notification sent from SPCTT 2027 Secretariat.</p>
        <p style="margin: 0;">&copy; 2026-2027 Society of Pulmonary Care & Thyroid Therapeutics. All rights reserved.</p>
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
      ? `[SPCTT 2027] Abstract Accepted: ${abstractCode} - ${topic}`
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

    // Prepare attachments (inline CID banner for best email client compatibility)
    const attachments = [];
    const localBannerPath = path.resolve(__dirname, '../assets/email-banner.png');
    if (fs.existsSync(localBannerPath)) {
      attachments.push({
        filename: 'spctt-banner.png',
        path: localBannerPath,
        cid: 'emailHeaderBanner'
      });
    }

    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${recipientEmail}>`,
      cc: ccAddress,
      subject: subject,
      html: htmlContent,
      attachments
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
