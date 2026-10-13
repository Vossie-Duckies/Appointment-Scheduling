from django.urls import path, include
from .views import hello_world, register, login, create_doctor


app_name='accounts'

urlpatterns=[
    path("hello/", hello_world),
    path("register/", register),  
    path("login/", login),
    path("admin/doctors/", create_doctor),
]

