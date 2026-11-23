"""
Doctor schedule endpoints (all under /api/appointments/doctor/, doctors only).

    GET    slots/?from=YYYY-MM-DD&to=YYYY-MM-DD   own slots that haven't finished,
                                                  plus time off in that period
    POST   slots/                                 add one slot
    DELETE slots/<slot_id>/                       delete an unbooked slot
    POST   slots/<slot_id>/block/                 hide an open slot from patients
    POST   slots/<slot_id>/unblock/               make a blocked slot open again
    POST   slots/weekly/                          add weekly hours
    POST   slots/weekly/remove/                   remove unbooked slots in weekly hours
    GET    time-off/                              current and upcoming time off
    POST   time-off/                              add time off
    DELETE time-off/<time_off_id>/                remove time off

Weekly hours expect:
{
    "weekdays": [0, 1, 2, 3, 4],     # Monday = 0 ... Sunday = 6
    "start_time": "09:00",
    "end_time": "17:00",
    "slot_minutes": 30,              # not used when removing
    "start_date": "2026-11-16",      # optional, default today
    "weeks": 4                       # 1 to 12, default 4
}
Time off expects {"start_date": "2026-12-20", "end_date": "2027-01-02", "reason": "Holiday"}
(end_date and reason are optional).

Errors come back as {"message": "..."} (or {"error": "..."} for the original
checks when adding one slot).
"""
from datetime import date, time, timedelta

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsDoctorRole
from . import schedule
from .formatting import fmt_range


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def doctor_slots(request):
    doctor = schedule.doctor_for(request.user)
    if request.method == "GET":
        return _list_slots(request, doctor)
    return _create_slot(request, doctor)


def _list_slots(request, doctor):
    today = timezone.localdate()
    params = request.query_params
    from_date = schedule.parse_date(params["from"], "from date") if params.get("from") else today
    to_date = schedule.parse_date(params["to"], "to date") if params.get("to") else from_date + timedelta(days=30)
    if to_date < from_date:
        raise schedule.bad_request("The 'to' date can't be before the 'from' date.")
    if (to_date - max(from_date, today)).days >= schedule.MAX_LIST_DAYS:
        raise schedule.bad_request(f"Ask for at most {schedule.MAX_LIST_DAYS} days at a time.")
    return Response(schedule.list_slots(doctor, from_date, to_date))


"""
Adds one slot and needs this data
{
    "slot_date": "2026-10-15",
    "start_time": "09:00",
    "end_time": "09:30"
}
"""
def _create_slot(request, doctor):
    slot_date = request.data.get("slot_date")
    start_time = request.data.get("start_time")
    end_time = request.data.get("end_time")

    if not all([slot_date, start_time, end_time]):
        return Response(
            {"error": "slot_date, start_time and end_time are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        slot_date = date.fromisoformat(slot_date)
        start_time = time.fromisoformat(start_time)
        end_time = time.fromisoformat(end_time)
    except (ValueError, TypeError):
        return Response(
            {"error": "Use YYYY-MM-DD for the date and HH:MM for times."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if slot_date < timezone.localdate():
        return Response(
            {"error": "The slot date cannot be in the past."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if end_time <= start_time:
        return Response(
            {"error": "The end time must be later than the start time."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # New: also refuses times that have passed today, days in the doctor's
    # time off, and slots that overlap another slot (not only exact copies).
    try:
        slot = schedule.create_slot(doctor, slot_date, start_time, end_time)
    except IntegrityError:
        return Response(
            {"error": "This slot conflicts with a database constraint."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "message": "Appointment slot created successfully.",
            "slot_id": slot.slot_id,
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": slot.status,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def delete_slot_view(request, slot_id):
    schedule.delete_slot(schedule.doctor_for(request.user), slot_id)
    return Response({"message": "Slot deleted.", "slot_id": slot_id}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def block_slot_view(request, slot_id):
    slot = schedule.block_slot(schedule.doctor_for(request.user), slot_id)
    return Response({"message": "Slot blocked.", "slot_id": slot.slot_id, "status": slot.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def unblock_slot_view(request, slot_id):
    slot = schedule.unblock_slot(schedule.doctor_for(request.user), slot_id)
    return Response({"message": "Slot unblocked.", "slot_id": slot.slot_id, "status": slot.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def add_weekly_hours_view(request):
    doctor = schedule.doctor_for(request.user)
    values = schedule.parse_weekly_hours(request.data, with_length=True)
    result = schedule.add_weekly_hours(doctor, **values)
    return Response(result, status=status.HTTP_201_CREATED if result["created"] else status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def remove_weekly_hours_view(request):
    doctor = schedule.doctor_for(request.user)
    values = schedule.parse_weekly_hours(request.data, with_length=False)
    return Response(schedule.remove_weekly_hours(doctor, **values))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def time_off_view(request):
    doctor = schedule.doctor_for(request.user)
    if request.method == "GET":
        return Response(schedule.list_time_off(doctor))

    start_date = schedule.parse_date(request.data.get("start_date"), "first day")
    end_raw = request.data.get("end_date")
    end_date = schedule.parse_date(end_raw, "last day") if end_raw else start_date
    off = schedule.add_time_off(doctor, start_date, end_date, request.data.get("reason"))
    row = schedule.time_off_row(off)
    booked = len(row["booked_appointments"])
    message = f"Time off added for {fmt_range(off.start_date, off.end_date)}."
    if booked:
        message += (
            f" You still have {booked} booked appointment{'' if booked == 1 else 's'} in this period."
            " Reschedule them in the UPDATE tab."
        )
    return Response({"message": message, "time_off": row}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsDoctorRole])
def delete_time_off_view(request, time_off_id):
    schedule.delete_time_off(schedule.doctor_for(request.user), time_off_id)
    return Response({"message": "Time off removed. Open slots on those days can be booked again."})
