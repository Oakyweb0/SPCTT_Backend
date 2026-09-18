import { getPool } from '../config/database.js';

export const User = {
  /**
   * Find a user by email
   */
  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by ID
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, title, name, email, organization, phone, role, address, city, state, country, pincode, avatar, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by reset token
   */
  async findByResetToken(token) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
      [token]
    );
    return rows[0] || null;
  },

  /**
   * Set password reset token for a user
   */
  async setResetToken(userId, token, expiresAt) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expiresAt, userId]
    );
  },

  /**
   * Clear password reset token
   */
  async clearResetToken(userId) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [userId]
    );
  },

  /**
   * Create a new user
   */
  async create({ title = 'Mr.', name, email, organization = null, phone = null, password, role = 'user', status = 'active' }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO users (title, name, email, organization, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, name, email.trim().toLowerCase(), organization, phone, password, role, status]
    );
    return this.findById(result.insertId);
  },

  /**
   * Update user by ID
   */
  async updateById(id, updatesObj) {
    const pool = getPool();
    const keys = Object.keys(updatesObj);
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updatesObj), id];

    await pool.query(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
    return this.findById(id);
  },

  /**
   * Find all users (Admin view)
   */
  async findAll({ role, status, search } = {}) {
    const pool = getPool();
    let query = 'SELECT id, title, name, email, organization, phone, role, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR organization LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY id DESC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Delete user by ID and cascade delete related records (invoices, registrations, abstracts)
   */
  async deleteById(id) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find user registrations first to delete any child records
      const [regs] = await connection.query('SELECT id FROM registrations WHERE user_id = ?', [id]);
      const regIds = regs.map((r) => r.id);

      // Delete invoices by user_id or registration_id
      if (regIds.length > 0) {
        await connection.query('DELETE FROM invoices WHERE user_id = ? OR registration_id IN (?)', [id, regIds]);
      } else {
        await connection.query('DELETE FROM invoices WHERE user_id = ?', [id]);
      }

      // Delete user's registrations
      await connection.query('DELETE FROM registrations WHERE user_id = ?', [id]);

      // Delete user's abstracts
      await connection.query('DELETE FROM abstracts WHERE user_id = ?', [id]);

      // Delete user
      const [result] = await connection.query('DELETE FROM users WHERE id = ?', [id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Count users by role
   */
  async count(role = 'user') {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    return rows[0].count;
  }
};

export default User;
