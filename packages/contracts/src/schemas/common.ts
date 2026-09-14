import { z } from "zod";

export const positiveIntegerSchema = z.number().int().positive();

export const requiredTextSchema = (max: number) =>
  z.string().trim().min(1).max(max);

export const southAfricanPhoneSchema = z
  .string()
  .regex(
    /^(\+27|0)[6-8][0-9]{8}$/,
    "Please enter a valid South African phone number"
  );

export const trimmedSouthAfricanPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+27|0)[6-8][0-9]{8}$/,
    "Please enter a valid South African phone number"
  );
