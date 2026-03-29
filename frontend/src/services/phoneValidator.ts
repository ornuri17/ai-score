import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export function validatePhone(phone: string): {
  valid: boolean;
  error?: string;
  formatted?: string;
} {
  try {
    if (!phone.trim()) {
      return { valid: false, error: 'Phone number is required' };
    }

    const numberToTest = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    if (!isValidPhoneNumber(numberToTest)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    const parsed = parsePhoneNumber(numberToTest);
    return {
      valid: true,
      formatted: parsed?.formatInternational(),
    };
  } catch {
    return { valid: false, error: 'Invalid phone number' };
  }
}
