"""
Creates repeatable test data for manual testing of the mobile app.

    python manage.py seed_test_data            # slots for the next 5 days
    python manage.py seed_test_data --days 10  # slots for the next 10 days

Safe to run more than once: existing test accounts get their passwords reset
and existing slots are reused, so nothing is duplicated.
"""
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Administrator, Doctor, Patient, User
from appointments.models import Appointment, Doctor_slot

ACCOUNTS = [
    # email, password, first name, last name, role
    ("admin@test.com", "Admin123!", "Ayanda", "Admin", "ADMIN"),
    ("doctor@test.com", "Doctor123!", "Thabo", "Mokoena", "DOCTOR"),
    ("doctor2@test.com", "Doctor123!", "Sarah", "Naidoo", "DOCTOR"),
    ("patient@test.com", "Patient123!", "Lerato", "Dlamini", "PATIENT"),
]

DAILY_TIMES = [
    (time(9, 0), time(9, 30)),
    (time(10, 0), time(10, 30)),
    (time(14, 0), time(14, 30)),
]


class Command(BaseCommand):
    help = "Create test accounts, doctor slots and sample appointments for manual testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=5,
            help="How many days ahead to create bookable slots for (default 5).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        users = {email: self._user(email, pw, first, last, role) for email, pw, first, last, role in ACCOUNTS}

        Administrator.objects.get_or_create(user=users["admin@test.com"])
        doctor_1, _ = Doctor.objects.get_or_create(
            user=users["doctor@test.com"], defaults={"license_no": "DOC-1001"}
        )
        doctor_2, _ = Doctor.objects.get_or_create(
            user=users["doctor2@test.com"], defaults={"license_no": "DOC-1002"}
        )
        patient, _ = Patient.objects.get_or_create(
            user=users["patient@test.com"],
            defaults={"date_of_birth": date(2000, 5, 15), "gender": "Female"},
        )

        new_slots = 0
        for offset in range(1, options["days"] + 1):
            day = today + timedelta(days=offset)
            for doctor in (doctor_1, doctor_2):
                for start, end in DAILY_TIMES:
                    _, created = Doctor_slot.objects.get_or_create(
                        doctor=doctor, slot_date=day, start_time=start, end_time=end
                    )
                    new_slots += int(created)

        # A completed visit last week, so the patient's Past tab has an entry.
        past_slot, _ = Doctor_slot.objects.get_or_create(
            doctor=doctor_1,
            slot_date=today - timedelta(days=7),
            start_time=time(11, 0),
            end_time=time(11, 30),
            defaults={"status": "BOOKED"},
        )
        Appointment.objects.get_or_create(
            slot=past_slot,
            defaults={"patient": patient, "reason": "Follow-up check", "status": "COMPLETED"},
        )

        # A booked visit in 3 days, so Dr Mokoena's screens have an entry.
        upcoming_slot, _ = Doctor_slot.objects.get_or_create(
            doctor=doctor_1,
            slot_date=today + timedelta(days=3),
            start_time=time(15, 0),
            end_time=time(15, 30),
            defaults={"status": "BOOKED"},
        )
        Appointment.objects.get_or_create(
            slot=upcoming_slot,
            defaults={"patient": patient, "reason": "General consultation", "status": "BOOKED"},
        )

        self.stdout.write(self.style.SUCCESS(f"Test data ready ({new_slots} new slots)."))
        self.stdout.write("Log in to the app with:")
        for email, password, first, last, role in ACCOUNTS:
            self.stdout.write(f"  {role:<8} {email:<18} {password:<12} ({first} {last})")

    def _user(self, email, password, first_name, last_name, role):
        user = User.objects.filter(email=email).first()
        if user is None:
            create = User.objects.create_superuser if role == "ADMIN" else User.objects.create_user
            return create(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
            )
        user.set_password(password)
        user.role = role
        user.account_status = "ACTIVE"
        user.save()
        return user
