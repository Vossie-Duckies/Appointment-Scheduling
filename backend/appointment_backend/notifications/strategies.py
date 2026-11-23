from abc import ABC, abstractmethod
from appointment_backend.models import Notification
from .emails import send_email

class NotificationStrategy(ABC):
    @abstractmethod
    def send(self, user, appointment, message):
        pass

class InAppNotificationStrategy(NotificationStrategy):
    def send(self, user, appointment, message):
        Notification.objects.create(
            appointment = appointment,
            user = user,
            message = message,
            type = "in_app"
        )

class EmailNotificationStrategy(NotificationStrategy):
    # Sent once the change is saved, and a mail problem never stops the
    # request (see emails.py).
    def send (self, user, appointment, message):
        send_email(user, "Message about your appointment", message)

class SMSNotificationStrategy(NotificationStrategy):
    def send(self, user, appointment, message):
        # We lack the funds to implement sms but if funds
        # become a available then implement here
        # Sms provider can be implemented here 
        pass