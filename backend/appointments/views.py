
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_slots(request):
    slots = Doctor_slot.objects.filter(
        status="AVAILABLE",
        slot_date__gte=timezone.localdate(),
    ).select_related("doctor__user").order_by(
        "slot_date", "start_time"
    )

    serializer = DoctorSlotSerializer(slots, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def book_appointment_view(request):
    if request.user.role != "PATIENT":
        raise PermissionDenied("Only patients can book appointments.")

    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        raise PermissionDenied("Your account has no patient profile.")

    serializer = AppointmentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    appointment = book_appointment(
        patient=patient,
        slot_id=serializer.validated_data["slot"].slot_id,
        reason=serializer.validated_data["reason"],
    )

    output = AppointmentSerializer(appointment)
    return Response(output.data, status=status.HTTP_201_CREATED)


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
