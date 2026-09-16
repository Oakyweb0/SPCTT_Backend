import { getPool } from '../config/db.js';

/**
 * Submit New Abstract
 * POST /api/abstracts
 */
export async function submitAbstract(req, res) {
  try {
    const userId = req.user.user_id;
    const { title, authors, affiliation, category, abstractText } = req.body;

    if (!title || !authors || !affiliation || !category || !abstractText) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Title, authors, affiliation, category, and abstract text are required.'
      });
    }

    const pool = getPool();
    const abstractCode = `ABS-${Date.now().toString().slice(-6)}`;

    const [result] = await pool.query(
      `INSERT INTO abstracts 
        (abstract_code, user_id, title, authors, affiliation, category, abstract_text, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [abstractCode, userId, title.trim(), authors.trim(), affiliation.trim(), category.trim(), abstractText.trim()]
    );

    const [newAbstract] = await pool.query('SELECT * FROM abstracts WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      status: true,
      message: 'Abstract submitted successfully!',
      data: newAbstract[0]
    });
  } catch (error) {
    console.error('Error submitting abstract:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to submit abstract',
      error: error.message
    });
  }
}

/**
 * Get User Abstracts
 * GET /api/abstracts/my
 */
export async function getUserAbstracts(req, res) {
  try {
    const userId = req.user.user_id;
    const pool = getPool();

    const [abstracts] = await pool.query(
      'SELECT * FROM abstracts WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    return res.json({
      status: true,
      message: 'Abstracts fetched successfully',
      data: abstracts
    });
  } catch (error) {
    console.error('Error fetching user abstracts:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch abstracts',
      error: error.message
    });
  }
}

/**
 * Get Abstract By ID
 * GET /api/abstracts/:id
 */
export async function getAbstractById(req, res) {
  try {
    const userId = req.user.user_id;
    const abstractId = req.params.id;
    const pool = getPool();

    const [abstracts] = await pool.query(
      'SELECT * FROM abstracts WHERE id = ? AND (user_id = ? OR ? = "admin")',
      [abstractId, userId, req.user.role]
    );

    if (abstracts.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Abstract not found.'
      });
    }

    return res.json({
      status: true,
      message: 'Abstract retrieved successfully',
      data: abstracts[0]
    });
  } catch (error) {
    console.error('Error fetching abstract:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch abstract',
      error: error.message
    });
  }
}

export default { submitAbstract, getUserAbstracts, getAbstractById };
