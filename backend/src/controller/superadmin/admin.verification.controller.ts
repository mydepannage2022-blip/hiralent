// backend/src/controller/superadmin/admin.verification.controller.ts
import { Request, Response } from 'express';
import * as adminVerificationService from '../../services/admin.verification.service';
import { s3SignedUrl } from '../../lib/s3';
import prisma from '../../lib/prisma';

// GET /admin/verifications/pending
export const getPendingVerificationsController = async (req: Request, res: Response) => {
  try {
    const pending = await adminVerificationService.getPendingCompanyVerifications();
    
    res.json({ 
      ok: true, 
      count: pending.length,
      data: pending 
    });
  } catch (error: any) {
    console.error('[getPendingVerifications] error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// GET /admin/verifications/stats
export const getVerificationStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await adminVerificationService.getVerificationStats();
    
    res.json({ 
      ok: true, 
      data: stats 
    });
  } catch (error: any) {
    console.error('[getVerificationStats] error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// GET /admin/verifications/:company_id
export const getCompanyVerificationDetailsController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    
    const details = await adminVerificationService.getCompanyVerificationDetails(company_id);
    
    res.json({ 
      ok: true, 
      ...details
    });
  } catch (error: any) {
    console.error('[getCompanyVerificationDetails] error:', error);
    res.status(404).json({ ok: false, error: error.message });
  }
};

// ✅ NEW: GET /admin/verifications/:company_id/documents/:document_id/url
export const getPresignedDocumentUrlController = async (req: Request, res: Response) => {
  try {
    const { company_id, document_id } = req.params;
    
    console.log('📄 Generating presigned URL for document:', document_id);
    
    const document = await prisma.uploadedDocument.findFirst({
      where: {
        document_id,
        subject_id: company_id,
        subject_type: 'COMPANY',
      },
    });

    if (!document) {
      console.error('❌ Document not found:', document_id);
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    console.log('✅ Document found:', {
      document_id,
      storage_key: document.storage_key,
      mime_type: document.mime_type,
    });

    // Generate presigned URL (valid for 1 hour) via the shared S3/MinIO client, so this
    // uses the same env-driven S3_* credentials as the rest of the app rather than a
    // second client with its own MINIO_* credential set.
    // Single source of truth: sign and advertise the SAME lifetime, so the client can
    // never be told 1 hour while the link actually dies sooner.
    const PRESIGN_TTL_SECONDS = 60 * 60;
    const presignedUrl = await s3SignedUrl(document.storage_key, PRESIGN_TTL_SECONDS);

    console.log('🔗 Presigned URL generated successfully');

    res.json({
      ok: true,
      url: presignedUrl,
      expires_in: PRESIGN_TTL_SECONDS, // seconds
      document: {
        file_name: document.file_name,
        mime_type: document.mime_type,
        file_size: document.file_size,
      }
    });
  } catch (error: any) {
    console.error('[getPresignedDocumentUrl] error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// POST /admin/verifications/approve/:company_id
export const approveVerificationController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    const { notes } = req.body;
    const admin_id = req.admin?.user_id;
    
    if (!admin_id) {
      return res.status(401).json({ ok: false, error: 'Admin not authenticated' });
    }
    
    const result = await adminVerificationService.approveCompanyVerification(
      company_id,
      admin_id,
      notes
    );
    
    res.json({ 
      ok: true, 
      message: 'Company verification approved successfully',
      data: result
    });
  } catch (error: any) {
    console.error('[approveVerification] error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
};

// POST /admin/verifications/reject/:company_id
export const rejectVerificationController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    const { reason } = req.body;
    const admin_id = req.admin?.user_id;
    
    if (!admin_id) {
      return res.status(401).json({ ok: false, error: 'Admin not authenticated' });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Rejection reason is required' 
      });
    }
    
    const result = await adminVerificationService.rejectCompanyVerification(
      company_id,
      admin_id,
      reason
    );
    
    res.json({ 
      ok: true, 
      message: 'Verification sent back for re-submission',
      data: result
    });
  } catch (error: any) {
    console.error('[rejectVerification] error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
};