
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from accounts.models import Patient
from .models import Doctor_slot, Appointment
from .serializers import DoctorSlotSerializer, AppointmentSerializer
from .services import book_appointment


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
            "staus": "Available"
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
        slot_date__gte=timezone.localdate(),
    ).select_related("doctor__user").order_by(
        "slot_date", "start_time"
    )

    return Response(list(slots.values(
        "slot_id",
        "doctor_id",
        "slot_date",
        "start_time",
        "end_time",
        "status",
    )))

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
