from django.db import models
from accounts.models import User, Patient, Doctor
# Create your models here.


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

    

class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=False, null=False)
    type = models.CharField(max_length=30)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default= False)

