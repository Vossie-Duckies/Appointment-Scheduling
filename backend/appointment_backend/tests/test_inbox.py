"""
Tests for automatic notifications and the Alerts inbox endpoints.

Run with:  python manage.py test appointment_backend

Like appointments/tests.py, the clock is frozen at Thu 10 Jan 2030 12:00, so
"tomorrow" is Fri 11 Jan.
"""
from django.test import tag

from appointment_backend.models import Notification
from appointments.tests import (
    IN_TWO_DAYS,
    TOMORROW,
    AppointmentTestCase,
    cancel_url,
    doctor_action_url,
)

INBOX_URL = "/api/notifications/"
UNREAD_URL = "/api/notifications/unread-count/"
READ_ALL_URL = "/api/notifications/read-all/"


def read_url(notification_id):
    return f"/api/notifications/{notification_id}/read/"


class NotificationTestCase(AppointmentTestCase):

    def messages_for(self, user):
        return list(Notification.objects.filter(user=user).order_by("notification_id").values_list("message", flat=True))

    def doctor_does(self, appointment, action, body=None):
        self.login(self.doctor_user)
        return self.client.post(doctor_action_url(appointment.appointment_id, action), body or {}, format="json")


@tag("integration")
class AutomaticNotificationTests(NotificationTestCase):

    def test_booking_tells_the_doctor(self):
        self.booked_appointment(TOMORROW, "09:00")
        self.assertEqual(
            self.messages_for(self.doctor_user),
            ["New booking: Lerato Dlamini on Fri 11 Jan at 09:00. Reason: Headache"],
        )
        self.assertEqual(self.messages_for(self.patient_user), [])

    def test_cancelling_tells_the_doctor(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.client.post(cancel_url(appointment.appointment_id))
        self.assertEqual(
            self.messages_for(self.doctor_user)[-1],
            "Lerato Dlamini cancelled their appointment on Fri 11 Jan at 09:00.",
        )

    def test_rescheduling_tells_the_patient(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        response = self.doctor_does(appointment, "reschedule", {"slot_date": IN_TWO_DAYS.isoformat(), "start_time": "11:00"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.messages_for(self.patient_user),
            ["Dr. Thabo Mokoena moved your appointment from Fri 11 Jan at 09:00 to Sat 12 Jan at 11:00."],
        )

    def test_no_show_tells_the_patient_and_completed_does_not(self):
        missed = self.booked_appointment(TOMORROW, "09:00")
        seen = self.booked_appointment(TOMORROW, "10:00")
        self.doctor_does(missed, "no-show")
        self.doctor_does(seen, "complete")
        messages = self.messages_for(self.patient_user)
        self.assertEqual(len(messages), 1)
        self.assertTrue(messages[0].startswith("Dr. Thabo Mokoena marked you as absent from your appointment on Fri 11 Jan at 09:00."))

    def test_failed_changes_send_nothing(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        before = Notification.objects.count()
        self.book(appointment.slot, user=self.other_patient_user)          # slot taken
        self.doctor_does(appointment, "reschedule", {"slot_date": "soon", "start_time": "11:00"})
        self.assertEqual(Notification.objects.count(), before)


@tag("api")
class InboxTests(NotificationTestCase):

    def test_lists_own_notifications_newest_first(self):
        first = self.booked_appointment(TOMORROW, "09:00")
        second = self.booked_appointment(TOMORROW, "10:00")

        self.login(self.doctor_user)
        response = self.client.get(INBOX_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["unread_count"], 2)
        results = response.data["results"]
        self.assertEqual(
            [row["appointment"]["appointment_id"] for row in results],
            [second.appointment_id, first.appointment_id],
        )
        self.assertEqual(results[0]["appointment"]["with_name"], "Lerato Dlamini")
        self.assertFalse(results[0]["is_read"])

    def test_patient_sees_the_doctors_name(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.doctor_does(appointment, "reschedule", {"slot_date": IN_TWO_DAYS.isoformat(), "start_time": "11:00"})
        self.login(self.patient_user)
        row = self.client.get(INBOX_URL).data["results"][0]
        self.assertEqual(row["appointment"]["with_name"], "Dr. Thabo Mokoena")
        self.assertEqual(row["appointment"]["slot_date"], IN_TWO_DAYS)

    @tag("security")
    def test_other_people_see_nothing(self):
        self.booked_appointment(TOMORROW, "09:00")
        self.login(self.other_doctor_user)
        self.assertEqual(self.client.get(INBOX_URL).data, {"unread_count": 0, "results": []})

    def test_mark_one_and_mark_all_as_read(self):
        self.booked_appointment(TOMORROW, "09:00")
        self.booked_appointment(TOMORROW, "10:00")
        first, second = Notification.objects.filter(user=self.doctor_user).order_by("notification_id")

        self.login(self.other_doctor_user)
        self.assertEqual(self.client.post(read_url(first.notification_id)).status_code, 404)

        self.login(self.doctor_user)
        response = self.client.post(read_url(first.notification_id))
        self.assertEqual((response.status_code, response.data["unread_count"]), (200, 1))
        self.assertEqual(self.client.get(UNREAD_URL).data, {"unread_count": 1})

        response = self.client.post(READ_ALL_URL)
        self.assertEqual((response.data["updated"], response.data["unread_count"]), (1, 0))
        second.refresh_from_db()
        self.assertTrue(second.is_read)

    @tag("security")
    def test_requires_login(self):
        for url in (INBOX_URL, UNREAD_URL):
            with self.subTest(url=url):
                self.assertIn(self.client.get(url).status_code, (401, 403))
        self.assertIn(self.client.post(READ_ALL_URL).status_code, (401, 403))


@tag("api")
class SendToOtherPersonTests(NotificationTestCase):

    def send(self, user, appointment, message):
        self.login(user)
        return self.client.post(
            INBOX_URL, {"type": "IN_APP", "appointment_id": appointment.appointment_id, "message": message}, format="json"
        )

    @tag("integration")
    def test_doctor_message_reaches_the_patient(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.assertEqual(self.send(self.doctor_user, appointment, "Running 15 minutes late").status_code, 200)
        self.assertEqual(self.messages_for(self.patient_user), ["Running 15 minutes late"])

    @tag("integration")
    def test_patient_message_reaches_the_doctor(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.send(self.patient_user, appointment, "Stuck in traffic")
        self.assertEqual(self.messages_for(self.doctor_user)[-1], "Stuck in traffic")

    @tag("security")
    def test_message_length_is_limited(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.assertEqual(self.send(self.doctor_user, appointment, "x" * 501).status_code, 400)
        self.assertEqual(self.messages_for(self.patient_user), [])
