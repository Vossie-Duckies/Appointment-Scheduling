from datetime import date, datetime, time
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from appointment_backend.models import Notification
from appointment_backend.notifications import events
from .formatting import fmt_day
from .models import Doctor_slot, Appointment
from .schedule import starts_after, time_off_on

# Each change below also sends an in-app notification to the other person
# (appointment_backend/notifications/events.py). The notification is saved in
# the same transaction, so a change that fails sends nothing.


@transaction.atomic
def book_appointment(patient, slot_id, reason):
    try:
        slot = Doctor_slot.objects.select_for_update().get(
            slot_id=slot_id
        )
    except Doctor_slot.DoesNotExist:
        raise ValidationError({"slot": "This slot does not exist."})

    if slot.status != "AVAILABLE":
        raise ValidationError({"slot": "This slot is not available."})

    # Slots on a day the doctor has time off are hidden from patients.
    if time_off_on(slot.doctor_id, slot.slot_date) is not None:
        raise ValidationError({"slot": "This slot is not available."})

    slot_datetime = timezone.make_aware(
        timezone.datetime.combine(slot.slot_date, slot.start_time)
    )

    if slot_datetime <= timezone.localtime():
        raise ValidationError({
            "slot": "You cannot book a slot in the past."
        })
    try:
        appointment = Appointment.objects.get(slot=slot)
    except Appointment.DoesNotExist:
        appointment = Appointment.objects.create(
            patient=patient,
            slot=slot,
            reason=reason,
            status="BOOKED",
        )
    else:
        if appointment.status != "CANCELLED":
            raise ValidationError({
                "slot": "This slot already has an appointment."
            })

        appointment.patient = patient
        appointment.reason = reason
        appointment.status = "BOOKED"
        appointment.updated_at = timezone.now()
        appointment.save(update_fields=[
            "patient",
            "reason",
            "status",
            "updated_at",
        ])

    slot.status = "BOOKED"
    slot.save(update_fields=["status"])

    events.appointment_booked(appointment)
    return appointment


@transaction.atomic
def cancel_appointment(patient, appointment_id):
    try:
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("slot")
            .get(
                appointment_id=appointment_id,
                patient=patient,
            )
        )
    except Appointment.DoesNotExist:
        raise ValidationError({
            "appointment": "Appointment not found."
        })

    if appointment.status == "CANCELLED":
        raise ValidationError({
            "appointment": "This appointment is already cancelled."
        })

    if appointment.status == "COMPLETED":
        raise ValidationError({
            "appointment": "A completed appointment cannot be cancelled."
        })

    # New: a no-show could be "cancelled" too, which put its past slot back on
    # sale, and so could an appointment that had already started.
    if appointment.status != "BOOKED":
        raise ValidationError({
            "appointment": "Only booked appointments can be cancelled."
        })

    slot = appointment.slot
    if not starts_after(slot.slot_date, slot.start_time, timezone.now()):
        raise ValidationError({
            "appointment": "This appointment has already started, so it can't be cancelled."
        })

    appointment.status = "CANCELLED"
    appointment.updated_at = timezone.now()
    appointment.save(update_fields=["status", "updated_at"])

    slot.status = "AVAILABLE"
    slot.save(update_fields=["status"])

    events.appointment_cancelled(appointment)
    return appointment



"""
Allows doctor to mark an appointment as complete.
"""
@transaction.atomic
def complete_appointment(doctor, appointment_id):
    try:
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("slot")
            .get(
                appointment_id=appointment_id,
                slot__doctor=doctor,
            )
        )
    except Appointment.DoesNotExist:
        raise ValidationError({
            "appointment": "Appointment not found."
        })

    if appointment.status != "BOOKED":
        raise ValidationError({
            "appointment": "Only booked appointments can be completed."
        })

    appointment.status = "COMPLETED"
    appointment.updated_at = timezone.now()
    appointment.save(update_fields=["status", "updated_at"])

    return appointment


"""
Allows doctor to mark an appointment as a noshow
"""
@transaction.atomic
def mark_no_show(doctor, appointment_id):
    try:
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("slot")
            .get(
                appointment_id=appointment_id,
                slot__doctor=doctor,
            )
        )
    except Appointment.DoesNotExist:
        raise ValidationError({
            "appointment": "Appointment not found."
        })

    if appointment.status != "BOOKED":
        raise ValidationError({
            "appointment": "Only booked appointments can be marked as no-show."
        })

    appointment.status = "NOSHOW"
    appointment.updated_at = timezone.now()
    appointment.save(update_fields=["status", "updated_at"])

    events.appointment_no_show(appointment)
    return appointment


def _parse_new_time(slot_date, start_time):
    try:
        new_date = date.fromisoformat(str(slot_date))
        new_start = time.fromisoformat(str(start_time))
    except (TypeError, ValueError):
        raise ValidationError({
            "slot": "Use YYYY-MM-DD for the date and HH:MM for the time."
        })
    return new_date, new_start


"""
Lets a doctor move a booked appointment, in one of two ways:

- slot_id (what the app's Update screen sends): into one of the doctor's open
  slots. The old slot becomes open again, so other patients can book it.
- slot_date + start_time: to a time with no slot at all. The slot keeps its
  original length (e.g. 30 minutes) and moves, so the old time is no longer
  listed. Any slot at the new time, even an open one, is refused as an overlap.
"""
@transaction.atomic
def reschedule_appointment(doctor, appointment_id, slot_date=None, start_time=None, slot_id=None):
    if slot_id not in (None, ""):
        return _move_into_open_slot(doctor, appointment_id, slot_id)

    new_date, new_start = _parse_new_time(slot_date, start_time)

    try:
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("slot")
            .get(
                appointment_id=appointment_id,
                slot__doctor=doctor,
            )
        )
    except Appointment.DoesNotExist:
        raise ValidationError({
            "appointment": "Appointment not found."
        })

    if appointment.status != "BOOKED":
        raise ValidationError({
            "appointment": "Only booked appointments can be rescheduled."
        })

    slot = appointment.slot
    if (new_date, new_start) == (slot.slot_date, slot.start_time):
        raise ValidationError({
            "slot": "Choose a different date or time from the current one."
        })

    length = (
        datetime.combine(slot.slot_date, slot.end_time)
        - datetime.combine(slot.slot_date, slot.start_time)
    )
    new_start_at = datetime.combine(new_date, new_start)
    new_end_at = new_start_at + length

    if new_end_at.date() != new_date:
        raise ValidationError({
            "slot": "The appointment must finish on the same day."
        })

    if timezone.make_aware(new_start_at) <= timezone.now():
        raise ValidationError({
            "slot": "You cannot move an appointment into the past."
        })

    if time_off_on(doctor, new_date) is not None:
        raise ValidationError({
            "slot": f"{fmt_day(new_date)} is in your time off. Choose another day."
        })

    new_end = new_end_at.time()
    overlaps = (
        Doctor_slot.objects
        .filter(
            doctor=doctor,
            slot_date=new_date,
            start_time__lt=new_end,
            end_time__gt=new_start,
        )
        .exclude(pk=slot.pk)
        .exists()
    )
    if overlaps:
        raise ValidationError({
            "slot": "That time overlaps another slot in your schedule. Choose a different time."
        })

    old_date, old_start = slot.slot_date, slot.start_time
    slot.slot_date = new_date
    slot.start_time = new_start
    slot.end_time = new_end
    slot.save(update_fields=["slot_date", "start_time", "end_time"])

    appointment.updated_at = timezone.now()
    appointment.save(update_fields=["updated_at"])

    events.appointment_rescheduled(appointment, old_date, old_start)
    return appointment


def _move_into_open_slot(doctor, appointment_id, slot_id):
    # Runs inside reschedule_appointment's transaction.
    try:
        slot_id = int(slot_id)
    except (TypeError, ValueError):
        raise ValidationError({"slot": "Choose one of your open slots."})

    try:
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("patient")
            .get(appointment_id=appointment_id, slot__doctor=doctor)
        )
    except Appointment.DoesNotExist:
        raise ValidationError({"appointment": "Appointment not found."})

    if appointment.status != "BOOKED":
        raise ValidationError({"appointment": "Only booked appointments can be rescheduled."})

    old_slot = Doctor_slot.objects.select_for_update().get(pk=appointment.slot_id)
    if slot_id == old_slot.slot_id:
        raise ValidationError({"slot": "That is the appointment's current slot. Choose a different one."})

    # Locked like a booking, so a patient can't take this slot at the same moment.
    try:
        target = Doctor_slot.objects.select_for_update().get(slot_id=slot_id, doctor=doctor)
    except Doctor_slot.DoesNotExist:
        raise ValidationError({"slot": "That slot isn't in your schedule."})
    if target.status != "AVAILABLE":
        raise ValidationError({"slot": "That slot is no longer open. Choose another one."})
    if not starts_after(target.slot_date, target.start_time, timezone.now()):
        raise ValidationError({"slot": "That slot has already started. Choose a later one."})
    if time_off_on(doctor, target.slot_date) is not None:
        raise ValidationError({"slot": f"{fmt_day(target.slot_date)} is in your time off. Choose another day."})

    old_date, old_start = old_slot.slot_date, old_slot.start_time
    now = timezone.now()
    previous = Appointment.objects.select_for_update().filter(slot=target).first()
    if previous is None:
        appointment.slot = target
        appointment.updated_at = now
        appointment.save(update_fields=["slot", "updated_at"])
        moved = appointment
    else:
        if previous.status != "CANCELLED":
            raise ValidationError({"slot": "That slot already has an appointment."})
        # A slot keeps one appointment record, and a new booking reuses the
        # cancelled one (see book_appointment). Do the same here: copy this
        # appointment into that record, move its alerts across, then remove
        # the old copy.
        previous.patient = appointment.patient
        previous.reason = appointment.reason
        previous.status = "BOOKED"
        previous.updated_at = now
        previous.save(update_fields=["patient", "reason", "status", "updated_at"])
        Notification.objects.filter(appointment=appointment).update(appointment=previous)
        appointment.delete()
        moved = previous

    target.status = "BOOKED"
    target.save(update_fields=["status"])
    old_slot.status = "AVAILABLE"
    old_slot.save(update_fields=["status"])

    events.appointment_rescheduled(moved, old_date, old_start)
    return moved
