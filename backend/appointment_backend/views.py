
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from notifications.service import  NotificationServices
# Create your views here.

@api_view(["GET"])
def hello_world(request):
    return Response({"message": "Hello World"})

"""
The API view expects this json structured data to be sent
from frontend
{
    "type": "EMAIL",
    "appointment_id": 31"
}
This could be the json structure sent to this api which is
found in /api/send_notification
"""
@api_view(["POST"])
def send_notification(request):

    notification_type = request.data["type"]
    message = request.data["message"]
    user = request.user

    try:
        service = NotificationServices(notification_type)
        service.notify(user, message)

        return Response(
            {"message": "Notification sent successfully"},
            status=status.HTTP_200_OK
        )

    except Exception:
        return Response(
            {"error": "Failed to send notification"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
