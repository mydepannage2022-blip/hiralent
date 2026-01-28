import { z } from "zod";

export const certificationItemSchema = z.object({
  certification_id: z.string().uuid().optional(), // for updates
  name: z.string().trim().min(1, "name is required"),
  issuer: z.string().trim().min(1, "issuer is required"),
  issue_date: z.string().optional().nullable(),      // "YYYY-MM-DD"
  expiry_date: z.string().optional().nullable(),     // "YYYY-MM-DD"
  credential_id: z.string().optional().nullable(),
  credential_url: z.string().url().optional().nullable(),
});

export const bulkCertificationsSchema = z.object({
  certifications: z.array(certificationItemSchema),
});

export const addCertificationSchema = z.object({
  name: z.string().trim().min(1),
  issuer: z.string().trim().min(1),
  issue_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  credential_id: z.string().optional().nullable(),
  credential_url: z.string().url().optional().nullable(),
});
