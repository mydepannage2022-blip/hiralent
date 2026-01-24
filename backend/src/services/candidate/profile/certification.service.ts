// services/candidate/profile/certification.service.ts

import { PrismaClient } from '@prisma/client';
import { CertificationInput, CertificationWithStatus, ServiceResponse } from '../../../types/profile.types';

const prisma = new PrismaClient();

function isExpired(expiry?: Date | null): boolean {
  if (!expiry) return false;
  return expiry.getTime() < Date.now();
}

export class CertificationService {
  async addCertification(candidateId: string, input: CertificationInput): Promise<ServiceResponse<{ certification: CertificationWithStatus }>> {
    try {
      const created = await prisma.certification.create({
        data: {
          candidate_id: candidateId,
          name: input.name,
          issuer: input.issuer,
          issue_date: new Date(input.issue_date),
          expiry_date: input.expiry_date ? new Date(input.expiry_date) : null,
          credential_id: input.credential_id ?? null,
          credential_url: input.credential_url ?? null,
        },
      });

      const expired = isExpired(created.expiry_date);

      const days_until_expiry =
        created.expiry_date ? Math.ceil((created.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;

      const certification: CertificationWithStatus = {
        certification_id: created.certification_id,
        name: created.name,
        issuer: created.issuer,
        issue_date: created.issue_date,
        expiry_date: created.expiry_date ?? undefined,
        credential_id: created.credential_id ?? undefined,
        credential_url: created.credential_url ?? undefined,
        is_verified: created.is_verified,
        is_expired: expired,
        days_until_expiry: created.expiry_date ? days_until_expiry : undefined,
      };

      return { success: true, data: { certification }, message: 'Certification added successfully' };
    } catch (error: any) {
      console.error('CertificationService.addCertification error:', error);
      return { success: false, message: 'Failed to add certification', error: error.message };
    }
  }

  async listCertifications(candidateId: string): Promise<ServiceResponse<{ certifications: CertificationWithStatus[] }>> {
    try {
      const rows = await prisma.certification.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' },
      });

      const certifications: CertificationWithStatus[] = rows.map((c) => {
        const expired = isExpired(c.expiry_date);
        const days_until_expiry =
          c.expiry_date ? Math.ceil((c.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;

        return {
          certification_id: c.certification_id,
          name: c.name,
          issuer: c.issuer,
          issue_date: c.issue_date,
          expiry_date: c.expiry_date ?? undefined,
          credential_id: c.credential_id ?? undefined,
          credential_url: c.credential_url ?? undefined,
          is_verified: c.is_verified,
          is_expired: expired,
          days_until_expiry: c.expiry_date ? days_until_expiry : undefined,
        };
      });

      return { success: true, data: { certifications } };
    } catch (error: any) {
      console.error('CertificationService.listCertifications error:', error);
      return { success: false, message: 'Failed to list certifications', error: error.message };
    }
  }

  async deleteCertification(candidateId: string, certificationId: string): Promise<ServiceResponse> {
    try {
      const found = await prisma.certification.findUnique({ where: { certification_id: certificationId } });
      if (!found || found.candidate_id !== candidateId) {
        return { success: false, message: 'Certification not found' };
      }

      await prisma.certification.delete({ where: { certification_id: certificationId } });
      return { success: true, message: 'Certification deleted successfully' };
    } catch (error: any) {
      console.error('CertificationService.deleteCertification error:', error);
      return { success: false, message: 'Failed to delete certification', error: error.message };
    }
  }
}

export const certificationService = new CertificationService();