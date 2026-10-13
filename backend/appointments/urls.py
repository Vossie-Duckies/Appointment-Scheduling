
from django.urls import path
from . import views

urlpatterns = [
    path("slots/", views.available_slots, name="available-slots"),
    path("book/", views.book_appointment_view, name="book-appointment"),
    path("my/", views.my_appointments, name="my-appointments"),
    path("doctor/slots/",views.create_doctor_slot, name="create-doctor-slot",),
]
