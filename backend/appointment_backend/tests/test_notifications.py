from unittest import TestCase
from unittest.mock import Mock, patch

from django.test import override_settings, tag
from hypothesis import given, strategies as st

from appointment_backend.notifications.strategies import (
    InAppNotificationStrategy,
    EmailNotificationStrategy,
)


@tag("unit")
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


@tag("unit")
class TestEmailNotificationStrategy(TestCase):

    # Changed with real email (notifications/emails.py): the message is emailed
    # with a greeting and a "WaitLess:" subject, once the change is saved.
    @given(message=st.text())
    def test_email_handles_random_messages(self, message):

        user = Mock()
        user.email = "test@example.com"
        user.first_name = "Lerato"

        appointment = Mock()

        strategy = EmailNotificationStrategy()

        with override_settings(EMAIL_IN_BACKGROUND=True, EMAIL_NOTIFICATIONS=True), patch(
            # No database here, so run the "once it's saved" step straight away.
            "appointment_backend.notifications.emails.transaction.on_commit", side_effect=lambda send: send()
        ), patch(
            "appointment_backend.notifications.emails.threading.Thread"
        ) as mock_thread:

            strategy.send(user, appointment, message)

            mock_thread.assert_called_once()
            address, subject, body = mock_thread.call_args.kwargs["args"]
            self.assertEqual(address, "test@example.com")
            self.assertEqual(subject, "WaitLess: Message about your appointment")
            self.assertIn(message, body)
            self.assertTrue(body.startswith("Hi Lerato,"))
            mock_thread.return_value.start.assert_called_once()
