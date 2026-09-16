import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'SPCTT_SECURE_JWT_SECRET_KEY_2026_!@#$%';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * User Signup Controller
 * POST /api/auth/signup or POST /api/auth/register
 */
export async function signup(req, res) {
  try {
    const { title, name, fullName, email, organization, phone, password, repeatPassword, role } = req.body;

    const finalName = (fullName || name || '').trim();
    const finalTitle = (title || 'Mr.').trim();
    const finalEmail = (email || '').trim().toLowerCase();
    const finalOrg = (organization || '').trim();
    const finalPhone = (phone || '').trim();

    // 1. Validation
    if (!finalName) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Full name is required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!finalEmail || !emailRegex.test(finalEmail)) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: A valid email address is required.'
      });
    }

    if (!finalOrg) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Organization / Institution name is required.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Password must be at least 6 characters long.'
      });
    }

    if (repeatPassword && password !== repeatPassword) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Passwords do not match.'
      });
    }

    const userRole = role && ['user', 'admin', 'manager'].includes(role.toLowerCase()) 
      ? role.toLowerCase() 
      : 'user';

    const pool = getPool();

    // 2. Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [finalEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        status: false,
        message: 'Email address is already registered. Please sign in instead.'
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert User
    const [result] = await pool.query(
      'INSERT INTO users (title, name, email, organization, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [finalTitle, finalName, finalEmail, finalOrg || null, finalPhone || null, hashedPassword, userRole, 'active']
    );

    const userId = result.insertId;

    // 5. Generate JWT Token
    const payload = {
      user_id: userId,
      title: finalTitle,
      name: finalName,
      email: finalEmail,
      role: userRole
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({
      status: true,
      message: 'Account created successfully!',
      data: {
        token,
        token_type: 'Bearer',
        expires_in: JWT_EXPIRES_IN,
        user: {
          id: userId,
          title: finalTitle,
          name: finalName,
          email: finalEmail,
          organization: finalOrg,
          phone: finalPhone,
          role: userRole,
          status: 'active'
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error during registration.',
      error: error.message
    });
  }
}

/**
 * User Login Controller
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Email and password are required.'
      });
    }

    const pool = getPool();
    const finalEmail = email.trim().toLowerCase();

    // 2. Find user
    const [users] = await pool.query(
      'SELECT id, title, name, email, organization, phone, password, role, address, city, state, country, pincode, avatar, status, created_at FROM users WHERE email = ? LIMIT 1',
      [finalEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // 3. Status check
    if (user.status === 'banned') {
      return res.status(403).json({
        status: false,
        message: 'Your account has been suspended. Please contact the conference organizer.'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        status: false,
        message: 'Your account is currently inactive.'
      });
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.'
      });
    }

    // 5. Generate JWT Token
    const payload = {
      user_id: user.id,
      title: user.title,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      status: true,
      message: 'Login successful!',
      data: {
        token,
        token_type: 'Bearer',
        expires_in: JWT_EXPIRES_IN,
        user: {
          id: user.id,
          title: user.title,
          name: user.name,
          email: user.email,
          organization: user.organization,
          phone: user.phone,
          role: user.role,
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          pincode: user.pincode,
          avatar: user.avatar,
          status: user.status,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error during login.',
      error: error.message
    });
  }
}

/**
 * Admin Login Controller
 * POST /api/auth/admin/login
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        status: false,
        message: 'Validation Error: Email and password are required.'
      });
    }

    const pool = getPool();
    const finalEmail = email.trim().toLowerCase();

    const [users] = await pool.query(
      'SELECT id, title, name, email, organization, phone, password, role, avatar, status, created_at FROM users WHERE email = ? LIMIT 1',
      [finalEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: false,
        message: 'Invalid administrator credentials.'
      });
    }

    const user = users[0];

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({
        status: false,
        message: 'Access Denied: Only administrators have access to this portal.'
      });
    }

    if (user.status === 'banned' || user.status === 'inactive') {
      return res.status(403).json({
        status: false,
        message: 'Your administrator account is disabled.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.'
      });
    }

    const payload = {
      user_id: user.id,
      title: user.title,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      status: true,
      message: 'Admin login successful!',
      data: {
        token,
        token_type: 'Bearer',
        expires_in: JWT_EXPIRES_IN,
        user: {
          id: user.id,
          title: user.title,
          name: user.name,
          email: user.email,
          organization: user.organization,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Admin Login error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error during admin login.',
      error: error.message
    });
  }
}

export default { signup, login, adminLogin };
