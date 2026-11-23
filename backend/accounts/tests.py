"""
Automated tests for registration, login and doctor creation.

Run with:  python manage.py test accounts
"""
from datetime import date
from unittest import TestCase as PlainTestCase

from django.test import tag
from rest_framework.test import APITestCase

from accounts.models import Doctor, Patient, User
from accounts.validators import STAFF_ROLE_MESSAGE, validate_registration

REGISTER_URL = "/account/register/"
LOGIN_URL = "/account/login/"
CREATE_DOCTOR_URL = "/account/admin/doctors/"


def registration(**overrides):
    data = {
        "first_name": "Lerato",
        "last_name": "Dlamini",
        "email": "lerato@example.com",
        "password": "Secret123!",
        "role": "PATIENT",
        "date_of_birth": "2000-05-15",
        "gender": "Female",
    }
    data.update(overrides)
    return data


@tag("unit")
class RegistrationRulesTests(PlainTestCase):
    """The validation rules on their own (no database)."""

    today = date(2026, 10, 30)

    def errors_for(self, **overrides):
        return validate_registration(registration(**overrides), today=self.today)[1]

    def test_valid_payload_has_no_errors(self):
        cleaned, errors = validate_registration(registration(), today=self.today)
        self.assertEqual(errors, {})
        self.assertEqual(cleaned["date_of_birth"], date(2000, 5, 15))

    def test_every_blank_field_is_reported(self):
        errors = validate_registration({}, today=self.today)[1]
        for field in ("first_name", "last_name", "email", "password", "date_of_birth", "gender"):
            self.assertIn(field, errors)

    def test_whitespace_only_counts_as_blank(self):
        self.assertIn("first_name", self.errors_for(first_name="   "))

    def test_invalid_emails(self):
        for bad in ("lerato", "lerato@", "lerato@example", "le rato@example.com", "@example.com"):
            with self.subTest(email=bad):
                self.assertIn("email", self.errors_for(email=bad))

    def test_short_password(self):
        self.assertIn("password", self.errors_for(password="1234567"))
        self.assertNotIn("password", self.errors_for(password="12345678"))

    def test_date_of_birth_formats(self):
        for bad in ("05/15/2000", "15-05-2000", "2000/05/15", "20000515", "2000-5-15"):
            with self.subTest(dob=bad):
                self.assertIn("date_of_birth", self.errors_for(date_of_birth=bad))

    def test_impossible_future_and_ancient_dates(self):
        self.assertIn("date_of_birth", self.errors_for(date_of_birth="2001-02-30"))
        self.assertIn("date_of_birth", self.errors_for(date_of_birth="2030-01-01"))
        self.assertIn("date_of_birth", self.errors_for(date_of_birth="1850-01-01"))

    @tag("security")
    def test_only_patients_can_self_register(self):
        self.assertEqual(self.errors_for(role="DOCTOR")["role"], STAFF_ROLE_MESSAGE)
        self.assertIn("role", self.errors_for(role="ADMIN"))
        self.assertNotIn("role", self.errors_for(role="patient"))

    def test_names_with_spaces_and_length_limit(self):
        self.assertEqual(self.errors_for(first_name="Mary Ann", last_name="van der Merwe"), {})
        self.assertIn("first_name", self.errors_for(first_name="A" * 51))


@tag("api")
class RegisterEndpointTests(APITestCase):

    def post(self, data):
        return self.client.post(REGISTER_URL, data, format="json")

    def test_valid_patient_registration(self):
        response = self.post(registration())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "PATIENT")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        user = User.objects.get(email="lerato@example.com")
        self.assertTrue(user.check_password("Secret123!"))
        self.assertTrue(Patient.objects.filter(user=user, gender="Female").exists())

    @tag("security")
    def test_blank_form_returns_400_not_500(self):
        response = self.post({})
        self.assertEqual(response.status_code, 400)
        self.assertIn("message", response.data)
        self.assertEqual(User.objects.count(), 0)

    def test_one_missing_field(self):
        data = registration()
        del data["gender"]
        response = self.post(data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("gender", response.data["errors"])

    def test_invalid_email_is_rejected(self):
        response = self.post(registration(email="lerato.example.com"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data["errors"])

    def test_duplicate_email_any_case_is_rejected(self):
        self.assertEqual(self.post(registration()).status_code, 201)
        response = self.post(registration(email="LERATO@example.com"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("already exists", response.data["message"])
        self.assertEqual(User.objects.count(), 1)

    def test_date_of_birth_in_hint_format_is_rejected_cleanly(self):
        response = self.post(registration(date_of_birth="05/15/2000"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("YYYY-MM-DD", response.data["message"])
        self.assertEqual(User.objects.count(), 0)

    def test_short_password_is_rejected(self):
        response = self.post(registration(password="abc"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data["errors"])

    @tag("security")
    def test_cannot_self_register_as_doctor_or_admin(self):
        for role in ("DOCTOR", "ADMIN"):
            with self.subTest(role=role):
                response = self.post(registration(role=role, email=f"{role.lower()}@example.com"))
                self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exclude(role="PATIENT").exists())

    def test_names_with_spaces_are_kept(self):
        response = self.post(registration(first_name="Mary Ann", last_name="van der Merwe"))
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="lerato@example.com")
        self.assertEqual((user.first_name, user.last_name), ("Mary Ann", "van der Merwe"))

    def test_special_characters_in_names(self):
        response = self.post(registration(first_name="Zoë-Ann", last_name="O'Neil"))
        self.assertEqual(response.status_code, 201)


@tag("api")
class LoginEndpointTests(APITestCase):

    def setUp(self):
        self.client.post(REGISTER_URL, registration(), format="json")

    def login(self, email, password):
        return self.client.post(LOGIN_URL, {"email": email, "password": password}, format="json")

    def test_valid_login_returns_tokens_and_role(self):
        response = self.login("lerato@example.com", "Secret123!")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "PATIENT")
        self.assertIn("access", response.data)

    def test_email_is_case_insensitive(self):
        self.assertEqual(self.login("Lerato@Example.com", "Secret123!").status_code, 200)

    @tag("security")
    def test_wrong_password(self):
        response = self.login("lerato@example.com", "wrong-password")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["message"], "Invalid email or password")

    @tag("security")
    def test_unknown_email(self):
        self.assertEqual(self.login("nobody@example.com", "Secret123!").status_code, 401)

    @tag("security")
    def test_blank_fields_return_400_not_500(self):
        response = self.client.post(LOGIN_URL, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("message", response.data)


@tag("api")
class CreateDoctorTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="Admin123!",
            first_name="Ayanda", last_name="Admin", role="ADMIN",
        )
        self.patient = User.objects.create_user(
            email="p@example.com", password="Patient123!",
            first_name="Pat", last_name="Ient", role="PATIENT",
        )
        self.payload = {
            "first_name": "Jane", "last_name": "Smith", "email": "jane@example.com",
            "password": "Doctor123!", "license_no": "DOC-2001",
        }

    def test_admin_can_create_doctor(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(CREATE_DOCTOR_URL, self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Doctor.objects.filter(user__email="jane@example.com").exists())

    @tag("security")
    def test_patient_cannot_create_doctor(self):
        self.client.force_authenticate(self.patient)
        response = self.client.post(CREATE_DOCTOR_URL, self.payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_missing_fields(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(CREATE_DOCTOR_URL, {"first_name": "Jane"}, format="json")
        self.assertEqual(response.status_code, 400)
