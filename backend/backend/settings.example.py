
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file(path):

    if not path.exists():
        return
    try:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
    except UnicodeDecodeError:
        raise RuntimeError(f"{path} must be saved as UTF-8 (in VS Code: Save with Encoding > UTF-8).")
    for line in lines:
        name, sep, value = line.partition("=")
        name = name.strip()
        if sep and name and not name.startswith("#"):
            os.environ.setdefault(name, value.strip().strip("\"'"))


_load_env_file(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = ["*"] if DEBUG else [
    host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",") if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "accounts",
    "appointments",
    "appointment_backend",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# SQLite by default. Set DATABASE_NAME etc. to use PostgreSQL (psycopg is in
# requirements_backend.txt).
if os.environ.get("DATABASE_NAME"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["DATABASE_NAME"],
            "USER": os.environ.get("DATABASE_USER", ""),
            "PASSWORD": os.environ.get("DATABASE_PASSWORD", ""),
            "HOST": os.environ.get("DATABASE_HOST", "localhost"),
            "PORT": os.environ.get("DATABASE_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

# The app now refreshes expired access tokens automatically, but a longer
# access lifetime keeps manual test sessions smooth.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    # accounts.User's primary key is user_id, not id. Without this, log in and
    # sign up fail with "'User' object has no attribute 'id'" (HTTP 500).
    "USER_ID_FIELD": "user_id",
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Johannesburg"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Email (appointment_backend/notifications/emails.py). Until an account is set in.env,
# emails are printed in the runserver terminal instead of being sent. To send

_email_user = os.environ.get("EMAIL_HOST_USER", "").strip()
# Google shows app passwords in groups of four; the spaces aren't part of it.
_email_password = os.environ.get("EMAIL_HOST_PASSWORD", "").replace(" ", "")
_email_port = int(os.environ.get("EMAIL_PORT", "587"))
if _email_user and _email_password:
    MAILERS = {
        "default": {
            "BACKEND": "django.core.mail.backends.smtp.EmailBackend",
            "OPTIONS": {
                "host": os.environ.get("EMAIL_HOST", "smtp.gmail.com"),
                "port": _email_port,
                "use_ssl": _email_port == 465,
                "use_tls": _email_port != 465,
                "username": _email_user,
                "password": _email_password,
                "timeout": 20,
            },
        },
    }
else:
    MAILERS = {"default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"}}
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL") or f"WaitLess <{_email_user or 'noreply@waitless.local'}>"
# EMAIL_NOTIFICATIONS=0 in backend/.env stops all appointment emails.
EMAIL_NOTIFICATIONS = os.environ.get("EMAIL_NOTIFICATIONS", "1") == "1"
