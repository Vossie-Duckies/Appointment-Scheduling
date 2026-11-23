"""
Tests for deleting a patient's or a doctor's account (appointments/models.py).

Run with:  python manage.py test appointments

Deleting an account also deletes that person's appointments and their alerts,
and a booking that disappears this way frees its slot. The admin site lists the
appointments on its "Are you sure?" page instead of refusing with
"Cannot delete user". The clock is frozen at Thu 10 Jan 2030 12:00.
"""
from django.test import tag

from accounts.models import Doctor, Patient, User
from appointment_backend.models import Notification
from appointments.models import Appointment, Doctor_slot, DoctorTimeOff
from appointments.tests import IN_TWO_DAYS, TOMORROW, AppointmentTestCase, cancel_url


@tag("integration")
class DeletingAccountsTests(AppointmentTestCase):

    def test_deleting_a_patient_deletes_their_appointments_and_frees_the_slot(self):
        appointment = self.booked_appointment()
        slot_id = appointment.slot_id
        self.assertEqual(Notification.objects.filter(appointment=appointment).count(), 1)

        self.patient_user.delete()

        self.assertFalse(User.objects.filter(email="pat@example.com").exists())
        self.assertFalse(Patient.objects.filter(pk=self.patient.pk).exists())
        self.assertFalse(Appointment.objects.filter(pk=appointment.pk).exists())
        self.assertEqual(Notification.objects.count(), 0)
        # The doctor's time is free again, and another patient can book it.
        self.assertEqual(Doctor_slot.objects.get(pk=slot_id).status, "AVAILABLE")
        self.assertEqual(self.book(Doctor_slot.objects.get(pk=slot_id), user=self.other_patient_user).status_code, 201)

    def test_other_slots_keep_their_status(self):
        cancelled = self.booked_appointment(TOMORROW, "09:00")
        self.client.post(cancel_url(cancelled.appointment_id))
        blocked = self.slot(TOMORROW, "09:00", doctor=self.other_doctor, status="BLOCKED")
        Doctor_slot.objects.filter(pk=cancelled.slot_id).update(status="BLOCKED")

        self.patient_user.delete()

        self.assertEqual(Doctor_slot.objects.get(pk=cancelled.slot_id).status, "BLOCKED")
        self.assertEqual(Doctor_slot.objects.get(pk=blocked.pk).status, "BLOCKED")

    def test_deleting_a_doctor_deletes_their_schedule_and_appointments(self):
        appointment = self.booked_appointment()
        self.slot(IN_TWO_DAYS, "10:00")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=IN_TWO_DAYS, end_date=IN_TWO_DAYS)
        other_doctors_slot = self.slot(TOMORROW, "09:00", doctor=self.other_doctor)

        self.doctor_user.delete()

        self.assertFalse(Doctor.objects.filter(pk=self.doctor.pk).exists())
        self.assertFalse(Doctor_slot.objects.filter(doctor_id=self.doctor.pk).exists())
        self.assertFalse(DoctorTimeOff.objects.exists())
        self.assertFalse(Appointment.objects.filter(pk=appointment.pk).exists())
        # The patient's account stays, and so does everyone else's schedule.
        self.assertTrue(User.objects.filter(email="pat@example.com").exists())
        self.assertTrue(Doctor_slot.objects.filter(pk=other_doctors_slot.pk).exists())

    def test_admin_site_lists_the_appointments_then_deletes(self):
        self.booked_appointment()
        admin = User.objects.create_superuser(
            email="admin@example.com", password="Secret123!", first_name="Ada", last_name="Admin", role="ADMIN"
        )
        self.client.force_login(admin)
        url = f"/admin/accounts/user/{self.patient_user.pk}/delete/"

        page = self.client.get(url)
        self.assertEqual(page.status_code, 200)
        self.assertNotContains(page, "Cannot delete")
        self.assertContains(page, "Lerato Dlamini with Dr. Thabo Mokoena, Fri 11 Jan at 09:00 (Booked)")

        response = self.client.post(url, {"post": "yes"})
        self.assertEqual(response.status_code, 302)
        self.assertFalse(User.objects.filter(pk=self.patient_user.pk).exists())

    def test_appointment_has_a_readable_name(self):
        appointment = self.booked_appointment()
        self.assertEqual(str(appointment), "Lerato Dlamini with Dr. Thabo Mokoena, Fri 11 Jan at 09:00 (Booked)")
