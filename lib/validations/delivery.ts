import { z } from "zod";

const saPhone = z
  .string()
  .regex(
    /^(\+27|0)[6-8][0-9]{8}$/,
    "Please enter a valid South African phone number"
  );

const addressSchema = z.object({
  // Core geocoded fields
  formatted_address: z.string().min(5, "Please select a valid address").max(500),
  street_address: z.string().max(255).optional().or(z.literal("")),
  suburb: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Extras
  building_or_business: z.string().max(255).optional().or(z.literal("")),
  apt_suite: z.string().max(100).optional().or(z.literal("")),
  meeting_option: z
    .enum(["meet_at_curb", "meet_at_door", "leave_at_door"])
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const createDeliverySchema = z.object({
  // Pickup
  pickup_address: addressSchema,
  pickup_contact_name: z.string().min(2, "Pickup contact name is required").max(255),
  pickup_contact_phone: saPhone,

  // Drop-off
  dropoff_address: addressSchema,
  recipient_name: z.string().min(2, "Recipient name is required").max(255),
  recipient_phone: saPhone,

  // Parcel
  parcel_description: z.string().min(3, "Please describe the parcel").max(1000),
  special_instructions: z.string().max(500).optional().or(z.literal("")),

  // Package extras (optional)
  package_type: z.string().max(50).optional().or(z.literal("")),
  package_category: z.string().max(50).optional().or(z.literal("")),
  fragile: z.boolean().optional(),

  // Delivery options
  require_pin: z.boolean().optional(),
  scheduled_time: z.string().optional().nullable(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
