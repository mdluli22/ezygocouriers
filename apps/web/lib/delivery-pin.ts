import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const DELIVERY_PIN_LENGTH = 6;
const DELIVERY_PIN_ROUNDS = 12;

export function generateDeliveryPin(): string {
  const minimum = 10 ** (DELIVERY_PIN_LENGTH - 1);
  return String(crypto.randomInt(minimum, 10 ** DELIVERY_PIN_LENGTH));
}

export function isDeliveryPinFormat(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function hashDeliveryPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, DELIVERY_PIN_ROUNDS);
}

export function verifyDeliveryPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
