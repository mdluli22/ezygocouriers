import { z } from "zod";
import { positiveIntegerSchema } from "./common";

export const createPaymentSchema = z.object({
  delivery_id: positiveIntegerSchema,
  payment_method: z.literal("paystack"),
});

export const sandboxConfirmationSchema = z.object({
  delivery_id: positiveIntegerSchema,
  payment_id: positiveIntegerSchema,
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type SandboxConfirmationInput = z.infer<
  typeof sandboxConfirmationSchema
>;
