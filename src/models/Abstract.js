import { getPool } from '../config/database.js';

let cachedColumns = null;

async function getAbstractColumns() {
  if (cachedColumns) return cachedColumns;
  const pool = getPool();
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM `abstracts`');
    cachedColumns = new Set(cols.map((c) => c.Field));
    return cachedColumns;
  } catch (err) {
    console.warn('Could not inspect abstracts columns, using base columns:', err.message);
    return new Set(['id', 'abstract_code', 'user_id', 'title', 'authors', 'affiliation', 'category', 'abstract_text', 'file_url', 'status']);
  }
}

export const Abstract = {
  /**
   * Submit / Create a new abstract
   */
  async create({
    userId,
    name = '',
    instituteName = '',
    category = 'Poster',
    email = '',
    phone = '',
    topic = '',
    title = '',
    authors = '',
    affiliation = '',
    abstractText = '',
    pdfUrl = null,
    imageUrl = null,
    fileUrl = null
  }) {
    const pool = getPool();
    const abstractCode = `ABS-${Math.floor(100000 + Math.random() * 900000)}`;

    const finalName = (name || authors || '').trim();
    const finalInstitute = (instituteName || affiliation || '').trim();
    const finalTopic = (topic || title || '').trim();
    const finalCategory = (category || 'Poster').trim();
    const finalEmail = (email || '').trim();
    const finalPhone = (phone || '').trim();
    const finalAbstractText = (abstractText || '').trim();
    const finalPdfUrl = pdfUrl || fileUrl || null;
    const finalImageUrl = imageUrl || null;

    const cols = await getAbstractColumns();

    const insertData = {
      abstract_code: abstractCode,
      user_id: userId,
      title: finalTopic,
      authors: finalName,
      affiliation: finalInstitute,
      category: finalCategory,
      abstract_text: finalAbstractText,
      file_url: finalPdfUrl,
      status: 'submitted'
    };

    if (cols.has('name')) insertData.name = finalName;
    if (cols.has('institute_name')) insertData.institute_name = finalInstitute;
    if (cols.has('topic')) insertData.topic = finalTopic;
    if (cols.has('email')) insertData.email = finalEmail;
    if (cols.has('phone')) insertData.phone = finalPhone;
    if (cols.has('pdf_url')) insertData.pdf_url = finalPdfUrl;
    if (cols.has('image_url')) insertData.image_url = finalImageUrl;

    const fields = Object.keys(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(insertData);

    const [result] = await pool.query(
      `INSERT INTO \`abstracts\` (\`${fields.join('`, `')}\`) VALUES (${placeholders})`,
      values
    );

    return this.findById(result.insertId);
  },

  /**
   * Find abstract by ID
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, 
              COALESCE(a.name, a.authors, u.name) as display_name, 
              COALESCE(a.name, a.authors, u.name) as name,
              COALESCE(a.institute_name, a.affiliation, u.organization) as display_institute,
              COALESCE(a.institute_name, a.affiliation, u.organization) as institute_name,
              COALESCE(a.topic, a.title) as display_topic,
              COALESCE(a.topic, a.title) as topic,
              COALESCE(a.email, u.email) as display_email, 
              COALESCE(a.email, u.email) as email,
              COALESCE(a.phone, u.phone) as display_phone, 
              COALESCE(a.phone, u.phone) as phone,
              COALESCE(a.pdf_url, a.file_url) as pdf_url,
              u.name as submitter_name, 
              u.email as submitter_email, 
              u.phone as submitter_phone, 
              u.organization as submitter_org 
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
      `SELECT a.*, 
              COALESCE(a.name, a.authors, u.name) as name, 
              COALESCE(a.institute_name, a.affiliation, u.organization) as institute_name,
              COALESCE(a.topic, a.title) as topic,
              COALESCE(a.email, u.email) as email, 
              COALESCE(a.phone, u.phone) as phone,
              COALESCE(a.pdf_url, a.file_url) as pdf_url
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.user_id = ? 
       ORDER BY a.id DESC`,
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
      SELECT a.*, 
             COALESCE(a.name, a.authors, u.name) as display_name, 
             COALESCE(a.name, a.authors, u.name) as name, 
             COALESCE(a.institute_name, a.affiliation, u.organization) as display_institute,
             COALESCE(a.institute_name, a.affiliation, u.organization) as institute_name,
             COALESCE(a.topic, a.title) as display_topic,
             COALESCE(a.topic, a.title) as topic,
             COALESCE(a.email, u.email) as display_email, 
             COALESCE(a.email, u.email) as email, 
             COALESCE(a.phone, u.phone) as display_phone, 
             COALESCE(a.phone, u.phone) as phone, 
             COALESCE(a.pdf_url, a.file_url) as pdf_url,
             u.name as submitter_name, 
             u.email as submitter_email, 
             u.phone as submitter_phone, 
             u.organization as submitter_org 
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
      query += ' AND (a.title LIKE ? OR a.authors LIKE ? OR a.affiliation LIKE ? OR a.abstract_code LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
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
      `SELECT a.*, 
              COALESCE(a.name, a.authors, u.name) as display_name, 
              COALESCE(a.email, u.email) as display_email, 
              COALESCE(a.topic, a.title) as display_topic,
              u.name as submitter_name, 
              u.email as submitter_email 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.id DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  }
};

export default Abstract;
