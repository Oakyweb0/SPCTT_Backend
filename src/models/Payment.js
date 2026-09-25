import { getPool } from '../config/database.js';

export const Payment = {
  /**
   * Helper to ensure payments table exists
   */
  async ensureTable() {
    try {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`payments\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`registration_id\` INT DEFAULT NULL,
          \`user_id\` INT NOT NULL,
          \`razorpay_order_id\` VARCHAR(100) DEFAULT NULL,
          \`razorpay_payment_id\` VARCHAR(100) DEFAULT NULL,
          \`razorpay_signature\` VARCHAR(255) DEFAULT NULL,
          \`amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          \`currency\` VARCHAR(10) DEFAULT 'INR',
          \`status\` ENUM('created', 'pending', 'paid', 'captured', 'failed', 'refunded') DEFAULT 'created',
          \`payment_method\` VARCHAR(100) DEFAULT 'Axis Razorpay (Elisyan India)',
          \`webhook_event\` VARCHAR(100) DEFAULT NULL,
          \`notes\` TEXT DEFAULT NULL,
          \`raw_response\` LONGTEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (\`registration_id\`),
          INDEX (\`user_id\`),
          INDEX (\`razorpay_order_id\`),
          INDEX (\`razorpay_payment_id\`),
          INDEX (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (e) {
      // Table creation or check warning - ignore
    }
  },

  /**
   * Create a new payment record
   */
  async create(paymentData) {
    try {
      await this.ensureTable();
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO payments 
          (registration_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, payment_method, webhook_event, notes, raw_response) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.registration_id || null,
          paymentData.user_id,
          paymentData.razorpay_order_id || null,
          paymentData.razorpay_payment_id || null,
          paymentData.razorpay_signature || null,
          parseFloat(paymentData.amount || 0),
          paymentData.currency || 'INR',
          paymentData.status || 'created',
          paymentData.payment_method || 'Axis Razorpay (Elisyan India)',
          paymentData.webhook_event || null,
          paymentData.notes || null,
          paymentData.raw_response ? JSON.stringify(paymentData.raw_response) : null
        ]
      );

      return this.findById(result.insertId);
    } catch (err) {
      console.warn('Payment record creation warning:', err.message);
      return {
        id: Date.now(),
        ...paymentData
      };
    }
  },

  /**
   * Find payment by ID with joined user and registration data
   */
  async findById(id) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name, r.payment_status as reg_payment_status,
                u.name as user_name, u.email as user_email, u.phone as user_phone, u.organization as user_organization
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ? LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Find payment by Razorpay Order ID
   */
  async findByOrderId(orderId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name,
                u.name as user_name, u.email as user_email
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.razorpay_order_id = ? 
         ORDER BY p.id DESC LIMIT 1`,
        [orderId]
      );
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Find payment by Razorpay Payment ID / Transaction ID
   */
  async findByPaymentId(paymentId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name,
                u.name as user_name, u.email as user_email
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.razorpay_payment_id = ? 
         ORDER BY p.id DESC LIMIT 1`,
        [paymentId]
      );
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Find latest payment by Registration ID
   */
  async findByRegistrationId(registrationId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT * FROM payments WHERE registration_id = ? ORDER BY id DESC LIMIT 1',
        [registrationId]
      );
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Find all payments for a Registration
   */
  async findAllByRegistrationId(registrationId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         WHERE p.registration_id = ? 
         ORDER BY p.id DESC`,
        [registrationId]
      );
      return rows;
    } catch (err) {
      return [];
    }
  },

  /**
   * Find all payments by User ID
   */
  async findByUserId(userId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name,
                r.subtotal, r.gst_amount, r.grand_total, r.payment_status as reg_payment_status
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         WHERE p.user_id = ? 
         ORDER BY p.id DESC`,
        [userId]
      );
      return rows;
    } catch (err) {
      return [];
    }
  },

  /**
   * Get comprehensive Payment & Transaction History for a User
   */
  async getHistoryByUserId(userId) {
    try {
      await this.ensureTable();
      const pool = getPool();
      
      // 1. Fetch payments from payments table
      const [payments] = await pool.query(
        `SELECT p.*, 
                r.registration_code, r.full_name as registration_name, r.category_name,
                r.subtotal as reg_subtotal, r.gst_amount as reg_gst_amount, r.grand_total as reg_grand_total,
                r.payment_status as reg_payment_status, r.transaction_id as reg_transaction_id, r.paid_at as reg_paid_at,
                u.name as user_name, u.email as user_email
         FROM payments p
         LEFT JOIN registrations r ON p.registration_id = r.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ?
         ORDER BY p.id DESC`,
        [userId]
      );

      // 2. Fetch paid/unpaid invoices as well
      const [invoices] = await pool.query(
        `SELECT i.*, r.registration_code, r.full_name, r.category_name
         FROM invoices i
         LEFT JOIN registrations r ON i.registration_id = r.id
         WHERE i.user_id = ?
         ORDER BY i.id DESC`,
        [userId]
      );

      // 3. If payments table has records, return them with linked invoices
      if (payments && payments.length > 0) {
        return payments.map(p => ({
          ...p,
          raw_response: typeof p.raw_response === 'string' ? safeJsonParse(p.raw_response) : p.raw_response,
          invoices: invoices.filter(inv => inv.registration_id === p.registration_id)
        }));
      }

      // 4. Fallback if no payment rows yet but user has registrations with transactions
      const [registrations] = await pool.query(
        'SELECT * FROM registrations WHERE user_id = ? ORDER BY id DESC',
        [userId]
      );

      return registrations.map(reg => ({
        id: reg.id,
        registration_id: reg.id,
        user_id: reg.user_id,
        registration_code: reg.registration_code,
        category_name: reg.category_name,
        amount: parseFloat(reg.grand_total || 0),
        currency: 'INR',
        status: reg.payment_status || 'pending',
        payment_method: reg.payment_method || 'Axis Razorpay (Elisyan India)',
        razorpay_payment_id: reg.transaction_id || null,
        created_at: reg.paid_at || reg.created_at,
        updated_at: reg.updated_at,
        invoices: invoices.filter(inv => inv.registration_id === reg.id)
      }));
    } catch (err) {
      console.warn('getHistoryByUserId warning:', err.message);
      return [];
    }
  },

  /**
   * Find all payments with filters, pagination and sorting (for Admin / System view)
   */
  async findAll({ status, search, userId, registrationId, limit = 50, offset = 0 } = {}) {
    try {
      await this.ensureTable();
      const pool = getPool();
      let query = `
        SELECT p.*, 
               r.registration_code, r.full_name as registration_name, r.category_name, r.phone as reg_phone,
               u.name as user_name, u.email as user_email, u.phone as user_phone, u.organization as user_organization
        FROM payments p
        LEFT JOIN registrations r ON p.registration_id = r.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (userId) {
        query += ' AND p.user_id = ?';
        params.push(Number(userId));
      }

      if (registrationId) {
        query += ' AND p.registration_id = ?';
        params.push(Number(registrationId));
      }

      if (search) {
        query += ` AND (
          p.razorpay_order_id LIKE ? OR 
          p.razorpay_payment_id LIKE ? OR 
          r.registration_code LIKE ? OR 
          r.full_name LIKE ? OR 
          u.name LIKE ? OR 
          u.email LIKE ?
        )`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s, s);
      }

      query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));

      const [rows] = await pool.query(query, params);
      return rows.map(r => ({
        ...r,
        raw_response: typeof r.raw_response === 'string' ? safeJsonParse(r.raw_response) : r.raw_response
      }));
    } catch (err) {
      console.warn('Payment.findAll error:', err.message);
      return [];
    }
  },

  /**
   * Count all payments matching filter
   */
  async countAll({ status, search, userId, registrationId } = {}) {
    try {
      await this.ensureTable();
      const pool = getPool();
      let query = `
        SELECT COUNT(*) as count 
        FROM payments p
        LEFT JOIN registrations r ON p.registration_id = r.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (userId) {
        query += ' AND p.user_id = ?';
        params.push(Number(userId));
      }

      if (registrationId) {
        query += ' AND p.registration_id = ?';
        params.push(Number(registrationId));
      }

      if (search) {
        query += ` AND (
          p.razorpay_order_id LIKE ? OR 
          p.razorpay_payment_id LIKE ? OR 
          r.registration_code LIKE ? OR 
          r.full_name LIKE ? OR 
          u.name LIKE ? OR 
          u.email LIKE ?
        )`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s, s);
      }

      const [rows] = await pool.query(query, params);
      return rows[0]?.count || 0;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Get Payment Stats (Summary Metrics)
   */
  async getStats() {
    try {
      await this.ensureTable();
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status IN ('paid', 'captured') THEN 1 ELSE 0 END) as successful_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN status IN ('created', 'pending') THEN 1 ELSE 0 END) as pending_count,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'captured') THEN amount ELSE 0 END), 0) as total_collected_amount
        FROM payments
      `);
      return {
        totalTransactions: rows[0]?.total_transactions || 0,
        successfulCount: rows[0]?.successful_count || 0,
        failedCount: rows[0]?.failed_count || 0,
        pendingCount: rows[0]?.pending_count || 0,
        totalRevenue: parseFloat(rows[0]?.total_collected_amount || 0)
      };
    } catch (err) {
      return {
        totalTransactions: 0,
        successfulCount: 0,
        failedCount: 0,
        pendingCount: 0,
        totalRevenue: 0
      };
    }
  },

  /**
   * Update Payment by ID
   */
  async updateById(id, updatesObj) {
    try {
      const pool = getPool();
      const keys = Object.keys(updatesObj);
      if (keys.length === 0) return this.findById(id);

      const values = keys.map((k) => {
        if (k === 'raw_response' && typeof updatesObj[k] === 'object' && updatesObj[k] !== null) {
          return JSON.stringify(updatesObj[k]);
        }
        return updatesObj[k];
      });

      const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ');
      values.push(id);

      await pool.query(`UPDATE payments SET ${setClauses} WHERE id = ?`, values);
      return this.findById(id);
    } catch (err) {
      console.warn('⚠️ Payment record update warning:', err.message);
      return null;
    }
  },

  /**
   * Update Payment by Razorpay Order ID
   */
  async updateByOrderId(orderId, updatesObj) {
    try {
      const pool = getPool();
      const keys = Object.keys(updatesObj);
      if (keys.length === 0) return this.findByOrderId(orderId);

      const values = keys.map((k) => {
        if (k === 'raw_response' && typeof updatesObj[k] === 'object' && updatesObj[k] !== null) {
          return JSON.stringify(updatesObj[k]);
        }
        return updatesObj[k];
      });

      const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ');
      values.push(orderId);

      await pool.query(`UPDATE payments SET ${setClauses} WHERE razorpay_order_id = ?`, values);
      return this.findByOrderId(orderId);
    } catch (err) {
      console.warn('⚠️ Payment record updateByOrderId warning:', err.message);
      return null;
    }
  }
};

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

export default Payment;
