import { z } from "zod";
import { DELIVERY_STATUSES, USER_ROLES } from "../constants";
import {
  positiveIntegerSchema,
  requiredTextSchema,
  trimmedSouthAfricanPhoneSchema,
} from "./common";

export const adminDeliveryQuerySchema = z.object({
  status: z.enum(["all", ...DELIVERY_STATUSES]).default("all"),
});

export const adminAssignDriverSchema = z.object({
  delivery_id: positiveIntegerSchema,
  driver_id: positiveIntegerSchema,
});

export const adminCreateDriverSchema = z.object({
  full_name: requiredTextSchema(255),
  email: z.string().trim().email().toLowerCase(),
  phone: trimmedSouthAfricanPhoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  license_number: requiredTextSchema(100),
  vehicle_type: requiredTextSchema(100),
  vehicle_reg: requiredTextSchema(100),
});

export const adminToggleDriverSchema = z.object({
  driver_id: positiveIntegerSchema,
});

export const adminUserQuerySchema = z.object({
  role: z.enum(USER_ROLES).optional(),
});

export const adminToggleUserSchema = z.object({
  user_id: positiveIntegerSchema,
});

export const adminUpdatePricingSchema = z.object({
  rule_id: positiveIntegerSchema,
  flat_fee: z.number().finite().nonnegative(),
});

export type AdminAssignDriverInput = z.infer<
  typeof adminAssignDriverSchema
>;
export type AdminCreateDriverInput = z.infer<
  typeof adminCreateDriverSchema
>;
