from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Doctor_slot, Appointment

@transaction.atomic

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

def doctor_appointments(request):
    doctor = Doctor.objects.get(user=request.user)

    appointments = (
        Appointment.objects
        .filter(slot__doctor=doctor)
        .select_related(
            "patient__user",
            "slot",
        )
        .order_by("slot__slot_date", "slot__start_time")
    )
    data = []
    for appointment in appointments:
        item = {
            "appointment_id": appointment.appointment_id,
            "patient_name": (
                f"{appointment.patient.user.first_name} "
                f"{appointment.patient.user.last_name}"
            ),
            "patient_email": appointment.patient.user.email,
            "slot_date": appointment.slot.slot_date,
            "start_time": appointment.slot.start_time,
            "end_time": appointment.slot.end_time,
            "reason": appointment.reason,
            "status": appointment.status,
        }

        data.append(item)

    return Response(data, status=status.HTTP_200_OK)

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
Name is self explanitory and allows doctor to mark an appointment as a noshow
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

    return appointment
