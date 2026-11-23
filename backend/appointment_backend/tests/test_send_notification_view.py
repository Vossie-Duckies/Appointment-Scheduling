"""
Tests for POST /api/notifications/ (it returned HTTP 500 for every request
before the fix).

Run with:  python manage.py test appointment_backend
"""
from datetime import date, time

from django.test import tag
from rest_framework.test import APITestCase

from accounts.models import Doctor, Patient, User
from appointment_backend.models import Notification
from appointments.models import Appointment, Doctor_slot

URL = "/api/notifications/"


@tag("api")
class SendNotificationViewTests(APITestCase):

    def setUp(self):
        def user(email, role):
            return User.objects.create_user(
                email=email, password="Secret123!", first_name="Test", last_name=role.title(), role=role
            )

        self.patient_user = user("pat@example.com", "PATIENT")
        patient = Patient.objects.create(user=self.patient_user, date_of_birth=date(2000, 1, 1), gender="Female")
        self.doctor_user = user("doc@example.com", "DOCTOR")
        doctor = Doctor.objects.create(user=self.doctor_user, license_no="DOC-9")
        self.outsider = user("out@example.com", "PATIENT")

        slot = Doctor_slot.objects.create(
            doctor=doctor, slot_date=date(2030, 1, 11), start_time=time(9, 0), end_time=time(9, 30), status="BOOKED"
        )
        self.appointment = Appointment.objects.create(patient=patient, slot=slot, reason="Check-up")

    def send(self, user, **body):
        if user is not None:
            self.client.force_authenticate(user)
        return self.client.post(URL, body, format="json")

    def test_in_app_notification_is_saved(self):
        response = self.send(
            self.doctor_user, type="IN_APP", appointment_id=self.appointment.appointment_id,
            message="Running 15 minutes late",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Notification.objects.filter(
            appointment=self.appointment, message="Running 15 minutes late", type="in_app"
        ).exists())

    @tag("security")
    def test_requires_login(self):
        response = self.send(None, type="IN_APP", appointment_id=self.appointment.appointment_id, message="Hi")
        self.assertIn(response.status_code, (401, 403))

    @tag("security")
    def test_bad_input(self):
        cases = [
            ({"type": "PIGEON", "appointment_id": self.appointment.appointment_id, "message": "Hi"}, 400),
            ({"type": "IN_APP", "appointment_id": self.appointment.appointment_id, "message": "  "}, 400),
            ({"type": "IN_APP", "appointment_id": 99999, "message": "Hi"}, 404),
            ({"type": "IN_APP", "message": "Hi"}, 404),
        ]
        for body, expected in cases:
            with self.subTest(body=body):
                self.assertEqual(self.send(self.patient_user, **body).status_code, expected)

    @tag("security")
    def test_outsider_is_forbidden(self):
        response = self.send(
            self.outsider, type="IN_APP", appointment_id=self.appointment.appointment_id, message="Hi"
        )
        self.assertEqual(response.status_code, 403)
