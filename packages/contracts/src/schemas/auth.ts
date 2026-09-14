import { z } from "zod";
import { southAfricanPhoneSchema } from "./common";

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
    phone: southAfricanPhoneSchema.optional().or(z.literal("")),
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
