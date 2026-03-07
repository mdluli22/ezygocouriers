import { z } from "zod";

const saPhone = z
  .string()
  .regex(
    /^(\+27|0)[6-8][0-9]{8}$/,
    "Please enter a valid South African phone number"
  );

const addressSchema = z.object({
  street_address: z
    .string()
    .min(5, "Street address must be at least 5 characters")
    .max(255),
  suburb: z.string().max(100).optional().or(z.literal("")),
  city: z.string().min(2, "City is required").max(100),
  province: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const createDeliverySchema = z.object({
  // Pickup
  pickup_address: addressSchema,
  pickup_contact_name: z
    .string()
    .min(2, "Pickup contact name is required")
    .max(255),
  pickup_contact_phone: saPhone,

  // Drop-off
  dropoff_address: addressSchema,
  recipient_name: z
    .string()
    .min(2, "Recipient name is required")
    .max(255),
  recipient_phone: saPhone,

  // Parcel
  parcel_description: z
    .string()
    .min(3, "Please describe the parcel")
    .max(1000),
  special_instructions: z
    .string()
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
