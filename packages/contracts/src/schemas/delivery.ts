import { z } from "zod";
import { DELIVERY_STATUSES, isInCapeTownServiceArea } from "../constants";
import { southAfricanPhoneSchema } from "./common";

export const addressSchema = z
  .object({
    formatted_address: z
      .string()
      .min(5, "Please select a valid address")
      .max(500),
    street_address: z.string().max(255).optional().or(z.literal("")),
    suburb: z.string().max(100).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
    province: z.string().max(100).optional().or(z.literal("")),
    postal_code: z.string().max(20).optional().or(z.literal("")),
    country: z.string().max(100).optional().or(z.literal("")),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    building_or_business: z.string().max(255).optional().or(z.literal("")),
    apt_suite: z.string().max(100).optional().or(z.literal("")),
    meeting_option: z
      .enum(["meet_at_curb", "meet_at_door", "leave_at_door"])
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((address, context) => {
    if (!isInCapeTownServiceArea(address)) {
      context.addIssue({
        code: "custom",
        path: ["formatted_address"],
        message: "This address is outside our Cape Town delivery area",
      });
    }
  });

export const createDeliverySchema = z
  .object({
    pickup_address: addressSchema,
    pickup_contact_name: z
      .string()
      .min(2, "Pickup contact name is required")
      .max(255),
    pickup_contact_phone: southAfricanPhoneSchema,
    dropoff_address: addressSchema,
    recipient_name: z
      .string()
      .min(2, "Recipient name is required")
      .max(255),
    recipient_phone: southAfricanPhoneSchema,
    recipient_email: z
      .string()
      .email("Please enter a valid recipient email")
      .max(320)
      .optional()
      .or(z.literal("")),
    parcel_description: z
      .string()
      .min(3, "Please describe the parcel")
      .max(1000),
    special_instructions: z.string().max(500).optional().or(z.literal("")),
    package_type: z.enum(["small", "medium", "large"]).optional(),
    package_category: z.string().max(50).optional().or(z.literal("")),
    fragile: z.boolean().optional(),
    require_pin: z.boolean().optional(),
    scheduled_time: z.iso.datetime({ offset: true }).optional().nullable(),
  })
  .superRefine((delivery, context) => {
    if (delivery.require_pin && !delivery.recipient_email) {
      context.addIssue({
        code: "custom",
        path: ["recipient_email"],
        message: "Recipient email is required when delivery PIN is enabled",
      });
    }
  });

export const createDeliveryRequestSchema = z.intersection(
  createDeliverySchema,
  z.object({ payment_method: z.literal("paystack") })
);

export const deliveryIdParamSchema = z.coerce.number().int().positive();

export const customerDeliveryActionSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

export const driverLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const driverStatusUpdateSchema = z.object({
  delivery_id: z.number().int().positive(),
  status: z.enum(DELIVERY_STATUSES),
  note: z.string().trim().max(500).optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/, "Enter the six-digit delivery PIN.")
    .optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type CreateDeliveryRequest = z.infer<
  typeof createDeliveryRequestSchema
>;
export type CustomerDeliveryActionInput = z.infer<
  typeof customerDeliveryActionSchema
>;
export type DriverLocationInput = z.infer<typeof driverLocationSchema>;
export type DriverStatusUpdateInput = z.infer<
  typeof driverStatusUpdateSchema
>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<
  typeof deletePushSubscriptionSchema
>;
