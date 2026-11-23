
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from appointments.formatting import doctor_name, full_name
from appointments.models import Appointment
from .models import Notification
from .notifications.emails import send_email
from .notifications.service import  NotificationServices

INBOX_LIMIT = 50
MAX_MESSAGE_LENGTH = 500

# Create your views here.

@api_view(["GET"])
def hello_world(request):
    return Response({"message": "Hello World"})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def notifications(request):
    if request.method == "GET":
        return _inbox(request)
    return _send_notification(request)


"""
GET /api/notifications/ returns the logged-in user's newest 50 notifications
(the Alerts tab in the app):
{
    "unread_count": 2,
    "results": [
        {
            "notification_id": 7,
            "message": "New booking: Lerato Dlamini on Mon 16 Nov at 09:00.",
            "is_read": false,
            "sent_at": "2026-11-10T14:05:00Z",
            "appointment": {
                "appointment_id": 31,
                "slot_date": "2026-11-16",
                "start_time": "09:00:00",
                "end_time": "09:30:00",
                "status": "BOOKED",
                "with_name": "Lerato Dlamini"      # the other person: "Dr. ..." for patients
            }
        }
    ]
}
"""
def _inbox(request):
    user = request.user
    items = (
        Notification.objects
        .filter(user=user)
        .select_related("appointment__slot__doctor__user", "appointment__patient__user")
        .order_by("-sent_at", "-notification_id")[:INBOX_LIMIT]
    )
    return Response({
        "unread_count": _unread_count(user),
        "results": [_notification_row(user, item) for item in items],
    })


def _notification_row(user, item):
    appointment = item.appointment
    slot = appointment.slot
    if appointment.patient.user_id == user.pk:
        with_name = doctor_name(slot.doctor.user)
    else:
        with_name = full_name(appointment.patient.user)
    return {
        "notification_id": item.notification_id,
        "message": item.message,
        "is_read": item.is_read,
        "sent_at": item.sent_at,
        "appointment": {
            "appointment_id": appointment.appointment_id,
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": appointment.status,
            "with_name": with_name,
        },
    }


def _unread_count(user):
    return Notification.objects.filter(user=user, is_read=False).count()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    # Small and cheap, so the app can check it every 30 seconds for the tab badge.
    return Response({"unread_count": _unread_count(request.user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    updated = Notification.objects.filter(notification_id=notification_id, user=request.user).update(is_read=True)
    if not updated:
        return Response({"message": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"message": "Marked as read.", "unread_count": _unread_count(request.user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read.", "updated": updated, "unread_count": 0})


"""
POST /api/notifications/ sends a message about an appointment to the other
person on it. The app uses it for the doctor's "Running late" message.
{
    "type": "IN_APP",
    "appointment_id": 31,
    "message": "Running 15 minutes late"
}
-The type is the type of notiification
- For more details on notification types go to ./notification/strategies

Fixed during testing: this view always returned HTTP 500 because it called
notify(user, message) while NotificationServices.notify expects
(user, appointment, message). It now also needs a logged-in user, a known
type, a message and an appointment the user belongs to.

Changed with the Alerts tab: the notification used to go to the user who
sent it (a doctor reporting a delay notified themselves). It now goes to the
other person: the patient when the doctor sends it, the doctor when the
patient does.
"""
def _send_notification(request):

    notification_type = str(request.data.get("type") or "").upper()
    message = str(request.data.get("message") or "").strip()
    user = request.user

    if notification_type not in NotificationServices.strategies:
        return Response(
            {"message": "type must be one of: " + ", ".join(NotificationServices.strategies)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not message:
        return Response(
            {"message": "message is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(message) > MAX_MESSAGE_LENGTH:
        return Response(
            {"message": f"Keep the message to {MAX_MESSAGE_LENGTH} characters or fewer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        appointment = Appointment.objects.select_related(
            "patient__user", "slot__doctor__user"
        ).get(appointment_id=int(request.data.get("appointment_id")))
    except (TypeError, ValueError, Appointment.DoesNotExist):
        return Response(
            {"message": "Appointment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    patient_user = appointment.patient.user
    doctor_user = appointment.slot.doctor.user
    if user.pk not in (patient_user.pk, doctor_user.pk):
        return Response(
            {"message": "You are not part of this appointment."},
            status=status.HTTP_403_FORBIDDEN,
        )
    recipient = patient_user if user.pk == doctor_user.pk else doctor_user

    try:
        service = NotificationServices(notification_type)
        service.notify(recipient, appointment, message)
        if notification_type == "IN_APP":
            # Emailed too, so a waiting patient sees a "running late" message
            # without opening the app.
            sender = doctor_name(user) if user.pk == doctor_user.pk else full_name(user)
            send_email(recipient, f"Message from {sender}", message)

        return Response(
            {"message": "Notification sent successfully"},
            status=status.HTTP_200_OK
        )

    except Exception:
        return Response(
            {"error": "Failed to send notification"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
