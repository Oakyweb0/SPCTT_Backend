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

function buildSelectExpressions(cols) {
  const nameExpr = cols.has('name') ? 'a.name' : 'NULL';
  const instituteExpr = cols.has('institute_name') ? 'a.institute_name' : 'NULL';
  const topicExpr = cols.has('topic') ? 'a.topic' : 'NULL';
  const emailExpr = cols.has('email') ? 'a.email' : 'NULL';
  const phoneExpr = cols.has('phone') ? 'a.phone' : 'NULL';
  const pdfExpr = cols.has('pdf_url') ? 'a.pdf_url' : 'NULL';
  const imageExpr = cols.has('image_url') ? 'a.image_url' : 'NULL';

  const authorsExpr = cols.has('authors') ? 'a.authors' : 'NULL';
  const affiliationExpr = cols.has('affiliation') ? 'a.affiliation' : 'NULL';
  const titleExpr = cols.has('title') ? 'a.title' : 'NULL';
  const fileExpr = cols.has('file_url') ? 'a.file_url' : 'NULL';

  return `
    COALESCE(${nameExpr}, ${authorsExpr}, u.name) as display_name, 
    COALESCE(${nameExpr}, ${authorsExpr}, u.name) as name,
    COALESCE(${instituteExpr}, ${affiliationExpr}, u.organization) as display_institute,
    COALESCE(${instituteExpr}, ${affiliationExpr}, u.organization) as institute_name,
    COALESCE(${topicExpr}, ${titleExpr}) as display_topic,
    COALESCE(${topicExpr}, ${titleExpr}) as topic,
    COALESCE(${emailExpr}, u.email) as display_email, 
    COALESCE(${emailExpr}, u.email) as email,
    COALESCE(${phoneExpr}, u.phone) as display_phone, 
    COALESCE(${phoneExpr}, u.phone) as phone,
    COALESCE(${pdfExpr}, NULL) as pdf_url,
    COALESCE(${imageExpr}, NULL) as image_url
  `;
}

function normalizeAbstractRow(row) {
  if (!row) return null;

  let pdfUrl = row.pdf_url || null;
  let imageUrl = row.image_url || null;

  if (row.file_url) {
    if (typeof row.file_url === 'string' && (row.file_url.startsWith('{') || row.file_url.startsWith('{"'))) {
      try {
        const parsed = JSON.parse(row.file_url);
        if (parsed.pdf) pdfUrl = parsed.pdf;
        if (parsed.image) imageUrl = parsed.image;
      } catch (e) {
        pdfUrl = pdfUrl || row.file_url;
      }
    } else if (typeof row.file_url === 'string') {
      const lower = row.file_url.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
        imageUrl = imageUrl || row.file_url;
      } else {
        pdfUrl = pdfUrl || row.file_url;
      }
    }
  }

  return {
    ...row,
    name: row.name || row.authors || row.submitter_name || '',
    institute_name: row.institute_name || row.affiliation || row.submitter_org || '',
    topic: row.topic || row.title || '',
    email: row.email || row.submitter_email || '',
    phone: row.phone || row.submitter_phone || '',
    pdf_url: pdfUrl,
    image_url: imageUrl,
    display_name: row.display_name || row.name || row.authors || row.submitter_name || '',
    display_institute: row.display_institute || row.institute_name || row.affiliation || '',
    display_topic: row.display_topic || row.topic || row.title || ''
  };
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

    let finalStoredFileUrl = finalPdfUrl;
    if (finalPdfUrl && finalImageUrl) {
      finalStoredFileUrl = JSON.stringify({ pdf: finalPdfUrl, image: finalImageUrl });
    } else if (finalImageUrl && !finalPdfUrl) {
      finalStoredFileUrl = finalImageUrl;
    }

    const cols = await getAbstractColumns();

    const insertData = {
      abstract_code: abstractCode,
      user_id: userId,
      title: finalTopic,
      authors: finalName,
      affiliation: finalInstitute,
      category: finalCategory,
      abstract_text: finalAbstractText,
      file_url: finalStoredFileUrl,
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
    const cols = await getAbstractColumns();
    const selectExprs = buildSelectExpressions(cols);

    const [rows] = await pool.query(
      `SELECT a.*, 
              ${selectExprs},
              u.name as submitter_name, 
              u.email as submitter_email, 
              u.phone as submitter_phone, 
              u.organization as submitter_org 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    return normalizeAbstractRow(rows[0]);
  },

  /**
   * Find all abstracts submitted by a specific user
   */
  async findByUserId(userId) {
    const pool = getPool();
    const cols = await getAbstractColumns();
    const selectExprs = buildSelectExpressions(cols);

    const [rows] = await pool.query(
      `SELECT a.*, 
              ${selectExprs},
              u.name as submitter_name, 
              u.email as submitter_email, 
              u.phone as submitter_phone, 
              u.organization as submitter_org 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.user_id = ? 
       ORDER BY a.id DESC`,
      [userId]
    );
    return rows.map(normalizeAbstractRow);
  },

  /**
   * Find all abstracts (Admin view with submitter info and filters)
   */
  async findAll({ status, category, search } = {}) {
    const pool = getPool();
    const cols = await getAbstractColumns();
    const selectExprs = buildSelectExpressions(cols);

    let query = `
      SELECT a.*, 
             ${selectExprs},
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
      const searchConditions = ['u.name LIKE ?', 'u.email LIKE ?'];
      if (cols.has('title')) searchConditions.push('a.title LIKE ?');
      if (cols.has('authors')) searchConditions.push('a.authors LIKE ?');
      if (cols.has('affiliation')) searchConditions.push('a.affiliation LIKE ?');
      if (cols.has('abstract_code')) searchConditions.push('a.abstract_code LIKE ?');
      if (cols.has('topic')) searchConditions.push('a.topic LIKE ?');
      if (cols.has('name')) searchConditions.push('a.name LIKE ?');

      query += ` AND (${searchConditions.join(' OR ')})`;
      const s = `%${search}%`;
      searchConditions.forEach(() => params.push(s));
    }

    query += ' ORDER BY a.id DESC';
    const [rows] = await pool.query(query, params);
    return rows.map(normalizeAbstractRow);
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
    const cols = await getAbstractColumns();
    const selectExprs = buildSelectExpressions(cols);

    const [rows] = await pool.query(
      `SELECT a.*, 
              ${selectExprs},
              u.name as submitter_name, 
              u.email as submitter_email 
       FROM abstracts a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.id DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows.map(normalizeAbstractRow);
  }
};

export default Abstract;

