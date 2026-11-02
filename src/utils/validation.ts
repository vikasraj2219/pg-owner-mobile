import axios from 'axios';

/**
 * Validates standard email address format (RFC 5322 compatible)
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { isValid: true };
}

/**
 * Normalizes Indian phone number by removing country code, spaces, hyphens, and leading zeros
 */
export function normalizePhone(phone: string): string {
  // Strip all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading +91 or 91 if 12 digits
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  // Remove leading 0 if 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Validates Indian 10-digit mobile number starting with 6-9
 */
export function validatePhone(phone: string): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  const normalized = normalizePhone(trimmed);

  if (normalized.length !== 10) {
    return {
      isValid: false,
      normalized,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Mobile number must start with 6, 7, 8, or 9.',
    };
  }

  return { isValid: true, normalized };
}

/**
 * Validates an identifier that could be either a phone number or an email
 */
export function validateIdentifier(identifier: string): {
  isValid: boolean;
  type: 'email' | 'phone' | 'invalid';
  normalized: string;
  error?: string;
} {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return {
      isValid: false,
      type: 'invalid',
      normalized: '',
      error: 'Please enter your phone number or email.',
    };
  }

  // Check if identifier contains '@' -> treat as email
  if (trimmed.includes('@')) {
    const emailResult = validateEmail(trimmed);
    if (!emailResult.isValid) {
      return {
        isValid: false,
        type: 'invalid',
        normalized: trimmed,
        error: emailResult.error,
      };
    }
    return {
      isValid: true,
      type: 'email',
      normalized: trimmed.toLowerCase(),
    };
  }

  // Check if identifier contains digits or starts with '+' -> treat as phone
  const hasDigits = /\d/.test(trimmed);
  if (hasDigits) {
    const phoneResult = validatePhone(trimmed);
    if (!phoneResult.isValid) {
      return {
        isValid: false,
        type: 'invalid',
        normalized: phoneResult.normalized,
        error: phoneResult.error,
      };
    }
    return {
      isValid: true,
      type: 'phone',
      normalized: phoneResult.normalized,
    };
  }

  // Purely invalid text (e.g., "randomText", "asdfgh")
  return {
    isValid: false,
    type: 'invalid',
    normalized: trimmed,
    error: 'Please enter a valid 10-digit mobile number or email address.',
  };
}

/**
 * Validates password length and presence
 */
export function validatePassword(
  password: string,
  minLength = 6,
): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates a text name or title
 */
export function validateName(
  name: string,
  fieldLabel = 'Name',
  minLength = 2,
): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: `${fieldLabel} is required.` };
  }
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldLabel} must be at least ${minLength} characters.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates standard UPI VPA (e.g. name@okhdfcbank, 9876543210@paytm)
 */
export function validateUpiId(upiId: string): { isValid: boolean; error?: string } {
  const trimmed = upiId.trim();
  if (!trimmed) {
    return { isValid: false, error: 'UPI ID is required for rent collection.' };
  }
  // Standard UPI format: prefix (2-256 chars) @ provider (2-64 chars)
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  if (!upiRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid UPI ID (e.g. owner@upi or 9876543210@paytm).',
    };
  }
  return { isValid: true };
}

/**
 * Validates standard 6-digit Indian Postal PIN code
 */
export function validatePincode(pincode: string): { isValid: boolean; error?: string } {
  const trimmed = pincode.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Pincode is required.' };
  }
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid 6-digit Indian PIN code.' };
  }
  return { isValid: true };
}

/**
 * Validates a positive number field
 */
export function validatePositiveNumber(
  value: string | number,
  fieldLabel: string,
  min = 1,
): { isValid: boolean; value: number; error?: string } {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) {
    return { isValid: false, value: 0, error: `Please enter a valid number for ${fieldLabel}.` };
  }
  if (num < min) {
    return { isValid: false, value: num, error: `${fieldLabel} must be at least ${min}.` };
  }
  return { isValid: true, value: num };
}

/**
 * Extracts a user-friendly error message from Axios or API errors
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // 1. Response data message from backend
    const responseData = error.response?.data as
      { message?: string; error?: string; errors?: Array<{ message?: string }> } | undefined;

    if (responseData?.message && typeof responseData.message === 'string') {
      const msg = responseData.message;
      if (
        msg.toLowerCase().includes('duplicate key') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('e11000')
      ) {
        return 'A room or resource with this unique identifier already exists. Please choose a different number (e.g. 102, 103, 201).';
      }
      return msg;
    }
    if (responseData?.error && typeof responseData.error === 'string') {
      return responseData.error;
    }
    if (Array.isArray(responseData?.errors) && responseData.errors[0]?.message) {
      return responseData.errors[0].message;
    }

    // 2. HTTP Status Code fallbacks
    const status = error.response?.status;
    if (status === 400) {
      return 'Invalid request details. Please check all fields and try again.';
    }
    if (status === 401) {
      return 'Invalid phone/email or password. Please check your credentials.';
    }
    if (status === 403) {
      return 'Access denied. You do not have permission for this action.';
    }
    if (status === 404) {
      return 'Account or resource not found. Please verify your details.';
    }
    if (status === 409) {
      return 'An account with this phone or email already exists.';
    }
    if (status === 422) {
      return 'Validation failed. Please verify your input data.';
    }
    if (status === 429) {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    if (status && status >= 500) {
      return 'The server encountered an error. Please try again in a few moments.';
    }

    // 3. Network or Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Request timed out. The server may be starting up, please try again.';
    }
    if (!error.response || error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Please check your internet connection.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
