import { z } from "zod";
import { isInCapeTownServiceArea } from "@/lib/constants/service-area";

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
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // Extras
  building_or_business: z.string().max(255).optional().or(z.literal("")),
  apt_suite: z.string().max(100).optional().or(z.literal("")),
  meeting_option: z
    .enum(["meet_at_curb", "meet_at_door", "leave_at_door"])
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().or(z.literal("")),
}).superRefine((address, context) => {
  if (!isInCapeTownServiceArea(address)) {
    context.addIssue({
      code: "custom",
      path: ["formatted_address"],
      message: "This address is outside our Cape Town delivery area",
    });
  }
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
  recipient_email: z.string().email("Please enter a valid recipient email").max(320).optional().or(z.literal("")),

  // Parcel
  parcel_description: z.string().min(3, "Please describe the parcel").max(1000),
  special_instructions: z.string().max(500).optional().or(z.literal("")),

  // Package extras (optional)
  package_type: z.enum(["small", "medium", "large"]).optional(),
  package_category: z.string().max(50).optional().or(z.literal("")),
  fragile: z.boolean().optional(),

  // Delivery options
  require_pin: z.boolean().optional(),
  scheduled_time: z.iso.datetime({ offset: true }).optional().nullable(),
}).superRefine((delivery, context) => {
  if (delivery.require_pin && !delivery.recipient_email) {
    context.addIssue({
      code: "custom",
      path: ["recipient_email"],
      message: "Recipient email is required when delivery PIN is enabled",
    });
  }
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
