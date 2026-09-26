from unittest import TestCase
from unittest.mock import Mock, patch

from hypothesis import given, strategies as st

from appointment_backend.notifications.strategies import (
    InAppNotificationStrategy,
    EmailNotificationStrategy,
)


class TestInAppNotificationStrategy(TestCase):

    @patch("appointment_backend.notifications.strategies.Notification.objects.create")
    def test_send_creates_notification(self, mock_create):

        user = Mock()
        appointment = Mock()
        message = "Your appointment has been confirmed."

        strategy = InAppNotificationStrategy()

        strategy.send(user, appointment, message)

        mock_create.assert_called_once_with(
            appointment=appointment,
            user=user,
            message=message,
            type="in_app"
        )


class TestEmailNotificationStrategy(TestCase):

    @given(message=st.text())
    def test_email_handles_random_messages(self, message):

        user = Mock()
        user.email = "test@example.com"

        appointment = Mock()

        strategy = EmailNotificationStrategy()

        with patch(
            "appointment_backend.notifications.strategies.send_mail"
        ) as mock_send_mail:

            strategy.send(user, appointment, message)

            mock_send_mail.assert_called_once_with(
                subject="Appointment Notification",
                message=message,
                from_email=None,
                recipient_list=["test@example.com"],
            )