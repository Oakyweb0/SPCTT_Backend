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
      
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 650px; border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; background-color: #0d1b38; border-top-left-radius: 12px; border-top-right-radius: 12px; overflow: hidden;">
        <tr>
        <td align="center" valign="middle" style="padding: 34px 20px; margin: 0; background-color: #0d1b38; background-image: linear-gradient(rgba(13, 27, 56, 0.72), rgba(19, 37, 74, 0.78)), url('${BANNER_IMAGE_URL}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <!--[if gte mso 9]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:650px;height:160px;">
              <v:fill type="frame" src="${BANNER_IMAGE_URL}" color="#0d1b38" />
              <v:textbox inset="0,0,0,0">
            <![endif]-->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; border-spacing: 0;">
              <tr>
                <td align="center" style="padding: 0 10px; text-align: center;">
                  <!-- Conference Pill Badge -->
                  <div style="display: inline-block; padding: 5px 18px; border: 1px solid rgba(255, 255, 255, 0.45); border-radius: 50px; background-color: rgba(19, 37, 74, 1.0); margin-bottom: 12px;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1;">
                      SPCTT 2027 ANNUAL CONFERENCE
                    </span>
                  </div>
                  
                  <!-- Main Title -->
                  <h1 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.35; letter-spacing: -0.2px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    Society for Pediatric Cellular Therapy and Transplant
                  </h1>
                  
                  <!-- Date & Location Subtitle -->
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 500; color: #e2e8f0; line-height: 1.4; letter-spacing: 0.2px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">
                    March 6-7, 2027 &bull; Taj Vivanta, Dwarka, New Delhi
                  </p>
                </td>
              </tr>
            </table>
            <!--[if gte mso 9]>
              </v:textbox>
            </v:rect>
            <![endif]-->
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

/**
 * Generate HTML template for Payment Success (User Confirmation)
 */
function generatePaymentSuccessUserHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  subtotal,
  gstAmount,
  facilitationCharge,
  grandTotal,
  totalPaid,
  transactionId,
  orderId,
  paymentMethod,
  paidAt,
  accompanyingCount = 0,
  accompanyingPersons = []
}) {
  const safeName = name || 'Respected Delegate';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeOrg = organization || 'N/A';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Razorpay (PAGE WORLDWIDE)';
  const dateStr = paidAt
    ? new Date(paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let accompanyingHtml = '';
  if (accompanyingCount > 0) {
    let namesList = '';
    if (Array.isArray(accompanyingPersons) && accompanyingPersons.length > 0) {
      namesList = accompanyingPersons.map((p, idx) => `${idx + 1}. ${p.title || ''} ${p.fullName || p.name || ''}`).filter(Boolean).join('<br>');
    }
    accompanyingHtml = `
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Accompanying Persons (${accompanyingCount}):</td>
        <td style="padding: 8px 0; color: #1e293b; line-height: 1.5;">${namesList || `${accompanyingCount} person(s)`}</td>
      </tr>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration & Payment Confirmed - SPCTT 2027</title>
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

      <!-- Success Notification Banner -->
      <div style="background-color: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 22px 24px; text-align: center;">
        <span style="background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.8px; display: inline-block; margin-bottom: 8px;">Payment Successful</span>
        <h2 style="margin: 0; color: #166534; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">Registration Confirmed & Paid</h2>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Thank you for completing your registration for the <strong>SPCTT 2027 Annual Conference</strong>. We have successfully received your payment. Your conference seat has been officially <strong>CONFIRMED</strong>.
        </p>

        <!-- Registration & Payment Summary Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.8px; color: #13254A; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Registration & Payment Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Name:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #004b63; font-weight: 700;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization / Hospital:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeOrg}</td>
            </tr>
            ${accompanyingHtml}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction / Payment ID:</td>
              <td style="padding: 8px 0; color: #13254A; font-family: monospace; font-size: 14px; font-weight: 600;">${safeTxn}</td>
            </tr>
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Razorpay Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace; font-size: 13px;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Mode:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Date & Time:</td>
              <td style="padding: 8px 0; color: #1e293b;">${dateStr} (IST)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #86efac;">
                  PAID (SUCCESSFUL)
                </span>
              </td>
            </tr>
          </table>

          <!-- Fee Breakdown Table -->
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Subtotal (Registration Base):</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">${formatRs(subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">GST (18%):</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">${formatRs(gstAmount)}</td>
              </tr>
              ${facilitationCharge > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Facilitation Charges (4.5%):</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">${formatRs(facilitationCharge)}</td>
              </tr>` : ''}
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-size: 16px;">Total Amount Paid:</td>
                <td style="padding: 8px 0; text-align: right; color: #13254A; font-weight: 800; font-size: 17px;">${formatRs(totalPaid || grandTotal)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Next Steps -->
        <h3 style="font-size: 17px; color: #13254A; margin: 26px 0 12px 0;">Important Attendee Information:</h3>
        <ul style="padding-left: 20px; font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 26px;">
          <li style="margin-bottom: 6px;"><strong>Tax Invoice & Receipt:</strong> You can download your official tax invoice and payment receipt anytime from the conference portal.</li>
          <li style="margin-bottom: 6px;"><strong>Conference Badge:</strong> Please present your Registration Code <code>${safeCode}</code> at the on-site registration desk on March 6-7, 2027 at Taj Vivanta, Dwarka, New Delhi.</li>
          <li style="margin-bottom: 6px;"><strong>Updates:</strong> Detailed scientific program and session timings will be shared via email closer to the conference date.</li>
        </ul>


        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">SPCTT 2027 Organizing Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Society for Pediatric Cellular Therapy and Transplant</p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">Registration Support:</p>
                <p style="margin: 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Payment Success (Admin Notification)
 */
function generatePaymentSuccessAdminHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  subtotal,
  gstAmount,
  facilitationCharge,
  grandTotal,
  totalPaid,
  transactionId,
  orderId,
  paymentMethod,
  paidAt,
  accompanyingCount = 0,
  accompanyingPersons = []
}) {
  const safeName = name || 'N/A';
  const safeEmail = email || 'N/A';
  const safePhone = phone || 'N/A';
  const safeOrg = organization || 'N/A';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Razorpay (PAGE WORLDWIDE)';
  const dateStr = paidAt
    ? new Date(paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received Alert - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      ${generateEmailHeaderHtml()}

      <!-- Admin Alert Bar -->
      <div style="padding: 18px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <span style="background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 10px; letter-spacing: 0.8px;">Payment Received Alert</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 800; color: #13254A;">Registration Payment Confirmed</h2>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
          Hello Administrator,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          A new delegate registration payment has been successfully completed for <strong>SPCTT 2027</strong> on <strong>${dateStr} (IST)</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 38%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #004b63; font-weight: 700;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${safeEmail}" style="color: #004b63; text-decoration: none; font-weight: 600;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Phone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization / Inst:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeOrg}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Accompanying Count:</td>
              <td style="padding: 8px 0; color: #1e293b;">${accompanyingCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction ID:</td>
              <td style="padding: 8px 0; color: #13254A; font-family: monospace; font-weight: 700;">${safeTxn}</td>
            </tr>
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Razorpay Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Gateway:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
            <tr style="border-top: 1px solid #cbd5e1;">
              <td style="padding: 10px 0 4px 0; color: #13254A; font-weight: 800; font-size: 16px;">Total Amount Received:</td>
              <td style="padding: 10px 0 4px 0; color: #16a34a; font-weight: 800; font-size: 18px;">${formatRs(totalPaid || grandTotal)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Automated Payment Notification &bull; SPCTT 2027 &bull; submit@spctt.org</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Payment Failure (User Alert)
 */
function generatePaymentFailedUserHtml({
  name,
  email,
  registrationCode,
  categoryName,
  attemptedAmount,
  transactionId,
  orderId,
  paymentMethod,
  failureReason,
  attemptedAt
}) {
  const safeName = name || 'Respected Delegate';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Razorpay (PAGE WORLDWIDE)';
  const safeReason = failureReason || 'Transaction could not be completed / payment was declined or cancelled.';
  const dateStr = attemptedAt
    ? new Date(attemptedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Attempt Failed - SPCTT 2027</title>
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

      <!-- Failure Notification Banner -->
      <div style="background-color: #fef2f2; border-bottom: 1px solid #fecaca; padding: 22px 24px; text-align: center;">
        <span style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.8px; display: inline-block; margin-bottom: 8px;">Payment Unsuccessful</span>
        <h2 style="margin: 0; color: #991b1b; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">Action Required: Payment Not Completed</h2>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          We noticed that your recent payment attempt for the <strong>SPCTT 2027 Annual Conference</strong> could not be processed successfully.
        </p>

        <!-- Transaction Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.8px; color: #991b1b; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Transaction Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Attempted Amount:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 16px;">${formatRs(attemptedAmount)}</td>
            </tr>
            ${safeTxn !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction Reference:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeTxn}</td>
            </tr>` : ''}
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Gateway:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1e293b;">${dateStr} (IST)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #fca5a5;">
                  PAYMENT FAILED
                </span>
              </td>
            </tr>
          </table>

          <!-- Reason Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 6px;">
            <strong style="color: #9f1239; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Failure Reason / Note:</strong>
            <p style="margin: 0; color: #be123c; font-size: 14px; line-height: 1.5;">${safeReason}</p>
          </div>
        </div>

        <!-- Reassurance & Instructions -->
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #92400e; font-weight: 700;">Important Information:</h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #78350f; line-height: 1.6;">
            <li><strong>Was your bank account debited?</strong> If any amount was deducted from your account/card, it will be automatically refunded by your issuing bank within 3 to 5 business days.</li>
            <li><strong>Your Registration details are safe:</strong> You do not need to fill out your details again. Simply click below to retry the payment.</li>
          </ul>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="https://2027.spctt.org/registration/register" style="background-color: #9e1c2b; color: #ffffff; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(158, 28, 43, 0.3);">
            Retry Registration Payment
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">SPCTT 2027 Organizing Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Society for Pediatric Cellular Therapy and Transplant</p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">Need Payment Help?</p>
                <p style="margin: 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Payment Failure (Admin Alert)
 */
function generatePaymentFailedAdminHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  attemptedAmount,
  transactionId,
  orderId,
  paymentMethod,
  failureReason,
  attemptedAt
}) {
  const safeName = name || 'N/A';
  const safeEmail = email || 'N/A';
  const safePhone = phone || 'N/A';
  const safeOrg = organization || 'N/A';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Razorpay (PAGE WORLDWIDE)';
  const safeReason = failureReason || 'Payment declined, cancelled by user, or gateway error';
  const dateStr = attemptedAt
    ? new Date(attemptedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed Alert - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      ${generateEmailHeaderHtml()}

      <!-- Admin Alert Bar -->
      <div style="padding: 18px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <span style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 10px; letter-spacing: 0.8px;">Payment Failed Alert</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 800; color: #991b1b;">Registration Payment Failed</h2>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
          Hello Administrator,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          A delegate attempted to make a payment for <strong>SPCTT 2027</strong> on <strong>${dateStr} (IST)</strong>, but the transaction failed.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 38%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #004b63; font-weight: 700;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${safeEmail}" style="color: #004b63; text-decoration: none; font-weight: 600;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Phone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization / Inst:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeOrg}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Attempted Amount:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 16px;">${formatRs(attemptedAmount)}</td>
            </tr>
            ${safeTxn !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction Ref:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeTxn}</td>
            </tr>` : ''}
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Razorpay Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Gateway:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
          </table>

          <!-- Reason Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 6px;">
            <strong style="color: #9f1239; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Failure Reason / Error:</strong>
            <p style="margin: 0; color: #be123c; font-size: 14px; line-height: 1.5;">${safeReason}</p>
          </div>
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

/**
 * Generate HTML template for Payment Refunded (User Notification)
 */
function generatePaymentRefundedUserHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  refundAmount,
  transactionId,
  orderId,
  paymentMethod,
  refundReason,
  refundedAt
}) {
  const safeName = name || 'Delegate';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Original Payment Source';
  const safeReason = refundReason || 'Refund processed by conference administration / finance team';
  const dateStr = refundedAt
    ? new Date(refundedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Refund Processed - SPCTT 2027</title>
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

      <!-- Refund Notification Banner -->
      <div style="background-color: #f5f3ff; border-bottom: 1px solid #ddd6fe; padding: 22px 24px; text-align: center;">
        <span style="background-color: #7c3aed; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.8px; display: inline-block; margin-bottom: 8px;">Refund Processed</span>
        <h2 style="margin: 0; color: #5b21b6; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">Payment Refund Confirmation</h2>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          This email confirms that a refund has been initiated / processed for your registration for the <strong>SPCTT 2027 Annual Conference</strong>.
        </p>

        <!-- Refund Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.8px; color: #5b21b6; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Refund Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Registration Category:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Refunded Amount:</td>
              <td style="padding: 8px 0; color: #7c3aed; font-weight: 800; font-size: 17px;">${formatRs(refundAmount)}</td>
            </tr>
            ${safeTxn !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction / Refund Ref:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeTxn}</td>
            </tr>` : ''}
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Processed On:</td>
              <td style="padding: 8px 0; color: #1e293b;">${dateStr} (IST)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #ede9fe; color: #6d28d9; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #ddd6fe;">
                  REFUNDED
                </span>
              </td>
            </tr>
          </table>

          <!-- Reason Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 6px;">
            <strong style="color: #5b21b6; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Note / Reason:</strong>
            <p style="margin: 0; color: #4c1d95; font-size: 14px; line-height: 1.5;">${safeReason}</p>
          </div>
        </div>

        <!-- Timeline Information -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #13254A; font-weight: 700;">When will you receive the funds?</h4>
          <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
            The refund has been credited back to your original source account / payment card. Depending on your bank's settlement cycle, it typically takes <strong>5 to 7 business days</strong> to reflect on your account or card statement.
          </p>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">SPCTT 2027 Organizing Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Society for Pediatric Cellular Therapy and Transplant</p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">Need Assistance?</p>
                <p style="margin: 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Payment Refunded (Admin Alert)
 */
function generatePaymentRefundedAdminHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  refundAmount,
  transactionId,
  orderId,
  paymentMethod,
  refundReason,
  refundedAt
}) {
  const safeName = name || 'N/A';
  const safeEmail = email || 'N/A';
  const safePhone = phone || 'N/A';
  const safeOrg = organization || 'N/A';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeTxn = transactionId || 'N/A';
  const safeOrder = orderId || 'N/A';
  const safeMethod = paymentMethod || 'Original Payment Source';
  const safeReason = refundReason || 'Refund processed by Admin / Payment Gateway';
  const dateStr = refundedAt
    ? new Date(refundedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Refund Alert - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      ${generateEmailHeaderHtml()}

      <!-- Admin Alert Bar -->
      <div style="padding: 18px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <span style="background-color: #7c3aed; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 10px; letter-spacing: 0.8px;">Payment Refund Alert</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 800; color: #5b21b6;">Registration Payment Refunded</h2>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
          Hello Administrator,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          A payment refund has been recorded/processed for delegate <strong>${safeName}</strong> on <strong>${dateStr} (IST)</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 38%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #004b63; font-weight: 700;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${safeEmail}" style="color: #004b63; text-decoration: none; font-weight: 600;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Phone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization / Inst:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeOrg}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Refunded Amount:</td>
              <td style="padding: 8px 0; color: #7c3aed; font-weight: 800; font-size: 16px;">${formatRs(refundAmount)}</td>
            </tr>
            ${safeTxn !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction / Refund Ref:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeTxn}</td>
            </tr>` : ''}
            ${safeOrder !== 'N/A' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Razorpay Order ID:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${safeOrder}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #ede9fe; color: #6d28d9; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #ddd6fe;">
                  REFUNDED
                </span>
              </td>
            </tr>
          </table>

          <!-- Reason Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 6px;">
            <strong style="color: #5b21b6; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Refund Reason / Notes:</strong>
            <p style="margin: 0; color: #4c1d95; font-size: 14px; line-height: 1.5;">${safeReason}</p>
          </div>
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

/**
 * Generate HTML template for Payment Pending (User Reminder / Notification)
 */
function generatePaymentPendingUserHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  pendingAmount,
  paymentMethod,
  notes,
  updatedAt
}) {
  const safeName = name || 'Delegate';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeMethod = paymentMethod || 'Online Gateway';
  const safeNotes = notes || 'Payment is pending. Please complete the transaction to confirm your registration seat.';
  const dateStr = updatedAt
    ? new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Payment Pending - SPCTT 2027</title>
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

      <!-- Pending Notification Banner -->
      <div style="background-color: #fffbeb; border-bottom: 1px solid #fde68a; padding: 22px 24px; text-align: center;">
        <span style="background-color: #d97706; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.8px; display: inline-block; margin-bottom: 8px;">Payment Pending</span>
        <h2 style="margin: 0; color: #92400e; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">Action Required: Complete Registration Payment</h2>
      </div>

      <!-- Main Body -->
      <div class="mobile-padding" style="padding: 32px 24px;">
        <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #334155;">
          Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Thank you for initiating your registration for the <strong>SPCTT 2027 Annual Conference</strong>. Your attendee details have been received, but your payment is currently <strong>PENDING</strong>.
        </p>

        <!-- Pending Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Registration Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Total Payable Amount:</td>
              <td style="padding: 8px 0; color: #d97706; font-weight: 800; font-size: 17px;">${formatRs(pendingAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #fde68a;">
                  PENDING
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Last Updated:</td>
              <td style="padding: 8px 0; color: #1e293b;">${dateStr} (IST)</td>
            </tr>
          </table>

          <!-- Note Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <strong style="color: #92400e; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Notice:</strong>
            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${safeNotes}</p>
          </div>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #166534; font-weight: 700;">How to complete your payment:</h4>
          <p style="margin: 0; font-size: 14px; color: #15803d; line-height: 1.6;">
            Please log in to your account at <strong>2027.spctt.org</strong> to complete your online payment securely via UPI, Credit/Debit Card, or Net Banking to confirm your delegate pass.
          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="https://2027.spctt.org/registration/register" style="background-color: #13254A; color: #ffffff; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(19, 37, 74, 0.3);">
            Complete Payment Now
          </a>
        </div>

        <!-- Signoff -->
        <div style="margin-top: 34px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="responsive-td" style="vertical-align: top; padding: 0 8px 12px 0; word-break: break-word;">
                <p style="margin: 0 0 4px 0;">Warm regards,</p>
                <p style="margin: 0; font-weight: 700; color: #13254A;">SPCTT 2027 Organizing Committee</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Society for Pediatric Cellular Therapy and Transplant</p>
              </td>
              <td class="responsive-td" style="vertical-align: top; text-align: right; padding: 0 0 12px 8px; word-break: break-word;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #13254A; font-size: 14px;">Registration Support:</p>
                <p style="margin: 0; font-size: 13px; color: #64748b; word-break: break-all;">Email: <a href="mailto:Support@pageworldwide.com" style="color: #13254A; text-decoration: none; font-weight: 600;">Support@pageworldwide.com</a></p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; 2026-2027 Society for Pediatric Cellular Therapy and Transplant. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Generate HTML template for Payment Pending (Admin Alert)
 */
function generatePaymentPendingAdminHtml({
  name,
  email,
  phone,
  organization,
  registrationCode,
  categoryName,
  pendingAmount,
  paymentMethod,
  notes,
  updatedAt
}) {
  const safeName = name || 'N/A';
  const safeEmail = email || 'N/A';
  const safePhone = phone || 'N/A';
  const safeOrg = organization || 'N/A';
  const safeCode = registrationCode || 'N/A';
  const safeCat = categoryName || 'Conference Registration';
  const safeNotes = notes || 'Registration status marked as Pending Payment';
  const dateStr = updatedAt
    ? new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const formatRs = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Pending Alert - SPCTT 2027</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #1e293b;">
    <div style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      ${generateEmailHeaderHtml()}

      <!-- Admin Alert Bar -->
      <div style="padding: 18px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <span style="background-color: #d97706; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 10px; letter-spacing: 0.8px;">Payment Pending Alert</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 800; color: #92400e;">Registration Payment Pending</h2>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
          Hello Administrator,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          The payment status for delegate <strong>${safeName}</strong> has been set to <strong>PENDING</strong> on <strong>${dateStr} (IST)</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 38%; font-weight: 600;">Registration Code:</td>
              <td style="padding: 8px 0; color: #13254A; font-weight: 800; font-family: monospace; font-size: 16px;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #004b63; font-weight: 700;">${safeCat}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${safeEmail}" style="color: #004b63; text-decoration: none; font-weight: 600;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Delegate Phone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization / Inst:</td>
              <td style="padding: 8px 0; color: #1e293b;">${safeOrg}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount Pending:</td>
              <td style="padding: 8px 0; color: #d97706; font-weight: 800; font-size: 16px;">${formatRs(pendingAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; border: 1px solid #fde68a;">
                  PENDING
                </span>
              </td>
            </tr>
          </table>

          <!-- Reason Callout -->
          <div style="margin-top: 16px; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <strong style="color: #92400e; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 2px;">Admin Notes:</strong>
            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${safeNotes}</p>
          </div>
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
    const abstractCode = abstract.abstract_code || (abstract.id ? `ABS-${String(abstract.id).padStart(3, '0')}` : 'N/A');
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
    const abstractCode = abstract.abstract_code || (abstract.id ? `ABS-${String(abstract.id).padStart(3, '0')}` : 'N/A');
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
  },

  /**
   * Send Registration Payment Success Emails (To User & To Admin)
   */
  async sendPaymentSuccessEmails({ registration, payment, user, invoices = [] }) {
    if (!registration) {
      console.warn('⚠️ No registration provided to sendPaymentSuccessEmails.');
      return { success: false, error: 'Registration is required.' };
    }

    const regUser = user || {};
    const recipientEmail = registration.email || regUser.email;
    const recipientName = registration.full_name || regUser.name || 'Delegate';
    const recipientPhone = registration.phone || regUser.phone || '';
    const organization = registration.organization || regUser.organization || '';
    const registrationCode = registration.registration_code || (registration.id ? `SPCTT-${String(registration.id).padStart(3, '0')}` : 'PENDING');
    const categoryName = registration.category_name || 'Conference Delegate';

    const subtotal = parseFloat(registration.subtotal || 0);
    const gstAmount = parseFloat(registration.gst_amount || 0);
    const grandTotal = parseFloat(registration.grand_total || 0);
    const facilitationCharge = parseFloat((grandTotal * 0.045).toFixed(2));
    const totalPaid = payment?.amount ? parseFloat(payment.amount) : parseFloat((grandTotal + facilitationCharge).toFixed(2));

    const transactionId = payment?.razorpay_payment_id || registration.transaction_id || `PAY_${Date.now()}`;
    const orderId = payment?.razorpay_order_id || 'N/A';
    const paymentMethod = payment?.payment_method || registration.payment_method || 'Razorpay (PAGE WORLDWIDE)';
    const paidAt = payment?.updated_at || registration.paid_at || new Date();

    let accompanyingPersons = [];
    try {
      if (typeof registration.accompanying_persons === 'string') {
        accompanyingPersons = JSON.parse(registration.accompanying_persons);
      } else if (Array.isArray(registration.accompanying_persons)) {
        accompanyingPersons = registration.accompanying_persons;
      }
    } catch (e) {
      accompanyingPersons = [];
    }

    const fromAddress = process.env.REGISTRATION_FROM || config.EMAIL.REGISTRATION_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';
    const adminEmail = process.env.REGISTRATION_ADMIN_EMAIL || config.EMAIL.REGISTRATION_ADMIN_EMAIL || 'submit@spctt.org';

    const results = {
      userEmail: null,
      adminEmail: null
    };

    let activeTransporter;
    try {
      activeTransporter = getTransporter();
    } catch (tErr) {
      console.error('❌ Could not initialize SMTP transporter for payment success emails:', tErr.message);
      return { success: false, error: tErr.message };
    }

    // 1. Send Success Email to User
    if (recipientEmail) {
      const userSubject = `[SPCTT 2027] Payment Confirmed - Registration ${registrationCode} (${recipientName})`;
      const userHtml = generatePaymentSuccessUserHtml({
        name: recipientName,
        email: recipientEmail,
        phone: recipientPhone,
        organization,
        registrationCode,
        categoryName,
        subtotal,
        gstAmount,
        facilitationCharge,
        grandTotal,
        totalPaid,
        transactionId,
        orderId,
        paymentMethod,
        paidAt,
        accompanyingCount: registration.accompanying_count || 0,
        accompanyingPersons
      });

      const userMailOptions = {
        from: fromAddress,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject: userSubject,
        html: userHtml
      };

      try {
        console.log(`📧 Sending payment success confirmation email to User '${recipientEmail}'...`);
        const userInfo = await activeTransporter.sendMail(userMailOptions);
        console.log(`✅ User payment confirmation sent! MessageId: ${userInfo.messageId}`);

        await EmailLog.create({
          registrationId: registration.id,
          userId: registration.user_id || regUser.id,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_success_user',
          status: 'sent',
          errorMessage: null
        });

        results.userEmail = {
          success: true,
          messageId: userInfo.messageId,
          recipient: recipientEmail
        };
      } catch (userErr) {
        console.error(`❌ Failed to send payment confirmation to User (${recipientEmail}):`, userErr.message);

        await EmailLog.create({
          registrationId: registration.id,
          userId: registration.user_id || regUser.id,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_success_user',
          status: 'failed',
          errorMessage: userErr.message
        });

        results.userEmail = {
          success: false,
          error: userErr.message
        };
      }
    }

    // 2. Send Success Notification to Admin (with CC)
    const adminSubject = `[Payment Received] ${registrationCode} - ${recipientName} (${categoryName}) - ₹${totalPaid}`;
    const adminHtml = generatePaymentSuccessAdminHtml({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone,
      organization,
      registrationCode,
      categoryName,
      subtotal,
      gstAmount,
      facilitationCharge,
      grandTotal,
      totalPaid,
      transactionId,
      orderId,
      paymentMethod,
      paidAt,
      accompanyingCount: registration.accompanying_count || 0,
      accompanyingPersons
    });

    const adminMailOptions = {
      from: fromAddress,
      to: `"SPCTT Admin" <${adminEmail}>`,
      cc: ccAddress,
      subject: adminSubject,
      html: adminHtml
    };

    try {
      console.log(`📧 Sending payment success alert to Admin '${adminEmail}', CC: '${ccAddress}'...`);
      const adminInfo = await activeTransporter.sendMail(adminMailOptions);
      console.log(`✅ Admin payment notification sent! MessageId: ${adminInfo.messageId}`);

      await EmailLog.create({
        registrationId: registration.id,
        userId: registration.user_id || regUser.id,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_success_admin',
        status: 'sent',
        errorMessage: null
      });

      results.adminEmail = {
        success: true,
        messageId: adminInfo.messageId,
        recipient: adminEmail,
        cc: ccAddress
      };
    } catch (adminErr) {
      console.error(`❌ Failed to send payment notification to Admin (${adminEmail}):`, adminErr.message);

      await EmailLog.create({
        registrationId: registration.id,
        userId: registration.user_id || regUser.id,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_success_admin',
        status: 'failed',
        errorMessage: adminErr.message
      });

      results.adminEmail = {
        success: false,
        error: adminErr.message
      };
    }

    return results;
  },

  /**
   * Send Registration Payment Failed Emails (To User & To Admin)
   */
  async sendPaymentFailedEmails({ registration, payment, user, failureReason, orderId, paymentId, attemptedAmount }) {
    const regUser = user || {};
    const recipientEmail = registration?.email || regUser.email;
    const recipientName = registration?.full_name || regUser.name || 'Delegate';
    const recipientPhone = registration?.phone || regUser.phone || '';
    const organization = registration?.organization || regUser.organization || '';
    const registrationCode = registration?.registration_code || (registration?.id ? `SPCTT-${String(registration.id).padStart(3, '0')}` : 'PENDING');
    const categoryName = registration?.category_name || 'Conference Registration';

    const grandTotal = parseFloat(registration?.grand_total || 0);
    const finalAttemptedAmount = attemptedAmount || payment?.amount || grandTotal || 0;
    const transactionId = paymentId || payment?.razorpay_payment_id || 'N/A';
    const finalOrderId = orderId || payment?.razorpay_order_id || 'N/A';
    const paymentMethod = payment?.payment_method || registration?.payment_method || 'Razorpay (PAGE WORLDWIDE)';
    const attemptedAt = new Date();

    const fromAddress = process.env.REGISTRATION_FROM || config.EMAIL.REGISTRATION_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';
    const adminEmail = process.env.REGISTRATION_ADMIN_EMAIL || config.EMAIL.REGISTRATION_ADMIN_EMAIL || 'submit@spctt.org';

    const results = {
      userEmail: null,
      adminEmail: null
    };

    let activeTransporter;
    try {
      activeTransporter = getTransporter();
    } catch (tErr) {
      console.error('❌ Could not initialize SMTP transporter for payment failed emails:', tErr.message);
      return { success: false, error: tErr.message };
    }

    // 1. Send Failure Alert to User
    if (recipientEmail) {
      const userSubject = `[SPCTT 2027] Payment Unsuccessful - Action Required for Registration (${registrationCode})`;
      const userHtml = generatePaymentFailedUserHtml({
        name: recipientName,
        email: recipientEmail,
        registrationCode,
        categoryName,
        attemptedAmount: finalAttemptedAmount,
        transactionId,
        orderId: finalOrderId,
        paymentMethod,
        failureReason,
        attemptedAt
      });

      const userMailOptions = {
        from: fromAddress,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject: userSubject,
        html: userHtml
      };

      try {
        console.log(`📧 Sending payment failure alert email to User '${recipientEmail}'...`);
        const userInfo = await activeTransporter.sendMail(userMailOptions);
        console.log(`✅ User payment failure alert sent! MessageId: ${userInfo.messageId}`);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_failed_user',
          status: 'sent',
          errorMessage: null
        });

        results.userEmail = {
          success: true,
          messageId: userInfo.messageId,
          recipient: recipientEmail
        };
      } catch (userErr) {
        console.error(`❌ Failed to send payment failure alert to User (${recipientEmail}):`, userErr.message);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_failed_user',
          status: 'failed',
          errorMessage: userErr.message
        });

        results.userEmail = {
          success: false,
          error: userErr.message
        };
      }
    }

    // 2. Send Failure Alert to Admin (with CC)
    const adminSubject = `[Payment Failed Alert] ${registrationCode} - ${recipientName} (${categoryName}) - ₹${finalAttemptedAmount}`;
    const adminHtml = generatePaymentFailedAdminHtml({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone,
      organization,
      registrationCode,
      categoryName,
      attemptedAmount: finalAttemptedAmount,
      transactionId,
      orderId: finalOrderId,
      paymentMethod,
      failureReason,
      attemptedAt
    });

    const adminMailOptions = {
      from: fromAddress,
      to: `"SPCTT Admin" <${adminEmail}>`,
      cc: ccAddress,
      subject: adminSubject,
      html: adminHtml
    };

    try {
      console.log(`📧 Sending payment failure alert to Admin '${adminEmail}', CC: '${ccAddress}'...`);
      const adminInfo = await activeTransporter.sendMail(adminMailOptions);
      console.log(`✅ Admin payment failure alert sent! MessageId: ${adminInfo.messageId}`);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_failed_admin',
        status: 'sent',
        errorMessage: null
      });

      results.adminEmail = {
        success: true,
        messageId: adminInfo.messageId,
        recipient: adminEmail,
        cc: ccAddress
      };
    } catch (adminErr) {
      console.error(`❌ Failed to send payment failure alert to Admin (${adminEmail}):`, adminErr.message);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_failed_admin',
        status: 'failed',
        errorMessage: adminErr.message
      });

      results.adminEmail = {
        success: false,
        error: adminErr.message
      };
    }

    return results;
  },

  /**
   * Send Registration Payment Refunded Emails (To User & To Admin)
   */
  async sendPaymentRefundedEmails({
    registration,
    payment,
    user,
    refundReason,
    refundAmount,
    transactionId,
    orderId
  }) {
    const regUser = user || {};
    const recipientEmail = registration?.email || regUser?.email;
    const recipientName = registration?.full_name || regUser?.name || 'Delegate';
    const recipientPhone = registration?.phone || regUser?.phone || '';
    const organization = registration?.organization || regUser?.organization || '';
    const registrationCode = registration?.registration_code || (registration?.id ? `SPCTT-${String(registration.id).padStart(3, '0')}` : 'N/A');
    const categoryName = registration?.category_name || 'Conference Registration';

    const grandTotal = registration ? parseFloat(registration.grand_total || 0) : 0;
    const finalRefundAmount = refundAmount !== undefined ? parseFloat(refundAmount) : (payment?.amount ? parseFloat(payment.amount) : grandTotal);
    const finalTxnId = transactionId || payment?.razorpay_payment_id || registration?.transaction_id || 'N/A';
    const finalOrderId = orderId || payment?.razorpay_order_id || 'N/A';
    const paymentMethod = payment?.payment_method || registration?.payment_method || 'Original Payment Source';
    const refundedAt = payment?.updated_at || new Date();

    const fromAddress = process.env.REGISTRATION_FROM || config.EMAIL.REGISTRATION_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';
    const adminEmail = process.env.REGISTRATION_ADMIN_EMAIL || config.EMAIL.REGISTRATION_ADMIN_EMAIL || 'submit@spctt.org';

    const results = {
      userEmail: null,
      adminEmail: null
    };

    let activeTransporter;
    try {
      activeTransporter = getTransporter();
    } catch (tErr) {
      console.error('❌ Could not initialize SMTP transporter for payment refund emails:', tErr.message);
      return { success: false, error: tErr.message };
    }

    // 1. Send Refund Notification to User
    if (recipientEmail) {
      const userSubject = `[SPCTT 2027] Payment Refund Notification - Registration ${registrationCode} (${recipientName})`;
      const userHtml = generatePaymentRefundedUserHtml({
        name: recipientName,
        email: recipientEmail,
        phone: recipientPhone,
        organization,
        registrationCode,
        categoryName,
        refundAmount: finalRefundAmount,
        transactionId: finalTxnId,
        orderId: finalOrderId,
        paymentMethod,
        refundReason,
        refundedAt
      });

      const userMailOptions = {
        from: fromAddress,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject: userSubject,
        html: userHtml
      };

      try {
        console.log(`📧 Sending payment refund notification to User '${recipientEmail}'...`);
        const userInfo = await activeTransporter.sendMail(userMailOptions);
        console.log(`✅ User payment refund email sent! MessageId: ${userInfo.messageId}`);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_refunded_user',
          status: 'sent',
          errorMessage: null
        });

        results.userEmail = {
          success: true,
          messageId: userInfo.messageId,
          recipient: recipientEmail
        };
      } catch (userErr) {
        console.error(`❌ Failed to send payment refund email to User (${recipientEmail}):`, userErr.message);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_refunded_user',
          status: 'failed',
          errorMessage: userErr.message
        });

        results.userEmail = {
          success: false,
          error: userErr.message
        };
      }
    }

    // 2. Send Refund Alert to Admin (with CC)
    const adminSubject = `[Payment Refund Alert] ${registrationCode} - ${recipientName} (${categoryName}) - ₹${finalRefundAmount}`;
    const adminHtml = generatePaymentRefundedAdminHtml({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone,
      organization,
      registrationCode,
      categoryName,
      refundAmount: finalRefundAmount,
      transactionId: finalTxnId,
      orderId: finalOrderId,
      paymentMethod,
      refundReason,
      refundedAt
    });

    const adminMailOptions = {
      from: fromAddress,
      to: `"SPCTT Admin" <${adminEmail}>`,
      cc: ccAddress,
      subject: adminSubject,
      html: adminHtml
    };

    try {
      console.log(`📧 Sending payment refund alert to Admin '${adminEmail}', CC: '${ccAddress}'...`);
      const adminInfo = await activeTransporter.sendMail(adminMailOptions);
      console.log(`✅ Admin payment refund alert sent! MessageId: ${adminInfo.messageId}`);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_refunded_admin',
        status: 'sent',
        errorMessage: null
      });

      results.adminEmail = {
        success: true,
        messageId: adminInfo.messageId,
        recipient: adminEmail,
        cc: ccAddress
      };
    } catch (adminErr) {
      console.error(`❌ Failed to send payment refund alert to Admin (${adminEmail}):`, adminErr.message);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_refunded_admin',
        status: 'failed',
        errorMessage: adminErr.message
      });

      results.adminEmail = {
        success: false,
        error: adminErr.message
      };
    }

    return results;
  },

  /**
   * Send Registration Payment Pending Emails (To User & To Admin)
   */
  async sendPaymentPendingEmails({
    registration,
    payment,
    user,
    pendingAmount,
    notes
  }) {
    const regUser = user || {};
    const recipientEmail = registration?.email || regUser?.email;
    const recipientName = registration?.full_name || regUser?.name || 'Delegate';
    const recipientPhone = registration?.phone || regUser?.phone || '';
    const organization = registration?.organization || regUser?.organization || '';
    const registrationCode = registration?.registration_code || (registration?.id ? `SPCTT-${String(registration.id).padStart(3, '0')}` : 'N/A');
    const categoryName = registration?.category_name || 'Conference Registration';

    const grandTotal = registration ? parseFloat(registration.grand_total || 0) : 0;
    const finalPendingAmount = pendingAmount !== undefined ? parseFloat(pendingAmount) : grandTotal;
    const paymentMethod = payment?.payment_method || registration?.payment_method || 'Online Payment';
    const updatedAt = payment?.updated_at || new Date();

    const fromAddress = process.env.REGISTRATION_FROM || config.EMAIL.REGISTRATION_FROM || config.EMAIL.DEFAULT_FROM || '"SPCTT 2027" <submit@spctt.org>';
    const ccAddress = process.env.EMAIL_CC_DEFAULT || config.EMAIL.CC_DEFAULT || 'tvivek2021@gmail.com';
    const adminEmail = process.env.REGISTRATION_ADMIN_EMAIL || config.EMAIL.REGISTRATION_ADMIN_EMAIL || 'submit@spctt.org';

    const results = {
      userEmail: null,
      adminEmail: null
    };

    let activeTransporter;
    try {
      activeTransporter = getTransporter();
    } catch (tErr) {
      console.error('❌ Could not initialize SMTP transporter for payment pending emails:', tErr.message);
      return { success: false, error: tErr.message };
    }

    // 1. Send Pending Notification to User
    if (recipientEmail) {
      const userSubject = `[SPCTT 2027] Action Required: Payment Pending - Registration ${registrationCode} (${recipientName})`;
      const userHtml = generatePaymentPendingUserHtml({
        name: recipientName,
        email: recipientEmail,
        phone: recipientPhone,
        organization,
        registrationCode,
        categoryName,
        pendingAmount: finalPendingAmount,
        paymentMethod,
        notes,
        updatedAt
      });

      const userMailOptions = {
        from: fromAddress,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject: userSubject,
        html: userHtml
      };

      try {
        console.log(`📧 Sending payment pending notification to User '${recipientEmail}'...`);
        const userInfo = await activeTransporter.sendMail(userMailOptions);
        console.log(`✅ User payment pending email sent! MessageId: ${userInfo.messageId}`);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_pending_user',
          status: 'sent',
          errorMessage: null
        });

        results.userEmail = {
          success: true,
          messageId: userInfo.messageId,
          recipient: recipientEmail
        };
      } catch (userErr) {
        console.error(`❌ Failed to send payment pending email to User (${recipientEmail}):`, userErr.message);

        await EmailLog.create({
          registrationId: registration?.id || null,
          userId: registration?.user_id || regUser.id || null,
          recipientEmail,
          recipientName,
          ccEmail: null,
          fromEmail: fromAddress,
          subject: userSubject,
          emailType: 'payment_pending_user',
          status: 'failed',
          errorMessage: userErr.message
        });

        results.userEmail = {
          success: false,
          error: userErr.message
        };
      }
    }

    // 2. Send Pending Alert to Admin (with CC)
    const adminSubject = `[Payment Pending Alert] ${registrationCode} - ${recipientName} (${categoryName}) - ₹${finalPendingAmount}`;
    const adminHtml = generatePaymentPendingAdminHtml({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone,
      organization,
      registrationCode,
      categoryName,
      pendingAmount: finalPendingAmount,
      paymentMethod,
      notes,
      updatedAt
    });

    const adminMailOptions = {
      from: fromAddress,
      to: `"SPCTT Admin" <${adminEmail}>`,
      cc: ccAddress,
      subject: adminSubject,
      html: adminHtml
    };

    try {
      console.log(`📧 Sending payment pending alert to Admin '${adminEmail}', CC: '${ccAddress}'...`);
      const adminInfo = await activeTransporter.sendMail(adminMailOptions);
      console.log(`✅ Admin payment pending alert sent! MessageId: ${adminInfo.messageId}`);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_pending_admin',
        status: 'sent',
        errorMessage: null
      });

      results.adminEmail = {
        success: true,
        messageId: adminInfo.messageId,
        recipient: adminEmail,
        cc: ccAddress
      };
    } catch (adminErr) {
      console.error(`❌ Failed to send payment pending alert to Admin (${adminEmail}):`, adminErr.message);

      await EmailLog.create({
        registrationId: registration?.id || null,
        userId: registration?.user_id || regUser.id || null,
        recipientEmail: adminEmail,
        recipientName: 'SPCTT Admin',
        ccEmail: ccAddress,
        fromEmail: fromAddress,
        subject: adminSubject,
        emailType: 'payment_pending_admin',
        status: 'failed',
        errorMessage: adminErr.message
      });

      results.adminEmail = {
        success: false,
        error: adminErr.message
      };
    }

    return results;
  }
};

export default emailService;

