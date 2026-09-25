import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADER_IMAGE_URL = 'https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/assets/assets_imgi_2_page_header.png';
const LOCAL_HEADER_IMAGE_PATH = path.join(__dirname, '../assets/receipt_header.png');

let cachedHeaderImageBuffer = null;

/**
 * Fetch header image buffer with in-memory caching and local filesystem fallback
 */
async function getHeaderImageBuffer() {
  if (cachedHeaderImageBuffer) {
    return cachedHeaderImageBuffer;
  }

  // 1. Try local file first for speed
  try {
    if (fs.existsSync(LOCAL_HEADER_IMAGE_PATH)) {
      cachedHeaderImageBuffer = await fs.promises.readFile(LOCAL_HEADER_IMAGE_PATH);
      return cachedHeaderImageBuffer;
    }
  } catch (err) {
    console.warn('Local header image read failed:', err?.message);
  }

  // 2. Fetch from Cloudflare URL
  try {
    const res = await fetch(HEADER_IMAGE_URL);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      cachedHeaderImageBuffer = Buffer.from(arrayBuffer);
      // Save locally in background for next time
      fs.promises.writeFile(LOCAL_HEADER_IMAGE_PATH, cachedHeaderImageBuffer).catch(() => { });
      return cachedHeaderImageBuffer;
    }
  } catch (err) {
    console.error('Failed to fetch header image from Cloudflare:', err?.message);
  }

  return null;
}

/**
 * Format currency in Indian Rupees (e.g. Rs. 8,000.00)
 */
function formatRs(amount) {
  const num = Number(amount || 0);
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date nicely in Indian Standard Time (IST) (e.g. 25 Sep 2026, 05:32 am)
 */
function formatDate(dateValue) {
  if (!dateValue) {
    const now = new Date();
    return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) + ', ' +
      now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  }
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) + ', ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  } catch (e) {
    return String(dateValue);
  }
}

export const invoicePdfService = {
  /**
   * Generate PDF Buffer for an Official Receipt / Tax Invoice
   * @param {Object} invoice Detailed invoice object with joined registration details
   * @returns {Promise<Buffer>}
   */
  async generateInvoicePdf(invoice) {
    const headerBuffer = await getHeaderImageBuffer();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 35,
          autoFirstPage: true,
          info: {
            Title: `${invoice.invoice_number || 'Receipt'} - 4th SPCTT 2027`,
            Author: 'SPCTT 2027 Secretariat',
            Subject: 'Conference Registration Receipt'
          }
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const startX = 35;
        const usableWidth = 525;
        const endX = startX + usableWidth;

        // SPCTT Brand Colors based on https://2027.spctt.org/
        const NAVY_COLOR = '#13254A';       // Primary header dark navy blue
        const PRIMARY_BLUE = '#476EAC';     // Brand primary steel blue
        const ACCENT_RED = '#C0192B';       // Brand signature red
        const TEXT_DARK = '#0F172A';        // Main dark text
        const TEXT_LABEL = '#334155';       // Field label text
        const TEXT_MUTED = '#64748B';       // Muted gray text
        const BORDER_COLOR = '#E2E8F0';     // Card borders

        // 1. Header Banner Image with Conference Details Navy Overlay
        let currentY = 22;
        const bannerHeight = 112;
        const gstNum = (invoice.gst_number && invoice.gst_number !== '08AAMAG2209E1ZX') ? invoice.gst_number : '09AARCP4212B1ZK';

        if (headerBuffer) {
          try {
            doc.image(headerBuffer, startX, currentY, { width: usableWidth, height: bannerHeight });

            // Dark navy overlay for clear text contrast as originally styled
            doc.save();
            doc.rect(startX, currentY, usableWidth, bannerHeight).fillOpacity(0.60).fill('#0B1B3D');
            doc.restore();

            // Border around header banner
            doc.rect(startX, currentY, usableWidth, bannerHeight).lineWidth(1).strokeColor('#476EAC').stroke();

            // Left side text: Conference Title & Society (Enlarged)
            doc.fontSize(17).font('Helvetica-Bold').fillColor('#FFFFFF')
              .text('4th SPCTT 2027', startX + 16, currentY + 12);

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#E2E8F0')
              .text('Annual Conference of Society for Pediatric Cellular Therapy and Transplant', startX + 16, currentY + 36, { width: 310 });

            // Right side text: DATES & VENUE
            const rightX = startX + 320;
            const rightWidth = 190;

            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#93C5FD')
              .text('DATES', rightX, currentY + 12, { width: rightWidth, align: 'right' });
            doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF')
              .text('March 06 & 07, 2027', rightX, currentY + 23, { width: rightWidth, align: 'right' });

            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#93C5FD')
              .text('VENUE', rightX, currentY + 41, { width: rightWidth, align: 'right' });
            doc.fontSize(8.5).font('Helvetica').fillColor('#FFFFFF')
              .text('Taj Vivanta, Dwarka,\nNew Delhi (India)', rightX, currentY + 52, { width: rightWidth, align: 'right' });

            // Bottom bar on Banner: GST Number
            doc.strokeColor('rgba(255, 255, 255, 0.25)').lineWidth(0.75).moveTo(startX + 16, currentY + 88).lineTo(endX - 16, currentY + 88).stroke();

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#93C5FD')
              .text('GST Number : ', startX + 16, currentY + 94, { continued: true })
              .fillColor('#FFFFFF').text(gstNum);

            currentY += bannerHeight + 14;
          } catch (e) {
            console.warn('PDFKit image embed error:', e);
            currentY += 10;
          }
        } else {
          // Fallback Header Block
          doc.rect(startX, currentY, usableWidth, 96).fill(NAVY_COLOR);
          doc.fillColor('#FFFFFF').fontSize(17).font('Helvetica-Bold')
            .text('4th SPCTT 2027', startX + 16, currentY + 12);
          doc.fillColor('#E2E8F0').fontSize(10).font('Helvetica-Bold')
            .text('Annual Conference of Society for Pediatric Cellular Therapy and Transplant', startX + 16, currentY + 36, { width: 310 });

          const rightX = startX + 320;
          const rightWidth = 190;
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#93C5FD')
            .text('DATES', rightX, currentY + 12, { width: rightWidth, align: 'right' });
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text('March 06 & 07, 2027', rightX, currentY + 23, { width: rightWidth, align: 'right' });

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#93C5FD')
            .text('VENUE', rightX, currentY + 41, { width: rightWidth, align: 'right' });
          doc.fontSize(8.5).font('Helvetica').fillColor('#FFFFFF')
            .text('Taj Vivanta, Dwarka,\nNew Delhi (India)', rightX, currentY + 52, { width: rightWidth, align: 'right' });

          // GST Bar
          doc.strokeColor('rgba(255, 255, 255, 0.25)').lineWidth(0.75).moveTo(startX + 16, currentY + 76).lineTo(endX - 16, currentY + 76).stroke();
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#93C5FD')
            .text('GST Number : ', startX + 16, currentY + 80, { continued: true })
            .fillColor('#FFFFFF').text(gstNum);

          currentY += 108;
        }

        // 2. Main Title Bar: REGISTRATION RECEIPT (Navy Theme)
        doc.rect(startX, currentY, usableWidth, 26).fill(NAVY_COLOR);
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text('REGISTRATION RECEIPT', startX, currentY + 6, { width: usableWidth, align: 'center' });

        currentY += 26;

        // 3. Registration No Sub-bar (Primary Brand Blue theme)
        const regCode = invoice.registration_code || `SPC-2027-${String(invoice.registration_id || invoice.id || '001').padStart(4, '0')}`;
        doc.rect(startX, currentY, usableWidth, 24).fill(PRIMARY_BLUE);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text(`Registration No : ${regCode}`, startX, currentY + 5, { width: usableWidth, align: 'center' });

        currentY += 34;

        // Helpers for section banners and field rows
        const drawSectionHeader = (title, y) => {
          doc.rect(startX, y, usableWidth, 22).fill(NAVY_COLOR);
          doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text(title, startX + 12, y + 5);
        };

        const drawFieldRow = (label, value, y, isBoldVal = false) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_LABEL)
            .text(label, startX + 12, y, { width: 180 });
          doc.fontSize(10).font(isBoldVal ? 'Helvetica-Bold' : 'Helvetica').fillColor(TEXT_DARK)
            .text(value || 'N/A', startX + 200, y, { width: usableWidth - 210 });
        };

        const drawAmountRow = (label, value, y, isBoldVal = false) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(isBoldVal ? TEXT_DARK : TEXT_LABEL)
            .text(label, startX + 12, y, { width: 360 });
          doc.fontSize(10).font(isBoldVal ? 'Helvetica-Bold' : 'Helvetica').fillColor(TEXT_DARK)
            .text(value || 'N/A', startX + 380, y, { width: usableWidth - 392, align: 'right' });
        };

        const drawAccentLine = (y) => {
          doc.strokeColor(PRIMARY_BLUE).lineWidth(1.5).moveTo(startX, y).lineTo(endX, y).stroke();
        };

        // 4. Section 1: Delegate Information
        drawSectionHeader('Delegate Information', currentY);
        const attendeeFullName = `${invoice.attendee_title ? invoice.attendee_title + ' ' : ''}${invoice.attendee_name || invoice.user_name || invoice.full_name || 'Registered Delegate'}`.trim();
        const email = invoice.attendee_email || invoice.user_email || 'N/A';
        const category = invoice.category_name || 'Standard Registration';

        drawFieldRow('Full Name', attendeeFullName, currentY + 28, true);
        drawFieldRow('Email', email, currentY + 48);
        drawFieldRow('Category', category, currentY + 68);

        const sec1LineY = currentY + 88;
        drawAccentLine(sec1LineY);

        currentY = sec1LineY + 14;

        // 5. Section 2: Payment Details
        drawSectionHeader('Payment Details', currentY);
        let rawMethod = invoice.payment_method || 'Axis Razorpay (PAGE WORLDWIDE)';
        rawMethod = rawMethod.replace(/Elisyan\s*India/gi, 'PAGE WORLDWIDE');
        const paymentGateway = rawMethod.toUpperCase();
        const txnId = invoice.transaction_id || invoice.razorpay_payment_id || 'pay_TfyPpx6ytAA70R';
        const paymentDate = formatDate(invoice.paid_at || invoice.created_at);

        drawFieldRow('Payment Gateway', paymentGateway, currentY + 28, true);
        drawFieldRow('Transaction ID', txnId, currentY + 48);
        drawFieldRow('Payment Date', paymentDate, currentY + 68);

        const sec2LineY = currentY + 88;
        drawAccentLine(sec2LineY);

        currentY = sec2LineY + 14;

        // 6. Section 3: Amount Breakdown
        drawSectionHeader('Amount Breakdown', currentY);

        const baseAmount = parseFloat(invoice.amount || invoice.rate || 0);
        const gstAmount = parseFloat(invoice.gst_amount || (baseAmount * 0.18).toFixed(2));
        const totalBasePlusGst = parseFloat((baseAmount + gstAmount).toFixed(2));
        const razorpayCharge = parseFloat((totalBasePlusGst * 0.025).toFixed(2));
        const razorpayTax = parseFloat((razorpayCharge * 0.18).toFixed(2));
        const facilitationCharges = parseFloat((razorpayCharge + razorpayTax).toFixed(2));
        const totalPayable = parseFloat((totalBasePlusGst + facilitationCharges).toFixed(2));

        drawAmountRow('Base Amount', formatRs(baseAmount), currentY + 28);
        drawAmountRow('GST (18%)', formatRs(gstAmount), currentY + 47);
        drawAmountRow('Sub Total', formatRs(totalBasePlusGst), currentY + 66);
        drawAmountRow('Facilitation Charges (2.5% Razorpay + 18% Tax on Razorpay)', formatRs(facilitationCharges), currentY + 85);

        // Highlight Total Payable Bar (Website Accent Red)
        const totalBoxY = currentY + 110;
        doc.rect(startX + 8, totalBoxY, usableWidth - 16, 28).fill(ACCENT_RED);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text('TOTAL PAYABLE AMOUNT', startX + 20, totalBoxY + 8);
        doc.fontSize(11.5).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text(formatRs(totalPayable), startX + 20, totalBoxY + 8, { width: usableWidth - 40, align: 'right' });

        const sec3LineY = totalBoxY + 36;
        drawAccentLine(sec3LineY);

        currentY = sec3LineY + 16;

        // 7. Footer & Support Details
        doc.fontSize(11.5).font('Helvetica-Bold').fillColor(NAVY_COLOR)
          .text('Thank You for Registering!', startX, currentY, { width: usableWidth, align: 'center' });

        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_MUTED)
          .text('For Queries & Support:', startX, currentY + 18, { width: usableWidth, align: 'center' });

        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(NAVY_COLOR)
          .text('Email: spctt2027@spctt.org   |   Phone: +91 9217453468   |   Website: https://2027.spctt.org', startX, currentY + 32, { width: usableWidth, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};

export default invoicePdfService;
