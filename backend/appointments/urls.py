from django.urls import path
from . import schedule_views, views

urlpatterns = [
    path("slots/", views.available_slots, name="available-slots"),
    path("book/", views.book_appointment_view, name="book-appointment"),
    path("my/", views.my_appointments, name="my-appointments"),
    path("<int:appointment_id>/cancel/",views.cancel_appointment_view,name="cancel-appointment"),
    path("doctor/appointments/", views.doctor_appointments, name="doctor-appointments"),
    path("doctor/appointments/<int:appointment_id>/complete/", views.complete_appointment_view, name="complete-appointment"),
    path("doctor/appointments/<int:appointment_id>/no-show/", views.mark_no_show_view, name="mark-no-show"),
    path("doctor/appointments/<int:appointment_id>/reschedule/", views.reschedule_appointment_view, name="reschedule-appointment"),

    # Doctor schedule (see schedule_views.py). GET lists own slots, POST adds one.
    path("doctor/slots/", schedule_views.doctor_slots, name="create-doctor-slot"),
    path("doctor/slots/weekly/", schedule_views.add_weekly_hours_view, name="add-weekly-hours"),
    path("doctor/slots/weekly/remove/", schedule_views.remove_weekly_hours_view, name="remove-weekly-hours"),
    path("doctor/slots/<int:slot_id>/", schedule_views.delete_slot_view, name="delete-doctor-slot"),
    path("doctor/slots/<int:slot_id>/block/", schedule_views.block_slot_view, name="block-doctor-slot"),
    path("doctor/slots/<int:slot_id>/unblock/", schedule_views.unblock_slot_view, name="unblock-doctor-slot"),
    path("doctor/time-off/", schedule_views.time_off_view, name="doctor-time-off"),
    path("doctor/time-off/<int:time_off_id>/", schedule_views.delete_time_off_view, name="delete-doctor-time-off"),
]
