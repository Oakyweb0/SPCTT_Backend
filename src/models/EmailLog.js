import { getPool } from '../config/database.js';

export const EmailLog = {
  /**
   * Record a new email log entry
   */
  async create({
    abstractId = null,
    userId = null,
    recipientEmail,
    recipientName = null,
    ccEmail = null,
    fromEmail,
    subject,
    emailType = 'general',
    status = 'sent',
    errorMessage = null
  }) {
    const pool = getPool();
    try {
      const [result] = await pool.query(
        `INSERT INTO \`email_logs\` 
          (\`abstract_id\`, \`user_id\`, \`recipient_email\`, \`recipient_name\`, \`cc_email\`, \`from_email\`, \`subject\`, \`email_type\`, \`status\`, \`error_message\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          abstractId,
          userId,
          recipientEmail,
          recipientName,
          ccEmail,
          fromEmail,
          subject,
          emailType,
          status,
          errorMessage
        ]
      );
      return { id: result.insertId, status, recipientEmail, subject };
    } catch (err) {
      console.warn('⚠️ Could not insert email log into database:', err.message);
      return null;
    }
  },

  /**
   * Find email logs for a specific abstract
   */
  async findByAbstractId(abstractId) {
    const pool = getPool();
    try {
      const [rows] = await pool.query(
        'SELECT * FROM `email_logs` WHERE `abstract_id` = ? ORDER BY `id` DESC',
        [abstractId]
      );
      return rows;
    } catch (err) {
      console.warn('⚠️ Could not fetch email logs for abstract:', err.message);
      return [];
    }
  },

  /**
   * Find recent email logs
   */
  async findAll({ limit = 50, offset = 0 } = {}) {
    const pool = getPool();
    try {
      const [rows] = await pool.query(
        'SELECT * FROM `email_logs` ORDER BY `id` DESC LIMIT ? OFFSET ?',
        [Number(limit), Number(offset)]
      );
      return rows;
    } catch (err) {
      console.warn('⚠️ Could not fetch email logs:', err.message);
      return [];
    }
  }
};

export default EmailLog;
