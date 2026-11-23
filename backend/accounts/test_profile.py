"""
Tests for the Profile tab endpoints (profile_views.py) and photo handling
(photos.py).

Run with:  python manage.py test accounts
"""
import base64
from datetime import date
from io import BytesIO

from django.test import tag
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from accounts.models import ProfilePhoto
from accounts.photos import MAX_UPLOAD_BYTES
from appointments.tests import AppointmentTestCase

PROFILE_URL = "/account/profile/"
PHOTO_URL = "/account/profile/photo/"


def image_file(fmt="PNG", size=(1200, 800), mode="RGB", color=(200, 30, 30), exif=None, name=None):
    buffer = BytesIO()
    image = Image.new(mode, size, color)
    if exif is not None:
        image.save(buffer, fmt, exif=exif)
    else:
        image.save(buffer, fmt)
    extension = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp", "GIF": "gif"}[fmt]
    return SimpleUploadedFile(name or f"photo.{extension}", buffer.getvalue(), content_type=f"image/{extension}")


def stored_image(data_uri):
    prefix = "data:image/jpeg;base64,"
    assert data_uri.startswith(prefix), data_uri[:40]
    return Image.open(BytesIO(base64.b64decode(data_uri[len(prefix):])))


@tag("api")
class ProfileTests(AppointmentTestCase):

    def upload(self, file, user=None):
        self.login(user or self.patient_user)
        return self.client.post(PHOTO_URL, {"photo": file}, format="multipart")

    def test_patient_sees_their_details(self):
        self.login(self.patient_user)
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "user_id": self.patient_user.user_id,
            "first_name": "Lerato",
            "last_name": "Dlamini",
            "email": "pat@example.com",
            "role": "PATIENT",
            "photo": None,
            "gender": "Female",
            "date_of_birth": date(2000, 5, 15),
        })

    def test_doctor_sees_their_licence_number(self):
        self.login(self.doctor_user)
        data = self.client.get(PROFILE_URL).data
        self.assertEqual((data["role"], data["license_no"], data["first_name"]), ("DOCTOR", "DOC-1", "Thabo"))
        self.assertNotIn("date_of_birth", data)

    @tag("security")
    def test_requires_login(self):
        self.assertIn(self.client.get(PROFILE_URL).status_code, (401, 403))
        self.assertIn(self.client.post(PHOTO_URL, {}, format="multipart").status_code, (401, 403))

    def test_upload_makes_a_small_square_jpeg(self):
        response = self.upload(image_file("PNG", size=(1200, 800), mode="RGBA", color=(0, 0, 255, 0)))

        self.assertEqual(response.status_code, 200)
        photo = stored_image(response.data["profile"]["photo"])
        self.assertEqual((photo.format, photo.size), ("JPEG", (512, 512)))
        self.assertEqual(photo.getpixel((256, 256)), (255, 255, 255))  # transparent became white
        self.assertEqual(stored_image(self.client.get(PROFILE_URL).data["photo"]).size, (512, 512))

    def test_small_photo_is_not_enlarged(self):
        response = self.upload(image_file("JPEG", size=(300, 200)))
        self.assertEqual(stored_image(response.data["profile"]["photo"]).size, (200, 200))

    @tag("security")
    def test_location_and_other_metadata_are_removed(self):
        exif = Image.Exif()
        exif[0x010F] = "PhoneMaker"          # camera make
        exif[0x8825] = {2: (26.0, 12.0, 0.0)}  # GPS block
        response = self.upload(image_file("JPEG", size=(600, 600), exif=exif.tobytes()))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(dict(stored_image(response.data["profile"]["photo"]).getexif()), {})

    def test_webp_is_accepted(self):
        self.assertEqual(self.upload(image_file("WEBP", size=(400, 400))).status_code, 200)

    @tag("security")
    def test_files_that_are_not_usable_photos_are_refused(self):
        cases = {
            "text": SimpleUploadedFile("photo.jpg", b"definitely not a picture", content_type="image/jpeg"),
            "gif": image_file("GIF", size=(100, 100), mode="P", color=1),
            "too big": SimpleUploadedFile("big.jpg", b"0" * (MAX_UPLOAD_BYTES + 1), content_type="image/jpeg"),
        }
        for label, file in cases.items():
            with self.subTest(label):
                response = self.upload(file)
                self.assertEqual(response.status_code, 400)
                self.assertIn("message", response.data)
        self.login(self.patient_user)
        self.assertEqual(self.client.post(PHOTO_URL, {}, format="multipart").status_code, 400)
        self.assertFalse(ProfilePhoto.objects.exists())

    def test_replace_and_remove(self):
        self.upload(image_file("PNG", color=(10, 200, 10)))
        self.upload(image_file("PNG", color=(10, 10, 200)))
        self.assertEqual(ProfilePhoto.objects.filter(user=self.patient_user).count(), 1)
        red, green, blue = stored_image(self.client.get(PROFILE_URL).data["photo"]).getpixel((10, 10))
        self.assertGreater(blue, 150)  # the second photo

        response = self.client.delete(PHOTO_URL)
        self.assertEqual((response.status_code, response.data["profile"]["photo"]), (200, None))
        self.assertEqual(self.client.delete(PHOTO_URL).status_code, 200)  # nothing left to remove

    @tag("security")
    def test_each_person_only_gets_their_own_photo(self):
        self.upload(image_file("PNG"))
        self.login(self.other_patient_user)
        self.assertIsNone(self.client.get(PROFILE_URL).data["photo"])
        self.login(self.doctor_user)
        self.assertIsNone(self.client.get(PROFILE_URL).data["photo"])
