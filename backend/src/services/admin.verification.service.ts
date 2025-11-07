import prisma from '../lib/prisma';

// Get all pending company verifications
export async function getPendingCompanyVerifications() {
  // CompanyProfile in schema uses 'verified' boolean and 'verification_date'.
  // Treat profiles with verified=false as pending (and possibly with verification_date null).
  const pending = await prisma.companyProfile.findMany({
    where: { 
      verified: false
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
      // Use created_at as fallback ordering for oldest submissions
      created_at: 'asc'
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
  // The schema does not have uploadedDocument model; uploaded documents are stored in CaseDocument
  // or CandidateDocument depending on context. Attempt to read from CaseDocument where case is linked
  // but for company verification we expect documents in a generic JSON field (CompanyVerification.documents)
  let documents: any[] = [];
  try {
    // If a dedicated uploadedDocument model exists at runtime, use it. The declaration file above
    // allows TypeScript to compile while runtime will still use actual Prisma generated client.
    documents = await prisma.uploadedDocument.findMany({
      where: {
        subject_type: 'COMPANY',
        subject_id: company_id,
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (e) {
    // Fallback: read from CompanyVerification.documents JSON if present
    const ver = await prisma.companyVerification.findFirst({ where: { company_id } });
    if (ver && ver.documents) {
      try {
        documents = JSON.parse(JSON.stringify(ver.documents));
      } catch (err) {
        documents = [];
      }
    }
  }
  
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
      verification_date: new Date(),
      // keep verification notes in audit log instead of schema field (schema may not include it)
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
      // Keep as pending for re-submission; do not write verification_notes here because
      // the generated Prisma client may not include that field depending on schema generation.
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
    pendingOlderThan7Days,
  ] = await Promise.all([
    prisma.companyProfile.count({ where: { verified: false } }),
    prisma.companyProfile.count({ where: { verified: true } }),
    // Count pending with a submitted verification_date (if system uses that)
    prisma.companyProfile.count({ where: { verified: false, verification_date: { not: null } } }),
    prisma.companyProfile.count({
      where: {
        verified: false,
        created_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  
  return {
    totalPending,
    totalVerified,
    totalRejected,
    pendingOlderThan7Days,
    totalCompanies: totalPending + totalVerified + totalRejected
  };
}
