import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

export const authService = {
  /**
   * Register a new user
   */
  async register({ title = 'Mr.', name, fullName, email, organization, phone, password, role }) {
    const finalName = (fullName || name || '').trim();
    const finalEmail = (email || '').trim().toLowerCase();
    const finalTitle = (title || 'Mr.').trim();
    const finalOrg = (organization || '').trim();
    const finalPhone = (phone || '').trim();

    // Check if email already registered
    const existing = await User.findByEmail(finalEmail);
    if (existing) {
      const error = new Error('Email address is already registered. Please sign in instead.');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role && ['user', 'admin', 'manager'].includes(role.toLowerCase())
      ? role.toLowerCase()
      : 'user';

    // Create user record
    const user = await User.create({
      title: finalTitle,
      name: finalName,
      email: finalEmail,
      organization: finalOrg || null,
      phone: finalPhone || null,
      password: hashedPassword,
      role: userRole,
      status: 'active'
    });

    // Generate JWT token
    const token = generateToken({
      user_id: user.id,
      title: user.title,
      name: user.name,
      email: user.email,
      role: user.role
    });

    return {
      token,
      token_type: 'Bearer',
      user
    };
  },

  /**
   * Authenticate user login
   */
  async login({ email, password }) {
    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    if (user.status === 'banned') {
      const error = new Error('Your account has been suspended. Please contact the conference organizer.');
      error.statusCode = 403;
      throw error;
    }

    if (user.status === 'inactive') {
      const error = new Error('Your account is currently inactive.');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({
      user_id: user.id,
      title: user.title,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // Strip password from returned user object
    const { password: _, ...safeUser } = user;

    return {
      token,
      token_type: 'Bearer',
      user: safeUser
    };
  },

  /**
   * Authenticate administrator login
   */
  async adminLogin({ email, password }) {
    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid administrator credentials.');
      error.statusCode = 401;
      throw error;
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      const error = new Error('Access Denied: Only administrators have access to this portal.');
      error.statusCode = 403;
      throw error;
    }

    if (user.status === 'banned' || user.status === 'inactive') {
      const error = new Error('Your administrator account is disabled.');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({
      user_id: user.id,
      title: user.title,
      name: user.name,
      email: user.email,
      role: user.role
    });

    const { password: _, ...safeUser } = user;

    return {
      token,
      token_type: 'Bearer',
      user: safeUser
    };
  }
};

export default authService;
