import { getPool } from '../config/database.js';

export const Abstract = {
  /**
   * Submit / Create a new abstract
   */
  async create({ userId, title, authors, affiliation, category, abstractText, fileUrl = null }) {
    const pool = getPool();
    const abstractCode = `ABS-${Math.floor(100000 + Math.random() * 900000)}`;

    const [result] = await pool.query(
      `INSERT INTO abstracts 
        (abstract_code, user_id, title, authors, affiliation, category, abstract_text, file_url, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [abstractCode, userId, title, authors, affiliation, category, abstractText, fileUrl]
    );

    return this.findById(result.insertId);
  },

  /**
   * Find abstract by ID
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone, u.organization as submitter_org 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find all abstracts submitted by a specific user
   */
  async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM abstracts WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    return rows;
  },

  /**
   * Find all abstracts (Admin view with submitter info and filters)
   */
  async findAll({ status, category, search } = {}) {
    const pool = getPool();
    let query = `
      SELECT a.*, u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone, u.organization as submitter_org 
      FROM abstracts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND a.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (a.title LIKE ? OR a.authors LIKE ? OR a.abstract_code LIKE ? OR u.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY a.id DESC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Update abstract status & review comments
   */
  async updateStatus(id, { status, reviewComments }) {
    const pool = getPool();
    await pool.query(
      'UPDATE abstracts SET status = ?, review_comments = ? WHERE id = ?',
      [status, reviewComments || null, id]
    );
    return this.findById(id);
  },

  /**
   * Count total abstracts
   */
  async count() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM abstracts');
    return rows[0]?.count || 0;
  },

  /**
   * Find recent abstracts
   */
  async findRecent(limit = 5) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as submitter_name, u.email as submitter_email 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.id DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  }
};

export default Abstract;
