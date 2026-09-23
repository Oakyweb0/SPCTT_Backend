import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken, verifyToken } from '../utils/jwt.js';

export const authService = {
  /**
   * Register a new user
   */
  async register({ title = 'Mr.', name, fullName, email, organization, phone, city, state, country, password, role }) {
    const finalName = (fullName || name || '').trim();
    const finalEmail = (email || '').trim().toLowerCase();
    const finalTitle = (title || 'Mr.').trim();
    const finalOrg = (organization || '').trim();
    const finalPhone = (phone || '').trim();
    const finalCity = city ? city.trim() : null;
    const finalState = state ? state.trim() : null;
    const finalCountry = country ? country.trim() : 'India';

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
      city: finalCity,
      state: finalState,
      country: finalCountry,
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
  },

  /**
   * Request Password Reset (Forgot Password)
   */
  async forgotPassword(email) {
    if (!email || !email.trim()) {
      const error = new Error('Please provide a valid email address.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByEmail(email.trim().toLowerCase());
    if (!user) {
      const error = new Error('No user account found with this email address.');
      error.statusCode = 404;
      throw error;
    }

    // Generate signed JWT reset token (valid for 1 hour)
    const resetToken = generateToken(
      {
        user_id: user.id,
        email: user.email,
        purpose: 'password_reset'
      },
      '1h'
    );

    try {
      await User.setResetToken(user.id, resetToken, new Date(Date.now() + 60 * 60 * 1000));
    } catch (dbErr) {
      // Ignored if ALTER permission is restricted on DB server
    }

    return {
      success: true,
      email: user.email,
      resetToken,
      message: 'Password reset token has been generated. Use this token with the reset-password API to set your new password.'
    };
  },

  /**
   * Verify Reset Token
   */
  async verifyResetToken(token) {
    if (!token || !token.trim()) {
      const error = new Error('Reset token is required.');
      error.statusCode = 400;
      throw error;
    }

    try {
      const { valid, decoded } = verifyToken(token.trim());
      if (valid && decoded) {
        const userId = decoded.user_id || decoded.id;
        const user = await User.findById(userId);
        if (user) {
          return { valid: true, email: user.email };
        }
      }
    } catch (err) {}

    const user = await User.findByResetToken(token.trim()).catch(() => null);
    if (!user) {
      const error = new Error('Invalid or expired password reset token.');
      error.statusCode = 400;
      throw error;
    }
    return {
      valid: true,
      email: user.email
    };
  },

  /**
   * Reset Password with Token
   */
  async resetPassword({ token, newPassword, confirmPassword }) {
    if (!token || !token.trim()) {
      const error = new Error('Reset token is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!newPassword || newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters long.');
      error.statusCode = 422;
      throw error;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      const error = new Error('New password and confirm password do not match.');
      error.statusCode = 422;
      throw error;
    }

    let userId = null;
    try {
      const { valid, decoded } = verifyToken(token.trim());
      if (valid && decoded) {
        userId = decoded.user_id || decoded.id;
      }
    } catch (err) {}

    if (!userId) {
      const dbUser = await User.findByResetToken(token.trim()).catch(() => null);
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    if (!userId) {
      const error = new Error('Invalid or expired password reset token. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateById(userId, { password: hashedPassword });
    try {
      await User.clearResetToken(userId);
    } catch (e) {}

    return {
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    };
  },

  /**
   * Change Password (for authenticated user)
   */
  async changePassword({ userId, currentPassword, newPassword, confirmPassword }) {
    if (!currentPassword) {
      const error = new Error('Current password is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!newPassword || newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters long.');
      error.statusCode = 422;
      throw error;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      const error = new Error('New password and confirm password do not match.');
      error.statusCode = 422;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User account not found.');
      error.statusCode = 404;
      throw error;
    }

    const fullUser = await User.findByEmail(user.email);
    const isMatch = await bcrypt.compare(currentPassword, fullUser.password);
    if (!isMatch) {
      const error = new Error('Current password is incorrect.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateById(user.id, { password: hashedPassword });

    return {
      success: true,
      message: 'Password updated successfully!'
    };
  }
};

export default authService;
