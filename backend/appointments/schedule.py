"""
Doctor schedule rules: a doctor's own slots, adding one slot or weekly hours,
blocking and deleting slots, and time off.

All dates and times are local clinic time (settings.TIME_ZONE), like the rest
of the API. Weekdays are numbered like Python's date.weekday(): Monday is 0
and Sunday is 6.
"""
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from accounts.models import Doctor
from .formatting import fmt_day, fmt_range, fmt_time, full_name
from .models import Appointment, Doctor_slot, DoctorTimeOff

MAX_WEEKS = 12
MAX_SLOTS_PER_REQUEST = 1000
MIN_SLOT_MINUTES = 5
MAX_SLOT_MINUTES = 240
MAX_LIST_DAYS = 92
MAX_TIME_OFF_DAYS = 366
MAX_REASON_LENGTH = 100


def bad_request(message):
    # Rendered as {"message": "..."} with HTTP 400.
    return ValidationError({"message": message})


def doctor_for(user):
    try:
        return Doctor.objects.get(user=user)
    except Doctor.DoesNotExist:
        raise PermissionDenied("Your account has no doctor profile.")


# ---- reading request values -------------------------------------------------

def parse_date(value, label):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise bad_request(f"Use YYYY-MM-DD for the {label}.")


def parse_time(value, label):
    try:
        return time.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise bad_request(f"Use HH:MM for the {label}, e.g. 09:00.")


def parse_int(value, label, low, high, default=None):
    if value in (None, "") and default is not None:
        return default
    if isinstance(value, bool) or (isinstance(value, float) and not value.is_integer()):
        raise bad_request(f"{label} must be a whole number.")
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise bad_request(f"{label} must be a whole number.")
    if not low <= number <= high:
        raise bad_request(f"{label} must be between {low} and {high}.")
    return number


def parse_weekdays(value):
    if not isinstance(value, (list, tuple)) or not value:
        raise bad_request("Choose at least one day of the week.")
    days = set()
    for item in value:
        days.add(parse_int(item, "Each day", 0, 6))
    return sorted(days)


def parse_weekly_hours(data, with_length):
    """The shared fields of "add weekly hours" and "remove weekly hours"."""
    today = timezone.localdate()
    start_date = parse_date(data.get("start_date") or today.isoformat(), "start date")
    if start_date < today:
        raise bad_request("The start date can't be in the past.")
    values = {
        "weekdays": parse_weekdays(data.get("weekdays")),
        "start_time": parse_time(data.get("start_time"), "start time"),
        "end_time": parse_time(data.get("end_time"), "end time"),
        "start_date": start_date,
        "weeks": parse_int(data.get("weeks"), "Weeks", 1, MAX_WEEKS, default=4),
    }
    if values["end_time"] <= values["start_time"]:
        raise bad_request("The end time must be later than the start time.")
    if with_length:
        values["slot_minutes"] = parse_int(
            data.get("slot_minutes"), "Slot length", MIN_SLOT_MINUTES, MAX_SLOT_MINUTES, default=30
        )
    return values


# ---- small helpers ----------------------------------------------------------

def overlaps(start_a, end_a, start_b, end_b):
    return start_a < end_b and start_b < end_a


def slot_times(start_time, end_time, minutes):
    """Back-to-back slots from start to end, e.g. 09:00-09:30, 09:30-10:00.
    A leftover shorter than one slot is not used."""
    length = timedelta(minutes=minutes)
    day = date(2000, 1, 1)
    current = datetime.combine(day, start_time)
    finish = datetime.combine(day, end_time)
    times = []
    while current + length <= finish:
        times.append((current.time(), (current + length).time()))
        current += length
    return times


def pattern_dates(start_date, weeks, weekdays):
    days = (start_date + timedelta(days=offset) for offset in range(weeks * 7))
    return [day for day in days if day.weekday() in weekdays]


def last_pattern_date(start_date, weeks):
    return start_date + timedelta(days=weeks * 7 - 1)


def starts_after(slot_date, start_time, moment):
    return timezone.make_aware(datetime.combine(slot_date, start_time)) > moment


def time_off_on(doctor, day):
    """The doctor's time off that covers this day, or None."""
    return DoctorTimeOff.objects.filter(doctor=doctor, start_date__lte=day, end_date__gte=day).first()


def without_time_off(slots):
    """Leaves out slots on days their doctor has time off."""
    return slots.exclude(Exists(DoctorTimeOff.objects.filter(
        doctor=OuterRef("doctor"),
        start_date__lte=OuterRef("slot_date"),
        end_date__gte=OuterRef("slot_date"),
    )))


def lock_schedule(doctor):
    # One schedule change per doctor at a time (a no-op on SQLite, which
    # already runs one write at a time).
    Doctor.objects.select_for_update().filter(pk=doctor.pk).first()


def _appointment_of(slot):
    try:
        return slot.appointment
    except Appointment.DoesNotExist:
        return None


def booked_between(doctor, start_date, end_date):
    return (
        Appointment.objects
        .filter(
            slot__doctor=doctor,
            status="BOOKED",
            slot__slot_date__gte=start_date,
            slot__slot_date__lte=end_date,
        )
        .select_related("patient__user", "slot")
        .order_by("slot__slot_date", "slot__start_time")
    )


# ---- rows sent to the app ---------------------------------------------------

def slot_row(slot, time_off):
    appointment = _appointment_of(slot)
    current = appointment if appointment is not None and appointment.status != "CANCELLED" else None
    return {
        "slot_id": slot.slot_id,
        "slot_date": slot.slot_date,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "status": slot.status,
        "on_time_off": any(off.start_date <= slot.slot_date <= off.end_date for off in time_off),
        # A slot with any appointment on record (even a cancelled one) is
        # kept, because the appointment row points at it.
        "can_delete": slot.status != "BOOKED" and appointment is None,
        "appointment": None if current is None else {
            "appointment_id": current.appointment_id,
            "patient_name": full_name(current.patient.user),
            "reason": current.reason,
            "status": current.status,
        },
    }


def booked_row(appointment):
    return {
        "appointment_id": appointment.appointment_id,
        "patient_name": full_name(appointment.patient.user),
        "slot_date": appointment.slot.slot_date,
        "start_time": appointment.slot.start_time,
        "end_time": appointment.slot.end_time,
    }


def time_off_row(off):
    return {
        "time_off_id": off.time_off_id,
        "start_date": off.start_date,
        "end_date": off.end_date,
        "reason": off.reason,
        "booked_appointments": [booked_row(a) for a in booked_between(off.doctor_id, off.start_date, off.end_date)],
    }


# ---- slots ------------------------------------------------------------------

def list_slots(doctor, from_date, to_date):
    """The doctor's slots between two dates that haven't finished yet, with
    the doctor's time off in that period."""
    now = timezone.localtime()
    from_date = max(from_date, now.date())
    time_off = list(DoctorTimeOff.objects.filter(doctor=doctor, start_date__lte=to_date, end_date__gte=from_date))
    slots = (
        Doctor_slot.objects
        .filter(doctor=doctor, slot_date__gte=from_date, slot_date__lte=to_date)
        .exclude(slot_date=now.date(), end_time__lte=now.time())
        .select_related("appointment__patient__user")
        .order_by("slot_date", "start_time")
    )
    return {
        "from": from_date,
        "to": to_date,
        "slots": [slot_row(slot, time_off) for slot in slots],
        "time_off": [
            {"time_off_id": off.time_off_id, "start_date": off.start_date, "end_date": off.end_date, "reason": off.reason}
            for off in time_off
        ],
    }


@transaction.atomic
def create_slot(doctor, slot_date, start_time, end_time):
    lock_schedule(doctor)
    if not starts_after(slot_date, start_time, timezone.now()):
        raise bad_request("The slot must start later than now.")
    off = time_off_on(doctor, slot_date)
    if off is not None:
        raise bad_request(
            f"{fmt_day(slot_date)} is in your time off ({fmt_range(off.start_date, off.end_date)}). "
            "Remove the time off first to add slots on that day."
        )
    clash = (
        Doctor_slot.objects
        .filter(doctor=doctor, slot_date=slot_date, start_time__lt=end_time, end_time__gt=start_time)
        .order_by("start_time")
        .first()
    )
    if clash is not None:
        raise bad_request(
            f"This overlaps your {fmt_time(clash.start_time)}-{fmt_time(clash.end_time)} slot on {fmt_day(slot_date)}."
        )
    return Doctor_slot.objects.create(
        doctor=doctor, slot_date=slot_date, start_time=start_time, end_time=end_time, status="AVAILABLE"
    )


def _own_slot(doctor, slot_id):
    try:
        return Doctor_slot.objects.select_for_update().get(slot_id=slot_id, doctor=doctor)
    except Doctor_slot.DoesNotExist:
        raise NotFound({"message": "Slot not found."})


@transaction.atomic
def block_slot(doctor, slot_id):
    slot = _own_slot(doctor, slot_id)
    if slot.status == "BLOCKED":
        raise bad_request("This slot is already blocked.")
    if slot.status == "BOOKED":
        raise bad_request("This slot is booked. Reschedule the appointment before blocking the slot.")
    if not starts_after(slot.slot_date, slot.start_time, timezone.now()):
        raise bad_request("This slot has already started.")
    slot.status = "BLOCKED"
    slot.save(update_fields=["status"])
    return slot


@transaction.atomic
def unblock_slot(doctor, slot_id):
    slot = _own_slot(doctor, slot_id)
    if slot.status != "BLOCKED":
        raise bad_request("This slot isn't blocked.")
    if not starts_after(slot.slot_date, slot.start_time, timezone.now()):
        raise bad_request("This slot has already started.")
    slot.status = "AVAILABLE"
    slot.save(update_fields=["status"])
    return slot


@transaction.atomic
def delete_slot(doctor, slot_id):
    slot = _own_slot(doctor, slot_id)
    if slot.status == "BOOKED":
        raise bad_request("This slot is booked, so it can't be deleted. Reschedule the appointment first.")
    if Appointment.objects.filter(slot=slot).exists():
        raise bad_request("This slot has a cancelled appointment on record, so it can't be deleted. Block it instead.")
    slot.delete()


# ---- weekly hours -----------------------------------------------------------

@transaction.atomic
def add_weekly_hours(doctor, weekdays, start_time, end_time, slot_minutes, start_date, weeks):
    """Creates open slots for the chosen days and hours, week after week.
    Skips times that have passed, times that overlap a slot the doctor
    already has, and days in the doctor's time off."""
    times = slot_times(start_time, end_time, slot_minutes)
    if not times:
        raise bad_request("These hours are shorter than one slot. Choose a longer time range or shorter slots.")
    days = pattern_dates(start_date, weeks, weekdays)
    if len(days) * len(times) > MAX_SLOTS_PER_REQUEST:
        raise bad_request(
            f"That would add more than {MAX_SLOTS_PER_REQUEST} slots at once. Choose fewer weeks or longer slots."
        )

    lock_schedule(doctor)
    end_date = last_pattern_date(start_date, weeks)
    now = timezone.now()
    time_off = list(DoctorTimeOff.objects.filter(doctor=doctor, start_date__lte=end_date, end_date__gte=start_date))
    existing = defaultdict(list)
    for slot in Doctor_slot.objects.filter(doctor=doctor, slot_date__gte=start_date, slot_date__lte=end_date):
        existing[slot.slot_date].append((slot.start_time, slot.end_time))

    new_slots = []
    skipped_overlapping = skipped_past = days_off = 0
    for day in days:
        if any(off.start_date <= day <= off.end_date for off in time_off):
            days_off += 1
            continue
        for start, end in times:
            if not starts_after(day, start, now):
                skipped_past += 1
            elif any(overlaps(start, end, s, e) for s, e in existing[day]):
                skipped_overlapping += 1
            else:
                new_slots.append(Doctor_slot(
                    doctor=doctor, slot_date=day, start_time=start, end_time=end, status="AVAILABLE"
                ))
    Doctor_slot.objects.bulk_create(new_slots)

    created = len(new_slots)
    parts = [f"Added {created} slot{'' if created == 1 else 's'}." if created else "No new slots were added."]
    if skipped_overlapping:
        parts.append(f"{skipped_overlapping} overlapped slots you already have.")
    if skipped_past:
        parts.append(f"{skipped_past} had already started.")
    if days_off:
        parts.append(f"{days_off} day{'' if days_off == 1 else 's'} skipped for your time off.")
    return {
        "message": " ".join(parts),
        "created": created,
        "skipped_overlapping": skipped_overlapping,
        "skipped_past": skipped_past,
        "skipped_time_off_days": days_off,
    }


@transaction.atomic
def remove_weekly_hours(doctor, weekdays, start_time, end_time, start_date, weeks):
    """Deletes slots inside the chosen hours on the chosen days that nobody
    has booked. Booked slots, and slots with an appointment on record, stay."""
    lock_schedule(doctor)
    now = timezone.localtime()
    in_window = (
        Doctor_slot.objects
        .filter(
            doctor=doctor,
            slot_date__gte=start_date,
            slot_date__lte=last_pattern_date(start_date, weeks),
            slot_date__iso_week_day__in=[day + 1 for day in weekdays],
            start_time__gte=start_time,
            end_time__lte=end_time,
        )
        .exclude(slot_date=now.date(), start_time__lte=now.time())
    )
    removable = (
        in_window
        .filter(status__in=["AVAILABLE", "BLOCKED"])
        .exclude(Exists(Appointment.objects.filter(slot=OuterRef("pk"))))
    )
    total = in_window.count()
    removed = removable.count()
    removable.delete()
    kept = total - removed

    parts = [f"Removed {removed} slot{'' if removed == 1 else 's'}." if removed else "No slots were removed."]
    if kept:
        parts.append(f"Kept {kept} that {'is' if kept == 1 else 'are'} booked or {'has' if kept == 1 else 'have'} an appointment on record.")
    return {"message": " ".join(parts), "removed": removed, "kept": kept}


# ---- time off ---------------------------------------------------------------

def list_time_off(doctor):
    """Current and upcoming time off, soonest first."""
    today = timezone.localdate()
    return [time_off_row(off) for off in DoctorTimeOff.objects.filter(doctor=doctor, end_date__gte=today)]


@transaction.atomic
def add_time_off(doctor, start_date, end_date, reason):
    lock_schedule(doctor)
    if start_date < timezone.localdate():
        raise bad_request("Time off can't start in the past.")
    if end_date < start_date:
        raise bad_request("The last day of time off can't be before the first day.")
    if (end_date - start_date).days + 1 > MAX_TIME_OFF_DAYS:
        raise bad_request(f"Time off can be at most {MAX_TIME_OFF_DAYS} days at a time.")
    reason = (reason or "").strip()
    if len(reason) > MAX_REASON_LENGTH:
        raise bad_request(f"Keep the reason to {MAX_REASON_LENGTH} characters or fewer.")
    clash = DoctorTimeOff.objects.filter(doctor=doctor, start_date__lte=end_date, end_date__gte=start_date).first()
    if clash is not None:
        raise bad_request(
            f"This overlaps your time off on {fmt_range(clash.start_date, clash.end_date)}. "
            "Remove that one first or choose other days."
        )
    off = DoctorTimeOff.objects.create(doctor=doctor, start_date=start_date, end_date=end_date, reason=reason)
    return off


@transaction.atomic
def delete_time_off(doctor, time_off_id):
    deleted, _ = DoctorTimeOff.objects.filter(time_off_id=time_off_id, doctor=doctor).delete()
    if not deleted:
        raise NotFound({"message": "Time off not found."})
