from django.urls import path, include
from .views import hello_world, register, login, create_doctor
from .profile_views import doctor_photos, profile, profile_photo


app_name='accounts'

urlpatterns=[
    path("hello/", hello_world),
    path("register/", register),
    path("login/", login),
    path("admin/doctors/", create_doctor),
    # The logged-in user's own details and optional photo (Profile tab).
    path("profile/", profile),
    path("profile/photo/", profile_photo),
    path("doctors/photos/", doctor_photos),
]
