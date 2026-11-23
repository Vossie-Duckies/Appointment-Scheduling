"""
Tests for the doctor schedule (schedule_views.py), time off, and the
stricter cancel rules.

Run with:  python manage.py test appointments

Like tests.py, the clock is frozen at Thu 10 Jan 2030 12:00 local time.
"""
from datetime import time, timedelta

from django.test import tag

from appointment_backend.models import Notification
from appointments.models import Appointment, Doctor_slot, DoctorTimeOff
from appointments.tests import (
    DOCTOR_SLOTS_URL,
    IN_TWO_DAYS,
    MY_URL,
    SLOTS_URL,
    TODAY,
    TOMORROW,
    YESTERDAY,
    AppointmentTestCase,
    cancel_url,
    doctor_action_url,
)

WEEKLY_URL = DOCTOR_SLOTS_URL + "weekly/"
WEEKLY_REMOVE_URL = WEEKLY_URL + "remove/"
TIME_OFF_URL = "/api/appointments/doctor/time-off/"


def slot_url(slot_id, action=None):
    return f"{DOCTOR_SLOTS_URL}{slot_id}/" + (f"{action}/" if action else "")


class ScheduleTestCase(AppointmentTestCase):

    def as_doctor(self, user=None):
        self.login(user or self.doctor_user)

    def list_slots(self, **params):
        self.as_doctor()
        return self.client.get(DOCTOR_SLOTS_URL, params)

    def weekly(self, url=WEEKLY_URL, **body):
        self.as_doctor()
        defaults = {
            "weekdays": [0, 1, 2, 3, 4],
            "start_time": "09:00",
            "end_time": "11:00",
            "slot_minutes": 30,
            "start_date": TOMORROW.isoformat(),
            "weeks": 1,
        }
        defaults.update(body)
        return self.client.post(url, defaults, format="json")

    def add_time_off(self, start, end=None, reason=""):
        self.as_doctor()
        body = {"start_date": start.isoformat(), "reason": reason}
        if end is not None:
            body["end_date"] = end.isoformat()
        return self.client.post(TIME_OFF_URL, body, format="json")

    def patient_slot_ids(self):
        self.login(self.patient_user)
        return [row["slot_id"] for row in self.client.get(SLOTS_URL).data]


@tag("api")
class ListSlotsTests(ScheduleTestCase):

    def test_lists_own_unfinished_slots_with_booking_details(self):
        self.slot(TODAY, "09:00")                      # finished at 09:30
        later_today = self.slot(TODAY, "15:00")
        booked = self.booked_appointment(TOMORROW, "09:00")
        blocked = self.slot(TOMORROW, "10:00", status="BLOCKED")
        self.slot(TOMORROW, "11:00", doctor=self.other_doctor)

        response = self.list_slots(**{"from": TODAY.isoformat(), "to": IN_TWO_DAYS.isoformat()})

        self.assertEqual(response.status_code, 200)
        rows = response.data["slots"]
        self.assertEqual([row["slot_id"] for row in rows], [later_today.slot_id, booked.slot_id, blocked.slot_id])
        open_row, booked_row, blocked_row = rows
        self.assertEqual((open_row["status"], open_row["can_delete"], open_row["appointment"]), ("AVAILABLE", True, None))
        self.assertEqual(booked_row["status"], "BOOKED")
        self.assertFalse(booked_row["can_delete"])
        self.assertEqual(booked_row["appointment"]["patient_name"], "Lerato Dlamini")
        self.assertEqual(booked_row["appointment"]["appointment_id"], booked.appointment_id)
        self.assertEqual((blocked_row["status"], blocked_row["can_delete"]), ("BLOCKED", True))

    def test_slot_with_a_cancelled_appointment_cannot_be_deleted(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        self.client.post(cancel_url(appointment.appointment_id))

        row = self.list_slots()
        row = row.data["slots"][0]
        self.assertEqual((row["status"], row["appointment"], row["can_delete"]), ("AVAILABLE", None, False))

    def test_marks_time_off_days(self):
        self.slot(TOMORROW, "09:00")
        self.slot(IN_TWO_DAYS, "09:00")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=TOMORROW, end_date=TOMORROW)

        response = self.list_slots()

        self.assertEqual([row["on_time_off"] for row in response.data["slots"]], [True, False])
        self.assertEqual(len(response.data["time_off"]), 1)

    def test_from_date_in_the_past_starts_today(self):
        response = self.list_slots(**{"from": YESTERDAY.isoformat(), "to": TOMORROW.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["from"], TODAY)

    @tag("security")
    def test_bad_ranges(self):
        cases = [
            {"from": "next week"},
            {"from": TOMORROW.isoformat(), "to": TODAY.isoformat()},
            {"from": TODAY.isoformat(), "to": (TODAY + timedelta(days=120)).isoformat()},
        ]
        for params in cases:
            with self.subTest(params=params):
                self.assertEqual(self.list_slots(**params).status_code, 400)

    @tag("security")
    def test_patient_is_forbidden(self):
        self.login(self.patient_user)
        self.assertEqual(self.client.get(DOCTOR_SLOTS_URL).status_code, 403)


@tag("api")
class CreateSlotRuleTests(ScheduleTestCase):

    def create(self, day, start, end):
        self.as_doctor()
        return self.client.post(
            DOCTOR_SLOTS_URL, {"slot_date": day.isoformat(), "start_time": start, "end_time": end}, format="json"
        )

    def test_overlapping_slot_is_refused(self):
        self.slot(TOMORROW, "09:00")
        response = self.create(TOMORROW, "09:15", "09:45")
        self.assertEqual(response.status_code, 400)
        self.assertIn("overlaps", response.data["message"])

    def test_back_to_back_slot_is_fine(self):
        self.slot(TOMORROW, "09:00")
        self.assertEqual(self.create(TOMORROW, "09:30", "10:00").status_code, 201)

    def test_time_that_has_passed_today_is_refused(self):
        self.assertEqual(self.create(TODAY, "11:00", "11:30").status_code, 400)
        self.assertEqual(self.create(TODAY, "13:00", "13:30").status_code, 201)

    def test_day_in_time_off_is_refused(self):
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=TOMORROW, end_date=IN_TWO_DAYS)
        response = self.create(TOMORROW, "09:00", "09:30")
        self.assertEqual(response.status_code, 400)
        self.assertIn("time off", response.data["message"])


@tag("api")
class BlockAndDeleteTests(ScheduleTestCase):

    @tag("integration")
    def test_block_hides_the_slot_and_unblock_shows_it_again(self):
        slot = self.slot(TOMORROW, "09:00")
        self.as_doctor()
        self.assertEqual(self.client.post(slot_url(slot.slot_id, "block")).status_code, 200)
        slot.refresh_from_db()
        self.assertEqual(slot.status, "BLOCKED")
        self.assertNotIn(slot.slot_id, self.patient_slot_ids())

        self.as_doctor()
        self.assertEqual(self.client.post(slot_url(slot.slot_id, "unblock")).status_code, 200)
        self.assertIn(slot.slot_id, self.patient_slot_ids())

    def test_only_open_slots_can_be_blocked(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        blocked = self.slot(TOMORROW, "10:00", status="BLOCKED")
        started = self.slot(TODAY, "11:45")
        self.as_doctor()
        for slot_id in (appointment.slot_id, blocked.slot_id, started.slot_id):
            with self.subTest(slot_id=slot_id):
                self.assertEqual(self.client.post(slot_url(slot_id, "block")).status_code, 400)
        self.assertEqual(self.client.post(slot_url(appointment.slot_id, "unblock")).status_code, 400)

    def test_delete_open_or_blocked_slot(self):
        open_slot = self.slot(TOMORROW, "09:00")
        blocked = self.slot(TOMORROW, "10:00", status="BLOCKED")
        self.as_doctor()
        for slot in (open_slot, blocked):
            self.assertEqual(self.client.delete(slot_url(slot.slot_id)).status_code, 200)
        self.assertFalse(Doctor_slot.objects.filter(slot_id__in=[open_slot.slot_id, blocked.slot_id]).exists())

    def test_booked_slot_or_one_with_history_is_kept(self):
        booked = self.booked_appointment(TOMORROW, "09:00")
        cancelled = self.booked_appointment(TOMORROW, "10:00")
        self.client.post(cancel_url(cancelled.appointment_id))

        self.as_doctor()
        for slot_id in (booked.slot_id, cancelled.slot_id):
            with self.subTest(slot_id=slot_id):
                self.assertEqual(self.client.delete(slot_url(slot_id)).status_code, 400)
                self.assertTrue(Doctor_slot.objects.filter(slot_id=slot_id).exists())

    @tag("security")
    def test_other_doctors_slot_is_not_found(self):
        slot = self.slot(TOMORROW, "09:00")
        self.as_doctor(self.other_doctor_user)
        self.assertEqual(self.client.post(slot_url(slot.slot_id, "block")).status_code, 404)
        self.assertEqual(self.client.delete(slot_url(slot.slot_id)).status_code, 404)

    @tag("security")
    def test_patient_is_forbidden(self):
        slot = self.slot(TOMORROW, "09:00")
        self.login(self.patient_user)
        self.assertEqual(self.client.delete(slot_url(slot.slot_id)).status_code, 403)


@tag("api")
class WeeklyHoursTests(ScheduleTestCase):

    def test_adds_slots_on_the_chosen_days(self):
        # Fri 11 Jan to Thu 17 Jan, Monday to Friday, 09:00-11:00 in 30 minutes.
        response = self.weekly()

        self.assertEqual(response.status_code, 201)
        weekdays = [TOMORROW + timedelta(days=n) for n in range(7) if (TOMORROW + timedelta(days=n)).weekday() < 5]
        self.assertEqual(response.data["created"], len(weekdays) * 4)
        slots = Doctor_slot.objects.filter(doctor=self.doctor)
        self.assertEqual(sorted({s.slot_date for s in slots}), weekdays)
        self.assertEqual(
            sorted({(s.start_time, s.end_time) for s in slots}),
            [(time(9, 0), time(9, 30)), (time(9, 30), time(10, 0)), (time(10, 0), time(10, 30)), (time(10, 30), time(11, 0))],
        )
        self.assertTrue(all(s.status == "AVAILABLE" for s in slots))

    def test_skips_past_times_overlaps_and_time_off(self):
        self.slot(TOMORROW, "12:30")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=IN_TWO_DAYS, end_date=IN_TWO_DAYS)

        response = self.weekly(
            weekdays=list(range(7)), start_time="11:00", end_time="13:00", slot_minutes=60,
            start_date=TODAY.isoformat(),
        )

        self.assertEqual(response.status_code, 201)
        # Today: 11:00 and 12:00 have started. Tomorrow: 12:00 overlaps 12:30.
        # Saturday is time off. The other four days get both slots.
        self.assertEqual(
            {key: response.data[key] for key in ("created", "skipped_past", "skipped_overlapping", "skipped_time_off_days")},
            {"created": 9, "skipped_past": 2, "skipped_overlapping": 1, "skipped_time_off_days": 1},
        )
        self.assertFalse(Doctor_slot.objects.filter(slot_date=IN_TWO_DAYS).exists())

    def test_running_it_twice_adds_nothing_new(self):
        first = self.weekly()
        second = self.weekly()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["created"], 0)
        self.assertEqual(second.data["skipped_overlapping"], first.data["created"])

    @tag("security")
    def test_invalid_requests(self):
        cases = [
            {"weekdays": []},
            {"weekdays": [7]},
            {"weekdays": "monday"},
            {"start_time": "11:00", "end_time": "09:00"},
            {"start_time": "9am"},
            {"slot_minutes": 0},
            {"slot_minutes": 1.5},
            {"weeks": 13},
            {"start_date": YESTERDAY.isoformat()},
            {"start_time": "09:00", "end_time": "09:20", "slot_minutes": 30},
        ]
        for body in cases:
            with self.subTest(body=body):
                self.assertEqual(self.weekly(**body).status_code, 400)
        self.assertFalse(Doctor_slot.objects.exists())

    @tag("security")
    def test_too_many_slots_at_once(self):
        response = self.weekly(weekdays=list(range(7)), start_time="00:00", end_time="23:55", slot_minutes=5, weeks=12)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Doctor_slot.objects.exists())

    def test_remove_deletes_only_unbooked_slots_in_the_hours(self):
        open_slot = self.slot(TOMORROW, "09:00")
        booked = self.booked_appointment(TOMORROW, "09:30")
        blocked = self.slot(TOMORROW, "10:00", status="BLOCKED")
        history = self.booked_appointment(TOMORROW, "10:30")
        self.client.post(cancel_url(history.appointment_id))
        afternoon = self.slot(TOMORROW, "14:00")
        monday = self.slot(TOMORROW + timedelta(days=3), "09:00")

        response = self.weekly(url=WEEKLY_REMOVE_URL, weekdays=[TOMORROW.weekday()], start_date=TODAY.isoformat())

        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.data["removed"], response.data["kept"]), (2, 2))
        remaining = set(Doctor_slot.objects.values_list("slot_id", flat=True))
        self.assertNotIn(open_slot.slot_id, remaining)
        self.assertNotIn(blocked.slot_id, remaining)
        self.assertTrue({booked.slot_id, history.slot_id, afternoon.slot_id, monday.slot_id} <= remaining)

    @tag("security")
    def test_patient_is_forbidden(self):
        self.login(self.patient_user)
        self.assertEqual(self.client.post(WEEKLY_URL, {}, format="json").status_code, 403)


@tag("api")
class TimeOffTests(ScheduleTestCase):

    def test_add_list_and_remove(self):
        response = self.add_time_off(TOMORROW, IN_TWO_DAYS, reason="Conference")
        self.assertEqual(response.status_code, 201)
        time_off_id = response.data["time_off"]["time_off_id"]

        listed = self.client.get(TIME_OFF_URL).data
        self.assertEqual([(row["time_off_id"], row["reason"]) for row in listed], [(time_off_id, "Conference")])

        self.assertEqual(self.client.delete(f"{TIME_OFF_URL}{time_off_id}/").status_code, 200)
        self.assertEqual(self.client.get(TIME_OFF_URL).data, [])

    def test_one_day_when_no_end_date(self):
        response = self.add_time_off(TOMORROW)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["time_off"]["end_date"], TOMORROW)

    @tag("integration")
    def test_hides_slots_and_stops_booking_until_removed(self):
        slot = self.slot(TOMORROW, "09:00")
        time_off_id = self.add_time_off(TOMORROW).data["time_off"]["time_off_id"]

        self.assertNotIn(slot.slot_id, self.patient_slot_ids())
        self.assertEqual(self.book(slot).status_code, 400)

        self.as_doctor()
        self.client.delete(f"{TIME_OFF_URL}{time_off_id}/")
        self.assertIn(slot.slot_id, self.patient_slot_ids())
        self.assertEqual(self.book(slot).status_code, 201)

    @tag("integration")
    def test_reports_booked_appointments_in_the_period(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        response = self.add_time_off(TOMORROW)

        self.assertEqual(response.status_code, 201)
        booked = response.data["time_off"]["booked_appointments"]
        self.assertEqual([row["appointment_id"] for row in booked], [appointment.appointment_id])
        self.assertIn("1 booked appointment", response.data["message"])
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "BOOKED")  # kept; the doctor reschedules it

    @tag("security")
    def test_invalid_time_off(self):
        self.assertEqual(self.add_time_off(TOMORROW, IN_TWO_DAYS).status_code, 201)
        cases = [
            (IN_TWO_DAYS, IN_TWO_DAYS + timedelta(days=2), ""),   # overlaps
            (YESTERDAY, TODAY, ""),
            (TODAY + timedelta(days=10), TODAY + timedelta(days=9), ""),
            (TODAY + timedelta(days=10), TODAY + timedelta(days=400), ""),
            (TODAY + timedelta(days=10), None, "x" * 101),
        ]
        for start, end, reason in cases:
            with self.subTest(start=start, end=end):
                self.assertEqual(self.add_time_off(start, end, reason).status_code, 400)
        self.as_doctor()
        self.assertEqual(self.client.post(TIME_OFF_URL, {"start_date": "soon"}, format="json").status_code, 400)

    def test_finished_time_off_is_not_listed(self):
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=YESTERDAY, end_date=YESTERDAY)
        self.as_doctor()
        self.assertEqual(self.client.get(TIME_OFF_URL).data, [])

    def test_cannot_reschedule_into_time_off(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=IN_TWO_DAYS, end_date=IN_TWO_DAYS)
        self.as_doctor()
        response = self.client.post(
            doctor_action_url(appointment.appointment_id, "reschedule"),
            {"slot_date": IN_TWO_DAYS.isoformat(), "start_time": "11:00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    @tag("security")
    def test_other_doctor_cannot_remove_it(self):
        time_off_id = self.add_time_off(TOMORROW).data["time_off"]["time_off_id"]
        self.as_doctor(self.other_doctor_user)
        self.assertEqual(self.client.delete(f"{TIME_OFF_URL}{time_off_id}/").status_code, 404)
        self.assertTrue(DoctorTimeOff.objects.filter(time_off_id=time_off_id).exists())


@tag("api")
class CancelRuleTests(ScheduleTestCase):

    def test_started_appointment_cannot_be_cancelled(self):
        slot = self.slot(TODAY, "11:45", status="BOOKED")
        appointment = Appointment.objects.create(patient=self.patient, slot=slot, reason="Check-up")
        self.login(self.patient_user)
        response = self.client.post(cancel_url(appointment.appointment_id))
        self.assertEqual(response.status_code, 400)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "BOOKED")

    def test_no_show_cannot_be_cancelled(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        Appointment.objects.filter(pk=appointment.pk).update(status="NOSHOW")
        response = self.client.post(cancel_url(appointment.appointment_id))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Doctor_slot.objects.get(pk=appointment.slot_id).status, "BOOKED")

    @tag("integration")
    def test_cancelled_slot_on_a_time_off_day_stays_hidden(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=TOMORROW, end_date=TOMORROW)
        self.assertEqual(self.client.post(cancel_url(appointment.appointment_id)).status_code, 200)
        self.assertNotIn(appointment.slot_id, self.patient_slot_ids())


@tag("api")
class RescheduleIntoOpenSlotTests(ScheduleTestCase):
    """The app's Update screen offers the doctor's open slots and sends slot_id."""

    def move(self, appointment, slot_id, user=None):
        self.login(user or self.doctor_user)
        return self.client.post(
            doctor_action_url(appointment.appointment_id, "reschedule"), {"slot_id": slot_id}, format="json"
        )

    @tag("integration")
    def test_moves_into_the_open_slot_and_opens_the_old_one(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        old_slot_id = appointment.slot_id
        target = self.slot(IN_TWO_DAYS, "11:00")

        response = self.move(appointment, target.slot_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.data["slot_date"], response.data["start_time"]), (IN_TWO_DAYS, time(11, 0)))
        appointment.refresh_from_db()
        self.assertEqual(appointment.slot_id, target.slot_id)
        self.assertEqual(Doctor_slot.objects.get(pk=target.slot_id).status, "BOOKED")
        self.assertEqual(Doctor_slot.objects.get(pk=old_slot_id).status, "AVAILABLE")
        self.assertIn(old_slot_id, self.patient_slot_ids())
        self.assertNotIn(target.slot_id, self.patient_slot_ids())
        self.assertEqual(
            Notification.objects.filter(user=self.patient_user).latest("notification_id").message,
            "Dr. Thabo Mokoena moved your appointment from Fri 11 Jan at 09:00 to Sat 12 Jan at 11:00.",
        )

    @tag("integration")
    def test_open_slot_with_a_cancelled_booking_is_reused(self):
        target = self.slot(IN_TWO_DAYS, "11:00")
        self.assertEqual(self.book(target, user=self.other_patient_user).status_code, 201)
        self.client.post(cancel_url(Appointment.objects.get(slot=target).appointment_id))
        appointment = self.booked_appointment(TOMORROW, "09:00")
        old_slot_id = appointment.slot_id
        alerts_before = Notification.objects.count()

        response = self.move(appointment, target.slot_id)

        self.assertEqual(response.status_code, 200)
        moved = Appointment.objects.get(slot=target)
        self.assertEqual((moved.patient_id, moved.status, moved.reason), (self.patient.pk, "BOOKED", "Headache"))
        self.assertEqual(response.data["appointment_id"], moved.appointment_id)
        self.assertFalse(Appointment.objects.filter(slot_id=old_slot_id).exists())
        # No alert is lost: the doctor's "New booking" alert follows the appointment.
        self.assertEqual(Notification.objects.count(), alerts_before + 1)
        self.assertTrue(Notification.objects.filter(
            user=self.doctor_user, appointment=moved, message__startswith="New booking: Lerato Dlamini on Fri 11 Jan"
        ).exists())
        self.login(self.patient_user)
        booked = [row["slot_details"] for row in self.client.get(MY_URL).data if row["status"] == "BOOKED"]
        self.assertEqual([(row["slot_date"], row["start_time"]) for row in booked], [(IN_TWO_DAYS.isoformat(), "11:00:00")])

    def test_refuses_slots_it_cannot_use(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        booked = self.booked_appointment(TOMORROW, "10:00")
        blocked = self.slot(TOMORROW, "11:00", status="BLOCKED")
        started = self.slot(TODAY, "11:45")
        other_doctors = self.slot(TOMORROW, "12:00", doctor=self.other_doctor)
        day_off = self.slot(IN_TWO_DAYS, "09:00")
        DoctorTimeOff.objects.create(doctor=self.doctor, start_date=IN_TWO_DAYS, end_date=IN_TWO_DAYS)

        for slot_id in (appointment.slot_id, booked.slot_id, blocked.slot_id, started.slot_id,
                        other_doctors.slot_id, day_off.slot_id, 999999, "soon"):
            with self.subTest(slot_id=slot_id):
                self.assertEqual(self.move(appointment, slot_id).status_code, 400)
        appointment.refresh_from_db()
        self.assertEqual(appointment.slot.slot_date, TOMORROW)
        self.assertEqual(appointment.slot.status, "BOOKED")

    @tag("security")
    def test_only_the_doctors_own_booked_appointments(self):
        appointment = self.booked_appointment(TOMORROW, "09:00")
        target = self.slot(IN_TWO_DAYS, "11:00")
        self.assertEqual(self.move(appointment, target.slot_id, user=self.other_doctor_user).status_code, 400)
        self.assertEqual(self.move(appointment, target.slot_id, user=self.patient_user).status_code, 403)
        self.login(self.doctor_user)
        self.client.post(doctor_action_url(appointment.appointment_id, "complete"))
        self.assertEqual(self.move(appointment, target.slot_id).status_code, 400)
        self.assertEqual(Doctor_slot.objects.get(pk=target.slot_id).status, "AVAILABLE")
