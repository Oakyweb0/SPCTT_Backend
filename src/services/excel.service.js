import ExcelJS from 'exceljs';

/**
 * Helper to apply a professional corporate header and formatting
 */
function styleHeaderRow(row, headerColor = '1E3A8A') {
  row.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerColor }
  };
  row.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  };
  row.height = 28;

  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
  });
}

function styleDataRows(worksheet, startRowNumber = 2) {
  for (let r = startRowNumber; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    row.font = { name: 'Arial', size: 10 };
    row.height = 22;
    row.alignment = { vertical: 'middle' };

    // Zebra striping for readability
    if (r % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  }
}

function autoFitColumns(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const cellVal = cell.value ? cell.value.toString() : '';
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });
    // Set a sensible clamped column width
    column.width = Math.min(Math.max(maxLen + 4, 12), 45);
  });
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(dateValue);
  }
}

export const excelService = {
  /**
   * Generate Excel Workbook for Abstracts
   * @param {Array} abstracts 
   * @returns {Promise<Buffer>}
   */
  async generateAbstractsExcel(abstracts = []) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPCTT 2026 Admin Portal';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Abstract Submissions', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8, style: { alignment: { horizontal: 'center' } } },
      { header: 'Abstract Code', key: 'abstract_code', width: 16, style: { alignment: { horizontal: 'center' } } },
      { header: 'Category', key: 'category', width: 14, style: { alignment: { horizontal: 'center' } } },
      { header: 'Topic / Title', key: 'topic', width: 36 },
      { header: 'Presenter / Authors', key: 'name', width: 26 },
      { header: 'Institution / Affiliation', key: 'institute_name', width: 30 },
      { header: 'Email Address', key: 'email', width: 26 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Status', key: 'status', width: 15, style: { alignment: { horizontal: 'center' } } },
      { header: 'Review Comments', key: 'review_comments', width: 32 },
      { header: 'Attached PDF Document URL', key: 'pdf_url', width: 35 },
      { header: 'Registered Submitter', key: 'submitter_name', width: 22 },
      { header: 'Submitter Email', key: 'submitter_email', width: 26 },
      { header: 'Submission Date', key: 'created_at', width: 22, style: { alignment: { horizontal: 'center' } } }
    ];

    styleHeaderRow(worksheet.getRow(1), '0284C7'); // Blue theme header

    abstracts.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        abstract_code: item.abstract_code || `ABS-${item.id}`,
        category: (item.category || 'Poster').toUpperCase(),
        topic: item.topic || item.title || 'N/A',
        name: item.name || item.authors || item.display_name || 'N/A',
        institute_name: item.institute_name || item.affiliation || item.display_institute || 'N/A',
        email: item.email || item.display_email || 'N/A',
        phone: item.phone || item.display_phone || 'N/A',
        status: (item.status || 'pending').toUpperCase(),
        review_comments: item.review_comments || 'None',
        pdf_url: item.pdf_url || item.file_url || 'No Document Attached',
        submitter_name: item.submitter_name || 'N/A',
        submitter_email: item.submitter_email || 'N/A',
        created_at: formatDate(item.created_at)
      });
    });

    styleDataRows(worksheet, 2);
    autoFitColumns(worksheet);

    return workbook.xlsx.writeBuffer();
  },

  /**
   * Generate Excel Workbook for Registrations
   * @param {Array} registrations 
   * @returns {Promise<Buffer>}
   */
  async generateRegistrationsExcel(registrations = []) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPCTT 2026 Admin Portal';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Conference Registrations', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8, style: { alignment: { horizontal: 'center' } } },
      { header: 'Registration ID', key: 'registration_code', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Delegate Name', key: 'full_name', width: 26 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Organization / Institution', key: 'organization', width: 30 },
      { header: 'Registration Category', key: 'category_name', width: 24 },
      { header: 'Amount (₹)', key: 'amount', width: 15, style: { alignment: { horizontal: 'right' } } },
      { header: 'Payment Status', key: 'payment_status', width: 16, style: { alignment: { horizontal: 'center' } } },
      { header: 'Registration Status', key: 'status', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Payment Ref / ID', key: 'payment_id', width: 24 },
      { header: 'Accompanying Count', key: 'accompanying_count', width: 20, style: { alignment: { horizontal: 'center' } } },
      { header: 'Registration Date', key: 'created_at', width: 22, style: { alignment: { horizontal: 'center' } } }
    ];

    styleHeaderRow(worksheet.getRow(1), '1E3A8A'); // Dark blue theme header

    registrations.forEach((item, index) => {
      let accCount = 0;
      if (Array.isArray(item.accompanying_persons)) {
        accCount = item.accompanying_persons.length;
      } else if (typeof item.accompanying_persons === 'string') {
        try {
          const parsed = JSON.parse(item.accompanying_persons);
          if (Array.isArray(parsed)) accCount = parsed.length;
        } catch (e) {}
      }

      worksheet.addRow({
        sno: index + 1,
        registration_code: item.registration_code || `#${item.id}`,
        full_name: `${item.title ? item.title + ' ' : ''}${item.full_name || item.name || 'N/A'}`.trim(),
        email: item.email || 'N/A',
        phone: item.phone || 'N/A',
        organization: item.organization || 'N/A',
        category_name: item.category_name || item.category || 'Standard',
        amount: Number(item.total_amount || item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        payment_status: (item.payment_status || 'unpaid').toUpperCase(),
        status: (item.status || 'draft').toUpperCase(),
        payment_id: item.razorpay_payment_id || item.payment_id || 'N/A',
        accompanying_count: accCount,
        created_at: formatDate(item.created_at)
      });
    });

    styleDataRows(worksheet, 2);
    autoFitColumns(worksheet);

    return workbook.xlsx.writeBuffer();
  },

  /**
   * Generate Excel Workbook for Users
   * @param {Array} users 
   * @returns {Promise<Buffer>}
   */
  async generateUsersExcel(users = []) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPCTT 2026 Admin Portal';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Registered Users', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8, style: { alignment: { horizontal: 'center' } } },
      { header: 'User ID', key: 'id', width: 12, style: { alignment: { horizontal: 'center' } } },
      { header: 'Full Name', key: 'name', width: 26 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Organization / Institution', key: 'organization', width: 30 },
      { header: 'Role', key: 'role', width: 14, style: { alignment: { horizontal: 'center' } } },
      { header: 'Account Status', key: 'status', width: 16, style: { alignment: { horizontal: 'center' } } },
      { header: 'Joined Date', key: 'created_at', width: 22, style: { alignment: { horizontal: 'center' } } }
    ];

    styleHeaderRow(worksheet.getRow(1), '047857'); // Emerald green theme header

    users.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        id: item.id,
        name: `${item.title ? item.title + ' ' : ''}${item.name || 'N/A'}`.trim(),
        email: item.email || 'N/A',
        phone: item.phone || 'N/A',
        organization: item.organization || 'N/A',
        role: (item.role || 'user').toUpperCase(),
        status: (item.status || 'active').toUpperCase(),
        created_at: formatDate(item.created_at)
      });
    });

    styleDataRows(worksheet, 2);
    autoFitColumns(worksheet);

    return workbook.xlsx.writeBuffer();
  },

  /**
   * Generate Excel Workbook for Payments
   * @param {Array} payments 
   * @returns {Promise<Buffer>}
   */
  async generatePaymentsExcel(payments = []) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPCTT 2026 Admin Portal';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Payment Transactions', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8, style: { alignment: { horizontal: 'center' } } },
      { header: 'Payment ID', key: 'id', width: 12, style: { alignment: { horizontal: 'center' } } },
      { header: 'Registration Code', key: 'registration_code', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'User Name', key: 'user_name', width: 26 },
      { header: 'User Email', key: 'user_email', width: 28 },
      { header: 'Amount (₹)', key: 'amount', width: 16, style: { alignment: { horizontal: 'right' } } },
      { header: 'Payment Status', key: 'status', width: 16, style: { alignment: { horizontal: 'center' } } },
      { header: 'Payment Method', key: 'payment_method', width: 26 },
      { header: 'Razorpay Payment ID / Txn ID', key: 'razorpay_payment_id', width: 28 },
      { header: 'Razorpay Order ID', key: 'razorpay_order_id', width: 28 },
      { header: 'Transaction Date', key: 'created_at', width: 22, style: { alignment: { horizontal: 'center' } } }
    ];

    styleHeaderRow(worksheet.getRow(1), '4338CA'); // Indigo theme header

    payments.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        id: item.id,
        registration_code: item.registration_code || `REG-${item.registration_id || 'N/A'}`,
        user_name: item.user_name || item.registration_name || 'N/A',
        user_email: item.user_email || 'N/A',
        amount: Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        status: (item.status || 'created').toUpperCase(),
        payment_method: item.payment_method || 'Axis Razorpay (Elisyan India)',
        razorpay_payment_id: item.razorpay_payment_id || 'N/A',
        razorpay_order_id: item.razorpay_order_id || 'N/A',
        created_at: formatDate(item.created_at)
      });
    });

    styleDataRows(worksheet, 2);
    autoFitColumns(worksheet);

    return workbook.xlsx.writeBuffer();
  }
};

export default excelService;

