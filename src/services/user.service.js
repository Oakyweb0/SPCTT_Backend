import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const userService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User profile not found.');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const { title, name, fullName, organization, phone, address, city, state, country, pincode, avatar, password } = updateData;

    const updates = {};
    const finalName = fullName || name;
    if (finalName !== undefined) {
      if (!finalName.trim()) {
        const error = new Error('Name cannot be empty.');
        error.statusCode = 422;
        throw error;
      }
      updates.name = finalName.trim();
    }

    if (title !== undefined) updates.title = title.trim();
    if (organization !== undefined) updates.organization = organization.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (address !== undefined) updates.address = address.trim();
    if (city !== undefined) updates.city = city.trim();
    if (state !== undefined) updates.state = state.trim();
    if (country !== undefined) updates.country = country.trim();
    if (pincode !== undefined) updates.pincode = pincode ? pincode.trim() : null;
    if (avatar !== undefined) updates.avatar = avatar ? avatar.trim() : null;

    if (password) {
      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters long.');
        error.statusCode = 422;
        throw error;
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      const error = new Error('No fields provided to update.');
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await User.updateById(userId, updates);
    return updatedUser;
  },

  /**
   * Delete user profile by ID
   */
  async deleteProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User profile not found.');
      error.statusCode = 404;
      throw error;
    }
    return await User.deleteById(userId);
  }
};

export default userService;
