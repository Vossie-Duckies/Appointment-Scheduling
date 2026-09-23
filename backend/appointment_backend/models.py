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
    pass

class Doctor_slot(models.Models):
    pass

class Appointment(models.Models):
    pass

class Notification(models.Models):
    pass