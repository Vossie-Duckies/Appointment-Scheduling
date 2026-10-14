
from django.urls import path
from . import views

urlpatterns = [
    path("slots/", views.available_slots, name="available-slots"),
    path("book/", views.book_appointment_view, name="book-appointment"),
    path("my/", views.my_appointments, name="my-appointments"),
    path("doctor/slots/",views.create_doctor_slot, name="create-doctor-slot"),
    path("<int:appointment_id>/cancel/",views.cancel_appointment_view,name="cancel-appointment"),
    path("doctor/appointments/", views.doctor_appointments, name="doctor-appointments"),
    path("doctor/appointments/<int:appointment_id>/complete/", views.complete_appointment_view, name="complete-appointment"),
    path("doctor/appointments/<int:appointment_id>/no-show/", views.mark_no_show_view, name="mark-no-show"),
    
]
