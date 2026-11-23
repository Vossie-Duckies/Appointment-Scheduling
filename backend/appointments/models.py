from django.db import models
from accounts.models import User, Patient, Doctor


class Doctor_slot(models.Model):
    STATUSES =(
        ("AVAILABLE", "Available"),
        ("BOOKED", "Booked"),
        ("BLOCKED","Blocked"),
    )
    # For chekcking the time that can be verified outside the model
    slot_id = models.BigAutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUSES, default="AVAILABLE")

    # Meta class defines the behaviour of the models 
    class Meta:
        constraints =[
            # Enforces the constraint called slot time
            models.CheckConstraint(
                condition=models.Q(end_time__gt =models.F("start_time")),
                name = "check_slot_time"
            ),
            # Enforces the constraint called doctor slot
            models.UniqueConstraint(
                fields= ["doctor", "slot_date", "start_time", "end_time"],
                name="unique_doct_slot"
            ),
        ]
        
class Appointment(models.Model):
    STATUS =(
        ("BOOKED", "Booked"),
        ("CANCELLED", "Cancelled"),
        ("COMPLETED", "Completed"),
        ("NOSHOW", "NoShow"),
    )
    appointment_id = models.BigAutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    slot = models.OneToOneField(Doctor_slot, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="BOOKED")
    reason = models.TextField()


class DoctorTimeOff(models.Model):
    # Whole days a doctor is away (start_date to end_date, both included).
    # Slots on these days stay in the database but are hidden from patients
    # and cannot be booked, so removing the time off makes them bookable again.
    time_off_id = models.BigAutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="time_off")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="check_time_off_dates",
            ),
        ]