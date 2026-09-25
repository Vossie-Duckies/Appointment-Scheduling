from abc import ABC, abstractmethod
from appointment_backend.models import Notification
from django.core.mail import send_mail

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
    def send (self, user, appointment, message):
        send_mail(
            subject = "Appointment Notification",
            message = message,
            from_email = None,
            recipient_list=[user.email],
        )

class SMSNotificationStrategy(NotificationStrategy):
    def send(self, user, appointment, message):
        # We lack the funds to implement sms but if funds
        # become a available then implement here
        # Sms provider can be implemented here 
        pass