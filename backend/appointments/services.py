
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Doctor_slot, Appointment


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

    slot_datetime = timezone.make_aware(
        timezone.datetime.combine(slot.slot_date, slot.start_time)
    )

    if slot_datetime <= timezone.localtime():
        raise ValidationError({"slot": "You cannot book a slot in the past."})

    appointment = Appointment.objects.create(
        patient=patient,
        slot=slot,
        reason=reason,
        status="BOOKED",
    )

    slot.status = "BOOKED"
    slot.save(update_fields=["status"])

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

    appointment.status = "CANCELLED"
    appointment.updated_at = timezone.now()
    appointment.save(update_fields=["status", "updated_at"])

    slot = appointment.slot
    slot.status = "AVAILABLE"
    slot.save(update_fields=["status"])

    return appointment
