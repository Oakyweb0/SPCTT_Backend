import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { emailService } from './email.service.js';

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
   * Request Password Reset (Forgot Password with OTP)
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

    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP in database
    await User.setResetToken(user.id, otp, expiresAt);

    // Send OTP email
    let emailResult = null;
    try {
      emailResult = await emailService.sendPasswordResetOtpEmail({
        user,
        otp,
        expiryMinutes
      });
    } catch (mailErr) {
      console.error('❌ Error sending password reset OTP email:', mailErr.message);
    }

    return {
      success: true,
      email: user.email,
      otpSent: emailResult ? emailResult.success : true,
      message: `A 6-digit OTP has been sent to ${user.email}. Please check your inbox or spam folder.`
    };
  },

  /**
   * Verify Reset Token / OTP
   */
  async verifyResetToken(tokenData) {
    const payload = typeof tokenData === 'string' ? { token: tokenData } : (tokenData || {});
    const code = (payload.otp || payload.token || '').toString().trim();
    const email = (payload.email || '').toString().trim();

    if (!code) {
      const error = new Error('OTP / Reset code is required.');
      error.statusCode = 400;
      throw error;
    }

    let user = null;
    if (email) {
      user = await User.findByEmailAndResetOtp(email, code);
    }
    if (!user) {
      user = await User.findByResetToken(code);
    }

    if (!user) {
      try {
        const { valid, decoded } = verifyToken(code);
        if (valid && decoded) {
          const userId = decoded.user_id || decoded.id;
          user = await User.findById(userId);
        }
      } catch (err) {}
    }

    if (!user) {
      const error = new Error('Invalid or expired OTP. Please check the code or request a new one.');
      error.statusCode = 400;
      throw error;
    }

    return {
      valid: true,
      email: user.email
    };
  },

  /**
   * Reset Password with OTP / Token
   */
  async resetPassword({ token, otp, email, newPassword, confirmPassword }) {
    const code = (otp || token || '').toString().trim();
    if (!code) {
      const error = new Error('OTP / Reset code is required.');
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

    let user = null;
    if (email && email.trim()) {
      user = await User.findByEmailAndResetOtp(email.trim(), code);
    }

    if (!user) {
      user = await User.findByResetToken(code);
    }

    if (!user) {
      try {
        const { valid, decoded } = verifyToken(code);
        if (valid && decoded) {
          const userId = decoded.user_id || decoded.id;
          user = await User.findById(userId);
        }
      } catch (err) {}
    }

    if (!user) {
      const error = new Error('Invalid or expired OTP / reset code. Please request a new OTP.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateById(user.id, { password: hashedPassword });
    try {
      await User.clearResetToken(user.id);
    } catch (e) {}

    return {
      success: true,
      message: 'Password has been updated successfully! You can now log in with your new password.'
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
