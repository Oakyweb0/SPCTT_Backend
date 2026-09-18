import { getPool } from '../config/database.js';

export const Registration = {
  /**
   * Find latest registration by User ID
   */
  async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registrations WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if (!rows[0]) return null;

    const reg = { ...rows[0] };
    if (typeof reg.accompanying_persons === 'string') {
      try {
        reg.accompanying_persons = JSON.parse(reg.accompanying_persons);
      } catch (e) {
        reg.accompanying_persons = [];
      }
    }
    return reg;
  },

  /**
   * Find registration by ID
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM registrations WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return null;

    const reg = { ...rows[0] };
    if (typeof reg.accompanying_persons === 'string') {
      try {
        reg.accompanying_persons = JSON.parse(reg.accompanying_persons);
      } catch (e) {
        reg.accompanying_persons = [];
      }
    }
    return reg;
  },

  /**
   * Find active draft or create a new one
   */
  async findOrCreateDraft(userId, user) {
    const pool = getPool();
    const [existing] = await pool.query(
      'SELECT * FROM registrations WHERE user_id = ? AND payment_status != "paid" ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      const reg = { ...existing[0] };
      if (typeof reg.accompanying_persons === 'string') {
        try {
          reg.accompanying_persons = JSON.parse(reg.accompanying_persons);
        } catch (e) {
          reg.accompanying_persons = [];
        }
      }
      return reg;
    }

    const regCode = `#${Math.floor(1000000 + Math.random() * 9000000)}`;
    const [result] = await pool.query(
      `INSERT INTO registrations 
        (registration_code, user_id, title, full_name, email, organization, phone, status, step_completed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1)`,
      [
        regCode,
        userId,
        user.title || 'Mr.',
        user.name || '',
        user.email || '',
        user.organization || null,
        user.phone || null
      ]
    );

    return this.findById(result.insertId);
  },

  /**
   * Update Registration by ID
   */
  async updateById(id, updatesObj) {
    const pool = getPool();
    const keys = Object.keys(updatesObj);
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updatesObj), id];

    await pool.query(`UPDATE registrations SET ${setClauses} WHERE id = ?`, values);
    return this.findById(id);
  },

  /**
   * Invoices: Get Invoices for a registration or user
   */
  async getInvoicesByUserId(userId) {
    const pool = getPool();
    const [invoices] = await pool.query(
      `SELECT i.*, r.registration_code, r.full_name, r.category_name, r.payment_status 
       FROM invoices i 
       JOIN registrations r ON i.registration_id = r.id 
       WHERE i.user_id = ? 
       ORDER BY i.id DESC`,
      [userId]
    );
    return invoices;
  },

  async getInvoicesByRegistrationId(registrationId) {
    const pool = getPool();
    const [invoices] = await pool.query(
      'SELECT * FROM invoices WHERE registration_id = ? ORDER BY id ASC',
      [registrationId]
    );
    return invoices;
  },

  async getInvoiceById(invoiceId, userId = null, role = null) {
    const pool = getPool();
    let query = `
      SELECT i.*, r.registration_code, r.title as attendee_title, r.full_name, r.email as attendee_email, 
             r.organization, r.phone as attendee_phone, r.address, r.city, r.state, r.country, r.pincode,
             r.billing_entity_name, r.billing_address, r.gst_number, r.pan_number, r.payment_method, r.transaction_id, r.paid_at
      FROM invoices i
      JOIN registrations r ON i.registration_id = r.id
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

  async deleteUnpaidInvoices(registrationId) {
    const pool = getPool();
    await pool.query('DELETE FROM invoices WHERE registration_id = ? AND status = "unpaid"', [registrationId]);
  },

  async createInvoice(invoiceData) {
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
        invoiceData.rate,
        invoiceData.amount,
        invoiceData.gst_rate || 18.00,
        invoiceData.gst_amount,
        invoiceData.total_amount,
        invoiceData.status || 'unpaid'
      ]
    );
    return result.insertId;
  },

  async updateInvoicesToPaid(registrationId) {
    const pool = getPool();
    await pool.query('UPDATE invoices SET status = "paid" WHERE registration_id = ?', [registrationId]);
  },

  /**
   * Find all registrations with filters (Admin view)
   */
  async findAll({ status, payment_status, search } = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (payment_status) {
      query += ' AND payment_status = ?';
      params.push(payment_status);
    }
    if (search) {
      query += ' AND (registration_code LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR organization LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY id DESC';
    const [rows] = await pool.query(query, params);

    return rows.map((reg) => {
      const item = { ...reg };
      if (typeof item.accompanying_persons === 'string') {
        try {
          item.accompanying_persons = JSON.parse(item.accompanying_persons);
        } catch (e) {
          item.accompanying_persons = [];
        }
      }
      return item;
    });
  },

  /**
   * Count all registrations
   */
  async countTotal() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM registrations');
    return rows[0]?.count || 0;
  },

  /**
   * Count confirmed / paid registrations
   */
  async countPaid() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE payment_status = "paid"');
    return rows[0]?.count || 0;
  },

  /**
   * Sum total revenue collected from paid registrations
   */
  async sumRevenue() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COALESCE(SUM(grand_total), 0) as total FROM registrations WHERE payment_status = "paid"');
    return parseFloat(rows[0]?.total || 0);
  },

  /**
   * Find recent registrations
   */
  async findRecent(limit = 5) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM registrations ORDER BY id DESC LIMIT ?', [Number(limit)]);
    return rows.map((reg) => {
      const item = { ...reg };
      if (typeof item.accompanying_persons === 'string') {
        try {
          item.accompanying_persons = JSON.parse(item.accompanying_persons);
        } catch (e) {
          item.accompanying_persons = [];
        }
      }
      return item;
    });
  },

  /**
   * Get all invoices (Admin view)
   */
  async getAllInvoices() {
    const pool = getPool();
    const [invoices] = await pool.query(
      `SELECT i.*, r.registration_code, r.full_name, r.category_name, r.payment_status, u.email as user_email 
       FROM invoices i 
       JOIN registrations r ON i.registration_id = r.id 
       LEFT JOIN users u ON i.user_id = u.id 
       ORDER BY i.id DESC`
    );
    return invoices;
  }
};

export default Registration;
