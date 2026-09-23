import { getPool } from '../config/database.js';

export const Payment = {
  /**
   * Create a new payment record (safely handled if table does not exist)
   */
  async create(paymentData) {
    try {
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO payments 
          (registration_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, payment_method, webhook_event, raw_response) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.registration_id,
          paymentData.user_id,
          paymentData.razorpay_order_id || null,
          paymentData.razorpay_payment_id || null,
          paymentData.razorpay_signature || null,
          paymentData.amount,
          paymentData.currency || 'INR',
          paymentData.status || 'created',
          paymentData.payment_method || 'razorpay',
          paymentData.webhook_event || null,
          paymentData.raw_response ? JSON.stringify(paymentData.raw_response) : null
        ]
      );

      return this.findById(result.insertId);
    } catch (err) {
      console.warn('Payment record creation warning (payments table might be restricted):', err.message);
      return {
        id: Date.now(),
        ...paymentData
      };
    }
  },

  /**
   * Find payment by ID
   */
  async findById(id) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [id]);
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
        'SELECT * FROM payments WHERE razorpay_order_id = ? ORDER BY id DESC LIMIT 1',
        [orderId]
      );
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Find payment by Razorpay Payment ID
   */
  async findByPaymentId(paymentId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT * FROM payments WHERE razorpay_payment_id = ? ORDER BY id DESC LIMIT 1',
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
        'SELECT * FROM payments WHERE registration_id = ? ORDER BY id DESC',
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
        'SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC',
        [userId]
      );
      return rows;
    } catch (err) {
      return [];
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

export default Payment;
