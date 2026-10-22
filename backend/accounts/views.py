from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate, login as auth_login
from django.db import transaction
from .models import User, Doctor, Patient
from .permissions import IsAdminRole
from rest_framework_simplejwt.tokens import RefreshToken

# Create your views here.

@api_view(["GET"])
def hello_world(request):
    return Response({"message": "Hello World"})

"""
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "mypassword",
    "role": "PATIENT"
}
type of data expected from front end and more can be sent if its patient
{
    "date_of_birth": "2000-05-15",
    "gender": "Female"
}
"""
@api_view(["POST"])
@transaction.atomic
def register(request):
    first_name = request.data["first_name"]
    last_name = request.data["last_name"]
    email = request.data["email"]
    password = request.data["password"]
    role = request.data["role"]

    if role == "PATIENT":
        date_of_birth = request.data["date_of_birth"]
        gender = request.data["gender"]

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role
    )


    if user.role == "PATIENT":
        Patient.objects.create(
            user=user,
            date_of_birth=date_of_birth,
            gender=gender
        )
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    return Response(
        {
            "message": "Account created successfully",
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
            "access": str(access),
            "refresh": sr(refresh),
        },
        status=status.HTTP_201_CREATED
    )


"""
Expects this json data
{
    "email": "john@example.com",
    "password": "mypassword"
}
"""
@api_view(["POST"])
def login(request):
    email = request.data["email"]
    password = request.data["password"]
    user = authenticate(request, username=email, password = password)
    
    if user is None:
        return Response(
            {"message": "Invalid email or password"},
            status = status.HTTP_401_UNAUTHORIZED
        )
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    return Response(
        {
            "message": "Login successful",
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
            "access": str(access),
            "refresh": str(refresh),
        },
        status = status.HTTP_200_OK
    )

"""
This creates the account for a doctor 
I expects this type of data 
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "password": "DoctorTest123!",
  "license_no": "DOC-1002"
}
"""
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@transaction.atomic
def create_doctor(request):
    first_name = request.data.get("first_name")
    last_name = request.data.get("last_name")
    email = request.data.get("email")
    password = request.data.get("password")
    license_no = request.data.get("license_no")

    if not all([first_name, last_name, email, password, license_no]):
        return Response(
            {"error": "All fields are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if Doctor.objects.filter(license_no=license_no).exists():
        return Response(
            {"error": "This licence number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role="DOCTOR",
    )
    doctor = Doctor.objects.create(
        user=user,
        license_no=license_no,
    )

    return Response(
        {
            "message": "Doctor created successfully.",
            "user_id": user.user_id,
            "doctor_id": doctor.pk,
            "email": user.email,
            "role": user.role,
        },
        status=status.HTTP_201_CREATED,
    )
