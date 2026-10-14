from django.db import models
from accounts.models import User, Patient, Doctor
from appointments.models import Doctor_slot, Appointment
# Create your models here.


class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=False, null=False)
    type = models.CharField(max_length=30)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default= False)

