import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Registration } from '../models/Registration.js';
import { Abstract } from '../models/Abstract.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { EmailLog } from '../models/EmailLog.js';
import { emailService } from '../services/email.service.js';
import { excelService } from '../services/excel.service.js';
import { paymentService } from '../services/payment.service.js';
import { invoicePdfService } from '../services/invoicePdf.service.js';
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
        pendingRegistrations,
        totalRevenue,
        totalAbstracts,
        recentRegistrations,
        recentAbstracts
      ] = await Promise.all([
        User.count('user'),
        Registration.countTotal(),
        Registration.countPaid(),
        Registration.countPending(),
        Registration.sumRevenue(),
        Abstract.count(),
        Registration.findRecent(100),
        Abstract.findRecent(100)
      ]);

      return sendSuccess(
        res,
        {
          totalUsers,
          totalRegistrations,
          paidRegistrations,
          pendingRegistrations,
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
   * Get Single Registration by ID with User, Invoices & Payments
   * GET /api/admin/registrations/:id
   */
  async getRegistrationById(req, res, next) {
    try {
      const { id } = req.params;
      const reg = await Registration.findById(id);
      if (!reg) {
        return sendError(res, 'Registration not found.', 404);
      }
      const [regUser, invoices, payments] = await Promise.all([
        reg.user_id ? User.findById(reg.user_id) : null,
        Registration.getInvoicesByRegistrationId(id),
        Payment.findAllByRegistrationId(id)
      ]);

      return sendSuccess(res, {
        ...reg,
        user: regUser,
        invoices: invoices || [],
        payments: payments || []
      }, 'Registration details retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin registration by id:', error);
      return sendError(res, 'Failed to fetch registration details.', 500, error);
    }
  },

  /**
   * Update Registration Status
   * PUT /api/admin/registrations/:id/status
   */
  async updateRegistrationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, paymentStatus, sendEmail = true } = req.body;

      const reg = await Registration.findById(id);
      if (!reg) {
        return sendError(res, 'Registration not found.', 404);
      }

      const previousPaymentStatus = reg.payment_status;
      const updates = {};
      if (status) updates.status = status;
      if (paymentStatus) {
        updates.payment_status = paymentStatus;
        if (paymentStatus === 'paid') {
          updates.paid_at = new Date();
          const regCode = reg.registration_code || `SPCTT-${String(reg.id).padStart(3, '0')}`;
          updates.registration_code = regCode;
          if (!reg.transaction_id) {
            updates.transaction_id = `ADM_${Date.now()}`;
          }
          if (!reg.payment_method) {
            updates.payment_method = 'Manual Verification (Admin)';
          }
          await Registration.updateInvoicesToPaid(id);

          try {
            await Payment.create({
              registration_id: reg.id,
              user_id: reg.user_id || 0,
              razorpay_order_id: 'ADMIN_MANUAL',
              razorpay_payment_id: updates.transaction_id || reg.transaction_id || `ADM_${Date.now()}`,
              amount: reg.grand_total,
              currency: 'INR',
              status: 'paid',
              payment_method: updates.payment_method || 'Manual Verification (Admin)',
              notes: `Payment marked as paid by Admin for ${regCode}`
            });
          } catch (payErr) {
            console.warn('Could not record admin payment in payments table:', payErr.message);
          }
        } else if (paymentStatus === 'failed') {
          updates.registration_code = null;
          try {
            await Payment.create({
              registration_id: reg.id,
              user_id: reg.user_id || 0,
              razorpay_order_id: 'ADMIN_MANUAL',
              razorpay_payment_id: reg.transaction_id || 'N/A',
              amount: reg.grand_total,
              currency: 'INR',
              status: 'failed',
              payment_method: reg.payment_method || 'Manual Status Update (Admin)',
              notes: `Payment marked as failed by Admin for registration #${reg.id}`
            });
          } catch (payErr) {
            console.warn('Could not record failed payment in payments table:', payErr.message);
          }
        } else if (paymentStatus === 'refunded') {
          try {
            await Payment.create({
              registration_id: reg.id,
              user_id: reg.user_id || 0,
              razorpay_order_id: 'ADMIN_MANUAL',
              razorpay_payment_id: reg.transaction_id || `REF_${Date.now()}`,
              amount: reg.grand_total,
              currency: 'INR',
              status: 'refunded',
              payment_method: reg.payment_method || 'Manual Status Update (Admin)',
              notes: `Payment marked as Refunded by Admin for ${reg.registration_code || `#${reg.id}`}`
            });
          } catch (payErr) {
            console.warn('Could not record refunded payment in payments table:', payErr.message);
          }
        } else if (paymentStatus === 'pending') {
          updates.registration_code = null;
          try {
            await Payment.create({
              registration_id: reg.id,
              user_id: reg.user_id || 0,
              razorpay_order_id: 'ADMIN_MANUAL',
              razorpay_payment_id: reg.transaction_id || 'PENDING',
              amount: reg.grand_total,
              currency: 'INR',
              status: 'pending',
              payment_method: reg.payment_method || 'Pending Payment',
              notes: `Payment status set to Pending by Admin for registration #${reg.id}`
            });
          } catch (payErr) {
            console.warn('Could not record pending payment in payments table:', payErr.message);
          }
        }
      }

      const updated = await Registration.updateById(id, updates);

      // Trigger Email Notification if payment status changed and sendEmail is true
      let emailResult = null;
      if (sendEmail && paymentStatus && paymentStatus !== previousPaymentStatus) {
        try {
          const [regUser, allInvoices] = await Promise.all([
            reg.user_id ? User.findById(reg.user_id) : null,
            Registration.getInvoicesByRegistrationId(id)
          ]);

          const regDataForEmail = {
            ...reg,
            ...updates,
            id: reg.id,
            user_id: reg.user_id
          };

          if (paymentStatus === 'paid') {
            emailResult = await emailService.sendPaymentSuccessEmails({
              registration: regDataForEmail,
              payment: {
                amount: regDataForEmail.grand_total,
                razorpay_payment_id: regDataForEmail.transaction_id || 'ADM_MANUAL',
                razorpay_order_id: 'ADMIN_MANUAL',
                payment_method: regDataForEmail.payment_method || 'Manual Verification (Admin)',
                updated_at: regDataForEmail.paid_at || new Date()
              },
              user: regUser || {
                name: reg.full_name,
                email: reg.email,
                phone: reg.phone,
                organization: reg.organization
              },
              invoices: allInvoices || []
            });
          } else if (paymentStatus === 'failed') {
            emailResult = await emailService.sendPaymentFailedEmails({
              registration: regDataForEmail,
              payment: {
                amount: regDataForEmail.grand_total,
                razorpay_payment_id: regDataForEmail.transaction_id || 'N/A',
                razorpay_order_id: 'ADMIN_MANUAL',
                payment_method: regDataForEmail.payment_method || 'Manual Verification (Admin)'
              },
              user: regUser || {
                name: reg.full_name,
                email: reg.email,
                phone: reg.phone,
                organization: reg.organization
              },
              failureReason: 'Payment marked as Failed by Conference Administrator'
            });
          } else if (paymentStatus === 'refunded') {
            emailResult = await emailService.sendPaymentRefundedEmails({
              registration: regDataForEmail,
              payment: {
                amount: regDataForEmail.grand_total,
                razorpay_payment_id: regDataForEmail.transaction_id || 'N/A',
                razorpay_order_id: 'ADMIN_MANUAL',
                payment_method: regDataForEmail.payment_method || 'Manual Status Update (Admin)'
              },
              user: regUser || {
                name: reg.full_name,
                email: reg.email,
                phone: reg.phone,
                organization: reg.organization
              },
              refundReason: 'Payment marked as Refunded by Conference Administrator',
              refundAmount: regDataForEmail.grand_total
            });
          } else if (paymentStatus === 'pending') {
            emailResult = await emailService.sendPaymentPendingEmails({
              registration: regDataForEmail,
              payment: {
                amount: regDataForEmail.grand_total,
                payment_method: regDataForEmail.payment_method || 'Pending Payment'
              },
              user: regUser || {
                name: reg.full_name,
                email: reg.email,
                phone: reg.phone,
                organization: reg.organization
              },
              pendingAmount: regDataForEmail.grand_total,
              notes: 'Registration payment status marked as Pending by Administrator'
            });
          }
        } catch (emailErr) {
          console.error('Error dispatching admin status update email:', emailErr);
          emailResult = { success: false, error: emailErr.message };
        }
      }

      let successMessage = 'Registration status updated successfully.';
      if (emailResult && (emailResult.userEmail?.success || emailResult.adminEmail?.success)) {
        successMessage = `Registration updated to '${paymentStatus || status}' & email notification sent to ${reg.email}.`;
      }

      return sendSuccess(res, { registration: updated, emailResult }, successMessage);
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
   * Review and Update Abstract Status (and trigger email notification)
   * PUT /api/admin/abstracts/:id/status
   */
  async updateAbstractStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reviewComments, sendEmail = true } = req.body;

      if (!status) {
        return sendError(res, 'Status is required.', 422);
      }

      const updated = await Abstract.updateStatus(id, { status, reviewComments });
      if (!updated) {
        return sendError(res, 'Abstract not found.', 404);
      }

      let emailResult = null;
      // If status is accepted or rejected and sendEmail is true, dispatch notification email
      if (sendEmail && (status === 'accepted' || status === 'rejected')) {
        try {
          emailResult = await emailService.sendAbstractDecisionEmail({
            abstract: updated,
            status,
            reviewComments
          });
        } catch (emailErr) {
          console.error('Error dispatching abstract decision email:', emailErr);
          emailResult = { success: false, error: emailErr.message };
        }
      }

      const message = emailResult && emailResult.success
        ? `Abstract status updated to '${status}' and notification email sent to ${emailResult.recipientEmail} (CC: ${emailResult.ccEmail}).`
        : `Abstract status updated to '${status}' successfully.`;

      return sendSuccess(
        res,
        {
          ...updated,
          email_delivery: emailResult
        },
        message
      );
    } catch (error) {
      console.error('Error updating abstract status:', error);
      return sendError(res, 'Failed to update abstract status.', 500, error);
    }
  },

  /**
   * Resend Decision Email for Abstract
   * POST /api/admin/abstracts/:id/send-email
   */
  async resendAbstractDecisionEmail(req, res, next) {
    try {
      const { id } = req.params;
      const { customComments } = req.body || {};

      const abstract = await Abstract.findById(id);
      if (!abstract) {
        return sendError(res, 'Abstract not found.', 404);
      }

      if (abstract.status !== 'accepted' && abstract.status !== 'rejected') {
        return sendError(res, `Cannot send decision email for abstract with status '${abstract.status}'. Status must be 'accepted' or 'rejected'.`, 400);
      }

      const emailResult = await emailService.sendAbstractDecisionEmail({
        abstract,
        status: abstract.status,
        reviewComments: customComments || abstract.review_comments
      });

      if (!emailResult.success) {
        return sendError(res, emailResult.message || 'Failed to send decision email.', 500, emailResult);
      }

      return sendSuccess(res, emailResult, emailResult.message);
    } catch (error) {
      console.error('Error resending abstract decision email:', error);
      return sendError(res, error.message || 'Failed to resend decision email.', 500, error);
    }
  },

  /**
   * Get Email Logs for an Abstract
   * GET /api/admin/abstracts/:id/email-logs
   */
  async getAbstractEmailLogs(req, res, next) {
    try {
      const { id } = req.params;
      const logs = await EmailLog.findByAbstractId(id);
      return sendSuccess(res, logs, 'Email logs retrieved successfully.');
    } catch (error) {
      console.error('Error fetching email logs:', error);
      return sendError(res, 'Failed to fetch email logs.', 500, error);
    }
  },

  /**
   * Delete an Abstract by ID
   * DELETE /api/admin/abstracts/:id
   */
  async deleteAbstract(req, res, next) {
    try {
      const { id } = req.params;
      const targetId = parseInt(id, 10);
      if (isNaN(targetId)) {
        return sendError(res, 'Invalid abstract ID.', 400);
      }

      const existing = await Abstract.findById(targetId);
      if (!existing) {
        return sendError(res, 'Abstract not found.', 404);
      }

      const deleted = await Abstract.deleteById(targetId);
      if (!deleted) {
        return sendError(res, 'Failed to delete abstract.', 500);
      }

      return sendSuccess(
        res,
        { id: targetId, abstract_code: existing.abstract_code },
        `Abstract '${existing.abstract_code}' deleted successfully.`
      );
    } catch (error) {
      console.error('Error deleting abstract:', error);
      return sendError(res, error.message || 'Failed to delete abstract.', 500, error);
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
   * Download Any Invoice PDF (Admin)
   * GET /api/admin/invoices/:id/download
   */
  async downloadInvoice(req, res, next) {
    try {
      const invoice = await Invoice.findById(req.params.id) || await Registration.getInvoiceById(req.params.id);
      if (!invoice) {
        return sendError(res, 'Invoice not found.', 404);
      }

      const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);
      const filename = `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading invoice PDF for admin:', error);
      return sendError(res, 'Failed to download invoice PDF.', 500, error);
    }
  },

  /**
   * View Any Invoice PDF Inline (Admin)
   * GET /api/admin/invoices/:id/pdf
   */
  async viewInvoicePdf(req, res, next) {
    try {
      const invoice = await Invoice.findById(req.params.id) || await Registration.getInvoiceById(req.params.id);
      if (!invoice) {
        return sendError(res, 'Invoice not found.', 404);
      }

      const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);
      const filename = `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error viewing invoice PDF for admin:', error);
      return sendError(res, 'Failed to view invoice PDF.', 500, error);
    }
  },

  /**
   * Get All Payment Transactions with Filters and Pagination (Admin)
   * GET /api/admin/payments
   */
  async getPayments(req, res, next) {
    try {
      const { page, limit, status, search, userId, registrationId } = req.query;
      const result = await paymentService.getAllPaymentHistory({
        page,
        limit,
        status,
        search,
        userId,
        registrationId
      });
      return sendSuccess(res, result, 'Payment transactions retrieved successfully.');
    } catch (error) {
      console.error('Error fetching admin payments:', error);
      return sendError(res, 'Failed to fetch payment transactions.', 500, error);
    }
  },

  /**
   * Export All Payments to Excel (.xlsx) (Admin)
   * GET /api/admin/payments/export
   */
  async exportPayments(req, res, next) {
    try {
      const { status, search, userId, registrationId } = req.query;
      const { payments } = await paymentService.getAllPaymentHistory({
        page: 1,
        limit: 5000,
        status,
        search,
        userId,
        registrationId
      });

      const buffer = await excelService.generatePaymentsExcel(payments);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SPCTT_Payments_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('Error exporting payments to Excel:', error);
      return sendError(res, 'Failed to export payments to Excel.', 500, error);
    }
  },

  /**
   * Create New User by Admin
   * POST /api/admin/users
   */
  async createUser(req, res, next) {
    try {
      const {
        title = 'Mr.',
        name,
        fullName,
        email,
        organization,
        phone,
        role = 'user',
        status = 'active',
        password,
        address,
        city,
        state,
        country,
        pincode
      } = req.body;

      const finalName = (fullName || name || '').trim();
      const finalEmail = (email || '').trim().toLowerCase();

      if (!finalName) {
        return sendError(res, 'Full name is required.', 422);
      }

      if (!finalEmail) {
        return sendError(res, 'Email address is required.', 422);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        return sendError(res, 'Please provide a valid email address.', 422);
      }

      if (!password || password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters long.', 422);
      }

      const existing = await User.findByEmail(finalEmail);
      if (existing) {
        return sendError(res, 'A user with this email address already exists.', 409);
      }

      const validRoles = ['admin', 'user', 'manager'];
      const finalRole = validRoles.includes((role || '').toLowerCase()) ? role.toLowerCase() : 'user';

      const validStatuses = ['active', 'inactive', 'banned'];
      const finalStatus = validStatuses.includes((status || '').toLowerCase()) ? status.toLowerCase() : 'active';

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        title: (title || 'Mr.').trim(),
        name: finalName,
        email: finalEmail,
        organization: organization ? organization.trim() : null,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        role: finalRole,
        status: finalStatus
      });

      // Extra profile fields if provided
      const extraUpdates = {};
      if (address) extraUpdates.address = address.trim();
      if (city) extraUpdates.city = city.trim();
      if (state) extraUpdates.state = state.trim();
      if (country) extraUpdates.country = country.trim();
      if (pincode) extraUpdates.pincode = pincode.trim();

      let finalUser = newUser;
      if (Object.keys(extraUpdates).length > 0) {
        finalUser = await User.updateById(newUser.id, extraUpdates);
      }

      return sendSuccess(
        res,
        finalUser,
        `User '${finalUser.name}' (ID: #${finalUser.id}) created successfully!`,
        201
      );
    } catch (error) {
      console.error('Error creating user:', error);
      return sendError(res, error.message || 'Failed to create user.', 500, error);
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
  },

  /**
   * Export Abstracts to Excel (.xlsx)
   * GET /api/admin/abstracts/export
   */
  async exportAbstracts(req, res, next) {
    try {
      const { status, category, search } = req.query;
      const abstracts = await Abstract.findAll({ status, category, search });
      const buffer = await excelService.generateAbstractsExcel(abstracts);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SPCTT_Abstracts_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('Error exporting abstracts to Excel:', error);
      return sendError(res, 'Failed to export abstracts to Excel.', 500, error);
    }
  },

  /**
   * Export Registrations to Excel (.xlsx)
   * GET /api/admin/registrations/export
   */
  async exportRegistrations(req, res, next) {
    try {
      const { status, payment_status, search } = req.query;
      const registrations = await Registration.findAll({ status, payment_status, search });
      const buffer = await excelService.generateRegistrationsExcel(registrations);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SPCTT_Registrations_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('Error exporting registrations to Excel:', error);
      return sendError(res, 'Failed to export registrations to Excel.', 500, error);
    }
  },

  /**
   * Export Users to Excel (.xlsx)
   * GET /api/admin/users/export
   */
  async exportUsers(req, res, next) {
    try {
      const { role, status, search } = req.query;
      const users = await User.findAll({ role, status, search });
      const buffer = await excelService.generateUsersExcel(users);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SPCTT_Users_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('Error exporting users to Excel:', error);
      return sendError(res, 'Failed to export users to Excel.', 500, error);
    }
  }
};

export default adminController;
