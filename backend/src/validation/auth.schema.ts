import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  role: z.enum(["candidate", "company_admin", "admin", "agency_admin"]),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(10),
});


export const DeleteAccountSchema = z.object({
  confirmation: z.string()
    .optional()
    .refine(
      (val) => !val || val.toLowerCase().trim() === "delete my account",
      { 
        message: "Confirmation text must be exactly 'delete my account'" 
      }
    ),
  
  reason: z.enum([
    "not_useful",
    "too_expensive", 
    "found_alternative",
    "privacy_concerns",
    "too_complicated",
    "other"
  ]).optional(),
  
  feedback: z.string()
    .max(500, "Feedback cannot exceed 500 characters")
    .optional()
}).strict();

export type DeleteAccountRequest = z.infer<typeof DeleteAccountSchema>;
