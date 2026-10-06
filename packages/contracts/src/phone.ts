import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

export type PhoneCountry = CountryCode;
export const phoneCountries = getCountries();
export { getCountryCallingCode };

/** Accept national or international input, but never extract a number from prose. */
export function normalizeSignupPhone(value: string, country: CountryCode = "ZA"): string | null {
  if (!value.trim() || !/^[+\d\s().-]+$/.test(value)) return null;
  const phone = parsePhoneNumberFromString(value.trim(), { defaultCountry: country, extract: false });
  return phone?.isValid() ? phone.number : null;
}
