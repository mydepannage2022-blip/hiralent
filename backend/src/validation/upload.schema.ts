import { z } from "zod";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10_000_000);
const ALLOWED_MIME = (process.env.ALLOWED_MIME || "image/png,image/jpeg,application/pdf")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const DocumentTypeEnum = z.enum([
  "REGISTRATION_CERTIFICATE",
  "TAX_ID",
  "BANK_STATEMENT",
  "IDENTITY_PROOF",
  "LICENSE",
  "OTHER",
]);

export const UploadBodySchema = z.object({
  document_type: DocumentTypeEnum,
});

export const MulterFileSchema = z
  .object({
    buffer: z.instanceof(Buffer, { message: "File buffer is required" }),
    originalname: z.string().min(1, "Original file name is required"),
    mimetype: z.string().min(1, "MIME type is required"),
    size: z.number().int().positive("File size must be positive"),
    fieldname: z.string().optional(),
    encoding: z.string().optional(),
  })
  .superRefine((file, ctx) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `File too large. Max allowed is ${MAX_UPLOAD_BYTES} bytes.`,
        path: ["size"],
      });
    }
    if (!ALLOWED_MIME.includes(file.mimetype.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported file type. Allowed: ${ALLOWED_MIME.join(", ")}`,
        path: ["mimetype"],
      });
    }
  });

export const CompanyUploadParamsSchema = z.object({ companyId: z.string().min(1) });
export const AgencyUploadParamsSchema = z.object({ agencyId: z.string().min(1) });

export function parseUploadRequest(req: any) {
  const body = UploadBodySchema.parse(req.body);

  if (!req.file) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "File is required (field name: 'file')",
        path: ["file"],
      },
    ]);
  }
  const file = MulterFileSchema.parse(req.file);
  return { body, file };
}
