from abc import ABC, abstractmethod
from appointment_backend.models import Notification

class NotificationStrategy(ABC):
    @abstractmethod
    def send(self, user, message):
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
    def send (self, user, message):
        send_mail(
            subject = "Appointment Notification",
            message = message,
            from_email = None,
            recipient_list=[user.email],
        )

class SMSNotificationStrategy(NotificationStrategy):
    def send(self, user, message):
        #Needs money and we broke
        pass