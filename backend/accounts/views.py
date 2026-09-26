from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import User
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
type of data expected from front end
"""
@api_view(["POST"])
def register(request):

    first_name = request.data["first_name"]
    last_name = request.data ["last_name"]
    email = request.data ["email"]
    password = request.data ["password"]
    role = request.data ["role"]

    user = User.objects.create_user(
        email=email,
        password = password,
        first_name = first_name,
        last_name = last_name,
        role = role
    )
    return Response(
        {
            "message": "Account created successfully",
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,

        },
        status = status.HTTP_201_CREATED
    )