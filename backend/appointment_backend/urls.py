from django.urls import path, include
from .views import (
    hello_world,
    mark_all_notifications_read,
    mark_notification_read,
    notifications,
    unread_count,
)

urlpatterns =[
    path("hello/", hello_world),
    # GET: your notifications (newest 50). POST: message the other person on an appointment.
    path('notifications/', notifications),
    path('notifications/unread-count/', unread_count),
    path('notifications/read-all/', mark_all_notifications_read),
    path('notifications/<int:notification_id>/read/', mark_notification_read),
]
