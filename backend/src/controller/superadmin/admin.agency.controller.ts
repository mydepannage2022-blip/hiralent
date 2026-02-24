import { Request, Response } from "express";
import { PrismaClient, AgencyStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

// GET /api/v1/admin/agencies/pending
export const getPendingAgencies = async (req: Request, res: Response) => {
  try {
    const agencies = await prisma.agency.findMany({
      where: { status: AgencyStatus.PENDING },
      orderBy: { created_at: "desc" },
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        service_description: true,
        website: true,
        operating_countries: true,
        service_categories: true,
        business_license_url: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: agencies,
      count: agencies.length,
    });
  } catch (error) {
    console.error("Get pending agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending agencies",
    });
  }
};

// GET /api/v1/admin/agencies/all
export const getAllAgencies = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const whereClause = status ? { status: status as AgencyStatus } : {};

    const agencies = await prisma.agency.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        service_description: true,
        website: true,
        operating_countries: true,
        service_categories: true,
        business_license_url: true,
        rejection_reason: true,
        approved_at: true,
        approved_by: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: agencies,
      count: agencies.length,
    });
  } catch (error) {
    console.error("Get all agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agencies",
    });
  }
};

// GET /api/v1/admin/agencies/:id
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: agency,
    });
  } catch (error) {
    console.error("Get agency by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agency",
    });
  }
};

// POST /api/v1/admin/agencies/:id/approve
export const approveAgency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.user_id;

    // Find the agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.status !== AgencyStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Agency is already ${agency.status}`,
      });
    }

    // Generate random password
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Check if user already exists with this email
    let newUser = await prisma.user.findUnique({
      where: { email: agency.email! },
    });

    if (newUser) {
      // User already exists - update their role and link to agency
      newUser = await prisma.user.update({
        where: { user_id: newUser.user_id },
        data: {
          role: "agency_admin",
          agency_id: agency.agency_id,
          is_email_verified: true,
          password_hash: hashedPassword,
        },
      });
    } else {
      // Create new user for agency admin
      newUser = await prisma.user.create({
        data: {
          email: agency.email!,
          password_hash: hashedPassword,
          full_name: agency.name,
          role: "agency_admin",
          is_email_verified: true,
          agency_id: agency.agency_id,
        },
      });
    }

    // Update Agency
    const updatedAgency = await prisma.agency.update({
      where: { agency_id: id },
      data: {
        status: AgencyStatus.APPROVED,
        owner_user_id: newUser.user_id,
        approved_at: new Date(),
        approved_by: adminId || "system",
        billing_contact_email: agency.email,
      },
    });

    // Create AgencyAdminProfile
    await prisma.agencyAdminProfile.create({
      data: {
        admin_id: newUser.user_id,
        phone_number: agency.phone,
      },
    });

    // ============================
    // 📧 SEND APPROVAL EMAIL (NON-BLOCKING)
    // ============================
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    console.log("📧 Queuing approval email to:", agency.email);

    const approvalEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 6px; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #6b7280; font-size: 13px; }
          .credential-value { font-size: 16px; color: #1f2937; margin-top: 4px; }
          .password-box { background: #fef3c7; padding: 8px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #92400e; display: inline-block; }
          .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Agency Application Approved!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${agency.name}</strong>,</p>
            
            <p>Congratulations! Your agency application has been <strong>approved</strong> by the Hiralent admin team.</p>
            
            <p>You can now access your agency dashboard and start managing relocation cases for your clients.</p>
            
            <div class="credentials">
              <h3 style="margin-top: 0; color: #10b981;">🔐 Your Login Credentials</h3>
              
              <div class="credential-item">
                <div class="credential-label">Email Address</div>
                <div class="credential-value">${agency.email}</div>
              </div>
              
              <div class="credential-item" style="margin-top: 20px;">
                <div class="credential-label">Temporary Password</div>
                <div style="margin-top: 8px;">
                  <span class="password-box">${tempPassword}</span>
                </div>
              </div>
            </div>

            <div class="warning-box">
              <strong>⚠️ Important Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This is a temporary password</li>
                <li>Please change it immediately after your first login</li>
                <li>Never share your password with anyone</li>
                <li>Keep this email secure or delete it after changing your password</li>
              </ul>
            </div>

            <a href="${frontendUrl}/agency/login" class="button">
              Access Agency Dashboard
            </a>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #1f2937;">📋 What's Next?</h3>
              <ul>
                <li><strong>Login:</strong> Use the credentials above to access your dashboard</li>
                <li><strong>Change Password:</strong> Update your password in Settings</li>
                <li><strong>Complete Profile:</strong> Add your agency details and team members</li>
                <li><strong>Start Managing Cases:</strong> Create and track relocation cases</li>
                <li><strong>Invite Team:</strong> Add case managers and staff to your agency</li>
              </ul>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #1f2937;">📞 Need Help?</h3>
              <p>If you have any questions or need assistance getting started:</p>
              <ul>
                <li>📧 Email: support@hiralent.com</li>
                <li>📚 Documentation: ${frontendUrl}/docs</li>
                <li>💬 Live Chat: Available in your dashboard</li>
              </ul>
            </div>

            <p style="margin-top: 30px;">Welcome to the Hiralent platform! We're excited to have you on board.</p>

            <div class="footer">
              <p><strong>Hiralent - Global Relocation Management Platform</strong></p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>Approved on ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Fire-and-forget (non-blocking)
    sendEmail({
      to: agency.email!,
      subject: "🎉 Agency Application Approved - Access Your Dashboard",
      html: approvalEmailHtml,
    })
      .then(() => console.log(`Approval email sent to: ${agency.email}`))
      .catch((err) => console.error("❌ Email send error:", err.message));

    return res.status(200).json({
      success: true,
      message: "Agency approved successfully. Credentials sent via email.",
      data: {
        agency_id: updatedAgency.agency_id,
        name: updatedAgency.name,
        status: updatedAgency.status,
        user_id: newUser.user_id,
      },
    });
  } catch (error) {
    console.error("Approve agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve agency",
    });
  }
};

// POST /api/v1/admin/agencies/:id/reject
export const rejectAgency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).user?.user_id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Find the agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.status !== AgencyStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Agency is already ${agency.status}`,
      });
    }

    // Update Agency
    const updatedAgency = await prisma.agency.update({
      where: { agency_id: id },
      data: {
        status: AgencyStatus.REJECTED,
        rejection_reason: reason,
        approved_by: adminId || "system",
        approved_at: new Date(),
      },
    });

    // ============================
    // 📧 SEND REJECTION EMAIL (NON-BLOCKING)
    // ============================
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    console.log("📧 Queuing rejection email to:", agency.email);

    const rejectionEmailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px; margin: 20px 0; }
      .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
      .button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
      .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      ul { padding-left: 20px; }
      li { margin: 8px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Agency Application Update</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${agency.name}</strong>,</p>
        
        <p>Thank you for your interest in joining the Hiralent platform. After careful review, we regret to inform you that your agency application has not been approved at this time.</p>
        
        <div class="reason-box">
          <h3 style="margin-top: 0; color: #dc2626;">📋 Reason for Rejection</h3>
          <p style="margin: 0; font-size: 15px; line-height: 1.8;">${reason}</p>
        </div>

        <div class="info-box">
          <h3 style="margin-top: 0; color: #1f2937;">🔄 What You Can Do Next</h3>
          <ul>
            <li><strong>Review the Feedback:</strong> Carefully read the rejection reason above</li>
            <li><strong>Address the Issues:</strong> Make necessary improvements to your application</li>
            <li><strong>Reapply:</strong> You can submit a new application once you've addressed the concerns</li>
            <li><strong>Contact Support:</strong> Reach out if you need clarification or have questions</li>
          </ul>
        </div>

        <div class="info-box">
          <h3 style="margin-top: 0; color: #1f2937;">💡 Tips for Reapplication</h3>
          <ul>
            <li>Ensure all required documents are complete and valid</li>
            <li>Provide detailed information about your services</li>
            <li>Include verifiable business credentials</li>
            <li>Double-check contact information</li>
            <li>Clearly describe your operating countries and service categories</li>
          </ul>
        </div>

        <a href="${frontendUrl}/agency/apply" class="button">
          Submit New Application
        </a>

        <div class="info-box">
          <h3 style="margin-top: 0; color: #1f2937;">📞 Need Assistance?</h3>
          <p>If you have questions about this decision or need help preparing a new application:</p>
          <ul>
            <li>📧 Email: support@hiralent.com</li>
            <li>📞 Phone: +1 (555) 123-4567</li>
            <li>💬 Live Chat: ${frontendUrl}/contact</li>
            <li>📚 Application Guide: ${frontendUrl}/agency/application-guide</li>
          </ul>
        </div>

        <p style="margin-top: 30px;">We appreciate your understanding and encourage you to reapply once you've addressed the feedback provided.</p>

        <p>Best regards,<br><strong>The Hiralent Team</strong></p>

        <div class="footer">
          <p><strong>Hiralent - Global Relocation Management Platform</strong></p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>Decision made on ${new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

    // Fire-and-forget (non-blocking)
    sendEmail({
      to: agency.email!,
      subject: "Agency Application Decision - Hiralent",
      html: rejectionEmailHtml,
    })
      .then(() => console.log(`Rejection email sent to: ${agency.email}`))
      .catch((err) => console.error("❌ Email send error:", err.message));

    return res.status(200).json({
      success: true,
      message: "Agency rejected. Notification sent via email.",
      data: {
        agency_id: updatedAgency.agency_id,
        name: updatedAgency.name,
        status: updatedAgency.status,
        rejection_reason: updatedAgency.rejection_reason,
      },
    });
  } catch (error) {
    console.error("Reject agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject agency",
    });
  }
};

// GET /api/v1/admin/agencies/stats
export const getAgencyStats = async (req: Request, res: Response) => {
  try {
    // Get counts by status
    const [pending, approved, rejected, all] = await Promise.all([
      prisma.agency.count({ where: { status: AgencyStatus.PENDING } }),
      prisma.agency.count({ where: { status: AgencyStatus.APPROVED } }),
      prisma.agency.count({ where: { status: AgencyStatus.REJECTED } }),
      prisma.agency.findMany({
        where: { status: AgencyStatus.PENDING },
        select: { created_at: true },
      }),
    ]);

    // Calculate "This Week" (applications from last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeek = await prisma.agency.count({
      where: {
        status: AgencyStatus.PENDING,
        created_at: { gte: oneWeekAgo },
      },
    });

    // Calculate "Urgent" (pending > 7 days)
    const urgent = await prisma.agency.count({
      where: {
        status: AgencyStatus.PENDING,
        created_at: { lt: oneWeekAgo },
      },
    });

    // Calculate average processing time (for approved/rejected agencies)
    const processedAgencies = await prisma.agency.findMany({
      where: {
        status: { in: [AgencyStatus.APPROVED, AgencyStatus.REJECTED] },
        approved_at: { not: null },
      },
      select: {
        created_at: true,
        approved_at: true,
      },
    });

    let avgProcessingDays = 0;
    if (processedAgencies.length > 0) {
      const totalDays = processedAgencies.reduce((sum, agency) => {
        const created = new Date(agency.created_at).getTime();
        const processed = new Date(agency.approved_at!).getTime();
        const days = (processed - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgProcessingDays =
        Math.round((totalDays / processedAgencies.length) * 10) / 10;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalPending: pending,
        totalApproved: approved,
        totalRejected: rejected,
        thisWeek,
        urgent,
        avgProcessingDays,
      },
    });
  } catch (error) {
    console.error("Get agency stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agency stats",
    });
  }
};
