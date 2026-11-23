"""
Emails that go out with the in-app alerts (the Alerts tab):

    patient books           -> doctor, plus a confirmation to the patient
    patient cancels         -> doctor
    doctor reschedules      -> patient
    doctor marks a no-show  -> patient
    "running late" message  -> the other person on the appointment

How sending works:
- An email is only sent once the change is saved in the database
  (transaction.on_commit), so a booking that fails sends nothing.
- It is sent in a background thread, so the app doesn't wait for the mail
  server.
- If sending fails (wrong password, no internet), the error is written to the
  server log, and the booking, cancellation or move still goes through.
- Emails never include the patient's reason for the visit. That is health
  information, and an inbox is less private than the app.

The mail server comes from settings.py (EMAIL_BACKEND, EMAIL_HOST and so on).
Until an email account is set up there, emails are printed in the runserver
terminal instead of being sent.
"""
import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

logger = logging.getLogger(__name__)

SUBJECT_PREFIX = "WaitLess: "
FOOTER = (
    "Open the WaitLess app to see your appointments.\n\n"
    "This email was sent automatically, so replies aren't read."
)


def email_body(user, text):
    first_name = (getattr(user, "first_name", "") or "").strip()
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    return f"{greeting}\n\n{text}\n\n{FOOTER}\n"


def _deliver(address, subject, body):
    try:
        send_mail(subject, body, None, [address])
    except Exception:
        logger.exception("Couldn't send the email %r to %s", subject, address)


def send_email(user, subject, text):
    """Emails `text` to the user once the current database change is saved."""
    address = (getattr(user, "email", "") or "").strip()
    if not address or not getattr(settings, "EMAIL_NOTIFICATIONS", True):
        return
    # A line break in a subject is refused by Django, so names can't add one.
    subject = SUBJECT_PREFIX + " ".join(str(subject).split())
    body = email_body(user, text)

    def deliver():
        if getattr(settings, "EMAIL_IN_BACKGROUND", True):
            # Not a daemon thread, so an email already on its way is finished
            # even when the server is stopping.
            threading.Thread(target=_deliver, args=(address, subject, body), daemon=False).start()
        else:
            _deliver(address, subject, body)

    transaction.on_commit(deliver)
