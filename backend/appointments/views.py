from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from datetime import date, time
from accounts.models import Doctor
from accounts.permissions import IsDoctorRole
from accounts.models import Patient
from .models import Doctor_slot, Appointment
from .serializers import  AppointmentSerializer
from .services import book_appointment, cancel_appointment, complete_appointment, mark_no_show


""""
This allows the doctor to mark an appointment as completed
It returns the a H22P 200 OK and the following data
{
  "message": "Appointment marked as completed.",
  "appointment_id": 1,
  "status": "COMPLETED"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def complete_appointment_view(request, appointment_id):
    try:
        doctor = Doctor.objects.get(user=request.user)
    except Doctor.DoesNotExist:
        raise PermissionDenied("Your account has no doctor profile.")

    appointment = complete_appointment(
        doctor=doctor,
        appointment_id=appointment_id,
    )

    return Response(
        {
            "message": "Appointment marked as completed.",
            "appointment_id": appointment.appointment_id,
            "status": appointment.status,
        },
        status=status.HTTP_200_OK,
    )

"""
This allows the doctor to mark as no show 
It returns the a H22P 200 OK and the following data
{
  "message": "Appointment marked as no-show.",
  "appointment_id": 2,
  "status": "NOSHOW"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def mark_no_show_view(request, appointment_id):
    try:
        doctor = Doctor.objects.get(user=request.user)
    except Doctor.DoesNotExist:
        raise PermissionDenied("Your account has no doctor profile.")

    appointment = mark_no_show(
        doctor=doctor,
        appointment_id=appointment_id,
    )

    return Response(
        {
            "message": "Appointment marked as no-show.",
            "appointment_id": appointment.appointment_id,
            "status": appointment.status,
        },
        status=status.HTTP_200_OK,
    )

"""
This returns the appointments a doctor has 
It returns the following
[
  {
    "appointment_id": 1,
    "patient_name": "John Doe",
    "patient_email": "john@example.com",
    "slot_date": "2026-10-15",
    "start_time": "10:00:00",
    "end_time": "10:30:00",
    "reason": "General consultation",
    "status": "BOOKED"
  },
  {
    another appointment as above
  }
]
"""
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsDoctorRole])
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
It returns this from the database
{
    [
        {
            "slot_id": 1,
            "doctor_id": 3,
            "slot_date": "2026-10-14",
            "start_time": "09:00:00",
            "end_time": "09:30:00",
            "staus": "Available",
            "doctor_first_name": "Mang",
            "doctor_last_name": "Kemang""
        },
        {
            another slot as above
        }
    ]
}
so this returns an array of slots that are available 
"""
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_slots(request):
    slots = Doctor_slot.objects.filter(
        status="AVAILABLE",
        slot_date__gte=timezone.localdate()
    ).select_related("doctor__user").order_by(
        "slot_date", "start_time"
    )

    return Response(list(slots.values(
        "slot_id",
        "doctor_id",
        "doctor__user__first_name",
        "doctor__user__last_name",
        "slot_date",
        "start_time",
        "end_time",
        "status",
    ))
)
"""
Expects this data
{
    "slot_id": 1,
    "reason": "General consultation"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def book_appointment_view(request):
    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        raise PermissionDenied("Your account has no patient profile.")

    appointment = book_appointment(
        patient=patient,
        slot_id=request.data["slot_id"],
        reason=request.data["reason"],
    )

    return Response(
        {
            "appointment_id": appointment.appointment_id,
            "slot_id": appointment.slot_id,
            "reason": appointment.reason,
        },
        status=status.HTTP_201_CREATED
    )
"""
Cancels the appointment 
return HTTP 200 if it was succesful and the data below
{
  "message": "Appointment cancelled successfully.",
  "appointment_id": 2,
  "status": "CANCELLED"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_appointment_view(request, appointment_id):
    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        raise PermissionDenied("You do not have a patient profile.")

    appointment = cancel_appointment(
        patient=patient,
        appointment_id=appointment_id,
    )

    return Response(
        {
            "message": "Appointment cancelled successfully.",
            "appointment_id": appointment.appointment_id,
            "status": appointment.status,
        },
        status=status.HTTP_200_OK,
    )

"""
It returns all the appointment the user currently has 
[
  {
    "appointment_id": 1,
    "patient": 1,
    "slot": 2,
    "created_at": "2026-10-14T10:00:00Z",
    "status": "COMPLETED",
    "reason": "General consultation"
  },
  {
    another appointment as above if user as another appointment
  }
]
This is the data it will return 
"""
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_appointments(request):
    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        raise PermissionDenied("Your account has no patient profile.")

    appointments = Appointment.objects.filter(
        patient=patient
    ).select_related(
        "slot", "slot__doctor__user"
    ).order_by("-created_at")

    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data)

"""
This creates the doctor slot and needs this data
{
    "slot_date": "2026-10-15",
    "start_time": "09:00",
    "end_time": "09:30"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def create_doctor_slot(request):
    slot_date = request.data.get("slot_date")
    start_time = request.data.get("start_time")
    end_time = request.data.get("end_time")

    if not all([slot_date, start_time, end_time]):
        return Response(
            {"error": "slot_date, start_time and end_time are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        slot_date = date.fromisoformat(slot_date)
        start_time = time.fromisoformat(start_time)
        end_time = time.fromisoformat(end_time)
    except (ValueError, TypeError):
        return Response(
            {"error": "Use YYYY-MM-DD for the date and HH:MM for times."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if slot_date < timezone.localdate():
        return Response(
            {"error": "The slot date cannot be in the past."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if end_time <= start_time:
        return Response(
            {"error": "The end time must be later than the start time."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        doctor = Doctor.objects.get(user=request.user)
    except Doctor.DoesNotExist:
        raise PermissionDenied("Your account has no doctor profile.")
    try:
        with transaction.atomic():
            slot = Doctor_slot.objects.create(
                doctor=doctor,
                slot_date=slot_date,
                start_time=start_time,
                end_time=end_time,
                status="AVAILABLE",
            )
    except IntegrityError:
        return Response(
            {"error": "This slot conflicts with a database constraint."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "message": "Appointment slot created successfully.",
            "slot_id": slot.slot_id,
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": slot.status,
        },
        status=status.HTTP_201_CREATED,
    )

