"""
Input validation for public account registration.

Kept free of Django imports on purpose so the rules can be unit-tested on
their own (see accounts/tests.py) and mirrored exactly in the mobile app
(frontend/src/shared/validation.ts).
"""
import re
from datetime import date

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

NAME_MAX_LENGTH = 50      # matches User.first_name / last_name
EMAIL_MAX_LENGTH = 100    # matches User.email
GENDER_MAX_LENGTH = 20    # matches Patient.gender
PASSWORD_MIN_LENGTH = 8
MAX_AGE_YEARS = 120

STAFF_ROLE_MESSAGE = (
    "Doctor and admin accounts are created by the clinic administrator. "
    "Please log in with the details you were given."
)


def _text(data, field):
    value = data.get(field)
    return value.strip() if isinstance(value, str) else ""


def validate_registration(data, today=None):
    """
    Validate a registration payload.

    Returns (cleaned, errors). `errors` maps field name -> message and is
    empty when the payload is valid. `cleaned` holds stripped values and a
    real `date` for date_of_birth.
    """
    today = today or date.today()
    errors = {}

    first_name = _text(data, "first_name")
    last_name = _text(data, "last_name")
    email = _text(data, "email")
    raw_password = data.get("password")
    password = raw_password if isinstance(raw_password, str) else ""
    role = _text(data, "role").upper() or "PATIENT"
    dob_text = _text(data, "date_of_birth")
    gender = _text(data, "gender")

    for field, value, label in (
        ("first_name", first_name, "First name"),
        ("last_name", last_name, "Last name"),
    ):
        if not value:
            errors[field] = f"{label} is required."
        elif len(value) > NAME_MAX_LENGTH:
            errors[field] = f"{label} must be {NAME_MAX_LENGTH} characters or fewer."

    if not email:
        errors["email"] = "Email is required."
    elif len(email) > EMAIL_MAX_LENGTH or not EMAIL_PATTERN.match(email):
        errors["email"] = "Enter a valid email address, e.g. name@example.com."

    if not password:
        errors["password"] = "Password is required."
    elif len(password) < PASSWORD_MIN_LENGTH:
        errors["password"] = f"Password must be at least {PASSWORD_MIN_LENGTH} characters."

    if role != "PATIENT":
        errors["role"] = STAFF_ROLE_MESSAGE

    date_of_birth = None
    if not dob_text:
        errors["date_of_birth"] = "Date of birth is required."
    elif not ISO_DATE_PATTERN.match(dob_text):
        errors["date_of_birth"] = "Enter your date of birth as YYYY-MM-DD, e.g. 2000-05-15."
    else:
        try:
            date_of_birth = date.fromisoformat(dob_text)
        except ValueError:
            errors["date_of_birth"] = "That date does not exist. Use YYYY-MM-DD."
        else:
            if date_of_birth > today:
                errors["date_of_birth"] = "Date of birth cannot be in the future."
            elif today.year - date_of_birth.year > MAX_AGE_YEARS:
                errors["date_of_birth"] = "Enter a real date of birth."

    if not gender:
        errors["gender"] = "Gender is required."
    elif len(gender) > GENDER_MAX_LENGTH:
        errors["gender"] = f"Gender must be {GENDER_MAX_LENGTH} characters or fewer."

    cleaned = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password,
        "role": role,
        "date_of_birth": date_of_birth,
        "gender": gender,
    }
    return cleaned, errors


def first_error(errors):
    """The first message in an errors dict, for a single on-screen toast."""
    return next(iter(errors.values()), "Please check your details and try again.")
