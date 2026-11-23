"""
The logged-in user's own profile (the app's Profile tab).

    GET    /account/profile/         name, surname, email, role and photo; plus gender
                                     and date of birth for patients, licence number for doctors
    POST   /account/profile/photo/   upload or replace the photo (multipart form, field "photo")
    DELETE /account/profile/photo/   remove the photo

The photo is optional. It comes back in the profile as a data: URI (or null),
so the app can show it without a second, separately authenticated request.

{
    "user_id": 7,
    "first_name": "Lerato",
    "last_name": "Dlamini",
    "email": "patient@test.com",
    "role": "PATIENT",
    "gender": "Female",
    "date_of_birth": "1995-03-14",
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
}
"""
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Doctor, Patient, ProfilePhoto
from .photos import as_data_uri, process_photo


def profile_data(user):
    photo = ProfilePhoto.objects.filter(user=user).values_list("image", flat=True).first()
    data = {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role,
        "photo": as_data_uri(photo) if photo else None,
    }
    if user.role == "PATIENT":
        patient = Patient.objects.filter(user=user).first()
        data["gender"] = patient.gender if patient else None
        data["date_of_birth"] = patient.date_of_birth if patient else None
    elif user.role == "DOCTOR":
        doctor = Doctor.objects.filter(user=user).first()
        data["license_no"] = doctor.license_no if doctor else None
    return data


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response(profile_data(request.user))


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_photo(request):
    if request.method == "DELETE":
        ProfilePhoto.objects.filter(user=request.user).delete()
        return Response({"message": "Photo removed.", "profile": profile_data(request.user)})

    upload = request.FILES.get("photo")
    if upload is None:
        return Response({"message": "Choose a photo to upload."}, status=status.HTTP_400_BAD_REQUEST)
    image = process_photo(upload)
    ProfilePhoto.objects.update_or_create(user=request.user, defaults={"image": image})
    return Response({"message": "Photo saved.", "profile": profile_data(request.user)})
MAX_PHOTO_IDS = 50


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_photos(request):
    """GET /account/doctors/photos/?ids=3,5 -> {"photos": {"3": "data:image/jpeg;base64,..."}}
    Doctors' photos for the doctor cards. Doctors without a photo are left out.
    Only doctors' photos are shared; a patient's photo is only sent to that patient."""
    ids = []
    for part in request.query_params.get("ids", "").split(","):
        part = part.strip()
        if part.isdigit() and int(part) not in ids:
            ids.append(int(part))
    if len(ids) > MAX_PHOTO_IDS:
        return Response({"message": f"Ask for at most {MAX_PHOTO_IDS} doctors at a time."},
                        status=status.HTTP_400_BAD_REQUEST)
    rows = ProfilePhoto.objects.filter(
        user__doctor__id__in=ids, user__role="DOCTOR", user__account_status="ACTIVE",
    ).values_list("user__doctor__id", "image")
    return Response({"photos": {str(doctor_id): as_data_uri(image) for doctor_id, image in rows}})