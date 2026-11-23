"""
Turns an uploaded profile photo into a small, square JPEG.

- Only real JPEG, PNG or WebP images are accepted, up to 10 MB.
- Phone photos are turned the right way up, cropped to a centred square and
  shrunk to at most 512 x 512 pixels.
- Saving a new JPEG drops the file's metadata, such as the GPS location
  phones add to photos taken with the camera.

Needs the Pillow package (pip install -r requirements-test.txt).
"""
import base64
from io import BytesIO

from rest_framework.exceptions import ValidationError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000     # e.g. 8000 x 5000; refuses images built to exhaust memory
PHOTO_SIZE = 512
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def _bad(message):
    return ValidationError({"message": message})


def process_photo(upload):
    """Returns the JPEG bytes to store, or raises ValidationError."""
    # Imported here, not at the top, so a server without Pillow still starts
    # and only photo uploads fail (with this ImportError in the server log).
    from PIL import Image, ImageOps, UnidentifiedImageError

    if upload.size > MAX_UPLOAD_BYTES:
        raise _bad("That photo is too large. Choose one under 10 MB.")
    try:
        with Image.open(upload) as original:
            if original.format not in ALLOWED_FORMATS:
                raise _bad("Choose a JPEG, PNG or WebP photo.")
            if original.width * original.height > MAX_PIXELS:
                raise _bad("That photo is too large. Choose a smaller one.")
            image = ImageOps.exif_transpose(original)
            image.load()
    except ValidationError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        raise _bad("That file isn't a photo we can read. Choose a JPEG or PNG image.")

    # Transparent parts of PNGs become white instead of black.
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")

    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    if side > PHOTO_SIZE:
        image = image.resize((PHOTO_SIZE, PHOTO_SIZE), Image.Resampling.LANCZOS)

    out = BytesIO()
    image.save(out, "JPEG", quality=85, optimize=True)
    return out.getvalue()


def as_data_uri(image_bytes):
    """The photo as a data: URI, so the app can show it without a second request."""
    return "data:image/jpeg;base64," + base64.b64encode(bytes(image_bytes)).decode("ascii")
