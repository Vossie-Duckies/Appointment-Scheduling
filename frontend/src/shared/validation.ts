// Form validation used by the Create New Account and Log In screens.
// The rules mirror backend/accounts/validators.py so users get the same
// message on the phone that the server would give.
//
// This folder sits outside src/app on purpose: Expo Router treats every
// file inside src/app as a screen.

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;
const MAX_AGE_YEARS = 120;

export const STAFF_ROLE_MESSAGE =
  "Doctor accounts are created by the clinic administrator. Please log in with the details you were given.";

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  dateOfBirth: string;
  gender: string;
}

// "2026-10-30" for the given day, in the phone's local time zone.
export function toLocalIsoDate(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

// True only for a real calendar date written as YYYY-MM-DD (so 2001-02-30 is false).
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

// Returns the first problem as a message for the user, or null when the form is valid.
export function validateRegistration(input: RegistrationInput, today: Date = new Date()): string | null {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const dateOfBirth = input.dateOfBirth.trim();

  if (!firstName || !lastName || !email || !input.password || !input.role || !dateOfBirth || !input.gender) {
    return "Please fill in every field before signing up.";
  }
  if (firstName.length > NAME_MAX_LENGTH || lastName.length > NAME_MAX_LENGTH) {
    return `Names must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 100) {
    return "Enter a valid email address, e.g. name@example.com.";
  }
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (input.role.toUpperCase() !== "PATIENT") {
    return STAFF_ROLE_MESSAGE;
  }
  if (!ISO_DATE_PATTERN.test(dateOfBirth)) {
    return "Enter your date of birth as YYYY-MM-DD, e.g. 2000-05-15.";
  }
  if (!isRealIsoDate(dateOfBirth)) {
    return "That date of birth does not exist. Use YYYY-MM-DD.";
  }
  if (dateOfBirth > toLocalIsoDate(today)) {
    return "Date of birth cannot be in the future.";
  }
  if (today.getFullYear() - Number(dateOfBirth.slice(0, 4)) > MAX_AGE_YEARS) {
    return "Enter a real date of birth.";
  }
  return null;
}

export function validateLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) {
    return "Please enter your email and password.";
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address, e.g. name@example.com.";
  }
  return null;
}
