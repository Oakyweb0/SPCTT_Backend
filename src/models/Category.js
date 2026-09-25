import { getPool } from '../config/database.js';

export const CATEGORY_FEE_RATES = {
  SPCTT_MEMBERS: {
    regular_fee: 2500.00,
    on_spot_fee: 3000.00,
    name: 'SPCTT Members (Consultants)'
  },
  NON_MEMBERS: {
    regular_fee: 3500.00,
    on_spot_fee: 4000.00,
    name: 'Non-Members (Consultants)'
  },
  FELLOWS_STUDENTS: {
    regular_fee: 2000.00,
    on_spot_fee: 2500.00,
    name: 'Fellows / Students'
  },
  NURSES: {
    regular_fee: 1500.00,
    on_spot_fee: 2000.00,
    name: 'Nurses'
  },
  INDUSTRY_DELEGATES: {
    regular_fee: 5000.00,
    on_spot_fee: 6000.00,
    name: 'Industry Delegates'
  },
  ACCOMPANYING_PERSONS: {
    regular_fee: 3500.00,
    on_spot_fee: 4000.00,
    name: 'Accompanying Persons (including children > 10 yrs old)'
  }
};

export const Category = {
  /**
   * Helper to normalize category pricing based on fee type
   */
  _formatCategory(row, feeType = 'regular') {
    if (!row) return null;
    const isSpot = feeType && (
      String(feeType).toLowerCase() === 'on_spot' || 
      String(feeType).toLowerCase() === 'on-spot' || 
      String(feeType).toLowerCase() === 'onspot' || 
      String(feeType).toLowerCase() === 'spot'
    );
    const normalizedFeeType = isSpot ? 'on_spot' : 'regular';

    const fallback = CATEGORY_FEE_RATES[row.code] || {};
    const regularFee = (row.regular_fee !== undefined && row.regular_fee !== null)
      ? parseFloat(row.regular_fee)
      : (fallback.regular_fee !== undefined ? fallback.regular_fee : parseFloat(row.price || 0));

    const onSpotFee = (row.on_spot_fee !== undefined && row.on_spot_fee !== null)
      ? parseFloat(row.on_spot_fee)
      : (fallback.on_spot_fee !== undefined ? fallback.on_spot_fee : parseFloat(row.price || 0));

    const activePrice = normalizedFeeType === 'on_spot' ? onSpotFee : regularFee;

    return {
      ...row,
      regular_fee: regularFee,
      on_spot_fee: onSpotFee,
      price: activePrice,
      current_fee_type: normalizedFeeType
    };
  },

  /**
   * Find all active registration categories
   */
  async findAllActive(feeType = 'regular') {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registration_categories WHERE status = "active" ORDER BY id ASC'
    );
    return rows.map(row => this._formatCategory(row, feeType));
  },

  /**
   * Find category by ID
   */
  async findById(id, feeType = 'regular') {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registration_categories WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? this._formatCategory(rows[0], feeType) : null;
  },

  /**
   * Find category by Code
   */
  async findByCode(code, feeType = 'regular') {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM registration_categories WHERE code = ? LIMIT 1',
      [code]
    );
    return rows[0] ? this._formatCategory(rows[0], feeType) : null;
  }
};

export default Category;
