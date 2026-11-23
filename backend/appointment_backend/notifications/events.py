"""
In-app notifications sent automatically when an appointment changes, so the
other person finds out without refreshing their list:

    patient books          -> doctor
    patient cancels        -> doctor
    doctor reschedules     -> patient
    doctor marks no-show   -> patient

They are saved in the Notification table and read in the app's Alerts tab
(GET /api/notifications/).
"""
from appointments.formatting import doctor_name, fmt_when, full_name
from .emails import send_email
from .service import NotificationServices

MAX_REASON_IN_MESSAGE = 200


def _send(user, appointment, message, subject, email_text=None):
    NotificationServices("IN_APP").notify(user, appointment, message)
    # The same news by email (see emails.py).
    send_email(user, subject, email_text or message)


def appointment_booked(appointment):
    slot = appointment.slot
    message = f"New booking: {full_name(appointment.patient.user)} on {fmt_when(slot.slot_date, slot.start_time)}."
    email_text = message  # the email leaves the reason out (see emails.py)
    reason = (appointment.reason or "").strip()
    if reason:
        if len(reason) > MAX_REASON_IN_MESSAGE:
            reason = reason[:MAX_REASON_IN_MESSAGE].rstrip() + "..."
        message += f" Reason: {reason}"
    _send(slot.doctor.user, appointment, message, f"New booking on {fmt_when(slot.slot_date, slot.start_time)}", email_text)
    # A confirmation email for the patient (their alert is the Confirmed screen).
    send_email(
        appointment.patient.user,
        f"Appointment booked for {fmt_when(slot.slot_date, slot.start_time)}",
        f"Your appointment with {doctor_name(slot.doctor.user)} on {fmt_when(slot.slot_date, slot.start_time)} "
        "is booked. If you can't make it, please cancel in the app so someone else can have the time.",
    )


def appointment_cancelled(appointment):
    slot = appointment.slot
    _send(
        slot.doctor.user,
        appointment,
        f"{full_name(appointment.patient.user)} cancelled their appointment on "
        f"{fmt_when(slot.slot_date, slot.start_time)}.",
        f"Cancelled appointment on {fmt_when(slot.slot_date, slot.start_time)}",
    )


def appointment_rescheduled(appointment, old_date, old_start):
    slot = appointment.slot
    _send(
        appointment.patient.user,
        appointment,
        f"{doctor_name(slot.doctor.user)} moved your appointment from {fmt_when(old_date, old_start)} "
        f"to {fmt_when(slot.slot_date, slot.start_time)}.",
        f"Your appointment has moved to {fmt_when(slot.slot_date, slot.start_time)}",
    )


def appointment_no_show(appointment):
    slot = appointment.slot
    _send(
        appointment.patient.user,
        appointment,
        f"{doctor_name(slot.doctor.user)} marked you as absent from your appointment on "
        f"{fmt_when(slot.slot_date, slot.start_time)}. If you still need to be seen, book a new appointment.",
        f"Missed appointment on {fmt_when(slot.slot_date, slot.start_time)}",
    )
