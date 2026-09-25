import { getPool } from '../config/database.js';

export const Invoice = {
  /**
   * Helper to ensure invoices table exists
   */
  async ensureTable() {
    try {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`invoices\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
          \`registration_id\` INT NOT NULL,
          \`user_id\` INT NOT NULL,
          \`invoice_type\` ENUM('proforma_primary', 'proforma_accompanying', 'tax_invoice', 'receipt') DEFAULT 'proforma_primary',
          \`title\` VARCHAR(255) NOT NULL,
          \`description\` TEXT DEFAULT NULL,
          \`quantity\` INT DEFAULT 1,
          \`rate\` DECIMAL(10, 2) NOT NULL,
          \`amount\` DECIMAL(10, 2) NOT NULL,
          \`gst_rate\` DECIMAL(5, 2) DEFAULT 18.00,
          \`gst_amount\` DECIMAL(10, 2) NOT NULL,
          \`total_amount\` DECIMAL(10, 2) NOT NULL,
          \`status\` ENUM('unpaid', 'paid', 'cancelled') DEFAULT 'unpaid',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (\`registration_id\`),
          INDEX (\`user_id\`),
          INDEX (\`invoice_number\`),
          INDEX (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (e) {
      // Table check warning - ignore
    }
  },

  /**
   * Create a new invoice in database
   */
  async create(invoiceData) {
    await this.ensureTable();
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO invoices 
        (invoice_number, registration_id, user_id, invoice_type, title, description, quantity, rate, amount, gst_rate, gst_amount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceData.invoice_number,
        invoiceData.registration_id,
        invoiceData.user_id,
        invoiceData.invoice_type || 'proforma_primary',
        invoiceData.title,
        invoiceData.description || null,
        invoiceData.quantity || 1,
        parseFloat(invoiceData.rate || 0),
        parseFloat(invoiceData.amount || 0),
        parseFloat(invoiceData.gst_rate || 18.00),
        parseFloat(invoiceData.gst_amount || 0),
        parseFloat(invoiceData.total_amount || 0),
        invoiceData.status || 'unpaid'
      ]
    );
    return this.findById(result.insertId);
  },

  /**
   * Find single invoice by ID with complete registration & user details
   */
  async findById(invoiceId, userId = null, role = null) {
    await this.ensureTable();
    const pool = getPool();
    let query = `
      SELECT i.*, 
             r.registration_code, r.title as attendee_title, r.full_name as attendee_name, r.email as attendee_email, 
             r.organization, r.phone as attendee_phone, r.address, r.city, r.state, r.country, r.pincode,
             r.billing_entity_name, r.billing_address, r.gst_number, r.pan_number, 
             r.category_name, r.category_price, r.accompanying_count, r.accompanying_total,
             r.payment_method, r.transaction_id, r.paid_at, r.payment_status,
             u.name as user_name, u.email as user_email, u.phone as user_phone, u.organization as user_organization
      FROM invoices i
      JOIN registrations r ON i.registration_id = r.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `;
    const params = [invoiceId];

    if (userId && role !== 'admin') {
      query += ' AND i.user_id = ?';
      params.push(userId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  /**
   * Find invoice by Invoice Number
   */
  async findByInvoiceNumber(invoiceNumber, userId = null, role = null) {
    await this.ensureTable();
    const pool = getPool();
    let query = `
      SELECT i.*, 
             r.registration_code, r.title as attendee_title, r.full_name as attendee_name, r.email as attendee_email, 
             r.organization, r.phone as attendee_phone, r.address, r.city, r.state, r.country, r.pincode,
             r.billing_entity_name, r.billing_address, r.gst_number, r.pan_number, 
             r.category_name, r.category_price, r.accompanying_count, r.accompanying_total,
             r.payment_method, r.transaction_id, r.paid_at, r.payment_status,
             u.name as user_name, u.email as user_email, u.phone as user_phone, u.organization as user_organization
      FROM invoices i
      JOIN registrations r ON i.registration_id = r.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.invoice_number = ?
    `;
    const params = [invoiceNumber];

    if (userId && role !== 'admin') {
      query += ' AND i.user_id = ?';
      params.push(userId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  /**
   * Find all invoices for a user
   */
  async findByUserId(userId) {
    await this.ensureTable();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT i.*, r.registration_code, r.full_name, r.category_name, r.payment_status, r.transaction_id, r.paid_at
       FROM invoices i
       JOIN registrations r ON i.registration_id = r.id
       WHERE i.user_id = ?
       ORDER BY i.id DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * Find all invoices for a registration ID
   */
  async findByRegistrationId(registrationId) {
    await this.ensureTable();
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM invoices WHERE registration_id = ? ORDER BY id ASC',
      [registrationId]
    );
    return rows;
  },

  /**
   * Find all invoices with filters (Admin view)
   */
  async findAll({ status, invoiceType, search, limit = 50, offset = 0 } = {}) {
    await this.ensureTable();
    const pool = getPool();
    let query = `
      SELECT i.*, 
             r.registration_code, r.full_name as attendee_name, r.category_name, r.payment_status,
             u.name as user_name, u.email as user_email
      FROM invoices i
      JOIN registrations r ON i.registration_id = r.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (invoiceType) {
      query += ' AND i.invoice_type = ?';
      params.push(invoiceType);
    }

    if (search) {
      query += ` AND (
        i.invoice_number LIKE ? OR 
        i.title LIKE ? OR 
        r.registration_code LIKE ? OR 
        r.full_name LIKE ? OR 
        u.email LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY i.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Update status of all invoices for a registration to 'paid'
   */
  async updateStatusToPaid(registrationId) {
    await this.ensureTable();
    const pool = getPool();
    await pool.query('UPDATE invoices SET status = "paid" WHERE registration_id = ?', [registrationId]);
  },

  /**
   * Delete unpaid draft/proforma invoices for regeneration
   */
  async deleteUnpaidByRegistrationId(registrationId) {
    await this.ensureTable();
    const pool = getPool();
    await pool.query('DELETE FROM invoices WHERE registration_id = ? AND status = "unpaid"', [registrationId]);
  }
};

export default Invoice;
