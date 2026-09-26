from django.urls import path, include
from .views import hello_world, send_notification

urlpatterns =[
    path("hello/", hello_world),
    path('notifications/', send_notification)
]