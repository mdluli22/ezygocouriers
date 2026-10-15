import { signupSchema } from "@ezygo/contracts";
export interface SignupForm { full_name: string; email: string; phone: string; password: string; confirm_password: string }
export function signupStageErrors(form: SignupForm, step: 1 | 2): Record<string, string> {
  const result = signupSchema.safeParse(form);
  if (result.success) return {};
  const fields = step === 1 ? ["full_name", "email", "phone"] : ["password", "confirm_password"];
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    if (fields.includes(key) && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
