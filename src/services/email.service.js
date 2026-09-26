import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';

const BANNER_IMAGE_URL = 'https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/assets/spctt_2027_banner_header.png';

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
 * Common Email Header Banner using Cloudflare R2 Banner Image (Clickable Link, No Gmail Download Icon)
 */
function generateEmailHeaderHtml() {
  return `
      <!-- Brand Header Banner with Transparent Clickable Link Overlay (No Gmail Download Icon) -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 650px; border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; background-color: #13254A; border-top-left-radius: 12px; border-top-right-radius: 12px; overflow: hidden;">
        <tr>
          <td align="center" valign="middle" style="padding: 0; margin: 0; line-height: 0; font-size: 0; background-color: #13254A; background-image: url('${BANNER_IMAGE_URL}'); background-size: 100% 100%; background-position: center top; background-repeat: no-repeat; text-align: center;">
            <a href="https://2027.spctt.org/" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; max-width: 650px; text-decoration: none; border: 0; outline: none; cursor: pointer;">
              <!-- Transparent 1x1 data spacer that makes entire banner clickable without displaying external img tag for Gmail download overlay -->
              <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="650" height="140" style="display: block; width: 100%; max-width: 650px; height: 140px; border: 0; outline: none; opacity: 0; margin: 0; padding: 0;" alt="SPCTT 2027 Annual Conference" />
            </a>
          </td>
        </tr>
      </table>
  `;
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
      
      ${generateEmailHeaderHtml()}

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
          <a href="https://2027.spctt.org/registration/register" style="background-color: #13254A; color: #ffffff; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 17px; display: inline-block; box-shadow: 0 4px 12px rgba(19, 37, 74, 0.3);">
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
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b; word-break: break-all;">Email: <a href="mailto:submit@spctt.org" style="color: #13254A; text-decoration: none;">submit@spctt.org</a></p>
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
      
      ${generateEmailHeaderHtml()}

      <!-- Notification Banner -->
      <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
        <strong style="color: #000000; font-size: 18px; letter-spacing: 0.2px;">Your Abstract Has Been Rejected</strong>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 18px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Thank you for submitting your abstract to <strong>SPCTT 2027</strong>. Due to high submission volume and limited session capacity, we regret to inform you that your abstract could not be Received for presentation.
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
              <span style="background-color: #f1f5f9; color: #000000; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #cbd5e1;">
                  REJECTED
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
          <a href="https://2027.spctt.org/registration/register" style="background-color: #13254A; color: #ffffff; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 17px; display: inline-block; box-shadow: 0 4px 12px rgba(19, 37, 74, 0.25);">
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
                <p style="margin: 0; color: #64748b; font-size: 14px;">SPCTT 2027 Annual Conference</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b; word-break: break-all;">Email: <a href="mailto:submit@spctt.org" style="color: #13254A; text-decoration: none;">submit@spctt.org</a></p>
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
        <p style="margin: 0 0 4px 0;">This is an automated notification sent from SPCTT 2027 from team SPCTT.</p>
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Abstract Submission Confirmation (Sent to Submitter / Author)
 */
function generateSubmissionConfirmationHtml({ name, abstractCode, topic, category, instituteName, phone, email, pdfUrl, abstractText }) {
  const safeName = name || 'Respected Author';
  const safeCode = abstractCode || 'N/A';
  const safeTopic = topic || 'Abstract Submission';
  const safeCategory = category || 'Poster';
  const safeInstitute = instituteName || 'Affiliated Institution';

  const textSnippet = abstractText
    ? `
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Summary Text:</td>
        <td style="padding: 8px 0; color: #334155; line-height: 1.5; font-size: 14px;">${abstractText.length > 250 ? abstractText.slice(0, 250) + '...' : abstractText}</td>
      </tr>
    `
    : '';

  const attachmentSnippet = pdfUrl
    ? `
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Uploaded Document:</td>
        <td style="padding: 8px 0;">
          <a href="${pdfUrl}" target="_blank" style="color: #004b63; font-weight: 600; text-decoration: underline;">View / Download Attached Document</a>
        </td>
      </tr>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abstract Submission Received - SPCTT 2027</title>
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
      
      ${generateEmailHeaderHtml()}

      <!-- Notification Banner -->
      <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
        <strong style="color: #004b63; font-size: 19px; letter-spacing: 0.2px;">Thank You! Your Abstract Has Been Received</strong>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 18px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          We have successfully received your research abstract submission for the upcoming <strong>SPCTT 2027 Annual Conference</strong>.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Your submission has been assigned reference code <strong style="color: #13254A; font-family: monospace;">${safeCode}</strong> and is currently under review by the Scientific Review Committee.
        </p>

        <!-- Abstract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 26px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Submission Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 700; font-family: monospace; font-size: 16px;">${safeCode}</td>
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
                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #fde68a;">
                  PENDING REVIEW
                </span>
              </td>
            </tr>
            ${attachmentSnippet}
            ${textSnippet}
          </table>
        </div>

        <!-- Next Steps -->
        <h3 style="font-size: 17px; color: #13254A; margin: 26px 0 14px 0;">Next Steps:</h3>
        <ol style="padding-left: 22px; font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 26px;">
          <li style="margin-bottom: 8px;"><strong>Scientific Review:</strong> The review committee will evaluate your abstract against conference criteria.</li>
          <li style="margin-bottom: 8px;"><strong>Decision Notification:</strong> You will be notified of the review decision and comments via email.</li>
          <li style="margin-bottom: 8px;"><strong>Delegate Registration:</strong> As per conference guidelines, all accepted presenters must register at <a href="https://2027.spctt.org/registration/register" style="color: #004b63; font-weight: 600; text-decoration: underline;">SPCTT Portal</a>.</li>
        </ol>


        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">Scientific Review Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">SPCTT 2027 Annual Conference</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:submit@spctt.org" style="color: #13254A; text-decoration: none;">submit@spctt.org</a></p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">For Abstract Queries:</p>
                <p style="margin: 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Admin Notification on New Abstract Submission
 */
function generateAdminSubmissionNotificationHtml({ name, abstractCode, topic, category, instituteName, phone, email, pdfUrl, abstractText, createdAt }) {
  const safeName = name || 'N/A';
  const safeCode = abstractCode || 'N/A';
  const safeTopic = topic || 'Abstract Submission';
  const safeCategory = category || 'Poster';
  const safeInstitute = instituteName || 'N/A';
  const safePhone = phone || 'N/A';
  const safeEmail = email || 'N/A';
  const dateStr = createdAt ? new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const attachmentSnippet = pdfUrl
    ? `
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Uploaded Document:</td>
        <td style="padding: 10px 0;">
          <a href="${pdfUrl}" target="_blank" style="display: inline-block; background-color: #9e1c2b; color: #ffffff; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Download / View File</a>
        </td>
      </tr>
    `
    : `
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Uploaded Document:</td>
        <td style="padding: 10px 0; color: #94a3b8; font-style: italic;">No file attached</td>
      </tr>
    `;

  const abstractContentSnippet = abstractText
    ? `
      <div style="margin-top: 20px; padding: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <strong style="color: #334155; font-size: 14px; display: block; margin-bottom: 8px;">Abstract Text Summary:</strong>
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${abstractText}</p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Abstract Submission Alert - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      ${generateEmailHeaderHtml()}

      <!-- Admin Notification Bar -->
      <div style="color: #13254A; padding: 18px 24px; text-align: center;">
        <span style="background-color: #22c55e; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 10px; letter-spacing: 0.5px;">New Abstract Alert</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 700; color: #13254A;">New Abstract Submitted for SPCTT 2027</h2>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
          Hello Administrator / Review Committee,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          A new research abstract has been submitted by <strong>${safeName}</strong> on <strong>${dateStr} (IST)</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 35%; font-weight: 600;">Abstract Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 700; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Topic / Title:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeTopic}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Author / Presenter:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Institution / Org:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeInstitute}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase;">
                  ${safeCategory}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Author Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${safeEmail}" style="color: #004b63;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Author Phone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safePhone}</td>
            </tr>
            ${attachmentSnippet}
          </table>

          ${abstractContentSnippet}
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Automated System Alert &bull; SPCTT 2027 &bull; submit@spctt.org</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

export const emailService = {
  /**
   * Send Abstract Submission Confirmation to User and Notification to Admin
   * - From: submit@spctt.org
   * - Author Email CC: tvivek2021@gmail.com
   * - Admin Email: submit@spctt.org (with CC: tvivek2021@gmail.com)
   */
  async sendAbstractSubmissionEmails({ abstract }) {
    if (!abstract) {
      throw new Error('Abstract object is required to send submission emails.');
    }

    const recipientEmail = abstract.email || abstract.submitter_email;
    const recipientName = abstract.name || abstract.display_name || abstract.authors || abstract.submitter_name || 'Author';
    const abstractCode = abstract.abstract_code || `#${abstract.id}`;
    const topic = abstract.topic || abstract.title || 'Abstract Submission';
    const category = abstract.category || 'Poster';
    const instituteName = abstract.institute_name || abstract.affiliation || abstract.submitter_org || '';
    const phone = abstract.phone || abstract.submitter_phone || '';
    const abstractText = abstract.abstract_text || '';
    const pdfUrl = abstract.pdf_url || abstract.file_url || null;
    const createdAt = abstract.created_at || new Date();

    const fromAddress = process.env.ABSTRACT_FROM || config.EMAIL.ABSTRACT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';
    const adminEmail = process.env.ABSTRACT_ADMIN_EMAIL || config.EMAIL.ABSTRACT_ADMIN_EMAIL || 'submit@spctt.org';

    const results = {
      authorEmail: null,
      adminEmail: null
    };

    let activeTransporter;
    try {
      activeTransporter = getTransporter();
    } catch (transporterErr) {
      console.error('❌ Could not initialize SMTP transporter:', transporterErr.message);
      return { success: false, error: transporterErr.message };
    }

    // 1. Send confirmation email to Author
    if (recipientEmail) {
      const authorSubject = `[SPCTT 2027] Abstract Submission Received: ${abstractCode} - ${topic}`;
      const authorHtml = generateSubmissionConfirmationHtml({
        name: recipientName,
        abstractCode,
        topic,
        category,
        instituteName,
        phone,
        email: recipientEmail,
        pdfUrl,
        abstractText
      });

      const authorMailOptions = {
        from: fromAddress,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject: authorSubject,
        html: authorHtml
      };

      try {
        console.log(`📧 Sending abstract submission confirmation to Author '${recipientEmail}', From: '${fromAddress}'...`);
        const info = await activeTransporter.sendMail(authorMailOptions);
        console.log(`✅ Author submission email sent! MessageId: ${info.messageId}`);

        await EmailLog.create({
          abstractId: abstract.id,
          userId: abstract.user_id,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: authorSubject,
          emailType: 'abstract_submission_confirmation',
          status: 'sent',
          errorMessage: null
        });

        results.authorEmail = {
          success: true,
          messageId: info.messageId,
          recipient: recipientEmail,
          cc: null
        };
      } catch (err) {
        console.error(`❌ Failed to send abstract submission confirmation to Author (${recipientEmail}):`, err.message);

        await EmailLog.create({
          abstractId: abstract.id,
          userId: abstract.user_id,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: authorSubject,
          emailType: 'abstract_submission_confirmation',
          status: 'failed',
          errorMessage: err.message
        });

        results.authorEmail = {
          success: false,
          error: err.message
        };
      }
    }

    // 2. Send notification email to Admin at submit@spctt.org (with CC to tvivek2021@gmail.com)
    const adminSubject = `[New Abstract Submission] ${abstractCode} - ${topic} (${recipientName})`;
    const adminHtml = generateAdminSubmissionNotificationHtml({
      name: recipientName,
      abstractCode,
      topic,
      category,
      instituteName,
      phone,
      email: recipientEmail,
      pdfUrl,
      abstractText,
      createdAt
    });

    const adminMailOptions = {
      from: fromAddress,
      to: `"SPCTT Abstract" <${adminEmail}>`,
      cc: ccAddress,
      subject: adminSubject,
      html: adminHtml
    };

    try {
      console.log(`📧 Sending abstract alert to Admin '${adminEmail}', CC: '${ccAddress}', From: '${fromAddress}'...`);
      const infoAdmin = await activeTransporter.sendMail(adminMailOptions);
      console.log(`✅ Admin notification email sent! MessageId: ${infoAdmin.messageId}`);

      await EmailLog.create({
        abstractId: abstract.id,
        userId: abstract.user_id,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'abstract_submission_admin',
        status: 'sent',
        errorMessage: null
      });

      results.adminEmail = {
        success: true,
        messageId: infoAdmin.messageId,
        recipient: adminEmail,
        cc: ccAddress
      };
    } catch (errAdmin) {
      console.error(`❌ Failed to send abstract alert to Admin (${adminEmail}):`, errAdmin.message);

      await EmailLog.create({
        abstractId: abstract.id,
        userId: abstract.user_id,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'abstract_submission_admin',
        status: 'failed',
        errorMessage: errAdmin.message
      });

      results.adminEmail = {
        success: false,
        error: errAdmin.message
      };
    }

    return results;
  },

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

    const fromAddress = process.env.ABSTRACT_FROM || config.EMAIL.ABSTRACT_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';

    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${recipientEmail}>`,
      cc: ccAddress,
      subject: subject,
      html: htmlContent
    };

    try {
      const activeTransporter = getTransporter();
      console.log(`📧 Attempting to send ${emailType} email to '${recipientEmail}', CC: '${ccAddress}', From: '${fromAddress}'...`);

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
  },

  /**
   * Send Password Reset OTP Email
   */
  async sendPasswordResetOtpEmail({ user, otp, expiryMinutes = 15 }) {
    if (!user || !user.email) {
      throw new Error('User email is required to send password reset OTP.');
    }

    const recipientEmail = user.email.trim();
    const recipientName = user.name || user.fullName || 'Conference Attendee';
    const fromAddress = process.env.EMAIL_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const subject = `[SPCTT 2027] Password Reset OTP: ${otp}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - SPCTT 2027</title>
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
        
        ${generateEmailHeaderHtml()}

        <!-- Notification Banner -->
        <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 18px 24px; text-align: center;">
          <strong style="color: #13254A; font-size: 18px; letter-spacing: 0.2px;">Password Reset Verification Code</strong>
        </div>

        <!-- Main Body -->
        <div class="mobile-padding" style="padding: 32px 24px;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0; color: #334155;">
            Dear <strong>${recipientName}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            We received a request to reset your password for the <strong>SPCTT 2027 Conference Portal</strong> account (<code>${recipientEmail}</code>).
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Please use the following One-Time Password (OTP) to proceed with resetting your password:
          </p>

          <!-- OTP Display Card -->
          <div style="text-align: center; margin: 28px 0; padding: 24px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; display: block; margin-bottom: 8px;">
              Your One-Time Password (OTP)
            </span>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #13254A; font-family: monospace; line-height: 1.2; padding: 8px 0;">
              ${otp}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #dc2626; font-weight: 600;">
              ⏱️ Valid for ${expiryMinutes} minutes only
            </p>
          </div>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
              <strong>Security Note:</strong> Do not share this OTP with anyone. SPCTT representatives will never ask for your password or OTP. If you did not make this request, you can safely ignore this email.
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong style="color: #1e293b;">SPCTT 2027 Organizing Team</strong><br>
            Society for Pediatric Cellular Therapy and Transplant
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">&copy; 2027 SPCTT. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${recipientEmail}>`,
      subject: subject,
      html: htmlContent
    };

    try {
      const activeTransporter = getTransporter();
      console.log(`📧 Dispatching password reset OTP email to '${recipientEmail}'...`);
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`✅ Password reset OTP email sent successfully! MessageId: ${info.messageId}`);

      await EmailLog.create({
        userId: user.id || null,
        recipientEmail,
        recipientName,
        fromEmail: fromAddress,
        subject,
        emailType: 'password_reset_otp',
        status: 'sent',
        errorMessage: null
      });

      return {
        success: true,
        messageId: info.messageId,
        recipientEmail,
        status: 'sent',
        message: `Password reset OTP email sent successfully to ${recipientEmail}.`
      };
    } catch (sendError) {
      console.error(`❌ Failed to send password reset OTP email to ${recipientEmail}:`, sendError.message);

      await EmailLog.create({
        userId: user.id || null,
        recipientEmail,
        recipientName,
        fromEmail: fromAddress,
        subject,
        emailType: 'password_reset_otp',
        status: 'failed',
        errorMessage: sendError.message
      });

      return {
        success: false,
        recipientEmail,
        status: 'failed',
        error: sendError.message,
        message: `Failed to dispatch OTP email: ${sendError.message}`
      };
    }
  }
};

export default emailService;

