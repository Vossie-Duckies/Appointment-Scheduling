from .strategies import NotificationStrategy

class NotifcationServices:

    def __init__(self, strategy: NotificationStrategy):
        self.strategy = strategy

    def notfiy(self, user, message):
        self.straegy.send(user, message)