"""
Tests for GET /account/doctors/photos/ (doctors' photos on the app's doctor
cards) and the doctor_id that appointment lists now include for it.

Run with:  python manage.py test accounts
"""
from django.test import tag

from accounts.models import ProfilePhoto
from accounts.test_profile import PHOTO_URL, image_file, stored_image
from appointments.tests import IN_TWO_DAYS, MY_URL, TOMORROW, AppointmentTestCase

PHOTOS_URL = "/account/doctors/photos/"


@tag("api")
class DoctorPhotoTests(AppointmentTestCase):

    def give_photo(self, user, color=(30, 90, 200)):
        self.login(user)
        response = self.client.post(PHOTO_URL, {"photo": image_file(color=color)}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)

    def photos(self, ids, user=None):
        self.login(user or self.patient_user)
        return self.client.get(PHOTOS_URL, {"ids": ids})

    def test_patient_gets_the_photos_of_doctors_who_have_one(self):
        self.give_photo(self.doctor_user, color=(30, 90, 200))
        response = self.photos(f"{self.doctor.id},{self.other_doctor.id}")
        self.assertEqual(response.status_code, 200)
        # Sarah Naidoo has no photo, so she is left out and the app shows her initials.
        self.assertEqual(list(response.data["photos"]), [str(self.doctor.id)])
        image = stored_image(response.data["photos"][str(self.doctor.id)])
        self.assertEqual((image.format, image.size), ("JPEG", (512, 512)))
        red, green, blue = image.getpixel((256, 256))
        self.assertLess(red, green)
        self.assertLess(green, blue)  # the photo this doctor uploaded

    @tag("security")
    def test_patient_photos_are_never_shared(self):
        self.give_photo(self.other_patient_user)
        self.give_photo(self.doctor_user)
        # Asking with every id there is still returns doctors only: Patient and
        # Doctor ids are separate numbers, and only Doctor ids are looked up.
        every_id = ",".join(str(n) for n in range(1, 30))
        response = self.photos(every_id)
        self.assertEqual(list(response.data["photos"]), [str(self.doctor.id)])
        # The other patient's own profile still has their photo.
        self.login(self.other_patient_user)
        self.assertIsNotNone(self.client.get("/account/profile/").data["photo"])

    @tag("security")
    def test_suspended_doctor_photo_is_not_shared(self):
        self.give_photo(self.doctor_user)
        self.doctor_user.account_status = "SUSPENDED"
        self.doctor_user.save()
        self.assertEqual(self.photos(str(self.doctor.id)).data["photos"], {})

    def test_removed_photo_disappears(self):
        self.give_photo(self.doctor_user)
        self.login(self.doctor_user)
        self.client.delete(PHOTO_URL)
        self.assertEqual(self.photos(str(self.doctor.id)).data["photos"], {})

    def test_doctors_can_see_photos_too(self):
        self.give_photo(self.other_doctor_user)
        response = self.photos(str(self.other_doctor.id), user=self.doctor_user)
        self.assertEqual(list(response.data["photos"]), [str(self.other_doctor.id)])

    @tag("security")
    def test_bad_ids_are_ignored_and_no_ids_gives_none(self):
        self.give_photo(self.doctor_user)
        response = self.photos(f" {self.doctor.id} ,abc,,-4,{self.doctor.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(list(response.data["photos"]), [str(self.doctor.id)])
        self.login(self.patient_user)
        self.assertEqual(self.client.get(PHOTOS_URL).data, {"photos": {}})

    @tag("security")
    def test_at_most_50_doctors_at_a_time(self):
        self.assertEqual(self.photos(",".join(str(n) for n in range(1, 51))).status_code, 200)
        response = self.photos(",".join(str(n) for n in range(1, 52)))
        self.assertEqual(response.status_code, 400)
        self.assertIn("at most 50", response.data["message"])

    @tag("security")
    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(PHOTOS_URL, {"ids": "1"}).status_code, 401)

    @tag("integration")
    def test_appointments_say_which_doctor_they_are_with(self):
        self.book(self.slot(TOMORROW, "09:00"))
        self.book(self.slot(IN_TWO_DAYS, "10:00", doctor=self.other_doctor))
        self.login(self.patient_user)
        doctor_ids = [row["slot_details"]["doctor_id"] for row in self.client.get(MY_URL).data]
        self.assertCountEqual(doctor_ids, [self.doctor.id, self.other_doctor.id])

    def test_photo_rows_are_kept_per_user(self):
        # One photo per person: uploading again replaces it.
        self.give_photo(self.doctor_user, color=(200, 30, 30))
        self.give_photo(self.doctor_user, color=(30, 200, 30))
        self.assertEqual(ProfilePhoto.objects.filter(user=self.doctor_user).count(), 1)
        image = stored_image(self.photos(str(self.doctor.id)).data["photos"][str(self.doctor.id)])
        red, green, _ = image.getpixel((256, 256))
        self.assertGreater(green, red)
