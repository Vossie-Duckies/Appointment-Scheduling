"""
Automated tests for slots, booking, cancelling and the doctor actions.

Run with:  python manage.py test appointments

The clock is frozen at 2030-01-10 12:00 (local time) so "past", "today" and
"future" slots behave the same whenever the tests run.
"""
from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.test import tag
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Doctor, Patient, User
from appointments.models import Appointment, Doctor_slot

TODAY = date(2030, 1, 10)
YESTERDAY = TODAY - timedelta(days=1)
TOMORROW = TODAY + timedelta(days=1)
IN_TWO_DAYS = TODAY + timedelta(days=2)

SLOTS_URL = "/api/appointments/slots/"
BOOK_URL = "/api/appointments/book/"
MY_URL = "/api/appointments/my/"
DOCTOR_LIST_URL = "/api/appointments/doctor/appointments/"
DOCTOR_SLOTS_URL = "/api/appointments/doctor/slots/"


def cancel_url(appointment_id):
    return f"/api/appointments/{appointment_id}/cancel/"


def doctor_action_url(appointment_id, action):
    return f"/api/appointments/doctor/appointments/{appointment_id}/{action}/"


class AppointmentTestCase(APITestCase):

    def setUp(self):
        frozen = timezone.make_aware(datetime(2030, 1, 10, 12, 0))
        patcher = patch("django.utils.timezone.now", return_value=frozen)
        patcher.start()
        self.addCleanup(patcher.stop)

        self.doctor_user = self.make_user("doc@example.com", "Thabo", "Mokoena", "DOCTOR")
        self.doctor = Doctor.objects.create(user=self.doctor_user, license_no="DOC-1")
        self.other_doctor_user = self.make_user("doc2@example.com", "Sarah", "Naidoo", "DOCTOR")
        self.other_doctor = Doctor.objects.create(user=self.other_doctor_user, license_no="DOC-2")

        self.patient_user = self.make_user("pat@example.com", "Lerato", "Dlamini", "PATIENT")
        self.patient = Patient.objects.create(
            user=self.patient_user, date_of_birth=date(2000, 5, 15), gender="Female"
        )
        self.other_patient_user = self.make_user("pat2@example.com", "Sipho", "Khumalo", "PATIENT")
        self.other_patient = Patient.objects.create(
            user=self.other_patient_user, date_of_birth=date(1995, 1, 1), gender="Male"
        )

    # ---- helpers -------------------------------------------------------
    def make_user(self, email, first, last, role):
        return User.objects.create_user(
            email=email, password="Secret123!", first_name=first, last_name=last, role=role
        )

    def slot(self, day, start, minutes=30, doctor=None, status="AVAILABLE"):
        start_time = time.fromisoformat(start)
        end_time = (datetime.combine(day, start_time) + timedelta(minutes=minutes)).time()
        return Doctor_slot.objects.create(
            doctor=doctor or self.doctor,
            slot_date=day,
            start_time=start_time,
            end_time=end_time,
            status=status,
        )

    def login(self, user):
        self.client.force_authenticate(user)

    def book(self, slot, user=None, reason="Headache"):
        self.login(user or self.patient_user)
        return self.client.post(BOOK_URL, {"slot_id": slot.slot_id, "reason": reason}, format="json")

    def booked_appointment(self, day=TOMORROW, start="09:00"):
        slot = self.slot(day, start)
        response = self.book(slot)
        self.assertEqual(response.status_code, 201)
        return Appointment.objects.get(appointment_id=response.data["appointment_id"])


@tag("api")
class AvailableSlotsTests(AppointmentTestCase):

    @tag("security")
    def test_requires_login(self):
        response = self.client.get(SLOTS_URL)
        self.assertIn(response.status_code, (401, 403))

    def test_only_future_available_slots_are_listed(self):
        started_today = self.slot(TODAY, "09:00")
        later_today = self.slot(TODAY, "15:00")
        self.slot(YESTERDAY, "10:00")
        tomorrow = self.slot(TOMORROW, "09:00")
        self.slot(TOMORROW, "10:00", status="BOOKED")
        self.slot(TOMORROW, "11:00", status="BLOCKED")

        self.login(self.patient_user)
        response = self.client.get(SLOTS_URL)

        self.assertEqual(response.status_code, 200)
        ids = [row["slot_id"] for row in response.data]
        self.assertEqual(ids, [later_today.slot_id, tomorrow.slot_id])
        self.assertNotIn(started_today.slot_id, ids)
        self.assertEqual(response.data[0]["doctor__user__first_name"], "Thabo")


@tag("api")
class BookingTests(AppointmentTestCase):

    @tag("integration")
    def test_patient_can_book_and_slot_becomes_booked(self):
        slot = self.slot(TOMORROW, "09:00")
        response = self.book(slot, reason="Headache")
        self.assertEqual(response.status_code, 201)
        slot.refresh_from_db()
        self.assertEqual(slot.status, "BOOKED")
        appointment = Appointment.objects.get(slot=slot)
        self.assertEqual((appointment.patient, appointment.reason, appointment.status),
                         (self.patient, "Headache", "BOOKED"))

    def test_reason_is_optional(self):
        slot = self.slot(TOMORROW, "09:00")
        self.login(self.patient_user)
        response = self.client.post(BOOK_URL, {"slot_id": slot.slot_id}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["reason"], "General Consultation")

    @tag("security")
    def test_slot_taken_by_someone_else(self):
        slot = self.slot(TOMORROW, "09:00")
        self.assertEqual(self.book(slot).status_code, 201)
        response = self.book(slot, user=self.other_patient_user)
        self.assertEqual(response.status_code, 400)

    @tag("security")
    def test_double_tap_books_only_once(self):
        slot = self.slot(TOMORROW, "09:00")
        self.assertEqual(self.book(slot).status_code, 201)
        self.assertEqual(self.book(slot).status_code, 400)
        self.assertEqual(Appointment.objects.count(), 1)

    @tag("security")
    def test_missing_or_invalid_slot_id_returns_400_not_500(self):
        self.login(self.patient_user)
        for body in ({}, {"slot_id": ""}, {"slot_id": "abc"}, {"slot_id": None}):
            with self.subTest(body=body):
                response = self.client.post(BOOK_URL, body, format="json")
                self.assertEqual(response.status_code, 400)

    def test_slot_that_does_not_exist(self):
        self.login(self.patient_user)
        response = self.client.post(BOOK_URL, {"slot_id": 99999}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cannot_book_a_past_slot(self):
        slot = self.slot(YESTERDAY, "10:00")
        self.assertEqual(self.book(slot).status_code, 400)

    @tag("security")
    def test_doctor_cannot_book(self):
        slot = self.slot(TOMORROW, "09:00")
        response = self.book(slot, user=self.doctor_user)
        self.assertEqual(response.status_code, 403)


@tag("api")
class MyAppointmentsTests(AppointmentTestCase):

    def test_lists_own_appointments_with_doctor_details(self):
        self.booked_appointment()
        other_slot = self.slot(TOMORROW, "10:00")
        self.book(other_slot, user=self.other_patient_user)

        self.login(self.patient_user)
        response = self.client.get(MY_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertEqual(item["status"], "BOOKED")
        self.assertEqual(item["slot_details"]["doctor_first_name"], "Thabo")
        self.assertEqual(item["slot_details"]["start_time"], "09:00:00")


@tag("api")
class CancelTests(AppointmentTestCase):

    @tag("integration")
    def test_cancel_frees_the_slot(self):
        appointment = self.booked_appointment()
        response = self.client.post(cancel_url(appointment.appointment_id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "CANCELLED")
        appointment.slot.refresh_from_db()
        self.assertEqual(appointment.slot.status, "AVAILABLE")

    def test_cancel_twice(self):
        appointment = self.booked_appointment()
        self.client.post(cancel_url(appointment.appointment_id))
        self.assertEqual(self.client.post(cancel_url(appointment.appointment_id)).status_code, 400)

    @tag("security")
    def test_cannot_cancel_someone_elses_appointment(self):
        appointment = self.booked_appointment()
        self.login(self.other_patient_user)
        self.assertEqual(self.client.post(cancel_url(appointment.appointment_id)).status_code, 400)

    @tag("integration")
    def test_cancelled_slot_can_be_booked_again(self):
        appointment = self.booked_appointment()
        self.client.post(cancel_url(appointment.appointment_id))
        response = self.book(appointment.slot, user=self.other_patient_user)
        self.assertEqual(response.status_code, 201)


@tag("api")
class DoctorAppointmentsTests(AppointmentTestCase):

    def test_doctor_sees_their_appointments(self):
        self.booked_appointment()
        self.login(self.doctor_user)
        response = self.client.get(DOCTOR_LIST_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["patient_name"], "Lerato Dlamini")

    @tag("security")
    def test_other_doctor_sees_none(self):
        self.booked_appointment()
        self.login(self.other_doctor_user)
        self.assertEqual(self.client.get(DOCTOR_LIST_URL).data, [])

    @tag("security")
    def test_patient_is_forbidden(self):
        self.login(self.patient_user)
        self.assertEqual(self.client.get(DOCTOR_LIST_URL).status_code, 403)

    @tag("security")
    def test_doctor_role_without_profile_gets_403_not_500(self):
        no_profile = self.make_user("noprofile@example.com", "No", "Profile", "DOCTOR")
        self.login(no_profile)
        self.assertEqual(self.client.get(DOCTOR_LIST_URL).status_code, 403)


@tag("api")
class CompleteAndNoShowTests(AppointmentTestCase):

    @tag("integration")
    def test_complete_then_patient_sees_completed(self):
        appointment = self.booked_appointment()
        self.login(self.doctor_user)
        response = self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "COMPLETED")

        self.login(self.patient_user)
        self.assertEqual(self.client.get(MY_URL).data[0]["status"], "COMPLETED")

    def test_cannot_complete_twice(self):
        appointment = self.booked_appointment()
        self.login(self.doctor_user)
        self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        response = self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        self.assertEqual(response.status_code, 400)

    def test_mark_no_show(self):
        appointment = self.booked_appointment()
        self.login(self.doctor_user)
        response = self.client.post(doctor_action_url(appointment.appointment_id, "no-show"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "NOSHOW")

    @tag("security")
    def test_other_doctor_cannot_complete(self):
        appointment = self.booked_appointment()
        self.login(self.other_doctor_user)
        response = self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        self.assertEqual(response.status_code, 400)


@tag("api")
class RescheduleTests(AppointmentTestCase):

    def reschedule(self, appointment, slot_date, start_time, user=None):
        self.login(user or self.doctor_user)
        return self.client.post(
            doctor_action_url(appointment.appointment_id, "reschedule"),
            {"slot_date": slot_date, "start_time": start_time},
            format="json",
        )

    def test_moves_appointment_and_keeps_length(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        response = self.reschedule(appointment, IN_TWO_DAYS.isoformat(), "11:00")
        self.assertEqual(response.status_code, 200)
        appointment.slot.refresh_from_db()
        self.assertEqual(appointment.slot.slot_date, IN_TWO_DAYS)
        self.assertEqual(appointment.slot.start_time, time(11, 0))
        self.assertEqual(appointment.slot.end_time, time(11, 30))

        self.login(self.patient_user)
        details = self.client.get(MY_URL).data[0]["slot_details"]
        self.assertEqual((details["slot_date"], details["start_time"]),
                         (IN_TWO_DAYS.isoformat(), "11:00:00"))

    def test_cannot_move_into_the_past(self):
        appointment = self.booked_appointment()
        self.assertEqual(self.reschedule(appointment, YESTERDAY.isoformat(), "09:00").status_code, 400)
        self.assertEqual(self.reschedule(appointment, TODAY.isoformat(), "08:00").status_code, 400)

    def test_cannot_overlap_another_slot(self):
        appointment = self.booked_appointment()
        self.slot(IN_TWO_DAYS, "11:15")
        response = self.reschedule(appointment, IN_TWO_DAYS.isoformat(), "11:00")
        self.assertEqual(response.status_code, 400)
        appointment.slot.refresh_from_db()
        self.assertEqual(appointment.slot.slot_date, TOMORROW)

    def test_same_time_is_rejected(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.assertEqual(self.reschedule(appointment, TOMORROW.isoformat(), "09:00").status_code, 400)

    def test_only_booked_appointments(self):
        appointment = self.booked_appointment()
        self.login(self.doctor_user)
        self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        self.assertEqual(self.reschedule(appointment, IN_TWO_DAYS.isoformat(), "11:00").status_code, 400)

    @tag("security")
    def test_invalid_or_missing_values(self):
        appointment = self.booked_appointment()
        for slot_date, start_time in (("10/01/2030", "11:00"), (IN_TWO_DAYS.isoformat(), "11am"), (None, None)):
            with self.subTest(slot_date=slot_date, start_time=start_time):
                self.assertEqual(self.reschedule(appointment, slot_date, start_time).status_code, 400)

    @tag("security")
    def test_other_doctor_and_patient_cannot_reschedule(self):
        appointment = self.booked_appointment()
        self.assertEqual(
            self.reschedule(appointment, IN_TWO_DAYS.isoformat(), "11:00", user=self.other_doctor_user).status_code,
            400,
        )
        self.assertEqual(
            self.reschedule(appointment, IN_TWO_DAYS.isoformat(), "11:00", user=self.patient_user).status_code,
            403,
        )


@tag("api")
class CreateSlotTests(AppointmentTestCase):

    def create(self, body):
        self.login(self.doctor_user)
        return self.client.post(DOCTOR_SLOTS_URL, body, format="json")

    def test_doctor_creates_slot(self):
        response = self.create({"slot_date": TOMORROW.isoformat(), "start_time": "09:00", "end_time": "09:30"})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Doctor_slot.objects.filter(doctor=self.doctor, slot_date=TOMORROW).exists())

    def test_invalid_slots(self):
        cases = [
            {},
            {"slot_date": TOMORROW.isoformat(), "start_time": "10:00", "end_time": "09:00"},
            {"slot_date": YESTERDAY.isoformat(), "start_time": "09:00", "end_time": "09:30"},
            {"slot_date": "tomorrow", "start_time": "09:00", "end_time": "09:30"},
        ]
        for body in cases:
            with self.subTest(body=body):
                self.assertEqual(self.create(body).status_code, 400)

    def test_duplicate_slot(self):
        body = {"slot_date": TOMORROW.isoformat(), "start_time": "09:00", "end_time": "09:30"}
        self.assertEqual(self.create(body).status_code, 201)
        self.assertEqual(self.create(body).status_code, 400)
