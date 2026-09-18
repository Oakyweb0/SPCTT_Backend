import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Registration } from '../models/Registration.js';
import { Abstract } from '../models/Abstract.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const adminController = {
  /**
   * Get Admin Dashboard Overview Statistics
   * GET /api/admin/dashboard-stats
   */
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalRegistrations,
        paidRegistrations,
        totalRevenue,
        totalAbstracts,
        recentRegistrations,
        recentAbstracts
      ] = await Promise.all([
        User.count('user'),
        Registration.countTotal(),
        Registration.countPaid(),
        Registration.sumRevenue(),
        Abstract.count(),
        Registration.findRecent(5),
        Abstract.findRecent(5)
      ]);

      return sendSuccess(
        res,
        {
          totalUsers,
          totalRegistrations,
          paidRegistrations,
          totalRevenue,
          totalAbstracts,
          recentRegistrations,
          recentAbstracts
        },
        'Dashboard statistics retrieved successfully.'
      );
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      return sendError(res, 'Failed to fetch dashboard statistics.', 500, error);
    }
  },

  /**
   * Get All Registrations
   * GET /api/admin/registrations
   */
  async getRegistrations(req, res, next) {
    try {
      const { status, payment_status, search } = req.query;
      const registrations = await Registration.findAll({ status, payment_status, search });
      return sendSuccess(res, registrations, 'Registrations retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin registrations:', error);
      return sendError(res, 'Failed to fetch registrations.', 500, error);
    }
  },

  /**
   * Update Registration Status
   * PUT /api/admin/registrations/:id/status
   */
  async updateRegistrationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, paymentStatus } = req.body;

      const reg = await Registration.findById(id);
      if (!reg) {
        return sendError(res, 'Registration not found.', 404);
      }

      const updates = {};
      if (status) updates.status = status;
      if (paymentStatus) {
        updates.payment_status = paymentStatus;
        if (paymentStatus === 'paid') {
          updates.paid_at = new Date();
          await Registration.updateInvoicesToPaid(id);
        }
      }

      const updated = await Registration.updateById(id, updates);
      return sendSuccess(res, updated, 'Registration status updated successfully.');
    } catch (error) {
      console.error('Error updating registration status:', error);
      return sendError(res, 'Failed to update registration status.', 500, error);
    }
  },

  /**
   * Get All Submitted Abstracts
   * GET /api/admin/abstracts
   */
  async getAbstracts(req, res, next) {
    try {
      const { status, category, search } = req.query;
      const abstracts = await Abstract.findAll({ status, category, search });
      return sendSuccess(res, abstracts, 'Abstracts retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin abstracts:', error);
      return sendError(res, 'Failed to fetch abstracts.', 500, error);
    }
  },

  /**
   * Review and Update Abstract Status
   * PUT /api/admin/abstracts/:id/status
   */
  async updateAbstractStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reviewComments } = req.body;

      if (!status) {
        return sendError(res, 'Status is required.', 422);
      }

      const updated = await Abstract.updateStatus(id, { status, reviewComments });
      if (!updated) {
        return sendError(res, 'Abstract not found.', 404);
      }

      return sendSuccess(res, updated, 'Abstract status updated successfully.');
    } catch (error) {
      console.error('Error updating abstract status:', error);
      return sendError(res, 'Failed to update abstract status.', 500, error);
    }
  },

  /**
   * Get All Invoices
   * GET /api/admin/invoices
   */
  async getInvoices(req, res, next) {
    try {
      const invoices = await Registration.getAllInvoices();
      return sendSuccess(res, invoices, 'Invoices retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin invoices:', error);
      return sendError(res, 'Failed to fetch invoices.', 500, error);
    }
  },

  /**
   * Get All Registered Users
   * GET /api/admin/users
   */
  async getUsers(req, res, next) {
    try {
      const { role, status, search } = req.query;
      const users = await User.findAll({ role, status, search });
      return sendSuccess(res, users, 'Users retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return sendError(res, 'Failed to fetch users.', 500, error);
    }
  },

  /**
   * Get Single User by ID
   * GET /api/admin/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const targetUserId = parseInt(id, 10);
      if (isNaN(targetUserId)) {
        return sendError(res, 'Invalid user ID.', 400);
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return sendError(res, 'User not found.', 404);
      }

      return sendSuccess(res, user, 'User details retrieved successfully.');
    } catch (error) {
      console.error('Error fetching user:', error);
      return sendError(res, error.message || 'Failed to fetch user.', 500, error);
    }
  },

  /**
   * Update User by Admin
   * PUT /api/admin/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const targetUserId = parseInt(id, 10);
      if (isNaN(targetUserId)) {
        return sendError(res, 'Invalid user ID.', 400);
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return sendError(res, 'User not found.', 404);
      }

      const {
        title,
        name,
        fullName,
        email,
        organization,
        phone,
        role,
        status,
        address,
        city,
        state,
        country,
        pincode,
        password
      } = req.body;

      const updates = {};
      const finalName = fullName || name;
      if (finalName !== undefined) {
        if (!finalName.trim()) {
          return sendError(res, 'Name cannot be empty.', 422);
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

      if (email !== undefined) {
        const finalEmail = email.trim().toLowerCase();
        if (!finalEmail) {
          return sendError(res, 'Email cannot be empty.', 422);
        }
        const existing = await User.findByEmail(finalEmail);
        if (existing && existing.id !== targetUserId) {
          return sendError(res, 'This email address is already registered to another user.', 409);
        }
        updates.email = finalEmail;
      }

      if (role !== undefined) {
        const validRoles = ['admin', 'user', 'manager'];
        if (!validRoles.includes(role.toLowerCase())) {
          return sendError(res, 'Invalid role. Must be one of: user, admin, manager.', 422);
        }
        updates.role = role.toLowerCase();
      }

      if (status !== undefined) {
        const validStatuses = ['active', 'inactive', 'banned'];
        if (!validStatuses.includes(status.toLowerCase())) {
          return sendError(res, 'Invalid status. Must be one of: active, inactive, banned.', 422);
        }
        updates.status = status.toLowerCase();
      }

      if (password) {
        if (password.length < 6) {
          return sendError(res, 'Password must be at least 6 characters long.', 422);
        }
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(password, salt);
      }

      if (Object.keys(updates).length === 0) {
        return sendError(res, 'No fields provided to update.', 400);
      }

      const updatedUser = await User.updateById(targetUserId, updates);
      return sendSuccess(res, updatedUser, `User '${updatedUser.name}' (ID: #${targetUserId}) updated successfully!`);
    } catch (error) {
      console.error('Error updating user:', error);
      return sendError(res, error.message || 'Failed to update user.', 500, error);
    }
  },

  /**
   * Delete a User by ID
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const targetUserId = parseInt(id, 10);

      if (isNaN(targetUserId)) {
        return sendError(res, 'Invalid user ID.', 400);
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return sendError(res, 'User not found.', 404);
      }

      const deleted = await User.deleteById(targetUserId);
      if (!deleted) {
        return sendError(res, 'Failed to delete user.', 500);
      }

      const isSelf = req.user && req.user.user_id === targetUserId;

      return sendSuccess(
        res,
        { id: targetUserId, isSelf },
        `User '${user.name}' (ID: #${targetUserId}) and all associated records deleted successfully from database.`
      );
    } catch (error) {
      console.error('Error deleting user:', error);
      return sendError(res, error.message || 'Failed to delete user.', 500, error);
    }
  }
};

export default adminController;
