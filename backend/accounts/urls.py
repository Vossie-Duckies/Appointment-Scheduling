from django.urls import path, include
from .views import hello_world, register


app_name='accounts'

urlpatterns=[
    path("hello/", hello_world),
    path("register/", register),  
]

