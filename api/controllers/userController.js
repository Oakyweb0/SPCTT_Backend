import bcrypt from 'bcryptjs';
import { getPool } from '../config/db.js';

/**
 * Get Authenticated User Profile
 * GET /api/user/profile
 */
export async function getProfile(req, res) {
  try {
    const userId = req.user.user_id;
    const pool = getPool();

    const [users] = await pool.query(
      'SELECT id, title, name, email, organization, phone, role, address, city, state, country, pincode, avatar, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Profile retrieved successfully.',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error while fetching profile.',
      error: error.message
    });
  }
}

/**
 * Update Authenticated User Profile
 * PUT /api/user/profile
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user.user_id;
    const { title, name, fullName, organization, phone, address, city, state, country, pincode, avatar, password } = req.body;

    const updates = [];
    const values = [];

    const finalName = fullName || name;
    if (finalName !== undefined) {
      if (!finalName.trim()) {
        return res.status(422).json({
          status: false,
          message: 'Name cannot be empty.'
        });
      }
      updates.push('name = ?');
      values.push(finalName.trim());
    }

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }

    if (organization !== undefined) {
      updates.push('organization = ?');
      values.push(organization.trim());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone ? phone.trim() : null);
    }

    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address.trim());
    }

    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city.trim());
    }

    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state.trim());
    }

    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country.trim());
    }

    if (pincode !== undefined) {
      updates.push('pincode = ?');
      values.push(pincode.trim());
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar ? avatar.trim() : null);
    }

    if (password !== undefined && password) {
      if (password.length < 6) {
        return res.status(422).json({
          status: false,
          message: 'Password must be at least 6 characters long.'
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'No fields provided to update.'
      });
    }

    values.push(userId);
    const pool = getPool();
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Fetch updated user data
    const [updatedUsers] = await pool.query(
      'SELECT id, title, name, email, organization, phone, role, address, city, state, country, pincode, avatar, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    return res.status(200).json({
      status: true,
      message: 'Profile updated successfully!',
      data: {
        user: updatedUsers[0]
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error while updating profile.',
      error: error.message
    });
  }
}

export default { getProfile, updateProfile };
