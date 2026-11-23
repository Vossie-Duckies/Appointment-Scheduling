from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from .models import User, Doctor, Patient
from .permissions import IsAdminRole
from .validators import first_error, validate_registration
from rest_framework_simplejwt.tokens import RefreshToken

DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try logging in instead."

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

Public registration creates PATIENT accounts only. Doctors are created by an
admin through create_doctor below, so a request with role DOCTOR or ADMIN is
rejected with HTTP 400 (it used to create an ADMIN account for anyone who
asked). Invalid or missing fields now return HTTP 400 with a readable
"message" instead of crashing with HTTP 500.
"""
@api_view(["POST"])
def register(request):
    cleaned, errors = validate_registration(request.data)
    if errors:
        return Response(
            {"message": first_error(errors), "errors": errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=cleaned["email"]).exists():
        return Response(
            {"message": DUPLICATE_EMAIL_MESSAGE, "errors": {"email": DUPLICATE_EMAIL_MESSAGE}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                first_name=cleaned["first_name"],
                last_name=cleaned["last_name"],
                role="PATIENT",
            )
            Patient.objects.create(
                user=user,
                date_of_birth=cleaned["date_of_birth"],
                gender=cleaned["gender"],
            )
    except IntegrityError:
        # Two sign-ups with the same email at the same moment.
        return Response(
            {"message": DUPLICATE_EMAIL_MESSAGE, "errors": {"email": DUPLICATE_EMAIL_MESSAGE}},
            status=status.HTTP_400_BAD_REQUEST,
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
            "refresh": str(refresh),
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
    email = str(request.data.get("email") or "").strip()
    password = request.data.get("password") or ""

    if not email or not password:
        return Response(
            {"message": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=email, password=password)
    if user is None:
        # Match the email case-insensitively, so "Jane@Example.com" can log in
        # to the account registered as "jane@example.com".
        account = User.objects.filter(email__iexact=email).first()
        if account is not None and account.email != email:
            user = authenticate(request, username=account.email, password=password)

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
