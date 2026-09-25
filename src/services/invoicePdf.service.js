import PDFDocument from 'pdfkit';

/**
 * Format currency in Indian Rupees style (e.g. ₹ 4,720.00)
 */
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return 'INR ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date nicely
 */
function formatDate(dateValue) {
  if (!dateValue) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateValue);
  }
}

export const invoicePdfService = {
  /**
   * Generate PDF Buffer for an Invoice / Receipt
   * @param {Object} invoice Detailed invoice object with joined registration details
   * @returns {Promise<Buffer>}
   */
  async generateInvoicePdf(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `${invoice.invoice_number} - SPCTT 2026`,
            Author: 'SPCTT 2026 Conference Secretariat',
            Subject: invoice.title || 'Conference Registration Invoice / Receipt'
          }
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const isPaid = invoice.status === 'paid' || invoice.invoice_type === 'receipt';
        const isReceipt = invoice.invoice_type === 'receipt';
        const docTitle = isReceipt ? 'OFFICIAL PAYMENT RECEIPT' : 'TAX / PROFORMA INVOICE';

        // 1. Header Banner
        doc.rect(40, 40, 515, 75).fill('#0F172A'); // Dark navy

        // Conference Title
        doc.fillColor('#FFFFFF')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('SPCTT 2026', 55, 52);

        doc.fillColor('#94A3B8')
          .fontSize(9)
          .font('Helvetica')
          .text('2nd Annual Conference of Society of Pediatric Critical Care & Trauma', 55, 74)
          .text('Dates: November 20-22, 2026 | New Delhi, India', 55, 88);

        // Document Type on right
        doc.fillColor('#38BDF8')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(docTitle, 320, 56, { align: 'right', width: 220 });

        doc.fillColor('#E2E8F0')
          .fontSize(8.5)
          .font('Helvetica')
          .text(`GSTIN: 07AAETS9823Q1ZX`, 320, 74, { align: 'right', width: 220 })
          .text(`PAN: AAETS9823Q`, 320, 88, { align: 'right', width: 220 });

        doc.moveDown(2);

        // 2. Status Badge & Metadata Cards
        const cardY = 125;

        // Left Card: Invoice & Transaction Details
        doc.rect(40, cardY, 250, 95).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('TRANSACTION DETAILS', 50, cardY + 10);

        doc.fontSize(8.5).font('Helvetica');
        doc.fillColor('#64748B').text('Invoice Number:', 50, cardY + 28);
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(invoice.invoice_number || 'N/A', 140, cardY + 28);

        doc.font('Helvetica').fillColor('#64748B').text('Invoice Date:', 50, cardY + 42);
        doc.fillColor('#0F172A').text(formatDate(invoice.created_at), 140, cardY + 42);

        doc.fillColor('#64748B').text('Registration ID:', 50, cardY + 56);
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(invoice.registration_code || `REG-${invoice.registration_id}`, 140, cardY + 56);

        doc.font('Helvetica').fillColor('#64748B').text('Payment Status:', 50, cardY + 70);
        if (isPaid) {
          doc.fillColor('#059669').font('Helvetica-Bold').text('PAID / CONFIRMED', 140, cardY + 70);
        } else {
          doc.fillColor('#D97706').font('Helvetica-Bold').text('UNPAID / PENDING', 140, cardY + 70);
        }

        doc.font('Helvetica').fillColor('#64748B').text('Txn / Ref ID:', 50, cardY + 84);
        doc.fillColor('#0F172A').text(invoice.transaction_id || invoice.razorpay_payment_id || 'Pending', 140, cardY + 84);

        // Right Card: Billed To / Delegate Info
        doc.rect(305, cardY, 250, 95).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('BILLED TO (DELEGATE)', 315, cardY + 10);

        const attendeeFullName = `${invoice.attendee_title ? invoice.attendee_title + ' ' : ''}${invoice.attendee_name || invoice.user_name || invoice.full_name || 'Registered Delegate'}`.trim();
        const organization = invoice.billing_entity_name || invoice.organization || invoice.user_organization || 'Independent Delegate';
        const email = invoice.attendee_email || invoice.user_email || 'N/A';
        const phone = invoice.attendee_phone || invoice.user_phone || 'N/A';
        const gst = invoice.gst_number ? `GSTIN: ${invoice.gst_number}` : '';
        const pan = invoice.pan_number ? `PAN: ${invoice.pan_number}` : '';

        doc.fontSize(8.5);
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(attendeeFullName, 315, cardY + 28, { width: 230 });
        doc.fillColor('#475569').font('Helvetica').text(organization, 315, cardY + 42, { width: 230 });
        doc.text(`Email: ${email}`, 315, cardY + 56, { width: 230 });
        doc.text(`Phone: ${phone}`, 315, cardY + 70, { width: 230 });
        if (gst || pan) {
          doc.text([gst, pan].filter(Boolean).join(' | '), 315, cardY + 84, { width: 230 });
        } else {
          doc.text(`Payment Gateway: ${invoice.payment_method || 'Axis Razorpay'}`, 315, cardY + 84, { width: 230 });
        }

        // 3. Table of Items
        const tableY = 235;

        // Table Header
        doc.rect(40, tableY, 515, 24).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
        doc.text('#', 48, tableY + 7, { width: 20 });
        doc.text('ITEM DESCRIPTION', 72, tableY + 7, { width: 220 });
        doc.text('QTY', 300, tableY + 7, { width: 30, align: 'center' });
        doc.text('BASE (INR)', 335, tableY + 7, { width: 60, align: 'right' });
        doc.text('GST (18%)', 400, tableY + 7, { width: 65, align: 'right' });
        doc.text('TOTAL (INR)', 470, tableY + 7, { width: 75, align: 'right' });

        // Item Row 1
        const rowY = tableY + 24;
        doc.rect(40, rowY, 515, 52).fillAndStroke('#FFFFFF', '#E2E8F0');

        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
        doc.text('1', 48, rowY + 10, { width: 20 });
        doc.text(invoice.title || 'SPCTT 2026 Conference Registration', 72, rowY + 10, { width: 220 });

        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
        const itemDesc = invoice.description || `Delegate Registration for ${invoice.category_name || 'Standard Category'} (Category Price)`;
        doc.text(itemDesc, 72, rowY + 24, { width: 220 });

        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica');
        doc.text(String(invoice.quantity || 1), 300, rowY + 16, { width: 30, align: 'center' });
        doc.text(Number(invoice.rate || invoice.amount || 0).toFixed(2), 335, rowY + 16, { width: 60, align: 'right' });
        doc.text(Number(invoice.gst_amount || 0).toFixed(2), 400, rowY + 16, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').text(Number(invoice.total_amount || 0).toFixed(2), 470, rowY + 16, { width: 75, align: 'right' });

        // 4. Totals & Calculation Box
        const totalsY = rowY + 60;

        doc.rect(320, totalsY, 235, 82).fillAndStroke('#F8FAFC', '#CBD5E1');

        doc.fontSize(8.5).font('Helvetica');
        doc.fillColor('#475569').text('Subtotal (Taxable Value):', 330, totalsY + 10);
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(formatCurrency(invoice.amount || invoice.rate), 440, totalsY + 10, { align: 'right', width: 105 });

        doc.font('Helvetica').fillColor('#475569').text('CGST @ 9.00%:', 330, totalsY + 25);
        doc.fillColor('#0F172A').text(formatCurrency((invoice.gst_amount || 0) / 2), 440, totalsY + 25, { align: 'right', width: 105 });

        doc.fillColor('#475569').text('SGST @ 9.00%:', 330, totalsY + 40);
        doc.fillColor('#0F172A').text(formatCurrency((invoice.gst_amount || 0) / 2), 440, totalsY + 40, { align: 'right', width: 105 });

        doc.rect(320, totalsY + 56, 235, 26).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(9.5).font('Helvetica-Bold').text('GRAND TOTAL:', 330, totalsY + 64);
        doc.fillColor('#38BDF8').text(formatCurrency(invoice.total_amount), 440, totalsY + 64, { align: 'right', width: 105 });

        // 5. Payment & Security Confirmation Badge (Left side of totals)
        doc.rect(40, totalsY, 265, 82).fillAndStroke('#F1F5F9', '#CBD5E1');
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('PAYMENT ACKNOWLEDGEMENT', 50, totalsY + 10);

        doc.fontSize(8).font('Helvetica').fillColor('#475569');
        if (isPaid) {
          doc.text(`Payment received and confirmed through ${invoice.payment_method || 'Axis Razorpay Gateway'}.`, 50, totalsY + 26, { width: 245 });
          doc.text(`Paid on: ${formatDate(invoice.paid_at || invoice.created_at)}`, 50, totalsY + 44, { width: 245 });
          doc.text('This is a computer-generated tax receipt and requires no physical signature.', 50, totalsY + 58, { width: 245 });
        } else {
          doc.text('This proforma invoice is generated for payment reference.', 50, totalsY + 26, { width: 245 });
          doc.text('Please complete payment via Axis Razorpay to confirm registration.', 50, totalsY + 44, { width: 245 });
        }

        // 6. Signature & Secretariat Block
        const signY = totalsY + 105;

        doc.rect(40, signY, 515, 70).fillAndStroke('#FFFFFF', '#E2E8F0');

        doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold').text('Society of Pediatric Critical Care & Trauma (SPCTT)', 50, signY + 12);
        doc.fontSize(8).font('Helvetica').fillColor('#64748B');
        doc.text('Conference Secretariat, SPCTT 2026', 50, signY + 26);
        doc.text('Support Email: secretariat@spctt.org | Website: https://spctt.org', 50, signY + 38);
        doc.text('Venue: New Delhi, India | Organised under SPCTT Academic Council', 50, signY + 50);

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5);
        doc.text('Authorized Signatory', 380, signY + 38, { align: 'center', width: 160 });
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B');
        doc.text('SPCTT 2026 Finance & Accounts', 380, signY + 50, { align: 'center', width: 160 });

        // 7. Footer
        doc.fontSize(7.5).fillColor('#94A3B8').text(
          `Document generated on ${new Date().toLocaleString('en-IN')} | SPCTT 2026 Conference Portal`,
          40,
          770,
          { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};

export default invoicePdfService;
