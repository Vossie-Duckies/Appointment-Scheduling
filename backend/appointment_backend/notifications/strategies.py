from abc import ABC, abstractmethod
from appointment_backend.models import Notification

class NotificationStrategy(ABC):
    @abstractmethod
    def send(self, user, message):
        pass

class InAppNotificationStrategy(NotificationStrategy):
    def send(self, user, message):
        pass

class EmailNotificationStrategy(NotificationStrategy):
    def send (self, user, message):
        pass

class SMSNotificationStrategy(NotificationStrategy):
    def send(self, user, message):
        pass