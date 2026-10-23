from rest_framework import serializers
from .models import Appointment, Doctor_slot


class DoctorSlotSerializer(serializers.ModelSerializer):
    doctor_first_name = serializers.CharField(
        source="doctor.user.first_name",
        read_only=True
    )
    doctor_last_name = serializers.CharField(
        source="doctor.user.last_name",
        read_only=True
    )

    class Meta:
        model = Doctor_slot
        fields = [
            "slot_id",
            "doctor_first_name",
            "doctor_last_name",
            "slot_date",
            "start_time",
            "end_time",
            "status",
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    slot_details = DoctorSlotSerializer(
        source="slot",
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            "appointment_id",
            "slot",
            "slot_details",
            "created_at",
            "updated_at",
            "status",
            "reason",
        ]
        read_only_fields = [
            "appointment_id",
            "created_at",
            "updated_at",
            "status",
        ]
