"""
Tests for the optional reason a patient can type when booking
(POST /api/appointments/book/). Blank means "General Consultation";
200 characters at most.

Run with:  python manage.py test appointments
"""
from django.test import tag

from appointment_backend.models import Notification
from appointments.models import Appointment, Doctor_slot
from appointments.tests import DOCTOR_LIST_URL, MY_URL, TOMORROW, AppointmentTestCase


@tag("api")
class BookingReasonTests(AppointmentTestCase):

    @tag("integration")
    def test_typed_reason_is_saved_and_reaches_the_doctor(self):
        response = self.book(self.slot(TOMORROW, "09:00"), reason="  Sore throat for three days  ")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reason"], "Sore throat for three days")  # trimmed
        self.login(self.doctor_user)
        self.assertEqual(self.client.get(DOCTOR_LIST_URL).data[0]["reason"], "Sore throat for three days")
        alert = Notification.objects.get(user=self.doctor_user)
        self.assertTrue(alert.message.endswith("Reason: Sore throat for three days"), alert.message)

    def test_blank_reason_becomes_general_consultation(self):
        for i, reason in enumerate(["", "   ", None]):
            with self.subTest(reason=reason):
                response = self.book(self.slot(TOMORROW, f"1{i}:00"), reason=reason)
                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(response.data["reason"], "General Consultation")

    def test_reason_can_be_left_out(self):
        slot = self.slot(TOMORROW, "09:00")
        self.login(self.patient_user)
        response = self.client.post("/api/appointments/book/", {"slot_id": slot.slot_id}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reason"], "General Consultation")

    def test_200_characters_is_the_limit(self):
        response = self.book(self.slot(TOMORROW, "09:00"), reason="a" * 200)
        self.assertEqual(response.status_code, 201, response.data)
        self.login(self.patient_user)
        self.assertEqual(len(self.client.get(MY_URL).data[0]["reason"]), 200)
        # Spaces around it don't count.
        response = self.book(self.slot(TOMORROW, "10:00"), reason="   " + "b" * 200 + "   ")
        self.assertEqual(response.status_code, 201, response.data)

    @tag("security")
    def test_longer_reason_is_refused_and_nothing_is_booked(self):
        slot = self.slot(TOMORROW, "09:00")
        response = self.book(slot, reason="a" * 201)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["message"], "Keep the reason to 200 characters or fewer.")
        self.assertFalse(Appointment.objects.exists())
        self.assertEqual(Doctor_slot.objects.get(slot_id=slot.slot_id).status, "AVAILABLE")
        self.assertFalse(Notification.objects.exists())  # the doctor isn't told about a booking that failed
