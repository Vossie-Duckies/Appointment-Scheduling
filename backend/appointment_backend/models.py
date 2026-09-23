from django.db import models
from django.contrib.auth.hashers import make_password, check_password
# Create your models here.
class User(models.Model):
    def set_password(self, password):
        self.password_hash = make_password(password)

    def check_password(self, password):
        return check_password(password, self.password_hash)
    # Django expeccts two choices for some reason
    #(Value, Label)
    ROLES = (
        ("PATIENT", "Patient"),
        ("DOCTOR","Doctor"),
        ("ADMIN", "Admin"),
    )
    ACCOUNT_STATUSES = (
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("SUSPENDED", "Suspended"),
    )
    user_id = models.BigAutoField(primary_key=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.CharField(max_length=100, unique=True)
    password_hash = models.CharField(max_length=128)
    role = models.CharField(max_length=10, choices=ROLES)
    account_status = models.CharField(max_length=20, choices=ACCOUNT_STATUSES, default="ACTIVE")

class Patient(models.Models):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20)


class Doctor(models.Models):
    STATUSES =(
        ("AVAILABLE", "Available"),
        ("UNAVAILABLE", "Unavailable"),
        ("DELAYED", "Delayed"),
    )
    user_id = models.OneToOneField(User, on_delete=models.CASCADE)
    license_no = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUSES, default= "AVAILABLE")


class Administrator(models.Models):
    user_id = models.OneToOneField(User, on_delete=models.CASCADE)
    

class Doctor_slot(models.Models):
    STATUSES =(
        ("AVAILABLE", "Available"),
        ("BOOKED", "Booked"),
        ("BLOCKED","Blocked"),
    )
    # For chekcking the time that can be verified outside the model
    slot_id = models.BigAutoField(primary_key=True)
    doctor_id = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    slot_date = models.DateField()
    start_date = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUSES)

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
                name=" unique_doct_slot"
            ),
        ]
        
class Appointment(models.Models):
    STATUS =(
        ("BOOKED", "Boooked"),
        ("CANCELLED", "Cancelled"),
        ("COMPLETED", "Completed"),
        ("NOSHOW", "NoShow"),
    )
    appointment_id = models.BigAutoField(primary_key=True)
    patient_id = models.ForeignKey(Patient, on_delete=models.PROTECT)
    slot_id = models.OneToOneField(Doctor_slot, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="BOOKED")
    reason = models.TextField(null=True, blank=True)

    

class Notification(models.Models):
    notification_id = models.BigAutoField(primary_key=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=False, null=False)
    type = models.CharField(max_length=30)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default= False)

