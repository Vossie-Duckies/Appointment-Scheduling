from .strategies import (
    InAppNotificationStrategy,
    EmailNotificationStrategy,
    SMSNotificationStrategy
)


class NotificationServices:

    strategies = {
        "IN_APP": InAppNotificationStrategy,
        "EMAIL": EmailNotificationStrategy,
        "SMS": SMSNotificationStrategy,
    }

    def __init__(self, notification_type):
        self.strategy = self.strategies[notification_type]()

    def notify(self, user, appointment, message):
        self.strategy.send(user, appointment, message)


    def change_strategy(self, notification_type):
        self.strategy = self.strategies[notification_type]()