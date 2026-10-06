import { z } from "zod";
import { normalizeSignupPhone } from "../phone";

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(255, "Full name is too long"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .toLowerCase(),
    phone: z.string({ error: "Phone number is required" }).trim()
      .min(1, "Phone number is required")
      .transform((value, ctx) => {
        const normalized = normalizeSignupPhone(value);
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: "Enter a valid phone number with its country code" });
          return z.NEVER;
        }
        return normalized;
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const mobileVerifyEmailSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code."),
});

export const mobileSendVerificationSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MobileVerifyEmailInput = z.infer<typeof mobileVerifyEmailSchema>;
export type MobileSendVerificationInput = z.infer<
  typeof mobileSendVerificationSchema
>;
