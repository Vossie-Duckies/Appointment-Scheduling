"""
Wording for dates, times and names in messages the API sends to people
(error messages and notifications), e.g. "Mon 16 Nov at 09:00".
"""
from django.utils import timezone


def fmt_time(value):
    return value.strftime("%H:%M")


def fmt_day(value):
    # The year is only added when it isn't this year.
    text = f"{value:%a} {value.day} {value:%b}"
    return text if value.year == timezone.localdate().year else f"{text} {value.year}"


def fmt_when(slot_date, start_time):
    return f"{fmt_day(slot_date)} at {fmt_time(start_time)}"


def fmt_range(start_date, end_date):
    if start_date == end_date:
        return fmt_day(start_date)
    return f"{fmt_day(start_date)} to {fmt_day(end_date)}"


def full_name(user):
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.email


def doctor_name(user):
    return f"Dr. {full_name(user)}"
