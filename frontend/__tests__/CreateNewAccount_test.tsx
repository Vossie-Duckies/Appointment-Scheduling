// Unit tests for the sign-up and log-in rules used by CreateNewAccount and LoginPage.
// Run once with:  npx jest
// (This file used to be empty, which makes Jest fail with
//  "Your test suite must contain at least one test".)
import {
  STAFF_ROLE_MESSAGE,
  isRealIsoDate,
  toLocalIsoDate,
  validateLogin,
  validateRegistration,
} from "../src/shared/validation";

const TODAY = new Date(2026, 9, 30); // 30 Oct 2026

const valid = {
  firstName: "Lerato",
  lastName: "Dlamini",
  email: "lerato@example.com",
  password: "Secret123!",
  role: "PATIENT",
  dateOfBirth: "2000-05-15",
  gender: "Female",
};

const check = (overrides: Partial<typeof valid>) => validateRegistration({ ...valid, ...overrides }, TODAY);

describe("validateRegistration", () => {
  it("accepts a complete, valid form", () => {
    expect(check({})).toBeNull();
  });

  it("rejects a blank form", () => {
    expect(
      validateRegistration(
        { firstName: "", lastName: "", email: "", password: "", role: "", dateOfBirth: "", gender: "" },
        TODAY
      )
    ).toMatch(/fill in every field/);
  });

  it("treats spaces-only as blank", () => {
    expect(check({ firstName: "   " })).toMatch(/fill in every field/);
  });

  it.each(["lerato", "lerato@", "lerato@example", "le rato@example.com", "@example.com"])(
    "rejects the invalid email %s",
    (email) => {
      expect(check({ email })).toMatch(/valid email/);
    }
  );

  it("needs at least 8 password characters", () => {
    expect(check({ password: "1234567" })).toMatch(/at least 8/);
    expect(check({ password: "12345678" })).toBeNull();
  });

  it("explains that doctor accounts come from the administrator", () => {
    expect(check({ role: "DOCTOR" })).toBe(STAFF_ROLE_MESSAGE);
  });

  it.each(["05/15/2000", "15-05-2000", "2000/05/15", "2000-5-15"])(
    "rejects the date of birth %s with a YYYY-MM-DD hint",
    (dateOfBirth) => {
      expect(check({ dateOfBirth })).toMatch(/YYYY-MM-DD/);
    }
  );

  it("rejects impossible, future and ancient dates of birth", () => {
    expect(check({ dateOfBirth: "2001-02-30" })).toMatch(/does not exist/);
    expect(check({ dateOfBirth: "2030-01-01" })).toMatch(/future/);
    expect(check({ dateOfBirth: "1850-01-01" })).toMatch(/real date/);
  });

  it("allows names with spaces, accents and apostrophes", () => {
    expect(check({ firstName: "Mary Ann", lastName: "van der Merwe" })).toBeNull();
    expect(check({ firstName: "Zoë-Ann", lastName: "O'Neil" })).toBeNull();
  });

  it("limits names to 50 characters", () => {
    expect(check({ firstName: "A".repeat(51) })).toMatch(/50 characters/);
  });
});

describe("validateLogin", () => {
  it("needs both fields", () => {
    expect(validateLogin("", "")).toMatch(/email and password/);
    expect(validateLogin("lerato@example.com", "")).toMatch(/email and password/);
  });

  it("checks the email format", () => {
    expect(validateLogin("lerato", "Secret123!")).toMatch(/valid email/);
    expect(validateLogin(" lerato@example.com ", "Secret123!")).toBeNull();
  });
});

describe("date helpers", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("knows which dates are real", () => {
    expect(isRealIsoDate("2024-02-29")).toBe(true);
    expect(isRealIsoDate("2023-02-29")).toBe(false);
    expect(isRealIsoDate("2024-13-01")).toBe(false);
  });
});
