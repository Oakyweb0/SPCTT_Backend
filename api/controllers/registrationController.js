import { getPool } from '../config/db.js';

// Accompanying person rate
const ACCOMPANYING_PERSON_RATE = 3500.00;
const GST_PERCENT = 18.00;

/**
 * Get all available registration categories
 * GET /api/registration/categories
 */
export async function getCategories(req, res) {
  try {
    const pool = getPool();
    const [categories] = await pool.query(
      'SELECT id, name, code, price, currency, description FROM registration_categories WHERE status = "active" ORDER BY id ASC'
    );

    return res.json({
      status: true,
      message: 'Registration categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
}

/**
 * Get Current User's Registration (Draft or Completed)
 * GET /api/registration/current
 */
export async function getUserRegistration(req, res) {
  try {
    const userId = req.user.user_id;
    const pool = getPool();

    // Check user profile for defaults
    const [users] = await pool.query(
      'SELECT id, title, name, email, organization, phone, address, city, state, country, pincode FROM users WHERE id = ?',
      [userId]
    );
    const user = users[0] || {};

    const [registrations] = await pool.query(
      'SELECT * FROM registrations WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    let regData = registrations.length > 0 ? registrations[0] : null;

    if (regData && typeof regData.accompanying_persons === 'string') {
      try {
        regData.accompanying_persons = JSON.parse(regData.accompanying_persons);
      } catch (e) {
        regData.accompanying_persons = [];
      }
    }

    // Get invoices if exists
    let invoices = [];
    if (regData) {
      const [inv] = await pool.query(
        'SELECT * FROM invoices WHERE registration_id = ? ORDER BY id ASC',
        [regData.id]
      );
      invoices = inv;
    }

    return res.json({
      status: true,
      message: 'User registration fetched successfully',
      data: {
        user,
        registration: regData,
        invoices
      }
    });
  } catch (error) {
    console.error('Error fetching user registration:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch registration data',
      error: error.message
    });
  }
}

/**
 * Helper: Create or get active draft registration
 */
async function getOrCreateDraftRegistration(pool, userId, user) {
  const [existing] = await pool.query(
    'SELECT * FROM registrations WHERE user_id = ? AND payment_status != "paid" ORDER BY id DESC LIMIT 1',
    [userId]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const regCode = `#${Math.floor(1000000 + Math.random() * 9000000)}`;
  const [result] = await pool.query(
    `INSERT INTO registrations 
      (registration_code, user_id, title, full_name, email, organization, phone, status, step_completed) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1)`,
    [
      regCode,
      userId,
      user.title || 'Mr.',
      user.name || '',
      user.email || '',
      user.organization || null,
      user.phone || null
    ]
  );

  const [newReg] = await pool.query('SELECT * FROM registrations WHERE id = ?', [result.insertId]);
  return newReg[0];
}

/**
 * Step 1: Select Category
 * POST /api/registration/step1-category
 */
export async function saveStep1Category(req, res) {
  try {
    const userId = req.user.user_id;
    const { categoryId, categoryCode } = req.body;

    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];

    // Get category info
    let category;
    if (categoryId) {
      const [cats] = await pool.query('SELECT * FROM registration_categories WHERE id = ?', [categoryId]);
      category = cats[0];
    } else if (categoryCode) {
      const [cats] = await pool.query('SELECT * FROM registration_categories WHERE code = ?', [categoryCode]);
      category = cats[0];
    }

    if (!category) {
      return res.status(404).json({
        status: false,
        message: 'Registration category not found. Please select a valid category.'
      });
    }

    const reg = await getOrCreateDraftRegistration(pool, userId, user);

    await pool.query(
      `UPDATE registrations SET 
        category_id = ?, 
        category_name = ?, 
        category_price = ?,
        step_completed = GREATEST(step_completed, 2)
      WHERE id = ?`,
      [category.id, category.name, category.price, reg.id]
    );

    return res.json({
      status: true,
      message: 'Category selected successfully',
      data: {
        registrationId: reg.id,
        category
      }
    });
  } catch (error) {
    console.error('Error saving step 1:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to save category',
      error: error.message
    });
  }
}

/**
 * Step 2: Save Attendee Details & Contact Information
 * POST /api/registration/step2-attendee
 */
export async function saveStep2Attendee(req, res) {
  try {
    const userId = req.user.user_id;
    const {
      title,
      fullName,
      email,
      organization,
      phone,
      address,
      city,
      state,
      country,
      pincode
    } = req.body;

    if (!fullName || !email || !organization || !address || !city || !state || !country) {
      return res.status(422).json({
        status: false,
        message: 'Please fill in all mandatory attendee and contact details.'
      });
    }

    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];
    const reg = await getOrCreateDraftRegistration(pool, userId, user);

    // Update user profile address details as well
    await pool.query(
      `UPDATE users SET 
        title = ?, name = ?, organization = ?, phone = ?, address = ?, city = ?, state = ?, country = ?, pincode = ?
      WHERE id = ?`,
      [title || 'Mr.', fullName, organization, phone || null, address, city, state, country, pincode || null, userId]
    );

    // Update registration
    await pool.query(
      `UPDATE registrations SET 
        title = ?, full_name = ?, email = ?, organization = ?, phone = ?,
        address = ?, city = ?, state = ?, country = ?, pincode = ?,
        step_completed = GREATEST(step_completed, 3)
      WHERE id = ?`,
      [
        title || 'Mr.',
        fullName,
        email,
        organization,
        phone || null,
        address,
        city,
        state,
        country,
        pincode || null,
        reg.id
      ]
    );

    return res.json({
      status: true,
      message: 'Attendee and contact details saved successfully',
      data: {
        registrationId: reg.id
      }
    });
  } catch (error) {
    console.error('Error saving step 2:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to save attendee details',
      error: error.message
    });
  }
}

/**
 * Step 3: Save Accompanying Persons
 * POST /api/registration/step3-accompanying
 */
export async function saveStep3Accompanying(req, res) {
  try {
    const userId = req.user.user_id;
    const { count, accompanyingPersons } = req.body;

    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];
    const reg = await getOrCreateDraftRegistration(pool, userId, user);

    const personCount = parseInt(count || 0);
    const validPersons = Array.isArray(accompanyingPersons) ? accompanyingPersons.slice(0, personCount) : [];
    const accompanyingTotal = personCount * ACCOMPANYING_PERSON_RATE;

    await pool.query(
      `UPDATE registrations SET 
        accompanying_count = ?,
        accompanying_persons = ?,
        accompanying_total = ?,
        step_completed = GREATEST(step_completed, 4)
      WHERE id = ?`,
      [
        personCount,
        JSON.stringify(validPersons),
        accompanyingTotal,
        reg.id
      ]
    );

    return res.json({
      status: true,
      message: 'Accompanying persons saved successfully',
      data: {
        registrationId: reg.id,
        accompanyingCount: personCount,
        accompanyingTotal
      }
    });
  } catch (error) {
    console.error('Error saving step 3:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to save accompanying persons',
      error: error.message
    });
  }
}

/**
 * Step 4: Save Billing Details & Calculate Invoices
 * POST /api/registration/step4-billing
 */
export async function saveStep4Billing(req, res) {
  try {
    const userId = req.user.user_id;
    const {
      entityName,
      entityAddress,
      gstNumber,
      panNumber
    } = req.body;

    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];
    const reg = await getOrCreateDraftRegistration(pool, userId, user);

    // Calculate totals
    const categoryPrice = parseFloat(reg.category_price || 0);
    const accompanyingTotal = parseFloat(reg.accompanying_total || 0);
    const subtotal = categoryPrice + accompanyingTotal;
    const gstAmount = parseFloat(((subtotal * GST_PERCENT) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

    await pool.query(
      `UPDATE registrations SET 
        billing_entity_name = ?,
        billing_address = ?,
        gst_number = ?,
        pan_number = ?,
        subtotal = ?,
        gst_rate = ?,
        gst_amount = ?,
        grand_total = ?,
        step_completed = 4
      WHERE id = ?`,
      [
        entityName || null,
        entityAddress || null,
        gstNumber || null,
        panNumber || null,
        subtotal,
        GST_PERCENT,
        gstAmount,
        grandTotal,
        reg.id
      ]
    );

    // Delete existing proforma invoices for this registration to re-create clean ones
    await pool.query('DELETE FROM invoices WHERE registration_id = ? AND status = "unpaid"', [reg.id]);

    const invoices = [];

    // 1. Proforma Invoice for Primary Registration
    const primaryGst = parseFloat(((categoryPrice * GST_PERCENT) / 100).toFixed(2));
    const primaryTotal = parseFloat((categoryPrice + primaryGst).toFixed(2));
    const primaryInvNum = `Proforma Invoice ${Math.floor(100 + Math.random() * 900)}`;

    const [inv1Result] = await pool.query(
      `INSERT INTO invoices 
        (invoice_number, registration_id, user_id, invoice_type, title, description, quantity, rate, amount, gst_rate, gst_amount, total_amount, status)
        VALUES (?, ?, ?, 'proforma_primary', ?, ?, 1, ?, ?, ?, ?, ?, 'unpaid')`,
      [
        primaryInvNum,
        reg.id,
        userId,
        `New Subscription - ${reg.category_name || 'Conference Registration'}`,
        `${reg.registration_code}: ${reg.title || ''} ${reg.full_name || user.name}`,
        categoryPrice,
        categoryPrice,
        GST_PERCENT,
        primaryGst,
        primaryTotal
      ]
    );

    invoices.push({
      id: inv1Result.insertId,
      invoiceNumber: primaryInvNum,
      title: `New Subscription - ${reg.category_name}`,
      description: `${reg.registration_code}: ${reg.title || ''} ${reg.full_name || user.name}`,
      qty: 1,
      rate: categoryPrice,
      amount: categoryPrice,
      gstRate: GST_PERCENT,
      gstAmount: primaryGst,
      totalAmount: primaryTotal
    });

    // 2. Proforma Invoice for Accompanying Persons if any
    if (reg.accompanying_count > 0 && accompanyingTotal > 0) {
      const accGst = parseFloat(((accompanyingTotal * GST_PERCENT) / 100).toFixed(2));
      const accTotal = parseFloat((accompanyingTotal + accGst).toFixed(2));
      const accInvNum = `Proforma Invoice ${Math.floor(100 + Math.random() * 900)}`;

      const [inv2Result] = await pool.query(
        `INSERT INTO invoices 
          (invoice_number, registration_id, user_id, invoice_type, title, description, quantity, rate, amount, gst_rate, gst_amount, total_amount, status)
          VALUES (?, ?, ?, 'proforma_accompanying', ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')`,
        [
          accInvNum,
          reg.id,
          userId,
          `Accompanying Person(s) Cost`,
          `Registration for ${reg.accompanying_count} accompanying person(s)`,
          reg.accompanying_count,
          ACCOMPANYING_PERSON_RATE,
          accompanyingTotal,
          GST_PERCENT,
          accGst,
          accTotal
        ]
      );

      invoices.push({
        id: inv2Result.insertId,
        invoiceNumber: accInvNum,
        title: `Accompanying Person(s) Cost`,
        description: `Registration for ${reg.accompanying_count} accompanying person(s)`,
        qty: reg.accompanying_count,
        rate: ACCOMPANYING_PERSON_RATE,
        amount: accompanyingTotal,
        gstRate: GST_PERCENT,
        gstAmount: accGst,
        totalAmount: accTotal
      });
    }

    return res.json({
      status: true,
      message: 'Billing details saved and proforma invoice generated',
      data: {
        registrationId: reg.id,
        billing: {
          entityName,
          entityAddress,
          gstNumber,
          panNumber
        },
        breakdown: {
          categoryPrice,
          accompanyingTotal,
          subtotal,
          gstRate: GST_PERCENT,
          gstAmount,
          grandTotal
        },
        invoices
      }
    });
  } catch (error) {
    console.error('Error saving step 4:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to save billing details',
      error: error.message
    });
  }
}

/**
 * Process / Simulate Payment (Axis Razorpay - Elisyan India)
 * POST /api/registration/payment
 */
export async function processPayment(req, res) {
  try {
    const userId = req.user.user_id;
    const { registrationId, paymentMethod } = req.body;

    const pool = getPool();
    let query = 'SELECT * FROM registrations WHERE user_id = ?';
    let params = [userId];

    if (registrationId) {
      query += ' AND id = ?';
      params.push(registrationId);
    } else {
      query += ' ORDER BY id DESC LIMIT 1';
    }

    const [regs] = await pool.query(query, params);
    if (regs.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No registration record found to pay.'
      });
    }

    const reg = regs[0];
    const txnId = `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const method = paymentMethod || 'Axis Razorpay (Elisyan India)';

    // Update Registration Status
    await pool.query(
      `UPDATE registrations SET 
        payment_method = ?,
        payment_status = 'paid',
        transaction_id = ?,
        paid_at = NOW(),
        status = 'confirmed'
      WHERE id = ?`,
      [method, txnId, reg.id]
    );

    // Update Invoices to paid
    await pool.query(
      `UPDATE invoices SET status = 'paid' WHERE registration_id = ?`,
      [reg.id]
    );

    // Create Tax Receipt Invoice
    const receiptNum = `RCPT-${new Date().getFullYear()}-${String(reg.id).padStart(5, '0')}`;
    await pool.query(
      `INSERT INTO invoices 
        (invoice_number, registration_id, user_id, invoice_type, title, description, quantity, rate, amount, gst_rate, gst_amount, total_amount, status)
        VALUES (?, ?, ?, 'receipt', ?, ?, 1, ?, ?, ?, ?, ?, 'paid')`,
      [
        receiptNum,
        reg.id,
        userId,
        `Official Receipt & Tax Invoice - SPCTT 2026`,
        `Payment confirmed for ${reg.registration_code} via ${method} (Txn: ${txnId})`,
        reg.subtotal,
        reg.subtotal,
        reg.gst_rate,
        reg.gst_amount,
        reg.grand_total
      ]
    );

    const [updatedRegs] = await pool.query('SELECT * FROM registrations WHERE id = ?', [reg.id]);
    const [allInvoices] = await pool.query('SELECT * FROM invoices WHERE registration_id = ? ORDER BY id ASC', [reg.id]);

    return res.json({
      status: true,
      message: 'Payment processed successfully! Your conference registration is confirmed.',
      data: {
        registration: updatedRegs[0],
        transactionId: txnId,
        invoices: allInvoices
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({
      status: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
}

/**
 * Get User Invoices
 * GET /api/registration/invoices
 */
export async function getUserInvoices(req, res) {
  try {
    const userId = req.user.user_id;
    const pool = getPool();

    const [invoices] = await pool.query(
      `SELECT i.*, r.registration_code, r.full_name, r.category_name, r.payment_status 
       FROM invoices i 
       JOIN registrations r ON i.registration_id = r.id 
       WHERE i.user_id = ? 
       ORDER BY i.id DESC`,
      [userId]
    );

    return res.json({
      status: true,
      message: 'Invoices fetched successfully',
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
}

/**
 * Get Specific Invoice by ID
 * GET /api/registration/invoices/:id
 */
export async function getInvoiceById(req, res) {
  try {
    const userId = req.user.user_id;
    const invoiceId = req.params.id;
    const pool = getPool();

    const [invoices] = await pool.query(
      `SELECT i.*, r.registration_code, r.title as attendee_title, r.full_name, r.email as attendee_email, 
              r.organization, r.phone as attendee_phone, r.address, r.city, r.state, r.country, r.pincode,
              r.billing_entity_name, r.billing_address, r.gst_number, r.pan_number, r.payment_method, r.transaction_id, r.paid_at
       FROM invoices i
       JOIN registrations r ON i.registration_id = r.id
       WHERE i.id = ? AND (i.user_id = ? OR ? = 'admin')`,
      [invoiceId, userId, req.user.role]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Invoice not found.'
      });
    }

    return res.json({
      status: true,
      message: 'Invoice details retrieved successfully',
      data: invoices[0]
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch invoice details',
      error: error.message
    });
  }
}

export default {
  getCategories,
  getUserRegistration,
  saveStep1Category,
  saveStep2Attendee,
  saveStep3Accompanying,
  saveStep4Billing,
  processPayment,
  getUserInvoices,
  getInvoiceById
};
