# Testing run sheet

Use this sheet to execute the test cases in the testing report on an Android
emulator or phone. You run every case twice:

- **Round 1** on the original code, to capture each defect (screenshot `ID-R1.png`).
- **Round 2** on this patched code, to show the fix (screenshot `ID-R2.png`).

Record the actual result and status for each case in the report.

---

## 1. Start the backend (both rounds)

From the `backend` folder, with your virtual environment active:

```bash
pip install -r requirements-test.txt        # Django, DRF, SimpleJWT, hypothesis
# Only if you have no settings.py (it is git-ignored):
cp backend/settings.example.py backend/settings.py     # Windows: copy backend\settings.example.py backend\settings.py
python manage.py makemigrations accounts appointments appointment_backend
python manage.py migrate
python manage.py seed_test_data             # test accounts + 30 open slots
python manage.py runserver 0.0.0.0:8000
```

`seed_test_data` prints the accounts. It is safe to run again; it resets the
test passwords and adds any missing slots.

**Updating an existing copy?** After copying in new code, run these again:

```bash
cd backend
pip install -r requirements-test.txt     # adds Pillow, for profile photos
python manage.py makemigrations accounts appointments appointment_backend
python manage.py migrate                 # new tables: time off, profile photos
cd ../frontend
npx expo install expo-image-picker       # the photo picker for the Profile tab
npx expo install expo-file-system        # sends the chosen photo to the server
```

Without the migrations, the Schedule or Profile tab fails with "no such table".

For email (section 4c), copy `backend/settings.example.py` over your
`backend/settings.py` again, unless you changed your settings.py yourself.
Don't keep the old `EMAIL_BACKEND = ...` line: Django 6.1 refuses to start when
it sits next to the new `MAILERS` setting.

| Role | Email | Password |
| --- | --- | --- |
| Patient | patient@test.com | Patient123! |
| Doctor | doctor@test.com | Doctor123! |
| Doctor | doctor2@test.com | Doctor123! |
| Admin | admin@test.com | Admin123! |

For **Round 1**, copy the folder `backend/appointments/management/` from this
project into your original backend so you can seed the same data. It only adds
the command and changes no app behaviour.

## 2. Start the app

**Round 2 (this patched code):**

```bash
cd frontend
npm install
npx expo start -c
```

Press `a` to open the Android emulator, or scan the QR code with Expo Go. No
`.env` is needed: in development the app calls Django on port 8000 of the
computer running Expo (`10.0.2.2` from the emulator, your Wi-Fi IP from a
phone). The Expo terminal prints the address in use:

```
LOG  [api] Using API server http://10.0.2.2:8000 (your computer, found automatically; ...)
```

If Log In says "Can't reach the server", the banner's second line shows the
address it tried, and the terminal prints the reason
(`[api] POST http://.../account/login/ failed: ...`). To use another server, copy
`.env.example` to `.env` and follow the notes in it.

**Round 1 (your original code):** the API address is hard-coded. For testing only,
change line 4 of `frontend/src/app/api/auth.ts` to
`const BASE_API_URL = "http://10.0.2.2:8000";`, then run `npx expo start -c`.

> To see BUG-01 (the bundling error), download a fresh copy of the original repo
> from GitHub and start it. Your own folder still has the git-ignored `example/`
> folder, so it bundles.

To apply the fixes to your own repo instead of using this folder:
`git apply appointment-testing-fixes.patch`, from the repo root.

## 3. Run the cases

Run sections 4 (functional), 5 (usability) and 6 (edge cases) of the report in
order. Most cases need nothing extra. The ones below need a little setup:

| Case | Setup |
| --- | --- |
| F-15, E-19 | The seeded days have slots at 09:00, 10:00 and 14:00. Rescheduling to **11:00** works (F-15); **09:00** on one of those days overlaps an open slot (E-19). |
| E-14 | Emulator: swipe down twice and turn on **Airplane mode**. Turn it off again before tapping Try again. |
| E-15 | Press Ctrl+C in the terminal running `runserver`, then pull down to refresh a list. Restart the server afterwards. |
| E-16 | Tap the button twice as fast as you can. Then check the server terminal: there should be only one `POST` line. |
| E-17 | As the patient, open New → Dr Thabo Mokoena → Next and select the **first** time shown. Before tapping Confirm, run the command below in a second terminal (in `backend`), then tap Confirm. |
| E-20 | In `settings.py` (with `from datetime import timedelta` at the top) set `SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=1), "REFRESH_TOKEN_LIFETIME": timedelta(minutes=3)}` and restart the server. Log in. After 1–2 minutes, pull down on Upcoming: the list still loads, because the session renewed silently. After 3 or more minutes, pull down again: "Your session has expired" and Log In. Put the settings back afterwards. |
| U-07 | Android Studio → Device Manager → Create Virtual Device → **Small Phone** (720 × 1280, i.e. 360 × 640 dp). |
| U-09 | Install **Accessibility Scanner** from the Play Store on a phone, or on an emulator image that includes Google Play. |
| U-10 | Ask a classmate who hasn't seen the app. Time them from launch to "Appointment Confirmed" and note where they hesitate. |

Command for E-17 (marks Dr Mokoena's earliest open slot as taken):

```bash
python manage.py shell -c "from appointments.models import Doctor_slot as S; s = S.objects.filter(doctor__user__email='doctor@test.com', status='AVAILABLE').order_by('slot_date', 'start_time').first(); s.status = 'BOOKED'; s.save(); print('Taken:', s.slot_date, s.start_time)"
```

## 4. Automated tests (F-18)

```bash
cd backend && python manage.py test          # expect: Ran 158 tests ... OK
cd frontend && npx jest                      # expect: Tests: 44 passed, 44 total
```

(`npm test` starts Jest in watch mode. `npx jest` runs once and exits.)
Screenshot both summaries for F-18.

### Running one group at a time

Every backend test is tagged, so each group can run on its own. `-v 2` lists
every test by name with "ok" after it, which makes a clearer screenshot.

| Group | Run in | Command | Expect |
| --- | --- | --- | --- |
| Unit tests (app) | `frontend` | `npx jest --verbose` | Tests: 44 passed, 44 total |
| Unit tests (server) | `backend` | `python manage.py test --tag=unit -v 2` | Ran 11 tests ... OK |
| Integration tests | `backend` | `python manage.py test --tag=integration -v 2` | Ran 35 tests ... OK |
| API response tests | `backend` | `python manage.py test --tag=api -v 2` | Ran 126 tests ... OK |
| Security tests | `backend` | `python manage.py test --tag=security -v 2` | Ran 46 tests ... OK |

Some tests belong to two groups (most security tests are also API tests), so
the groups add up to more than 158. A single file or class runs on its own too,
for example `python manage.py test appointments.test_schedule`.

The backend tests freeze the clock at 10 January 2030 (local time), so they give
the same result on any day. If a test fails, copy the whole output into the
report notes.

## 4b. Schedule, cancelling and alerts (manual check)

Log in as **doctor@test.com** and open the **SCHEDULE** tab.

| Check | What to do | Expected |
| --- | --- | --- |
| Weekly hours | Weekly hours → Mon–Fri, 16:00 to 18:00, 30 min, starting next Monday, 2 weeks → Add slots | "Added 40 slots". Those days show a green dot on the calendar. |
| Overlap | + Add slot → pick one of those days, 16:15, 30 min → Add slot | Refused: "This overlaps your 16:00-16:30 slot…" |
| Block | Tap the day, then **Block** on 16:00 | The slot says Blocked and the day gets an amber dot. As the patient, 16:00 is no longer offered in New. |
| Delete | **Delete** on 16:30 → Delete | The slot disappears. Booked slots have no Delete button. |
| Time off | Time off → tap one of those days → Save time off | The day gets a grey dot. As the patient, the day has no times in New. Remove it again and the times come back. |
| Remove hours | Weekly hours → Remove hours → same days and times → Remove slots | "Removed … slots". Booked ones are kept. |
| Cancel | As the patient, Upcoming → **Cancel appointment** → Cancel appointment | It leaves the list. The doctor's **ALERTS** tab shows a red badge and "Lerato Dlamini cancelled…". |
| New booking alert | As the patient, book any time in New | The doctor's ALERTS tab shows "New booking: Lerato Dlamini…". |
| Reason for visit | As the patient, book a time and type "Sore throat" in **Reason for visit (optional)**. Book another and leave it empty | The doctor's alert and appointment details show "Sore throat" for the first and "General Consultation" for the second. The box stops at 200 characters and shows the count (for example 11/200). |
| Reschedule | As the doctor, UPDATE → pick the booking → Next. Only open slots are offered: dates with open slots are red. Pick one → Confirm Update | The patient's **Alerts** tab shows "Dr. Thabo Mokoena moved your appointment…". In SCHEDULE, the new time is Booked and the old time is Open again. |
| Running late | As the doctor, EDIT → pick a booked appointment → Next → **15 min late** → Send message | The patient's Alerts tab shows the message. Tapping it clears the badge. |
| Profile | Open the **Profile** tab (patients) or **PROFILE** (doctors) | Name, surname and email. Patients also see gender and date of birth, doctors their licence number. Initials show until a photo is added. |
| Add a photo | Profile → tap the picture → Choose from library (or Take photo) → crop → done | "Photo saved" and the photo appears. Log in as the other role: their profile has no photo. |
| Remove the photo | Profile → **Remove** → Remove | "Photo removed" and the initials come back. |
| Doctor's photo on cards | As the doctor, add a photo in PROFILE. Log in as the patient and open **New**, **Upcoming** and **Past** | That doctor's cards show the photo. A doctor without a photo shows their initials (for example "TM"). |
| Small screens and large text | On the emulator, open Settings → Display and set **Font size** and **Display size** to the largest. Open **New**, **Upcoming** and **Past** | Headings wrap between words, never inside one. Each card shows the whole photo and name (long names wrap onto a second line), and **Next** stays visible above the tab bar. |
| Log In and Sign Up on any screen | Open **Log In** and **Sign Up** on a small phone, a large-text setting and a tablet (or the emulator's Pixel Tablet), upright and sideways | The fields and buttons fill the width on phones and stay in a centred column on tablets. Every word shows in full: GENDER, Select Gender, Sign Up, Log In and the "Log in" / "Sign Up" links. Both pages scroll with the keyboard open. |
| Cursor in the middle | On **Log In** and **Sign Up**, tap an empty field. Then type a few letters and delete them all | The hint ("Enter your name") disappears and the cursor blinks in the middle of the box, both times. When you leave an empty field, the hint comes back. |
| Show password | On **Log In** and **Sign Up**, type a password, then tap the eye at the right of the box. Tap it again | The first tap shows the password as text and the icon changes to a crossed-out eye. The second tap hides it as dots again. The keyboard stays open, and the text stays centred. |
| Deleting an account | On the admin site, delete a test patient who has a booking: **Users** → the user → **Delete** | The "Are you sure?" page lists their appointments by name and time, instead of "Cannot delete user". After **Yes, I'm sure**, the user and their appointments are gone, and the doctor's schedule shows that time as open again. |
| Dark mode | Turn on dark mode on the phone or emulator and open the patient tabs | The tab bar stays white with the open tab in red, and the clock and battery icons at the top are dark and readable. |

The badge checks for new alerts every 30 seconds and whenever the app comes
back to the front, so allow a moment after acting on the other account.

## 4c. Email (manual check)

Every alert is also emailed, and the patient gets a confirmation when they book.
Emails never include the reason for the visit.

**Without an email account** (the default), each email is printed in the
`runserver` terminal instead of being sent, starting with `Subject: WaitLess: ...`.

**To send real email from Gmail:**

1. Turn on 2-Step Verification for the Gmail account (Google Account → Security).
2. Open https://myaccount.google.com/apppasswords, create an app password named
   "WaitLess" and copy the 16 letters.
3. Copy `backend/.env.example` to `backend/.env` and set
   `EMAIL_HOST_USER=yourname@gmail.com` and `EMAIL_HOST_PASSWORD=` the 16 letters.
4. Restart `runserver`.

The test accounts' addresses (patient@test.com and so on) don't exist. To see
the emails, sign up a patient with an address you can open. Gmail's "+" trick
gives one inbox many addresses: `yourname+patient@gmail.com` and
`yourname+doctor@gmail.com` both arrive at `yourname@gmail.com`.

| Check | What to do | Expected |
| --- | --- | --- |
| Booking emails | As a patient with a real address, book a time with a reason | The patient gets "WaitLess: Appointment booked for …". The doctor gets "WaitLess: New booking on …" without the reason; the reason is still in their ALERTS tab. |
| Cancel, move, no-show | Cancel as the patient; reschedule and mark a no-show as the doctor | The doctor gets "Cancelled appointment on …"; the patient gets "Your appointment has moved to …" and "Missed appointment on …". |
| Running late | As the doctor, send **15 min late** | The patient gets "WaitLess: Message from Dr. …" with the message. |
| Mail problem | Put a wrong `EMAIL_HOST_PASSWORD` in `.env`, restart, book a time | The booking still works and shows in ALERTS. The server terminal shows "Couldn't send the email …". |

## 5. Evidence

- **Screenshot:** the emulator's camera button, or
  `adb exec-out screencap -p > F-06-R2.png`.
- **Screen recording:** emulator ⋮ → Record and playback, or
  `adb shell screenrecord /sdcard/full-run.mp4` (stops at 3 minutes), then
  `adb pull /sdcard/full-run.mp4`.
- Name files `<test ID>-R<round>.png` and paste them into section 8 of the report.

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Can't reach the server" on every screen | Check the `[api]` lines in the Expo terminal and the "Server:" line on the Log In banner. Is `runserver` running on `0.0.0.0:8000`? If the address is `13.246.11.197`, a `.env` file is pointing at the deployed server: delete it or fix it and restart with `npx expo start -c`. On Windows, allow Python through the firewall. |
| `.env` seems to be ignored | It must sit in the `frontend` folder (next to `package.json`) and be named exactly `.env`, not `.env.txt` (turn on file name extensions in Explorer to check). Don't create it with PowerShell `echo ... > .env`: Windows PowerShell 5 saves it as UTF-16, which Expo can't read. On start-up Expo should print `env: export EXPO_PUBLIC_API_URL`. |
| `DisallowedHost` in the server log | Add your IP to `ALLOWED_HOSTS`, or use `settings.example.py`, which allows any host while `DEBUG` is on. |
| "no such table" | Run `makemigrations` and `migrate` (section 1). After updating the code, run them again: the time-off table is new. |
| `ModuleNotFoundError: hypothesis` | `pip install -r requirements-test.txt` |
| "Deprecated email settings are not allowed when MAILERS is defined" | Delete the old `EMAIL_BACKEND = ...` line from `backend/settings.py`, or copy `settings.example.py` over it again. |
| "Couldn't send the email" with "Username and Password not accepted" | The app password is wrong, or 2-Step Verification is off. Use the 16-letter app password, not the normal Gmail password. |
| "Couldn't send the email" with "timed out" | The network blocks port 587 (some campus Wi-Fi does). Add `EMAIL_PORT=465` to `backend/.env` and restart, or try another network. |
| Emails don't arrive and nothing is logged | Check `backend/.env`: next to `manage.py`, named exactly `.env`, saved as UTF-8, both `EMAIL_` lines filled in, and the server restarted. Then check the Spam folder. |

## What changed in the patched code

Every fix is listed in section 7 of the report (BUG-01 to BUG-29) and commented
in the code. New files:

- `backend/accounts/validators.py`: sign-up rules
- `backend/appointments/management/commands/seed_test_data.py`: test data
- `backend/backend/settings.example.py`, `backend/requirements-test.txt`
- `backend/accounts/tests.py`, `backend/appointments/tests.py`,
  `backend/appointment_backend/tests/test_send_notification_view.py`: 64 new tests
- `frontend/src/shared/validation.ts`, `frontend/src/shared/LoadError.tsx`
- `frontend/src/shared/apiUrl.ts`, `frontend/__tests__/apiUrl_test.ts`: picks the
  API server (finds your computer automatically during development)

Added after testing (doctor schedule, patient cancelling, alerts):

- `backend/appointments/schedule.py`, `schedule_views.py`, `formatting.py`: the
  doctor's own slots, weekly hours, blocking, deleting and time off (new
  `DoctorTimeOff` model in `models.py`)
- `backend/appointment_backend/notifications/events.py`: automatic alerts when an
  appointment is booked, cancelled, rescheduled or marked no-show; inbox
  endpoints in `appointment_backend/views.py`
- `backend/appointments/test_schedule.py`,
  `backend/appointment_backend/tests/test_inbox.py`: 51 new tests
- Frontend screens: `pages/doctorScreen/schedule.tsx` (SCHEDULE tab),
  `pages/addSlot.tsx`, `pages/weeklyHours.tsx`, `pages/timeOff.tsx`, the Alerts tabs
  (`src/shared/NotificationsScreen.tsx`), Cancel on the patient's Upcoming tab,
  and "Message the patient" on the doctor's appointment screen
- Profile tab (`src/shared/ProfileScreen.tsx`, `pages/tabs/profile.tsx`,
  `pages/doctorScreen/profile.tsx`) with an optional photo; server side in
  `backend/accounts/profile_views.py`, `photos.py` and the `ProfilePhoto` model
  (`GET /account/profile/`, `POST`/`DELETE /account/profile/photo/`), tests in
  `backend/accounts/test_profile.py`
- Doctors' photos on the patient's doctor cards (New, Upcoming and Past) instead of a
  placeholder and a stock photo: `GET /account/doctors/photos/?ids=…` in
  `backend/accounts/profile_views.py` (doctors only; patients' photos are never
  shared), `doctor_id` in each appointment's `slot_details`, `src/shared/doctorPhotos.ts`
  and `Components/Avatar.tsx` (initials when there's no photo), tests in
  `backend/accounts/test_doctor_photos.py`
- Optional "Reason for visit" box when booking (`pages/setDateandTime.tsx`), up to 200
  characters. Blank is saved as "General Consultation"; the server refuses longer
  reasons (`appointments/views.py`), tests in `backend/appointments/test_booking_reason.py`
- New, Upcoming and Past fit any screen, from 320-point phones and large-text settings
  up to tablets: headings wrap between words, cards stretch to the screen with the photo
  inside (`Components/Heading.tsx`, `Components/appointmentCard.tsx`, `src/shared/layout.ts`).
  The patient tab bar has fixed light colours and every tab shows its name, and the app
  stays in light mode (`app.json`), so dark mode no longer turns the tab bar black.
- Log In and Sign Up fit any screen too: full-width fields and buttons on phones, a
  centred 420-point column on tablets (`Components/InputField.tsx`, `formColumn` in
  `src/shared/layout.ts`). Labels, button text and links get the form's full width, so
  their last word is no longer cut off on devices whose system font draws text wider than
  the app measured it (seen on a Blackview Tab 60: "GENDE", "Sign", "Log"). Log In scrolls.
- The cursor in an empty Log In or Sign Up field starts in the middle instead of at the
  right-hand edge: the hint is drawn over the box rather than being the TextInput's own
  placeholder (`Components/InputField.tsx`; React Native issue 28794).
- Password boxes on Log In and Sign Up have an eye button to show or hide the password
  (`frontend/src/app/Components/InputField.tsx`).
- Deleting a patient or doctor on the admin site now deletes their appointments too, instead
  of failing with "Cannot delete user"; a deleted booking frees its slot. Suspend an account
  to keep its history. Appointments show as "Lerato Dlamini with Dr. Thabo Mokoena, Fri 11 Jan
  at 09:00 (Booked)" on the admin site (`backend/appointments/models.py`, tests in
  `backend/appointments/test_deleting_accounts.py`). Run `makemigrations` and `migrate` after
  this change.
- Rescheduling (`pages/update.tsx`): offers only the doctor's open slots instead of
  four fixed times, and moves the appointment into the chosen slot (the old time
  opens again). `POST .../reschedule/` takes `{"slot_id": …}`; the old
  `{"slot_date", "start_time"}` form still works
- Behaviour changes: patients can no longer cancel an appointment that has
  started or was marked no-show, and a message sent with
  `POST /api/notifications/` now goes to the other person on the appointment
  instead of back to the sender
- `frontend/__tests__/CreateNewAccount_test.tsx` (was empty), `frontend/.env.example`
- Email (`backend/appointment_backend/notifications/emails.py`): every automatic alert
  and every "running late" message is also emailed, and the patient gets a booking
  confirmation. Emails go out only after the change is saved, in the background, and a
  mail problem is logged without stopping the booking. The reason for the visit stays out
  of emails. `EmailNotificationStrategy` now uses the same code. Settings use Django
  6.1's `MAILERS` and read the Gmail account from `backend/.env` (`.env.example`). Tests
  in `backend/appointment_backend/tests/test_emails.py`; the Hypothesis test in
  `test_notifications.py` checks the new email format
- Running on a server: `DEPLOY.md` (AWS EC2 with nginx and gunicorn),
  `backend/requirements-server.txt`, `backend/deploy/waitless.service` and
  `backend/deploy/nginx-waitless.conf`. `settings.example.py` reads `backend/.env`
  and has `STATIC_ROOT` for `collectstatic`
