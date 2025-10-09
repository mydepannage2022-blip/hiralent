import prisma from '../lib/prisma';

// Get all pending company verifications
export async function getPendingCompanyVerifications() {
  const pending = await prisma.companyProfile.findMany({
    where: { 
      verification_status: 'pending' 
    },
    include: {
      user: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
          created_at: true,
          is_email_verified: true
        }
      }
    },
    orderBy: {
      verification_submitted_at: 'asc' // Oldest first
    }
  });
  
  return pending;
}

// Get detailed verification info for a specific company
export async function getCompanyVerificationDetails(company_id: string) {
  const company = await prisma.companyProfile.findUnique({
    where: { company_id },
    include: {
      user: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
          phone_number: true,
          created_at: true,
          is_email_verified: true,
          last_login_at: true
        }
      }
    }
  });
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  // Get uploaded documents
  const documents = await prisma.uploadedDocument.findMany({
    where: {
      subject_type: 'COMPANY',
      subject_id: company_id
    },
    orderBy: {
      created_at: 'desc'
    }
  });
  
  // Get verification runs history
  const verificationRuns = await prisma.verificationRun.findMany({
    where: {
      subject_type: 'COMPANY',
      subject_id: company_id
    },
    include: {
      signals: true,
      snapshot: true
    },
    orderBy: {
      started_at: 'desc'
    }
  });
  
  return {
    company,
    documents,
    verificationRuns
  };
}

// Manually approve a company
export async function approveCompanyVerification(
  company_id: string,
  admin_id: string,
  notes?: string
) {
  // Update company profile
  const updated = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      verified: true,
      verification_status: 'verified',
      verification_date: new Date(),
      verification_notes: notes || 'Manually approved by admin'
    }
  });
  
  // Create audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_id,
      action_type: 'APPROVE_COMPANY_VERIFICATION',
      target_table: 'CompanyProfile',
      target_id: company_id,
      description: `Approved company verification for ${updated.company_name || company_id}. Notes: ${notes || 'None'}`
    }
  });
  
  return updated;
}

// Reject/send back for re-submission
export async function rejectCompanyVerification(
  company_id: string,
  admin_id: string,
  reason: string
) {
  const updated = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      verified: false,
      verification_status: 'pending', // Keep as pending for re-submission
      verification_notes: reason
    }
  });
  
  // Create audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_id,
      action_type: 'REJECT_COMPANY_VERIFICATION',
      target_table: 'CompanyProfile',
      target_id: company_id,
      description: `Rejected company verification for ${updated.company_name || company_id}. Reason: ${reason}`
    }
  });
  
  return updated;
}

// Get verification statistics
export async function getVerificationStats() {
  const [
    totalPending,
    totalVerified,
    totalRejected,
    pendingOlderThan7Days
  ] = await Promise.all([
    prisma.companyProfile.count({
      where: { verification_status: 'pending' }
    }),
    prisma.companyProfile.count({
      where: { verified: true }
    }),
    prisma.companyProfile.count({
      where: { 
        verification_status: 'pending',
        verified: false,
        verification_notes: { not: null }
      }
    }),
    prisma.companyProfile.count({
      where: {
        verification_status: 'pending',
        verification_submitted_at: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);
  
  return {
    totalPending,
    totalVerified,
    totalRejected,
    pendingOlderThan7Days,
    totalCompanies: totalPending + totalVerified + totalRejected
  };
}