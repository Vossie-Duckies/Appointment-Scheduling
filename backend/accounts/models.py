from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)

        user = self.model( email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        user = self.create_user( email=email, password=password, **extra_fields)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
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
    email = models.EmailField(max_length=100, unique=True)
    role = models.CharField(max_length=10, choices=ROLES)
    account_status = models.CharField(max_length=20, choices=ACCOUNT_STATUSES, default="ACTIVE")

    is_staff = models.BooleanField(default=False)
    objects = UserManager()
    USERNAME_FIELD = "email"

    REQUIRED_FIELDS =["first_name", "last_name", "role",]
    
    def __str__(self):
        return self.email

class Patient(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20)


class Doctor(models.Model):
    STATUSES =(
        ("AVAILABLE", "Available"),
        ("UNAVAILABLE", "Unavailable"),
        ("DELAYED", "Delayed"),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    license_no = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUSES, default= "AVAILABLE")


class Administrator(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    