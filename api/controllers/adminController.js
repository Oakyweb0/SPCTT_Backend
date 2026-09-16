import { getPool } from '../config/db.js';

/**
 * Get Admin Dashboard Overview Statistics
 * GET /api/admin/dashboard-stats
 */
export async function getDashboardStats(req, res) {
  try {
    const pool = getPool();

    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [regCount] = await pool.query('SELECT COUNT(*) as count FROM registrations');
    const [paidRegCount] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE payment_status = "paid"');
    const [revenueResult] = await pool.query('SELECT SUM(grand_total) as total FROM registrations WHERE payment_status = "paid"');
    const [abstractCount] = await pool.query('SELECT COUNT(*) as count FROM abstracts');

    const [recentRegistrations] = await pool.query(
      `SELECT id, registration_code, title, full_name, email, category_name, grand_total, payment_status, status, created_at 
       FROM registrations ORDER BY id DESC LIMIT 5`
    );

    const [recentAbstracts] = await pool.query(
      `SELECT id, abstract_code, title, authors, category, status, created_at 
       FROM abstracts ORDER BY id DESC LIMIT 5`
    );

    return res.json({
      status: true,
      message: 'Admin dashboard statistics retrieved successfully',
      data: {
        totalUsers: userCount[0].count,
        totalRegistrations: regCount[0].count,
        paidRegistrations: paidRegCount[0].count,
        totalRevenue: parseFloat(revenueResult[0].total || 0),
        totalAbstracts: abstractCount[0].count,
        recentRegistrations,
        recentAbstracts
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
}

/**
 * Get All Registrations
 * GET /api/admin/registrations
 */
export async function getAllRegistrations(req, res) {
  try {
    const pool = getPool();
    const { status, payment_status, search } = req.query;

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
      query += ' AND (full_name LIKE ? OR email LIKE ? OR registration_code LIKE ? OR organization LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY id DESC';

    const [registrations] = await pool.query(query, params);

    return res.json({
      status: true,
      message: 'Registrations retrieved successfully',
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
}

/**
 * Update Registration Status
 * PUT /api/admin/registrations/:id/status
 */
export async function updateRegistrationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const pool = getPool();

    let query = 'UPDATE registrations SET ';
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (paymentStatus) {
      updates.push('payment_status = ?');
      params.push(paymentStatus);
      if (paymentStatus === 'paid') {
        updates.push('paid_at = NOW()');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'No status provided to update.'
      });
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    return res.json({
      status: true,
      message: 'Registration status updated successfully'
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update registration status',
      error: error.message
    });
  }
}

/**
 * Get All Abstracts
 * GET /api/admin/abstracts
 */
export async function getAllAbstracts(req, res) {
  try {
    const pool = getPool();
    const [abstracts] = await pool.query(
      `SELECT a.*, u.name as submitter_name, u.email as submitter_email 
       FROM abstracts a 
       JOIN users u ON a.user_id = u.id 
       ORDER BY a.id DESC`
    );

    return res.json({
      status: true,
      message: 'Abstracts fetched successfully',
      data: abstracts
    });
  } catch (error) {
    console.error('Error fetching all abstracts:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch abstracts',
      error: error.message
    });
  }
}

/**
 * Update Abstract Status
 * PUT /api/admin/abstracts/:id/status
 */
export async function updateAbstractStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reviewComments } = req.body;
    const pool = getPool();

    if (!status) {
      return res.status(400).json({
        status: false,
        message: 'Status is required.'
      });
    }

    await pool.query(
      'UPDATE abstracts SET status = ?, review_comments = ? WHERE id = ?',
      [status, reviewComments || null, id]
    );

    return res.json({
      status: true,
      message: 'Abstract status updated successfully'
    });
  } catch (error) {
    console.error('Error updating abstract status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update abstract status',
      error: error.message
    });
  }
}

/**
 * Get All Invoices
 * GET /api/admin/invoices
 */
export async function getAllInvoices(req, res) {
  try {
    const pool = getPool();
    const [invoices] = await pool.query(
      `SELECT i.*, u.name as user_name, u.email as user_email, r.registration_code 
       FROM invoices i 
       JOIN users u ON i.user_id = u.id 
       JOIN registrations r ON i.registration_id = r.id 
       ORDER BY i.id DESC`
    );

    return res.json({
      status: true,
      message: 'All invoices retrieved successfully',
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching all invoices:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
}

/**
 * Get All Users
 * GET /api/admin/users
 */
export async function getAllUsers(req, res) {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, title, name, email, organization, phone, role, status, created_at FROM users ORDER BY id DESC'
    );

    return res.json({
      status: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
}

export default {
  getDashboardStats,
  getAllRegistrations,
  updateRegistrationStatus,
  getAllAbstracts,
  updateAbstractStatus,
  getAllInvoices,
  getAllUsers
};
