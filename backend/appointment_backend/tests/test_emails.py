"""
Tests for the appointment emails (appointment_backend/notifications/emails.py).

Run with:  python manage.py test appointment_backend

Django's test runner never sends real email: messages are kept in
django.core.mail.outbox. Emails go out once a change is saved, so each test
runs the change inside captureOnCommitCallbacks(execute=True). The clock is
frozen at Thu 10 Jan 2030 12:00, so "tomorrow" is Fri 11 Jan.
"""
import threading
from smtplib import SMTPException
from unittest.mock import patch

from django.core import mail
from django.test import override_settings, tag

from appointment_backend.models import Notification
from appointment_backend.tests.test_inbox import INBOX_URL, NotificationTestCase
from appointments.tests import IN_TWO_DAYS, TOMORROW, cancel_url


@override_settings(EMAIL_IN_BACKGROUND=False, EMAIL_NOTIFICATIONS=True)
@tag("integration")
class AppointmentEmailTests(NotificationTestCase):

    def emails_to(self, user):
        return [email for email in mail.outbox if email.to == [user.email]]

    def booked_and_saved(self, day=TOMORROW, start="09:00"):
        with self.captureOnCommitCallbacks(execute=True):
            return self.booked_appointment(day, start)

    def test_booking_emails_the_doctor_and_the_patient(self):
        self.booked_and_saved()
        doctor_email, = self.emails_to(self.doctor_user)
        self.assertEqual(doctor_email.subject, "WaitLess: New booking on Fri 11 Jan at 09:00")
        self.assertTrue(doctor_email.body.startswith("Hi Thabo,"))
        self.assertIn("New booking: Lerato Dlamini on Fri 11 Jan at 09:00.", doctor_email.body)

        patient_email, = self.emails_to(self.patient_user)
        self.assertEqual(patient_email.subject, "WaitLess: Appointment booked for Fri 11 Jan at 09:00")
        self.assertIn("Your appointment with Dr. Thabo Mokoena on Fri 11 Jan at 09:00 is booked.", patient_email.body)

    @tag("security")
    def test_the_reason_stays_in_the_app(self):
        self.booked_and_saved()      # booked with the reason "Headache"
        for email in mail.outbox:
            self.assertNotIn("Headache", email.subject + email.body)
        # The doctor still sees it in the Alerts tab.
        self.assertIn("Reason: Headache", self.messages_for(self.doctor_user)[0])

    def test_cancelling_emails_the_doctor(self):
        appointment = self.booked_and_saved()
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(cancel_url(appointment.appointment_id))
        email, = mail.outbox
        self.assertEqual(email.to, [self.doctor_user.email])
        self.assertEqual(email.subject, "WaitLess: Cancelled appointment on Fri 11 Jan at 09:00")
        self.assertIn("Lerato Dlamini cancelled their appointment on Fri 11 Jan at 09:00.", email.body)

    def test_rescheduling_emails_the_patient(self):
        appointment = self.booked_and_saved()
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.doctor_does(appointment, "reschedule", {"slot_date": IN_TWO_DAYS.isoformat(), "start_time": "11:00"})
        self.assertEqual(response.status_code, 200)
        email, = mail.outbox
        self.assertEqual(email.to, [self.patient_user.email])
        self.assertEqual(email.subject, "WaitLess: Your appointment has moved to Sat 12 Jan at 11:00")
        self.assertIn("from Fri 11 Jan at 09:00 to Sat 12 Jan at 11:00.", email.body)

    def test_no_show_emails_the_patient(self):
        appointment = self.booked_and_saved()
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            self.doctor_does(appointment, "no-show")
        email, = mail.outbox
        self.assertEqual(email.to, [self.patient_user.email])
        self.assertEqual(email.subject, "WaitLess: Missed appointment on Fri 11 Jan at 09:00")

    def test_running_late_message_is_emailed(self):
        appointment = self.booked_and_saved()
        mail.outbox.clear()
        self.login(self.doctor_user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                INBOX_URL,
                {"type": "IN_APP", "appointment_id": appointment.appointment_id, "message": "Running 15 minutes late"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        email, = mail.outbox
        self.assertEqual(email.to, [self.patient_user.email])
        self.assertEqual(email.subject, "WaitLess: Message from Dr. Thabo Mokoena")
        self.assertIn("Running 15 minutes late", email.body)

    def test_a_failed_change_sends_no_email(self):
        appointment = self.booked_and_saved()
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.book(appointment.slot, user=self.other_patient_user)   # slot taken
        self.assertEqual(response.status_code, 400)
        self.assertEqual(mail.outbox, [])

    def test_nothing_is_sent_until_the_change_is_saved(self):
        with self.captureOnCommitCallbacks(execute=False) as waiting:
            self.booked_appointment()
            self.assertEqual(mail.outbox, [])
        self.assertEqual(len(waiting), 2)       # the doctor's email and the patient's
        self.assertEqual(mail.outbox, [])

    def test_a_mail_server_problem_does_not_stop_the_booking(self):
        with patch("appointment_backend.notifications.emails.send_mail", side_effect=SMTPException("Login refused")), \
                self.assertLogs("appointment_backend.notifications.emails", level="ERROR") as logs:
            appointment = self.booked_and_saved()
        self.assertEqual(appointment.status, "BOOKED")
        self.assertEqual(len(self.messages_for(self.doctor_user)), 1)   # the in-app alert still arrives
        self.assertIn("Couldn't send the email", logs.output[0])

    @override_settings(EMAIL_NOTIFICATIONS=False)
    def test_emails_can_be_turned_off(self):
        self.booked_and_saved()
        self.assertEqual(mail.outbox, [])
        self.assertEqual(Notification.objects.filter(user=self.doctor_user).count(), 1)

    @override_settings(EMAIL_IN_BACKGROUND=True)
    def test_sending_runs_in_the_background(self):
        started = []

        class RecordingThread(threading.Thread):
            def start(self):
                started.append(self)
                super().start()

        with patch("appointment_backend.notifications.emails.threading.Thread", RecordingThread):
            self.booked_and_saved()
        for thread in started:
            thread.join(timeout=5)
        self.assertEqual(len(started), 2)
        self.assertFalse(any(thread.daemon for thread in started))   # finished even if the server stops
        self.assertEqual(len(mail.outbox), 2)
