import { getPool } from '../config/database.js';

export const Category = {
  /**
   * Find all active registration categories
   */
  async findAllActive() {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, name, code, price, currency, description, status FROM registration_categories WHERE status = "active" ORDER BY id ASC'
    );
    return rows;
  },

  /**
   * Find category by ID
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registration_categories WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find category by Code
   */
  async findByCode(code) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registration_categories WHERE code = ? LIMIT 1',
      [code]
    );
    return rows[0] || null;
  }
};

export default Category;
